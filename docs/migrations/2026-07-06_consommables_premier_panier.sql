-- ============================================================
-- Migration : 1er panier de consommables (distinct du quotidien)
-- Date     : 2026-07-06
-- Branche  : feat/consommables-1er-panier-quotidien
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase (DEV puis PROD).
-- Colonne nullable → migration non-bloquante, les fiches existantes
-- restent compatibles (NULL = "non renseigné").
--
-- Contexte : retour terrain de Melissa (coordinatrice). La section
-- Consommables ne distinguait pas qui fournit quoi et à quel moment.
-- On sépare désormais :
--   • 1er panier (à l'ouverture du logement)  → nouvelle colonne ci-dessous
--   • quotidien / renouvellement récurrent     → colonne existante
--     `consommables_fournis_par_prestataire` (inchangée)
--
-- Convention booléenne (identique au champ quotidien existant) :
--   TRUE  = fourni par le prestataire de ménage
--   FALSE = fourni par le propriétaire
--   NULL  = non renseigné
-- ============================================================

ALTER TABLE fiches
  -- 🧴 1er panier de consommables (à l'ouverture) — pendant du champ quotidien existant
  ADD COLUMN IF NOT EXISTS consommables_premier_panier_par_prestataire BOOLEAN;

-- ℹ️  Impact validation : champ obligatoire à la finalisation
--     (REQUIRED_FIELDS.consommables, au même titre que le quotidien).
-- ℹ️  Aucune logique conditionnelle branchée sur ce champ (info descriptive).
--     La liste rouge + le bloc "Sur demande" restent pilotés par le quotidien.
-- ℹ️  Pas d'impact Make.com / Monday / Loomky (champ non consommé côté API ;
--     mappé dans normalizeFormDataToFiche par discipline uniquement).
-- ℹ️  Remontée PDF (logement + ménage) via rendu explicite Prestataire/Propriétaire.

COMMIT;
