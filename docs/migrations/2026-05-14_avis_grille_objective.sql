-- ============================================================
-- Migration : Refonte "Évaluation du logement" avec grille objective
-- Date     : 2026-05-14
-- Branche  : feat/avis-grille-objective
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase.
-- Toutes les colonnes sont nullable / défauts sûrs → migration non-bloquante,
-- les fiches existantes restent compatibles (grille NULL = "non évaluée").
-- ============================================================

ALTER TABLE fiches
  -- 📊 Grille évaluation objective : 9 critères (note SMALLINT 1-5 + observation libre TEXT)
  ADD COLUMN IF NOT EXISTS avis_grille_proprete_generale_note   SMALLINT,
  ADD COLUMN IF NOT EXISTS avis_grille_proprete_generale_obs    TEXT,
  ADD COLUMN IF NOT EXISTS avis_grille_sols_note                SMALLINT,
  ADD COLUMN IF NOT EXISTS avis_grille_sols_obs                 TEXT,
  ADD COLUMN IF NOT EXISTS avis_grille_murs_plafonds_note       SMALLINT,
  ADD COLUMN IF NOT EXISTS avis_grille_murs_plafonds_obs        TEXT,
  ADD COLUMN IF NOT EXISTS avis_grille_cuisine_note             SMALLINT,
  ADD COLUMN IF NOT EXISTS avis_grille_cuisine_obs              TEXT,
  ADD COLUMN IF NOT EXISTS avis_grille_salle_bain_note          SMALLINT,
  ADD COLUMN IF NOT EXISTS avis_grille_salle_bain_obs           TEXT,
  ADD COLUMN IF NOT EXISTS avis_grille_equipements_note         SMALLINT,
  ADD COLUMN IF NOT EXISTS avis_grille_equipements_obs          TEXT,
  ADD COLUMN IF NOT EXISTS avis_grille_menuiseries_note         SMALLINT,
  ADD COLUMN IF NOT EXISTS avis_grille_menuiseries_obs          TEXT,
  ADD COLUMN IF NOT EXISTS avis_grille_odeurs_note              SMALLINT,
  ADD COLUMN IF NOT EXISTS avis_grille_odeurs_obs               TEXT,
  ADD COLUMN IF NOT EXISTS avis_grille_impression_generale_note SMALLINT,
  ADD COLUMN IF NOT EXISTS avis_grille_impression_generale_obs  TEXT,

  -- 📈 Score & verdict (calculés côté front au save, stockés pour requêtes/exports Monday)
  ADD COLUMN IF NOT EXISTS avis_grille_score_total              SMALLINT,
  ADD COLUMN IF NOT EXISTS avis_grille_verdict                  TEXT,
  -- Valeurs verdict : excellent_etat | bon_etat | etat_moyen | etat_degrade | tres_mauvais_etat

  -- ⚠️ Vérification sécurité : liste des dangers cochés + flag bool dérivé pour le trigger d'alertes
  ADD COLUMN IF NOT EXISTS avis_securite_dangers                TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS avis_securite_danger_detecte         BOOLEAN DEFAULT false,
  -- Clés possibles dans avis_securite_dangers :
  --   fils_denudes | prises_arrachees | cables_non_proteges | disjoncteur_defaillant
  --   | installation_dangereuse | chauffage_dangereux | odeur_brule

  -- 🎥 Vidéo de l'état du logement
  ADD COLUMN IF NOT EXISTS avis_logement_etat_videos            TEXT[] DEFAULT '{}'::text[],

  -- 🏷️ Type de 1er passage (ménage / maintenance)
  ADD COLUMN IF NOT EXISTS avis_type_premier_menage             TEXT,
  ADD COLUMN IF NOT EXISTS avis_type_premiere_maintenance       TEXT;
  -- Valeurs possibles :
  --   'Vérification / Inventaire' | 'Classique' | 'Fait par Proprio'
  --   | 'Approfondi' | 'Remise en état' | 'Pas nécessaire'

-- Optionnel : contrainte de range sur les notes 1-5 (à activer après vérif des données existantes)
-- ALTER TABLE fiches
--   ADD CONSTRAINT chk_avis_grille_proprete_generale CHECK (avis_grille_proprete_generale_note BETWEEN 1 AND 5),
--   ADD CONSTRAINT chk_avis_grille_sols              CHECK (avis_grille_sols_note BETWEEN 1 AND 5),
--   ... (à dupliquer pour les 9 critères)

-- ⚠️ Suivi : mettre à jour la fonction notify_fiche_completed() pour inclure
-- avis_logement_etat_videos dans le payload media (sinon Make ne migrera pas la vidéo
-- vers Google Drive).
--
-- Le trigger notify_fiche_alerts() n'a PAS besoin d'être modifié : les colonnes legacy
-- avis_logement_etat_general et avis_logement_proprete sont automatiquement remplies
-- par le mapping front (mapFormDataToSupabase) à partir de la grille.

COMMIT;
