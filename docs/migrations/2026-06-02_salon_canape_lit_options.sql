-- ============================================================
-- Migration : Sous-options canapé-lit dans Salon / Salle à Manger
-- Date     : 2026-06-02
-- Branche  : feat/canape-lit-options-salon
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase (DEV puis PROD).
-- Toutes les colonnes sont nullable → migration non-bloquante,
-- les fiches existantes restent compatibles (sous-options NULL = "non renseigné").
--
-- Contexte : quand `salon_sam_equipements_canape_lit = TRUE`, l'UI affiche
-- désormais 4 sous-options en plus de la vidéo d'ouverture/fermeture
-- existante. Ces sous-options sont indépendantes les unes des autres
-- (un canapé-lit peut être simple ET équipé, ou juste "autre type" + détails).
-- ============================================================

ALTER TABLE fiches
  -- 🛋️ Sous-options canapé-lit salon (conditionnel à salon_sam_equipements_canape_lit)
  ADD COLUMN IF NOT EXISTS salon_sam_canape_lit_simple              BOOLEAN,
  ADD COLUMN IF NOT EXISTS salon_sam_canape_lit_double              BOOLEAN,
  ADD COLUMN IF NOT EXISTS salon_sam_canape_lit_autre_type          BOOLEAN,
  ADD COLUMN IF NOT EXISTS salon_sam_canape_lit_autre_type_details  TEXT,
  ADD COLUMN IF NOT EXISTS salon_sam_canape_lit_equipements         BOOLEAN;

-- ℹ️  Pas d'impact validation amont (pas de champ obligatoire).
-- ℹ️  Pas d'impact Make.com / Monday / Loomky (sous-options purement descriptives).
-- ℹ️  Le PDF reprend automatiquement ces champs via le rendu générique
--     (formatValue + formatFieldName sur chaque clé de section_salon_sam).

COMMIT;
