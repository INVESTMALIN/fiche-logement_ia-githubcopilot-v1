# 📸 PLAN UPLOAD PHOTOS - Architecture Complète OPÉRATIONNELLE
*Mise à jour : 18 juillet 2025🎯*

---

## 🏆 **STATUT ACTUEL - SUCCÈS COMPLET ✅**

### ✅ **Phase 1 : Upload Photos**
- **✅ Composant PhotoUpload** intégré dans toutes les sections
- **✅ Upload Supabase Storage** fonctionnel avec structure organisée
- **✅ Sauvegarde FormContext** automatique des URLs
- **✅ Interface utilisateur** intuitive (drag & drop + bouton)
- **✅ Gestion erreurs** robuste avec messages utilisateur

### ✅ **Phase 2 : Webhook Conditionnel**
- **✅ Trigger SQL** se déclenche on UPADTE
- **✅ Payload COMPLET** optimisé avce les champs nécessaires (39 champs fichiers médias)
- **✅ Make.com** reçoit données structurées
- **✅ Tests end-to-end** validés avec fiches réelles


---

## 🎯 **ARCHITECTURE FINALE VALIDÉE**

### **Workflow Complet : Frontend → Supabase → Make → Drive**

```
    A[Utilisateur finalise fiche] --> B[Génération 2 PDF automatique]
    B --> C[Upload PDF vers Storage]
    C --> D[UPDATE statut fiche = 'Complété']
    D --> E[Trigger filtre statut = 'Complété' dans Make]
    E --> F[Webhook Make avec payload optimisé]
    F --> G[Make télécharge + organise photos]
    G --> H[Création arborescence Google Drive]
    H --> I[Upload final organisé par sections]
```

---

## 📊 **STRUCTURE DONNÉES FINALISÉE**

### **Supabase Storage**
```
📁 Bucket "fiche-photos" (PUBLIC)
├── user-fb6faa31-a18a-46bf-aec8-46e3bfc7ff17/
│   ├── fiche-1137/
│   │   ├── section_clefs/
│   │   │   └── clefs/
│   │   │       └── 1752111595319_qn38vf_screenshot.png
│   │   ├── section_equipements/
│   │   │   ├── poubelle_photos/
│   │   │   └── disjoncteur_photos/
│   │   ├── section_gestion_linge/
│   │   │   ├── photos_linge/
│   │   │   └── emplacement_photos/
│   │   └── section_securite/
│   │       └── photos_equipements_securite/
│   └── fiche-{autre}/
└── user-{autre}/

📁 Bucket "fiche-pdfs" (PUBLIC)
├── fiche-logement-1137.pdf
├── fiche-menage-1137.pdf
└── ...
```

### **Base de Données - Colonnes Photos**
```sql
-- Exemples de colonnes photos fonctionnelles
equipements_poubelle_photos TEXT[]
equipements_disjoncteur_photos TEXT[]
linge_photos_linge TEXT[]
linge_emplacement_photos TEXT[]
clefs_photos TEXT[]
securite_photos_equipements_securite TEXT[]
pdf_logement_url TEXT
pdf_menage_url TEXT
```

---

## 🔧 **WEBHOOK SUPABASE - TRIGGER OPÉRATIONNEL**

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

---

## 📁 **ORGANISATION GOOGLE DRIVE (À CONFIGURER DANS MAKE)**

### **Structure finale recommandée**
```
📁 2. DOSSIERS PROPRIETAIRES/
├── 📁 5566. Florence TEISSIER - Saint Pons/
│   ├── 📁 1. PHOTOS COMMERCIAL/
│   ├── 📁 2. INFORMATIONS PROPRIETAIRE/
│   ├── 📁 3. INFORMATIONS LOGEMENT/
│   │   ├── 📁 1. Fiche logement/
│   │   ├── 📁 2. Photos Visite Logement/
│   │   ├── 📁 3. Accès au logement/
│   │   │   ├── 📁 Photos d'accès/
│   │   │   └── 📁 Vidéos d'accès/
│   │   ├── 📁 4. Tour générale du logement/
│   │   ├── 📁 5. Tuto équipements/
│   │   └── 📁 6. Identifiants Wifi/
│   ├── 📁 4. PHOTOS ANNONCE/
└── 📁 1280. Autre propriétaire - Autre ville/
```

