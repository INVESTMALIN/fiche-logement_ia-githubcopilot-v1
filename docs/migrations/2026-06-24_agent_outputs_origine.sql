-- ============================================================
-- Migration : Point de retour de l'agent annonce (édition par consigne)
-- Date     : 2026-06-24
-- Branche  : feat/annonce-edition-consigne
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase (DEV puis PROD).
-- Migration additive et non-bloquante : une seule colonne nullable, aucun
-- impact sur les flux existants (génération, RLS, Make.com, Monday).
--
-- Contexte : PR2 du chantier agent annonce = ÉDITION par consigne. Le
-- coordinateur ajuste une annonce déjà générée via une consigne en langage
-- naturel ; l'édition repart de la PROSE courante (output_modele_brut), pas de
-- la fiche, et le code réinjecte les blocs déterministes à l'identique.
--
-- Cette colonne conserve la PROSE de la TOUTE PREMIÈRE version générée (le
-- « point de retour ») :
--   - posée à chaque GÉNÉRATION / RÉGÉNÉRATION complète (= output_modele_brut) ;
--   - INTACTE lors d'une édition (les consignes s'enchaînent sur output_modele_brut) ;
--   - recopiée dans output_modele_brut lors d'un « Revenir à la version d'origine ».
--
-- Pas d'historique multi-versions en v1 : un seul point de retour (l'origine).
--
-- ⚠️ JSONB comme output_modele_brut : même forme (sortie pure du modèle, 7 champs
-- Airbnb / 3 champs Booking), aucune migration imposée aux évolutions de structure.
-- ============================================================

ALTER TABLE agent_outputs
  ADD COLUMN IF NOT EXISTS output_modele_origine jsonb;

COMMENT ON COLUMN agent_outputs.output_modele_origine IS
  'Prose de la première version générée (point de retour de l''édition par consigne). Posée à chaque (re)génération, intacte lors des éditions, restaurée par « Revenir à la version d''origine ». Même forme que output_modele_brut.';

COMMIT;
