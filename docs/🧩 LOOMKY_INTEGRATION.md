# 🏠 Intégration Loomky - Roadmap & Documentation

**Projet**: Fiche Logement  
**Feature**: Synchronisation automatique des propriétés et checklists vers Loomky  
**Status**: 🚧 En développement  
**Dernière mise à jour**: 2026-01-23

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Contexte & Historique](#contexte--historique)
3. [Architecture technique](#architecture-technique)
4. [Roadmap détaillée](#roadmap-détaillée)
5. [Décisions & Questions en suspens](#décisions--questions-en-suspens)
6. [API Loomky - Référence](#api-loomky---référence)
7. [Tests & Validation](#tests--validation)

---

## 🎯 Vue d'ensemble

### Objectif
Permettre la synchronisation des fiches logement vers Loomky (plateforme de gestion de ménage) via un bouton manuel dans l'interface de finalisation.

### Valeur ajoutée
- ✅ Automatisation de la création des properties dans Loomky
- ✅ Génération intelligente des checklists de ménage selon les équipements
- ✅ Synchronisation bidirectionnelle (détection des modifications)
- ✅ Contrôle utilisateur (pas de magie noire, sync manuelle)

### Périmètre
- **Dans le scope**: Création property + checklists, mise à jour, détection changements
- **Hors scope (pour l'instant)**: Migration des fiches existantes, retry automatique

---

## 📚 Contexte & Historique (Claude Brain)

### Session 2025-12-18 - MVP Payload
- Implémentation initiale des payloads property + quelques sections checklist
- Tests réussis avec l'API Loomky (environnement dev)
- Identification du problème 204 No Content (pas de body dans réponse PATCH)

### Session 2026-01-20 - Finalisation Payload Checklists
**Status**: ✅ COMPLET

**Achievements**:
- ✅ Toutes les 11 sections checklist implémentées avec logique conditionnelle
- ✅ ~120 tasks possibles selon équipements
- ✅ Correction bugs (numberOfRooms, maxOccupancy, douche_baignoire_combinees)
- ✅ Stratégie d'intégration définie (bouton manuel dans FicheFinalisation)

**Sections checklist implémentées**:
1. Entrée (2 tasks standard)
2. Salon (8 tasks conditionnelles)
3. Salle à manger (5 tasks conditionnelles)
4. Cuisine (10 standard + 14 conditionnelles)
5. Chambres 1-6 / Espace nuit (3-6 tasks conditionnelles)
6. Salles de bain 1-6 (8-13 tasks conditionnelles)
7. WC (8 tasks standard)
8. Buanderie (2 standard + 4 conditionnelles)
9. Autres pièces (9 tasks conditionnelles)
10. Extérieurs (2 standard + 11 conditionnelles)
11. Piscine (1 task, si piscine privée uniquement)

**Bugs corrigés**:
- `numberOfRooms = 0` pour Studios → Force à 1
- Type `house` rejeté en test → Force à `apartment` temporairement
- Nom colonne tronqué `douche_baignoire_com` → Utilisation nom tronqué
- `maxOccupancy` manquant → Ajout (= defaultOccupancy)

### Session 2026-01-23 - Architecture & Database
**Status**: 🚧 EN COURS

**Objectifs**:
- ✅ Définir architecture service `loomkyService.js`
- 🔄 Créer colonnes Supabase pour tracking sync
- 📝 Extraire logique métier de SimulationLoomky
- 📝 Implémenter bloc UI dans FicheFinalisation

---

## 🏗 Architecture technique

### Structure de fichiers

```
src/
├── services/
│   └── loomkyService.js          ← 🆕 Service centralisé Loomky
│       ├── buildPropertyPayload()
│       ├── buildResolvedChecklists()
│       ├── extractLoomkyFields()
│       ├── createProperty()
│       ├── updateProperty()
│       ├── createChecklists()
│       ├── updateChecklists()
│       └── syncToLoomky()         ← Orchestrateur principal
│
├── pages/
│   ├── SimulationLoomky.jsx      ← Page de test (utilise loomkyService)
│   └── FicheFinalisation.jsx     ← Bloc sync Loomky (utilise loomkyService)
│
└── components/
    └── FormContext.jsx            ← Ajout fonctions sync Loomky
```

### Base de données Supabase

**Nouvelles colonnes dans table `fiches`**:

```sql
-- IDs et statut
loomky_property_id        TEXT              -- ID property retourné par Loomky
loomky_checklist_ids      JSONB             -- [{name: "Cuisine", id: "abc123"}, ...]
loomky_sync_status        TEXT              -- 'pending' | 'synced' | 'failed' | 'outdated'
loomky_synced_at          TIMESTAMP         -- Date dernière sync réussie

-- Snapshot pour dirty detection
loomky_snapshot           JSONB             -- Snapshot champs au moment du sync
```

**Status possibles**:
- `null` ou `pending` : Jamais synchronisé
- `synced` : Synchronisé, pas de changement détecté
- `outdated` : Synchronisé mais modifications détectées
- `failed` : Échec de synchronisation

### Workflow de synchronisation

#### 1️⃣ Première synchronisation

```mermaid
graph LR
    A [User clique Sync] --> B [buildPropertyPayload]
    B --> C [POST /properties]
    C --> D [Récupère propertyId]
    D --> E [buildResolvedChecklists]
    E --> F [PATCH /checklists]
    F --> G [Récupère checklist IDs]
    G --> H [Save Supabase]
    H --> I [status = synced]
```

**Détails**:
1. User clique "Envoyer à Loomky"
2. Génération payload property
3. POST `/v1/properties` → récupère `propertyId`
4. Génération checklists conditionnelles
5. PATCH `/v1/properties/{propertyId}/cleaning-checklists` → récupère IDs
6. Sauvegarde Supabase:
   - `loomky_property_id` = propertyId
   - `loomky_checklist_ids` = array [{name, id}]
   - `loomky_snapshot` = extractLoomkyFields(fiche)
   - `loomky_sync_status` = 'synced'
   - `loomky_synced_at` = NOW()
7. Badge vert + bouton grisé

#### 2️⃣ Détection de modifications

```javascript
// Fonction dans loomkyService.js
function hasLoomkyChanges(fiche) {
  const currentSnapshot = extractLoomkyFields(fiche)
  const savedSnapshot = fiche.loomky_snapshot
  
  return JSON.stringify(currentSnapshot) !== JSON.stringify(savedSnapshot)
}
```

**Déclencheurs**:
- User modifie un équipement (ex: ajoute lave-vaisselle)
- User change type propriété ou nombre de chambres
- User modifie infos de base (adresse, occupancy)

**Résultat**:
- `loomky_sync_status` = 'outdated'
- Badge orange "⚠️ Modifications non synchronisées"
- Bouton redevient actif "Mettre à jour Loomky"

#### 3️⃣ Re-synchronisation

```mermaid
graph LR
    A [User clique Update] --> B [Détecte changements]
    B --> C {Property modifiée?}
    C -->|Oui| D [PUT /properties/id]
    C -->|Non| E {Checklists modifiées?}
    D --> E
    E -->|Oui| F [PATCH /checklists]
    E -->|Non| G [Rien à faire]
    F --> H [Nouveau snapshot]
    H --> I [status = synced]
```

**Détails**:
1. User clique "Mettre à jour Loomky"
2. Comparaison snapshot actuel vs sauvegardé
3. Si property changée → PUT `/v1/properties/{propertyId}`
4. Si checklists changées → PATCH `/v1/properties/{propertyId}/cleaning-checklists/{checklistId}`
5. Nouveau snapshot + status='synced'
6. Badge vert + bouton re-grisé

---

## 🗺 Roadmap détaillée

### Phase 1 : Infrastructure ✅ (Session 2026-01-23)

#### ✅ Step 1.1 : Créer colonnes Supabase
- [x] Exécuter SQL pour créer 5 colonnes
- [x] Vérifier colonnes avec query test
- [x] Documenter types et contraintes

#### ✅ Step 1.2 : Créer service loomkyService.js
- [x] Créer fichier `src/services/loomkyService.js`
- [ ] Extraire `buildPropertyPayload()` de SimulationLoomky
- [ ] Extraire `buildResolvedChecklists()` de SimulationLoomky
- [ ] Implémenter `extractLoomkyFields()` pour snapshot
- [ ] Documenter chaque fonction avec JSDoc

#### ✅ Step 1.3 : Fonctions API
- [ ] `createProperty(payload, token)` - POST property
- [ ] `updateProperty(id, payload, token)` - PUT property
- [ ] `createChecklists(propertyId, checklists, token)` - PATCH checklists
- [ ] `updateChecklists(propertyId, checklistId, checklists, token)` - PATCH checklist spécifique
- [ ] Gestion erreurs + logging

#### ✅ Step 1.4 : Orchestrateur principal
- [ ] `syncToLoomky(fiche, token, mode)` - mode: 'create' | 'update'
- [ ] Détection automatique mode selon `loomky_property_id`
- [ ] Retourne résultat structuré (success, propertyId, checklistIds, errors)

---

### Phase 2 : Interface Utilisateur 📝 (Prochaine session)

#### Step 2.1 : Bloc UI dans FicheFinalisation
- [ ] Créer section "🏠 Synchronisation Loomky"
- [ ] Afficher statut actuel (badge vert/orange/rouge)
- [ ] Bouton conditionnel selon statut
- [ ] Messages d'erreur si échec

#### Step 2.2 : Logique de détection changements
- [ ] Fonction `hasLoomkyChanges()` dans FormContext
- [ ] Détection en temps réel lors modifications
- [ ] Update automatique `loomky_sync_status` si dirty

#### Step 2.3 : Handler de synchronisation
- [ ] `handleSyncLoomky()` dans FicheFinalisation
- [ ] Loading state pendant sync
- [ ] Success/Error feedback visuel
- [ ] Update Supabase après sync

---

### Phase 3 : Tests & Validation 🧪 (Session future)

#### Step 3.1 : Tests unitaires
- [ ] Test `buildPropertyPayload()` avec différents types
- [ ] Test `buildResolvedChecklists()` avec équipements variés
- [ ] Test `extractLoomkyFields()` snapshot
- [ ] Test `hasLoomkyChanges()` détection dirty

#### Step 3.2 : Tests d'intégration
- [ ] Test première sync (fiche jamais sync)
- [ ] Test modification + re-sync
- [ ] Test échec API + retry manuel
- [ ] Test cas edge (studio, maison piscine, etc.)

#### Step 3.3 : Tests utilisateurs
- [ ] Melissa teste avec fiche réelle
- [ ] David teste workflow complet
- [ ] Feedback coordinateurs terrain

---

### Phase 4 : Production 🚀 (En attente réponse Loomky)

#### Step 4.1 : Migration environnement prod
- [ ] ⏳ Recevoir credentials prod Loomky (URL + token)
- [ ] Remplacer URL test par URL prod dans config
- [ ] Réactiver mapping `type: 'house'` (désactivé en test)
- [ ] Vérifier endpoints prod identiques à test

#### Step 4.2 : Documentation utilisateur
- [ ] Guide utilisateur "Comment synchroniser vers Loomky"
- [ ] FAQ erreurs courantes
- [ ] Vidéo démo pour coordinateurs

#### Step 4.3 : Monitoring & Alertes
- [ ] Log tous les appels API Loomky
- [ ] Alertes si taux d'échec > 10%
- [ ] Dashboard succès/échecs sync

---

## ❓ Décisions & Questions en suspens

### 🟢 Décisions validées

| Décision | Rationale | Date |
|----------|-----------|------|
| Bouton manuel (pas auto à finalisation) | Séparation concerns, contrôle utilisateur, pas de couplage fort | 2026-01-20 |
| Service centralisé `loomkyService.js` | Réutilisable, testable, maintenable | 2026-01-23 |
| Snapshot JSONB pour dirty detection | Simple, fiable, pas de colonnes multiples | 2026-01-20 |
| Retry manuel (pas auto) | Contrôle utilisateur, pas de spam API | 2026-01-20 |
| Stockage IDs en JSONB array | Flexible, permet stockage multiple checklists | 2026-01-20 |
| Force `numberOfRooms = 1` pour Studios | Fix bug API Loomky (ne prend pas 0) | 2026-01-20 |

### 🟡 Questions en attente réponse Loomky

| Question | Status | Contact | Bloquant? |
|----------|--------|---------|-----------|
| PATCH retourne 204 au lieu de 200 avec body | ⏳ En attente | Maxime | Non (fallback GET) |
| Credentials prod (URL + token) | ⏳ En attente | Maxime | Oui pour prod |
| Mapping `type: 'house'` accepté en prod? | ⏳ En attente | Maxime | Non (force apartment ok) |
| PATCH remplace ou merge les checklists? | ⏳ À clarifier | Maxime | Non (assume remplace) |

**Message envoyé à Maxime (2026-01-20)**:
> "Intégration terminée property + checklists ✅, maintenant on se penche sur les updates. Le PATCH retourne 204 au lieu de 200 avec body (comme dans la doc). Possible de corriger pour éviter un GET supplémentaire à chaque sync ? Merci !"

### 🔴 Questions à décider (Julien)

| Question | Impact | Urgence |
|----------|--------|---------|
| Migration fiches existantes vers Loomky? | Hors scope ou feature future? | Basse |
| Que faire si user supprime équipement après sync? | PATCH avec tasks manquantes ou DELETE explicite? | Moyenne |
| Retry automatique + exponential backoff? | UX meilleure mais complexité | Basse |
| Webhook Loomky → Fiche logement? | Sync bidirectionnelle complète | Basse |

---

## 📡 API Loomky - Référence

### Configuration

**Environnement DEV** (actuel):
```javascript
BASE_URL: 'https://dev.loomky.com'
TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Token test fourni
```

**Environnement PROD** (à venir):
```javascript
BASE_URL: '???' // ⏳ En attente
TOKEN: '???' // ⏳ En attente
```

### Endpoints utilisés

#### 1. POST `/v1/properties` - Créer une property

**Request**:
```json
{
  "name": "Appartement 3 pièces - 75008 Paris",
  "type": "apartment",
  "address": "12 rue de la Paix, 75008 Paris",
  "numberOfRooms": 3,
  "defaultOccupancy": 4,
  "maxOccupancy": 6,
  "description": "Bel appartement rénové avec vue sur la Tour Eiffel"
}
```

**Response 201**:
```json
{
  "_id": "681b891d17d37e59963f979f",
  "name": "Appartement 3 pièces - 75008 Paris",
  "type": "apartment",
  "createdAt": "2025-12-14T11:58:55.104Z"
}
```

**Extraction `propertyId`**: `response._id`

---

#### 2. PUT `/v1/properties/{propertyId}` - Mettre à jour property

**Request**:
```json
{
  "name": "Appartement 3 pièces - 75008 Paris (Rénové)",
  "defaultOccupancy": 6,
  "description": "Description mise à jour"
}
```

**Response 200**:
```json
{
  "_id": "681b891d17d37e59963f979f",
  "name": "Appartement 3 pièces - 75008 Paris (Rénové)",
  "updatedAt": "2025-12-14T12:30:00.000Z"
}
```

---

#### 3. PATCH `/v1/properties/{propertyId}/cleaning-checklists` - Créer/Update checklists

**Request**:
```json
{
  "checklists": [
    {
      "name": "Cuisine",
      "tasks": [
        {
          "name": "Vue d'ensemble",
          "description": "Inspecter l'état général de la cuisine"
        },
        {
          "name": "Plan de travail",
          "description": "Nettoyer et désinfecter les plans de travail"
        }
      ],
      "required": true,
      "beforePhotosRequired": true,
      "afterPhotosRequired": true
    }
  ]
}
```

**Response 204 No Content** (⚠️ Problème actuel):
- Pas de body
- Success = status 204
- **Workaround**: Faire un GET après pour récupérer IDs

**Response attendue selon doc** (⏳ En attente correction):
```json
{
  "success": true,
  "property": {
    "_id": "681b891d17d37e59963f979f",
    "cleaningChecklists": [
      {
        "_id": "686ff0b26cd36c4abcec6319",
        "name": "Cuisine",
        "isRequired": true,
        "beforePhotosRequired": true,
        "afterPhotosRequired": true,
        "tasks": [...]
      }
    ]
  }
}
```

---

#### 4. GET `/v1/properties/{propertyId}` - Récupérer property (Fallback)

**Response 200**:
```json
{
  "_id": "681b891d17d37e59963f979f",
  "name": "Appartement 3 pièces",
  "cleaningChecklists": [
    {
      "_id": "686ff0b26cd36c4abcec6319",
      "name": "Cuisine",
      "tasks": [...]
    }
  ]
}
```

**Extraction checklist IDs**:
```javascript
const checklistIds = response.cleaningChecklists.map(cl => ({
  name: cl.name,
  id: cl._id
}))
```

---

#### 5. DELETE `/v1/properties/{propertyId}` - Supprimer property

**Response 200**:
```json
{
  "success": true,
  "message": "Property deleted successfully"
}
```

**Note**: Pas utilisé dans notre workflow actuel (pas de suppression côté Fiche logement).

---

### Gestion des erreurs

**Erreurs courantes**:

| Code | Message | Cause probable | Solution |
|------|---------|----------------|----------|
| 400 | `Number must be greater than 0` | `numberOfRooms = 0` pour Studio | Force à 1 |
| 400 | `Invalid enum value 'house'` | Type non accepté en test | Force à 'apartment' temporairement |
| 400 | `Required field maxOccupancy` | Champ manquant | Ajouter `maxOccupancy = defaultOccupancy` |
| 401 | `Unauthorized` | Token invalide ou expiré | Vérifier token |
| 404 | `Property not found` | PropertyId inexistant | Vérifier ID sauvegardé |
| 500 | `Internal server error` | Bug API Loomky | Contacter support |

---

## 🧪 Tests & Validation

### Cas de test

#### Test 1 : Studio minimal
**Fiche**: Studio, 0 chambres, équipements de base  
**Attendu**: 
- `numberOfRooms = 1` (forcé)
- Checklists: Entrée, Espace nuit, SDB, Cuisine minimale
- ~15 tasks total

#### Test 2 : Appartement T4 complet
**Fiche**: 3 chambres, 2 SDB, cuisine complète, buanderie  
**Attendu**:
- `numberOfRooms = 3`
- Checklists: Entrée, Salon, SAM, Cuisine, 3 Chambres, 2 SDB, WC, Buanderie
- ~80 tasks total

#### Test 3 : Maison avec piscine
**Fiche**: Maison, 4 chambres, piscine privée, extérieurs complets  
**Attendu**:
- `type = 'apartment'` (temporaire test) ou `'house'` (prod)
- Checklists: + Extérieurs, Piscine
- ~100 tasks total

#### Test 4 : Modification post-sync
**Scénario**:
1. Sync fiche sans lave-vaisselle
2. Ajouter lave-vaisselle dans équipements
3. Badge orange apparaît
4. Re-sync → task "Lave-vaisselle" ajoutée

#### Test 5 : Échec API
**Scénario**:
1. Couper connexion ou invalider token
2. Tenter sync
3. Message d'erreur affiché
4. Status = 'failed'
5. Bouton "Réessayer" actif

---

## 📝 Notes de développement

### Patterns établis

#### Construction tasks conditionnelles
```javascript
const tasks = [
  { name: "Vue d'ensemble", description: "..." }, // Toujours
]

if (fiche.equipements_lave_vaisselle === true) {
  tasks.push({
    name: "Lave-vaisselle",
    description: "Nettoyer l'intérieur et l'extérieur du lave-vaisselle"
  })
}
```

#### Détection changements
```javascript
function hasLoomkyChanges(fiche) {
  if (!fiche.loomky_snapshot) return true // Jamais sync
  
  const current = extractLoomkyFields(fiche)
  const saved = fiche.loomky_snapshot
  
  return JSON.stringify(current) !== JSON.stringify(saved)
}
```

#### Extraction champs snapshot
```javascript
function extractLoomkyFields(fiche) {
  return {
    property: {
      type: fiche.logement_type_propriete,
      address: `${fiche.logement_adresse}, ${fiche.logement_code_postal} ${fiche.logement_ville}`,
      numberOfRooms: fiche.logement_type_propriete === 'Studio' ? 1 : parseInt(fiche.visite_nombre_chambres) || 1,
      defaultOccupancy: parseInt(fiche.logement_nombre_personnes_max) || 2,
      maxOccupancy: parseInt(fiche.logement_nombre_personnes_max) || 2,
    },
    equipements: {
      // Cuisine
      cuisine_plaque_cuisson: fiche.equipements_plaque_cuisson,
      cuisine_lave_vaisselle: fiche.equipements_lave_vaisselle,
      // ... tous les équipements impactant checklists
    }
  }
}
```

---

## 🚀 Prochaines étapes immédiates

### Session actuelle (2026-01-23)
1. ✅ Créer ce document de roadmap
2. 🔄 Créer colonnes Supabase
3. 📝 Extraire logique dans `loomkyService.js`
4. 📝 Tester service avec SimulationLoomky

### Prochaine session
1. Implémenter bloc UI dans FicheFinalisation
2. Coder `hasLoomkyChanges()` et dirty detection
3. Tester workflow complet (create → modify → update)

### En attente
- ⏳ Réponse Maxime sur 204 vs 200
- ⏳ Credentials prod Loomky
- ⏳ Clarifications sur mapping types et updates

---

## 📞 Contacts

- **Maxime (Loomky)**: Contact principal pour questions API
- **Julien**: Product Owner / Developer
- **Victoria**: Supervisor / Requirements
- **Kevin**: Automation workflows (n8n)

---

**Fin du document** - Dernière mise à jour: 2026-01-23 par Claude & Julien