-- ============================================================
-- Nettoyage : détails d'appareils Cuisine 1 orphelins (données existantes)
-- Date     : 2026-07-31
-- Branche  : fix/cuisine1-nettoyage-branches
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase, PAR JULIEN, une fois,
-- APRÈS le déploiement du correctif de code.
-- ⚠️ Script de DONNÉES : aucune colonne ajoutée, seules des valeurs sont
--    remises à NULL. Ce n'est pas une migration de schéma.
--
-- Contexte : FicheCuisine1 n'avait aucun BRANCH_SCHEMAS. Décocher un appareil
-- laissait sa marque, son type et ses instructions en base, et le PDF les
-- affichait pour un équipement que le logement n'a pas.
--
-- ⚠️ PÉRIMÈTRE STRICTEMENT TEXTUEL. Les colonnes média (*_photo, *_video) ne
-- sont PAS touchées : les fichiers sont réellement téléversés puis migrés vers
-- Google Drive, effacer la référence détruirait du travail de terrain. Le
-- relevé du 31/07 compte 1 fiche portant 1 média orphelin — décision produit
-- en attente, hors de ce script.
--
-- Les conditions sont dérivées de la règle du formulaire, pas du relevé :
-- un champ conditionnel n'est saisissable que si sa case est cochée, donc il
-- est orphelin dès que le flag ne vaut pas true. Le script reste correct quel
-- que soit l'état de la base au moment de son exécution, et ré-exécutable.
--
-- Relevé du 31/07/2026 sur les 409 fiches : 6 fiches, 9 champs orphelins
--   lave_vaisselle_instructions (2), bouilloire_instructions, cuisiniere_marque,
--   cuisiniere_type, cuisiniere_nombre_feux, four_marque, four_instructions,
--   micro_ondes_instructions
-- ============================================================


-- ── 1. CONTRÔLE AVANT ────────────────────────────────────────
-- Attendu : 6 fiches / 9 paires
WITH m(flag, champ) AS (
  VALUES
    ('cuisine_1_equipements_refrigerateur','cuisine_1_refrigerateur_marque'),
    ('cuisine_1_equipements_refrigerateur','cuisine_1_refrigerateur_instructions'),
    ('cuisine_1_equipements_congelateur','cuisine_1_congelateur_instructions'),
    ('cuisine_1_equipements_mini_refrigerateur','cuisine_1_mini_refrigerateur_instructions'),
    ('cuisine_1_equipements_cuisiniere','cuisine_1_cuisiniere_marque'),
    ('cuisine_1_equipements_cuisiniere','cuisine_1_cuisiniere_type'),
    ('cuisine_1_equipements_cuisiniere','cuisine_1_cuisiniere_nombre_feux'),
    ('cuisine_1_equipements_cuisiniere','cuisine_1_cuisiniere_instructions'),
    ('cuisine_1_equipements_plaque_cuisson','cuisine_1_plaque_cuisson_marque'),
    ('cuisine_1_equipements_plaque_cuisson','cuisine_1_plaque_cuisson_type'),
    ('cuisine_1_equipements_plaque_cuisson','cuisine_1_plaque_cuisson_nombre_feux'),
    ('cuisine_1_equipements_plaque_cuisson','cuisine_1_plaque_cuisson_instructions'),
    ('cuisine_1_equipements_four','cuisine_1_four_marque'),
    ('cuisine_1_equipements_four','cuisine_1_four_type'),
    ('cuisine_1_equipements_four','cuisine_1_four_instructions'),
    ('cuisine_1_equipements_micro_ondes','cuisine_1_micro_ondes_instructions'),
    ('cuisine_1_equipements_lave_vaisselle','cuisine_1_lave_vaisselle_instructions'),
    ('cuisine_1_equipements_cafetiere','cuisine_1_cafetiere_marque'),
    ('cuisine_1_equipements_cafetiere','cuisine_1_cafetiere_instructions'),
    ('cuisine_1_equipements_cafetiere','cuisine_1_cafetiere_cafe_fourni'),
    ('cuisine_1_equipements_cafetiere','cuisine_1_cafetiere_marque_cafe'),
    ('cuisine_1_equipements_bouilloire','cuisine_1_bouilloire_instructions'),
    ('cuisine_1_equipements_grille_pain','cuisine_1_grille_pain_instructions'),
    ('cuisine_1_equipements_hotte','cuisine_1_hotte_instructions'),
    ('cuisine_1_equipements_blender','cuisine_1_blender_instructions'),
    ('cuisine_1_equipements_cuiseur_riz','cuisine_1_cuiseur_riz_instructions'),
    ('cuisine_1_equipements_machine_pain','cuisine_1_machine_pain_instructions'),
    ('cuisine_1_equipements_autre','cuisine_1_equipements_autre_details')
)
SELECT count(DISTINCT f.id) AS fiches_concernees, count(*) AS champs_orphelins
FROM fiches f JOIN m ON TRUE
WHERE coalesce((to_jsonb(f) ->> m.flag), 'false') <> 'true'
  AND coalesce(btrim(to_jsonb(f) ->> m.champ), '') <> '';


