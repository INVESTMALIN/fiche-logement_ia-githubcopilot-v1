-- ============================================================
-- Migration : Changement contrôlé du numéro de bien (admin)
-- Date      : 2026-09-07
-- Branche   : feat/admin-change-property-number
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase.
-- Migration ADDITIVE : une seule nouvelle fonction. Aucune table modifiée,
-- aucune policy touchée, aucun trigger modifié, aucune donnée déplacée.
--
-- ⚠️ ORDRE IMPÉRATIF : appliquer CETTE migration AVANT de merger la PR.
--    Le bouton « Modifier le numéro » appelle `changer_numero_bien` dès son
--    déploiement Vercel. Sans la fonction, l'appel échoue et l'administrateur
--    ne peut pas renuméroter (rien d'autre n'est cassé : le numéro reste
--    verrouillé comme aujourd'hui).
--    Séquence : 1) cette migration  2) merge  3) déploiement Vercel.
--
-- CONTEXTE MÉTIER
-- Quand un logement change de conciergerie, la fiche reste la même mais reçoit
-- un nouveau numéro de bien. Le numéro est verrouillé dès la création de la
-- fiche (il identifie le dossier photos Supabase, le dossier Drive, l'item
-- Monday et le lookup de l'agent annonce) : seuls `admin` et `super_admin`
-- peuvent le changer, par ce parcours dédié.
--
-- POURQUOI UNE FONCTION SQL, ET PAS UN UPDATE DEPUIS LE CLIENT
--   1. RÔLE. Les RLS de `fiches` donnent l'UPDATE au coordinateur (sur ses
--      fiches) et au super_admin. L'`admin`, lui, n'a que le SELECT : sans
--      cette fonction il ne PEUT pas renuméroter, alors qu'un coordinateur, lui,
--      le pourrait en appelant PostgREST directement (masquer le bouton dans
--      React ne protège rien). La fonction inverse exactement ces deux cas.
--   2. CONCURRENCE. Le contrôle de collision et l'écriture doivent être dans la
--      même transaction, sous verrou : deux demandes simultanées vers le même
--      numéro passeraient toutes les deux une pré-vérification côté interface.
--   3. ATOMICITÉ. Renuméroter, remettre les marqueurs Loomky à zéro et
--      invalider l'état Monday des annonces forment UN changement : soit tout,
--      soit rien.
--
-- CE QUE LA FONCTION NE FAIT PAS (volontairement)
--   - aucun appel distant : ni Loomky, ni Monday, ni Drive, ni Make ;
--   - aucun média déplacé, copié ou supprimé, aucune URL réécrite ;
--   - aucun PDF régénéré, aucun dossier renommé.
--   La trace `numero_bien_changed` est écrite par le trigger d'audit existant
--   (`log_fiche_updated`), avec `auth.uid()` comme auteur : SECURITY DEFINER ne
--   change pas l'identité du JWT, seulement les droits.
--   Aucun webhook n'est déclenché : les triggers `notify_*` ne réagissent qu'à
--   `statut`, `pdf_last_generated_at`, `guide_acces_last_generated_at` et aux
--   champs d'alerte `avis_*` / `equipements_wifi_statut`, tous intacts ici.
-- ============================================================

