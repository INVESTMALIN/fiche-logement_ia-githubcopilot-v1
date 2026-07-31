# 🏗️ ARCHITECTURE - Fiche Logement Letahost

*Application React de remplacement Jotform pour conciergerie immobilière*

---

## 🎯 **Vue d'Ensemble**

Application web "mobile-first" développée pour Letahost, remplaçant les processus Jotform par une solution React modulaire permettant aux coordinateurs terrain de collecter, sauvegarder et modifier les données des propriétés en temps réel via 24 sections de formulaire structurées.

### **Stack Technique**

- **Frontend** : React 18 + Vite + Tailwind CSS
- **Routage** : React Router DOM  
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Functions)
- **Automatisation** : Make.com (webhook + Google Drive)
- **Génération PDF** : Puppeteer via service Railway (fiches) + jsPDF (assistants IA)
- **Upload multimédia** : Supabase Storage (temporaire) → Google Drive (définitif)
- **Déploiement** : Vercel

---

## 🧠 **Architecture FormContext**

### **Gestion d'État Centralisée**

Le cœur de l'application repose sur un `FormContext` unique gérant toutes les données des 23 sections (+1 section 'Finalisation'):

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
              // Page 3 : boutons spéciaux
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
  
  // 24 sections structurées
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
  
  // ... autres sections
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
-- ⚠️ Types vérifiés contre le schéma LIVE le 24/07/2026.
-- Ce bloc annonçait TEXT partout jusqu'à cette date, alors que la base
-- utilise des VARCHAR contraints. Cet écart a masqué pendant deux semaines
-- la cause de l'échec de création de la fiche 2084 (cf. PR #68) : une valeur
-- Monday trop longue faisait échouer l'INSERT sans message explicite.
-- Toute contrainte de longueur ci-dessous est réelle et bloquante.
--
-- Pour régénérer cette liste :
--   select column_name, data_type, character_maximum_length
--   from information_schema.columns
--   where table_schema='public' and table_name='fiches'
--   order by column_name;

-- Métadonnées
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID REFERENCES auth.users(id)
nom VARCHAR(255) DEFAULT 'Nouvelle fiche'
statut VARCHAR(50) DEFAULT 'Brouillon' -- Brouillon/Complété/Archivé
created_at TIMESTAMP DEFAULT now()
updated_at TIMESTAMP DEFAULT now()

-- Pattern de nommage : {section}_{champ}
-- Section Propriétaire
proprietaire_prenom VARCHAR(100)
proprietaire_nom VARCHAR(100)
proprietaire_email VARCHAR(255)
proprietaire_telephone TEXT
proprietaire_adresse_rue TEXT
proprietaire_adresse_complement TEXT
proprietaire_adresse_ville VARCHAR(100)
proprietaire_adresse_code_postal VARCHAR(10)   -- ⚠️ alimenté par l'URL Monday

-- Section Logement (champs Monday prioritaires)
logement_type_propriete VARCHAR(50)
logement_type_autre_precision VARCHAR(100)
logement_surface INTEGER                        -- ⚠️ alimenté par l'URL Monday (parseInt)
logement_numero_bien VARCHAR(50)                -- ⚠️ alimenté par l'URL Monday
logement_typologie VARCHAR(10)
logement_nombre_personnes_max VARCHAR(20)       -- ⚠️ alimenté par l'URL Monday
logement_nombre_lits TEXT
logement_nombre_etages TEXT
logement_classement TEXT
logement_type_niveau TEXT

-- Section Appartement (conditionnel)
logement_appartement_nom_residence VARCHAR(100)
logement_appartement_batiment VARCHAR(50)
logement_appartement_acces VARCHAR(20)
logement_appartement_etage VARCHAR(10)
logement_appartement_numero_porte VARCHAR(20)

