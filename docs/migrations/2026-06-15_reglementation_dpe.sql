-- ============================================================
-- Migration : Champs DPE dans la section Réglementation
-- Date     : 2026-06-15
-- Branche  : feat/reglementation-dpe
-- ============================================================
-- À exécuter UNE SEULE FOIS dans le SQL Editor du dashboard Supabase
-- (ce projet a un seul environnement Supabase, pas de DEV/PROD séparés).
-- Colonnes nullable / idempotentes (ADD COLUMN IF NOT EXISTS) → migration
-- non-bloquante, les fiches existantes restent compatibles (NULL = "non renseigné").
--
-- Contexte : la classe énergétique (DPE) doit figurer sur une annonce de
-- location ; pour un logement classé F ou G, l'annonce doit aussi afficher
-- une estimation des dépenses énergétiques annuelles (fourchette). On collecte
-- donc ces données ici, en restant facultatives côté coordinateur.
--
-- Valeurs possibles pour reglementation_classe_dpe :
--   'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'Non communiqué'
--   (NULL / absent = non renseigné ; 'Non communiqué' = réponse explicite)
-- reglementation_dpe_depenses_min / _max : estimation €/an (fourchette),
--   renseignées uniquement pour les classes F et G.
-- ============================================================

ALTER TABLE fiches
  -- 🔋 DPE : classe énergétique + estimation des dépenses annuelles (F/G)
  ADD COLUMN IF NOT EXISTS reglementation_classe_dpe         TEXT,
  ADD COLUMN IF NOT EXISTS reglementation_dpe_depenses_min   INTEGER,
  ADD COLUMN IF NOT EXISTS reglementation_dpe_depenses_max   INTEGER;

-- ℹ️  Pas d'impact validation amont : aucun de ces champs n'est obligatoire
--     (ni à l'enregistrement, ni à la finalisation).
-- ℹ️  Pas de champ "Logement à consommation énergétique excessive" : cette
--     mention est ajoutée automatiquement par l'agent annonce (hors fiche).

COMMIT;
