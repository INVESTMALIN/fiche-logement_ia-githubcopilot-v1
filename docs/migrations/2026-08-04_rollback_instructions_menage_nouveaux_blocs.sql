-- ============================================================
-- ROLLBACK : Section "Instructions Ménage" — nouveaux blocs
-- Date     : 2026-08-04
-- Branche  : feat/instructions-menage-nouveaux-blocs
-- ============================================================
-- Annule `2026-08-04_instructions_menage_nouveaux_blocs.sql`.
--
-- ⚠️ À n'exécuter QU'APRÈS avoir remis le code applicatif dans son état
--    précédent (revert de la PR). Si les colonnes disparaissent alors que
--    mapFormDataToSupabase les référence encore, la sauvegarde du formulaire
--    casse sur TOUTES les fiches.
--
-- ⚠️ DESTRUCTIF : le DROP COLUMN efface définitivement les consignes de ménage,
--    les produits, le kit de bienvenue et les points de vigilance déjà saisis
--    par les coordinateurs. Ce n'est PAS symétrique de la migration aller.
--    Faire un export avant si des fiches ont déjà été renseignées :
--
--      SELECT id, nom,
--             instructions_menage_consignes_generales,
--             instructions_menage_consignes_videos,
--             instructions_menage_produits_materiel,
--             instructions_menage_kit_achat_par_prestataire,
--             instructions_menage_kit_installation_par_prestataire,
--             instructions_menage_kit_composition,
--             instructions_menage_kit_photos,
--             instructions_menage_points_vigilance
--      FROM public.fiches
--      WHERE instructions_menage_consignes_generales IS NOT NULL
--         OR instructions_menage_produits_materiel   IS NOT NULL
--         OR instructions_menage_kit_composition     IS NOT NULL
--         OR instructions_menage_points_vigilance    IS NOT NULL
--         OR instructions_menage_kit_achat_par_prestataire        IS NOT NULL
--         OR instructions_menage_kit_installation_par_prestataire IS NOT NULL
--         OR coalesce(array_length(instructions_menage_consignes_videos, 1), 0) > 0
--         OR coalesce(array_length(instructions_menage_kit_photos, 1), 0)      > 0;
--
--    Les fichiers déjà montés sur le Drive dans `8. Ménage` ne sont PAS
--    supprimés par ce script — ils restent en place, seules les références
--    en base disparaissent.
-- ============================================================

BEGIN;

-- 1. Retirer les lignes de manifeste D'ABORD.
--    Si on droppait les colonnes en premier, `media_manifest_ecarts` signalerait
--    entre-temps deux « lignes du manifeste sans colonne correspondante ».
DELETE FROM public.media_manifest
WHERE colonne_db IN (
  'instructions_menage_consignes_videos',
  'instructions_menage_kit_photos'
);

-- 2. Puis les colonnes.
ALTER TABLE public.fiches
  DROP COLUMN IF EXISTS instructions_menage_consignes_generales,
  DROP COLUMN IF EXISTS instructions_menage_consignes_videos,
  DROP COLUMN IF EXISTS instructions_menage_produits_materiel,
  DROP COLUMN IF EXISTS instructions_menage_kit_achat_par_prestataire,
  DROP COLUMN IF EXISTS instructions_menage_kit_installation_par_prestataire,
  DROP COLUMN IF EXISTS instructions_menage_kit_composition,
  DROP COLUMN IF EXISTS instructions_menage_kit_photos,
  DROP COLUMN IF EXISTS instructions_menage_points_vigilance;

COMMIT;

-- ============================================================
-- ✅ Vérifications après exécution
-- ============================================================
--
--   SELECT * FROM public.media_manifest_ecarts;
--   -- attendu : 0 ligne
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'fiches'
--     AND column_name LIKE 'instructions_menage_%';
--   -- attendu : 0 ligne
--
-- Le dossier Drive `8. Ménage` n'est pas recréé aux prochaines finalisations
-- une fois les lignes de manifeste retirées.
