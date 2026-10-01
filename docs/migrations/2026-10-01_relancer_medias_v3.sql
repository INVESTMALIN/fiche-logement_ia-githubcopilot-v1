-- 2026-10-01 — Outil de relance des médias vers Drive (scénario Make V3 idempotent)
-- APPLIQUÉE EN PROD le 01/10/2026 via le connecteur MCP (migration "relancer_medias_v3").
--
-- But : donner à l'agent de health check un geste unique et sûr pour rattraper
-- une fiche dont l'upload des médias a échoué. La fonction vérifie d'abord que la
-- relance a du sens, puis appelle le webhook du V3 (qui saute les fichiers déjà
-- présents dans le Drive). Chaque appel, accepté ou refusé, est journalisé.
--
-- Motifs de refus : fiche_introuvable, fiche_non_completee, numero_bien_absent,
-- bien_partage_par_plusieurs_fiches, aucun_media, medias_absents_du_storage,
-- relance_deja_en_cours (< 20 min), trop_de_relances_24h (>= 3).
--
-- Usage : SELECT relancer_medias_v3('<fiche_id>', 'agent');          -- relance
--         SELECT relancer_medias_v3('<fiche_id>', 'agent', true);    -- essai à blanc
--
-- Réservé au rôle serveur (postgres / service_role). Ni anon ni authenticated.
-- Rollback : 2026-10-01_rollback_relancer_medias_v3.sql

-- 1. Journal des relances --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_relances (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  demandee_le     timestamptz NOT NULL DEFAULT now(),
  source          text        NOT NULL,             -- 'agent', 'julien', ...
  fiche_id        uuid        NOT NULL,
  numero_bien     text,
  essai_a_blanc   boolean     NOT NULL DEFAULT false,
  decision        text        NOT NULL CHECK (decision IN ('envoyee', 'refusee', 'ok_a_blanc')),
  motif           text,                              -- code du refus, NULL si envoyée
  nb_jobs         integer,
  nb_medias_absents_storage integer,
  http_request_id bigint                             -- id pg_net, pour lire la réponse Make
);

CREATE INDEX IF NOT EXISTS media_relances_fiche_idx
  ON public.media_relances (fiche_id, demandee_le DESC);

ALTER TABLE public.media_relances ENABLE ROW LEVEL SECURITY;
-- Aucune policy : invisible pour anon et authenticated, lisible côté serveur seulement.
REVOKE ALL ON public.media_relances FROM anon, authenticated;

