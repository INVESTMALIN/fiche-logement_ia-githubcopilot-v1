-- =====================================================================
-- MIGRATION ADDITIVE — Avertissement « cible livret » de la vidéo du Guide d'accès
-- Date : 22 septembre 2026
-- PR : feat/guide-acces-video-cible-livret
-- =====================================================================
--
-- Objet : ajouter la colonne fiches.guide_acces_video_avertissement.
--
-- La vidéo du Guide d'accès est ensuite ajoutée à la main dans le livret
-- d'accueil Loomky (limite rapportée « 50 Mb/Mo »). L'app demande désormais
-- au service Railway de la compresser sous une cible prudente (40 Mio, voir
-- src/lib/videoGuideAcces.js). Quand la cible n'est pas atteinte, ou quand la
-- compression échoue, un avertissement doit rester lisible APRÈS sauvegarde et
-- rechargement de la fiche — d'où une colonne, pas un bandeau de session.
--
-- Valeurs : NULL (rien à signaler)
--           'trop_lourde'          (compressée mais toujours au-dessus de la cible)
--           'compression_echouee'  (réseau / timeout / réponse invalide, originale conservée)
--
-- Aucun backfill : les vidéos déjà enregistrées ne sont pas retraitées (hors
-- périmètre), elles restent sans avertissement.
--
-- ---------------------------------------------------------------------
-- ORDRE D'EXECUTION — IMPERATIF (migration ADDITIVE)
--
--   1. Jouer CE FICHIER (blocs 1 à 4).
--   2. SEULEMENT ENSUITE merger la PR applicative.
--
-- Si le code part en premier, chaque sauvegarde de fiche écrit dans une
-- colonne inexistante : PostgREST rejette l'UPDATE entier (PGRST204) et la
-- sauvegarde casse en production, pour toutes les fiches.
--
-- ---------------------------------------------------------------------
-- COMMENT JOUER CE FICHIER
--
-- UN BLOC A LA FOIS. L'éditeur SQL de Supabase ne renvoie que le résultat de
-- la DERNIÈRE instruction d'un script multi-requêtes.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BLOC 1 — PRECONTROLE (lecture seule)
-- La colonne existe-t-elle déjà ?
--
-- Attendu AVANT migration : 0 ligne.
-- Si 1 ligne : la migration a déjà été jouée, passer directement au BLOC 4.
-- ---------------------------------------------------------------------
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'fiches'
  AND column_name = 'guide_acces_video_avertissement';


-- ---------------------------------------------------------------------
-- BLOC 2 — PRECONTROLE (lecture seule)
-- Photographie avant migration : le nombre de fiches doit être identique
-- après (BLOC 4), seule la colonne apparaît.
-- ---------------------------------------------------------------------
SELECT
    COUNT(*)                                                       AS fiches_total,
    COUNT(*) FILTER (WHERE statut <> 'supprimee')                  AS fiches_vivantes,
    COUNT(*) FILTER (WHERE cardinality(guide_acces_video_acces) > 0) AS avec_video_guide
FROM fiches;


-- ---------------------------------------------------------------------
-- BLOC 3 — MIGRATION : création de la colonne
--
-- TEXT nullable, contrainte CHECK sur les deux valeurs connues : un code
-- inattendu ne doit pas pouvoir entrer en base (l'interface n'afficherait
-- rien et le coordinateur ne serait jamais prévenu).
--
-- Le nom contient « video » mais la vue media_manifest_ecarts ne surveille
-- que les colonnes ARRAY : cette colonne TEXT n'y apparaît pas.
--
-- Idempotent : rejouable sans erreur.
-- ---------------------------------------------------------------------
ALTER TABLE fiches
    ADD COLUMN IF NOT EXISTS guide_acces_video_avertissement TEXT;

ALTER TABLE fiches
    DROP CONSTRAINT IF EXISTS fiches_guide_acces_video_avertissement_check;

ALTER TABLE fiches
    ADD CONSTRAINT fiches_guide_acces_video_avertissement_check
    CHECK (guide_acces_video_avertissement IS NULL
           OR guide_acces_video_avertissement IN ('trop_lourde', 'compression_echouee'));

COMMENT ON COLUMN fiches.guide_acces_video_avertissement IS
    'Avertissement cible livret pour guide_acces_video_acces : NULL | trop_lourde | compression_echouee (src/lib/videoGuideAcces.js)';


-- ---------------------------------------------------------------------
-- BLOC 4 — CONTROLE POST-MIGRATION (lecture seule)
--
-- Attendu : 1 ligne, data_type = text, is_nullable = YES, et le même
-- fiches_total qu'au BLOC 2 avec 0 fiche avertie (aucun backfill).
-- ---------------------------------------------------------------------
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'fiches'
  AND column_name = 'guide_acces_video_avertissement';

SELECT
    COUNT(*)                                                        AS fiches_total,
    COUNT(*) FILTER (WHERE guide_acces_video_avertissement IS NOT NULL) AS fiches_averties
FROM fiches;


-- =====================================================================
-- ROLLBACK (à ne jouer que si la PR applicative est annulée)
--
-- La colonne n'est lue par aucun trigger ni aucune vue : la supprimer ne
-- casse rien d'autre que le code qui l'écrit. Ne la supprimer QU'APRÈS avoir
-- revert le déploiement, sinon la sauvegarde de fiche casse (même PGRST204
-- que ci-dessus, en sens inverse).
--
-- ALTER TABLE fiches DROP COLUMN IF EXISTS guide_acces_video_avertissement;
-- =====================================================================
