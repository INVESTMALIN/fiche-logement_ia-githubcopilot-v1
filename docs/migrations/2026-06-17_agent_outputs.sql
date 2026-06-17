-- ============================================================
-- Migration : Table des annonces générées (agent annonce, brique 2)
-- Date     : 2026-06-17
-- Branche  : feat/agent-outputs-table
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase (DEV puis PROD).
-- Migration additive et non-bloquante : nouvelle table isolée, aucun impact
-- sur `fiches` ni sur les flux existants (Loomky, Monday, Make.com).
--
-- Contexte : brique 2 du chantier "agent annonce" = le générateur d'annonces
-- (future Edge Function `annonce-generate`). Cette migration ne fait QUE poser
-- le stockage qui recevra les annonces générées — pas de fonction, pas de
-- logique applicative, données seules.
--
-- Grain : 1 ligne par couple (fiche, plateforme) → PK = (fiche_id, plateforme).
-- La contrainte d'unicité (assurée par la PK) permet l'upsert : on ÉCRASE à
-- chaque régénération, pas d'historique de versions en v1
-- (ON CONFLICT (fiche_id, plateforme)).
--
-- Plateforme contrainte à 'airbnb' / 'booking'. On ne traite qu'Airbnb pour
-- l'instant, mais la colonne existe dès le jour 1.
--
-- ⚠️ Sorties volontairement en JSONB : la structure Booking, plus tard,
-- n'imposera AUCUNE migration (ni Airbnb si la forme de sortie évolue).
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_outputs (
  fiche_id            uuid        NOT NULL REFERENCES fiches(id) ON DELETE CASCADE,
  -- Plateforme cible. Airbnb traité en v1 ; Booking réservé dès maintenant.
  plateforme          text        NOT NULL CHECK (plateforme IN ('airbnb', 'booking')),
  -- Sortie finale assemblée : prose du modèle + blocs assemblés en code
  output_assemble     jsonb,
  -- Sortie brute du modèle avant assemblage (debug)
  output_modele_brut  jsonb,
  -- Contrat propre envoyé au modèle (debug + repro)
  contrat_entree      jsonb,
  -- Modèle utilisé (ex. 'claude-sonnet-4-6')
  modele              text,
  -- Version du prompt ayant produit la sortie
  prompt_version      text,
  -- Tokens, latence, et tout signal utile au monitoring (phase d'inspection)
  generation_meta     jsonb,
  -- Statut léger v1
  statut              text        NOT NULL DEFAULT 'genere'
                        CHECK (statut IN ('genere', 'valide', 'erreur')),
  generated_at        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- 1 ligne par (fiche, plateforme) + cible d'upsert
  PRIMARY KEY (fiche_id, plateforme)
);

COMMENT ON TABLE  agent_outputs IS
  'Annonces générées par l''agent annonce. 1 ligne par (fiche, plateforme), upsert (pas d''historique en v1).';
COMMENT ON COLUMN agent_outputs.plateforme IS
  'Plateforme cible : airbnb (v1) ou booking (réservé). Contrainte CHECK.';
COMMENT ON COLUMN agent_outputs.output_assemble IS
  'Sortie finale assemblée (prose du modèle + blocs assemblés en code). JSONB pour ne pas imposer de migration aux évolutions de structure / à Booking.';
COMMENT ON COLUMN agent_outputs.output_modele_brut IS
  'Sortie brute du modèle avant assemblage (debug).';
COMMENT ON COLUMN agent_outputs.contrat_entree IS
  'Contrat propre envoyé au modèle (debug + repro).';
COMMENT ON COLUMN agent_outputs.generation_meta IS
  'Tokens, latence et signaux de monitoring de la génération.';
COMMENT ON COLUMN agent_outputs.statut IS
  'Statut léger v1 : genere / valide / erreur.';

-- ============================================================
-- RLS : lecture pour le propriétaire de la fiche + super_admin (même modèle
-- que `fiches` et `fiche_localisation_faits`). Les écritures se font
-- exclusivement en service role (Edge Function) qui bypass RLS → aucune policy
-- d'écriture pour les users.
-- ============================================================
ALTER TABLE agent_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_outputs_select_own ON agent_outputs;
CREATE POLICY agent_outputs_select_own ON agent_outputs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fiches f
      WHERE f.id = agent_outputs.fiche_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS agent_outputs_select_super_admin ON agent_outputs;
CREATE POLICY agent_outputs_select_super_admin ON agent_outputs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

COMMIT;