-- 2. Fonction de relance -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.relancer_medias_v3(
  p_fiche_id    uuid,
  p_source      text    DEFAULT 'agent',
  p_essai_a_blanc boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  -- Webhook du scénario « LH - Fiche logement - Stockage Photos sur Drive V3 » (9603810)
  c_webhook        constant text    := 'https://hook.eu2.make.com/55twvhs1m8bngim076xc38ej947vupym';
  c_max_par_24h    constant integer := 3;             -- au-delà, on arrête de boucler et on remonte
  c_delai_min      constant interval := '20 minutes'; -- un run V3 dure ~10 min sur une grosse fiche

  v_statut         text;
  v_numero         text;
  v_autres_fiches  integer;
  v_nb_jobs        integer;
  v_nb_absents     integer;
  v_nb_recentes    integer;
  v_derniere       timestamptz;
  v_motif          text;
  v_request_id     bigint;
  v_decision       text;
BEGIN
  IF p_source IS NULL OR btrim(p_source) = '' THEN
    RAISE EXCEPTION 'p_source est obligatoire';
  END IF;

  SELECT f.statut, nullif(btrim(f.logement_numero_bien), '')
    INTO v_statut, v_numero
    FROM fiches f
   WHERE f.id = p_fiche_id;

  -- Contrôles, du plus bloquant au moins bloquant. Le premier qui échoue donne le motif.
  IF NOT FOUND THEN
    v_motif := 'fiche_introuvable';
  ELSIF v_statut IS DISTINCT FROM 'Complété' THEN
    v_motif := 'fiche_non_completee';
  ELSIF v_numero IS NULL THEN
    v_motif := 'numero_bien_absent';
  END IF;

  IF v_motif IS NULL THEN
    -- Bien partagé par plusieurs fiches : le V3 compare dossier + nom de fichier,
    -- il croirait les médias de la 2e fiche déjà présents et ne monterait rien.
    SELECT count(*) INTO v_autres_fiches
      FROM fiches f
     WHERE btrim(f.logement_numero_bien) = v_numero
       AND f.id <> p_fiche_id;
    IF v_autres_fiches > 0 THEN
      v_motif := 'bien_partage_par_plusieurs_fiches';
    END IF;
  END IF;

  IF v_motif IS NULL THEN
    -- Combien de médias attendus, et combien n'existent plus dans le storage
    -- (nettoyage à 75 jours, ou fiche voisine supprimée) : ceux-là, aucun replay ne les ramènera.
    SELECT count(*),
           count(*) FILTER (WHERE o.id IS NULL)
      INTO v_nb_jobs, v_nb_absents
      FROM build_media_jobs(p_fiche_id) j
      LEFT JOIN storage.objects o
        ON o.bucket_id = 'fiche-photos'
       AND o.name = split_part(j.url, '/object/public/fiche-photos/', 2);

    IF v_nb_jobs = 0 THEN
      v_motif := 'aucun_media';
    ELSIF v_nb_absents = v_nb_jobs THEN
      v_motif := 'medias_absents_du_storage';
    END IF;
  END IF;

  IF v_motif IS NULL THEN
    -- Garde-fous anti-boucle (les essais à blanc ne comptent pas).
    SELECT count(*), max(demandee_le)
      INTO v_nb_recentes, v_derniere
      FROM media_relances
     WHERE fiche_id = p_fiche_id
       AND decision = 'envoyee'
       AND demandee_le > now() - interval '24 hours';

    IF v_derniere IS NOT NULL AND v_derniere > now() - c_delai_min THEN
      v_motif := 'relance_deja_en_cours';
    ELSIF v_nb_recentes >= c_max_par_24h THEN
      v_motif := 'trop_de_relances_24h';
    END IF;
  END IF;

  -- Décision
  IF v_motif IS NOT NULL THEN
    v_decision := 'refusee';
  ELSIF p_essai_a_blanc THEN
    v_decision := 'ok_a_blanc';
  ELSE
    v_decision := 'envoyee';
    SELECT net.http_post(
             url     := c_webhook,
             body    := jsonb_build_object('fiche_id', p_fiche_id),
             headers := '{"Content-Type": "application/json"}'::jsonb,
             timeout_milliseconds := 60000
           )
      INTO v_request_id;
  END IF;

  INSERT INTO media_relances
    (source, fiche_id, numero_bien, essai_a_blanc, decision, motif,
     nb_jobs, nb_medias_absents_storage, http_request_id)
  VALUES
    (p_source, p_fiche_id, v_numero, p_essai_a_blanc, v_decision, v_motif,
     v_nb_jobs, v_nb_absents, v_request_id);

  RETURN jsonb_build_object(
    'decision',        v_decision,
    'motif',           v_motif,
    'fiche_id',        p_fiche_id,
    'numero_bien',     v_numero,
    'nb_jobs',         v_nb_jobs,
    'nb_medias_absents_storage', v_nb_absents,
    'http_request_id', v_request_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.relancer_medias_v3(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.relancer_medias_v3(uuid, text, boolean) TO service_role;

COMMENT ON FUNCTION public.relancer_medias_v3(uuid, text, boolean) IS
  'Relance idempotente des médias d''une fiche vers Drive via le scénario Make V3 (9603810). Refuse et journalise si la relance n''a pas de sens. Réservée au serveur (agent de health check).';
