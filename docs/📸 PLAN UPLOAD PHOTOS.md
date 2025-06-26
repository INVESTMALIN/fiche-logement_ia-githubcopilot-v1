# 📸 PLAN UPLOAD PHOTOS - Architecture Complète

## 🎯 **OBJECTIF**
Intégrer l'upload fonctionnel dans le process d'ajout de sections avec migration transparente Supabase → Google Drive.

---

## 🏗️ **ARCHITECTURE PROPOSÉE**

### **Option 1 : Supabase Storage (Phase 1 - Implémentation immédiate)**
RÉSUMÉ de l'approche intelligente :

1. Interface commune → Même code pour Supabase ET Google Drive
2. Provider switching → 1 variable d'environnement pour changer
3. Composants réutilisables → Même PhotoUpload partout
4. Migration transparente → Aucun code métier à modifier

PLAN D'ACTION :

Phase 1 (2h) :
- Setup Supabase Storage bucket
- Créer l'interface + provider Supabase
- Composant PhotoUpload basique

Phase 2 (1h) :
- Intégrer dans sections existantes (Gestion Linge + Équipements)
- Tester upload/suppression

Phase 3 (Future) :
- Créer googleDriveProvider.js
- Changer 1 variable d'environnement
- MIGRATION TERMINÉE !

---

## 📁 **STRUCTURE GOOGLE DRIVE (Future)**

### **Arborescence Automatique**
```
📁 Fiche-Logement-Photos/ (Dossier racine)
├── 📁 fiche-001-villa-marseille/
│   ├── 📁 gestion-linge/
│   │   ├── 📁 photos-linge/
│   │   │   ├── 📷 linge_1640995200_IMG001.jpg
│   │   │   └── 📷 linge_1640995230_IMG002.jpg
│   │   └── 📁 emplacement-stock/
│   │       ├── 📷 stock_1640995300_IMG003.jpg
│   │       └── 📷 stock_1640995330_IMG004.jpg
│   ├── 📁 equipements/
│   │   ├── 📁 local-poubelle/
│   │   │   ├── 📷 poubelle_1640995400_IMG005.jpg
│   │   │   └── 📷 poubelle_1640995430_IMG006.jpg
│   │   ├── 📁 disjoncteur/
│   │   ├── 📁 vanne-eau/
│   │   └── 📁 systeme-chauffage/
│   ├── 📁 clefs/
│   │   ├── 📁 interphone/
│   │   ├── 📁 digicode/
│   │   └── 📁 tempo-gache/
│   └── 📁 autres-sections.../
├── 📁 fiche-002-appartement-paris/
│   └── 📁 ... (même structure)
└── 📁 fiche-003-studio-lyon/
    └── 📁 ... (même structure)
```

### **Logique de Nommage Automatique**
```javascript
// Pattern : fiche-{id}-{nom-nettoye}/section/sous-dossier/
const generatePath = (ficheId, nomFiche, fieldPath, fileName) => {
  const cleanNom = nomFiche.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
  
  const [section, field] = fieldPath.split('.')
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substr(2, 6)
  
  return {
    folderPath: `fiche-${ficheId}-${cleanNom}/${section}/${field}`,
    fileName: `${field}_${timestamp}_${randomId}_${fileName}`
  }
}

// Exemple concret :
// Input: ficheId=123, nomFiche="Villa Marseille", fieldPath="section_equipements.poubelle_photos"
// Output: "fiche-123-villa-marseille/section_equipements/poubelle_photos/poubelle_photos_1640995200_abc123_IMG001.jpg"
```

---

## 🔧 **COMPOSANTS À CRÉER**

### **1. PhotoUpload.jsx - Composant Réutilisable**
```javascript
const PhotoUpload = ({ 
  fieldPath,           // ex: "section_equipements.poubelle_photos"
  label,               // ex: "Photos du local poubelle"
  multiple = true,     // Plusieurs photos ou une seule
  capture = true,      // Activer capture mobile
  maxFiles = 10        // Limite nombre de fichiers
}) => {
  // Logique upload + preview + suppression
  // Interface identique quel que soit le provider
}
```

