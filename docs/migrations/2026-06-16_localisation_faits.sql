-- ============================================================
-- Migration : Table dédiée des FAITS de localisation enrichie
-- Date     : 2026-06-16
-- Branche  : feat/annonce-enrichissement-localisation
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase (DEV puis PROD).
-- Migration additive et non-bloquante : nouvelle table isolée, aucun impact
-- sur `fiches` ni sur les flux existants (Loomky, Monday, Make.com).
--
-- Contexte : première brique du chantier "agent annonce". La localisation
-- enrichie (quartier déduit, POI nommés, distances, temps de trajet) n'existe
-- pas dans la fiche : elle est CALCULÉE via Geoapify (+ OSM pour les ancres
-- macro) par l'Edge Function `annonce-localisation`, puis stockée ici.
--
-- 1 ligne par logement (PK = fiche_id). On ne stocke PAS de colonnes à plat sur
-- `fiches` (déjà trop large). On garde l'adresse qui a servi au calcul
-- (`adresse_used`) + une clé normalisée (`adresse_key`) pour le recompute :
-- adresse identique = réutilisation sans rappeler Geoapify ; adresse changée =
-- recalcul.
--
-- ⚠️ `faits` est la palette destinée au modèle (via annonce-generate) : elle ne
-- contient JAMAIS la rue (interdite en sortie publique), seulement ville, code
-- postal et faits calculés. La rue brute reste uniquement dans `adresse_used`
-- (provenance serveur, jamais transmise au modèle).
-- ============================================================

CREATE TABLE IF NOT EXISTS fiche_localisation_faits (
  fiche_id              uuid PRIMARY KEY REFERENCES fiches(id) ON DELETE CASCADE,
  -- Adresse ayant servi au calcul (provenance serveur, NON transmise au modèle)
  adresse_used          jsonb       NOT NULL,
  -- Clé normalisée (rue|cp|ville sans accents/casse) → détection de changement
  adresse_key           text        NOT NULL,
  -- Géocodage Geoapify
  lat                   double precision,
  lon                   double precision,
  geocode_confidence    double precision,
  geocode_result_type   text,
  -- Palette de faits prête à consommer (POI, transport, ancres macro)
  faits                 jsonb       NOT NULL,
  -- Version du contrat des faits → invalidation du cache : une ligne dont la
  -- version diffère de la version courante du code est recalculée même à
  -- adresse identique (sinon des faits périmés seraient resservis indéfiniment).
  schema_version        int         NOT NULL DEFAULT 1,
  source                text        NOT NULL DEFAULT 'geoapify',
  computed_at           timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  fiche_localisation_faits IS
  'Faits de localisation enrichie par logement (calculés via Geoapify/OSM), consommés par l''agent annonce. 1 ligne/fiche.';
COMMENT ON COLUMN fiche_localisation_faits.adresse_used IS
  'Adresse géocodée (rue/complement/ville/code_postal). Provenance serveur — jamais transmise au modèle.';
COMMENT ON COLUMN fiche_localisation_faits.adresse_key IS
  'Clé normalisée de l''adresse (détection de changement pour le recompute).';
COMMENT ON COLUMN fiche_localisation_faits.faits IS
  'Palette de faits (POI nommés, transport, ancres macro). Ne contient jamais la rue.';
COMMENT ON COLUMN fiche_localisation_faits.schema_version IS
  'Version du contrat des faits. Réutilisation seulement si égale à la version du code, sinon recalcul (invalidation de cache aux changements de contrat).';

-- Idempotence : si la table préexiste (run antérieur sans la colonne), l'ajoute.
ALTER TABLE fiche_localisation_faits
  ADD COLUMN IF NOT EXISTS schema_version int NOT NULL DEFAULT 1;

-- ============================================================
-- RLS : lecture pour le propriétaire de la fiche + super_admin (même modèle
-- que `fiches`). Les écritures se font exclusivement en service role
-- (Edge Function) qui bypass RLS → aucune policy d'écriture pour les users.
-- ============================================================
ALTER TABLE fiche_localisation_faits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loc_faits_select_own ON fiche_localisation_faits;
CREATE POLICY loc_faits_select_own ON fiche_localisation_faits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fiches f
      WHERE f.id = fiche_localisation_faits.fiche_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS loc_faits_select_super_admin ON fiche_localisation_faits;
CREATE POLICY loc_faits_select_super_admin ON fiche_localisation_faits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

COMMIT;
