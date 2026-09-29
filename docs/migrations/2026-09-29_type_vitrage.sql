-- ============================================================
-- Migration : type de vitrage (Chambres 1 à 6 + Salon / SAM)
-- Date      : 2026-09-29
-- Branche   : feat/type-vitrage-chambres-salon
-- Projet    : Fiche Logement (qwjgkqxemnpvlhwxexht) UNIQUEMENT
-- ============================================================
-- Migration ADDITIVE : 7 colonnes `text` nullable sur `fiches`, SANS valeur
-- par défaut. Rien d'autre : aucune colonne existante modifiée, aucune
-- contrainte, aucune policy, aucun trigger, aucun backfill, aucune ligne
-- de `fiches` écrite. Les ~400 fiches existantes gardent NULL = « non répondu ».
--
-- ⚠️ ORDRE : 1) cette migration + vérification  2) merge (Vercel).
--    Le front de la PR envoie ces colonnes à chaque sauvegarde : sans elles,
--    la sauvegarde casserait sur toutes les fiches. L'inverse est inoffensif
--    (le front de prod ignore des colonnes qu'il ne connaît pas).
--
-- CONTEXTE (demande Mélissa) : noter si les fenêtres d'une pièce sont en
-- simple ou double vitrage. Question facultative, valeurs écrites par le
-- front : 'Simple vitrage' | 'Double vitrage' | NULL.
-- Aucun `photo` / `video` dans les noms : hors `media_manifest`.
-- ============================================================

BEGIN;

ALTER TABLE public.fiches
  ADD COLUMN IF NOT EXISTS chambres_chambre_1_type_vitrage text,
  ADD COLUMN IF NOT EXISTS chambres_chambre_2_type_vitrage text,
  ADD COLUMN IF NOT EXISTS chambres_chambre_3_type_vitrage text,
  ADD COLUMN IF NOT EXISTS chambres_chambre_4_type_vitrage text,
  ADD COLUMN IF NOT EXISTS chambres_chambre_5_type_vitrage text,
  ADD COLUMN IF NOT EXISTS chambres_chambre_6_type_vitrage text,
  ADD COLUMN IF NOT EXISTS salon_sam_type_vitrage text;

COMMIT;

-- ============================================================
-- VÉRIFICATION (lecture seule)
-- ------------------------------------------------------------
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'fiches'
--    AND column_name LIKE '%type_vitrage'
--  ORDER BY column_name;   -- 7 lignes, text, YES, column_default NULL
--
-- ROLLBACK (si besoin, AVANT toute saisie réelle dans ces colonnes)
-- ------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE public.fiches
--   DROP COLUMN IF EXISTS chambres_chambre_1_type_vitrage,
--   DROP COLUMN IF EXISTS chambres_chambre_2_type_vitrage,
--   DROP COLUMN IF EXISTS chambres_chambre_3_type_vitrage,
--   DROP COLUMN IF EXISTS chambres_chambre_4_type_vitrage,
--   DROP COLUMN IF EXISTS chambres_chambre_5_type_vitrage,
--   DROP COLUMN IF EXISTS chambres_chambre_6_type_vitrage,
--   DROP COLUMN IF EXISTS salon_sam_type_vitrage;
-- COMMIT;
-- (Destructif : le front de la PR devra être retiré AVANT, sinon ses
--  sauvegardes cassent.)
-- ============================================================
