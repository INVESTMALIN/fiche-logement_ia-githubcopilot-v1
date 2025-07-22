# 🏗️ ARCHITECTURE - Fiche Logement Letahost

*Application React de remplacement Jotform pour conciergerie immobilière*

---

## 🎯 **Vue d'Ensemble**

Application web "mobile-first" développée pour Letahost, remplaçant les processus Jotform par une solution React modulaire permettant aux coordinateurs terrain de collecter, sauvegarder et modifier les données des propriétés en temps réel via 22 sections de formulaire structurées.

### **Stack Technique**

- **Frontend** : React 18 + Vite + Tailwind CSS
- **Routage** : React Router DOM  
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Functions)
- **Automatisation** : Make.com (webhook + Google Drive)
- **Génération PDF** : html2pdf.js (pagination intelligente)
- **Upload multimédia** : Supabase Storage (temporaire) → Google Drive (définitif)
- **Déploiement** : Vercel

---

## 🧠 **Architecture FormContext**

### **Gestion d'État Centralisée**

Le cœur de l'application repose sur un `FormContext` unique gérant toutes les données des 22 sections :

```javascript
// FormContext.jsx - Structure centralisée
const FormProvider = ({ children }) => {
  const [formData, setFormData] = useState(initialFormData)
  const [currentStep, setCurrentStep] = useState(0)
  const [saveStatus, setSaveStatus] = useState({ saving: false, saved: false, error: null })
  
  // API centralisée
  const api = {
    // Navigation
    next, back, goTo, getCurrentSection,
    
    // Données  
    getField, updateField, updateSection,
    
    // Persistence
    handleSave, handleLoad, 
    
    // Statuts
    handleFinaliser, updateStatut
  }
}
```

### **Pattern de Développement Établi**

**Template obligatoire pour toutes les sections :**

```javascript
export default function FicheNouvelle() {
  const { 
    next, back, currentStep, totalSteps,
    getField, updateField, handleSave, saveStatus 
  } = useForm()

  // IMPORTANT : Récupérer formData pour les booléens
  const formData = getField('section_nouvelle')

  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  const handleRadioChange = (field, value) => {
    updateField(field, value === 'true' ? true : (value === 'false' ? false : null))
  }

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        <div className="flex-1 p-6 bg-gray-100">
          {/* Contenu section */}
          
          {/* Messages sauvegarde - PATTERN EXACT OBLIGATOIRE */}
          {saveStatus.saving && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              ⏳ Sauvegarde en cours...
            </div>
          )}
          {saveStatus.saved && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              ✅ Sauvegardé avec succès !
            </div>
          )}
          {saveStatus.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              ❌ {saveStatus.error}
            </div>
          )}

          {/* Boutons navigation - PATTERN EXACT OBLIGATOIRE */}
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={back} disabled={currentStep === 0}>
              Retour
            </Button>
            
            {currentStep === totalSteps - 1 ? (
              // Page 22 : boutons spéciaux
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleSave} disabled={saveStatus.saving}>
                  {saveStatus.saving ? 'Sauvegarde...' : 'Enregistrer'}
                </Button>
                <Button variant="primary" onClick={handleFinaliser} disabled={saveStatus.saving}>
                  {saveStatus.saving ? 'Finalisation...' : 'Finaliser la fiche'}
                </Button>
              </div>
            ) : (
              // Pages normales
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleSave} disabled={saveStatus.saving}>
                  {saveStatus.saving ? 'Sauvegarde...' : 'Enregistrer'}
                </Button>
                <Button variant="primary" onClick={next}>
                  Suivant
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### **Structure initialFormData**

```javascript
const initialFormData = {
  // Métadonnées
  id: null,
  user_id: null,
  nom: "Nouvelle fiche",
  statut: "Brouillon", // Brouillon → Complété → Archivé
  created_at: null,
  updated_at: null,
  
  // 22 sections structurées
  section_proprietaire: {
    prenom: "", nom: "", email: "",
    adresse: { rue: "", complement: "", ville: "", codePostal: "" }
  },
  
  section_logement: {
    // Champs Monday prioritaires
    type_propriete: "", surface: "", numero_bien: "",
    typologie: "", nombre_personnes_max: "", nombre_lits: "",
    
    // Section appartement conditionnelle
    appartement: {
      nom_residence: "", batiment: "", acces: "", 
      etage: "", numero_porte: ""
    }
  },
  
  section_clefs: {
    type_boite: "", emplacement_description: "",
    emplacement_photo: [], photos: [], // Arrays pour multimédia
    // ... autres champs
  },
  
  // ... 19 autres sections
  section_securite: {
    equipements: [], // Array checkboxes
    alarme_desarmement: "",
    photos_equipements_securite: [] // Array photos
  }
}
```

---

## 🗄️ **Base de Données Supabase**

### **Table Unique : `fiches`**

Architecture "flat table" avec 750+ colonnes pour performance et simplicité :

```sql
-- Métadonnées
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID REFERENCES auth.users(id)
nom TEXT DEFAULT 'Nouvelle fiche'
statut TEXT DEFAULT 'Brouillon' -- Brouillon/Complété/Archivé
created_at TIMESTAMP DEFAULT now()
updated_at TIMESTAMP DEFAULT now()

