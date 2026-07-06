-- ============================================================
-- Migration : Rideau occultant dans les équipements chambre
-- Date     : 2026-07-06
-- Branche  : feat/chambre-rideau-occultant
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase (DEV puis PROD).
-- Colonnes nullable → migration non-bloquante, les fiches existantes
-- restent compatibles (NULL = "non renseigné").
--
-- Contexte : demande d'Albéric (coordinateur). Ajout de l'option
-- "Rideau occultant" dans "Équipements dans la chambre", pour chacune
-- des 6 chambres possibles. Booléen nullable, aligné sur les autres
-- équipements chambre (`_stores_manuels`, `_stores_electriques`, ...).
--
-- Convention booléenne (identique aux autres équipements chambre) :
--   TRUE  = présent
--   NULL  = non renseigné (case décochée par défaut)
-- ============================================================

ALTER TABLE fiches
  -- 🪟 Rideau occultant par chambre (1 à 6)
  ADD COLUMN IF NOT EXISTS chambres_chambre_1_equipements_rideaux_occultants BOOLEAN,
  ADD COLUMN IF NOT EXISTS chambres_chambre_2_equipements_rideaux_occultants BOOLEAN,
  ADD COLUMN IF NOT EXISTS chambres_chambre_3_equipements_rideaux_occultants BOOLEAN,
  ADD COLUMN IF NOT EXISTS chambres_chambre_4_equipements_rideaux_occultants BOOLEAN,
  ADD COLUMN IF NOT EXISTS chambres_chambre_5_equipements_rideaux_occultants BOOLEAN,
  ADD COLUMN IF NOT EXISTS chambres_chambre_6_equipements_rideaux_occultants BOOLEAN;

-- ℹ️  Champ optionnel : aucun impact validation (non requis à la finalisation).
-- ℹ️  Aucune logique conditionnelle branchée dessus (confort utilisateur).
-- ℹ️  Pas d'impact Make.com / Monday / Loomky : champ non consommé côté API,
--     donc NON mappé dans normalizeFormDataToFiche (cohérent avec le
--     traitement des autres équipements "stores" chambre).
-- ℹ️  Remontée PDF (logement + ménage) automatique via le rendu générique
--     des objets chambre (formatValue + formatFieldName), comme les stores.

COMMIT;