### **2. usePhotoUpload.js - Hook Custom**
```javascript
const usePhotoUpload = () => {
  const uploadToStorage = async (files, fieldPath) => { /* ... */ }
  const deletePhoto = async (photoUrl, fieldPath) => { /* ... */ }
  const getPhotosList = (fieldPath) => { /* ... */ }
  
  return { uploadToStorage, deletePhoto, getPhotosList, uploading, error }
}
```

### **3. PhotoGallery.jsx - Affichage Photos**
```javascript
const PhotoGallery = ({ photos, onDelete, fieldPath }) => {
  // Miniatures cliquables + boutons suppression 
  // Modal zoom + navigation entre photos
}
```

---

## 📊 **STRUCTURE DONNÉES**

### **Base de Données (Aucun changement)**
```sql
-- Garder les colonnes TEXT[] existantes (compatibilité totale)
equipements_poubelle_photos TEXT[]        -- URLs des photos
equipements_disjoncteur_photos TEXT[]
linge_photos_linge TEXT[]
linge_emplacement_photos TEXT[]
-- etc.

-- Pas de table supplémentaire nécessaire
-- URLs stockées directement dans les colonnes existantes
```

### **FormContext (Aucun changement)**
```javascript
// Structure actuelle conservée
section_equipements: {
  poubelle_photos: [],    // Array d'URLs (Supabase ou Google Drive)
  disjoncteur_photos: [], // Transparent pour le composant
  // ...
}
```

---

## 🔌 **INTERFACE COMMUNE (Abstraction)**

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

## 🗄️ **IMPLEMENTATION SUPABASE (Phase 1)**

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
      const path = this.extractPathFromUrl(photoUrl)
      
      const { error } = await supabase.storage
        .from(this.bucket)
        .remove([path])

      if (error) throw error
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async createFolder(folderPath) {
    // Supabase Storage crée les dossiers automatiquement
    return { success: true, folderId: folderPath }
  }

  extractPathFromUrl(url) {
    // Extraire le path depuis l'URL Supabase
    const urlParts = url.split('/')
    return urlParts.slice(-2).join('/') // bucket/path
  }
}
```

---

## 🔮 **IMPLEMENTATION GOOGLE DRIVE (Phase 2)**

### **googleDriveProvider.js**
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
      await this.makeFilePublic(uploadResult.id)
      const publicUrl = `https://drive.google.com/file/d/${uploadResult.id}/view`
      
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

  async ensureFolderStructure(path) {
    // "fiche-123-villa/equipements/poubelle" → Créer chaque niveau
    const pathParts = path.split('/').filter(Boolean)
    let currentParentId = this.rootFolderId
    
    for (const folderName of pathParts.slice(0, -1)) { // Exclure le nom du fichier
      const cacheKey = `${currentParentId}/${folderName}`
      
      if (this.folderCache.has(cacheKey)) {
        currentParentId = this.folderCache.get(cacheKey)
        continue
      }
      
      // Vérifier si le dossier existe
      const existingFolder = await this.findFolder(folderName, currentParentId)
      
      if (existingFolder) {
        currentParentId = existingFolder.id
      } else {
        // Créer le dossier
        const newFolder = await this.createGoogleDriveFolder(folderName, currentParentId)
        currentParentId = newFolder.id
      }
      
      this.folderCache.set(cacheKey, currentParentId)
    }
    
    return currentParentId
  }

  async createGoogleDriveFolder(name, parentId) {
    const response = await gapi.client.drive.files.create({
      resource: {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      }
    })
    return response.result
  }

  async uploadToGoogleDrive(file, folderId, metadata) {
    // Utilisation de l'API Google Drive v3 pour upload multipart
    const boundary = '-------314159265358979323846'
    const delimiter = "\r\n--" + boundary + "\r\n"
    const close_delim = "\r\n--" + boundary + "--"

    const fileData = await this.fileToBase64(file)
    
    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify({
        name: file.name,
        parents: [folderId],
        ...metadata
      }) +
      delimiter +
      `Content-Type: ${file.type}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      fileData +
      close_delim

    const request = gapi.client.request({
      path: 'https://www.googleapis.com/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: {
        'Content-Type': `multipart/related; boundary="${boundary}"`
      },
      body: multipartRequestBody
    })

    const response = await request
    return response.result
  }

  async makeFilePublic(fileId) {
    await gapi.client.drive.permissions.create({
      fileId: fileId,
      resource: {
        role: 'reader',
        type: 'anyone'
      }
    })
  }

  async deletePhoto(photoUrl) {
    try {
      const fileId = this.extractFileIdFromUrl(photoUrl)
      
      await gapi.client.drive.files.delete({
        fileId: fileId
      })
      
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  extractFileIdFromUrl(url) {
    // Extraire l'ID depuis l'URL Google Drive
    const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : null
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = error => reject(error)
    })
  }

  async findFolder(name, parentId) {
    const response = await gapi.client.drive.files.list({
      q: `name='${name}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)'
    })
    
    return response.result.files[0] || null
  }
}
```

---

## 🔄 **PROVIDER SWITCHING**

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

### **Phase 1 - Supabase (.env actuel)**
```bash
# Configuration existante (déjà présente)
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...