-- Sections avec photos (pattern TEXT[])
clefs_emplacement_photo TEXT[]
clefs_interphone_photo TEXT[]
clefs_photos TEXT[]
equipements_poubelle_photos TEXT[]
chambres_chambre_1_photos_chambre TEXT[]
-- ... 40 champs multimédia au total

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
  // 1. Extraction du HTML rendu, via iframe sur les routes de rendu
  const htmlLogement = await extractHTMLFromIframe(`/print-pdf?fiche=${formData.id}`)
  const htmlMenage = await extractHTMLFromIframe(`/print-pdf-menage?fiche=${formData.id}`)

  // 2. Le HTML part au service Railway (Puppeteer) qui rend le PDF,
  //    l'upload dans le bucket fiche-pdfs et renvoie son URL
  const resultLogement = await fetch(`${RAILWAY_URL}/generate-pdf`, { /* htmlContent, fileName */ })
  const resultMenage = await fetch(`${RAILWAY_URL}/generate-pdf`, { /* htmlContent, fileName */ })

  // 3. Webhook Make (Drive + Monday), puis seul le PDF logement est
  //    téléchargeable depuis le front
  await triggerPdfWebhook(resultLogement.pdfUrl, resultMenage.pdfUrl)
  setPdfUrl(resultLogement.pdfUrl)
}
```

**Architecture PDF :**
- ✅ **Puppeteer côté Railway** (`page.pdf`) — les liens `<a href>` restent cliquables dans le PDF
- ✅ **2 templates** : PDFTemplate (complet) + PDFMenageTemplate (filtré, copie séparée)
- ✅ **Upload automatique** vers bucket `fiche-pdfs` PUBLIC
- ✅ **Pattern nommage** : `fiche-{type}-{numero_bien}.pdf`
- ⚠️ `html2pdf.js` n'est plus utilisé que par `PDFUploadBackup.jsx` (ancienne implémentation conservée)

> Règles de complétude du PDF logement (quels champs sortent, lesquels sont
> volontairement exclus, et les pièges du rendu groupé) : voir
> `docs/📄 PLAN UPLOAD PDF.md`, section « Règle de complétude du PDF logement ».

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
DECLARE
  media_part1 jsonb;
  media_part2 jsonb;
  media_part3 jsonb;
  media_part4 jsonb;
  media_part5 jsonb;
  media_final jsonb;
BEGIN
  IF NEW.statut = 'Complété' AND OLD.statut IS DISTINCT FROM 'Complété' THEN

    -- PARTIE 1 : Clefs + Equipements + Linge + Chambres (20 champs)
    media_part1 := jsonb_build_object(
      'clefs_emplacement_photo', NEW.clefs_emplacement_photo,
      'clefs_interphone_photo', NEW.clefs_interphone_photo,
      'clefs_tempo_gache_photo', NEW.clefs_tempo_gache_photo,
      'clefs_digicode_photo', NEW.clefs_digicode_photo,
      'clefs_photos', NEW.clefs_photos,
      'equipements_poubelle_photos', NEW.equipements_poubelle_photos,
      'equipements_disjoncteur_photos', NEW.equipements_disjoncteur_photos,
      'equipements_vanne_eau_photos', NEW.equipements_vanne_eau_photos,
      'equipements_chauffage_eau_photos', NEW.equipements_chauffage_eau_photos,
      'equipements_video_acces_poubelle', NEW.equipements_video_acces_poubelle,
      'equipements_video_systeme_chauffage', NEW.equipements_video_systeme_chauffage,
      'linge_photos_linge', NEW.linge_photos_linge,
      'linge_emplacement_photos', NEW.linge_emplacement_photos,
      'chambres_chambre_1_photos', NEW.chambres_chambre_1_photos_chambre,
      'chambres_chambre_2_photos', NEW.chambres_chambre_2_photos_chambre,
      'chambres_chambre_3_photos', NEW.chambres_chambre_3_photos_chambre,
      'chambres_chambre_4_photos', NEW.chambres_chambre_4_photos_chambre,
      'chambres_chambre_5_photos', NEW.chambres_chambre_5_photos_chambre,
      'chambres_chambre_6_photos', NEW.chambres_chambre_6_photos_chambre,
      'salle_de_bain_1_photos', NEW.salle_de_bains_salle_de_bain_1_photos_salle_de_bain
    );

    -- PARTIE 2 : Salles de bains + Cuisine 1 vidéos (19 champs)
    media_part2 := jsonb_build_object(
      'salle_de_bain_2_photos', NEW.salle_de_bains_salle_de_bain_2_photos_salle_de_bain,
      'salle_de_bain_3_photos', NEW.salle_de_bains_salle_de_bain_3_photos_salle_de_bain,
      'salle_de_bain_4_photos', NEW.salle_de_bains_salle_de_bain_4_photos_salle_de_bain,
      'salle_de_bain_5_photos', NEW.salle_de_bains_salle_de_bain_5_photos_salle_de_bain,
      'salle_de_bain_6_photos', NEW.salle_de_bains_salle_de_bain_6_photos_salle_de_bain,
      'cuisine1_refrigerateur_video', NEW.cuisine_1_refrigerateur_video,
      'cuisine1_congelateur_video', NEW.cuisine_1_congelateur_video,
      'cuisine1_mini_refrigerateur_video', NEW.cuisine_1_mini_refrigerateur_video,
      'cuisine1_cuisiniere_video', NEW.cuisine_1_cuisiniere_video,
      'cuisine1_plaque_cuisson_video', NEW.cuisine_1_plaque_cuisson_video,
      'cuisine1_four_video', NEW.cuisine_1_four_video,
      'cuisine1_micro_ondes_video', NEW.cuisine_1_micro_ondes_video,
      'cuisine1_lave_vaisselle_video', NEW.cuisine_1_lave_vaisselle_video,
      'cuisine1_cafetiere_video', NEW.cuisine_1_cafetiere_video,
      'cuisine1_bouilloire_video', NEW.cuisine_1_bouilloire_video,
      'cuisine1_grille_pain_video', NEW.cuisine_1_grille_pain_video,
      'cuisine1_blender_video', NEW.cuisine_1_blender_video,
      'cuisine1_cuiseur_riz_video', NEW.cuisine_1_cuiseur_riz_video,
      'cuisine1_machine_pain_video', NEW.cuisine_1_machine_pain_video
    );

    -- PARTIE 3 : Cuisine photos + Autres sections (18 champs)
    media_part3 := jsonb_build_object(
      'cuisine1_cuisiniere_photo', NEW.cuisine_1_cuisiniere_photo,
      'cuisine1_plaque_cuisson_photo', NEW.cuisine_1_plaque_cuisson_photo,
      'cuisine1_four_photo', NEW.cuisine_1_four_photo,
      'cuisine1_micro_ondes_photo', NEW.cuisine_1_micro_ondes_photo,
      'cuisine1_lave_vaisselle_photo', NEW.cuisine_1_lave_vaisselle_photo,
      'cuisine1_cafetiere_photo', NEW.cuisine_1_cafetiere_photo,
      'cuisine1_hotte_video', NEW.cuisine_1_hotte_video,
      'cuisine2_photos_tiroirs_placards', NEW.cuisine_2_photos_tiroirs_placards,
      'salon_sam_photos', NEW.salon_sam_photos_salon_sam,
      'exterieur_photos_espaces', NEW.equip_spe_ext_exterieur_photos,
      'jacuzzi_photos_jacuzzi', NEW.equip_spe_ext_jacuzzi_photos,
      'barbecue_photos', NEW.equip_spe_ext_barbecue_photos,
      'piscine_video', NEW.equip_spe_ext_piscine_video,
      'communs_photos_espaces', NEW.communs_photos_espaces_communs,
      'bebe_photos_equipements', NEW.bebe_photos_equipements_bebe,
      'visite_video_visite', NEW.visite_video_visite,
      'guide_acces_photos_etapes', NEW.guide_acces_photos_etapes,
      'guide_acces_video_acces', NEW.guide_acces_video_acces,
      'securite_photos_equipements', NEW.securite_photos_equipements_securite
    );

    -- PARTIE 4 : Nouveaux champs Avis + Éléments abîmés (21 champs)
    media_part4 := jsonb_build_object(
      -- Avis
      'avis_video_globale_videos', NEW.avis_video_globale_videos,
      'avis_logement_vis_a_vis_photos', NEW.avis_logement_vis_a_vis_photos,

      -- Cuisine éléments abîmés
      'cuisine1_elements_abimes_photos', NEW.cuisine_1_elements_abimes_photos,

      -- Salon/SAM éléments abîmés
      'salon_sam_salon_elements_abimes_photos', NEW.salon_sam_salon_elements_abimes_photos,
      'salon_sam_salle_manger_elements_abimes_photos', NEW.salon_sam_salle_manger_elements_abimes_photos,

      -- Chambres éléments abîmés
      'chambres_chambre_1_elements_abimes_photos', NEW.chambres_chambre_1_elements_abimes_photos,
      'chambres_chambre_2_elements_abimes_photos', NEW.chambres_chambre_2_elements_abimes_photos,
      'chambres_chambre_3_elements_abimes_photos', NEW.chambres_chambre_3_elements_abimes_photos,
      'chambres_chambre_4_elements_abimes_photos', NEW.chambres_chambre_4_elements_abimes_photos,
      'chambres_chambre_5_elements_abimes_photos', NEW.chambres_chambre_5_elements_abimes_photos,
      'chambres_chambre_6_elements_abimes_photos', NEW.chambres_chambre_6_elements_abimes_photos,

      -- Salles de bains éléments abîmés
      'salle_de_bains_salle_de_bain_1_elements_abimes_photos', NEW.salle_de_bains_salle_de_bain_1_elements_abimes_photos,
      'salle_de_bains_salle_de_bain_2_elements_abimes_photos', NEW.salle_de_bains_salle_de_bain_2_elements_abimes_photos,
      'salle_de_bains_salle_de_bain_3_elements_abimes_photos', NEW.salle_de_bains_salle_de_bain_3_elements_abimes_photos,
      'salle_de_bains_salle_de_bain_4_elements_abimes_photos', NEW.salle_de_bains_salle_de_bain_4_elements_abimes_photos,
      'salle_de_bains_salle_de_bain_5_elements_abimes_photos', NEW.salle_de_bains_salle_de_bain_5_elements_abimes_photos,
      'salle_de_bains_salle_de_bain_6_elements_abimes_photos', NEW.salle_de_bains_salle_de_bain_6_elements_abimes_photos,

      -- Équipements extérieurs éléments abîmés
      'equip_spe_ext_garage_elements_abimes_photos', NEW.equip_spe_ext_garage_elements_abimes_photos,
      'equip_spe_ext_buanderie_elements_abimes_photos', NEW.equip_spe_ext_buanderie_elements_abimes_photos,
      'equip_spe_ext_autres_pieces_elements_abimes_photos', NEW.equip_spe_ext_autres_pieces_elements_abimes_photos
    );

    -- PARTIE 5 : Nouveaux médias Équipements
    media_part5 := jsonb_build_object(
      -- TV
      'equipements_tv_video', NEW.equipements_tv_video,
      'equipements_tv_console_video', NEW.equipements_tv_console_video,
      'equipements_tv_services', NEW.equipements_tv_services,
      'equipements_tv_consoles', NEW.equipements_tv_consoles,

      -- Climatisation
      'equipements_climatisation_video', NEW.equipements_climatisation_video,

      -- Chauffage
      'equipements_chauffage_video', NEW.equipements_chauffage_video,

      -- Lave-linge
      'equipements_lave_linge_video', NEW.equipements_lave_linge_video,

      -- Sèche-linge
      'equipements_seche_linge_video', NEW.equipements_seche_linge_video,

      -- Parking
      'equipements_parking_photos', NEW.equipements_parking_photos,
      'equipements_parking_videos', NEW.equipements_parking_videos,

      -- Ventilateur
      'equipements_ventilateur_photos', NEW.equipements_ventilateur_photos,
      'equipements_ventilateur_videos', NEW.equipements_ventilateur_videos,

      -- sèche-serviette
      'equipements_seche_serviettes_photos', NEW.equipements_seche_serviettes_photos,
      'equipements_seche_serviettes_videos', NEW.equipements_seche_serviettes_videos,

      -- ménage
      'equipements_menage_aspirateur_photos', NEW.equipements_menage_aspirateur_photos,
      'equipements_menage_serpillere_photos', NEW.equipements_menage_serpillere_photos,
      'equipements_menage_balais_photos', NEW.equipements_menage_balais_photos,
      'equipements_menage_balayette_photos', NEW.equipements_menage_balayette_photos,
      'equipements_menage_autres_elements_photos', NEW.equipements_menage_autres_elements_photos

    );

    -- Fusion complète
    media_final := media_part1 || media_part2 || media_part3 || media_part4 || media_part5;

    -- Envoi vers Make
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/ydjwftmd7czs4rygv1rjhi6u4pvb4gdj',
      body := jsonb_build_object(
        'id', NEW.id,
        'nom', NEW.nom,
        'statut', NEW.statut,
        'created_at', NEW.created_at,
        'updated_at', NEW.updated_at,
        'proprietaire', jsonb_build_object(
          'prenom', NEW.proprietaire_prenom,
          'nom', NEW.proprietaire_nom,
          'email', NEW.proprietaire_email
        ),
        'logement', jsonb_build_object(
          'numero_bien', NEW.logement_numero_bien
        ),
        'pdfs', jsonb_build_object(
          'logement_url', NEW.pdf_logement_url,
          'menage_url', NEW.pdf_menage_url
        ),
        'media', media_final
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
  "statut": "Complété"
  
  "proprietaire": {
    "prenom": "Maryse",
    "nom": "ROCHER", 
    "email": "maryse.rocher@email.com"
  },
  
  "logement": {
    "numero_bien": "1137"
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
    // ... Tous les champs médias
  }
}
```

