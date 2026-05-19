-- Sync Maintenance vers Monday : ajout colonne snapshot
-- (la valeur applicative type_premiere_maintenance existe déjà dans la table fiches)

-- Aucune nouvelle colonne nécessaire côté table fiches.
-- avis_type_premiere_maintenance existe déjà depuis la refonte FicheAvis du 14/05
-- (cf. migrations/2026-05-14_avis_grille_objective.sql).
-- Le snapshot anti-race monday_snapshot (jsonb) est déjà en place et stockera
-- désormais aussi la clé type_premiere_maintenance pour la dirty-detection.

-- Ce fichier sert de marqueur de session, à exécuter pour valider la migration (no-op).
SELECT 1;