CREATE OR REPLACE FUNCTION public.changer_numero_bien(
  p_fiche_id       uuid,
  p_nouveau_numero text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_role     text;
  v_active   boolean;
  v_ancien   text;
  v_nouveau  text;
  v_loomky   boolean;
  v_conflit  record;
  v_annonces integer;
BEGIN
  -- 1. RÔLE — autorité réelle du parcours. On lit `profiles` directement plutôt
  -- que via get_user_role() pour contrôler AUSSI `active` : un compte désactivé
  -- garde un JWT valide jusqu'à son expiration, le refus au login ne suffit pas.
  SELECT p.role, p.active INTO v_role, v_active
  FROM profiles p
  WHERE p.id = auth.uid();

  IF auth.uid() IS NULL
     OR v_role IS NULL
     OR v_role NOT IN ('admin', 'super_admin')
     OR v_active IS FALSE THEN
    RAISE EXCEPTION 'Modification du numero de bien reservee aux administrateurs.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_nouveau := btrim(coalesce(p_nouveau_numero, ''));

  -- 2. FORME — même règle que le client (src/lib/numeroBien.js) et que le
  -- garde-fou de création (mondayFieldConstraints) : identifiant compact, ni
  -- espace ni texte libre, dans la longueur de la colonne varchar(50).
  IF v_nouveau = ''
     OR length(v_nouveau) > 50
     OR v_nouveau !~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$' THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'NUMERO_INVALIDE');
  END IF;

  -- 3. SÉRIALISATION — deux renumérotations concurrentes vers le MÊME numéro
  -- s'attendent ici. Le verrou est libéré à la fin de la transaction.
  -- La clé est en minuscules, comme le contrôle de collision ci-dessous : sans
  -- ça « PAR-2189 » et « par-2189 » prendraient deux verrous différents et
  -- passeraient tous les deux.
  -- Limite assumée : la CRÉATION d'une fiche ne prend pas ce verrou (elle n'a
  -- qu'une alerte de doublon non bloquante, cf. check_fiche_existante). Ce
  -- verrou protège donc les renumérotations entre elles, pas la course avec une
  -- création simultanée — périmètre inchangé sur ce point.
  PERFORM pg_advisory_xact_lock(hashtext('fiches.logement_numero_bien:' || lower(v_nouveau)));

  SELECT btrim(f.logement_numero_bien),
         (f.loomky_property_id   IS NOT NULL
       OR f.loomky_owner_id      IS NOT NULL
       OR f.loomky_checklist_ids IS NOT NULL
       OR f.loomky_sync_status   IS NOT NULL
       OR f.loomky_synced_at     IS NOT NULL
       OR f.loomky_snapshot      IS NOT NULL)
    INTO v_ancien, v_loomky
  FROM fiches f
  WHERE f.id = p_fiche_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'FICHE_INTROUVABLE');
  END IF;

  IF v_ancien = v_nouveau THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'NUMERO_IDENTIQUE');
  END IF;

  -- 4. COLLISION — sous le verrou, donc fiable. Pas de contournement dans cette
  -- version : on rend de quoi identifier la fiche qui bloque (l'appelant est
  -- admin ou super_admin, il a déjà accès en lecture à toutes les fiches).
  --
  -- Comparaison INSENSIBLE À LA CASSE. Le format autorise des préfixes
  -- alphabétiques (« PAR-2189 ») ; or le rapprochement du dossier Google Drive
  -- est, lui, insensible à la casse. « PAR-2189 » et « par-2189 » résoudraient
  -- donc le MÊME dossier Drive tout en passant pour deux biens distincts, et les
  -- deux fiches se partageraient dossier Drive et médias. On refuse la variante
  -- de casse d'un numéro déjà pris.
  -- La comparaison avec le numéro ACTUEL (étape précédente) reste exacte, elle :
  -- corriger la casse du numéro de SA PROPRE fiche est un changement légitime.
  -- Asymétrie assumée : `check_fiche_existante` (alerte de doublon à la
  -- création) compare toujours exactement. L'aligner changerait le comportement
  -- d'un autre parcours, hors périmètre ici — le refus vient alors du serveur,
  -- avec la fiche en conflit affichée.
  SELECT f.id, f.nom, f.statut, pr.prenom AS coordinateur_prenom, pr.nom AS coordinateur_nom
    INTO v_conflit
  FROM fiches f
  LEFT JOIN profiles pr ON pr.id = f.user_id
  WHERE lower(btrim(f.logement_numero_bien)) = lower(v_nouveau)
    AND f.id <> p_fiche_id
  ORDER BY f.updated_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'erreur', 'NUMERO_DEJA_UTILISE',
      'fiche_en_conflit', jsonb_build_object(
        'id', v_conflit.id,
        'nom', v_conflit.nom,
        'statut', v_conflit.statut,
        'coordinateur_prenom', v_conflit.coordinateur_prenom,
        'coordinateur_nom', v_conflit.coordinateur_nom
      )
    );
  END IF;

  -- 5. RENUMÉROTATION + REMISE À ZÉRO LOOMKY.
  -- Les marqueurs Loomky décrivent un logement créé dans le compte de l'ANCIENNE
  -- conciergerie : les garder ferait croire la fiche synchronisée et empêcherait
  -- de relancer le parcours avec le token du nouveau compte (planLoomkySync ne
  -- recrée jamais une property tant que loomky_property_id est posé).
  -- Le logement et les checklists restent INTACTS chez Loomky : aucune
  -- suppression distante n'est demandée, ici ni ailleurs dans ce parcours.
  -- `monday_snapshot` part avec : il mémorise ce qui a été poussé sur l'item de
  -- l'ANCIEN numéro, et sert de détection de changement à `triggerMondaySync`.
  -- Le garder ferait comparer la fiche à l'état d'un autre item : sur une fiche
  -- Complétée dont rien d'autre ne bouge, plus AUCUN push ne partirait, et le
  -- nouvel item resterait vide ; un changement ultérieur ne pousserait que le
  -- champ modifié, laissant les autres manquants pour toujours. Remis à NULL, le
  -- prochain enregistrement repart sur un push COMPLET vers le nouvel item
  -- (branche « déjà Complété mais pas de snapshot » de triggerMondaySync).
  -- L'item Monday lui-même n'est pas touché ici : aucun appel n'est fait.
  --
  -- Rien d'autre n'est touché : ni user_id, ni statut, ni la moindre donnée
  -- métier, ni la moindre URL de média.
  UPDATE fiches
  SET logement_numero_bien  = v_nouveau,
      loomky_property_id    = NULL,
      loomky_owner_id       = NULL,
      loomky_checklist_ids  = NULL,
      loomky_sync_status    = NULL,
      loomky_synced_at      = NULL,
      loomky_snapshot       = NULL,
      monday_snapshot       = NULL,
      updated_at            = (now() AT TIME ZONE 'utc')
  WHERE id = p_fiche_id;

  -- 6. ÉTAT MONDAY DES ANNONCES.
  -- `statut = 'valide'` veut dire « le document posé sur Monday EST l'annonce
  -- actuelle ». Après renumérotation, ce document est sur l'item de l'ancien
  -- numéro : le badge « Synchronisé sur Monday » mentirait. On retombe sur
  -- `genere`, exactement comme le fait toute mutation d'annonce, ce qui rouvre
  -- le bouton « Valider ». Le CONTENU est conservé (rien n'est régénéré).
  -- `generation_meta.validation` (item Monday et numéro de la validation
  -- précédente) est retiré : trace périmée, donc trompeuse.
  WITH invalidees AS (
    UPDATE agent_outputs
    SET statut          = 'genere',
        generation_meta = coalesce(generation_meta, '{}'::jsonb) - 'validation',
        updated_at      = now()
    WHERE fiche_id = p_fiche_id
      AND statut = 'valide'
    RETURNING 1
  )
  SELECT count(*) INTO v_annonces FROM invalidees;

  RETURN jsonb_build_object(
    'ok', true,
    'ancien_numero', v_ancien,
    'nouveau_numero', v_nouveau,
    'loomky_reinitialise', v_loomky,
    'annonces_invalidees', v_annonces
  );
END;
$fn$;

COMMENT ON FUNCTION public.changer_numero_bien(uuid, text) IS
  'Changement controle du numero de bien d''une fiche existante. Reserve aux '
  'roles admin et super_admin (controle fait ICI, pas dans React). Verifie la '
  'forme, refuse un numero identique ou deja utilise (sous verrou), remet les '
  'marqueurs Loomky a zero et invalide l''etat Monday des annonces. Aucun appel '
  'distant, aucun media touche. La trace numero_bien_changed est ecrite par le '
  'trigger d''audit existant log_fiche_updated.';

-- Appelable uniquement par un utilisateur connecté (le rôle est revérifié dans
-- le corps de la fonction).
REVOKE ALL     ON FUNCTION public.changer_numero_bien(uuid, text) FROM PUBLIC;
REVOKE ALL     ON FUNCTION public.changer_numero_bien(uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.changer_numero_bien(uuid, text) TO authenticated;

-- ============================================================
-- Vérification post-migration
--
-- 1. Droits (exécutable depuis le SQL Editor) :
--      SELECT proname, proacl FROM pg_proc WHERE proname = 'changer_numero_bien';
--      -- attendu : {authenticated=X/postgres} (ni anon, ni PUBLIC)
--
-- 2. Comportement : le scénario complet (rôles refusés, collision, succès,
--    Loomky, annonces, historique) est dans
--    docs/migrations/2026-09-07_changer_numero_bien_verification.sql
--    Il s'annule tout seul et ne laisse AUCUNE écriture derrière lui.
--
-- ROLLBACK de cette migration :
--      DROP FUNCTION IF EXISTS public.changer_numero_bien(uuid, text);
-- ============================================================
