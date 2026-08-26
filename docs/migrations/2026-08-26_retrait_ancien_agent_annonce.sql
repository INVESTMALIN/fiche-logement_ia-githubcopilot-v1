-- =====================================================================
-- MIGRATION DESTRUCTIVE — Retrait de l'ancien agent annonce (n8n)
-- Date : 26 aout 2026
-- =====================================================================
--
-- IRREVERSIBLE. Les valeurs de annonce_pdf_url et annonce_last_generated_at
-- sont perdues definitivement. Exporter d'abord la requete 6 du precontrole
-- si l'on veut en garder une trace.
--
-- PREREQUIS, DANS CET ORDRE :
--   1. PR applicative mergee (plus aucune ligne de code executee ne
--      reference les deux colonnes).
--   2. Deploiement Vercel verifie en production.
--   3. FENETRE DE DRAIN respectee (voir ci-dessous). NE PAS enchainer
--      immediatement apres le deploiement.
--   4. 2026-08-26_precontrole_retrait_ancien_agent_annonce.sql execute
--      et son resultat relu, requete 0 comprise.
--
-- L'ordre code-puis-colonnes est obligatoire : c'est une SUPPRESSION, pas
-- un ajout. Si les colonnes partaient avant le deploiement, le code encore
-- en ligne ecrirait dans des colonnes absentes et la sauvegarde de fiche
-- casserait en production.
--
-- FENETRE DE DRAIN — le deploiement ne suffit pas.
-- Vercel ne met a jour que les NOUVEAUX chargements de page. Un coordinateur
-- qui a laisse un onglet ouvert AVANT le deploiement tourne encore sur
-- l'ancien bundle, qui envoie annonce_pdf_url a chaque sauvegarde. Des que la
-- colonne disparait, PostgREST rejette l'UPDATE entier (PGRST204) : la
-- sauvegarde echoue et l'inspection en cours peut etre perdue.
-- Donc : appliquer hors heures de terrain, assez loin du deploiement pour que
-- les onglets d'avant aient ete fermes ou recharges (une nuit est un ordre de
-- grandeur raisonnable), apres avoir verifie la requete 0 du precontrole
-- (fiches_modifiees_1h a 0). Prevenir les coordinateurs de recharger leur
-- onglet est le complement naturel : c'est la seule action qui purge
-- reellement un vieux bundle.
-- Ce drain reduit le risque, il ne l'annule pas. Pour l'annuler vraiment il
-- faudrait un mecanisme applicatif du type "nouvelle version disponible,
-- rechargez" — c'est un chantier a part, hors perimetre de ce retrait.
--
-- ATTENTION AU JUMEAU. Ce fichier ne touche QUE la moitie annonce :
--   fiche_annonce_pdf_webhook      -> notify_annonce_pdf_update()      -> RETIRE ICI
--   fiche_guide_acces_pdf_webhook  -> notify_guide_acces_pdf_update()  -> INTACT
--
-- Tout est dans UNE SEULE TRANSACTION. En PostgreSQL le DDL est
-- transactionnel : soit le trigger, la fonction et les deux colonnes
-- partent ensemble, soit rien ne bouge. Un etat intermediaire ou le
-- trigger serait parti mais pas les colonnes n'a aucun interet et
-- laisserait la base dans un etat que personne ne saurait decrire.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Garde-fou de verrou — a ne pas retirer.
-- ALTER TABLE ... DROP COLUMN prend un ACCESS EXCLUSIVE sur public.fiches.
-- Si une autre connexion tient une transaction ouverte sur la table, l'ALTER
-- se met en file d'attente, et TOUTES les requetes suivantes sur fiches
-- attendent derriere lui : l'application se fige, lecture comprise.
-- lock_timeout borne cette attente : au bout de 5 s la transaction echoue
-- proprement (55P03 lock_not_available) sans rien avoir modifie. Il suffit
-- alors de relancer le fichier plus tard.
-- Le precontrole ne peut pas couvrir ce cas : il ne mesure que des updated_at
-- deja commites, pas les transactions en cours.
-- statement_timeout est une securite en plus. Le DROP COLUMN est purement
-- metadata sous PostgreSQL (pas de reecriture de table), donc une fois le
-- verrou obtenu il est immediat : 60 s sont tres largement suffisantes.
-- SET LOCAL : les deux reglages ne valent que pour cette transaction.
-- ---------------------------------------------------------------------
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';


-- ---------------------------------------------------------------------
-- Garde-fou d'entree : on est bien sur la base qui porte le jumeau vivant.
-- Si notify_guide_acces_pdf_update() est absente, on n'est pas sur la
-- bonne base (ou le guide a deja ete casse) : on annule tout.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notify_guide_acces_pdf_update'
  ) THEN
    RAISE EXCEPTION
      'notify_guide_acces_pdf_update() introuvable : base inattendue, migration annulee';
  END IF;