-- Pattern de nommage : {section}_{champ}
-- Section Propriétaire
proprietaire_prenom TEXT
proprietaire_nom TEXT  
proprietaire_email TEXT
proprietaire_adresse_rue TEXT
proprietaire_adresse_complement TEXT
proprietaire_adresse_ville TEXT
proprietaire_adresse_code_postal TEXT

-- Section Logement (champs Monday prioritaires)
logement_type_propriete TEXT
logement_surface INTEGER
logement_numero_bien TEXT
logement_typologie TEXT
logement_nombre_personnes_max TEXT
logement_nombre_lits TEXT

-- Section Appartement (conditionnel)
logement_appartement_nom_residence TEXT
logement_appartement_batiment TEXT
logement_appartement_acces TEXT
logement_appartement_etage TEXT
logement_appartement_numero_porte TEXT

-- Sections avec photos (pattern TEXT[])
clefs_emplacement_photo TEXT[]
clefs_interphone_photo TEXT[]
clefs_photos TEXT[]
equipements_poubelle_photos TEXT[]
chambres_chambre_1_photos_chambre TEXT[]
-- ... 39 champs multimédia au total

-- URLs PDF pour Make
pdf_logement_url TEXT
pdf_menage_url TEXT
```

### **Mapping Bidirectionnel**

Le fichier `supabaseHelpers.js` assure la conversion FormContext ↔ Supabase :

```javascript
// FormContext → Supabase  
export const mapFormDataToSupabase = (formData) => ({
  nom: formData.nom || 'Nouvelle fiche',
  statut: formData.statut || 'Brouillon',
  
  // Propriétaire
  proprietaire_prenom: formData.section_proprietaire?.prenom || null,
  proprietaire_email: formData.section_proprietaire?.email || null,
  
  // Logement  
  logement_numero_bien: formData.section_logement?.numero_bien || null,
  logement_surface: formData.section_logement?.surface ? 
    parseInt(formData.section_logement.surface) : null,
    
  // Photos (arrays)
  clefs_photos: formData.section_clefs?.photos || [],
  equipements_poubelle_photos: formData.section_equipements?.poubelle_photos || [],
  
  // Booléens (important : ?? null pour préserver true/false/null)
  clefs_ttlock_masterpin: formData.section_clefs?.ttlock_masterpin ?? null,
  
  updated_at: new Date().toISOString()
})

