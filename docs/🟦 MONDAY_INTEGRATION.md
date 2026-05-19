# 🟦 Intégration Monday — Sync automatique 4 champs

**Projet** : Fiche Logement
**Feature** : Synchronisation automatique de 4 champs Fiche Logement → Monday board `1272144935` (Clients propriétaires > Clients)
**Status** : 🚧 V1 livrée le 2026-05-15 — en attente du token et de la désactivation du scénario Kevin pour activation prod
**Dernière mise à jour** : 2026-05-19

---

## 🎯 Vue d'ensemble

### Objectif
Remonter automatiquement vers Monday 4 champs remplis dans la Fiche Logement, à la finalisation initiale et à chaque modification post-finalisation. Premier usage d'**Edge Functions Supabase** dans le projet — pose les conventions pour les futures intégrations qui auraient besoin d'un secret côté serveur.

### Pourquoi pas un appel direct depuis le front ?
Le token Monday est admin-global → l'inliner dans le bundle Vite (préfixe `VITE_*`) l'exposerait à quiconque inspecte le JS de prod. C'est exactement le problème qu'on vient de corriger avec `VITE_LOOMKY_TOKEN` (commit `58fddff`). On passe donc par une Edge Function : token stocké comme **Edge Secret**, jamais visible côté client.

### Périmètre
- **Dans le scope** : push 4 champs (statut Premiers Ménages + statut Maintenance + 2 mots de passe), trigger automatique au save, dirty-detection via snapshot.
- **Hors scope** : retry asynchrone, audit log.

> **Note (2026-05-19)** : `type_premiere_maintenance` était initialement hors scope. Ajouté à la sync suite à la validation par Victoria de 3 labels métier dédiés (`Intervention propriétaire`, `Intervention artisan`, `Pas d'intervention`) — cf. `TYPES_MAINTENANCE` dans [src/lib/avisGrilleHelpers.js](../src/lib/avisGrilleHelpers.js).

---

## 🗂 Champs synchronisés

| Champ source (DB) | Colonne Monday (label) | Type | Column ID |
|---|---|---|---|
| `avis_type_premier_menage` | Premiers Ménages | status | `statut47` |
| `avis_type_premiere_maintenance` | Maintenance | status | `color_mm3ftnef` |
| `airbnb_mot_passe` | MDP Airbnb Propriétaire | text | `text_mm2q5tw8` |
| `booking_mot_passe` | MDP Booking Propriétaire | text | `text_mm2qaz6a` |

**Lookup** : par colonne `num_ro` (type `numbers`) du board `1272144935`, valeur source = `section_logement.numero_bien`. API utilisée : `items_page_by_column_values`.

**Normalisation `type_premier_menage`** : front stocke `'Vérification / Inventaire'` (avec espaces autour du slash, cf. `TYPES_PASSAGE` dans [src/lib/avisGrilleHelpers.js](../src/lib/avisGrilleHelpers.js)), Monday attend `'Vérification/Inventaire'`. Strip ` / ` → `/` côté Edge Function (`normalizeTypePremierMenage`).

**Normalisation `type_premiere_maintenance`** : les 3 labels `TYPES_MAINTENANCE` sont alignés sur ceux de la colonne Monday `color_mm3ftnef` → valeur envoyée telle quelle, aucune normalisation. Si un mismatch de label apparaît au test E2E (apostrophe typographique `'` vs droite `'`), ajouter une normalisation dédiée côté Edge Function sur le modèle de `normalizeTypePremierMenage`.

