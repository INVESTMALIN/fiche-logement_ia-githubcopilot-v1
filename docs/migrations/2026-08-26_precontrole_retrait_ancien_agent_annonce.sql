-- =====================================================================
-- PRECONTROLE — Retrait de l'ancien agent annonce (n8n)
-- Date : 26 aout 2026
-- =====================================================================
--
-- CE FICHIER EST ENTIEREMENT EN LECTURE SEULE.
-- Aucun INSERT, UPDATE, DELETE, ALTER ni DROP. Il peut etre rejoue
-- autant de fois que necessaire, il ne modifie rien.
--
-- Quand : APRES le merge de la PR applicative et APRES le deploiement
-- Vercel verifie en production. AVANT le fichier de migration destructive
-- 2026-08-26_retrait_ancien_agent_annonce.sql.
--
-- Objectif : photographier l'etat reel avant destruction, et verifier que
-- le jumeau vivant (guide d'acces) est bien present et bien distinct.
--
-- ATTENTION AU JUMEAU :
--   fiche_annonce_pdf_webhook      -> notify_annonce_pdf_update()      -> A RETIRER
--   fiche_guide_acces_pdf_webhook  -> notify_guide_acces_pdf_update()  -> A GARDER
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. FENETRE DE DRAIN — A LIRE EN PREMIER
--
--    Le deploiement Vercel ne met a jour que les NOUVEAUX chargements de
--    page. Un coordinateur qui a laisse un onglet ouvert AVANT le deploiement
--    continue de tourner sur l'ancien bundle, qui envoie encore
--    annonce_pdf_url a chaque sauvegarde. Des la suppression de la colonne,
--    PostgREST rejette l'UPDATE entier (PGRST204, colonne absente du cache de
--    schema) : la sauvegarde echoue et le coordinateur peut perdre son
--    inspection en cours.
--
--    Choisir donc un creneau ou personne ne saisit : hors heures de terrain,
--    et assez loin du deploiement pour que les onglets d'avant aient ete
--    fermes ou recharges (une nuit est un ordre de grandeur raisonnable).
--    Prevenir les coordinateurs de recharger leur onglet est le complement
--    naturel : c'est la seule action qui purge reellement un vieux bundle.
--
--    Cette requete mesure l'activite recente pour choisir le creneau.
--    Attendu avant de lancer la migration : inactivite confortable et
--    fiches_modifiees_1h a 0.
-- ---------------------------------------------------------------------
SELECT
  max(updated_at)                                                  AS derniere_sauvegarde,
  now() - max(updated_at)                                          AS inactivite,
  count(*) FILTER (WHERE updated_at > now() - interval '1 hour')    AS fiches_modifiees_1h,
  count(*) FILTER (WHERE updated_at > now() - interval '24 hours')  AS fiches_modifiees_24h
FROM public.fiches;


-- ---------------------------------------------------------------------
-- 1. Etat des DEUX triggers jumeaux
--    Attendu avant migration : 2 lignes.
--    Apres migration, seul fiche_guide_acces_pdf_webhook doit subsister.
-- ---------------------------------------------------------------------
SELECT
  t.tgname                 AS trigger_name,
  c.relname                AS table_name,
  p.proname                AS fonction_appelee,
  CASE t.tgenabled
    WHEN 'O' THEN 'actif'
    WHEN 'D' THEN 'desactive'
    ELSE t.tgenabled::text
  END                      AS etat,
  pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc  p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND c.relname = 'fiches'
  AND t.tgname IN ('fiche_annonce_pdf_webhook', 'fiche_guide_acces_pdf_webhook')
ORDER BY t.tgname;


-- ---------------------------------------------------------------------
-- 2. Etat des DEUX fonctions jumelles
--    Attendu avant migration : 2 lignes.
-- ---------------------------------------------------------------------
SELECT
  n.nspname                                 AS schema_name,
  p.proname                                 AS fonction,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('notify_annonce_pdf_update', 'notify_guide_acces_pdf_update')
ORDER BY p.proname;


