# 📊 SUPABASE SPEC - Fiche Logement
*Architecture technique - Mise à jour : 17 novembre 2025*

---

## 🎯 **ARCHITECTURE GÉNÉRALE**

Application React + Supabase pour remplacer les formulaires Jotform. 24 sections de formulaire avec upload média, génération PDF automatique (4 types) et 4 systèmes de webhooks indépendants vers Make.com.

**Stack :**
- Frontend : React + Vite + Tailwind
- Backend : Supabase (PostgreSQL + Auth + Storage)
- Automatisation : Make.com (4 webhooks séparés)
- PDF : html2pdf.js + jsPDF

---

## 🗄️ **BASE DE DONNÉES**

### **Architecture : Table Plate 750+ Colonnes**
Une seule table `fiches` avec pattern de nommage `{section}_{champ}`.

```sql
-- Table principale
CREATE TABLE fiches (
  -- Métadonnées
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  nom TEXT DEFAULT 'Nouvelle fiche',
  statut TEXT DEFAULT 'Brouillon' CHECK (statut IN ('Brouillon', 'Complété', 'Archivé')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- PDF Fiches Logement/Ménage
  pdf_last_generated_at TIMESTAMP WITH TIME ZONE,
  pdf_logement_url TEXT,
  pdf_menage_url TEXT,
  
  -- PDF Assistants IA
  guide_acces_pdf_url TEXT,
  guide_acces_last_generated_at TIMESTAMP WITH TIME ZONE,
  annonce_pdf_url TEXT,
  annonce_last_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Sections (pattern {section}_{champ})
  proprietaire_prenom TEXT,
  proprietaire_nom TEXT,
  proprietaire_email TEXT,
  logement_numero_bien TEXT,
  logement_type_propriete TEXT,
  logement_surface INTEGER,
  
  -- Champs d'alertes critiques
  equipements_wifi_statut TEXT,
  avis_quartier_securite TEXT,
  avis_logement_etat_general TEXT,
  
  -- Champs média (TEXT[] pour photos/vidéos)
  clefs_photos TEXT[],
  equipements_poubelle_photos TEXT[],
  chambres_chambre_1_photos_chambre TEXT[],
  guide_acces_video_acces TEXT[],
  -- ... 94 champs média au total
);

-- Table utilisateurs
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT DEFAULT 'coordinateur' CHECK (role IN ('coordinateur', 'admin', 'super_admin')),
  prenom TEXT,
  nom TEXT,
  email TEXT
);
```

### **Mapping Bidirectionnel**

```javascript
// FormContext → Supabase  
export const mapFormDataToSupabase = (formData) => ({
  nom: formData.nom || 'Nouvelle fiche',
  logement_numero_bien: formData.section_logement?.numero_bien || null,
  clefs_photos: formData.section_clefs?.photos || [],
  
  // ⚠️ CRITIQUE : Les timestamps PDF ne doivent JAMAIS être mappés ici
  // Ils sont gérés UNIQUEMENT par triggerPdfWebhook() et triggerAssistantPdfWebhook()
  pdf_logement_url: formData.pdf_logement_url || null,
  pdf_menage_url: formData.pdf_menage_url || null,
  guide_acces_pdf_url: formData.guide_acces_pdf_url || null,
  annonce_pdf_url: formData.annonce_pdf_url || null,
  // pdf_last_generated_at: JAMAIS mappé
  // guide_acces_last_generated_at: JAMAIS mappé
  // annonce_last_generated_at: JAMAIS mappé
})

// Supabase → FormContext
export const mapSupabaseToFormData = (supabaseData) => ({
  section_logement: {
    numero_bien: supabaseData.logement_numero_bien || "",
  },
  section_clefs: {
    photos: supabaseData.clefs_photos || [],
  },
  // Timestamps OK en lecture
  pdf_last_generated_at: supabaseData.pdf_last_generated_at,
  guide_acces_last_generated_at: supabaseData.guide_acces_last_generated_at,
  annonce_last_generated_at: supabaseData.annonce_last_generated_at,
})
```

---

## 🔗 **SYSTÈME DE TRIGGERS (4 WEBHOOKS INDÉPENDANTS)**

### **1. Trigger Principal - Photos/Vidéos Drive/Monday**

**Déclenchement :** Statut passe à "Complété" (finalisation uniquement)  
**Webhook :** `https://hook.eu2.make.com/ydjwftmd7czs4rygv1rjhi6u4pvb4gdj`

```sql
CREATE OR REPLACE FUNCTION public.notify_fiche_completed()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.statut = 'Complété' AND OLD.statut IS DISTINCT FROM 'Complété' THEN
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/ydjwftmd7czs4rygv1rjhi6u4pvb4gdj',
      body := jsonb_build_object(
        'id', NEW.id,
        'nom', NEW.nom,
        'statut', NEW.statut,
        'proprietaire', jsonb_build_object(...),
        'logement', jsonb_build_object(...),
        'pdfs', jsonb_build_object(
          'logement_url', NEW.pdf_logement_url,
          'menage_url', NEW.pdf_menage_url
        ),
        'media', jsonb_build_object(
          -- 94 champs média structurés
        )
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER fiche_any_update_webhook
  AFTER UPDATE ON public.fiches
  FOR EACH ROW
  EXECUTE FUNCTION notify_fiche_completed();
```