**Whitelist guard `type_premiere_maintenance`** : `buildColumnValues` ne pousse la colonne `color_mm3ftnef` que si la valeur est `null` (vidage intentionnel) ou un des 3 labels `VALID_MAINTENANCE_LABELS`. Une valeur legacy (ancien label `TYPES_PASSAGE` écrit par l'UI Maintenance pré-refonte 14/05) est **omise** — sinon Monday rejette tout le `change_multiple_column_values` (mutation atomique) et les autres champs cessent de se synchroniser. Cleanup DB des valeurs legacy : [migration 2026-05-19](migrations/2026-05-19_cleanup_legacy_maintenance.sql).

---

## 🏗 Architecture

```
src/
├── services/
│   └── mondayService.js         ← Client : extract/diff snapshot + invoke Edge Function
└── components/
    └── FormContext.jsx           ← Hook post-save dans handleSave + updateStatut

supabase/
├── config.toml                   ← Init CLI (premier usage projet)
└── functions/
    └── monday-sync/
        ├── index.ts              ← Edge Function (Deno) : lookup + update Monday
        └── deno.json

docs/
├── migrations/
│   └── 2026-05-15_monday_snapshot_column.sql  ← ALTER TABLE add column
└── 🟦 MONDAY_INTEGRATION.md      ← Ce document
```

### Flux complet

```
[FicheFinalisation] User clique "Finaliser"
   → handleSave() puis finaliserFiche() → updateStatut('Complété')
      → saveFiche() (commit Supabase normal)
      → triggerMondaySync(savedData, wasCompleteBeforeSave)
         → extractMondaySnapshot(savedData)
         → diff vs savedData.monday_snapshot
         → si shouldPush :
            → pushToMonday() → supabase.functions.invoke('monday-sync')
               → [Edge Function]
                  → Vérifie MONDAY_API_TOKEN (secret)
                  → items_page_by_column_values(board, num_ro=numeroBien)
                  → change_multiple_column_values(item_id, columnValues)
                  → return {success, itemId, updatedColumns}
            → si success : UPDATE fiches.monday_snapshot = newSnapshot
```

### Logique de déclenchement (alignée sur `notify_fiche_alerts`)

```
isComplete = (statut === 'Complété')
wasComplete = (statut avant save === 'Complété')

SI !isComplete                      → skip (rien à pousser)
SINON SI !wasComplete               → push complet (finalisation initiale)
SINON SI savedSnapshot existe       → diff → push partiel si changement
SINON                               → push complet (cas edge : Complété sans snapshot, fiche pré-feature)
```

### Garde-fous

- **`numero_bien` invalide** : skip silencieux + warn console (le save Supabase a réussi, l'utilisateur n'est pas bloqué).
- **Item Monday non trouvé** : Edge Function retourne `ITEM_NOT_FOUND`, le snapshot **n'est PAS mis à jour** → retry naturel au prochain save.
- **Monday API down / network error** : `pushToMonday` ne throw jamais, retourne `{success: false, error: 'NETWORK', ...}`. Snapshot non mis à jour → retry naturel.
- **Monday API erreur GraphQL** : `MONDAY_API_ERROR` retourné. Snapshot non mis à jour.
- **Aucun champ à push** (tous null) : `NO_FIELDS_TO_UPDATE`, sortie immédiate sans appel Monday.
- **Token serveur manquant** : `UNAUTHORIZED` retourné, log côté Edge Function.

---

## 🗄 Base de données

**Nouvelle colonne** dans `fiches` (cf. [migration 2026-05-15](migrations/2026-05-15_monday_snapshot_column.sql)) :

```sql
monday_snapshot  JSONB  -- nullable, default NULL
```

Format :
```json
{
  "type_premier_menage":       "Vérification / Inventaire" | null,
  "type_premiere_maintenance": "Intervention artisan" | null,
  "airbnb_mot_passe":          "..." | null,
  "booking_mot_passe":         "..." | null
}
```

**Pourquoi minimal+** (1 seule colonne au lieu du pattern Loomky à 5 colonnes) : pas besoin de cache `monday_item_id` (lookup rapide via `num_ro`), pas besoin de `sync_status`/`synced_at` (pas de SLA, l'erreur passe par toast UI). Snapshot suffit pour la dirty-detection.

**⚠️ Anti-race condition** : `monday_snapshot` n'est PAS dans `mapFormDataToSupabase`. Mis à jour SEULEMENT après push réussi via un `supabase.from('fiches').update({ monday_snapshot })` direct dans le hook. Sinon un save normal pré-sync écraserait le snapshot avec la version qui n'a pas encore été poussée.

---

## 🔐 Secrets & déploiement

### Setup initial (à faire une fois)

```bash
# CLI Supabase déjà initialisé via `supabase init` (commit chore(supabase): init CLI)
# Lien vers le projet
npx supabase link --project-ref qwjgkqxemnpvlhwxexht

# Token Monday (admin-global) — ne JAMAIS le commit
npx supabase secrets set MONDAY_API_TOKEN=eyJ...

# Migration SQL
# → coller docs/migrations/2026-05-15_monday_snapshot_column.sql dans le SQL Editor du dashboard
```

### Déploiement de l'Edge Function

```bash
npx supabase functions deploy monday-sync
```

L'Edge Function est ensuite invoquable depuis le client via `supabase.functions.invoke('monday-sync', { body })`. Auth automatique via le JWT Supabase de l'utilisateur connecté.

### Mise à jour du secret

```bash
npx supabase secrets set MONDAY_API_TOKEN=NEW_TOKEN
# Pas de redeploy nécessaire, le secret est lu à chaque invocation
```

---

## 🧪 Tests

### Mode dry-run

Pour tester sans rien pousser à Monday, le client peut passer `dryRun: true` :

```js
import { pushToMonday, extractMondaySnapshot } from './services/mondayService'

await pushToMonday({
  ficheId: '...',
  numeroBien: 12345,
  snapshot: extractMondaySnapshot(formData),
  dryRun: true
})
```

L'Edge Function loggue le payload `columnValuesToSend` qu'elle aurait envoyé et retourne `{success: true, itemId: 'DRY_RUN', updatedColumns, dryRun: true}`. Aucun call Monday.

Logs : `npx supabase functions logs monday-sync` (ou Dashboard → Functions → monday-sync → Logs).

### Scénarios à valider

1. **Dry-run** sur fiche test → log payload, aucune écriture Monday
2. **Push initial** (Brouillon → Complété, numero_bien connu) → 4 colonnes mises à jour côté Monday, normalisation `Vérification/Inventaire` correcte
2bis. **Maintenance** : sélection d'un des 3 labels `TYPES_MAINTENANCE` → colonne `color_mm3ftnef` mise à jour ; vérifier qu'aucun mismatch de label (apostrophe) ne fait échouer le push
3. **Push partiel** (modif `type_premier_menage` sur fiche déjà Complété) → seule la colonne status est touchée
4. **ITEM_NOT_FOUND** (numero_bien inexistant dans Monday) → save Supabase OK, snapshot DB pas mis à jour, warn console
5. **Concurrence** : confirmer désactivation du scénario Kevin avant activation prod

---

## ⚠️ Concurrence — Kevin (Make/n8n)

Avant cette intégration, les 3 colonnes Monday étaient alimentées par un scénario externe géré par Kevin. **Une fois cette feature déployée et validée**, demander à Kevin de désactiver ses écritures dans :
- `statut47` (Premiers Ménages)
- `text_mm2q5tw8` (MDP Airbnb)
- `text_mm2qaz6a` (MDP Booking)

Sinon on aura des écritures concurrentes (le dernier qui passe gagne, comportement non déterministe).

---

## 📡 Référence Monday API

**GraphQL endpoint** : `https://api.monday.com/v2`
**Header version** : `API-Version: 2024-01`
**Auth** : `Authorization: <token>` (sans `Bearer` pour Monday)

### Lookup item par column value

```graphql
query ($boardId: ID!, $columnId: String!, $value: String!) {
  items_page_by_column_values(
    board_id: $boardId,
    columns: [{ column_id: $columnId, column_values: [$value] }]
  ) {
    items { id name }
  }
}
```

### Update multi-colonnes

```graphql
mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
  change_multiple_column_values(
    board_id: $boardId,
    item_id: $itemId,
    column_values: $columnValues
  ) { id }
}
```

`columnValues` est une **chaîne JSON** (pas un objet) :
```json
{
  "statut47":         { "label": "Classique" },
  "color_mm3ftnef":   { "label": "Intervention artisan" },
  "text_mm2q5tw8":    "password_airbnb",
  "text_mm2qaz6a":    "password_booking"
}
```

### Erreurs courantes

| Code | Cas | Reaction Edge Function |
|---|---|---|
| `errors[].extensions.code = 'InvalidColumnIdException'` | column_id inconnu | Bug config, à corriger |
| 0 items dans `items_page_by_column_values` | `numero_bien` n'existe pas dans le board | `ITEM_NOT_FOUND` (404) |
| `errors[].extensions.code = 'ColumnValueException'` | Format de valeur invalide (ex: label inconnu pour status) | `MONDAY_API_ERROR` (502) |
| HTTP 429 | Rate limit | Pas géré en V1 — à monitorer |

---

## 🔄 Évolutions possibles (V2+)

- Cache `monday_item_id` en DB pour éviter le lookup à chaque sync (V1 = re-lookup à chaque fois, simple et rapide)
- Retry exponentiel côté front si NETWORK error
- Système de toast unifié pour les feedbacks Monday sync (V1 = console.warn uniquement)
- Bouton "Force resync Monday" dans FicheFinalisation pour retry manuel après échec
- Webhook bidirectionnel Monday → Fiche Logement (sync inverse)

---

**Fin du document** — Maintenu à jour à chaque évolution de l'intégration Monday.