-- ---------------------------------------------------------------------
-- 3. La fonction annonce a-t-elle un AUTRE consommateur ?
--    Attendu : une seule ligne, fiche_annonce_pdf_webhook sur fiches.
--    Si une autre ligne apparait : NE PAS APPLIQUER LA MIGRATION,
--    la fonction sert a autre chose que ce qui a ete recense.
-- ---------------------------------------------------------------------
SELECT
  t.tgname  AS trigger_name,
  c.relname AS table_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc  p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND p.proname = 'notify_annonce_pdf_update'
ORDER BY c.relname, t.tgname;


-- ---------------------------------------------------------------------
-- 4. Etat des colonnes : les 2 a retirer + les 2 jumelles a garder
--    Attendu avant migration : 4 lignes.
-- ---------------------------------------------------------------------
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
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


-- ---------------------------------------------------------------------
-- 5. Combien de fiches portent encore une valeur ?
--    C'est exactement la donnee que la migration detruira.
-- ---------------------------------------------------------------------
SELECT
  count(*)                                                      AS total_fiches,
  count(*) FILTER (WHERE annonce_pdf_url IS NOT NULL)           AS annonce_pdf_url_non_null,
  count(*) FILTER (WHERE annonce_last_generated_at IS NOT NULL) AS annonce_last_generated_at_non_null,
  max(annonce_last_generated_at)                                AS derniere_generation_annonce
FROM public.fiches;


-- ---------------------------------------------------------------------
-- 6. Liste exhaustive des valeurs non nulles
--    A exporter en CSV avant la migration si l'on veut garder une trace
--    des URL historiques : elles ne seront plus recuperables ensuite.
-- ---------------------------------------------------------------------
SELECT
  id,
  nom,
  logement_numero_bien,
  statut,
  annonce_pdf_url,
  annonce_last_generated_at
FROM public.fiches
WHERE annonce_pdf_url IS NOT NULL
   OR annonce_last_generated_at IS NOT NULL
ORDER BY annonce_last_generated_at DESC NULLS LAST, nom;


-- ---------------------------------------------------------------------
-- 7. Le bucket annonce-pdfs : existe-t-il, est-il public ?
-- ---------------------------------------------------------------------
SELECT
  id,
  name,
  public,
  created_at,
  updated_at
FROM storage.buckets
WHERE id = 'annonce-pdfs';


-- ---------------------------------------------------------------------
-- 8. Inventaire du bucket annonce-pdfs — RECOMPTAGE
--    Le dernier releve annoncait 122 objets, dernier ecrit le 29 juin.
--    Ce chiffre est INDICATIF : c'est cette requete qui fait foi.
--    Si dernier_ecrit est posterieur a ce releve, quelque chose ecrit
--    encore dans le bucket : ARRETER et investiguer avant de supprimer.
-- ---------------------------------------------------------------------
SELECT
  count(*)                                         AS nb_objets,
  sum((metadata->>'size')::bigint)                 AS taille_totale_octets,
  pg_size_pretty(sum((metadata->>'size')::bigint)) AS taille_totale,
  min(created_at)                                  AS premier_ecrit,
  max(created_at)                                  AS dernier_ecrit,
  max(updated_at)                                  AS derniere_maj
FROM storage.objects
WHERE bucket_id = 'annonce-pdfs';


-- ---------------------------------------------------------------------
-- 9. Liste des objets du bucket annonce-pdfs
-- ---------------------------------------------------------------------
SELECT
  name,
  (metadata->>'size')::bigint AS taille_octets,
  metadata->>'mimetype'       AS mimetype,
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'annonce-pdfs'
ORDER BY created_at DESC;


-- ---------------------------------------------------------------------
-- 10. Non-regression du jumeau : le bucket guide-acces-pdfs doit rester
--     vivant et alimente. Sert de point de comparaison.
-- ---------------------------------------------------------------------
SELECT
  count(*)                                         AS nb_objets_guide_acces,
  pg_size_pretty(sum((metadata->>'size')::bigint)) AS taille_totale_guide_acces,
  max(created_at)                                  AS dernier_ecrit_guide_acces
FROM storage.objects
WHERE bucket_id = 'guide-acces-pdfs';
