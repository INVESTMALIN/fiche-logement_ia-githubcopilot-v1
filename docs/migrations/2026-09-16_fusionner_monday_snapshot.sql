-- ============================================================
-- Migration : fusion atomique par clé du snapshot Monday
-- Date      : 2026-09-16
-- Branche   : fix/monday-sync-isolation-champs
-- Projet    : Fiche Logement (qwjgkqxemnpvlhwxexht) UNIQUEMENT
-- ============================================================
-- Migration ADDITIVE : une seule fonction RPC. Aucune table modifiée, aucune
-- policy touchée, aucun trigger créé ou modifié, aucune ligne métier écrite.
--
-- ⚠️ ORDRE IMPÉRATIF : 1) cette migration  2) déploiement de l'Edge Function
--    `monday-sync`  3) merge de la PR (déploiement Vercel du front).
--    L'Edge Function appelle `fusionner_monday_snapshot` après chaque écriture
--    Monday réussie : sans la fonction, les écritures Monday passent mais
--    aucun champ n'est marqué synchronisé (re-push idempotent au save
--    suivant, rien de cassé). L'ancien front reste compatible avec la nouvelle
--    Edge Function ; l'inverse repousse en boucle sans casser.
--
-- CONTEXTE
-- `fiches.monday_snapshot` (jsonb) mémorise, pour chacun des 4 champs poussés
-- vers Monday, la dernière valeur réellement écrite côté Monday. C'est la base
-- de la détection de changement : un champ dont la valeur courante diffère du
-- snapshot est re-poussé au prochain enregistrement.
--
-- Jusqu'ici le snapshot était réécrit EN BLOC depuis le navigateur, après un
-- succès global de la mutation Monday. Avec des écritures Monday désormais
-- indépendantes par champ (un statut refusé ne doit plus entraîner les mots
-- de passe dans sa chute), il faut marquer synchronisés SEULEMENT les champs
-- réellement écrits — et le faire sans jamais effacer un succès enregistré par
-- une autre synchronisation (deux onglets, réponse tardive).
--
-- POURQUOI UNE FONCTION SQL
--   `COALESCE(monday_snapshot,'{}') || p_patch` est évalué par Postgres sous le
--   verrou de ligne de l'UPDATE : seules les clés du patch changent, les autres
--   sont conservées telles qu'elles sont EN BASE à cet instant — pas telles que
--   l'appelant les connaissait. Un `{...ancien, ...nouveau}` construit côté
--   client réécrirait des clés périmées. PostgREST ne sait pas exprimer `||`
--   dans un UPDATE, d'où la RPC.
--
-- GARDE DE RENUMÉROTATION (double)
--   Le WHERE exige que `logement_numero_bien` soit encore le numéro sur lequel
--   la synchronisation a poussé. Si un administrateur a renuméroté la fiche
--   pendant l'appel Monday (`changer_numero_bien` remet le snapshot à NULL
--   pour forcer un push complet vers le nouvel item), aucune ligne ne matche :
--   la fonction rend NULL et l'appelant n'écrase pas ce NULL. L'Edge Function
--   fait déjà ce contrôle AVANT d'écrire dans Monday ; celui-ci couvre la
--   fenêtre entre les deux.
--
-- SÉCURITÉ
--   SECURITY INVOKER : les RLS de `fiches` s'appliquent à l'appelant. Un
--   coordinateur ne peut fusionner que le snapshot de ses propres fiches, un
--   `admin` (SELECT seul) obtient NULL, un anonyme n'a pas le droit d'exécuter.
--   La fonction ne lit ni n'écrit aucune autre colonne.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fusionner_monday_snapshot(
  p_fiche_id    uuid,
  p_numero_bien text,
  p_patch       jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_snapshot jsonb;
BEGIN
  -- Un patch qui n'est pas un objet non vide est une erreur d'appel : on
  -- refuse plutôt que d'écrire n'importe quoi ou de toucher la ligne pour rien.
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::jsonb THEN
    RAISE EXCEPTION 'fusionner_monday_snapshot : p_patch doit etre un objet JSON non vide'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_fiche_id IS NULL OR p_numero_bien IS NULL OR btrim(p_numero_bien) = '' THEN
    RAISE EXCEPTION 'fusionner_monday_snapshot : p_fiche_id et p_numero_bien sont obligatoires'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.fiches
     SET monday_snapshot = COALESCE(monday_snapshot, '{}'::jsonb) || p_patch
   WHERE id = p_fiche_id
     AND logement_numero_bien = p_numero_bien
  RETURNING monday_snapshot INTO v_snapshot;

  -- NULL = rien persisté : fiche invisible pour l'appelant (RLS), inexistante,
  -- ou renumérotée entre-temps. Après une fusion réussie le snapshot contient
  -- au moins les clés du patch, il n'est donc jamais NULL : pas d'ambiguïté.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN v_snapshot;
END;
$$;

COMMENT ON FUNCTION public.fusionner_monday_snapshot(uuid, text, jsonb) IS
  'Sync Monday : fusionne par clé (||) les champs réellement écrits côté Monday dans fiches.monday_snapshot, sous garde du numéro de bien. NULL si aucune ligne ne matche (RLS, renumérotation). SECURITY INVOKER.';

-- Droits : les utilisateurs connectés uniquement. Le schéma `public` de
-- Supabase accorde EXECUTE à PUBLIC par défaut sur les nouvelles fonctions,
-- on retire explicitement.
REVOKE ALL ON FUNCTION public.fusionner_monday_snapshot(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fusionner_monday_snapshot(uuid, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.fusionner_monday_snapshot(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fusionner_monday_snapshot(uuid, text, jsonb) TO service_role;

-- ============================================================
-- ROLLBACK (à exécuter tel quel si besoin de revenir en arrière)
-- ------------------------------------------------------------
-- DROP FUNCTION IF EXISTS public.fusionner_monday_snapshot(uuid, text, jsonb);
--
-- Conséquence du rollback : l'Edge Function `monday-sync` déployée continue
-- d'écrire dans Monday mais ne peut plus marquer les champs synchronisés
-- (elle journalise l'erreur RPC et rend `snapshotPersiste: false`) → chaque
-- enregistrement d'une fiche Complété re-pousse les champs, de façon
-- idempotente. Redéployer la version précédente de l'Edge Function pour
-- revenir à la persistance en bloc côté navigateur.
-- ============================================================