// Supabase → FormContext
export const mapSupabaseToFormData = (supabaseData) => ({
  id: supabaseData.id,
  nom: supabaseData.nom,
  statut: supabaseData.statut,
  
  section_proprietaire: {
    prenom: supabaseData.proprietaire_prenom || "",
    email: supabaseData.proprietaire_email || ""
  },
  
  section_clefs: {
    photos: supabaseData.clefs_photos || [],
    ttlock_masterpin: supabaseData.clefs_ttlock_masterpin ?? null
  }
  // ... mapping complet
})
```

---

## 📸 **Architecture Multimédia**

### **Workflow Upload Photos**

```mermaid
graph TD
    A[📷 PhotoUpload] --> B[Compression automatique]
    B --> C[Upload Supabase Storage temporaire]
    C --> D[URLs sauvées FormContext TEXT[]]
    D --> E[Finalisation fiche]
    E --> F[Webhook Make déclenché]
    F --> G[Make télécharge via HTTP GET]
    G --> H[Migration Google Drive + nettoyage Storage]
```

### **Composant PhotoUpload**

```javascript
<PhotoUpload 
  fieldPath="section_clefs.photos"
  label="Photos des clefs"
  multiple={true}
  maxFiles={10}
  capture={true}
  acceptVideo={false}
/>
```

**Fonctionnalités :**
- ✅ **Compression automatique** (qualité adaptative selon taille)
- ✅ **Upload Supabase Storage** vers `fiche-photos` bucket PUBLIC
- ✅ **Structure organisée** : `user-{id}/fiche-{numero_bien}/section/field/`
- ✅ **Gestion erreurs robuste** + feedback temps réel
- ✅ **Support mobile** : caméra + galerie + drag&drop

### **Génération PDF Automatique**

```javascript
// PDFUpload.jsx - Génération simultanée
const generateAndUploadPDF = async () => {
  // 1. PDF Logement via iframe /print-pdf?fiche={id}
  const logementBlob = await generatePDFBlob(`/print-pdf?fiche=${formData.id}`)
  
  // 2. PDF Ménage via iframe /print-pdf-menage?fiche={id}  
  const menageBlob = await generatePDFBlob(`/print-pdf-menage?fiche=${formData.id}`)
  
  // 3. Upload simultané vers bucket fiche-pdfs
  await uploadToSupabase('fiche-logement-{numero_bien}.pdf', logementBlob)
  await uploadToSupabase('fiche-menage-{numero_bien}.pdf', menageBlob)
  
  // 4. Seul le PDF logement est téléchargeable depuis le front
  setPdfUrl(logementUrl)
}
```

**Architecture PDF :**
- ✅ **html2pdf.js** avec pagination intelligente
- ✅ **2 templates** : PDFTemplate (complet) + PDFMenageTemplate (filtré)
- ✅ **Upload automatique** vers bucket `fiche-pdfs` PUBLIC
- ✅ **Pattern nommage** : `fiche-{type}-{numero_bien}.pdf`

### **Nettoyage Storage Automatique**

```javascript
// Fonction cleanup-storage (tous les 40 jours)
const cleanupOldFiles = async () => {
  // Supprime fichiers Supabase Storage > 40 jours
  // Car fichiers migrés vers Google Drive via Make
}
```

---

## 🔗 **Automatisation Make.com**

### **Webhook Optimisé (BUG #004 résolu)**

**Problème initial :** Payload 750+ colonnes ingérable dans Make

**Solution :** Trigger SQL avec payload structuré optimisé

```sql
-- Trigger actuel en production : fiche_any_update_webhook
-- Fonction actuelle : notify_fiche_completed()

