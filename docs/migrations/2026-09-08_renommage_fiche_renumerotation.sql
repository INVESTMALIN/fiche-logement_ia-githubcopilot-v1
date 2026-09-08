-- ============================================================
-- Migration : le nom de la fiche suit le numéro (admin)
-- Date      : 2026-09-08
-- Branche   : feat/renommage-fiche-renumerotation
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase.
--
-- REMPLACE la fonction `changer_numero_bien` installée le 2026-09-07
-- (migration 2026-09-07_changer_numero_bien.sql, appliquée en production).
-- Même signature (uuid, text, text), donc CREATE OR REPLACE suffit : pas de
-- DROP, pas de surcharge, les GRANT existants sont conservés.
--
-- ⚠️ Le fichier du 2026-09-07 n'est PAS modifié : il reste le reflet exact de
--    ce qui a été appliqué ce jour-là. Cette migration s'empile dessus.
--
-- ⚠️ ORDRE : appliquer cette migration APRÈS le déploiement du front, pas
--    avant. Voir la note d'ordre en fin de fichier.
--
-- CE QUI CHANGE
-- Un seul ajout : quand l'ancien numéro apparaît EXACTEMENT UNE FOIS dans le
-- nom de la fiche, comme nombre isolé, il est remplacé par le nouveau dans la
-- même transaction que la renumérotation.
--
--   « Bien 1111 »            → « Bien 2089 »
--   « CHARRASSE - 2109 »     → « CHARRASSE - 2089 »
--   « 2099 - TIMTCHENKO T3 » → « 2089 - TIMTCHENKO T3 »
--
-- Dans TOUS les autres cas le nom est conservé à l'identique : numéro absent,
-- numéro inclus dans un nombre plus long, plusieurs occurrences. La fonction
-- rend `nom_modifie` pour que l'écran de succès puisse demander une
-- vérification manuelle.
--
-- POURQUOI DANS LA FONCTION, ET PAS CÔTÉ CLIENT
-- Un renommage fait après coup par le navigateur peut échouer seul : la fiche
-- porterait alors le nouveau numéro avec l'ancien nom, et personne ne le
-- saurait. Numéro et nom changent donc dans le MÊME UPDATE, sous le même
-- verrou, avec les mêmes contrôles de rôle et de collision.
--
-- POURQUOI UNE SUBSTITUTION LITTÉRALE, ET RIEN D'AUTRE
-- Aucune analyse du reste du nom, aucun rapprochement approximatif. La seule
-- question posée est « ce nombre exact apparaît-il une fois et une seule ? ».
-- Un nom qu'on ne sait pas réécrire avec certitude n'est pas réécrit du tout :
-- sur 453 fiches, 19 ne contiennent pas leur numéro et 1 ne le contient que
-- comme morceau d'un autre nombre. Les toucher au jugé produirait des noms faux
-- que personne ne relirait.
-- ============================================================

