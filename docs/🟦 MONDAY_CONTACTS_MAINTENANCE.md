# 🟦 Intégration Monday — Contacts de maintenance (CREATE-only)

**Projet** : Fiche Logement
**Feature** : Remontée des contacts maintenance saisis en `FicheAvis` vers le board Monday `5096884596` ("Artisans / Maintenance")
**Status** : V1.1 livrée le 2026-06-02 — déclenchement durci suite à un test en prod (autosave qui poussait des contacts incomplets)
**Dernière mise à jour** : 2026-06-02

---

## 🎯 Vue d'ensemble

### Objectif
Quand un coordinateur finalise une fiche qui contient des contacts maintenance fournis par le propriétaire, **chaque contact devient automatiquement un item dans le board Monday "Artisans / Maintenance"** (référentiel interne géré manuellement par l'équipe une fois le contact remonté).

### Différences avec `monday-sync` (existant)
- **CREATE only** (1 item Monday par contact) au lieu d'**UPDATE** de 4 colonnes statiques.
- **Idempotence par contact** via `_localId` (UUID front persisté en JSONB) + `monday_item_id` gravé après push réussi.
- **Pas de delete, pas d'update** côté Monday. Une fois un contact poussé, Monday devient la source de vérité.
- Edge Function dédiée (`monday-contacts-sync`) avec service role pour patcher la DB elle-même contact par contact.

### Pourquoi pas un appel direct depuis le front ?
Même raison que `monday-sync` : le token Monday est admin-global, on le garde côté serveur (`MONDAY_API_TOKEN` Edge Secret).

### Périmètre
- **Dans le scope** : CREATE séquentiel des contacts non encore poussés, déclenché automatiquement à la transition Brouillon → Complété (finalisation initiale) **uniquement**, ou manuellement via le bouton "Synchroniser" dans `FicheAvis` post-finalisation. Validation des 3 champs requis avant finalisation. Badge UI sur les contacts synchronisés. Toast d'erreur en cas d'échec partiel.
- **Hors scope** (à confirmer si besoin futur) : update d'un item après création, delete d'item, sync bidirectionnelle Monday → fiche.

---

## 🚦 Modèle de déclencheur

Trois états, trois comportements :

| État de la fiche | Sync Monday Contacts |
|---|---|
| **Brouillon** (`statut !== 'Complété'`) | **Aucune sync.** Le coordinateur remplit, modifie, supprime, fait des pauses : la section contacts est complètement muette côté Monday. Aucun appel à l'Edge Function, aucun risque de pousser un contact incomplet. |
| **Transition Brouillon → Complété** (clic "Finaliser la fiche") | **Push automatique groupé** de tous les contacts valides (cf. règle de validation ci-dessous). Filet de sécurité : le coordinateur n'a rien à faire de spécial. Géré dans `FormContext.updateStatut` en fire-and-forget. |
| **Déjà finalisée** (`statut === 'Complété'`) | **Pas d'auto-trigger.** Un bouton "Synchroniser N contacts vers Monday" apparaît dans `FicheAvis` dès qu'au moins un contact est éligible et pas encore poussé. Le coordinateur clique pour pousser. |

### Pourquoi ce découpage ?

Le premier essai V1 (PR #30) déclenchait la sync sur **chaque** save post-finalisation, autosave inclus. L'autosave a un debounce 5s, donc le scénario observé en prod était :
1. Coordinateur ajoute un nouveau contact post-finalisation
2. Tape "Jean Dupont" dans `nom_prenom`, va répondre au téléphone
3. 5s plus tard, autosave → push vers Monday avec uniquement `nom_prenom`
4. Le contact reçoit son `monday_item_id`, CREATE-only → les modifs ultérieures (société, téléphone, activité) **ne seront jamais synchronisées**
5. Résultat sur le board : un item avec juste un nom, et impossible de le compléter automatiquement

La V1.1 sépare donc clairement les deux moments où on a une intention claire de pousser (finalisation = engagement, clic manuel = décision explicite) du moment où le coordinateur est encore en train de saisir.

---

## ✅ Validation des contacts à la finalisation

Si `avis_a_contacts_maintenance === true`, chaque contact dans `avis_contacts_maintenance` doit avoir les **trois champs suivants** renseignés pour permettre la finalisation :

- `nom_prenom` — non vide (trimé)
- `telephone` — **normalisable en E.164** (cf. `isPhoneE164Normalizable` dans `src/lib/phoneHelpers.js`). Pas seulement non vide : un numéro non reconnu (ex: `33699999988` sans `0`/`+`/`00`) deviendrait `''` après normalisation et l'item Monday serait créé sans téléphone, orphelin définitif en CREATE-only. Deux messages d'erreur distincts (vide vs format non reconnu) pour guider la correction.
- `activite` — non vide (trimé)

`email` et `commentaire` restent optionnels.

Implémentation : `SPECIAL_VALIDATIONS.validateContactsMaintenance` dans `src/lib/validationConfig.js`. Les erreurs remontent en section `avis` via `validateRequiredFields` et s'affichent dans le panneau d'erreurs de `FicheFinalisation` (pattern identique aux autres validations spéciales : visite, chambres, salles de bains, etc.).

**Cohérence amont / aval** : `pickContactsToPush` côté `src/services/mondayContactsService.js` applique **exactement la même règle**, y compris la normalisabilité E.164 du téléphone. Conséquence : un contact qui bloque la finalisation est par définition un contact qui ne serait pas pushé (ils sont rejetés au même endroit), et un contact pushable est un contact qui n'aurait pas bloqué la finalisation. Pas de cas bizarre où le filtre laisserait passer un téléphone non normalisable que la validation rejette (ou inversement).

---

## 📞 Normalisation E.164 du téléphone

Avant tout push Monday, le `telephone` de chaque contact est normalisé au format E.164 strict (`+33...` pour les numéros français) via `normalizePhoneE164` (`src/lib/phoneHelpers.js`, helper partagé avec Loomky qui a la même exigence).

Pourquoi : le parser de la colonne `phone` Monday devine le pays sur un numéro brut sans préfixe international et le résultat est **inconsistant** — observé en prod : deux numéros français quasi identiques (`0774710000` vs `0774710002`) affichés avec un drapeau Vietnam pour l'un, un drapeau France pour l'autre. Avec un E.164 strict, Monday lit le pays directement dans le préfixe.

La normalisation se fait **au boundary** côté `pushContactsToMonday` (juste avant l'`invoke`), pas en upstream. Le state React et la base de données conservent la saisie brute du coordinateur (lisible et éditable).

Si la normalisation retourne `''` (saisie tronquée, format non reconnu), il s'agit d'un cas **qui ne peut jamais arriver en pratique** parce que :
- La validation à la finalisation bloque déjà tout contact dont `telephone` n'est pas normalisable E.164 (cf. règle des 3 champs ci-dessus).
- `pickContactsToPush` rejette en plus tout contact dont `telephone` n'est pas normalisable, comme filet de sécurité côté bouton manuel.

Si malgré tout un téléphone vide arrivait à l'Edge Function (bug ou bypass), elle omettrait la colonne `phone` côté Monday (item créé sans téléphone, l'équipe peut compléter à la main). Defense in depth.

---

## 🗂 Mapping fiche → colonnes Monday

| Champ fiche | Colonne Monday | Column ID | Type | Note |
|---|---|---|---|---|
| `nom_prenom` (+ ` - ` + `societe` si présent) | Name (titre) | `name` | text | Format `"Nom Prénom - Société"` ou `"Nom Prénom"` |
| `activite` | Activité | `color_mm3hq80w` | status | Envoyé par **index** (cf. table ci-dessous) |
| `telephone` | Téléphone | `phone_mm3hgx8j` | phone | `countryShortName: 'FR'` par défaut |
| `email` | Email | `email_mm3h5m5a` | email | `{ email, text: email }` |
| `commentaire` | Commentaire | `text_mm3r3k4j` | text | String brute |
| (constant) | Status global | `status` | status | Toujours `index: 0` ("Base de données") |

**Board** : `5096884596` — **Groupe** : `topics` ("Base de données")

### Activité — IDs immuables

| Label | Index envoyé |
|---|---|
| Electricité | 0 |
| Plomberie | 1 |
| Serrurerie | 3 |
| Jardinerie / Paysagisme | 6 |
| Multi-Services / Homme à tout faire | 4 |
| Anti nuisibles | 8 |
| Autres | 7 |

> ⚠️ Les IDs ne sont pas séquentiels — des labels ont été supprimés ou réordonnés côté board. On envoie l'**index** (pas le label) pour être robuste aux renommages futurs côté Monday.

**Comportement si `activite` vide ou inconnue** : on **omet** la colonne `color_mm3hq80w` du payload (Monday la laisse vide, l'équipe peut la corriger à la main). On ne fait pas tomber tout le `create_item` à cause d'un label inconnu.

### Colonnes laissées vides à la création (gérées manuellement par l'équipe)
`text_mm3hxkcf` (Ville), `link_mm3he162` (Site internet), `long_text_mm3h9f9t` (Codes postaux d'intervention), `long_text_mm3hwbmf` (Villes d'intervention), `date_mm3h1z53` (Base de données), `date_mm3htxsf` (A recontacter), `date_mm3hfzkw` (Validé), `date_mm3hhgvn` (Invalidé)

---

## 🏗 Architecture

```
src/
├── lib/
│   ├── phoneHelpers.js              ← normalizePhoneE164 (partagé avec Loomky)
│   └── validationConfig.js          ← SPECIAL_VALIDATIONS.validateContactsMaintenance
├── services/
│   └── mondayContactsService.js     ← Client : pickContactsToPush (filtre 3 champs)
│                                       + pushContactsToMonday (normalise E.164 au boundary)
└── components/
    └── FormContext.jsx               ← _pushContactsCore (factorisé) +
                                       triggerMondayContactsSync (auto, transition only) +
                                       syncContactsToMondayManual (bouton manuel) +
                                       état partagé mondayContactsToast
src/pages/
└── FicheAvis.jsx                     ← Saisie + badge sync + bouton "Synchroniser" +
                                       mini toast d'erreur

supabase/
└── functions/
    └── monday-contacts-sync/
        ├── index.ts                  ← Edge Function (Deno) : create_item + DB patch par _localId
        └── deno.json

docs/
└── 🟦 MONDAY_CONTACTS_MAINTENANCE.md ← Ce document
```

### Flux — Path A : finalisation initiale (Brouillon → Complété)

```
[FicheFinalisation] User clique "Finaliser la fiche"
   → validateRequiredFields(formData)
      → si contacts maintenance incomplets → BLOCAGE finalisation (cf. règle de validation)
   → updateStatut('Complété')
      → saveFiche() (commit Supabase normal)
      → triggerMondaySync(...)                              [feature monday-sync existante]
      → triggerMondayContactsSync(savedData, wasComplete)   [SI !wasComplete UNIQUEMENT]
         → _pushContactsCore(savedData)                     [cœur factorisé]
            → pickContactsToPush(contacts)
               → filtre : nom_prenom + telephone + activite (tous trimés non vides)
                         + _localId présent + pas de monday_item_id
            → si liste vide → skip
            → pushContactsToMonday({ ficheId, contacts })
               → normalise les telephone en E.164 au boundary
               → supabase.functions.invoke('monday-contacts-sync', { body })
                  → [Edge Function]
                     → ownership check (JWT + RLS), pré-CREATE SELECT, etc. cf. plus bas
                     → pour chaque contact : create_item + compare-and-set DB
                  → return { success, results: [...] }
               → patch local du state FormContext (monday_item_id par _localId)
               → si au moins un échec : setMondayContactsToast(...)
```

### Flux — Path B : sync manuelle post-finalisation (bouton "Synchroniser")

```
[FicheAvis] Fiche déjà Complété, user a ajouté/complété un contact
   → bouton "Synchroniser N contacts vers Monday" visible
     (visible ssi statut === 'Complété' ET pickContactsToPush(contacts).length > 0)
   → user clique
      → syncContactsToMondayManual()
         → handleSave() (flush du state vers DB pour que l'Edge Function trouve
                          les contacts par _localId)
         → si save OK → _pushContactsCore(saveResult.data)  [même cœur que Path A]
         → si save KO → retour erreur, pas de push
```

### Idempotence : pourquoi `_localId` ?

L'idempotence demande un identifiant **stable** : si l'utilisateur supprime un contact entre deux saves, l'index dans le tableau bouge. Un tuple `(nom_prenom, telephone, email)` casse dès qu'un champ est édité. Un **UUID front généré à la création** (`crypto.randomUUID()` avec fallback), persisté dans le JSONB sous la clé `_localId`, survit à tout :

- suppressions / réordonnancements
- édits des autres champs
- multi-save successifs sans risque de doublon

Le `_localId` est aussi la **clé de lookup** côté Edge Function pour graver le `monday_item_id` sur le bon contact en DB.

### Garde-fous

- **Fiche en brouillon** → AUCUN appel à l'Edge Function, ni auto, ni manuel (le bouton "Synchroniser" est caché). La sync ne démarre qu'à partir de la finalisation initiale.
- **Auto-trigger limité à la transition** → un save post-finalisation (auto ou manuel) ne re-déclenche pas le push automatiquement. Garde-fou explicite ajouté en V1.1 pour éviter le scénario "autosave pousse un contact incomplet" observé en prod.
- **Aucun contact à pousser** (liste vide après filtre 3 champs + idempotence) → skip avant l'invoke, aucun appel réseau. Côté FicheAvis, le bouton "Synchroniser" est caché.
- **Network error / Edge Function down** → toast d'erreur + `console.warn`. Le save Supabase a déjà réussi, la finalisation n'est jamais bloquée.
- **Monday API error sur un contact** → l'item est marqué `error: MONDAY_API_ERROR`, les autres contacts continuent. Le badge n'apparaît pas → signal visuel de retry.
- **DB patch fail après create_item OK** → l'item Monday existe mais la fiche ne le sait pas. **Risque de doublon** au prochain push manuel (le contact sera ré-envoyé via le bouton "Synchroniser"). Non couvert par l'idempotence renforcée serveur — celle-ci se base sur le `monday_item_id` en DB, qui est précisément ce que ce scénario échoue à écrire. À surveiller dans les logs Edge Function (`DB_WRITE_ERROR`). Cas rare en pratique (la DB est OK ou pas).
- **Contact supprimé entre l'invoke et le DB patch** → `findIndex(_localId) === -1` → l'item Monday est créé mais reste **orphelin** côté Monday (pas de monday_item_id côté fiche). Pas de mécanisme de cleanup côté code (CREATE only). L'équipe peut le supprimer à la main côté board.

### Sécurité — ownership check côté Edge Function

Le `ficheId` arrive dans le payload front. Sans vérification, un utilisateur authentifié pourrait passer le `ficheId` d'un autre utilisateur et faire pousser des items Monday sur sa fiche (l'Edge Function écrit en DB via service role qui bypass RLS). On vérifie donc avant tout CREATE Monday et toute écriture DB que le caller a le droit de lire cette fiche :

1. Lecture du `Authorization` header (le JS client Supabase y attache automatiquement le JWT du user connecté).
2. Création d'un client Supabase signé avec ce JWT + la clé `SUPABASE_ANON_KEY`.
3. `SELECT id FROM fiches WHERE id = ficheId` sous RLS.
4. Si la requête renvoie 0 ligne (fiche inexistante OU non accessible au caller) → `403 FORBIDDEN`, aucun call Monday, aucune écriture DB.

L'ownership s'appuie 100 % sur les policies RLS existantes (`coordinateur_own_fiches`, `super_admin_all_fiches`). Un super_admin peut donc pousser sur n'importe quelle fiche, ce qui est cohérent avec ses droits d'édition existants. Le client service-role n'est utilisé qu'après le check, uniquement pour les UPDATE de `monday_item_id`.

### Idempotence renforcée côté serveur (anti-doublon Monday)

Le payload front peut être obsolète lors de saves concurrents : entre le moment où le state React lit `contacts_maintenance` et celui où l'Edge Function le reçoit, une autre invocation peut avoir déjà poussé certains contacts vers Monday. Sans protection serveur, on créerait des doublons d'items sur le board.

L'Edge Function fait donc **deux contrôles serveur**, la DB étant l'état de vérité :

1. **Pré-CREATE SELECT** : avant chaque `create_item`, on relit `avis_contacts_maintenance` et on cherche le contact par `_localId`. S'il a déjà un `monday_item_id` (gravé par une invocation concurrente déjà terminée), on **skip** le `create_item` et on retourne cet ID au front comme succès. Aucun nouvel item Monday n'est créé.

2. **Compare-and-set côté UPDATE DB** : `patchMondayItemIdInDB` re-lit la fiche juste avant l'écriture. Si une invocation concurrente a gagné la course entre notre SELECT et notre UPDATE (les deux SELECT ont vu "vide", les deux ont créé un item Monday, on est le second à arriver au UPDATE), on **n'écrase pas** le `monday_item_id` officiel. On retourne celui qui est en DB comme ID effectif, et l'item qu'on vient de créer côté Monday devient orphelin sur le board (warn loggué pour monitoring). Sémantique **"first writer wins"** déterministe.

Cette double protection ferme la quasi-totalité des fenêtres de race. Reste un cas résiduel où deux invocations seraient strictement simultanées sur l'appel HTTP Monday lui-même → 1 orphelin sur le board, signalé par un log `RACE detected` dans les Edge Function logs.

### Trade-offs assumés en V1

Deux risques résiduels connus sont assumés pour V1, justifiés par le contexte de production : 5 à 10 fiches finalisées par jour, moins de 10 coordinateurs actifs.

**1. `DB_WRITE_ERROR` après `create_item` OK**

Si la création de l'item côté Monday réussit mais que l'UPDATE DB qui suit échoue (perte réseau Supabase, indisponibilité ponctuelle, etc.), l'item Monday existe sans qu'aucun `monday_item_id` ne soit gravé en DB. Au prochain push manuel (bouton "Synchroniser"), le contact sera ré-envoyé et un nouvel item Monday sera créé → doublon sur le board, le premier item devient orphelin.

Non couvert par l'idempotence renforcée serveur, par construction : c'est précisément le `monday_item_id` en DB qui sert de clé d'idempotence, et c'est ce que ce scénario échoue à écrire. Détectable côté Edge Function logs (`DB_WRITE_ERROR`).

**2. TOCTOU strictement simultané sur le compare-and-set**

Le compare-and-set côté `patchMondayItemIdInDB` n'est pas atomique au niveau Postgres : il fait un `SELECT` puis un `UPDATE` côté Node, sans transaction qui couvre le call HTTP Monday entre les deux. Deux invocations qui interleavent leur read et leur write au niveau Postgres peuvent toutes les deux passer le check applicatif (les deux reads voient `monday_item_id` absent) et finir par créer un doublon Monday avant que l'une n'écrive son ID en écrasant l'autre.

La mitigation actuelle (`RACE detected` log) couvre uniquement le sous-cas **read-after-commit** : la seconde invocation lit après que la première a déjà committé, voit le `monday_item_id` existant, et refuse d'écraser. Le sous-cas **read-before-commit des deux côtés** reste résiduel : aucun warn ne se déclenche, last writer wins en DB, 1 item Monday devient orphelin.

**Justification de l'acceptation V1**

Le scénario demande deux invocations strictement simultanées de l'Edge Function sur la même fiche, avec des contacts non encore synchronisés des deux côtés, et un interleave Postgres au caractère près. Probabilité négligeable au volume actuel.

**Follow-up identifié si on observe des doublons en prod** : ajouter une RPC Postgres qui fait le compare-and-set atomique sur le JSONB (`UPDATE ... WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(...) WHERE _localId = $1 AND monday_item_id IS NOT NULL) RETURNING ...`). L'Edge Function passerait par cette RPC plutôt que par un SELECT + UPDATE séparés. Coût d'implémentation faible mais inutile tant qu'aucun pattern de doublon n'est observé.

### Backfill `_localId` pour contacts pré-PR-30

Les contacts saisis via la PR #29 (saisie initiale, avant cette PR) ne portent pas de `_localId`. Sans backfill, ils seraient skippés à vie par `pickContactsToPush` (qui exige un `_localId` non vide pour l'idempotence).

On backfille dans `mapSupabaseToFormData` (chemin obligatoire au load et au retour de `saveFiche`) : tout contact sans `_localId` en reçoit un (UUID front, ou fallback `c-<base36>-<random>` sinon). Le `_localId` est ensuite persisté en DB au premier save (passthrough via `mapFormDataToSupabase`).

Conséquence pratique : la première fois qu'une fiche existante est ouverte puis sauvegardée (manuellement, par l'auto-save sur édition, ou par la finalisation), ses contacts pré-PR-30 deviennent éligibles à la sync Monday. Si le user ne touche pas à la fiche, le `_localId` est régénéré à chaque load → mais comme aucun save n'a lieu et aucun push non plus, ce n'est pas un problème d'idempotence.

Backfill aussi appliqué défensivement dans `mapFormDataToSupabase` (au cas où un chemin contournerait `mapSupabaseToFormData`).

---

## 🗄 Base de données

### Aucune migration SQL n'a été ajoutée pour ce lot

Le stockage existant (colonne JSONB `fiches.avis_contacts_maintenance`, ajoutée dans la PR Phase 1 [#29](https://github.com/Letahost/fiche-logement_ia-githubcopilot-v1/pull/29) — migration `docs/migrations/2026-05-27_avis_contacts_maintenance.sql`) accueille les deux nouveaux champs techniques :

- `_localId` (string, UUID) — généré à la création du contact côté front
- `monday_item_id` (string) — gravé par l'Edge Function après push réussi

### Shape d'un contact (étendue)

```json
{
  "_localId": "550e8400-e29b-41d4-a716-446655440000",
  "nom_prenom": "Jean Dupont",
  "societe": "Plomberie Express",
  "activite": "Plomberie",
  "telephone": "+33 6 12 34 56 78",
  "email": "jean@example.com",
  "commentaire": "Dispo 24/7",
  "monday_item_id": "9876543210"
}
```

Les deux derniers champs sont absents tant que le contact n'a pas été poussé. `mapFormDataToSupabase` / `mapSupabaseToFormData` traversent le tableau sans transformation, donc rien à toucher côté `supabaseHelpers.js`.

---

## 🔐 Secrets & déploiement

### Setup initial

Le secret `MONDAY_API_TOKEN` est déjà en place (utilisé par `monday-sync`). Les autres secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` — ce dernier requis pour le client RLS de l'ownership check) sont automatiquement injectés par Supabase dans les Edge Functions.

### Déploiement de l'Edge Function

```bash
npx supabase functions deploy monday-contacts-sync
```

Aucune migration SQL à appliquer (cf. plus haut).

### Mise à jour du token

```bash
npx supabase secrets set MONDAY_API_TOKEN=NEW_TOKEN
# Pas de redeploy nécessaire — le secret est lu à chaque invocation
```

---

## 🧪 Tests

### Mode dry-run

```js
import { pushContactsToMonday } from './services/mondayContactsService'

await pushContactsToMonday({
  ficheId: '...',
  contacts: [
    { _localId: 'test-1', nom_prenom: 'Jean Dupont', societe: 'Plomberie Express', activite: 'Plomberie' }
  ],
  dryRun: true
})
```

L'Edge Function log le `itemName` et le `columnValues` qu'elle aurait envoyés, retourne `{ success: true, results: [{ _localId: 'test-1', monday_item_id: 'DRY_RUN' }], dryRun: true }`. Aucun call Monday, aucune écriture DB.

Logs : `npx supabase functions logs monday-contacts-sync`

### Scénarios à valider

**Modèle de déclencheur (V1.1)**

1. **Brouillon, 1 contact rempli partiellement** → autosave 5s déclenché, AUCUN appel à `monday-contacts-sync` (vérifier dans les Network DevTools). Aucun item Monday créé.
2. **Brouillon → tentative de finaliser avec contact incomplet** (nom_prenom OK, telephone OU activite manquant) → blocage de la finalisation avec message d'erreur dans le panneau de `FicheFinalisation` ("Contact maintenance #N : le téléphone/l'activité est obligatoire").
3. **Brouillon → finalisation avec 2 contacts valides** → push automatique groupé, 2 items créés côté Monday, 2 badges verts côté fiche.
4. **Fiche déjà Complété, ajout d'un 3e contact valide** → bouton "Synchroniser 1 contact vers Monday" apparaît. Aucun push tant que le coordinateur n'a pas cliqué (même si l'autosave passe par là).
5. **Clic sur "Synchroniser"** → fiche sauvée d'abord (saveStatus → "Sauvegarde en cours..."), puis push, badge sur le nouveau contact, bouton se cache.
6. **Fiche déjà Complété, ajout d'un contact incomplet** → bouton "Synchroniser" caché tant que les 3 champs ne sont pas tous remplis. Pas de blocage côté UX (le contact est juste pas pushable).

**Normalisation E.164**

7. **Téléphone `0699999988` saisi** → envoyé en `+33699999988` à Monday, drapeau France propre dans le board.
8. **Téléphone `+33 6 99 99 99 88` saisi** → cleanup des séparateurs, envoyé en `+33699999988`. Idem.
9. **Téléphone `0033699999988` saisi** → `+33699999988`. Idem.
10. **Téléphone tronqué `06 99`** → `normalizePhoneE164` retourne `''`, donc `isPhoneE164Normalizable` retourne `false`. À la finalisation : message d'erreur "le téléphone n'est pas dans un format reconnu" + finalisation bloquée. Post-finalisation : `pickContactsToPush` exclut le contact (bouton "Synchroniser" caché ou count à jour). Ne devrait donc jamais arriver à l'Edge Function.
10bis. **Téléphone `33699999988` sans préfixe `0`/`+`/`00`** → idem cas 10. Pris en charge par la même règle "normalisable E.164" — c'est ce qui a déclenché ce correctif.

**Cas Monday API**

11. **Activité legacy / inconnue** (modification de la liste côté Monday) → warn console côté Edge Function, colonne omise, autres champs poussés normalement.
12. **Network error** → toast d'erreur ("X/Y contacts non remontés"), badge absent, retry possible via le bouton "Synchroniser" (visible car contacts toujours pushable).
13. **Suppression d'un contact déjà poussé côté fiche** → Monday garde l'item (CREATE only, pas de delete côté code).
14. **Édition d'un contact déjà poussé côté fiche** → Monday garde l'ancienne version (CREATE only, pas d'update côté code). Le badge reste affiché sur le contact côté fiche.

**Idempotence**

15. **Double-clic rapide sur "Synchroniser"** → le bouton est désactivé pendant l'aller-retour (état `isSyncingContacts`). Pas de double push.
16. **Push partiel** (fiche avec contacts déjà poussés + nouveaux contacts) → seuls les nouveaux passent le filtre, les anciens ont déjà un `monday_item_id`.

---

## 📡 Référence Monday API

**Mutation `create_item`** :

```graphql
mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
  create_item(
    board_id: $boardId,
    group_id: $groupId,
    item_name: $itemName,
    column_values: $columnValues,
    create_labels_if_missing: false
  ) { id }
}
```

`column_values` est une **chaîne JSON**. Exemple :

```json
{
  "status":           { "index": 0 },
  "color_mm3hq80w":   { "index": 1 },
  "phone_mm3hgx8j":   { "phone": "+33 6 12 34 56 78", "countryShortName": "FR" },
  "email_mm3h5m5a":   { "email": "jean@example.com", "text": "jean@example.com" },
  "text_mm3r3k4j":    "Dispo 24/7"
}
```

`create_labels_if_missing: false` → on refuse explicitement la création de labels Monday inconnus (sécurité : on ne veut pas qu'un label de fiche dérive et soit créé côté board sans validation).

---

## 🔄 Évolutions possibles (V2+)

- Update d'un item Monday après création (pour propager les édits côté fiche).
- Delete côté Monday quand un contact est supprimé côté fiche (briser la divergence).
- Bouton "Force resync Monday" dans FicheFinalisation pour retry manuel après échec.
- Toast global au niveau du layout (au lieu de local FicheAvis) pour que l'erreur soit visible depuis FicheFinalisation.
- Batch via `create_items_batch` si le volume grandit (sacrifie l'atomicité par contact mais réduit la latence).

---

**Fin du document** — Maintenu à jour à chaque évolution de l'intégration Monday Contacts Maintenance.
