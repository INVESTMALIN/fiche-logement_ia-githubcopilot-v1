-- ============================================================
-- Vérification : fusionner_monday_snapshot
-- Date      : 2026-09-16
-- Branche   : fix/monday-sync-isolation-champs
-- ============================================================
-- Scénario complet, exécutable AVANT ou APRÈS la migration
-- 2026-09-16_fusionner_monday_snapshot.sql : le bloc recrée la fonction en
-- son sein (EXECUTE), puis la teste.
--
-- ⚠️ CE SCRIPT NE LAISSE AUCUNE ÉCRITURE DERRIÈRE LUI.
-- Tout se joue dans UN bloc DO qui se termine par un RAISE EXCEPTION : Postgres
-- annule alors l'intégralité de l'instruction — fonction créée, fiches de test,
-- lignes d'audit, appels webhook mis en file par pg_net. Le rapport arrive dans
-- le message de l'erreur. Une erreur est donc le résultat NORMAL de ce script :
-- lire le message, pas le statut.
--
-- Aucune fiche réelle n'est touchée : le scénario crée ses propres fiches
-- (numéros ZZTEST-SNAP-*), les manipule, puis tout est annulé. Les seuls
-- comptes réels utilisés le sont en LECTURE, pour emprunter une identité
-- (`auth.uid()`) représentative de deux coordinateurs.
--
-- Couverture :
--   0. définition : SECURITY INVOKER, search_path figé, EXECUTE pour
--      authenticated seulement (anon et PUBLIC refusés)
--   1. fusion par clé : un patch d'une clé ne change QUE cette clé, les trois
--      autres restent telles qu'EN BASE ; aucune autre colonne ne bouge
--   2. snapshot NULL (fiche jamais synchronisée / renumérotée) : le résultat
--      contient exactement les clés du patch
--   3. valeur null dans le patch (champ vidé et poussé) : la clé est bien
--      mémorisée à null, elle n'est pas ignorée
--   4. garde du numéro de bien : mauvais numéro → NULL, snapshot intact
--   5. deux fusions successives sur des clés différentes (deux syncs qui se
--      croisent) : les deux succès survivent, aucun n'efface l'autre
--   6. patch invalide (vide, tableau, NULL) : refusé, snapshot intact
--   7. RLS : un coordinateur fusionne sa fiche, obtient NULL sur celle d'un
--      autre (dont le snapshot reste intact)
--   8. session anonyme : exécution refusée
-- ============================================================

DO $verif$
DECLARE
  v_coord       uuid;
  v_coord2      uuid;
  v_fiche       uuid;
  v_fiche_autre uuid;
  v_res         jsonb;
  v_attendu     jsonb;
  v_avant       jsonb;
  v_ligne_avant jsonb;
  v_ligne_apres jsonb;
  v_prosecdef   boolean;
  v_proconfig   text[];
  v_rapport     text := '';
  v_ok          boolean := true;
