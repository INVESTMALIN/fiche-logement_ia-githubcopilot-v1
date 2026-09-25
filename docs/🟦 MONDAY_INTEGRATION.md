# 🟦 Intégration Monday — Sync automatique 7 champs

**Projet** : Fiche Logement
**Feature** : Synchronisation automatique de 7 champs Fiche Logement → Monday board `1272144935` (Clients propriétaires > Clients)
**Status** : ✅ En production depuis mai 2026 — robustesse par champ livrée le 2026-09-16 (écritures indépendantes, statuts par index, snapshot fusionné côté serveur, bilan à l'écran) — identifiants Airbnb / Booking et « BAC secours » ajoutés le 2026-09-25
**Dernière mise à jour** : 2026-09-25

---

## 🎯 Vue d'ensemble

### Objectif
Remonter automatiquement vers Monday 7 champs remplis dans la Fiche Logement, à la finalisation initiale et à chaque modification post-finalisation. Premier usage d'**Edge Functions Supabase** dans le projet — pose les conventions pour les futures intégrations qui auraient besoin d'un secret côté serveur.

### Pourquoi pas un appel direct depuis le front ?
Le token Monday est admin-global → l'inliner dans le bundle Vite (préfixe `VITE_*`) l'exposerait à quiconque inspecte le JS de prod. C'est exactement le problème qu'on vient de corriger avec `VITE_LOOMKY_TOKEN` (commit `58fddff`). On passe donc par une Edge Function : token stocké comme **Edge Secret**, jamais visible côté client.

### Périmètre
- **Dans le scope** : push 7 champs (statut Premiers Ménages + statut Maintenance + 2 identifiants + 2 mots de passe + type de la boîte à clés de secours), trigger automatique au save, dirty-detection via snapshot.
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
| `airbnb_email` | Identifiant Airbnb Propriétaire | text | `text_mm2qs0eh` |
| `booking_email` | Identifiant Booking Propriétaire | text | `text_mm2qg8ar` |
| `clefs_secours` + `clefs_secours_type` → `bac_secours` | BAC secours | status | `color_mm7hfdn5` |

> **Identifiants (2026-09-25)** : ces deux colonnes n'étaient écrites par aucune automatisation — elles étaient remplies à la main, une fois sur deux. Or les automatisations Monday qui composent l'email de bienvenue au propriétaire les **lisent** : colonne vide = email client incomplet. Elles suivent exactement le modèle des mots de passe (valeur de la base envoyée telle quelle, vide compris : la base fait foi). Les snapshots antérieurs n'ont pas ces deux clés → la prochaine sauvegarde de chaque fiche Complété les pousse : c'est voulu. Rattrapage de l'existant (cellules Monday vides uniquement) : script one-shot séparé.
>
> **Champ non fourni ≠ champ vide** : l'Edge Function ne pousse jamais un champ dont la clé est absente de la requête. Un onglet resté sur un front antérieur n'envoie que les 4 champs historiques ; traiter les identifiants absents comme vides viderait les colonnes Monday.

> **BAC secours (2026-09-25)** : colonne status créée le 25/09, juste après « Boîte à clé ». Valeur dérivée côté front (`valeurMondayBacSecours`, `src/lib/clefsSecours.js`) : `TTlock` (index 0) ou `Masterlock` (index 1) si la fiche répond « oui » à la boîte à clés de secours, vide (`{}`) si elle répond « non ». **Question jamais répondue (toutes les fiches antérieures au champ) → clé `bac_secours` omise du snapshot envoyé, donc champ non fourni, jamais poussé** : l'équipe peut renseigner la colonne à la main pour ces biens sans qu'une sauvegarde l'efface. Index lus dans `settings_str` le 25/09 (`BAC_SECOURS_INDEX`). La colonne « Boîte à clé » de la boîte **principale** reste remplie **à la main** par les coordinateurs : aucun code n'y touche. Aucun rattrapage (champ nouveau).

**Lookup** : par colonne `num_ro` (type `numbers`) du board `1272144935`, valeur source = `section_logement.numero_bien`. API utilisée : `items_page_by_column_values`.

### Statuts : envoyés par **index**, pas par libellé (depuis 2026-09-16)

Les deux colonnes status reçoivent `{ "index": N }`, où N est l'**identifiant de label** Monday (clé de `settings_str.labels`, stable même si le label est renommé ou réordonné). Tables dans [supabase/functions/monday-sync/sync.ts](../supabase/functions/monday-sync/sync.ts) (`PREMIER_MENAGE_INDEX`, `MAINTENANCE_INDEX`), lues le 2026-09-16 :

| `statut47` (Premiers Ménages) | | `color_mm3ftnef` (Maintenance) | |
|---|---|---|---|
| Classique | 1 | Intervention propriétaire | 0 |
| Pas nécessaire | 2 | Pas d'intervention | 1 |
| Remise en état | 3 | Intervention artisan | 2 |
| Vérification / Inventaire | 4 | | |
| Approfondi | 6 | | |
| Fait par Proprio | 7 | | |

(Monday connaît aussi `0 À voir` et `5 À définir`, que la fiche ne produit jamais.)

**Pourquoi l'index.** La panne de septembre 2026 : le label Monday `Vérification/Inventaire` a été renommé en `Vérification/Inventaire/Dépôt consommables/Autres`. L'ancienne fonction envoyait le libellé → Monday refusait → comme les 4 champs partaient dans une seule mutation atomique, **les mots de passe tombaient avec le statut**, sans aucun retour à l'écran (17 fiches jamais synchronisées). L'identifiant `4`, lui, n'a pas bougé.

**Risque résiduel accepté.** Si la colonne est reconstruite côté Monday, les identifiants peuvent changer et un index faux écrirait **la mauvaise valeur sans erreur**. D'où : relire `settings_str` des deux colonnes (query `boards { columns(ids:[…]) { settings_str } }`) avant tout merge qui touche à ces tables, et à chaque changement de configuration signalé côté Monday.

**Valeur non reconnue** (ex. ancien label `TYPES_PASSAGE` dans `avis_type_premiere_maintenance`, fiches pré-refonte 14/05) : le champ est **ignoré** (`status: 'skipped'`, `reason: 'VALEUR_NON_RECONNUE'`) — jamais envoyé, jamais marqué synchronisé, nommé dans le bilan à l'écran avec « re-sélectionnez une valeur ». Le même avertissement n'est pas répété à chaque autosave tant que la valeur fautive n'a pas changé. Cleanup DB historique : [migration 2026-05-19](migrations/2026-05-19_cleanup_legacy_maintenance.sql).

**Vidage** : `null`/vide côté fiche → `{}` pour une colonne status, `""` pour une colonne text. On envoie toujours une valeur pour un champ demandé, sinon un effacement côté fiche ne se propagerait jamais.

---

## 🏗 Architecture

```
src/
├── services/
│   └── mondayService.js          ← Client : extract snapshot + pré-diff + invoke Edge Function
├── lib/
│   └── mondaySyncFeedback.js     ← Réponse Edge → bilan affichable (champs nommés, jamais de valeur) + dédoublonnage
└── components/
    ├── FormContext.jsx           ← triggerMondaySync : file sérialisée par onglet, reflet du snapshot, état du bilan
    └── MondaySyncToast.jsx       ← Bilan à l'écran, monté dans FicheWizard (visible depuis toute étape)

supabase/
├── config.toml
└── functions/
    └── monday-sync/
        ├── index.ts              ← Câblage : HTTP, secrets, client Supabase authentifié (RLS), appels Monday
        ├── sync.ts               ← Cœur PUR : diff, traduction par index, une écriture par champ, patch snapshot
        ├── sync.test.ts          ← Preuves (deno test) : isolation, gardes, secrets — `npm run test:edge`
        └── deno.json

scripts/tests/
└── mondaySyncFeedback.test.mjs   ← Preuves du bilan (node --test) — `npm test`

docs/
├── migrations/
│   ├── 2026-05-15_monday_snapshot_column.sql            ← ALTER TABLE add column
│   ├── 2026-09-16_fusionner_monday_snapshot.sql         ← RPC de fusion par clé (SECURITY INVOKER)
│   └── 2026-09-16_fusionner_monday_snapshot_verification.sql ← scénario en transaction annulée
└── 🟦 MONDAY_INTEGRATION.md      ← Ce document
```

### Flux complet (depuis 2026-09-16)

```
[toute page] save réussi (handleSave / updateStatut) sur une fiche Complété
   → triggerMondaySync(savedData, wasCompleteBeforeSave)
      → extractMondaySnapshot(savedData)
      → pré-diff vs savedData.monday_snapshot (évite un appel inutile ; pas décisif)
      → mise en FILE (une sync en vol par onglet, la suivante attend la fin)
         → pushToMonday({ ficheId, numeroBien, snapshot, pushAll })
            → [Edge Function monday-sync, JWT de l'appelant]
               1. SELECT id, logement_numero_bien, monday_snapshot FROM fiches WHERE id (sous RLS)
                  → aucune ligne         → FICHE_INTROUVABLE (rien d'écrit)
                  → numéro ≠ envoyé      → NUMERO_BIEN_CHANGE (rien d'écrit)
               2. diff (champs FOURNIS seulement) : pushAll ou snapshot NULL → tous ; sinon champs ≠ snapshot EN BASE
                  valeur non reconnue     → skipped (jamais envoyée)
                  rien à écrire           → success, results: []
               3. items_page_by_column_values(board, num_ro=numeroBien)
                  → 0 item               → chaque champ : error ITEM_NOT_FOUND
               4. POUR CHAQUE champ : change_column_value(item, colonne, valeur)
                  → ok / error MONDAY_REFUSE — un refus n'arrête pas les autres
               5. RPC fusionner_monday_snapshot(fiche, numéro, { seuls les champs ok })
                  → COALESCE(monday_snapshot,'{}') || patch WHERE id AND logement_numero_bien
                  → NULL si renuméroté entre-temps → snapshot non persisté
               → return { success, itemId, results[], snapshot, snapshotPersiste }
         → reflet de `snapshot` (état EN BASE) dans formData.monday_snapshot
         → construireFeedbackMonday(reponse) → doitAfficherFeedback (dédoublonnage) → MondaySyncToast
```

### Logique de déclenchement (alignée sur `notify_fiche_alerts`)

```
isComplete = (statut === 'Complété')
wasComplete = (statut avant save === 'Complété')

SI !isComplete                      → skip (rien à pousser)
SINON SI !wasComplete               → pushAll (finalisation initiale)
SINON SI savedSnapshot existe       → pré-diff → appel seulement si un champ a changé
SINON                               → appel (Complété sans snapshot : l'Edge Function pousse tout, snapshot NULL en base)
```

Le diff **qui fait foi** est celui de l'Edge Function, contre le snapshot lu en base à l'instant du sync — pas l'état d'un onglet, qui peut être en retard d'une synchronisation en vol.

### Garde-fous

- **`numero_bien` invalide** : skip silencieux + warn console (le save Supabase a réussi, l'utilisateur n'est pas bloqué).
- **Fiche invisible pour l'appelant (RLS)** : `FICHE_INTROUVABLE`, aucun appel Monday. L'ancienne fonction ne vérifiait pas que la fiche appartenait à l'appelant.
- **Renumérotation** (double garde) : AVANT d'écrire, le numéro en base doit être celui envoyé (`NUMERO_BIEN_CHANGE`, rien n'est écrit) ; PENDANT le push, le WHERE de la RPC re-vérifie le numéro (`snapshotPersiste: false`, le NULL posé par `changer_numero_bien` n'est pas écrasé).
- **Isolation des champs** : une mutation par colonne. Un statut refusé → `error` sur ce champ seul, les autres passent et sont marqués synchronisés. Le champ en échec **reste hors du snapshot** → re-poussé au prochain enregistrement.
- **Item Monday non trouvé** : chaque champ demandé en `error ITEM_NOT_FOUND`, aucune fusion → retry naturel.
- **Monday API down / network error** : `pushToMonday` ne throw jamais (`{success:false, error:'NETWORK'}`) ; lookup impossible → `error MONDAY_API_ERROR` par champ. Snapshot non mis à jour → retry naturel.
- **RPC en erreur après des écritures Monday réussies** : les écritures restent, `snapshotPersiste: false`, re-push idempotent au save suivant.
- **Sérialisation par onglet** : deux autosaves rapprochés ne se doublent plus chez Monday ; la seconde sync re-diffe contre le snapshot fusionné par la première. **Limite acceptée** : deux onglets sur la même fiche ne sont pas sérialisés entre eux (il faudrait un verrou englobant l'appel HTTP Monday) ; le pire cas est un re-push idempotent.
- **Secrets** : les mots de passe et les identifiants (emails de propriétaires) n'apparaissent ni dans les logs Edge (dry-run compris), ni dans les diagnostics par champ (`masquerSecrets`), ni dans le bilan à l'écran (champs nommés, jamais de valeur).
- **Token serveur manquant** : `UNAUTHORIZED` (500), log côté Edge Function.

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
  "booking_mot_passe":         "..." | null,
  "airbnb_email":              "..." | null,
  "booking_email":             "..." | null
}
```

Chaque clé mémorise la **dernière valeur réellement écrite côté Monday** pour ce champ. Une clé absente = champ jamais poussé (→ à pousser). Une clé à `null` = vidage poussé.

**Pourquoi minimal+** (1 seule colonne au lieu du pattern Loomky à 5 colonnes) : pas besoin de cache `monday_item_id` (lookup rapide via `num_ro`), pas besoin de `sync_status`/`synced_at` (pas de SLA, l'erreur passe par le bilan à l'écran). Snapshot suffit pour la dirty-detection.

**⚠️ Anti-race condition** : `monday_snapshot` n'est PAS dans `mapFormDataToSupabase`. Il est écrit **uniquement par la RPC `fusionner_monday_snapshot`**, appelée par l'Edge Function après ses écritures Monday, avec les seuls champs réussis :

```sql
UPDATE fiches SET monday_snapshot = COALESCE(monday_snapshot,'{}') || p_patch
 WHERE id = p_fiche_id AND logement_numero_bien = p_numero_bien
RETURNING monday_snapshot;   -- NULL si aucune ligne (RLS, renumérotation)
```

Fusion **par clé, sous le verrou de ligne** : les clés hors patch restent telles qu'elles sont en base à cet instant (pas telles qu'un onglet les connaissait), donc un succès enregistré par une autre synchronisation n'est jamais effacé. `SECURITY INVOKER`, `search_path` figé, EXECUTE pour `authenticated` seulement. Migration : [2026-09-16](migrations/2026-09-16_fusionner_monday_snapshot.sql) ; preuve : [scénario en transaction annulée](migrations/2026-09-16_fusionner_monday_snapshot_verification.sql) (17 contrôles, dont RLS et garde du numéro).

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

L'Edge Function est ensuite invoquable depuis le client via `supabase.functions.invoke('monday-sync', { body })`. Auth automatique via le JWT Supabase de l'utilisateur connecté — JWT que la fonction rejoue vers PostgREST (client `anon` + header `Authorization`) pour lire la fiche et fusionner le snapshot **sous les RLS de l'appelant**. Pas de `service_role`.

### Ordre de livraison d'une évolution (impératif)

1. **Migration SQL** (si la PR en porte une) — ex. [2026-09-16 RPC de fusion](migrations/2026-09-16_fusionner_monday_snapshot.sql), après avoir joué son [scénario de vérification](migrations/2026-09-16_fusionner_monday_snapshot_verification.sql) (transaction annulée, lecture du rapport dans le message d'erreur).
2. **Edge Function** — `npx supabase functions deploy monday-sync` (ou l'outil de déploiement MCP Supabase, fichiers `index.ts`, `sync.ts`, `deno.json`).
3. **Merge de la PR** → déploiement Vercel du front.

Compatibilité vérifiée le 2026-09-16 : nouvelle Edge Function + ancien front fonctionne (l'ancien front ignore `results`, ne persiste un snapshot que sur `success:true`, l'Edge l'a déjà fusionné) ; l'inverse (nouveau front + ancienne Edge) ne casse rien mais ne persiste plus de snapshot → re-push idempotent à chaque save jusqu'au déploiement.

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

L'Edge Function lit la fiche (RLS + garde du numéro), calcule le plan et s'arrête **avant** tout appel Monday et toute écriture en base. Elle loggue les champs et colonnes visés (jamais les valeurs) et retourne `{ success, itemId: 'DRY_RUN', results: [...], snapshot, snapshotPersiste: false, dryRun: true }`. Limite : le dry-run ne prouve ni l'acceptation d'une valeur par Monday, ni l'isolation d'un refus — ça, ce sont les tests `deno test` (espions) et le test live.

Logs : `npx supabase functions logs monday-sync` (ou Dashboard → Functions → monday-sync → Logs).

### Tests automatisés

```bash
npm test            # bilan à l'écran : champs nommés, jamais de valeur, dédoublonnage
npm run test:edge   # cœur Edge : isolation d'un refus, diff, gardes, secrets, dry-run
```

### Test live (item Monday dédié)

Item de test : `Julien Gaichet (TESTS)`, numéro de bien **7755** (fiche Supabase 7755, Complété). Toujours : capturer les 4 colonnes Monday et le `monday_snapshot` avant, valeurs factices reconnaissables, restauration exacte et vérifiée après. Avec un JWT d'utilisateur autorisé par la RLS sur la fiche (jamais la `service_role`, qui ne prouverait pas le chemin de production).

### Scénarios couverts

1. **Isolation** (deno) : statut refusé par Monday → maintenance + 2 mots de passe écrits, patch snapshot = ces 3 clés, le statut reste à re-pousser
2. **Retry naturel** (deno) : sync suivante avec ce snapshot → seule la colonne status est renvoyée
3. **Valeur legacy** (deno + node) : `skipped`, jamais envoyée, hors snapshot, avertissement nommé et dédoublonné
4. **Gardes** (deno) : fiche invisible / numéro périmé → rien d'écrit ; renumérotation pendant le push → snapshot non persisté
5. **Secrets** (deno + node) : mot de passe renvoyé par Monday dans son erreur → masqué dans la réponse et les logs ; jamais dans le bilan
6. **RPC** (SQL, transaction annulée) : fusion par clé, garde du numéro, RLS coordinateur, anon refusé, aucune autre colonne touchée
7. **ITEM_NOT_FOUND** : chaque champ en erreur, aucune fusion, bilan « aucune ligne Monday pour ce numéro de bien »

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

### Update d'UNE colonne (depuis 2026-09-16)

```graphql
mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
  change_column_value(
    board_id: $boardId,
    item_id: $itemId,
    column_id: $columnId,
    value: $value
  ) { id }
}
```

`value` est une **chaîne JSON** : `{"index":4}` (status), `{}` (vider un status), `"password_airbnb"` (text), `""` (vider un text). Une mutation **par champ**, en séquence : c'est ce qui isole les champs. `change_multiple_column_values` n'est plus utilisée ici — atomique, elle faisait tomber les 4 champs sur un seul refus.

### Erreurs courantes

| Cas | Réaction Edge Function |
|---|---|
| 0 item dans `items_page_by_column_values` | chaque champ demandé → `error ITEM_NOT_FOUND` ; HTTP 200, `success:false` |
| `ColumnValueException` sur une colonne (valeur refusée) | ce champ seul → `error MONDAY_REFUSE` (message masqué des mots de passe), les autres continuent |
| `InvalidColumnIdException` | idem, sur ce champ — bug de config à corriger |
| Réponse Monday au format legacy `{ error_code, error_message }` (HTTP 200 sans `errors[]`) | traitée comme une erreur (l'ancienne fonction la prenait pour un succès) |
| Lookup impossible (HTTP 429, réseau, token) | chaque champ → `error MONDAY_API_ERROR` |
| Fiche invisible (RLS) / numéro périmé | `FICHE_INTROUVABLE` / `NUMERO_BIEN_CHANGE`, rien d'écrit |

Les issues « métier » sortent en **HTTP 200** avec `success:false` : `supabase.functions.invoke` ne livre le corps au front qu'en 2xx, et le front a besoin du détail par champ.

---

## 🔄 Évolutions possibles (V2+)

- Cache `monday_item_id` en DB pour éviter le lookup à chaque sync (V1 = re-lookup à chaque fois, simple et rapide)
- Retry exponentiel côté front si NETWORK error (aujourd'hui : retry naturel au prochain enregistrement)
- Sérialisation inter-onglets des synchronisations (verrou englobant l'appel Monday) — risque résiduel accepté le 2026-09-16
- Version d'API Monday : `2024-01` est dépassée (Monday sert déjà `2025-10`) ; chantier à part, le parsing d'erreur accepte déjà les deux formats
- Bouton "Force resync Monday" dans FicheFinalisation pour retry manuel après échec (hors périmètre du fix 2026-09-16, volontairement)
- Rattrapage des fiches historiques jamais synchronisées (17 fiches « Vérification / Inventaire » au 2026-09-16) : se fera naturellement au prochain enregistrement de chacune ; pas de rattrapage massif pour ne pas écraser des mots de passe corrigés à la main dans Monday
- Webhook bidirectionnel Monday → Fiche Logement (sync inverse)

---

**Fin du document** — Maintenu à jour à chaque évolution de l'intégration Monday.
