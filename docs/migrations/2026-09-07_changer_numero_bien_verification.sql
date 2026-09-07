-- ============================================================
-- Vérification : changer_numero_bien
-- Date      : 2026-09-07
-- Branche   : feat/admin-change-property-number
-- ============================================================
-- Scénario complet à exécuter dans le SQL Editor APRÈS la migration
-- 2026-09-07_changer_numero_bien.sql.
--
-- ⚠️ CE SCRIPT NE LAISSE AUCUNE ÉCRITURE DERRIÈRE LUI.
-- Tout se joue dans UN bloc DO qui se termine par un RAISE EXCEPTION : Postgres
-- annule alors l'intégralité de l'instruction, y compris les fiches de test
-- créées et les lignes d'historique écrites par les triggers d'audit. Le
-- rapport de test arrive dans le message de l'erreur. Une erreur est donc le
-- résultat NORMAL de ce script : lire le message, pas le statut.
--
-- Aucune fiche réelle n'est touchée : le scénario crée ses propres fiches
-- (numéros ZZTEST*), les manipule, puis tout est annulé. Les seuls comptes
-- réels utilisés le sont en LECTURE, pour emprunter une identité (`auth.uid()`)
-- représentative d'un admin et d'un coordinateur.
--
-- Couverture :
--   1. coordinateur : appel direct refusé (le vrai contrôle est ici, pas dans React)
--   2. session anonyme : refusée
--   3. droits d'exécution : `authenticated` oui, `anon` non
--   4. numéro invalide / identique : refusés
--   5. numéro déjà utilisé (casse comprise) : refusé, fiche en conflit identifiée
--   6. succès : SEULES les colonnes prévues changent (médias et données métier intacts)
--   7. marqueurs Loomky remis à zéro, sans aucun appel distant
--   8. annonces : `valide` -> `genere`, contenu conservé, trace Monday périmée retirée
--   9. historique : une ligne `numero_bien_changed` ancien -> nouveau, au nom de l'admin
--  10. verrou : le verrou de sérialisation est bien pris pendant la transaction
-- ============================================================

DO $verif$
DECLARE
  v_admin     uuid;
  v_coord     uuid;
  v_fiche     uuid;
  v_conflit   uuid;
  v_res       jsonb;
  v_avant     jsonb;
  v_apres     jsonb;
  v_diff      text;
  v_attendu   text := 'logement_numero_bien, loomky_checklist_ids, loomky_owner_id, '
                   || 'loomky_property_id, loomky_snapshot, loomky_sync_status, '
                   || 'loomky_synced_at, updated_at';
  v_annonce   record;
  v_hist      record;
  v_photos    text[];
  v_rapport   text := '';
  v_ok        boolean := true;
