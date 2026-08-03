-- ============================================================
-- Migration : Détection de doublon inter-coordinateurs
-- Date     : 2026-08-03
-- Branche  : feat/alerte-doublon-cross-coordinateur
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase (DEV puis PROD).
-- Migration additive : nouvelle fonction isolée, aucune table touchée,
-- aucune policy modifiée, aucun impact sur les flux existants.
--
-- ⚠️ ORDRE IMPÉRATIF : appliquer CETTE migration AVANT de merger la PR.
--    Le code appelle `check_fiche_existante` dès son déploiement Vercel.
--    Si la fonction n'existe pas encore, l'appel échoue et l'alerte de
--    doublon disparaît silencieusement (non bloquant : la création de
--    fiche continue de fonctionner, mais sans garde-fou).
--    Séquence : 1) cette migration  2) merge  3) déploiement Vercel.
--
-- Contexte : la vérification de doublon (PR #76) est une lecture côté
-- client, donc soumise aux RLS de `fiches`. La policy
-- `coordinateur_own_fiches` limite un coordinateur à ses propres fiches :
-- il ne voit RIEN quand le bien est déjà couvert par la fiche d'un
-- collègue, et crée un doublon. Sur les 17 biens à plusieurs fiches,
-- 5 sont à cheval sur deux utilisateurs — et ce sont les coordinateurs
-- qui créent les fiches (324 des 410 fiches).
-- Enjeu : deux fiches d'un même bien partagent le dossier photos Supabase
-- et le dossier Google Drive (incident du 02/08/2026, photos perdues).
--
-- Choix : une fonction SECURITY DEFINER plutôt qu'un élargissement des
-- policies. Les RLS restent inchangées — un coordinateur ne peut toujours
-- pas lire ni lister les fiches de ses collègues. La fonction ne rend que
-- le strict nécessaire pour comprendre la situation :
--   - qu'une fiche existe pour ce bien (1 ligne maximum, jamais de liste),
--   - son nom,
--   - l'identité du coordinateur qui l'a créée (prénom + nom),
--   - rien du CONTENU de la fiche.
-- L'`id` n'est rendu que s'il est exploitable par l'appelant (sa propre
-- fiche, ou rôle admin / super_admin) : inutile de divulguer un
-- identifiant que les RLS refuseront de charger.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_fiche_existante(p_numero_bien text)
RETURNS TABLE (
  id                  uuid,
  nom                 text,
  statut              text,
  est_proprietaire    boolean,
  peut_ouvrir         boolean,
  coordinateur_prenom text,
  coordinateur_nom    text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Identifiant rendu seulement s'il est ouvrable par l'appelant.
    CASE
      WHEN f.user_id = auth.uid()
        OR public.get_user_role() IN ('admin', 'super_admin')
      THEN f.id
    END AS id,
    f.nom,
    -- Statut réservé à ma propre fiche : sur celle d'un tiers, c'est une
    -- information de suivi dont l'alerte n'a pas besoin.
    CASE WHEN f.user_id = auth.uid() THEN f.statut END AS statut,
    (f.user_id = auth.uid()) AS est_proprietaire,
    -- Les admins gardent l'accès en lecture qu'ils ont déjà via les RLS :
    -- le bouton « Ouvrir existante » reste pertinent pour eux.
    (
      f.user_id = auth.uid()
      OR public.get_user_role() IN ('admin', 'super_admin')
    ) AS peut_ouvrir,
    -- Identité affichée uniquement quand la fiche est celle d'un tiers.
    CASE WHEN f.user_id = auth.uid() THEN NULL ELSE p.prenom END AS coordinateur_prenom,
    CASE WHEN f.user_id = auth.uid() THEN NULL ELSE p.nom    END AS coordinateur_nom
  FROM fiches f
  LEFT JOIN profiles p ON p.id = f.user_id
  WHERE
    -- Jamais d'anonyme : la fonction n'est appelable que connecté.
    auth.uid() IS NOT NULL
    AND nullif(btrim(p_numero_bien), '') IS NOT NULL
    AND btrim(f.logement_numero_bien) = btrim(p_numero_bien)
  -- Priorité à MA fiche quand plusieurs existent : c'est le cas actionnable
  -- (« Ouvrir existante »). Sinon, la plus récemment travaillée.
  ORDER BY (f.user_id = auth.uid()) DESC, f.updated_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.check_fiche_existante(text) IS
  'Alerte de doublon : renvoie au plus 1 ligne décrivant une fiche existante '
  'pour ce numéro de bien, tous propriétaires confondus. Contourne les RLS '
  'volontairement, mais ne divulgue aucun contenu de fiche. Usage exclusif : '
  'le garde-fou affiché avant création (FormContext.checkForDuplicate).';

-- Appelable uniquement par un utilisateur connecté.
REVOKE ALL     ON FUNCTION public.check_fiche_existante(text) FROM PUBLIC;
REVOKE ALL     ON FUNCTION public.check_fiche_existante(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.check_fiche_existante(text) TO authenticated;

-- ============================================================
-- Vérification post-migration (à exécuter connecté en tant qu'utilisateur,
-- pas dans le SQL Editor où auth.uid() est NULL — le SQL Editor renverra
-- donc 0 ligne, c'est normal et c'est même la preuve du garde-fou anonyme) :
--
--   SELECT * FROM check_fiche_existante('9999');
--
-- Contrôle des droits, lui exécutable depuis le SQL Editor :
--
--   SELECT proname, proacl FROM pg_proc WHERE proname = 'check_fiche_existante';
--   -- attendu : {authenticated=X/postgres} (ni anon, ni PUBLIC)
-- ============================================================