## 📁 **MAPPING LOGIQUE PHOTOS → DOSSIERS DRIVE**
### **Structure finale validée**
```

📁 1. Fiche logement et ménage
- Fiche-logement-num de bien.pdf
- Fiche-ménage-num de bien.pdf

📁 2. Photos Visite Logement
- chambres_chambre_1_photos → chambres_chambre_6_photos
- salle_de_bain_1_photos → salle_de_bain_6_photos  
- salon_sam_photos
- cuisine2_photos_tiroirs_placards
- exterieur_photos_espaces
- communs_photos_espaces

📁 3. Accès au logement
- guide_acces_photos_etapes (photos guide d'accès)
- guide_acces_video_acces (vidéo guide d'accès)

📁 4. Tour générale du logement
-> Vidéo générale du logement (Ajouter champ vidéo dans FicheVisite.jsx)

📁 5. Tuto équipements
- clefs_emplacement_photo (emplacement boîte à clefs)
- clefs_interphone_photo  
- clefs_tempo_gache_photo
- clefs_digicode_photo
- clefs_photos (clefs physiques)
- equipements_poubelle_photos
- equipements_disjoncteur_photos  
- equipements_vanne_eau_photos
- equipements_chauffage_eau_photos
- cuisine1_cuisiniere_photo
- cuisine1_plaque_cuisson_photo
- cuisine1_four_photo
- cuisine1_micro_ondes_photo
- cuisine1_lave_vaisselle_photo
- cuisine1_cafetiere_photo
- linge_photos_linge
- linge_emplacement_photos
- jacuzzi_photos_jacuzzi
- barbecue_photos
- bebe_photos_equipements
- securite_photos_equipements
```

Total : 39 champs ✅

---

## ⚡ **TESTS VALIDÉS - SUCCÈS COMPLET**

### **✅ Test Fiche 7755 - Workflow Complet**

**1. Création fiche :**
- ✅ Nouvelle fiche "Bien 7755" créée
- ✅ Remplissage sections avec photos multiple
- ✅ Upload photos dans 6 sections différentes

**2. Génération PDF :**
- ✅ Bouton "Générer PDF automatique"
- ✅ 2 PDF créés : fiche-logement-7755.pdf + fiche-menage-7755.pdf
- ✅ Upload automatique Supabase Storage

**3. Finalisation :**
- ✅ Bouton "Finaliser la fiche" 
- ✅ Statut changé : Brouillon → Complété
- ✅ Trigger webhook déclenché **une seule fois**

**4. Make.com :**
- ✅ Payload optimisé reçu
- ✅ URLs photos + PDF accessibles
- ✅ Module HTTP télécharge fichiers

---

## 🔧 **MODULES MAKE CONFIGURÉS**

### **✅ Modules Opérationnels**
1. **Webhook** → Réception payload ✅
2. **HTTP GET PDF** → Téléchargement fiche-logement.pdf ✅
3. **Filter** → Statut = "Complété" (sécurité) ✅

### **✅ Modules À Ajouter**
4. **HTTP GET PDF Ménage** → Téléchargement fiche-menage.pdf
5. **Google Drive Create Folder** → Arborescence automatique
6. **Repeater** → Boucle sur chaque section photos
7. **HTTP GET Photos** → Téléchargement chaque image
8. **Google Drive Upload** → Organisation finale Drive

---

*📅 Dernière mise à jour : 18 juillet 2025*  
*👤 Développeurs : Julien + Claude Sonnet 4*  
*🎯 Statut : ✅ WEBHOOK COMPLET + PHOTOS OPÉRATIONNELS - Prêt pour finalisation Drive*  
*📈 Version : 7.0 - Payload complet pour tests facilités*