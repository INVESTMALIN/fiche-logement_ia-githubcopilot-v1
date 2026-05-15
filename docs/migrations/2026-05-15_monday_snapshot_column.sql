-- ============================================================
-- Migration : monday_snapshot pour la sync Monday automatique
-- Date     : 2026-05-15
-- Branche  : feat/monday-sync
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase.
-- Colonne nullable, default NULL → migration non-bloquante,
-- les fiches existantes restent compatibles (snapshot vide = "jamais sync").
-- ============================================================

ALTER TABLE fiches
  ADD COLUMN IF NOT EXISTS monday_snapshot JSONB;

-- Format du snapshot (rempli par le hook post-save de FormContext.handleSave après
-- un push réussi vers Monday via l'Edge Function `monday-sync`) :
--
--   {
--     "type_premier_menage": "Vérification / Inventaire" | null,
--     "airbnb_mot_passe":    "..." | null,
--     "booking_mot_passe":   "..." | null
--   }
--
-- Sert uniquement à la dirty-detection côté client : on push vers Monday
-- uniquement si au moins un des 3 champs a changé depuis le dernier snapshot
-- (cf. mondayService.js → getMondayChangedFields).

COMMIT;