BEGIN
  -- Pour rejouer ce scénario AVANT d'appliquer la migration, insérer ici :
  --   EXECUTE $ddl$ <le CREATE OR REPLACE FUNCTION de la migration> $ddl$;
  -- La fonction créée par ce EXECUTE est annulée avec le reste du bloc.

  SELECT id INTO v_admin FROM profiles WHERE role = 'admin'         AND active IS TRUE LIMIT 1;
  SELECT id INTO v_coord FROM profiles WHERE role = 'coordinateur'  AND active IS TRUE LIMIT 1;
  IF v_admin IS NULL OR v_coord IS NULL THEN
    RAISE EXCEPTION 'Impossible de trouver un admin et un coordinateur actifs pour le scenario.';
  END IF;

  -- Fiche de test : numéro ZZTEST1, marqueurs Loomky posés (fiche « déjà
  -- synchronisée » chez l'ancienne conciergerie) et un média, pour vérifier
  -- qu'aucune URL ne bouge.
  -- `updated_at` est posé dans le PASSÉ à dessein : dans une même transaction,
  -- now() est figé, donc un updated_at créé à now() ne « changerait » pas et le
  -- contrôle 6b ne verrait pas la mise à jour.
  INSERT INTO fiches (nom, logement_numero_bien, statut, user_id, updated_at,
                      clefs_photos, proprietaire_email, logement_surface,
                      loomky_property_id, loomky_owner_id, loomky_checklist_ids,
                      loomky_sync_status, loomky_synced_at, loomky_snapshot)
  VALUES ('ZZTEST fiche renumerotation', 'ZZTEST1', 'Brouillon', v_coord, timestamp '2026-01-01 10:00:00',
          ARRAY['https://exemple/photo-1.jpg', 'https://exemple/photo-2.jpg'],
          'zztest@exemple.fr', 42,
          'prop-ancien-compte', 'owner-ancien-compte', '["chk-1","chk-2"]'::jsonb,
          'synced', now(), '{"source":"ancienne conciergerie"}'::jsonb)
  RETURNING id INTO v_fiche;

  -- Fiche concurrente qui occupe déjà le numéro ZZTEST2.
  INSERT INTO fiches (nom, logement_numero_bien, statut, user_id)
  VALUES ('ZZTEST fiche deja au numero', 'ZZTEST2', 'Complété', v_coord)
  RETURNING id INTO v_conflit;

  -- Annonce validée = « le document posé sur Monday EST l'annonce actuelle ».
  INSERT INTO agent_outputs (fiche_id, plateforme, statut, output_assemble, generation_meta, modele)
  VALUES (v_fiche, 'airbnb', 'valide',
          '{"airbnb":{"titre":"Texte de l annonce"}}'::jsonb,
          '{"validation":{"monday_item_id":"111","numero_bien":"ZZTEST1"},"generated_at":"2026-09-01"}'::jsonb,
          'modele-test');

  -- ---------------------------------------------------------------
  -- 1. Coordinateur : appel direct refusé
  -- ---------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_coord, 'role', 'authenticated')::text, true);
  BEGIN
    v_res := changer_numero_bien(v_fiche, 'ZZTEST3');
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 1. coordinateur : la renumerotation a ete acceptee -> ' || v_res::text;
  EXCEPTION WHEN insufficient_privilege THEN
    v_rapport := v_rapport || E'\n[OK]    1. coordinateur : refuse (insufficient_privilege)';
  END;

  -- ---------------------------------------------------------------
  -- 2. Session anonyme (aucun JWT) : refusée
  -- ---------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', '', true);
  BEGIN
    v_res := changer_numero_bien(v_fiche, 'ZZTEST3');
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 2. anonyme : la renumerotation a ete acceptee';
  EXCEPTION WHEN insufficient_privilege THEN
    v_rapport := v_rapport || E'\n[OK]    2. anonyme : refuse';
  END;

  -- ---------------------------------------------------------------
  -- 3. Droits d'exécution
  -- ---------------------------------------------------------------
  IF has_function_privilege('authenticated', 'public.changer_numero_bien(uuid,text)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.changer_numero_bien(uuid,text)', 'EXECUTE') THEN
    v_rapport := v_rapport || E'\n[OK]    3. droits : authenticated=EXECUTE, anon=refuse';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 3. droits : GRANT/REVOKE inattendus';
  END IF;

  -- À partir d'ici : identité administrateur.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- ---------------------------------------------------------------
  -- 4. Numéro vide / invalide / identique
  -- ---------------------------------------------------------------
  v_res := changer_numero_bien(v_fiche, '   ');
  IF v_res->>'erreur' = 'NUMERO_INVALIDE' THEN
    v_rapport := v_rapport || E'\n[OK]    4a. numero vide : refuse';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 4a. numero vide -> ' || v_res::text;
  END IF;

  v_res := changer_numero_bien(v_fiche, '2290 DUPONT');
  IF v_res->>'erreur' = 'NUMERO_INVALIDE' THEN
    v_rapport := v_rapport || E'\n[OK]    4b. numero avec espace/texte : refuse';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 4b. numero avec texte -> ' || v_res::text;
  END IF;

  v_res := changer_numero_bien(v_fiche, ' ZZTEST1 ');
  IF v_res->>'erreur' = 'NUMERO_IDENTIQUE' THEN
    v_rapport := v_rapport || E'\n[OK]    4c. numero identique (espaces compris) : refuse';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 4c. numero identique -> ' || v_res::text;
  END IF;

  -- ---------------------------------------------------------------
  -- 5. Numéro déjà utilisé
  -- ---------------------------------------------------------------
  v_res := changer_numero_bien(v_fiche, 'ZZTEST2');
  IF v_res->>'erreur' = 'NUMERO_DEJA_UTILISE'
     AND v_res->'fiche_en_conflit'->>'id' = v_conflit::text
     AND v_res->'fiche_en_conflit'->>'nom' = 'ZZTEST fiche deja au numero' THEN
    v_rapport := v_rapport || E'\n[OK]    5. numero deja utilise : refuse, fiche en conflit identifiee';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 5. collision -> ' || v_res::text;
  END IF;

  -- Variante de casse d'un numéro déjà pris : refusée aussi (le dossier Drive,
  -- lui, ne fait pas la différence entre ZZTEST2 et zztest2).
  v_res := changer_numero_bien(v_fiche, 'zztest2');
  IF v_res->>'erreur' = 'NUMERO_DEJA_UTILISE' THEN
    v_rapport := v_rapport || E'\n[OK]    5b. variante de casse d un numero pris : refusee';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 5b. variante de casse -> ' || v_res::text;
  END IF;

  -- La fiche n'a pas bougé après ces cinq refus.
  IF (SELECT logement_numero_bien FROM fiches WHERE id = v_fiche) = 'ZZTEST1'
     AND (SELECT loomky_property_id FROM fiches WHERE id = v_fiche) = 'prop-ancien-compte' THEN
    v_rapport := v_rapport || E'\n[OK]    5c. aucun effet de bord apres les refus';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 5c. un refus a quand meme modifie la fiche';
  END IF;

  -- ---------------------------------------------------------------
  -- 6 à 10. Le cas nominal
  -- ---------------------------------------------------------------
  SELECT to_jsonb(f) INTO v_avant FROM fiches f WHERE f.id = v_fiche;

  v_res := changer_numero_bien(v_fiche, 'ZZTEST9');

  IF v_res->>'ok' = 'true'
     AND v_res->>'ancien_numero' = 'ZZTEST1'
     AND v_res->>'nouveau_numero' = 'ZZTEST9'
     AND (v_res->>'loomky_reinitialise')::boolean IS TRUE
     AND (v_res->>'annonces_invalidees')::int = 1 THEN
    v_rapport := v_rapport || E'\n[OK]    6. succes : ' || v_res::text;
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 6. retour inattendu -> ' || v_res::text;
  END IF;

  SELECT to_jsonb(f) INTO v_apres FROM fiches f WHERE f.id = v_fiche;

  SELECT coalesce(string_agg(cle, ', ' ORDER BY cle COLLATE "C"), '(aucune)')
    INTO v_diff
  FROM (
    SELECT key AS cle FROM jsonb_each(v_avant) WHERE value IS DISTINCT FROM v_apres -> key
  ) t;

  IF v_diff = v_attendu THEN
    v_rapport := v_rapport || E'\n[OK]    6b. colonnes modifiees = exactement les colonnes prevues';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 6b. colonnes modifiees : ' || v_diff || E'\n        attendu : ' || v_attendu;
  END IF;

  SELECT clefs_photos INTO v_photos FROM fiches WHERE id = v_fiche;
  IF v_photos = ARRAY['https://exemple/photo-1.jpg', 'https://exemple/photo-2.jpg'] THEN
    v_rapport := v_rapport || E'\n[OK]    6c. URL des medias inchangees';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 6c. medias modifies -> ' || coalesce(array_to_string(v_photos, '|'), 'NULL');
  END IF;

  -- 7. Marqueurs Loomky
  IF EXISTS (
    SELECT 1 FROM fiches
    WHERE id = v_fiche
      AND loomky_property_id IS NULL AND loomky_owner_id IS NULL
      AND loomky_checklist_ids IS NULL AND loomky_sync_status IS NULL
      AND loomky_synced_at IS NULL AND loomky_snapshot IS NULL
  ) THEN
    v_rapport := v_rapport || E'\n[OK]    7. marqueurs Loomky remis a zero (aucune suppression distante : la fonction ne fait aucun appel reseau)';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 7. marqueurs Loomky encore poses';
  END IF;

  -- 8. Annonces
  SELECT statut, output_assemble, generation_meta INTO v_annonce
  FROM agent_outputs WHERE fiche_id = v_fiche AND plateforme = 'airbnb';

  IF v_annonce.statut = 'genere'
     AND v_annonce.output_assemble->'airbnb'->>'titre' = 'Texte de l annonce'
     AND NOT (v_annonce.generation_meta ? 'validation')
     AND v_annonce.generation_meta ? 'generated_at' THEN
    v_rapport := v_rapport || E'\n[OK]    8. annonce : valide -> genere, contenu conserve, trace Monday perimee retiree';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 8. annonce -> ' || coalesce(v_annonce.statut, 'NULL') || ' / ' || coalesce(v_annonce.generation_meta::text, 'NULL');
  END IF;

  -- 9. Historique (écrit par le trigger d'audit existant)
  SELECT action, old_value, new_value, changed_by INTO v_hist
  FROM fiches_history
  WHERE fiche_id = v_fiche AND action = 'numero_bien_changed'
  ORDER BY changed_at DESC LIMIT 1;

  IF v_hist.old_value = 'ZZTEST1' AND v_hist.new_value = 'ZZTEST9' AND v_hist.changed_by = v_admin THEN
    v_rapport := v_rapport || E'\n[OK]    9. historique : ZZTEST1 -> ZZTEST9, auteur = admin appelant';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 9. historique -> ' || coalesce(v_hist.old_value, 'NULL') || ' -> ' || coalesce(v_hist.new_value, 'NULL');
  END IF;

  -- 10. Verrou de sérialisation encore tenu par la transaction
  IF EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid()) THEN
    v_rapport := v_rapport || E'\n[OK]    10. verrou advisory pris pendant la transaction (serialisation des demandes concurrentes)';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 10. aucun verrou advisory : deux demandes concurrentes ne seraient pas serialisees';
  END IF;

  RAISE EXCEPTION E'ROLLBACK VOLONTAIRE - resultat : %\n%',
    CASE WHEN v_ok THEN 'TOUT EST VERT' ELSE 'AU MOINS UN ECHEC' END, v_rapport;
END;
$verif$;