CREATE OR REPLACE FUNCTION public.notify_fiche_completed()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- ⚠️ AMÉLIORATION RECOMMANDÉE : Ajouter protection doublons
  -- IF NEW.statut = 'Complété' AND (OLD.statut IS NULL OR OLD.statut != 'Complété') THEN
  
  -- Version actuelle : déclenché à chaque fois que statut = "Complété"
  IF NEW.statut = 'Complété' THEN
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/ydjwftmd7czs4rygv1rjhi6u4pvb4gdj',
      body := jsonb_build_object(
        -- 📋 MÉTADONNÉES (5 champs)
        'id', NEW.id,
        'nom', NEW.nom,
        'statut', NEW.statut,
        'created_at', NEW.created_at,
        'updated_at', NEW.updated_at,
        
        -- 👤 PROPRIÉTAIRE (7 champs structurés)
        'proprietaire', jsonb_build_object(
          'prenom', NEW.proprietaire_prenom,
          'nom', NEW.proprietaire_nom,
          'email', NEW.proprietaire_email,
          'adresse_rue', NEW.proprietaire_adresse_rue,
          'adresse_complement', NEW.proprietaire_adresse_complement,
          'adresse_ville', NEW.proprietaire_adresse_ville,
          'adresse_code_postal', NEW.proprietaire_adresse_code_postal
        ),
        
        -- 🏠 LOGEMENT (6 champs Monday)
        'logement', jsonb_build_object(
          'numero_bien', NEW.logement_numero_bien,
          'type_propriete', NEW.logement_type_propriete,
          'typologie', NEW.logement_typologie,
          'surface', NEW.logement_surface,
          'nombre_personnes_max', NEW.logement_nombre_personnes_max,
          'nombre_lits', NEW.logement_nombre_lits
        ),
        
        -- 📄 PDFS (2 URLs)
        'pdfs', jsonb_build_object(
          'logement_url', NEW.pdf_logement_url,
          'menage_url', NEW.pdf_menage_url
        ),
        
        -- 📸 MÉDIAS (39 champs organisés par section) - NOMS RÉELS SUPABASE
        'media', jsonb_build_object(
          -- Section Clefs (5 champs)
          'clefs_emplacement_photo', NEW.clefs_emplacement_photo,
          'clefs_interphone_photo', NEW.clefs_interphone_photo,
          'clefs_tempo_gache_photo', NEW.clefs_tempo_gache_photo,
          'clefs_digicode_photo', NEW.clefs_digicode_photo,
          'clefs_photos', NEW.clefs_photos,
          
          -- Section Équipements (4 champs)
          'equipements_poubelle_photos', NEW.equipements_poubelle_photos,
          'equipements_disjoncteur_photos', NEW.equipements_disjoncteur_photos,
          'equipements_vanne_eau_photos', NEW.equipements_vanne_eau_photos,
          'equipements_chauffage_eau_photos', NEW.equipements_chauffage_eau_photos,
          
          -- Section Gestion Linge (2 champs)
          'linge_photos_linge', NEW.linge_photos_linge,
          'linge_emplacement_photos', NEW.linge_emplacement_photos,
          
          -- Section Chambres (6 champs)
          'chambres_chambre_1_photos', NEW.chambres_chambre_1_photos_chambre,
          'chambres_chambre_2_photos', NEW.chambres_chambre_2_photos_chambre,
          'chambres_chambre_3_photos', NEW.chambres_chambre_3_photos_chambre,
          'chambres_chambre_4_photos', NEW.chambres_chambre_4_photos_chambre,
          'chambres_chambre_5_photos', NEW.chambres_chambre_5_photos_chambre,
          'chambres_chambre_6_photos', NEW.chambres_chambre_6_photos_chambre,
          
          -- Section Salles de Bains (6 champs)
          'salle_de_bain_1_photos', NEW.salle_de_bains_salle_de_bain_1_photos_salle_de_bain,
          'salle_de_bain_2_photos', NEW.salle_de_bains_salle_de_bain_2_photos_salle_de_bain,
          'salle_de_bain_3_photos', NEW.salle_de_bains_salle_de_bain_3_photos_salle_de_bain,
          'salle_de_bain_4_photos', NEW.salle_de_bains_salle_de_bain_4_photos_salle_de_bain,
          'salle_de_bain_5_photos', NEW.salle_de_bains_salle_de_bain_5_photos_salle_de_bain,
          'salle_de_bain_6_photos', NEW.salle_de_bains_salle_de_bain_6_photos_salle_de_bain,
          
          -- Section Cuisines (7 champs)
          'cuisine1_cuisiniere_photo', NEW.cuisine_1_cuisiniere_photo,
          'cuisine1_plaque_cuisson_photo', NEW.cuisine_1_plaque_cuisson_photo,
          'cuisine1_four_photo', NEW.cuisine_1_four_photo,
          'cuisine1_micro_ondes_photo', NEW.cuisine_1_micro_ondes_photo,
          'cuisine1_lave_vaisselle_photo', NEW.cuisine_1_lave_vaisselle_photo,
          'cuisine1_cafetiere_photo', NEW.cuisine_1_cafetiere_photo,
          'cuisine2_photos_tiroirs_placards', NEW.cuisine_2_photos_tiroirs_placards,
          
          -- Section Salon/SAM (1 champ)
          'salon_sam_photos', NEW.salon_sam_photos_salon_sam,
          
          -- Section Équipements Spéciaux/Extérieur (3 champs)
          'exterieur_photos_espaces', NEW.equip_spe_ext_exterieur_photos,
          'jacuzzi_photos_jacuzzi', NEW.equip_spe_ext_jacuzzi_photos,
          'barbecue_photos', NEW.equip_spe_ext_barbecue_photos,
          
          -- Section Communs (1 champ)
          'communs_photos_espaces', NEW.communs_photos_espaces_communs,
          
          -- Section Bébé (1 champ)
          'bebe_photos_equipements', NEW.bebe_photos_equipements_bebe,
          
          -- Section Guide d'accès (2 champs)
          'guide_acces_photos_etapes', NEW.guide_acces_photos_etapes,
          'guide_acces_video_acces', NEW.guide_acces_video_acces,
          
          -- Section Sécurité (1 champ)
          'securite_photos_equipements', NEW.securite_photos_equipements_securite
        )
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Trigger associé
CREATE TRIGGER fiche_any_update_webhook
  AFTER UPDATE ON public.fiches
  FOR EACH ROW
  EXECUTE FUNCTION notify_fiche_completed();
```

### **Payload Reçu par Make**

```json
{
  "id": "cc23d9bb-8f62-4a8b-b230-c7496b881606",
  "nom": "Bien 1137", 
  "statut": "Complété",
  "created_at": "2025-07-10T19:00:00Z",
  "updated_at": "2025-07-10T21:00:00Z",
  
  "proprietaire": {
    "prenom": "Maryse",
    "nom": "ROCHER", 
    "email": "maryse.rocher@email.com",
    "adresse_rue": "123 Rue Example",
    "adresse_ville": "Nice"
  },
  
  "logement": {
    "numero_bien": "1137",
    "type_propriete": "Appartement",
    "surface": 85,
    "typologie": "T3",
    "nombre_personnes_max": "6",
    "nombre_lits": "3"
  },
  
  "pdfs": {
    "logement_url": "https://xyz.supabase.co/storage/v1/object/public/fiche-pdfs/fiche-logement-1137.pdf",
    "menage_url": "https://xyz.supabase.co/storage/v1/object/public/fiche-pdfs/fiche-menage-1137.pdf"
  },
  
  "media": {
    "clefs_photos": ["https://xyz.supabase.co/.../clefs_photo1.png"],
    "equipements_poubelle_photos": ["https://xyz.supabase.co/.../poubelle.png"],
    "linge_photos_linge": ["https://xyz.supabase.co/.../linge1.png"],
    "chambres_chambre_1_photos": ["https://xyz.supabase.co/.../chambre1.png"],
    "salle_de_bain_1_photos": ["https://xyz.supabase.co/.../sdb1.png"],
    "cuisine1_cuisiniere_photo": ["https://xyz.supabase.co/.../cuisiniere.png"],
    "securite_photos_equipements": ["https://xyz.supabase.co/.../securite1.png"],
    // ... 39 champs photos au total
  }
}
```

### **Workflow Make → Google Drive**

```mermaid
graph TD
    A[Webhook reçu] --> B[Statut = "Complété" automatique]
    B --> C[HTTP GET PDF Logement + Ménage]
    C --> D[Create Folder Drive structure]
    D --> E[Iterator sur 39 champs photos]
    E --> F[HTTP GET chaque photo]
    F --> G[Upload organisé par sections]
    G --> H[Update Monday.com]
```

### **Avantages du Système Actuel**

- ✅ **Payload optimisé** : 58 champs structurés vs 750+ colonnes plates
- ✅ **Interface Make utilisable** : Mapping simple et intuitif  
- ✅ **Structure logique** : metadata → proprietaire → logement → pdfs → media
- ✅ **Toutes les photos organisées** : 39 champs par section
- ✅ **Évolutivité** : Ajout facile nouveaux champs sans casser l'existant

---

## 🔐 **Authentification & Rôles**

### **Système de Permissions**

```javascript
// Rôles utilisateur
const USER_ROLES = {
  COORDINATEUR: 'coordinateur',    // CRUD ses propres fiches
  ADMIN: 'admin',                  // Lecture toutes les fiches (peu utilisé)  
  SUPER_ADMIN: 'super_admin'       // CRUD toutes fiches + gestion utilisateurs
}

// RLS Supabase
CREATE POLICY "Coordinateur voir ses fiches" ON fiches 
  FOR SELECT USING (user_id = auth.uid())

CREATE POLICY "Super admin voir toutes fiches" ON fiches 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  )
```

### **AuthContext**

```javascript
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  
  // Gestion session + role
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setAuthLoading(false)
      }
    )
    return () => subscription?.unsubscribe()
  }, [])
  
  const getUserRole = () => user?.user_metadata?.role || 'coordinateur'
  const isAdmin = () => ['admin', 'super_admin'].includes(getUserRole())
  const isSuperAdmin = () => getUserRole() === 'super_admin'
}
```

---

## 📋 **Workflow Complet**

### **Cycle de Vie d'une Fiche**

1. **Création** : Coordinateur crée fiche (statut: "Brouillon")
2. **Remplissage** : Navigation 22 sections avec sauvegarde auto
3. **Upload multimédia** : Photos → Supabase Storage temporaire
4. **Génération PDF** : 2 PDF créés simultanément 
5. **Finalisation** : Statut → "Complété" déclenche webhook
6. **Automatisation** : Make migre tout vers Google Drive
7. **Monday.com** : Mise à jour projet avec URLs PDF
8. **Nettoyage** : Cleanup Storage automatique (40 jours)

### **États des Fiches**

- **Brouillon** : En cours de remplissage (modifiable)
- **Complété** : Finalisée, webhook déclenché (toujours modifiable)  
- **Archivé** : Masquée des listes (restaurable)

---

## 🔧 **Configuration Environnement**

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Make.com 
WEBHOOK_URL=https://hook.eu2.make.com/webhook-id

# Upload
MAX_FILE_SIZE_MB=20
COMPRESSION_QUALITY=0.95
```

---

## 🏆 **Métriques de Performance**

- **22 sections** complètes avec logique conditionnelle
- **750+ colonnes** Supabase avec mapping automatique
- **39 champs multimédia** organisés pour Make
- **2 PDF simultanés** avec pagination intelligente
- **Webhook optimisé** 58 champs vs 750+ (95% de réduction)
- **Temps config Make** réduit de 83% (3h → 30min)
- **Compression images** automatique selon taille fichier
- **Nettoyage Storage** automatique évite surcoûts

---

*📝 Architecture validée en production - Dernière mise à jour : 18 juillet 2025*