CREATE OR REPLACE FUNCTION public.changer_numero_bien(
  p_fiche_id       uuid,
  p_numero_attendu text,
  p_nouveau_numero text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_role        text;
  v_active      boolean;
  v_ancien      text;
  v_nouveau     text;
  v_loomky      boolean;
  v_conflit     record;
  v_annonces    integer;
  v_nom         text;
  v_nom_final   text;
  v_nom_modifie boolean := false;
  v_motif       text;
  v_occurrences integer;
BEGIN
  -- 1. RÔLE — autorité réelle du parcours. On lit `profiles` directement plutôt
  -- que via get_user_role() pour contrôler AUSSI `active` : un compte désactivé
  -- garde un JWT valide jusqu'à son expiration, le refus au login ne suffit pas.
  SELECT p.role, p.active INTO v_role, v_active
  FROM profiles p
  WHERE p.id = auth.uid();

  IF auth.uid() IS NULL
     OR v_role IS NULL
     OR v_role NOT IN ('admin', 'super_admin')
     OR v_active IS FALSE THEN
    RAISE EXCEPTION 'Modification du numero de bien reservee aux administrateurs.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_nouveau := btrim(coalesce(p_nouveau_numero, ''));

  -- 2. FORME — même règle que le client (src/lib/numeroBien.js) et que le
  -- garde-fou de création (mondayFieldConstraints) : identifiant compact, ni
  -- espace ni texte libre, dans la longueur de la colonne varchar(50).
  IF v_nouveau = ''
     OR length(v_nouveau) > 50
     OR v_nouveau !~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$' THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'NUMERO_INVALIDE');
  END IF;

  -- 3. SÉRIALISATION — deux renumérotations concurrentes vers le MÊME numéro
  -- s'attendent ici. Le verrou est libéré à la fin de la transaction.
  -- La clé est en minuscules, comme le contrôle de collision ci-dessous : sans
  -- ça « PAR-2189 » et « par-2189 » prendraient deux verrous différents et
  -- passeraient tous les deux.
  -- Limite assumée : la CRÉATION d'une fiche ne prend pas ce verrou (elle n'a
  -- qu'une alerte de doublon non bloquante, cf. check_fiche_existante). Ce
  -- verrou protège donc les renumérotations entre elles, pas la course avec une
  -- création simultanée — périmètre inchangé sur ce point.
  PERFORM pg_advisory_xact_lock(hashtext('fiches.logement_numero_bien:' || lower(v_nouveau)));

  -- `coalesce` : le schéma autorise `logement_numero_bien` à NULL (aucune fiche
  -- dans ce cas au 2026-09-07, et `handleSave` refuse d'enregistrer sans numéro,
  -- mais un import ou un script pourrait en produire). Sans lui, `v_ancien`
  -- resterait NULL, le compare-and-swap ci-dessous verrait toujours une
  -- différence avec le `''` envoyé par le client, et une telle fiche ne pourrait
  -- PLUS jamais recevoir de numéro : ni par ce parcours, ni par le formulaire
  -- (champ verrouillé), ni par un UPDATE direct (refusé par le trigger).
  -- `f.nom` est lu dans le MÊME verrou de ligne que le numéro : le nom réécrit
  -- plus bas est donc celui qui est réellement en base au moment de l'écriture,
  -- pas celui qu'un onglet ouvert croit connaître.
  SELECT btrim(coalesce(f.logement_numero_bien, '')),
         (f.loomky_property_id   IS NOT NULL
       OR f.loomky_owner_id      IS NOT NULL
       OR f.loomky_checklist_ids IS NOT NULL
       OR f.loomky_sync_status   IS NOT NULL
       OR f.loomky_synced_at     IS NOT NULL
       OR f.loomky_snapshot      IS NOT NULL),
         f.nom
    INTO v_ancien, v_loomky, v_nom
  FROM fiches f
  WHERE f.id = p_fiche_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'FICHE_INTROUVABLE');
  END IF;

  -- 3 bis. COMPARE-AND-SWAP sur le numéro de départ.
  -- Deux administrateurs peuvent avoir la même fiche ouverte et demander des
  -- numéros différents. Le second attendrait ici la fin du premier, relirait un
  -- `v_ancien` déjà changé, et renumérotererait quand même — alors que son écran
  -- lui a fait confirmer une AUTRE transition, et que les opérations déjà
  -- lancées sur le numéro intermédiaire (dossiers, PDF, synchro) deviendraient
  -- caduques sans que personne ne le sache. Le numéro décidant des chemins de
  -- médias, ce conflit ne se règle pas en « dernier arrivé gagne ».
  -- On rend le numéro réel : l'écran peut dire quoi recharger.
  -- Les deux côtés sont normalisés de la même façon (coalesce + btrim), sans
  -- quoi une fiche sans numéro serait éternellement « désynchronisée ».
  IF v_ancien IS DISTINCT FROM btrim(coalesce(p_numero_attendu, '')) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'erreur', 'NUMERO_DESYNCHRONISE',
      'numero_reel', v_ancien
    );
  END IF;

  IF v_ancien = v_nouveau THEN
    RETURN jsonb_build_object('ok', false, 'erreur', 'NUMERO_IDENTIQUE');
  END IF;

  -- 4. COLLISION — sous le verrou, donc fiable. Pas de contournement dans cette
  -- version : on rend de quoi identifier la fiche qui bloque (l'appelant est
  -- admin ou super_admin, il a déjà accès en lecture à toutes les fiches).
  --
  -- Comparaison INSENSIBLE À LA CASSE. Le format autorise des préfixes
  -- alphabétiques (« PAR-2189 ») ; or le rapprochement du dossier Google Drive
  -- est, lui, insensible à la casse. « PAR-2189 » et « par-2189 » résoudraient
  -- donc le MÊME dossier Drive tout en passant pour deux biens distincts, et les
  -- deux fiches se partageraient dossier Drive et médias. On refuse la variante
  -- de casse d'un numéro déjà pris.
  -- La comparaison avec le numéro ACTUEL (étape précédente) reste exacte, elle :
  -- corriger la casse du numéro de SA PROPRE fiche est un changement légitime.
  -- Asymétrie assumée : `check_fiche_existante` (alerte de doublon à la
  -- création) compare toujours exactement. L'aligner changerait le comportement
  -- d'un autre parcours, hors périmètre ici — le refus vient alors du serveur,
  -- avec la fiche en conflit affichée.
  SELECT f.id, f.nom, f.statut, pr.prenom AS coordinateur_prenom, pr.nom AS coordinateur_nom
    INTO v_conflit
  FROM fiches f
  LEFT JOIN profiles pr ON pr.id = f.user_id
  WHERE lower(btrim(f.logement_numero_bien)) = lower(v_nouveau)
    AND f.id <> p_fiche_id
  ORDER BY f.updated_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'erreur', 'NUMERO_DEJA_UTILISE',
      'fiche_en_conflit', jsonb_build_object(
        'id', v_conflit.id,
        'nom', v_conflit.nom,
        'statut', v_conflit.statut,
        'coordinateur_prenom', v_conflit.coordinateur_prenom,
        'coordinateur_nom', v_conflit.coordinateur_nom
      )
    );
  END IF;

  -- 4 bis. NOM DE LA FICHE.
  -- Par défaut, le nom ne bouge pas. Il n'est réécrit que si l'ancien numéro y
  -- apparaît EXACTEMENT UNE FOIS comme nombre isolé.
  --
  -- `\m` et `\M` sont les bornes de mot de PostgreSQL, de LARGEUR NULLE : elles
  -- ne consomment aucun caractère, donc deux occurrences collées à leurs bornes
  -- (« 2109 2109ExempleImpossibleMaisPrudent ») sont comptées séparément. Une
  -- borne exprimée en classe de caractères, elle, mangerait le séparateur commun
  -- à deux occurrences voisines et n'en compterait qu'une — on renommerait alors
  -- un nom qui contient deux fois le numéro.
  -- Ces bornes traitent le souligné comme une lettre : « Bien_2109 » n'est donc
  -- pas considéré isolé et le nom est conservé. C'est le sens voulu : au moindre
  -- doute, on ne touche pas.
  --
  -- Le numéro est échappé caractère par caractère avant d'entrer dans le motif :
  -- il peut contenir « . », « / » ou « - » (format « 2290.A », « PAR-2290 »),
  -- et un point non échappé matcherait n'importe quel caractère — « 2290.A »
  -- reconnaîtrait « 2290XA ».
  -- Côté remplacement il n'y a rien à échapper : `regexp_replace` interprète
  -- « \ » et « & », or le format du nouveau numéro (contrôle 2 ci-dessus)
  -- n'autorise ni l'un ni l'autre.
  --
  -- `v_ancien <> ''` : sur une fiche sans numéro, il n'y a rien à chercher, et
  -- un motif vide s'accrocherait à des bornes de mot arbitraires.
  --
  -- ARBITRAGE MESURÉ (review du 2026-09-08). Une borne plus stricte, excluant
  -- l'adjacence à TOUS les caractères autorisés dans un numéro (« . », « / »,
  -- « - »), a été proposée : elle éviterait de réécrire « 2109 » dans un nom qui
  -- dirait en réalité « 2109.A », un autre bien. Comptée sur les 453 fiches de
  -- production : la borne actuelle renomme 433 fiches (soit exactement les
  -- 223 + 210 du relevé), la borne stricte 427. Les 6 perdues sont des noms où
  -- le numéro touche un tiret sans espace — « DECK-1719 », « LAGARRIGUE-1974 »,
  -- « 1567- VERNAZZA » — et le cas qu'elle protégerait n'existe pas : aucun nom
  -- ne porte son numéro suivi ou précédé d'un point ou d'un slash, et aucun
  -- numéro du parc ne contient de séparateur. Coût réel 6, gain réel 0 : borne
  -- conservée. À revoir si des numéros à séparateur (« 2290.A ») entrent au parc.
  v_nom_final := v_nom;

  IF v_nom IS NOT NULL AND v_ancien <> '' THEN
    v_motif := '\m' || regexp_replace(v_ancien, '([^A-Za-z0-9])', '\\\1', 'g') || '\M';

    SELECT count(*) INTO v_occurrences
    FROM regexp_matches(v_nom, v_motif, 'g');

    IF v_occurrences = 1 THEN
      v_nom_final   := regexp_replace(v_nom, v_motif, v_nouveau);
      v_nom_modifie := true;
    END IF;
  END IF;

  -- 5. RENUMÉROTATION + NOM + REMISE À ZÉRO LOOMKY.
  -- Les marqueurs Loomky décrivent un logement créé dans le compte de l'ANCIENNE
  -- conciergerie : les garder ferait croire la fiche synchronisée et empêcherait
  -- de relancer le parcours avec le token du nouveau compte (planLoomkySync ne
  -- recrée jamais une property tant que loomky_property_id est posé).
  -- Le logement et les checklists restent INTACTS chez Loomky : aucune
  -- suppression distante n'est demandée, ici ni ailleurs dans ce parcours.
  -- `monday_snapshot` part avec : il mémorise ce qui a été poussé sur l'item de
  -- l'ANCIEN numéro, et sert de détection de changement à `triggerMondaySync`.
  -- Le garder ferait comparer la fiche à l'état d'un autre item : sur une fiche
  -- Complétée dont rien d'autre ne bouge, plus AUCUN push ne partirait, et le
  -- nouvel item resterait vide ; un changement ultérieur ne pousserait que le
  -- champ modifié, laissant les autres manquants pour toujours. Remis à NULL, le
  -- prochain enregistrement repart sur un push COMPLET vers le nouvel item
  -- (branche « déjà Complété mais pas de snapshot » de triggerMondaySync).
  -- L'item Monday lui-même n'est pas touché ici : aucun appel n'est fait.
  --
  -- `nom` vaut sa propre valeur quand la substitution n'a pas eu lieu : le
  -- numéro et le nom ne peuvent donc PAS diverger, il n'existe pas d'état où
  -- l'un serait écrit sans l'autre.
  --
  -- Rien d'autre n'est touché : ni user_id, ni statut, ni la moindre donnée
  -- métier, ni la moindre URL de média.
  UPDATE fiches
  SET logement_numero_bien  = v_nouveau,
      nom                   = v_nom_final,
      loomky_property_id    = NULL,
      loomky_owner_id       = NULL,
      loomky_checklist_ids  = NULL,
      loomky_sync_status    = NULL,
      loomky_synced_at      = NULL,
      loomky_snapshot       = NULL,
      monday_snapshot       = NULL,
      updated_at            = (now() AT TIME ZONE 'utc')
  WHERE id = p_fiche_id;

  -- 6. ÉTAT MONDAY DES ANNONCES.
  -- `statut = 'valide'` veut dire « le document posé sur Monday EST l'annonce
  -- actuelle ». Après renumérotation, ce document est sur l'item de l'ancien
  -- numéro : le badge « Synchronisé sur Monday » mentirait. On retombe sur
  -- `genere`, exactement comme le fait toute mutation d'annonce, ce qui rouvre
  -- le bouton « Valider ». Le CONTENU est conservé (rien n'est régénéré).
  -- `generation_meta.validation` (item Monday et numéro de la validation
  -- précédente) est retiré : trace périmée, donc trompeuse.
  WITH invalidees AS (
    UPDATE agent_outputs
    SET statut          = 'genere',
        generation_meta = coalesce(generation_meta, '{}'::jsonb) - 'validation',
        updated_at      = now()
    WHERE fiche_id = p_fiche_id
      AND statut = 'valide'
    RETURNING 1
  )
  SELECT count(*) INTO v_annonces FROM invalidees;

  RETURN jsonb_build_object(
    'ok', true,
    'ancien_numero', v_ancien,
    'nouveau_numero', v_nouveau,
    'loomky_reinitialise', v_loomky,
    'annonces_invalidees', v_annonces,
    'nom', v_nom_final,
    'nom_modifie', v_nom_modifie
  );
END;
$fn$;

-- ============================================================
-- ORDRE DE DÉPLOIEMENT : FRONT D'ABORD, MIGRATION ENSUITE
-- ============================================================
-- Inverse de la migration du 2026-09-07, et pour une raison précise.
--
-- `mapFormDataToSupabase` envoie `nom` à CHAQUE enregistrement. Le front de
-- cette PR le retire du payload d'UPDATE (`saveFiche`), exactement comme il
-- retire déjà `logement_numero_bien` : sans ça, n'importe quel onglet ouvert
-- avant la renumérotation — pas seulement celui qui l'a lancée — réécrirait
-- l'ancien nom par-dessus celui que cette migration vient de poser, au premier
-- champ modifié. La fiche porterait le nouveau numéro avec l'ancien nom.
--
-- Appliquer le SQL en premier ouvrirait donc une fenêtre où le renommage peut
-- être défait sans que personne ne le voie : le front encore en place continue
-- d'envoyer `nom`. Seul un `super_admin` a l'UPDATE sur `fiches`, mais c'est
-- justement un rôle qui renumérote.
--
-- Dans l'autre sens il ne se passe rien de fâcheux : le front déployé appelle
-- l'ancienne fonction, qui ne rend ni `nom` ni `nom_modifie`. Le nom n'est pas
-- touché, l'état local n'est pas écrasé (le front n'applique un nom que s'il en
-- reçoit un), et l'écran de succès affiche « Le nom de la fiche n'a pas été
-- modifié. Pensez à le vérifier. » — ce qui est exactement vrai.
--
-- Séquence : 1) merge  2) déploiement Vercel  3) cette migration.
