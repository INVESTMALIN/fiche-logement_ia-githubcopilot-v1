-- ============================================================
-- Vérification : le nom de la fiche suit le numéro
-- Date      : 2026-09-08
-- Branche   : feat/renommage-fiche-renumerotation
-- ============================================================
-- Scénario à exécuter dans le SQL Editor.
--
-- ⚠️ CE SCRIPT NE LAISSE AUCUNE ÉCRITURE DERRIÈRE LUI.
-- Tout se joue dans UN bloc DO qui se termine par un RAISE EXCEPTION : Postgres
-- annule alors l'intégralité de l'instruction — les fiches de test, les lignes
-- d'historique écrites par les triggers d'audit, et jusqu'à la définition de
-- fonction posée par le EXECUTE ci-dessous (le DDL est transactionnel).
-- Le rapport arrive dans le message de l'erreur : une erreur est le résultat
-- NORMAL de ce script, il faut lire le message, pas le statut.
--
-- Aucune fiche réelle n'est touchée : le scénario crée ses propres fiches, les
-- renumérote, les supprime, puis tout est annulé. Les seuls comptes réels
-- utilisés le sont en LECTURE, pour emprunter une identité (`auth.uid()`)
-- d'administrateur et rattacher les fiches de test à un coordinateur existant.
--
-- POUR REJOUER CE SCÉNARIO AVANT D'APPLIQUER LA MIGRATION
-- Insérer à l'emplacement marqué ci-dessous :
--   EXECUTE $ddl$ <le CREATE OR REPLACE FUNCTION de
--                  2026-09-08_renommage_fiche_renumerotation.sql> $ddl$;
-- La fonction ainsi créée est annulée avec le reste du bloc : la version
-- installée en production n'est pas remplacée.
--
-- CE QUI EST PROUVÉ
--   - les trois formats de nom relevés en production sont réécrits ;
--   - un numéro absent, inclus dans un nombre plus long, ou présent deux fois,
--     laisse le nom strictement intact ;
--   - un numéro contenant un point ne se comporte pas comme un joker ;
--   - dans tous les cas, y compris ceux sans renommage, le NUMÉRO est bien
--     changé : ne pas savoir renommer ne bloque jamais la renumérotation ;
--   - `nom_modifie` dit la vérité, c'est lui qui déclenche la consigne de
--     vérification sur l'écran de succès.
-- ============================================================

DO $verif$
DECLARE
  v_admin     uuid;
  v_coord     uuid;
  v_neuf      text := '2089';
  v_cas       record;
  v_fiche     uuid;
  v_res       jsonb;
  v_nom       text;
  v_numero    text;
  v_modifie   boolean;
  v_rapport   text := '';
  v_ok        boolean := true;