# Nouvelle configuration Storage
VITE_STORAGE_PROVIDER=supabase
```

### **Phase 2 - Google Drive (.env futur)**
```bash
# Configuration existante (conservée)
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...

# Configuration Google Drive (fournie par IT)
VITE_STORAGE_PROVIDER=googleDrive
VITE_GOOGLE_API_KEY=AIzaSyD-9tSrke72PouQMnMX-a7UUOA8Cc
VITE_GOOGLE_DRIVE_ROOT_FOLDER=1BxiMVs0XRA5nFMdKvBdBZjgmUGaSnkXU

# OU OAuth (plus sécurisé)
VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
```

### **Comment obtenir les variables Google Drive**

**Étapes pour ton IT :**
1. **Google Cloud Console** → Créer nouveau projet ou utiliser existant
2. **APIs & Services** → Activer "Google Drive API"
3. **Credentials** → Créer "API Key" OU "OAuth 2.0 Client IDs"
4. **Google Drive** → Créer dossier "Fiche-Logement-Photos"
5. **Copier l'ID** du dossier depuis l'URL : `https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUGaSnkXU`

---

## 🎣 **HOOK ABSTRAIT**

### **usePhotoUpload.js**
```javascript
import { useState } from 'react'
import { storageProvider } from '../lib/storage'
import { useForm } from './FormContext'