### **Workflow Make → Google Drive**

```mermaid
graph TD
    A[Webhook reçu] --> B[Statut = "Complété" automatique]
    B --> C[HTTP GET PDF Logement + Ménage]
    C --> D[Create Folder Drive structure]
    D --> E[Iterator sur 40 champs photos]
    E --> F[HTTP GET chaque photo]
    F --> G[Upload organisé par sections]
    G --> H[Update Monday.com]
```

### **Avantages du Système Actuel**

- ✅ **Payload optimisé** : 60 champs structurés vs 750+ colonnes plates
- ✅ **Interface Make utilisable** : Mapping simple et intuitif  
- ✅ **Structure logique** : metadata → proprietaire → logement → pdfs → media
- ✅ **Toutes les photos organisées** : 40 champs par section
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
-- Utilise la table profiles + fonction get_user_role()
CREATE POLICY "super_admin_all_fiches" ON fiches
  FOR ALL USING (get_user_role() = 'super_admin');

CREATE POLICY "coordinateur_own_fiches" ON fiches  
  FOR ALL USING (
    auth.uid() = user_id AND 
    get_user_role() = 'coordinateur'
  );
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
2. **Remplissage** : Navigation 24 sections avec mémoire persistante
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

- **24 sections** complètes avec logique conditionnelle
- **850+ colonnes** Supabase avec mapping automatique
- **60+ champs multimédia** organisés pour Make
- **2 PDF simultanés** avec pagination intelligente
- **Webhook optimisé** 58 champs vs 750+ (95% de réduction)
- **Compression images** automatique selon taille fichier
- **Nettoyage Storage** automatique, tous les 40 jours