### **2. Trigger PDF Fiches - Logement/Ménage**

**Déclenchement :** `pdf_last_generated_at` change  
**Webhook :** `https://hook.eu2.make.com/3vmb2eijfjw8nc5y68j8hp3fbw67az9q`

```sql
CREATE OR REPLACE FUNCTION public.notify_pdf_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.pdf_last_generated_at IS DISTINCT FROM NEW.pdf_last_generated_at THEN
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/3vmb2eijfjw8nc5y68j8hp3fbw67az9q',
      body := jsonb_build_object(
        'id', NEW.id,
        'nom', NEW.nom,
        'statut', NEW.statut,
        'updated_at', NEW.updated_at,
        'proprietaire', jsonb_build_object(...),
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

### **3. Trigger PDF Guide d'Accès**

**Déclenchement :** `guide_acces_last_generated_at` change  
**Webhook :** `https://hook.eu2.make.com/wjonl6ikb3fl8sk2tr5k7f95lupo4t6z`

```sql
CREATE OR REPLACE FUNCTION public.notify_guide_acces_pdf_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.guide_acces_last_generated_at IS DISTINCT FROM NEW.guide_acces_last_generated_at THEN
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/wjonl6ikb3fl8sk2tr5k7f95lupo4t6z',
      body := jsonb_build_object(
        'id', NEW.id,
        'nom', NEW.nom,
        'assistant_pdf', jsonb_build_object(
          'url', NEW.guide_acces_pdf_url,
          'type', 'guide_acces',
          'last_generated_at', NEW.guide_acces_last_generated_at
        ),
        'trigger_type', 'assistant_pdf_update',
        'pdf_type', 'guide_acces'
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER fiche_guide_acces_pdf_webhook
  AFTER UPDATE ON public.fiches
  FOR EACH ROW
  EXECUTE FUNCTION notify_guide_acces_pdf_update();
```

### **4. Trigger PDF Annonce**

**Déclenchement :** `annonce_last_generated_at` change  
**Webhook :** `https://hook.eu2.make.com/wjonl6ikb3fl8sk2tr5k7f95lupo4t6z`

```sql
CREATE OR REPLACE FUNCTION public.notify_annonce_pdf_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.annonce_last_generated_at IS DISTINCT FROM NEW.annonce_last_generated_at THEN
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/wjonl6ikb3fl8sk2tr5k7f95lupo4t6z',
      body := jsonb_build_object(
        'id', NEW.id,
        'nom', NEW.nom,
        'assistant_pdf', jsonb_build_object(
          'url', NEW.annonce_pdf_url,
          'type', 'annonce',
          'last_generated_at', NEW.annonce_last_generated_at
        ),
        'trigger_type', 'assistant_pdf_update',
        'pdf_type', 'annonce'
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER fiche_annonce_pdf_webhook
  AFTER UPDATE ON public.fiches
  FOR EACH ROW
  EXECUTE FUNCTION notify_annonce_pdf_update();
```

### **5. Trigger Alertes (Optionnel)**

**Déclenchement :** Finalisation OU modification des 12 champs d'alertes  
**Webhook :** `https://hook.eu2.make.com/b935os296umo923k889s254wb88wjxn4`

**Champs surveillés :**
- 🔴 **Critiques (4)** : `avis_quartier_securite`, `avis_logement_etat_general`, `avis_logement_proprete`, `equipements_wifi_statut`
- 🟡 **Modérées (8)** : `avis_video_globale_validation`, `avis_quartier_types`, `avis_immeuble_etat_general`, etc.

---

## 📦 **TABLEAU RÉCAPITULATIF DES TRIGGERS**

| Trigger | Condition | Webhook | Payload Principal |
|---------|-----------|---------|-------------------|
| **Finalisation** | `statut` → "Complété" | `ydjwftmd7czs4rygv1rjhi6u4pvb4gdj` | 94 champs média + PDFs |
| **PDF Fiches** | `pdf_last_generated_at` change | `3vmb2eijfjw8nc5y68j8hp3fbw67az9q` | URLs Logement + Ménage |
| **PDF Guide** | `guide_acces_last_generated_at` change | `wjonl6ikb3fl8sk2tr5k7f95lupo4t6z` | URL + `pdf_type: 'guide_acces'` |
| **PDF Annonce** | `annonce_last_generated_at` change | `wjonl6ikb3fl8sk2tr5k7f95lupo4t6z` | URL + `pdf_type: 'annonce'` |
| **Alertes** | Finalisation OU champs alertes | `b935os296umo923k889s254wb88wjxn4` | 12 champs d'alertes |

---

## 📸 **GESTION STORAGE SUPABASE**

### **Buckets Publics**

