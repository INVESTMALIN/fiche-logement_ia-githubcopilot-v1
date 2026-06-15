-- ============================================================
-- Migration : Nouvelle section "Vue depuis le logement" (page Avis)
-- Date     : 2026-06-15
-- Branche  : feat/avis-vue-section
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase (DEV puis PROD).
-- Colonne nullable avec défaut sûr → migration non-bloquante,
-- les fiches existantes restent compatibles ('{}' = "non renseigné").
--
-- Contexte : la vue depuis le logement n'était captée que par la case
-- générique `avis_atouts_vue_panoramique` (un atout parmi 37). On la
-- remplace par une section dédiée multi-sélection, modélisée comme un
-- array de clés (même pattern que `avis_quartier_types`).
--
-- Valeurs possibles (clés) pour avis_vue_types :
--   'vue_mer' | 'vue_lac' | 'vue_riviere' | 'vue_canal' | 'vue_montagne'
--   | 'vue_campagne' | 'vue_foret' | 'vue_vignoble' | 'vue_port'
--   | 'vue_monument' | 'vue_ville' | 'vue_toits' | 'vue_jardin'
--   | 'vue_cour_interieure' | 'vue_panoramique' | 'vue_aucune'
-- ('vue_aucune' = vue évaluée, rien à valoriser ≠ section vide non renseignée)
-- ============================================================

ALTER TABLE fiches
  -- 👁️ Vue depuis le logement (multi-sélection)
  ADD COLUMN IF NOT EXISTS avis_vue_types TEXT[] DEFAULT '{}'::text[];

-- ℹ️  Pas de migration de données : l'ancienne colonne
--     `avis_atouts_vue_panoramique` est conservée telle quelle (les fiches
--     déjà cochées gardent leur valeur). L'option "Vue panoramique" est
--     simplement retirée de la liste des atouts côté UI.
-- ℹ️  Pas d'impact validation amont (section facultative).
-- ℹ️  Pas d'impact Make.com / Monday / Loomky à ce stade (donnée descriptive,
--     destinée à la future refonte de l'agent annonce).

COMMIT;