END
$$;


-- ---------------------------------------------------------------------
-- 1. Le trigger d'abord (il depend de la fonction).
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS fiche_annonce_pdf_webhook ON public.fiches;


-- ---------------------------------------------------------------------
-- 2. Puis la fonction. Volontairement SANS CASCADE : s'il restait un
--    autre trigger accroche a cette fonction, le DROP echoue et toute
--    la transaction est annulee, ce qui est le comportement voulu.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.notify_annonce_pdf_update();


-- ---------------------------------------------------------------------
-- 3. Enfin les deux colonnes.
-- ---------------------------------------------------------------------
ALTER TABLE public.fiches DROP COLUMN IF EXISTS annonce_pdf_url;
ALTER TABLE public.fiches DROP COLUMN IF EXISTS annonce_last_generated_at;


-- ---------------------------------------------------------------------
-- Garde-fou de sortie : verifie l'etat final AVANT de valider.
--   - la moitie annonce doit avoir disparu ;
--   - la moitie guide d'acces doit etre strictement intacte.
-- Toute anomalie leve une exception et annule la transaction entiere.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'fiches'
      AND column_name IN ('annonce_pdf_url', 'annonce_last_generated_at')
  ) THEN
    RAISE EXCEPTION 'colonnes annonce toujours presentes : migration annulee';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class     c  ON c.oid  = t.tgrelid
    JOIN pg_namespace nt ON nt.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND nt.nspname = 'public'
      AND c.relname  = 'fiches'
      AND t.tgname   = 'fiche_annonce_pdf_webhook'
  ) THEN
    RAISE EXCEPTION 'trigger public.fiches.fiche_annonce_pdf_webhook toujours present : migration annulee';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class     c  ON c.oid  = t.tgrelid
    JOIN pg_namespace nt ON nt.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND nt.nspname = 'public'
      AND c.relname  = 'fiches'
      AND t.tgname   = 'fiche_guide_acces_pdf_webhook'
  ) THEN
    RAISE EXCEPTION 'JUMEAU CASSE : public.fiches.fiche_guide_acces_pdf_webhook a disparu, migration annulee';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notify_guide_acces_pdf_update'
  ) THEN
    RAISE EXCEPTION 'JUMEAU CASSE : notify_guide_acces_pdf_update() a disparu, migration annulee';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'fiches'
      AND column_name IN ('guide_acces_pdf_url', 'guide_acces_last_generated_at')
    GROUP BY table_name
    HAVING count(*) = 2
  ) THEN
    RAISE EXCEPTION 'JUMEAU CASSE : colonnes guide_acces incompletes, migration annulee';
  END IF;
END
$$;

COMMIT;


-- =====================================================================
-- CONTROLE POST-MIGRATION (lecture seule, a executer apres le COMMIT)
-- Attendu :
--   - requete 1 : 1 seule ligne, public / fiche_guide_acces_pdf_webhook ;
--   - requete 2 : 1 seule ligne, notify_guide_acces_pdf_update ;
--   - requete 3 : 2 lignes, les colonnes guide_acces uniquement.
-- =====================================================================

-- 1.
SELECT t.tgname AS trigger_name, nt.nspname AS table_schema, p.proname AS fonction_appelee
FROM pg_trigger t
JOIN pg_class     c  ON c.oid  = t.tgrelid
JOIN pg_namespace nt ON nt.oid = c.relnamespace
JOIN pg_proc      p  ON p.oid  = t.tgfoid
WHERE NOT t.tgisinternal
  AND nt.nspname = 'public'
  AND c.relname  = 'fiches'
  AND t.tgname IN ('fiche_annonce_pdf_webhook', 'fiche_guide_acces_pdf_webhook');

-- 2.
SELECT p.proname AS fonction
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('notify_annonce_pdf_update', 'notify_guide_acces_pdf_update');

-- 3.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'fiches'
  AND column_name IN (
    'annonce_pdf_url',
    'annonce_last_generated_at',
    'guide_acces_pdf_url',
    'guide_acces_last_generated_at'
  )
ORDER BY column_name;


-- =====================================================================
-- RESTE A FAIRE A LA MAIN, APRES CETTE MIGRATION
--   1. Desactiver le workflow n8n de l'ANNONCE.
--      NE PAS TOUCHER au workflow n8n du guide d'acces.
--   2. Supprimer le bucket annonce-pdfs, en DERNIER, apres un nouveau
--      recomptage (requetes 8 et 9 du precontrole).
--   3. Le scenario Make make_pdf_assistants reste en place : sa branche
--      annonce devient inerte, c'est voulu.
-- =====================================================================