```
📁 fiche-photos (PUBLIC)
└── user-{user_id}/
    └── fiche-{numero_bien}/
        └── section/field/
            └── fichiers.jpg

📁 fiche-pdfs (PUBLIC)
├── fiche-logement-{numero_bien}.pdf
└── fiche-menage-{numero_bien}.pdf

📁 guide-acces-pdfs (PUBLIC)
└── guide_acces_{ficheId}.pdf

📁 annonce-pdfs (PUBLIC)
└── annonce_{ficheId}.pdf
```

### **94 Champs Média Total**

#### Clefs (5)
- clefs_emplacement_photo, clefs_interphone_photo, clefs_tempo_gache_photo, clefs_digicode_photo, clefs_photos

#### Équipements (18)
- equipements_poubelle_photos, equipements_disjoncteur_photos, equipements_vanne_eau_photos, equipements_wifi_routeur_photo, equipements_parking_photos/videos, equipements_tv_video, equipements_climatisation_video, etc.

#### Chambres/SDB (12)
- chambres_chambre_[1-6]_photos_chambre, salle_de_bains_salle_de_bain_[1-6]_photos_salle_de_bain

#### Cuisine (21)
- 14 vidéos tutos + 6 photos + cuisine_2_photos_tiroirs_placards

#### Autres sections (17)
- salon_sam, exterieur, jacuzzi, barbecue, piscine_video, communs, bebe, visite_video, guide_acces (photos + video), securite, linge

#### Éléments abîmés (21)
- avis_video_globale_videos, avis_logement_vis_a_vis_photos, cuisine_1_elements_abimes_photos, salon/chambres/sdb/exterieur elements_abimes_photos

---

## 🔐 **AUTHENTIFICATION & PERMISSIONS**

### **RLS Policies**

```sql
-- Coordinateur : accès seulement à ses fiches
CREATE POLICY "coordinateur_own_fiches" ON fiches 
  FOR ALL USING (user_id = auth.uid());

-- Super admin : accès toutes fiches
CREATE POLICY "super_admin_all_fiches" ON fiches 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );
```

### **Hooks FormContext Critiques**

```javascript
// Trigger PDF Fiches (Logement/Ménage)
const triggerPdfWebhook = async (pdfLogementUrl, pdfMenageUrl) => {
  await supabase
    .from('fiches')
    .update({
      pdf_logement_url: pdfLogementUrl,
      pdf_menage_url: pdfMenageUrl,
      pdf_last_generated_at: new Date().toISOString(), // SEUL endroit
      updated_at: new Date().toISOString()
    })
    .eq('id', formData.id)
}

// Trigger PDF Assistants (Guide/Annonce)
const triggerAssistantPdfWebhook = async (guideAccesUrl, annonceUrl) => {
  const updateData = {}
  
  if (guideAccesUrl) {
    updateData.guide_acces_pdf_url = guideAccesUrl
    updateData.guide_acces_last_generated_at = new Date().toISOString()
  }
  
  if (annonceUrl) {
    updateData.annonce_pdf_url = annonceUrl
    updateData.annonce_last_generated_at = new Date().toISOString()
  }
  
  updateData.updated_at = new Date().toISOString()
  
  await supabase.from('fiches').update(updateData).eq('id', formData.id)
}

// Sauvegarde normale (N'ÉCRASE JAMAIS les timestamps PDF)
const handleSave = async () => {
  const supabaseData = mapFormDataToSupabase(formData) // Timestamps absents
  await saveFiche(supabaseData)
}
```

---

## ✅ **TESTS VALIDÉS**

### **Triggers Isolés (16 Oct 2025)**
- ✅ **Fix pdf_last_generated_at** : Suppression du mapping dans mapFormDataToSupabase()
- ✅ **4 triggers indépendants** : Aucune interférence entre eux
- ✅ **Regénération PDF** : Fonctionne correctement via timestamps
- ✅ **Cohérence local/prod** : Comportements identiques

### **PDF Assistants (17 Nov 2025)**
- ✅ **Génération Guide d'accès** : Trigger déclenché correctement
- ✅ **Génération Annonce** : Trigger déclenché correctement
- ✅ **Timestamps** : Mise à jour correcte
- ✅ **Routage Make** : `pdf_type` permet le filtrage

---

## 🎯 **COMPORTEMENTS ATTENDUS**

| Action | Trigger Finalisation | Trigger PDF Fiches | Trigger Guide | Trigger Annonce | Trigger Alertes |
|--------|---------------------|-------------------|---------------|-----------------|-----------------|
| Finalisation (Brouillon → Complété) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Génération PDF Fiches | ❌ | ✅ | ❌ | ❌ | ❌ |
| Génération PDF Guide | ❌ | ❌ | ✅ | ❌ | ❌ |
| Génération PDF Annonce | ❌ | ❌ | ❌ | ✅ | ❌ |
| Modification champ alerte (Complété) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Sauvegarde normale | ❌ | ❌ | ❌ | ❌ | ❌ |

---

*📝 Document technique de référence*  
*🔧 Architecture validée en production*  
*📅 Dernière mise à jour : 17 novembre 2025*
```