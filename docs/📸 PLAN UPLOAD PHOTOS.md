# 📸 PLAN UPLOAD PHOTOS - Architecture Complète
*Mise à jour : 03 juillet 2025 - PHASE 1 TERMINÉE ✅*

## 🎯 **OBJECTIF**
Intégrer l'upload fonctionnel dans le process d'ajout de sections avec migration transparente Supabase → Google Drive.

## 🏆 **STATUT ACTUEL - PHASE 1 TERMINÉE ✅**

### ✅ **Composant PhotoUpload 100% fonctionnel**
- **Upload vers Supabase Storage** ✅ Testé et validé
- **Suppression avec décodage URL** ✅ Fix crucial appliqué
- **Mode single ET multiple** ✅ Tous les cas d'usage couverts
- **Support photos + vidéos** ✅ `acceptVideo={true}`
- **Organisation Storage parfaite** ✅ Structure par fiche/section
- **Intégration FormContext** ✅ Sauvegarde/chargement automatique

### ✅ **Infrastructure Supabase opérationnelle**
- **Bucket** : `fiche-photos` (public)
- **Permissions RLS** : Upload/Delete/Read configurées
- **Structure** : `user-{id}/fiche-{id}/section_clefs/{field}/`
- **Colonnes BDD** : Toutes les colonnes `clefs_*_photo*` existent

### ✅ **FicheClefs - Cas d'usage complet validé**
5 champs photos testés et fonctionnels :
1. **Photo emplacement** → `section_clefs.emplacementPhoto` (single)
2. **Photo interphone** → `section_clefs.interphonePhoto` (single, conditionnel)  
3. **Photo tempo-gâche** → `section_clefs.tempoGachePhoto` (single, conditionnel)
4. **Photo digicode** → `section_clefs.digicodePhoto` (single, conditionnel)
5. **Photos/Vidéos clefs** → `section_clefs.clefs.photos` (multiple + vidéos)

---

## 🏗️ **ARCHITECTURE PROPOSÉE**