-- ── 2. NETTOYAGE ─────────────────────────────────────────────
-- Une colonne par instruction : la table est à plat, il n'y a pas de patch JSONB
-- possible. Chaque UPDATE ne touche QUE les lignes dont la case est décochée ET
-- dont le champ est non vide, donc il est sans effet s'il n'y a rien à nettoyer.
UPDATE fiches SET cuisine_1_refrigerateur_marque = NULL
  WHERE coalesce(cuisine_1_equipements_refrigerateur, false) <> true AND coalesce(btrim(cuisine_1_refrigerateur_marque), '') <> '';
UPDATE fiches SET cuisine_1_refrigerateur_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_refrigerateur, false) <> true AND coalesce(btrim(cuisine_1_refrigerateur_instructions), '') <> '';
UPDATE fiches SET cuisine_1_congelateur_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_congelateur, false) <> true AND coalesce(btrim(cuisine_1_congelateur_instructions), '') <> '';
UPDATE fiches SET cuisine_1_mini_refrigerateur_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_mini_refrigerateur, false) <> true AND coalesce(btrim(cuisine_1_mini_refrigerateur_instructions), '') <> '';

UPDATE fiches SET cuisine_1_cuisiniere_marque = NULL
  WHERE coalesce(cuisine_1_equipements_cuisiniere, false) <> true AND coalesce(btrim(cuisine_1_cuisiniere_marque), '') <> '';
UPDATE fiches SET cuisine_1_cuisiniere_type = NULL
  WHERE coalesce(cuisine_1_equipements_cuisiniere, false) <> true AND coalesce(btrim(cuisine_1_cuisiniere_type), '') <> '';
UPDATE fiches SET cuisine_1_cuisiniere_nombre_feux = NULL
  WHERE coalesce(cuisine_1_equipements_cuisiniere, false) <> true AND cuisine_1_cuisiniere_nombre_feux IS NOT NULL;
UPDATE fiches SET cuisine_1_cuisiniere_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_cuisiniere, false) <> true AND coalesce(btrim(cuisine_1_cuisiniere_instructions), '') <> '';

UPDATE fiches SET cuisine_1_plaque_cuisson_marque = NULL
  WHERE coalesce(cuisine_1_equipements_plaque_cuisson, false) <> true AND coalesce(btrim(cuisine_1_plaque_cuisson_marque), '') <> '';
UPDATE fiches SET cuisine_1_plaque_cuisson_type = NULL
  WHERE coalesce(cuisine_1_equipements_plaque_cuisson, false) <> true AND coalesce(btrim(cuisine_1_plaque_cuisson_type), '') <> '';
UPDATE fiches SET cuisine_1_plaque_cuisson_nombre_feux = NULL
  WHERE coalesce(cuisine_1_equipements_plaque_cuisson, false) <> true AND cuisine_1_plaque_cuisson_nombre_feux IS NOT NULL;
