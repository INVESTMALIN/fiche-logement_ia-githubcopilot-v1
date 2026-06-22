-- ============================================================
-- Migration : Photos de la façade (page Avis → carte "Évaluation de l'immeuble")
-- Date     : 2026-06-22
-- Branche  : feat/avis-facade-photos
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase (DEV puis PROD).
-- Colonne nullable avec défaut sûr → migration non-bloquante,
-- les fiches existantes restent compatibles ('{}' = "aucune photo").
--
-- Contexte : le coordinateur peut désormais uploader des photos de la
-- façade du bien (immeuble ou maison) pendant son inspection. Ces photos
-- sont destinées à être réutilisées pour l'annonce. Même pattern de
-- stockage que les autres champs média de la section avis
-- (ex. `avis_logement_vis_a_vis_photos`) : array d'URLs Supabase Storage.
-- ============================================================

ALTER TABLE fiches
  -- 📸 Photos de la façade (immeuble / maison) — photos seules, multiples
  ADD COLUMN IF NOT EXISTS avis_immeuble_facade_photos TEXT[] DEFAULT '{}'::text[];

-- ℹ️  Mapping applicatif : section_avis.immeuble_facade_photos
--     (cf. src/lib/supabaseHelpers.js, lecture + écriture).
-- ℹ️  Pas d'impact validation amont (champ média facultatif, comme les
--     photos du vis-à-vis).
-- ℹ️  Remontée Make.com / Drive (trigger + payload média) NON incluse dans
--     cette migration : elle sera traitée séparément dans un second temps.

COMMIT;