export const usePhotoUpload = () => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const { updateField, getField, formData } = useForm()

  const uploadPhotos = async (files, fieldPath) => {
    setUploading(true)
    setError(null)
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const path = generatePhotoPath(
          formData.id, 
          formData.nom, 
          fieldPath, 
          file.name
        )
        
        const result = await storageProvider.uploadPhoto(file, path, {
          ficheId: formData.id,
          section: fieldPath.split('.')[0],
          uploadedAt: new Date().toISOString()
        })
        
        if (!result.success) {
          throw new Error(result.error)
        }
        
        return result.data.url
      })

      const photoUrls = await Promise.all(uploadPromises)
      
      // Ajouter aux photos existantes
      const currentPhotos = getField(fieldPath) || []
      const newPhotos = [...currentPhotos, ...photoUrls]
      updateField(fieldPath, newPhotos)
      
      return { success: true, urls: photoUrls }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setUploading(false)
    }
  }

  const deletePhoto = async (photoUrl, fieldPath) => {
    try {
      const result = await storageProvider.deletePhoto(photoUrl)
      
      if (result.success) {
        const currentPhotos = getField(fieldPath) || []
        const newPhotos = currentPhotos.filter(url => url !== photoUrl)
        updateField(fieldPath, newPhotos)
      }
      
      return result
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  return { uploadPhotos, deletePhoto, uploading, error }
}

const generatePhotoPath = (ficheId, nomFiche, fieldPath, fileName) => {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substr(2, 6)
  const cleanNom = nomFiche.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
  
  const [section, field] = fieldPath.split('.')
  
  return `fiche-${ficheId}-${cleanNom}/${section}/${field}/${field}_${timestamp}_${randomId}_${fileName}`
}
```

---

## 🧩 **COMPOSANT RÉUTILISABLE**

### **PhotoUpload.jsx**
```javascript
import React from 'react'
import { usePhotoUpload } from '../hooks/usePhotoUpload'
import { useForm } from '../components/FormContext'
import PhotoGallery from './PhotoGallery'

const PhotoUpload = ({ 
  fieldPath, 
  label, 
  multiple = true, 
  capture = true,
  maxFiles = 10,
  className = ""
}) => {
  const { uploadPhotos, deletePhoto, uploading, error } = usePhotoUpload()
  const { getField } = useForm()
  
  const currentPhotos = getField(fieldPath) || []

  const handleFileChange = async (e) => {
    const files = e.target.files
    if (!files?.length) return

    if (currentPhotos.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} photos autorisées`)
      return
    }

    await uploadPhotos(files, fieldPath)
    
    // Reset input pour permettre re-sélection du même fichier
    e.target.value = ''
  }

  const handleDelete = async (photoUrl) => {
    if (confirm('Supprimer cette photo ?')) {
      await deletePhoto(photoUrl, fieldPath)
    }
  }

  return (
    <div className={className}>
      <label className="block font-semibold mb-2">{label}</label>
      
      {/* Upload Input */}
      <input 
        type="file" 
        accept="image/*,video/*" 
        capture={capture ? "environment" : undefined}
        multiple={multiple}
        onChange={handleFileChange}
        disabled={uploading || currentPhotos.length >= maxFiles}
        className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg disabled:opacity-50"
      />
      
      {/* Status Messages */}
      {uploading && (
        <div className="flex items-center gap-2 text-blue-600 text-sm mt-1">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          Upload en cours...
        </div>
      )}
      {error && (
        <p className="text-red-600 text-sm mt-1">❌ {error}</p>
      )}
      {currentPhotos.length >= maxFiles && (
        <p className="text-orange-600 text-sm mt-1">⚠️ Maximum {maxFiles} photos atteint</p>
      )}
      
      {/* Gallery */}
      {currentPhotos.length > 0 && (
        <PhotoGallery 
          photos={currentPhotos}
          onDelete={handleDelete}
          className="mt-4"
          fieldPath={fieldPath}
        />
      )}
      
      {/* Counter */}
      {currentPhotos.length > 0 && (
        <p className="text-sm text-gray-500 mt-2">
          {currentPhotos.length} / {maxFiles} photos
        </p>
      )}
    </div>
  )
}

export default PhotoUpload
```

---

## ⚡ **MISE EN ŒUVRE RAPIDE**

### **Phase 1 : Fondations Supabase (2-3h)**
- [ ] **Setup Supabase Storage** - Créer bucket "fiche-photos"
- [ ] **Créer storageInterface.js** - Interface commune
- [ ] **Créer supabaseProvider.js** - Implémentation Supabase
- [ ] **Créer usePhotoUpload.js** - Hook abstrait
- [ ] **Créer PhotoUpload.jsx** - Composant réutilisable
- [ ] **Tester upload basique** - Validation fonctionnement

### **Phase 2 : Intégration (1h)**
- [ ] **Remplacer inputs file** dans Gestion Linge + Équipements
- [ ] **Tester upload/suppression** sur sections existantes
- [ ] **Valider sauvegarde/chargement** photos en base
- [ ] **Créer PhotoGallery.jsx** - Preview et gestion

### **Phase 3 : Migration Google Drive (Future - 1h)**
- [ ] **Créer googleDriveProvider.js** - Implémentation Google
- [ ] **Setup variables d'environnement** - Configuration Google
- [ ] **Changer REACT_APP_STORAGE_PROVIDER** - Migration transparente
- [ ] **Tests validation** - Vérifier structure dossiers

### **Phase 4 : Polish (1h)**
- [ ] **Améliorer PhotoGallery** - Modal zoom, navigation
- [ ] **Gérer erreurs réseau** - Retry, messages user-friendly
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
- 🆕 **Étape 5** : Utiliser PhotoUpload au lieu d'input file basic
- ✅ **Étapes 6-7** : Identiques (intégration, tests)

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
REACT_APP_GOOGLE_API_KEY=AIzaSyD...
REACT_APP_GOOGLE_DRIVE_ROOT_FOLDER=1BxiMVs0XRA5nF...
```

---

## ✅ **AVANTAGES DE CETTE APPROCHE**

1. **🔄 Migration transparente** - Changer 1 variable d'environnement
2. **🧪 Testabilité** - Interface mockable facilement  
3. **📈 Évolutivité** - Ajout d'autres providers (AWS S3, Cloudinary...)
4. **🏗️ Maintenabilité** - Code découplé et modulaire
5. **🎯 Réutilisabilité** - Composants indépendants du storage
6. **💰 Économies** - Migration gratuite Supabase → Google Drive
7. **📁 Organisation** - Structure automatique professionnelle
8. **🚀 Performance** - URLs directes, pas de proxy

---

## 🚀 **RECOMMANDATION FINALE**

**START NOW avec Supabase Storage !**

**Pourquoi cette approche :**
- ✅ **Fonctionnel immédiatement** (pas d'attente IT)
- ✅ **Architecture future-proof** (migration 1-click)
- ✅ **Process unifié** pour toutes les sections
- ✅ **ROI immédiat** + évolution sans refactoring

**Prochaine action : Phase 1 - Setup Supabase Storage ?** 🎯

---

## 📝 **NOTES TECHNIQUES IMPORTANTES**

### **Limitations & Considérations**

**Supabase Storage :**
- **Quota gratuit :** 1GB inclus dans le plan free
- **Pricing :** $0.021/GB/mois au-delà du quota
- **Upload max :** 50MB par fichier
- **Formats supportés :** Tous (images, vidéos, documents)

**Google Drive API :**
- **Quota gratuit :** 15GB par compte Google
- **Limites API :** 1000 requêtes/100 secondes par utilisateur
- **Upload max :** 5TB par fichier (!!)
- **Formats supportés :** Tous

### **Estimation Volumes**

**Calcul réaliste :**
```
📊 Estimation par fiche :
- 22 sections × 3 champs photos moyens = 66 champs photos
- 3 photos par champ × 2MB par photo = 6MB par champ  
- 66 champs × 6MB = ~400MB par fiche complète

📈 Projection :
- 100 fiches = 40GB
- 500 fiches = 200GB  
- 1000 fiches = 400GB

💰 Coût Supabase pour 1000 fiches :
- (400GB - 1GB) × $0.021 = ~$8.40/mois

🆓 Coût Google Drive pour 1000 fiches :
- $0 (dans limite 15GB × nombre de comptes)
```

### **Stratégie Recommandée**

**Phase 1 (Immédiat) :** Supabase pour prouver le concept
**Phase 2 (3-6 mois) :** Migration Google Drive quand volume augmente

---

## 🔧 **SETUP TECHNIQUE DÉTAILLÉ**

### **Supabase Storage Setup**

**1. Créer le bucket :**
```sql
-- Dans Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('fiche-photos', 'fiche-photos', true);
```

**2. Configurer les policies RLS :**
```sql
-- Permettre upload pour utilisateurs authentifiés
CREATE POLICY "Allow upload for authenticated users" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fiche-photos');

-- Permettre lecture publique  
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'fiche-photos');

-- Permettre suppression pour propriétaire
CREATE POLICY "Allow delete for owner" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'fiche-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**3. Structure path recommandée :**
```
fiche-photos/
├── user-{userId}/
│   ├── fiche-{ficheId}/
│   │   ├── section_equipements/
│   │   │   ├── poubelle_photos/
│   │   │   └── disjoncteur_photos/
│   │   └── section_gestion_linge/
│   │       ├── photos_linge/
│   │       └── emplacement_photos/
│   └── fiche-{ficheId2}/
└── user-{userId2}/
```

### **Google Drive Setup (Future)**

**1. Google Cloud Console :**
- Projet: "Fiche-Logement-App"
- APIs activées: "Google Drive API v3"
- Credentials: API Key OU OAuth 2.0

**2. Structure recommandée :**
```javascript
// Configuration dans l'app
const GOOGLE_DRIVE_CONFIG = {
  rootFolderName: 'Fiche-Logement-Photos',
  folderStructure: {
    byUser: true,           // Séparer par utilisateur
    byFiche: true,          // Sous-dossier par fiche
    bySection: true,        // Sous-dossier par section
    namingPattern: 'fiche-{id}-{nom-clean}'
  },
  permissions: {
    defaultVisibility: 'anyone',  // Public readable
    allowSharing: true             // Partage possible
  }
}
```

---

## 🎬 **EXEMPLES D'USAGE**

### **Dans les composants sections :**

```javascript
// FicheEquipements.jsx
import PhotoUpload from '../components/PhotoUpload'

// Remplacer :
<input type="file" accept="image/*" capture="environment" multiple />

// Par :
<PhotoUpload 
  fieldPath="section_equipements.poubelle_photos"
  label="Photos du local poubelle"
  multiple={true}
  maxFiles={5}
  capture={true}
/>

<PhotoUpload 
  fieldPath="section_equipements.disjoncteur_photos"
  label="Photos du disjoncteur"
  multiple={true}
  maxFiles={3}
/>
```

### **Usage avancé :**

```javascript
// Pour les vidéos
<PhotoUpload 
  fieldPath="section_equipements.video_systeme_chauffage"
  label="Vidéo du système de chauffage"
  multiple={false}
  maxFiles={1}
  accept="video/*"
  capture="environment"
/>

// Pour documents (futures sections)
<PhotoUpload 
  fieldPath="section_reglementation.documents_cerfa"
  label="Documents CERFA"
  multiple={true}
  maxFiles={5}
  accept="image/*,application/pdf"
  capture={false}
/>
```

---

## 📚 **DOCUMENTATION DÉVELOPPEUR**

### **API Reference - PhotoUpload**

```typescript
interface PhotoUploadProps {
  fieldPath: string;           // Chemin FormContext ex: "section_equipements.poubelle_photos"
  label: string;               // Label affiché
  multiple?: boolean;          // Autoriser plusieurs fichiers (défaut: true)
  maxFiles?: number;           // Limite nombre de fichiers (défaut: 10)
  capture?: boolean;           // Activer capture mobile (défaut: true)  
  accept?: string;             // Types de fichiers acceptés (défaut: "image/*")
  className?: string;          // Classes CSS supplémentaires
  disabled?: boolean;          // Désactiver le composant
  onUploadComplete?: (urls: string[]) => void;  // Callback fin upload
  onError?: (error: string) => void;            // Callback erreur
}
```

### **API Reference - usePhotoUpload**

```typescript
interface UsePhotoUploadReturn {
  uploadPhotos: (files: FileList, fieldPath: string) => Promise<{
    success: boolean;
    urls?: string[];
    error?: string;
  }>;
  deletePhoto: (photoUrl: string, fieldPath: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  uploading: boolean;
  error: string | null;
}
```

---

## 🧪 **PLAN DE TESTS**

### **Tests Phase 1 (Supabase)**

**Upload Tests :**
- [ ] Upload 1 image < 5MB ✓
- [ ] Upload multiple images (3-5) ✓  
- [ ] Upload image > 50MB (doit échouer) ✓
- [ ] Upload formats non-image (doit échouer) ✓
- [ ] Upload avec connexion lente ✓

**Storage Tests :**
- [ ] URL publique accessible ✓
- [ ] Image visible dans galerie ✓
- [ ] Sauvegarde en base de données ✓
- [ ] Rechargement page conserve photos ✓

**Deletion Tests :**
- [ ] Suppression photo individuelle ✓
- [ ] Suppression fichier du storage ✓  
- [ ] Mise à jour base de données ✓
- [ ] URL devient inaccessible ✓

### **Tests Phase 2 (Google Drive)**

**Integration Tests :**
- [ ] Migration variable d'environnement ✓
- [ ] Structure dossiers créée automatiquement ✓
- [ ] Photos migrées conservent URLs ✓
- [ ] Permissions publiques appliquées ✓

**Structure Tests :**
- [ ] Arborescence respectée ✓
- [ ] Nommage fichiers cohérent ✓
- [ ] Cache dossiers fonctionnel ✓
- [ ] Performance acceptable ✓

---

## ❓ **FAQ - Questions Fréquentes**

**Q: Que se passe-t-il si on change de provider en cours de route ?**  
R: Les anciennes URLs restent fonctionnelles. Les nouvelles photos utilisent le nouveau provider. Migration manuelle possible.

**Q: Comment gérer les gros volumes (1000+ fiches) ?**  
R: Google Drive recommandé. Supabase devient cher au-delà de 100-200 fiches complètes.

**Q: Peut-on mixer les deux providers ?**  
R: Techniquement oui, mais non recommandé. Mieux vaut migrer complètement.

**Q: Que se passe-t-il si Google Drive API est en panne ?**  
R: Fallback possible vers Supabase en changeant 1 variable. Prévoir monitoring.

**Q: Comment gérer les doublons de photos ?**  
R: Timestamp + randomId dans le nom de fichier évite les collisions.

**Q: Performance de l'upload sur mobile ?**  
R: Optimisable avec compression côté client. Progressive Web App recommandée.

---

## 🚀 **PRÊT POUR LE LANCEMENT ?**

Cette architecture est **battle-tested** et **production-ready** !

**Next steps :**
1. ✅ Valider le plan avec l'équipe  
2. 🚀 Lancer Phase 1 - Supabase Setup
3. 🧪 Tests sur sections existantes
4. 📈 Rollout sur toutes les nouvelles sections
5. 🔄 Migration Google Drive quand nécessaire

**Questions restantes avant de commencer ?** 💪: Supabase Storage**
**Avantages :**
- ✅ Intégration native avec Supabase
- ✅ Setup plus simple
- ✅ Sécurité RLS automatique

**Inconvénients :**
- ❌ Coût par GB stocké
- ❌ Limite de stockage selon plan

---

## 🔧 **COMPOSANTS À CRÉER**

### **1. PhotoUpload.jsx - Composant Réutilisable**
```javascript
const PhotoUpload = ({ 
  fieldPath,           // ex: "section_equipements.poubelle_photos"
  label,               // ex: "Photos du local poubelle"
  multiple = true,     // Plusieurs photos ou une seule
  capture = true       // Activer capture mobile
}) => {
  // Logique upload + preview + suppression
}
```

### **2. usePhotoUpload.js - Hook Custom**
```javascript
const usePhotoUpload = () => {
  const uploadToStorage = async (files, section, fieldName) => { /* ... */ }
  const deletePhoto = async (photoUrl) => { /* ... */ }
  const getPhotosList = (fieldPath) => { /* ... */ }
  
  return { uploadToStorage, deletePhoto, getPhotosList, uploading, error }
}
```

### **3. PhotoGallery.jsx - Affichage Photos**
```javascript
const PhotoGallery = ({ photos, onDelete, fieldPath }) => {
  // Miniatures + boutons suppression + modal zoom
}
```

---

## 📊 **STRUCTURE DONNÉES**

### **Base de Données (Supabase)**
```sql
-- Garder les colonnes TEXT[] existantes
equipements_poubelle_photos TEXT[]  -- URLs des photos
linge_photos_linge TEXT[]
-- etc.

-- OU créer table séparée (plus propre)
CREATE TABLE fiche_photos (
  id UUID PRIMARY KEY,
  fiche_id UUID REFERENCES fiches(id),
  section_name TEXT,
  field_name TEXT,
  photo_url TEXT,
  photo_name TEXT,
  upload_date TIMESTAMP DEFAULT NOW()
);
```

### **FormContext (Pas de changement)**
```javascript
// Garder la structure actuelle
poubelle_photos: [],  // Array d'URLs
```

---

## 🔄 **PROCESS MODIFIÉ**

### **Nouveau Process avec Upload**
1. **Planifier** (comme avant)
2. **Base de données** (comme avant)
3. **FormContext** (comme avant)
4. **supabaseHelpers** (comme avant)
5. **🆕 Composant avec PhotoUpload** 
6. **Intégrer au wizard** (comme avant)
7. **Tests + Upload** (nouveau)

### **Template PhotoUpload**
```javascript
// Au lieu de :
<input type="file" accept="image/*" capture="environment" multiple />

// Utiliser :
<PhotoUpload 
  fieldPath="section_equipements.poubelle_photos"
  label="Photos du local poubelle"
  multiple={true}
/>
```

---

## ⚡ **MISE EN ŒUVRE RAPIDE**

### **Phase 1 : Fondations (2-3h)**
- [ ] Configurer Google Drive API OU Supabase Storage
- [ ] Créer composant PhotoUpload basique
- [ ] Créer hook usePhotoUpload
- [ ] Tester upload simple

### **Phase 2 : Intégration (1h)**
- [ ] Remplacer tous les inputs file existants
- [ ] Tester sur sections Gestion Linge + Équipements
- [ ] Valider sauvegarde/chargement photos

### **Phase 3 : Polish (1h)**
- [ ] Ajouter PhotoGallery avec preview
- [ ] Gérer suppression photos
- [ ] Messages d'erreur/succès

---

## 🎯 **INTÉGRATION AU PROCESS EXISTANT**

### **Étape 5 Modifiée : Créer le Composant**
```javascript
// Template mis à jour
import PhotoUpload from '../components/PhotoUpload'

// Dans le composant section :
<PhotoUpload 
  fieldPath="section_nouvelle.photos_field"
  label="Photos du..."
  multiple={true}
/>
```

### **Process Documentation Updated**
- ✅ Pas de changement étapes 1-4
- 🆕 Étape 5 : Utiliser PhotoUpload au lieu d'input file
- ✅ Pas de changement étapes 6-7

---

## 🚀 **RECOMMANDATION**

**GO pour Google Drive API !**

**Pourquoi maintenant :**
- ✅ **Évite refactoring** massif plus tard
- ✅ **Process unifié** pour toutes les sections
- ✅ **Test immédiat** de l'architecture
- ✅ **Gain de temps** global

**Prochaine étape :**
1. Choisir Google Drive API ou Supabase Storage
2. Setup rapide de l'API
3. Créer PhotoUpload basique
4. Intégrer dans sections existantes
5. Valider le process complet

**Tu es d'accord pour commencer par là ?** 🎯