BEGIN
  -- Fonction créée ICI (annulée avec le reste). Copie conforme de la migration.
  EXECUTE $ddl$
    CREATE OR REPLACE FUNCTION public.fusionner_monday_snapshot(
      p_fiche_id    uuid,
      p_numero_bien text,
      p_patch       jsonb
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY INVOKER
    SET search_path = public, pg_temp
    AS $$
    DECLARE
      v_snapshot jsonb;
    BEGIN
      IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::jsonb THEN
        RAISE EXCEPTION 'fusionner_monday_snapshot : p_patch doit etre un objet JSON non vide'
          USING ERRCODE = 'invalid_parameter_value';
      END IF;
      IF p_fiche_id IS NULL OR p_numero_bien IS NULL OR btrim(p_numero_bien) = '' THEN
        RAISE EXCEPTION 'fusionner_monday_snapshot : p_fiche_id et p_numero_bien sont obligatoires'
          USING ERRCODE = 'invalid_parameter_value';
      END IF;

      UPDATE public.fiches
         SET monday_snapshot = COALESCE(monday_snapshot, '{}'::jsonb) || p_patch
       WHERE id = p_fiche_id
         AND logement_numero_bien = p_numero_bien
      RETURNING monday_snapshot INTO v_snapshot;

      IF NOT FOUND THEN
        RETURN NULL;
      END IF;
      RETURN v_snapshot;
    END;
    $$;
  $ddl$;
  EXECUTE 'REVOKE ALL ON FUNCTION public.fusionner_monday_snapshot(uuid, text, jsonb) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.fusionner_monday_snapshot(uuid, text, jsonb) FROM anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.fusionner_monday_snapshot(uuid, text, jsonb) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.fusionner_monday_snapshot(uuid, text, jsonb) TO service_role';

  SELECT id INTO v_coord  FROM profiles WHERE role = 'coordinateur' AND active IS TRUE ORDER BY id LIMIT 1;
  SELECT id INTO v_coord2 FROM profiles WHERE role = 'coordinateur' AND active IS TRUE AND id <> v_coord ORDER BY id LIMIT 1;
  IF v_coord IS NULL OR v_coord2 IS NULL THEN
    RAISE EXCEPTION 'Impossible de trouver deux coordinateurs actifs pour le scenario.';
  END IF;

  -- Fiche de test « déjà synchronisée » : snapshot complet, 4 clés.
  INSERT INTO fiches (nom, logement_numero_bien, statut, user_id, updated_at, airbnb_mot_passe, monday_snapshot)
  VALUES ('ZZTEST fusion snapshot', 'ZZTEST-SNAP-1', 'Complété', v_coord, timestamp '2026-01-01 10:00:00',
          'mdp-factice-a',
          '{"type_premier_menage":"Classique","type_premiere_maintenance":"Pas d''intervention","airbnb_mot_passe":"ancien-a","booking_mot_passe":"ancien-b"}'::jsonb)
  RETURNING id INTO v_fiche;

  -- Fiche d'un AUTRE coordinateur, pour la RLS.
  INSERT INTO fiches (nom, logement_numero_bien, statut, user_id, monday_snapshot)
  VALUES ('ZZTEST fusion autre coordinateur', 'ZZTEST-SNAP-2', 'Complété', v_coord2,
          '{"airbnb_mot_passe":"intact"}'::jsonb)
  RETURNING id INTO v_fiche_autre;

  -- ---------------------------------------------------------------
  -- 0. Définition et droits
  -- ---------------------------------------------------------------
  SELECT p.prosecdef, p.proconfig INTO v_prosecdef, v_proconfig
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fusionner_monday_snapshot';

  IF v_prosecdef IS FALSE THEN
    v_rapport := v_rapport || E'\n[OK]    0a. SECURITY INVOKER (les RLS de fiches s''appliquent a l''appelant)';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 0a. la fonction est SECURITY DEFINER';
  END IF;

  IF v_proconfig IS NOT NULL AND 'search_path=public, pg_temp' = ANY (v_proconfig) THEN
    v_rapport := v_rapport || E'\n[OK]    0b. search_path fige : public, pg_temp';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 0b. search_path non fige : ' || COALESCE(array_to_string(v_proconfig, ';'), '(aucun)');
  END IF;

  IF has_function_privilege('authenticated', 'public.fusionner_monday_snapshot(uuid,text,jsonb)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.fusionner_monday_snapshot(uuid,text,jsonb)', 'EXECUTE') THEN
    v_rapport := v_rapport || E'\n[OK]    0c. droits : authenticated=EXECUTE, anon=refuse';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 0c. droits : GRANT/REVOKE inattendus';
  END IF;

  -- ---------------------------------------------------------------
  -- 1. Fusion par clé + aucune autre colonne modifiée
  -- ---------------------------------------------------------------
  SELECT to_jsonb(f) - 'monday_snapshot' INTO v_ligne_avant FROM fiches f WHERE id = v_fiche;

  v_res := fusionner_monday_snapshot(v_fiche, 'ZZTEST-SNAP-1', '{"airbnb_mot_passe":"nouveau-a"}'::jsonb);
  v_attendu := '{"type_premier_menage":"Classique","type_premiere_maintenance":"Pas d''intervention","airbnb_mot_passe":"nouveau-a","booking_mot_passe":"ancien-b"}'::jsonb;

  IF v_res = v_attendu AND (SELECT monday_snapshot FROM fiches WHERE id = v_fiche) = v_attendu THEN
    v_rapport := v_rapport || E'\n[OK]    1a. fusion par cle : seule airbnb_mot_passe change, les 3 autres cles sont conservees';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 1a. fusion par cle : obtenu ' || COALESCE(v_res::text, 'NULL');
  END IF;

  SELECT to_jsonb(f) - 'monday_snapshot' INTO v_ligne_apres FROM fiches f WHERE id = v_fiche;
  IF v_ligne_apres = v_ligne_avant THEN
    v_rapport := v_rapport || E'\n[OK]    1b. aucune autre colonne modifiee (updated_at, mots de passe, statut... intacts)';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 1b. d''autres colonnes ont bouge';
  END IF;

  -- ---------------------------------------------------------------
  -- 2. Snapshot NULL → exactement les clés du patch
  -- ---------------------------------------------------------------
  UPDATE fiches SET monday_snapshot = NULL WHERE id = v_fiche;
  v_res := fusionner_monday_snapshot(v_fiche, 'ZZTEST-SNAP-1', '{"booking_mot_passe":"b2","type_premier_menage":"Approfondi"}'::jsonb);
  IF v_res = '{"booking_mot_passe":"b2","type_premier_menage":"Approfondi"}'::jsonb THEN
    v_rapport := v_rapport || E'\n[OK]    2. snapshot NULL : le resultat contient exactement les cles du patch';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 2. snapshot NULL : obtenu ' || COALESCE(v_res::text, 'NULL');
  END IF;

  -- ---------------------------------------------------------------
  -- 3. Valeur null dans le patch (champ vidé côté fiche, vidage poussé)
  -- ---------------------------------------------------------------
  v_res := fusionner_monday_snapshot(v_fiche, 'ZZTEST-SNAP-1', '{"booking_mot_passe":null}'::jsonb);
  IF v_res ? 'booking_mot_passe' AND jsonb_typeof(v_res -> 'booking_mot_passe') = 'null'
     AND v_res -> 'type_premier_menage' = '"Approfondi"'::jsonb THEN
    v_rapport := v_rapport || E'\n[OK]    3. valeur null memorisee comme null (un vidage pousse ne sera pas re-pousse)';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 3. valeur null : obtenu ' || COALESCE(v_res::text, 'NULL');
  END IF;

  -- ---------------------------------------------------------------
  -- 4. Garde du numéro de bien
  -- ---------------------------------------------------------------
  SELECT monday_snapshot INTO v_avant FROM fiches WHERE id = v_fiche;
  v_res := fusionner_monday_snapshot(v_fiche, 'AUTRE-NUMERO', '{"airbnb_mot_passe":"pirate"}'::jsonb);
  IF v_res IS NULL AND (SELECT monday_snapshot FROM fiches WHERE id = v_fiche) = v_avant THEN
    v_rapport := v_rapport || E'\n[OK]    4. mauvais numero de bien : NULL rendu, snapshot intact (garde de renumerotation)';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 4. mauvais numero : obtenu ' || COALESCE(v_res::text, 'NULL');
  END IF;

  -- ---------------------------------------------------------------
  -- 5. Deux fusions qui se croisent sur des clés différentes
  -- ---------------------------------------------------------------
  PERFORM fusionner_monday_snapshot(v_fiche, 'ZZTEST-SNAP-1', '{"airbnb_mot_passe":"sync-A"}'::jsonb);
  v_res := fusionner_monday_snapshot(v_fiche, 'ZZTEST-SNAP-1', '{"type_premiere_maintenance":"sync-B"}'::jsonb);
  IF v_res -> 'airbnb_mot_passe' = '"sync-A"'::jsonb AND v_res -> 'type_premiere_maintenance' = '"sync-B"'::jsonb THEN
    v_rapport := v_rapport || E'\n[OK]    5. deux syncs successives : les deux succes survivent, aucun n''efface l''autre';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 5. deux syncs : obtenu ' || COALESCE(v_res::text, 'NULL');
  END IF;

  -- ---------------------------------------------------------------
  -- 6. Patch invalide : refusé, snapshot intact
  -- ---------------------------------------------------------------
  SELECT monday_snapshot INTO v_avant FROM fiches WHERE id = v_fiche;
  BEGIN
    PERFORM fusionner_monday_snapshot(v_fiche, 'ZZTEST-SNAP-1', '{}'::jsonb);
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 6a. patch vide accepte';
  EXCEPTION WHEN invalid_parameter_value THEN
    v_rapport := v_rapport || E'\n[OK]    6a. patch vide refuse';
  END;
  BEGIN
    PERFORM fusionner_monday_snapshot(v_fiche, 'ZZTEST-SNAP-1', '["airbnb_mot_passe"]'::jsonb);
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 6b. patch tableau accepte';
  EXCEPTION WHEN invalid_parameter_value THEN
    v_rapport := v_rapport || E'\n[OK]    6b. patch tableau refuse';
  END;
  BEGIN
    PERFORM fusionner_monday_snapshot(v_fiche, 'ZZTEST-SNAP-1', NULL);
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 6c. patch NULL accepte';
  EXCEPTION WHEN invalid_parameter_value THEN
    v_rapport := v_rapport || E'\n[OK]    6c. patch NULL refuse';
  END;
  IF (SELECT monday_snapshot FROM fiches WHERE id = v_fiche) = v_avant THEN
    v_rapport := v_rapport || E'\n[OK]    6d. snapshot intact apres les refus';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 6d. snapshot modifie par un patch refuse';
  END IF;

  -- ---------------------------------------------------------------
  -- 7. RLS : identité du premier coordinateur, rôle authenticated
  -- ---------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_coord, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  BEGIN
    v_res := fusionner_monday_snapshot(v_fiche, 'ZZTEST-SNAP-1', '{"booking_mot_passe":"par-le-coordinateur"}'::jsonb);
    IF v_res -> 'booking_mot_passe' = '"par-le-coordinateur"'::jsonb THEN
      v_rapport := v_rapport || E'\n[OK]    7a. coordinateur : fusion sur SA fiche acceptee';
    ELSE
      v_ok := false;
      v_rapport := v_rapport || E'\n[ECHEC] 7a. coordinateur sur sa fiche : obtenu ' || COALESCE(v_res::text, 'NULL');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 7a. coordinateur sur sa fiche en erreur : ' || SQLERRM;
  END;

  BEGIN
    v_res := fusionner_monday_snapshot(v_fiche_autre, 'ZZTEST-SNAP-2', '{"airbnb_mot_passe":"intrusion"}'::jsonb);
    IF v_res IS NULL THEN
      v_rapport := v_rapport || E'\n[OK]    7b. coordinateur : NULL sur la fiche d''un autre (RLS)';
    ELSE
      v_ok := false;
      v_rapport := v_rapport || E'\n[ECHEC] 7b. coordinateur a fusionne la fiche d''un autre : ' || v_res::text;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 7b. fiche d''un autre en erreur : ' || SQLERRM;
  END;

  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);

  IF (SELECT monday_snapshot FROM fiches WHERE id = v_fiche_autre) = '{"airbnb_mot_passe":"intact"}'::jsonb THEN
    v_rapport := v_rapport || E'\n[OK]    7c. snapshot de la fiche de l''autre coordinateur intact';
  ELSE
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 7c. snapshot de l''autre coordinateur modifie';
  END IF;

  -- ---------------------------------------------------------------
  -- 8. Session anonyme : exécution refusée
  -- ---------------------------------------------------------------
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    PERFORM fusionner_monday_snapshot(v_fiche, 'ZZTEST-SNAP-1', '{"airbnb_mot_passe":"anonyme"}'::jsonb);
    v_ok := false;
    v_rapport := v_rapport || E'\n[ECHEC] 8. anonyme : execution acceptee';
  EXCEPTION WHEN insufficient_privilege THEN
    v_rapport := v_rapport || E'\n[OK]    8. anonyme : execution refusee';
  END;
  EXECUTE 'RESET ROLE';

  RAISE EXCEPTION E'ROLLBACK VOLONTAIRE - resultat : %\n%',
    CASE WHEN v_ok THEN 'TOUT EST VERT' ELSE 'AU MOINS UN ECHEC' END, v_rapport;
END;
$verif$;
