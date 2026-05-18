-- ============================================================
-- Migration : Ajout du bloc "Local à vélo" dans Équip. spé. / Extérieur
-- Date     : 2026-05-18
-- Branche  : feat/local-velo
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase.
-- Toutes les colonnes sont nullable / défauts sûrs → migration non-bloquante,
-- les fiches existantes restent compatibles (local à vélo NULL = "non renseigné").
-- ============================================================

ALTER TABLE fiches
  -- 🚲 Local à vélo : question racine + photos + vidéo d'accès + type d'accès
  ADD COLUMN IF NOT EXISTS equip_spe_ext_dispose_local_velo      BOOLEAN,
  ADD COLUMN IF NOT EXISTS equip_spe_ext_local_velo_photos       TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS equip_spe_ext_local_velo_video_acces  TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS equip_spe_ext_local_velo_type_acces   TEXT;
  -- Valeurs possibles pour equip_spe_ext_local_velo_type_acces :
  --   'libre' | 'avec_cle'

-- ⚠️ Suivi : mettre à jour la fonction notify_fiche_completed() pour inclure
-- equip_spe_ext_local_velo_photos et equip_spe_ext_local_velo_video_acces dans
-- le payload media (sinon Make ne migrera pas les photos / la vidéo vers Google Drive).
-- Hors périmètre de la PR front, à traiter séparément côté Supabase.

COMMIT;