BEGIN
  -- >>> EMPLACEMENT DU EXECUTE $ddl$ ... $ddl$ (cf. en-tête) <<<

  SELECT id INTO v_admin FROM profiles WHERE role IN ('admin', 'super_admin') AND active IS TRUE LIMIT 1;
  SELECT id INTO v_coord FROM profiles WHERE role = 'coordinateur' AND active IS TRUE LIMIT 1;
  IF v_admin IS NULL OR v_coord IS NULL THEN
    RAISE EXCEPTION 'Impossible de trouver un administrateur et un coordinateur actifs pour le scenario.';
  END IF;

  -- Le numéro cible doit être libre, sinon le contrôle de collision refuserait
  -- l'appel et le scénario ne prouverait rien. Il n'est jamais écrit
  -- durablement : tout est annulé à la fin.
  IF EXISTS (SELECT 1 FROM fiches WHERE lower(btrim(logement_numero_bien)) = lower(v_neuf)) THEN
    RAISE EXCEPTION 'Le numero cible % est deja porte par une fiche : relancer avec un autre numero de test.', v_neuf;
  END IF;

  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  FOR v_cas IN
    SELECT * FROM (VALUES
      -- Les trois formats relevés sur les 453 fiches de production.
      ('1. « Bien <numero> » (223 fiches)',      '1111',   'Bien 1111',            'Bien 2089',            true),
      ('2. numero en fin de nom (210 fiches)',   '2109',   'CHARRASSE - 2109',     'CHARRASSE - 2089',     true),
      ('3. numero en debut de nom',              '2099',   '2099 - TIMTCHENKO T3', '2089 - TIMTCHENKO T3', true),
      -- Les trois cas où l'on ne touche à rien.
      ('4. numero absent (19 fiches)',           '2109',   'Villa des Pins',       'Villa des Pins',       false),
      ('5. inclus dans un nombre plus long',     '2109',   'Bien 21099',           'Bien 21099',           false),
      ('6. present deux fois',                   '2109',   '2109 - annexe 2109',   '2109 - annexe 2109',   false),
      -- Le point du numero ne doit pas se comporter comme un joker.
      ('7. numero a point, nom correspondant',   '2109.A', 'Bien 2109.A',          'Bien 2089',            true),
      ('8. numero a point, nom voisin',          '2109.A', 'Bien 2109XA',          'Bien 2109XA',          false),
      -- Bornes de mot : un numero colle a des lettres n'est pas isole.
      ('9. numero colle a du texte',             '2109',   'Bien2109',             'Bien2109',             false)
    ) AS t(libelle, ancien, nom_avant, nom_attendu, doit_renommer)
  LOOP
    INSERT INTO fiches (nom, logement_numero_bien, statut, user_id)
    VALUES (v_cas.nom_avant, v_cas.ancien, 'Brouillon', v_coord)
    RETURNING id INTO v_fiche;

    v_res := changer_numero_bien(v_fiche, v_cas.ancien, v_neuf);

    SELECT f.nom, btrim(coalesce(f.logement_numero_bien, ''))
      INTO v_nom, v_numero
    FROM fiches f WHERE f.id = v_fiche;

    v_modifie := (v_res->>'nom_modifie')::boolean;

    IF (v_res->>'ok')::boolean IS NOT TRUE THEN
      v_ok := false;
      v_rapport := v_rapport || E'\n[ECHEC] ' || v_cas.libelle || ' : appel refuse -> ' || v_res::text;
    ELSIF v_numero <> v_neuf THEN
      -- Le renommage ne doit jamais empêcher la renumérotation.
      v_ok := false;
      v_rapport := v_rapport || E'\n[ECHEC] ' || v_cas.libelle || ' : numero non applique (' || v_numero || ')';
    ELSIF v_nom IS DISTINCT FROM v_cas.nom_attendu THEN
      v_ok := false;
      v_rapport := v_rapport || E'\n[ECHEC] ' || v_cas.libelle
                || ' : nom attendu « ' || v_cas.nom_attendu || ' », obtenu « ' || coalesce(v_nom, '(null)') || ' »';
    ELSIF v_modifie IS DISTINCT FROM v_cas.doit_renommer THEN
      v_ok := false;
      v_rapport := v_rapport || E'\n[ECHEC] ' || v_cas.libelle
                || ' : nom_modifie attendu ' || v_cas.doit_renommer::text || ', obtenu ' || coalesce(v_modifie::text, '(null)');
    ELSE
      v_rapport := v_rapport || E'\n[OK]    ' || v_cas.libelle
                || ' : « ' || v_cas.nom_avant || ' » -> « ' || coalesce(v_nom, '(null)')
                || ' » (nom_modifie=' || v_modifie::text || ')';
    END IF;

    -- La fiche de test libère le numéro cible pour le cas suivant : sans ça,
    -- le second appel serait refusé pour collision et ne prouverait rien.
    DELETE FROM fiches WHERE id = v_fiche;
  END LOOP;

  -- ---------------------------------------------------------------
  -- 10. Fiche sans nom : aucune erreur, rien à renommer
  -- ---------------------------------------------------------------
  INSERT INTO fiches (nom, logement_numero_bien, statut, user_id)
  VALUES (NULL, '2109', 'Brouillon', v_coord)
  RETURNING id INTO v_fiche;

  v_res := changer_numero_bien(v_fiche, '2109', v_neuf);
  SELECT f.nom INTO v_nom FROM fiches f WHERE f.id = v_fiche;

  IF (v_res->>'ok')::boolean IS TRUE
     AND v_nom IS NULL
     AND (v_res->>'nom_modifie')::boolean IS FALSE THEN
    v_rapport := v_rapport || E'\n[OK]    10. fiche sans nom : renumerotee, nom laisse a NULL';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 10. fiche sans nom -> ' || v_res::text;
  END IF;

  DELETE FROM fiches WHERE id = v_fiche;

  -- ---------------------------------------------------------------
  -- 11. Le nom ne bouge pas quand la renumérotation est refusée
  -- ---------------------------------------------------------------
  -- Un refus doit tout laisser en place : c'est la garantie qu'il n'existe pas
  -- d'état intermédiaire où le nom serait réécrit sans que le numéro le soit.
  INSERT INTO fiches (nom, logement_numero_bien, statut, user_id)
  VALUES ('Bien 2109', '2109', 'Brouillon', v_coord)
  RETURNING id INTO v_fiche;

  -- Numéro attendu périmé → NUMERO_DESYNCHRONISE, aucune écriture.
  v_res := changer_numero_bien(v_fiche, '9999', v_neuf);
  SELECT f.nom, btrim(coalesce(f.logement_numero_bien, '')) INTO v_nom, v_numero
  FROM fiches f WHERE f.id = v_fiche;

  IF v_res->>'erreur' = 'NUMERO_DESYNCHRONISE' AND v_nom = 'Bien 2109' AND v_numero = '2109' THEN
    v_rapport := v_rapport || E'\n[OK]    11. appel refuse : nom ET numero inchanges';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 11. appel refuse mais etat modifie -> nom=' || coalesce(v_nom, '(null)')
              || ' numero=' || v_numero || ' res=' || v_res::text;
  END IF;

  RAISE EXCEPTION E'ROLLBACK VOLONTAIRE - resultat : %\n%',
    CASE WHEN v_ok THEN 'TOUT EST VERT' ELSE 'AU MOINS UN ECHEC' END, v_rapport;
END;
$verif$;
