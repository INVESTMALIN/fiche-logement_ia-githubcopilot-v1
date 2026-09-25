-- ============================================================
-- Migration : boîte à clés de secours (section Clés)
-- Date      : 2026-09-25
-- Branche   : feat/bac-secours
-- Projet    : Fiche Logement (qwjgkqxemnpvlhwxexht) UNIQUEMENT
-- ============================================================
-- Migration ADDITIVE : 10 colonnes nullable sur `fiches` + 2 lignes dans
-- `media_manifest`. Aucune colonne existante modifiée, aucune policy, aucun
-- trigger, aucune ligne métier de `fiches` écrite.
--
-- ⚠️ ORDRE : 1) cette migration  2) déploiement Edge `monday-sync`
--    3) preuve live sur la preview de la PR  4) merge (Vercel).
--    Le front de la PR envoie ces colonnes à chaque sauvegarde : sans elles,
--    la sauvegarde casserait sur toutes les fiches. L'inverse est inoffensif
--    (le front de prod ignore des colonnes qu'il ne connaît pas).
--
-- CONTEXTE (demande Victoria, 22/09) : certains logements ont une deuxième
-- boîte à clés, de secours. Déroulé calqué sur la boîte principale, limité à
-- TTlock et Masterlock. Mapping FormContext ↔ colonnes : supabaseHelpers.js,
-- règles : src/lib/clefsSecours.js.
--
-- PHOTOS : les deux colonnes `text[]` contiennent `photo` dans leur nom (sinon
-- la vue `media_manifest_ecarts` ne les verrait pas) et sont déclarées dans
-- `media_manifest`, même dossier Drive que les photos de la boîte principale.
-- Après application : `SELECT * FROM media_manifest_ecarts;` doit être vide.
-- ============================================================

BEGIN;

ALTER TABLE public.fiches
  ADD COLUMN IF NOT EXISTS clefs_secours boolean,
  ADD COLUMN IF NOT EXISTS clefs_secours_type text,
  ADD COLUMN IF NOT EXISTS clefs_secours_emplacement text,
  ADD COLUMN IF NOT EXISTS clefs_secours_emplacement_photo text[],
  ADD COLUMN IF NOT EXISTS clefs_secours_emplacement_emballage text,
  ADD COLUMN IF NOT EXISTS clefs_secours_emplacement_emballage_photo text[],
  ADD COLUMN IF NOT EXISTS clefs_secours_ttlock_masterpin_conciergerie text,
  ADD COLUMN IF NOT EXISTS clefs_secours_ttlock_code_proprietaire text,
  ADD COLUMN IF NOT EXISTS clefs_secours_ttlock_code_menage text,
  ADD COLUMN IF NOT EXISTS clefs_secours_masterlock_code text;

COMMENT ON COLUMN public.fiches.clefs_secours IS 'Boîte à clés de secours : true / false / NULL (non répondu)';
COMMENT ON COLUMN public.fiches.clefs_secours_type IS 'Type de la boîte de secours : TTlock | Masterlock. Poussé vers Monday (colonne « BAC secours », color_mm7hfdn5) par monday-sync';

INSERT INTO public.media_manifest (colonne_db, cle, dossier, prefixe, type, ordre, actif, commentaire)
VALUES
  ('clefs_secours_emplacement_emballage_photo', 'clefs_secours_emplacement_emballage_photo', '5. Équipements/Équipement', 'Emballage-secours', 'photo', 305, true, 'Boîte à clés de secours — emplacement de l''emballage (2026-09-25)'),
  ('clefs_secours_emplacement_photo', 'clefs_secours_emplacement_photo', '5. Équipements/Équipement', 'Emplacement-clefs-secours', 'photo', 315, true, 'Boîte à clés de secours — emplacement de la boîte (2026-09-25)')
ON CONFLICT (colonne_db) DO NOTHING;

COMMIT;

-- ============================================================
-- VÉRIFICATION (lecture seule)
-- ------------------------------------------------------------
-- SELECT column_name, data_type, column_default FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'fiches' AND column_name LIKE 'clefs_secours%'
--  ORDER BY column_name;                                  -- 10 lignes
-- SELECT colonne_db, dossier, prefixe, ordre FROM media_manifest
--  WHERE colonne_db LIKE 'clefs_secours%';                 -- 2 lignes
-- SELECT * FROM media_manifest_ecarts;                     -- 0 ligne
--
-- ROLLBACK (si besoin, AVANT toute saisie réelle dans ces colonnes)
-- ------------------------------------------------------------
-- BEGIN;
-- DELETE FROM public.media_manifest WHERE colonne_db IN
--   ('clefs_secours_emplacement_photo', 'clefs_secours_emplacement_emballage_photo');
-- ALTER TABLE public.fiches
--   DROP COLUMN IF EXISTS clefs_secours,
--   DROP COLUMN IF EXISTS clefs_secours_type,
--   DROP COLUMN IF EXISTS clefs_secours_emplacement,
--   DROP COLUMN IF EXISTS clefs_secours_emplacement_photo,
--   DROP COLUMN IF EXISTS clefs_secours_emplacement_emballage,
--   DROP COLUMN IF EXISTS clefs_secours_emplacement_emballage_photo,
--   DROP COLUMN IF EXISTS clefs_secours_ttlock_masterpin_conciergerie,
--   DROP COLUMN IF EXISTS clefs_secours_ttlock_code_proprietaire,
--   DROP COLUMN IF EXISTS clefs_secours_ttlock_code_menage,
--   DROP COLUMN IF EXISTS clefs_secours_masterlock_code;
-- COMMIT;
-- (Destructif : le front de la PR devra être retiré AVANT, sinon ses
--  sauvegardes cassent.)
-- ============================================================
