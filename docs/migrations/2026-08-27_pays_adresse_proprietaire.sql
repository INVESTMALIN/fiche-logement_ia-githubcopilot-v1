-- =====================================================================
-- MIGRATION ADDITIVE — Pays de l'adresse du proprietaire
-- Date : 27 aout 2026
-- PR : feat/pays-adresse-proprietaire
-- =====================================================================
--
-- Objet : ajouter la colonne fiches.proprietaire_adresse_pays, puis
-- backfiller les fiches existantes a 'FR'.
--
-- Le backfill n'invente RIEN : jusqu'a cette PR, le code envoyait
-- country: 'FR' en dur a Loomky pour tout le monde. On ne fait qu'ecrire
-- en base ce qui partait deja, au lieu de le cacher dans le code.
--
-- ---------------------------------------------------------------------
-- ORDRE D'EXECUTION — IMPERATIF, ET INVERSE D'UNE MIGRATION DESTRUCTIVE
--
--   1. Jouer CE FICHIER (blocs 1 a 6).
--   2. SEULEMENT ENSUITE merger la PR applicative.
--
-- Sur une migration ADDITIVE, la colonne part AVANT le code. Si le code
-- est deploye en premier, chaque sauvegarde de fiche ecrit dans une
-- colonne inexistante : PostgREST rejette l'UPDATE entier (PGRST204,
-- colonne absente du cache de schema) et la sauvegarde casse en
-- production, pour toutes les fiches.
--
-- ---------------------------------------------------------------------
-- COMMENT JOUER CE FICHIER
--
-- UN BLOC A LA FOIS. L'editeur SQL de Supabase ne renvoie que le
-- resultat de la DERNIERE instruction d'un script multi-requetes : tout
-- coller d'un coup masque les resultats des blocs de controle et a deja
-- fait conclure a tort a un ecart. Selectionner un bloc, l'executer,
-- lire son resultat, passer au suivant.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BLOC 1 — PRECONTROLE (lecture seule)
-- La colonne existe-t-elle deja ?
--
-- Attendu AVANT migration : 0 ligne.
-- Si 1 ligne : la migration a deja ete jouee, passer directement au BLOC 5.
-- ---------------------------------------------------------------------
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'fiches'
  AND column_name = 'proprietaire_adresse_pays';


-- ---------------------------------------------------------------------
-- BLOC 2 — PRECONTROLE (lecture seule)
-- Photographie de l'etat des adresses proprietaire avant migration.
--
-- Sert de point de comparaison au BLOC 5 : le nombre total de fiches
-- doit etre identique avant et apres, seule la colonne pays change.
-- ---------------------------------------------------------------------
SELECT
    COUNT(*)                                                        AS fiches_total,
    COUNT(*) FILTER (WHERE statut <> 'supprimee')                   AS fiches_vivantes,
    COUNT(*) FILTER (WHERE proprietaire_adresse_ville IS NOT NULL
                       AND proprietaire_adresse_ville <> '')        AS avec_ville,
    COUNT(*) FILTER (WHERE loomky_property_id IS NOT NULL)          AS deja_sur_loomky
FROM fiches;


-- ---------------------------------------------------------------------
-- BLOC 3 — MIGRATION : creation de la colonne
--
-- TEXT nullable, sans valeur par defaut cote base : le defaut 'France'
-- est un choix d'INTERFACE (affiche et modifiable dans le formulaire),
-- pas un repli silencieux cote serveur. Une fiche creee hors formulaire
-- doit rester visiblement sans pays.
--
-- Nommage aligne sur les colonnes d'adresse existantes :
--   proprietaire_adresse_rue / _complement / _ville / _code_postal
--
-- Idempotent : rejouable sans erreur.
-- ---------------------------------------------------------------------
ALTER TABLE fiches
    ADD COLUMN IF NOT EXISTS proprietaire_adresse_pays TEXT;


-- ---------------------------------------------------------------------
-- BLOC 4 — MIGRATION : backfill des fiches existantes a 'FR'
--
-- 'FR' en MAJUSCULES : Loomky refuse 'fr' (400, Invalid enum value).
--
-- Ne touche que les lignes dont le pays est NULL ou vide, donc rejouable
-- sans effet de bord. Retourne le nombre de lignes mises a jour.
-- ---------------------------------------------------------------------
UPDATE fiches
SET proprietaire_adresse_pays = 'FR'
WHERE proprietaire_adresse_pays IS NULL
   OR proprietaire_adresse_pays = '';


-- ---------------------------------------------------------------------
-- BLOC 5 — CONTROLE POST-MIGRATION (lecture seule)
-- Repartition des valeurs de pays apres backfill.
--
-- Attendu : une seule ligne, pays = 'FR', nb_fiches egal a fiches_total
-- du BLOC 2. Aucune ligne avec pays NULL.
-- ---------------------------------------------------------------------
SELECT
    COALESCE(proprietaire_adresse_pays, '(NULL)') AS pays,
    COUNT(*)                                      AS nb_fiches
FROM fiches
GROUP BY 1
ORDER BY 2 DESC;


-- ---------------------------------------------------------------------
-- BLOC 6 — CONTROLE POST-MIGRATION (lecture seule)
-- Aucune valeur hors de la liste acceptee par Loomky.
--
-- Loomky exige un code a DEUX LETTRES en MAJUSCULES pris dans sa propre
-- liste (243 codes, qui n'est PAS la liste ISO complete). Ce controle ne
-- verifie que la forme ; la liste exacte est bornee cote application
-- (src/lib/countries.js), la ou le coordinateur choisit.
--
-- Attendu : 0 ligne.
-- ---------------------------------------------------------------------
SELECT id, nom, proprietaire_adresse_pays
FROM fiches
WHERE proprietaire_adresse_pays IS NOT NULL
  AND proprietaire_adresse_pays !~ '^[A-Z]{2}$';


-- =====================================================================
-- ROLLBACK (a ne jouer que si la PR applicative est annulee)
--
-- La colonne n'est lue par aucun trigger ni aucune vue : la supprimer
-- ne casse rien d'autre que le code qui l'ecrit. Ne la supprimer QU'APRES
-- avoir revert le deploiement, sinon la sauvegarde de fiche casse (meme
-- PGRST204 que ci-dessus, en sens inverse).
--
-- ALTER TABLE fiches DROP COLUMN IF EXISTS proprietaire_adresse_pays;
-- =====================================================================