---

*📝 Architecture validée en production - Dernière mise à jour : 16 oct. 2025*


## 🔗 **WEBHOOK PDF SÉPARÉ - Nouveau Système**

### **Trigger PDF Indépendant ✅**

#### **Objectif**
Permettre la synchronisation des PDF vers Drive/Monday à chaque modification de fiche, indépendamment du workflow principal de finalisation.

#### **Déclenchement**
- **Condition 1** : URLs PDF changent (première génération)
- **Condition 2** : PDF existent ET `updated_at` change (regénération après modif)
- **Fréquence** : À chaque génération/regénération de PDF
- **URL** : `https://hook.eu2.make.com/3vmb2eijfjw8nc5y68j8hp3fbw67az9q`

#### **Trigger SQL**
```sql
CREATE OR REPLACE FUNCTION public.notify_pdf_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Déclenche si PDF existent ET que updated_at change (regénération)
  IF (OLD.pdf_logement_url IS DISTINCT FROM NEW.pdf_logement_url) 
     OR (OLD.pdf_menage_url IS DISTINCT FROM NEW.pdf_menage_url)
     OR (NEW.pdf_logement_url IS NOT NULL AND NEW.pdf_menage_url IS NOT NULL AND OLD.updated_at IS DISTINCT FROM NEW.updated_at) THEN
    
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/3vmb2eijfjw8nc5y68j8hp3fbw67az9q',
      body := jsonb_build_object(
        'id', NEW.id,
        'nom', NEW.nom,
        'statut', NEW.statut,
        'updated_at', NEW.updated_at,
        'proprietaire', jsonb_build_object(
          'prenom', NEW.proprietaire_prenom,
          'nom', NEW.proprietaire_nom,
          'email', NEW.proprietaire_email
        ),
        'logement', jsonb_build_object(
          'numero_bien', NEW.logement_numero_bien
        ),
        'pdfs', jsonb_build_object(
          'logement_url', NEW.pdf_logement_url,
          'menage_url', NEW.pdf_menage_url
        ),
        'trigger_type', 'pdf_update'
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER fiche_pdf_update_webhook
  AFTER UPDATE ON public.fiches
  FOR EACH ROW
  EXECUTE FUNCTION notify_pdf_update();
```

