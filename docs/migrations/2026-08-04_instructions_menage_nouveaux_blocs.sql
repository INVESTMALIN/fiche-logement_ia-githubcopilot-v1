-- ============================================================
-- Migration : Section "Instructions Ménage" — nouveaux blocs
-- Date      : 2026-08-04
-- Branche   : feat/instructions-menage-nouveaux-blocs
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase.
--
-- ⚠️ ORDRE IMPÉRATIF : cette migration doit être appliquée AVANT le merge
--    de la PR. Si le code part en premier, mapFormDataToSupabase envoie des
--    colonnes inconnues et la sauvegarde du formulaire casse sur TOUTES les
--    fiches en production (400+).
--
-- Migration strictement additive : toutes les colonnes sont nullable ou ont
-- un défaut sûr. Les fiches existantes restent compatibles sans backfill
-- (NULL / tableau vide = "non renseigné").
--
-- Convention de nommage : préfixe de section `instructions_menage_*`.
-- ℹ️ Cette section porte donc DEUX familles de préfixes :
--      - `avis_*`      : les 5 champs déplacés depuis la section Avis (PR #79),
--                        volontairement non renommés (cf. docs/📄 PLAN UPLOAD PDF.md)
--      - `instructions_menage_*` : les colonnes créées ici, à la convention
--    C'est assumé : renommer les premières coûterait media_manifest, les
--    préfixes de fichiers déjà sur le Drive, les deux templates PDF et la
--    synchro Monday, pour zéro bénéfice utilisateur.
-- ============================================================

BEGIN;

ALTER TABLE public.fiches
  -- 🧽 Bloc "Consignes générales"
  ADD COLUMN IF NOT EXISTS instructions_menage_consignes_generales      TEXT,
  ADD COLUMN IF NOT EXISTS instructions_menage_consignes_videos         TEXT[] DEFAULT '{}'::text[],

  -- 🧴 Bloc "Produits et matériel"
  ADD COLUMN IF NOT EXISTS instructions_menage_produits_materiel        TEXT,

  -- 🎁 Bloc "Kit de bienvenue"
  -- ⚠️ NE PAS confondre avec le 1er panier de consommables
  --    (`consommables_premier_panier_par_prestataire`) : le panier, ce sont les
  --    consommables obligatoires (papier toilette, savon, café) ; le kit, c'est
  --    l'accueil et la mise en scène. Deux notions distinctes, deux jeux de colonnes.
  -- Booléens `*_par_prestataire` : true = prestataire de ménage, false = propriétaire,
  -- NULL = non renseigné. Même convention que `consommables_*_par_prestataire`.
  ADD COLUMN IF NOT EXISTS instructions_menage_kit_achat_par_prestataire       BOOLEAN,
  ADD COLUMN IF NOT EXISTS instructions_menage_kit_installation_par_prestataire BOOLEAN,
  ADD COLUMN IF NOT EXISTS instructions_menage_kit_composition           TEXT,
  ADD COLUMN IF NOT EXISTS instructions_menage_kit_photos                TEXT[] DEFAULT '{}'::text[],

  -- ⚠️ Bloc "Points de vigilance"
  ADD COLUMN IF NOT EXISTS instructions_menage_points_vigilance          TEXT;

-- ℹ️ Aucune colonne pour le bloc "Rappel des consommables" : il est calculé à
--    l'affichage à partir de `section_consommables`. Aucune copie, aucune
--    synchronisation à maintenir, aucune donnée à backfiller.

-- ============================================================
-- 📸 Routage Google Drive : 2 lignes de manifeste
-- ============================================================
-- Les deux SEULS champs média créés par cette PR. Sans ces lignes, les fichiers
-- sont bien téléversés dans Supabase Storage mais n'arrivent JAMAIS sur le Drive
-- — en silence. C'est exactement le trou qui avait laissé 92 fichiers au sol
-- dans l'ancien système.
--
-- Le dossier `8. Ménage` n'existe pas encore sur le Drive : rien à créer à la
-- main, `build_media_folders` le déduit du premier segment du chemin et Make le
-- crée au premier passage (cf. docs/📸 PLAN UPLOAD PHOTOS.md § 6.5).
--
-- `ordre` : la valeur la plus haute du manifeste au 04/08/2026 est 1090
-- (avis_immeuble_facade_photos). On enchaîne par pas de 10.
--
-- Aucune modification du trigger `notify_fiche_completed`, aucune du scénario
-- Make : le V2 ne consomme que `fiche_id` et relit ce manifeste (§ 6.8).

INSERT INTO public.media_manifest (colonne_db, cle, dossier, prefixe, type, ordre, actif, commentaire)
VALUES
  ('instructions_menage_consignes_videos',
   'instructions_menage_consignes_videos',
   '8. Ménage',
   'Consignes-menage',
   'video',
   1100,
   true,
   'Vidéos des consignes de ménage — section Instructions Ménage (PR #80)'),

  ('instructions_menage_kit_photos',
   'instructions_menage_kit_photos',
   '8. Ménage',
   'Kit-bienvenue',
   'photo',
   1110,
   true,
   'Photos de disposition du kit de bienvenue — section Instructions Ménage (PR #80)')
ON CONFLICT (colonne_db) DO NOTHING;

COMMIT;

-- ============================================================
-- ✅ Vérifications à passer après exécution
-- ============================================================
--
-- 1. Le garde-fou doit rester VIDE. Une ligne ici = un champ média qui
--    n'arrivera jamais sur le Drive.
--
--    SELECT * FROM public.media_manifest_ecarts;
--    -- attendu : 0 ligne
--
-- 2. Les 8 colonnes sont présentes :
--
--    SELECT column_name, data_type
--    FROM information_schema.columns
--    WHERE table_schema = 'public'
--      AND table_name = 'fiches'
--      AND column_name LIKE 'instructions_menage_%'
--    ORDER BY column_name;
--    -- attendu : 8 lignes
--
-- 3. Les 2 lignes de manifeste sont actives et pointent le bon dossier :
--
--    SELECT colonne_db, dossier, prefixe, type, ordre, actif
--    FROM public.media_manifest
--    WHERE dossier = '8. Ménage'
--    ORDER BY ordre;
--    -- attendu : 2 lignes, actif = true
