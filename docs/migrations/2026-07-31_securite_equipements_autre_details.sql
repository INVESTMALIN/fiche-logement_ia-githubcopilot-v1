-- ============================================================
-- Migration : Précision "Autre équipement de sécurité"
-- Date     : 2026-07-31
-- Branche  : fix/securite-autre-details
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase (DEV puis PROD).
-- Colonne nullable → migration additive non-bloquante, les fiches
-- existantes restent compatibles (NULL = "non renseigné").
--
-- ⚠️ ORDRE IMPÉRATIF : appliquer CETTE migration AVANT de merger la PR.
--    Le code de `mapFormDataToSupabase` enverra la colonne dès son
--    déploiement Vercel ; si elle n'existe pas encore, la sauvegarde
--    échoue sur TOUTES les fiches (Supabase rejette la colonne inconnue).
--    Séquence : 1) cette migration  2) merge  3) attendre la fin du
--    déploiement Vercel avant de retester une sauvegarde.
--
-- Contexte : le champ "Autre équipement de sécurité — veuillez préciser"
-- existe dans FicheSecurite.jsx depuis l'origine, mais n'était mappé dans
-- aucune des deux fonctions de `supabaseHelpers.js`. Le texte saisi par le
-- coordinateur était donc perdu à la sauvegarde — et absent du PDF.
-- Trouvé pendant l'audit de complétude du PDF logement (PR #71).
--
-- Type aligné sur le champ texte voisin de la même section
-- (`securite_alarme_desarmement` : TEXT nullable).
-- ============================================================

ALTER TABLE fiches
  -- 🔒 Précision libre saisie quand "Autre (veuillez préciser)" est coché
  --    dans la liste des équipements de sécurité
  ADD COLUMN IF NOT EXISTS securite_equipements_autre_details TEXT;

-- ℹ️  Champ optionnel : aucun impact validation (non requis à la finalisation).
-- ℹ️  Conditionnel côté UI uniquement : l'encart n'apparaît que si
--     "Autre (veuillez préciser)" est coché dans `securite_equipements`.
-- ℹ️  Pas d'impact Make.com / Monday / Loomky : champ non consommé côté API,
--     donc NON mappé dans normalizeFormDataToFiche (cohérent avec les autres
--     champs de la section Sécurité).
-- ℹ️  Remontée PDF logement automatique via le rendu générique de la section
--     Sécurité (`sectionsConfig` + `formatValue`), sans modification du template.
--     PDF ménage : la section Sécurité y figure aussi, même rendu générique.

COMMIT;
