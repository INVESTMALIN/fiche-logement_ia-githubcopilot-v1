-- =====================================================================
-- MIGRATION ADDITIVE — 3e valeur de fiches.guide_acces_video_avertissement
-- Date : 22 septembre 2026 (complète 2026-09-22_guide_acces_video_avertissement.sql)
-- PR : feat/guide-acces-video-cible-livret (round 2 de review)
-- =====================================================================
--
-- Objet : autoriser la valeur provisoire 'compression_en_cours' dans la
-- contrainte CHECK de la colonne créée par la migration précédente.
--
-- Pourquoi : l'original est désormais publié dans la fiche DÈS son upload
-- (persisté par l'autosave), puis le job de compression tourne jusqu'à
-- 20 min. Si la session est interrompue entre-temps (onglet fermé, mobile en
-- veille), la fiche garderait une vidéo au-dessus de la cible SANS aucun
-- avertissement. L'app pose donc 'compression_en_cours' au départ du job et
-- le remplace par l'état final à l'arrivée : s'il survit à un rechargement,
-- le coordinateur voit un message durable avec le remède (réimporter).
--
-- Valeurs : NULL | 'compression_en_cours' | 'trop_lourde' | 'compression_echouee'
--
-- ORDRE : jouer ce fichier AVANT de merger la PR (sinon l'app écrit une
-- valeur refusée par le CHECK et la sauvegarde échoue sur la fiche concernée).
-- Un bloc à la fois.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BLOC 1 — PRECONTROLE (lecture seule)
-- Attendu : 1 ligne, la contrainte actuelle avec les deux valeurs.
-- ---------------------------------------------------------------------
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname = 'fiches_guide_acces_video_avertissement_check';


-- ---------------------------------------------------------------------
-- BLOC 2 — MIGRATION : remplacement de la contrainte (idempotent)
-- ---------------------------------------------------------------------
ALTER TABLE fiches
    DROP CONSTRAINT IF EXISTS fiches_guide_acces_video_avertissement_check;

ALTER TABLE fiches
    ADD CONSTRAINT fiches_guide_acces_video_avertissement_check
    CHECK (guide_acces_video_avertissement IS NULL
           OR guide_acces_video_avertissement IN ('compression_en_cours', 'trop_lourde', 'compression_echouee'));

COMMENT ON COLUMN fiches.guide_acces_video_avertissement IS
    'Avertissement cible livret pour guide_acces_video_acces : NULL | compression_en_cours (provisoire) | trop_lourde | compression_echouee (src/lib/videoGuideAcces.js)';


-- ---------------------------------------------------------------------
-- BLOC 3 — CONTROLE POST-MIGRATION (lecture seule)
-- Attendu : la définition contient les trois valeurs ; 0 fiche avertie
-- (aucun backfill).
-- ---------------------------------------------------------------------
SELECT pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname = 'fiches_guide_acces_video_avertissement_check';

SELECT COUNT(*) FILTER (WHERE guide_acces_video_avertissement IS NOT NULL) AS fiches_averties
FROM fiches;


-- =====================================================================
-- ROLLBACK : revenir aux deux valeurs (seulement si aucune fiche ne porte
-- 'compression_en_cours', sinon le ADD CONSTRAINT échoue — c'est voulu).
--
-- ALTER TABLE fiches DROP CONSTRAINT IF EXISTS fiches_guide_acces_video_avertissement_check;
-- ALTER TABLE fiches ADD CONSTRAINT fiches_guide_acces_video_avertissement_check
--   CHECK (guide_acces_video_avertissement IS NULL
--          OR guide_acces_video_avertissement IN ('trop_lourde', 'compression_echouee'));
-- =====================================================================
