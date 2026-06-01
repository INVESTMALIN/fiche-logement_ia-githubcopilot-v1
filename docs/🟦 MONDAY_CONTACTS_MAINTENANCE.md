# 🟦 Intégration Monday — Contacts de maintenance (CREATE-only)

**Projet** : Fiche Logement
**Feature** : Remontée des contacts maintenance saisis en `FicheAvis` vers le board Monday `5096884596` ("Artisans / Maintenance")
**Status** : 🚧 V1 livrée le 2026-06-01 — en attente du déploiement de l'Edge Function en prod
**Dernière mise à jour** : 2026-06-01

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
- **Dans le scope** : CREATE séquentiel des contacts non encore poussés, à la finalisation initiale et aux saves post-finalisation. Badge UI sur les contacts synchronisés. Toast d'erreur en cas d'échec partiel.
- **Hors scope** (à confirmer si besoin futur) : update d'un item après création, delete d'item, sync bidirectionnelle Monday → fiche, UI de retry manuel.

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
├── services/
│   └── mondayContactsService.js     ← Client : pickContactsToPush + invoke Edge Function
└── components/
    └── FormContext.jsx               ← Hook triggerMondayContactsSync (handleSave + updateStatut)
                                       + état partagé mondayContactsToast
src/pages/
└── FicheAvis.jsx                     ← Saisie + badge sync + mini toast d'erreur

supabase/
└── functions/
    └── monday-contacts-sync/
        ├── index.ts                  ← Edge Function (Deno) : create_item + DB patch par _localId
        └── deno.json

docs/
└── 🟦 MONDAY_CONTACTS_MAINTENANCE.md ← Ce document
```

### Flux complet

```
[FicheFinalisation] User clique "Finaliser"
   → updateStatut('Complété')
      → saveFiche() (commit Supabase normal)
      → triggerMondaySync(...)                  [feature monday-sync existante]
      → triggerMondayContactsSync(savedData)    [NOUVEAU]
         → pickContactsToPush(contacts)
            → filtre : nom_prenom non vide + _localId + pas de monday_item_id
         → si liste vide → skip
         → pushContactsToMonday({ ficheId, contacts })
            → supabase.functions.invoke('monday-contacts-sync', { body })
               → [Edge Function]
                  → vérifie MONDAY_API_TOKEN + SUPABASE_SERVICE_ROLE_KEY
                  → pour chaque contact (séquentiel) :
                     - create_item(board, group, name, columnValues)
                     - lit fiches.avis_contacts_maintenance
                     - patche le contact par _localId, ajoute monday_item_id
                     - UPDATE fiches.avis_contacts_maintenance
                  → return { success, results: [{ _localId, monday_item_id? | error?, message? }] }
            → patch local du state FormContext (monday_item_id par _localId)
            → si au moins un échec : setMondayContactsToast(...)
```

### Idempotence : pourquoi `_localId` ?

L'idempotence demande un identifiant **stable** : si l'utilisateur supprime un contact entre deux saves, l'index dans le tableau bouge. Un tuple `(nom_prenom, telephone, email)` casse dès qu'un champ est édité. Un **UUID front généré à la création** (`crypto.randomUUID()` avec fallback), persisté dans le JSONB sous la clé `_localId`, survit à tout :

- suppressions / réordonnancements
- édits des autres champs
- multi-save successifs sans risque de doublon

Le `_localId` est aussi la **clé de lookup** côté Edge Function pour graver le `monday_item_id` sur le bon contact en DB.

### Garde-fous

- **Fiche pas Complété** → sync ne se déclenche jamais (cohérent avec `monday-sync`).
- **Aucun contact à pousser** (liste vide après filtre) → skip avant l'invoke, aucun appel réseau.
- **Network error / Edge Function down** → toast d'erreur + `console.warn`. Le save Supabase a déjà réussi, la finalisation n'est jamais bloquée.
- **Monday API error sur un contact** → l'item est marqué `error: MONDAY_API_ERROR`, les autres contacts continuent. Le badge n'apparaît pas → signal visuel de retry.
- **DB patch fail après create_item OK** → l'item Monday existe mais la fiche ne le sait pas. **Risque de doublon** au prochain save (le contact sera ré-envoyé). Non couvert par l'idempotence renforcée serveur — celle-ci se base sur le `monday_item_id` en DB, qui est précisément ce que ce scénario échoue à écrire. À surveiller dans les logs Edge Function (`DB_WRITE_ERROR`). Cas rare en pratique (la DB est OK ou pas).
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

Si la création de l'item côté Monday réussit mais que l'UPDATE DB qui suit échoue (perte réseau Supabase, indisponibilité ponctuelle, etc.), l'item Monday existe sans qu'aucun `monday_item_id` ne soit gravé en DB. Au prochain save, le contact sera ré-envoyé et un nouvel item Monday sera créé → doublon sur le board, le premier item devient orphelin.

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

1. **Push initial** (Brouillon → Complété avec 2 contacts saisis) → 2 items créés côté Monday, 2 badges verts côté fiche, monday_item_id gravé en DB.
2. **Push partiel post-finalisation** (fiche Complété, ajout d'un 3e contact) → seul le nouveau contact est poussé (les 2 premiers ont déjà un `monday_item_id`).
3. **Activité vide** → l'item est créé sans colonne Activité, l'équipe la complètera à la main.
4. **Activité legacy / inconnue** → warn console, colonne omise, autres champs poussés normalement.
5. **Téléphone vide / format invalide** → colonne omise (si vide) ou envoyée brute (si présente, à l'équipe de corriger côté Monday).
6. **Network error** → toast d'erreur ("X/Y contacts non remontés"), badge absent, retry au prochain save.
7. **Suppression d'un contact déjà poussé côté fiche** → Monday garde l'item (pas de delete côté code).
8. **Édition d'un contact déjà poussé côté fiche** → Monday garde l'ancienne version (pas d'update côté code).

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
