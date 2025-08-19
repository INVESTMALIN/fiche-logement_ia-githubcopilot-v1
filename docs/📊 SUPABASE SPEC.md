# 📊 SUPABASE SPEC - Fiche Logement
*Architecture technique - Mise à jour : 19 août 2025*

---

## 🎯 **ARCHITECTURE GÉNÉRALE**

Application React + Supabase pour remplacer les formulaires Jotform. 22 sections de formulaire avec upload média, génération PDF automatique et 3 systèmes de webhooks indépendants vers Make.com.

**Stack :**
- Frontend : React + Vite + Tailwind
- Backend : Supabase (PostgreSQL + Auth + Storage)
- Automatisation : Make.com (3 webhooks séparés)
- PDF : html2pdf.js

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
  pdf_last_generated_at TIMESTAMP WITH TIME ZONE, -- Champ critique pour trigger PDF
  pdf_logement_url TEXT,
  pdf_menage_url TEXT,
  
  -- Sections (pattern {section}_{champ})
  proprietaire_prenom TEXT,
  proprietaire_nom TEXT,
  proprietaire_email TEXT,
  logement_numero_bien TEXT,
  logement_type_propriete TEXT,
  logement_surface INTEGER,
  equipements_wifi_statut TEXT, -- Champ d'alerte critique
  avis_quartier_securite TEXT,  -- Champ d'alerte critique
  avis_logement_etat_general TEXT, -- Champ d'alerte critique
  
  -- Champs média (TEXT[] pour photos/vidéos)
  clefs_photos TEXT[],
  equipements_poubelle_photos TEXT[],
  chambres_chambre_1_photos TEXT[],
  cuisine_1_elements_abimes_photos TEXT[], -- Nouveaux champs session 14/08
  avis_video_globale_videos TEXT[], -- Nouveaux champs session 14/08
  -- ... 59 champs média au total
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
Fichier `supabaseHelpers.js` assure la conversion FormContext ↔ Supabase :

```javascript
// FormContext → Supabase  
export const mapFormDataToSupabase = (formData) => ({
  nom: formData.nom || 'Nouvelle fiche',
  logement_numero_bien: formData.section_logement?.numero_bien || null,
  equipements_wifi_statut: formData.section_equipements?.wifi_statut || null,
  clefs_photos: formData.section_clefs?.photos || [],
  
  // ⚠️ CRITIQUE : pdf_last_generated_at ne doit JAMAIS être ici
  // Ce champ est géré uniquement par triggerPdfWebhook()
  pdf_logement_url: formData.pdf_logement_url || null,
  pdf_menage_url: formData.pdf_menage_url || null,
  // pdf_last_generated_at: SUPPRIMÉ - causait double trigger PDF
})

// Supabase → FormContext
export const mapSupabaseToFormData = (supabaseData) => ({
  section_logement: {
    numero_bien: supabaseData.logement_numero_bien || "",
  },
  section_clefs: {
    photos: supabaseData.clefs_photos || [],
  },
  pdf_last_generated_at: supabaseData.pdf_last_generated_at // OK en lecture
})
```

---

## 🔗 **SYSTÈME DE TRIGGERS (3 WEBHOOKS INDÉPENDANTS)**