#### **Payload PDF Reçu par Make**
```json
{
  "id": "6ce4732b-1062-4f43-bc4d-e91aff9f32c9",
  "nom": "Bien 7755",
  "statut": "Complété",
  "updated_at": "2025-08-13T02:40:07.782",
  "proprietaire": {
    "nom": "Jacky MARTIN",
    "email": "martin35000@icloud.com",
    "prenom": null
  },
  "logement": {
    "numero_bien": "7755"
  },
  "pdfs": {
    "logement_url": "https://qwjgkqxemnpvlhwxexht.supabase.co/storage/v1/object/public/fiche-pdfs/fiche-logement-7755.pdf",
    "menage_url": "https://qwjgkqxemnpvlhwxexht.supabase.co/storage/v1/object/public/fiche-pdfs/fiche-menage-7755.pdf"
  },
  "trigger_type": "pdf_update"
}
```

### **Workflow PDF Indépendant**

1. **Génération PDF** : Bouton "📄 Générer et Synchroniser les PDF"
2. **Upload Storage** : PDF vers bucket `fiche-pdfs`
3. **UPDATE Database** : Nouvelles URLs PDF + `updated_at`
4. **Trigger déclenché** : Webhook PDF automatique
5. **Make.com** : Téléchargement et organisation Drive
6. **Résultat** : PDF à jour sur Drive/Monday

### **Avantages du Système Dissocié**

- ✅ **Modification post-finalisation** : PDF peuvent être régénérés après finalisation
- ✅ **Workflow indépendant** : Pas d'interférence avec le trigger principal
- ✅ **UX simplifiée** : Un seul bouton pour génération + synchronisation
- ✅ **Make séparé** : Automatisation PDF dédiée et configurable
- ✅ **Payload minimal** : Seulement PDF + métadonnées (pas de photos)

### **Tests Validés**

- ✅ **Première génération** : Webhook déclenché correctement
- ✅ **Regénération** : Même URLs → webhook déclenché via `updated_at`
- ✅ **Make reception** : Payload structure conforme
- ✅ **Isolation** : Aucune interférence avec trigger principal
- ✅ **URLs accessibles** : PDF téléchargeables depuis Make

---

*📝 Section ajoutée : 13 août 2025*  
*🎯 Dissociation PDF opérationnelle*