UPDATE fiches SET cuisine_1_plaque_cuisson_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_plaque_cuisson, false) <> true AND coalesce(btrim(cuisine_1_plaque_cuisson_instructions), '') <> '';

UPDATE fiches SET cuisine_1_four_marque = NULL
  WHERE coalesce(cuisine_1_equipements_four, false) <> true AND coalesce(btrim(cuisine_1_four_marque), '') <> '';
UPDATE fiches SET cuisine_1_four_type = NULL
  WHERE coalesce(cuisine_1_equipements_four, false) <> true AND coalesce(btrim(cuisine_1_four_type), '') <> '';
UPDATE fiches SET cuisine_1_four_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_four, false) <> true AND coalesce(btrim(cuisine_1_four_instructions), '') <> '';

UPDATE fiches SET cuisine_1_micro_ondes_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_micro_ondes, false) <> true AND coalesce(btrim(cuisine_1_micro_ondes_instructions), '') <> '';
UPDATE fiches SET cuisine_1_lave_vaisselle_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_lave_vaisselle, false) <> true AND coalesce(btrim(cuisine_1_lave_vaisselle_instructions), '') <> '';

UPDATE fiches SET cuisine_1_cafetiere_marque = NULL
  WHERE coalesce(cuisine_1_equipements_cafetiere, false) <> true AND coalesce(btrim(cuisine_1_cafetiere_marque), '') <> '';
UPDATE fiches SET cuisine_1_cafetiere_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_cafetiere, false) <> true AND coalesce(btrim(cuisine_1_cafetiere_instructions), '') <> '';
UPDATE fiches SET cuisine_1_cafetiere_cafe_fourni = NULL
  WHERE coalesce(cuisine_1_equipements_cafetiere, false) <> true AND coalesce(btrim(cuisine_1_cafetiere_cafe_fourni), '') <> '';
UPDATE fiches SET cuisine_1_cafetiere_marque_cafe = NULL
  WHERE coalesce(cuisine_1_equipements_cafetiere, false) <> true AND coalesce(btrim(cuisine_1_cafetiere_marque_cafe), '') <> '';

UPDATE fiches SET cuisine_1_bouilloire_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_bouilloire, false) <> true AND coalesce(btrim(cuisine_1_bouilloire_instructions), '') <> '';
UPDATE fiches SET cuisine_1_grille_pain_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_grille_pain, false) <> true AND coalesce(btrim(cuisine_1_grille_pain_instructions), '') <> '';
UPDATE fiches SET cuisine_1_hotte_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_hotte, false) <> true AND coalesce(btrim(cuisine_1_hotte_instructions), '') <> '';
UPDATE fiches SET cuisine_1_blender_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_blender, false) <> true AND coalesce(btrim(cuisine_1_blender_instructions), '') <> '';
UPDATE fiches SET cuisine_1_cuiseur_riz_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_cuiseur_riz, false) <> true AND coalesce(btrim(cuisine_1_cuiseur_riz_instructions), '') <> '';
UPDATE fiches SET cuisine_1_machine_pain_instructions = NULL
  WHERE coalesce(cuisine_1_equipements_machine_pain, false) <> true AND coalesce(btrim(cuisine_1_machine_pain_instructions), '') <> '';

UPDATE fiches SET cuisine_1_equipements_autre_details = NULL
  WHERE coalesce(cuisine_1_equipements_autre, false) <> true AND coalesce(btrim(cuisine_1_equipements_autre_details), '') <> '';

-- ℹ️  Les 8 cases `cuisine_1_cafetiere_type_*` sont nettoyées côté formulaire mais
--     pas ici : une case booléenne décochée n'apparaît pas dans le PDF (le rendu
--     groupé de Cuisine 1 ne liste que les valeurs cochées), donc pas d'orphelin
--     visible côté client. Rien à réparer dans l'existant.


-- ── 3. CONTRÔLE APRÈS ────────────────────────────────────────
-- Ré-exécuter la requête de l'étape 1 : attendu 0 / 0.