### **1. Trigger Principal - Drive/Monday**
```sql
CREATE OR REPLACE FUNCTION public.notify_fiche_completed()
RETURNS trigger AS $function$
BEGIN
  -- Déclenché UNIQUEMENT lors du passage à "Complété"
  IF NEW.statut = 'Complété' AND OLD.statut IS DISTINCT FROM 'Complété' THEN
    
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/ydjwftmd7czs4rygv1rjhi6u4pvb4gdj',
      body := jsonb_build_object(
        'id', NEW.id,
        'nom', NEW.nom,
        'statut', NEW.statut,
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
        'media', jsonb_build_object(
          'clefs_photos', NEW.clefs_photos,
          'equipements_poubelle_photos', NEW.equipements_poubelle_photos,
          'chambres_chambre_1_photos', NEW.chambres_chambre_1_photos,
          -- ... 59 champs média total
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

### **2. Trigger PDF - Génération Indépendante**
```sql
CREATE OR REPLACE FUNCTION public.notify_pdf_update()
RETURNS trigger AS $function$
BEGIN
  -- Déclenché UNIQUEMENT si pdf_last_generated_at change
  IF OLD.pdf_last_generated_at IS DISTINCT FROM NEW.pdf_last_generated_at THEN
    
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/3vmb2eijfjw8nc5y68j8hp3fbw67az9q',
      body := jsonb_build_object(
        'id', NEW.id,
        'nom', NEW.nom,
        'statut', NEW.statut,
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

### **3. Trigger Alertes - Notifications Automatiques**
```sql
CREATE OR REPLACE FUNCTION public.notify_fiche_alerts()
RETURNS trigger AS $function$
BEGIN
  -- Déclenché SI :
  -- 1. Fiche passe à "Complété" pour la première fois (finalisation)
  -- 2. OU fiche déjà "Complété" + un des 12 champs d'alerte change
  IF (NEW.statut = 'Complété' AND OLD.statut IS DISTINCT FROM 'Complété') OR
     (NEW.statut = 'Complété' AND (
       -- 🔴 ALERTES CRITIQUES (4 champs)
       OLD.avis_quartier_securite IS DISTINCT FROM NEW.avis_quartier_securite OR
       OLD.avis_logement_etat_general IS DISTINCT FROM NEW.avis_logement_etat_general OR
       OLD.avis_logement_proprete IS DISTINCT FROM NEW.avis_logement_proprete OR
       OLD.equipements_wifi_statut IS DISTINCT FROM NEW.equipements_wifi_statut OR
       
       -- 🟡 ALERTES MODÉRÉES (6 champs)
       OLD.avis_video_globale_validation IS DISTINCT FROM NEW.avis_video_globale_validation OR
       OLD.avis_quartier_types IS DISTINCT FROM NEW.avis_quartier_types OR
       OLD.avis_immeuble_etat_general IS DISTINCT FROM NEW.avis_immeuble_etat_general OR
       OLD.avis_immeuble_proprete IS DISTINCT FROM NEW.avis_immeuble_proprete OR
       OLD.avis_logement_ambiance IS DISTINCT FROM NEW.avis_logement_ambiance OR
       OLD.avis_logement_vis_a_vis IS DISTINCT FROM NEW.avis_logement_vis_a_vis
     )) THEN
    
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/b935os296umo923k889s254wb88wjxn4',
      body := jsonb_build_object(
        'id', NEW.id,
        'nom', NEW.nom,
        'statut', NEW.statut,
        'proprietaire', jsonb_build_object(
          'prenom', NEW.proprietaire_prenom,
          'nom', NEW.proprietaire_nom,
          'email', NEW.proprietaire_email
        ),
        'logement', jsonb_build_object(
          'numero_bien', NEW.logement_numero_bien,
          'type_propriete', NEW.logement_type_propriete,
          'surface', NEW.logement_surface
        ),
        'alertes', jsonb_build_object(
          'quartier_securite', NEW.avis_quartier_securite,
          'logement_etat_general', NEW.avis_logement_etat_general,
          'logement_proprete', NEW.avis_logement_proprete,
          'wifi_statut', NEW.equipements_wifi_statut,
          'video_globale_validation', NEW.avis_video_globale_validation,
          'quartier_types', NEW.avis_quartier_types,
          'immeuble_etat_general', NEW.avis_immeuble_etat_general,
          'immeuble_proprete', NEW.avis_immeuble_proprete,
          'logement_ambiance', NEW.avis_logement_ambiance,
          'logement_vis_a_vis', NEW.avis_logement_vis_a_vis
        ),
        'trigger_type', 'alertes_automatiques'
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER fiche_alertes_webhook
  AFTER UPDATE ON public.fiches
  FOR EACH ROW
  EXECUTE FUNCTION notify_fiche_alerts();
```

### **Comportements Validés (Tests 19/08/2025)**

| Action                               | Trigger Photos | Trigger PDF | Trigger Alertes |
|--------------------------------------|----------------|-------------|-----------------|
| Génération PDF                       |       ❌       |     ✅     |       ❌        |
| Finalisation (Brouillon → Complété)  |       ✅       |     ❌     |       ✅        |
| Modification champ alerte (Complété) |       ❌       |     ❌     |       ✅        |
| Sauvegarde normale                   |       ❌       |     ❌     |       ❌        |

---

## 📸 **GESTION MÉDIA**

### **Supabase Storage**
```
📁 fiche-photos (PUBLIC)
user-{user_id}/fiche-{numero_bien}/section/field/

📁 fiche-pdfs (PUBLIC)  
fiche-logement-{numero_bien}.pdf
fiche-menage-{numero_bien}.pdf
```

### **59 Champs Média Total**
- **Clefs** : 5 champs (emplacement, interphone, photos, etc.)
- **Équipements** : 9 champs (poubelle, disjoncteur, vidéos, etc.)
- **Chambres** : 6 champs (chambre_1_photos à chambre_6_photos)
- **Salles de bains** : 6 champs  
- **Cuisine** : 21 champs (14 vidéos tutos + 6 photos + 1 tiroirs)
- **Autres sections** : 12 champs
- **🆕 Session 14/08** : 21 nouveaux champs (éléments abîmés + vidéos globales)

---

## 🚨 **SYSTÈME D'ALERTES - 12 CHAMPS SURVEILLÉS**

### **🔴 Critiques (4 champs)**
1. `avis_quartier_securite` = "zone_risques" 
2. `avis_logement_etat_general` = "etat_degrade" | "tres_mauvais_etat"
3. `avis_logement_proprete` = "sale"
4. `equipements_wifi_statut` = "non"

### **🟡 Modérées (6 champs)**
5. `avis_video_globale_validation` = true/false
6. `avis_quartier_types` contient "quartier_defavorise"
7. `avis_immeuble_etat_general` = "mauvais_etat"
8. `avis_immeuble_proprete` = "sale"
9. `avis_logement_ambiance` contient "absence_decoration" | "decoration_personnalisee"
10. `avis_logement_vis_a_vis` = "vis_a_vis_direct"

**Logique :** Le trigger se déclenche sur TOUT changement de ces champs (peu importe la valeur). Le filtrage par gravité se fait dans Make.com.

---

## ✅ **TESTS VALIDÉS (19 AOÛT 2025)**

### **Local + Prod - Comportement identique**
- ✅ **Fix pdf_last_generated_at** : Suppression ligne dans mapFormDataToSupabase()
- ✅ **10/10 champs d'alertes** : Tous testés individuellement
- ✅ **3 triggers isolés** : Aucune interférence
- ✅ **Cohérence local/prod** : Comportements identiques

### **Problème résolu**
**Cause :** `mapFormDataToSupabase()` écrasait `pdf_last_generated_at` lors des sauvegardes normales
**Solution :** Suppression de la ligne `pdf_last_generated_at: formData.pdf_last_generated_at || null`
**Résultat :** Triggers parfaitement isolés

---

## 📋 **CONFIGURATIONS IMPORTANTES**

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
// Trigger PDF indépendant
const triggerPdfWebhook = async (pdfLogementUrl, pdfMenageUrl) => {
  await supabase
    .from('fiches')
    .update({
      pdf_logement_url: pdfLogementUrl,
      pdf_menage_url: pdfMenageUrl,
      pdf_last_generated_at: new Date().toISOString(), // SEUL endroit où on modifie ce champ
      updated_at: new Date().toISOString()
    })
    .eq('id', formData.id)
}

// Sauvegarde normale (N'ÉCRASE JAMAIS pdf_last_generated_at)
const handleSave = async () => {
  const supabaseData = mapFormDataToSupabase(formData) // pdf_last_generated_at absent
  await saveFiche(supabaseData)
}
```

---

*📝 Document technique de référence - Session 19 août 2025*  
*🔧 Triggers opérationnels - Architecture validée*