### **✅ Phase 1 : Supabase Storage (TERMINÉE)**
**Avantages :**
- ✅ Setup immédiat (pas d'autorisation IT)
- ✅ Intégration native avec Supabase
- ✅ Sécurité RLS automatique
- ✅ Base solide pour migration

**Inconvénients :**
- ❌ Coût par GB stocké
- ❌ Limite de stockage selon plan

### **⏳ Phase 2 : Google Drive API (EN COURS)**
**Avantages :**
- ✅ Stockage gratuit et illimité
- ✅ URLs publiques partageable
- ✅ Pas de coût Supabase Storage
- ✅ Intégration Google Workspace existante
- ✅ Structure organisée automatique

**Inconvénients :**
- ❌ Setup API Google nécessite IT
- ❌ Gestion des permissions

---

## 📁 **STRUCTURE GOOGLE DRIVE (Phase 2)**

### **Arborescence Automatique**
```
📁 Fiche-Logement-Photos/ (Dossier racine)
├── 📁 fiche-numero-de-bien/
│   ├── 📁 section_clefs/
│   │   ├── 📁 emplacementPhoto/
│   │   │   └── 📷 emplacement_1640995200_IMG001.jpg
│   │   ├── 📁 interphonePhoto/
│   │   ├── 📁 digicodePhoto/
│   │   └── 📁 clefs/
│   │       ├── 📷 clefs_1640995200_IMG001.jpg
│   │       └── 📷 clefs_1640995230_IMG002.jpg
│   ├── 📁 section_equipements/
│   │   ├── 📁 poubelle_photos/
│   │   ├── 📁 disjoncteur_photos/
│   │   └── 📁 systeme_chauffage_photos/
│   └── 📁 section_gestion_linge/
│       ├── 📁 photos_linge/
│       └── 📁 emplacement_photos/
├── 📁 fiche-numero-de-bien/
│   └── 📁 ... (même structure)
└── 📁 fiche-numero-de-bien/
    └── 📁 ... (même structure)
```

### **Logique de Nommage Automatique**
```javascript
// Pattern : fiche-{numero-bien}/section/sous-dossier/
const generateStoragePath = (fileName, fieldPath, getField, user) => {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substr(2, 6)
  const [section, field] = fieldPath.split('.')
  
  // Récupérer le numéro de bien depuis section_logement (business-friendly)
  const numeroBien = getField('section_logement.numero_bien') || `temp-${timestamp}`
  
  return `user-${user.id}/fiche-${numeroBien}/${section}/${field}/${timestamp}_${randomId}_${fileName}`
}

// Exemple concret :
// Input: numeroBien="5566", fieldPath="section_clefs.emplacementPhoto", fileName="photo.jpg"
// Output: "user-fb6faa31.../fiche-5566/section_clefs/emplacementPhoto/1751504xxx_abc123_photo.jpg"
```

---

## 🔧 **COMPOSANT PHOTOUPLOD - VERSION FINALE ✅**

### **Usage Standard**
```javascript
import PhotoUpload from '../components/PhotoUpload'

// Photo unique
<PhotoUpload 
  fieldPath="section_clefs.emplacementPhoto"
  label="Photo de l'emplacement"
  multiple={false}
  maxFiles={1}
/>

// Photos multiples avec vidéos
<PhotoUpload 
  fieldPath="section_clefs.clefs.photos"
  label="Photos/Vidéos des clefs"
  multiple={true}
  maxFiles={5}
  acceptVideo={true}
/>
```

### **Fix Critique - Décodage URL**
```javascript
// PROBLÈME RÉSOLU : Caractères spéciaux dans noms de fichiers
// Avant : "Screenshot%202025-06-03%20164459.png" → Échec suppression
// Après : "Screenshot 2025-06-03 164459.png" → Succès

const handleDeletePhoto = async (photoUrl, index) => {
  const urlParts = photoUrl.split('/')
  const bucketIndex = urlParts.findIndex(part => part === 'fiche-photos')
  let storagePath = urlParts.slice(bucketIndex + 1).join('/')
  
  // FIX CRUCIAL : Décodage URL
  storagePath = decodeURIComponent(storagePath)
  
  const { error } = await supabase.storage
    .from('fiche-photos')
    .remove([storagePath])
  // ...
}
```

---

## 📊 **STRUCTURE DONNÉES**

### **Base de Données (Aucun changement)**
```sql
-- Colonnes existantes et fonctionnelles
clefs_emplacement_photo TEXT     -- URL photo unique
clefs_interphone_photo TEXT      -- URL photo unique  
clefs_tempo_gache_photo TEXT     -- URL photo unique
clefs_digicode_photo TEXT        -- URL photo unique
clefs_photos TEXT[]              -- Array URLs multiples
```

### **FormContext (Structure validée)**
```javascript
section_clefs: {
  // Photos uniques (mode single)
  emplacementPhoto: null,        // URL ou null
  interphonePhoto: null,         // URL ou null
  tempoGachePhoto: null,         // URL ou null
  digicodePhoto: null,           // URL ou null
  
  // Photos multiples (mode array)
  clefs: {
    photos: []                   // Array d'URLs
  }
}
```

---

## 🔌 **INTERFACE COMMUNE - PHASE 2**

### **storageInterface.js - Contrat Unifié**
```javascript
// Interface standardisée - même signature pour tous les providers
export class StorageInterface {
  async uploadPhoto(file, path, metadata) {
    throw new Error('Method must be implemented')
  }
  
  async deletePhoto(photoUrl) {
    throw new Error('Method must be implemented')
  }
  
  async createFolder(folderPath) {
    throw new Error('Method must be implemented')
  }
  
  async getPublicUrl(path) {
    throw new Error('Method must be implemented')
  }
}

// Format de réponse standardisé (identique pour tous)
export const PhotoResponse = {
  success: boolean,
  data: {
    url: string,          // URL publique accessible
    path: string,         // Chemin dans le storage
    name: string,         // Nom du fichier
    size: number,         // Taille en bytes
    folderId?: string,    // ID dossier Google Drive (optionnel)
    metadata: object      // Infos supplémentaires
  },
  error: string | null
}
```

---

## 🗄️ **IMPLEMENTATION SUPABASE - TERMINÉE ✅**

### **supabaseProvider.js**
```javascript
import { supabase } from '../supabaseClient'
import { StorageInterface } from './storageInterface'

export class SupabaseStorageProvider extends StorageInterface {
  constructor() {
    super()
    this.bucket = 'fiche-photos'
  }

  async uploadPhoto(file, path, metadata = {}) {
    try {
      // 1. Upload fichier vers Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          metadata
        })

      if (error) throw error

      // 2. Récupérer URL publique
      const { data: urlData } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(path)

      return {
        success: true,
        data: {
          url: urlData.publicUrl,
          path: path,
          name: file.name,
          size: file.size,
          metadata
        },
        error: null
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      }
    }
  }

  async deletePhoto(photoUrl) {
    try {
      const urlParts = photoUrl.split('/')
      const bucketIndex = urlParts.findIndex(part => part === this.bucket)
      let storagePath = urlParts.slice(bucketIndex + 1).join('/')
      
      // DÉCODAGE CRUCIAL
      storagePath = decodeURIComponent(storagePath)
      
      const { error } = await supabase.storage
        .from(this.bucket)
        .remove([storagePath])

      if (error) throw error
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
```

---

## 🔮 **IMPLEMENTATION GOOGLE DRIVE - PHASE 2**

### **googleDriveProvider.js - À CRÉER**
```javascript
import { StorageInterface } from './storageInterface'

export class GoogleDriveProvider extends StorageInterface {
  constructor(apiKey, rootFolderId) {
    super()
    this.apiKey = apiKey
    this.rootFolderId = rootFolderId
    this.folderCache = new Map() // Cache des IDs de dossiers
  }

  async uploadPhoto(file, path, metadata = {}) {
    try {
      // 1. Créer structure de dossiers si nécessaire
      const folderId = await this.ensureFolderStructure(path)
      
      // 2. Upload vers Google Drive
      const uploadResult = await this.uploadToGoogleDrive(file, folderId, metadata)
      
      // 3. Rendre public et récupérer URL
      const publicUrl = await this.makePublicAndGetUrl(uploadResult.id)
      
      return {
        success: true,
        data: {
          url: publicUrl,
          path: path,
          name: file.name,
          size: file.size,
          folderId: uploadResult.id,
          metadata
        },
        error: null
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      }
    }
  }

  async deletePhoto(photoUrl) {
    try {
      // Extraire l'ID du fichier depuis l'URL Google Drive
      const fileId = this.extractFileIdFromUrl(photoUrl)
      
      // Supprimer le fichier
      await gapi.client.drive.files.delete({
        fileId: fileId
      })
      
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async ensureFolderStructure(path) {
    // Logique création structure de dossiers automatique
  }

  extractFileIdFromUrl(url) {
    // Pattern Google Drive : https://drive.google.com/file/d/{FILE_ID}/view
    const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : null
  }
}
```

---

## 🔄 **PROVIDER SWITCHING - PHASE 2**

### **index.js - Configuration Centralisée**
```javascript
import { SupabaseStorageProvider } from './supabaseProvider'
import { GoogleDriveProvider } from './googleDriveProvider'

// Configuration centralisée via variables d'environnement
const STORAGE_CONFIG = {
  provider: import.meta.env.VITE_STORAGE_PROVIDER || 'supabase',
  supabase: {
    bucket: 'fiche-photos'
  },
  googleDrive: {
    apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    rootFolderId: import.meta.env.VITE_GOOGLE_DRIVE_ROOT_FOLDER
  }
}

// Factory pattern - choix automatique du provider
export const createStorageProvider = () => {
  switch (STORAGE_CONFIG.provider) {
    case 'googleDrive':
      return new GoogleDriveProvider(
        STORAGE_CONFIG.googleDrive.apiKey,
        STORAGE_CONFIG.googleDrive.rootFolderId
      )
    case 'supabase':
    default:
      return new SupabaseStorageProvider()
  }
}

// Instance globale utilisée partout
export const storageProvider = createStorageProvider()
```

---

## 🌍 **VARIABLES D'ENVIRONNEMENT**

### **✅ Phase 1 - Supabase (ACTUEL)**
```bash
# Configuration existante (déjà présente)
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...

# Configuration Storage
VITE_STORAGE_PROVIDER=supabase
```

### **⏳ Phase 2 - Google Drive (PROCHAINE ÉTAPE)**
```bash
# Configuration existante (conservée)
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...

# Configuration Google Drive (à obtenir)
VITE_STORAGE_PROVIDER=googleDrive
VITE_GOOGLE_API_KEY=AIzaSyD-9tSrke72PouQMnMX-a7UUOA8Cc
VITE_GOOGLE_DRIVE_ROOT_FOLDER=1BxiMVs0XRA5nFMdKvBdBZjgmUGaSnkXU
```

---

## 🎯 **CHECKLIST IT - Google Drive Setup**

### **Ce qu'il faut demander à ton équipe IT :**

**1. Google Cloud Platform**
- [ ] Accès/création projet Google Cloud
- [ ] Facturation activée (gratuit jusqu'à quotas)

**2. API Configuration**  
- [ ] Activer "Google Drive API v3"
- [ ] Créer "API Key" OU "OAuth 2.0 Client ID"
- [ ] Configurer domaines autorisés

**3. Drive Setup**
- [ ] Créer dossier racine "Fiche-Logement-Photos"
- [ ] Partager en écriture avec le service
- [ ] Récupérer l'ID du dossier (depuis URL)

**4. Variables à fournir**
```bash
VITE_GOOGLE_API_KEY=AIzaSyD...
VITE_GOOGLE_DRIVE_ROOT_FOLDER=1BxiMVs0XRA5nF...
```

---

## ⚡ **MISE EN ŒUVRE - HISTORIQUE & PROCHAINES ÉTAPES**

### **✅ Phase 1 : Fondations Supabase (TERMINÉE)**
- [x] **Setup Supabase Storage** - Bucket "fiche-photos" créé
- [x] **Créer PhotoUpload.jsx** - Composant réutilisable fonctionnel
- [x] **Fix suppression critique** - Décodage URL implémenté
- [x] **Tester upload basique** - Validation fonctionnement
- [x] **Tests FicheClefs complets** - 5 champs validés

### **⏳ Phase 2 : Migration Google Drive (PROCHAINE)**
- [ ] **Créer storageInterface.js** - Interface commune
- [ ] **Créer googleDriveProvider.js** - Implémentation Google
- [ ] **Setup variables d'environnement** - Configuration Google
- [ ] **Modifier PhotoUpload** - Utilisation provider abstrait
- [ ] **Tests validation** - Vérifier FicheClefs avec Google Drive

### **📋 Phase 3 : Rollout (FUTURE)**
- [ ] **Intégration autres sections** - Équipements, Gestion Linge
- [ ] **Améliorer PhotoGallery** - Modal zoom, navigation
- [ ] **Optimiser performances** - Compression images, lazy loading
- [ ] **Documentation usage** - Guide pour nouvelles sections

---

## 🔄 **PROCESS MODIFIÉ - Nouvelles Sections**

### **Template Mis à Jour (Étape 5)**
```javascript
// Au lieu de :
<input type="file" accept="image/*" capture="environment" multiple />

// Utiliser dans tous les nouveaux composants :
import PhotoUpload from '../components/PhotoUpload'

<PhotoUpload 
  fieldPath="section_nouvelle.photos_field"
  label="Photos du..."
  multiple={true}
  maxFiles={5}
/>
```

### **Process Documentation (Aucun changement)**
- ✅ **Étapes 1-4** : Identiques (planification, BDD, FormContext, supabaseHelpers)
- ✅ **Étape 5** : Utiliser PhotoUpload (composant validé)
- ✅ **Étapes 6-7** : Identiques (intégration, tests)

---

## ✅ **AVANTAGES DE CETTE APPROCHE**

1. **✅ VALIDÉ : Migration transparente** - Architecture prête pour Google Drive
2. **✅ VALIDÉ : Testabilité** - Composant battle-tested sur FicheClefs
3. **✅ VALIDÉ : Évolutivité** - Interface prête pour autres providers
4. **✅ VALIDÉ : Maintenabilité** - Code découplé et modulaire
5. **✅ VALIDÉ : Réutilisabilité** - Composant indépendant du storage
6. **🔄 EN COURS : Économies** - Migration gratuite Supabase → Google Drive
7. **🔄 EN COURS : Organisation** - Structure automatique professionnelle
8. **✅ VALIDÉ : Performance** - URLs directes, suppression optimisée

---

## 🚀 **RECOMMANDATION FINALE**

**✅ PHASE 1 TERMINÉE AVEC SUCCÈS !**

**Prochaine action : Phase 2 - Migration Google Drive**
1. Créer l'interface abstraite
2. Implémenter GoogleDriveProvider
3. Tester avec credentials personnels
4. Valider FicheClefs avec Google Drive
5. Déployer en production

**Le composant PhotoUpload est maintenant PRODUCTION-READY !** 🎉

---

**📅 Dernière mise à jour :** 03 juillet 2025  
**👤 Responsable :** Julien  
**🔄 Version :** 2.0 - Phase 1 terminée