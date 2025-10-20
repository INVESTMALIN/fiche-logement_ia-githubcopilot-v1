# 📊 SUPABASE SPEC - Fiche Logement
*Architecture technique - Mise à jour : 16 octobre 2025*

---

## 🎯 **ARCHITECTURE GÉNÉRALE**

Application React + Supabase pour remplacer les formulaires Jotform. 24 sections de formulaire avec upload média, génération PDF automatique et 3 systèmes de webhooks indépendants vers Make.com.

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
  -- ... 68 champs média au total
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
-- Trigger actuel en production : fiche_any_update_webhook
-- Fonction actuelle 16 Oct 25 : notify_fiche_completed()

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

    -- PARTIE 1 : Clefs + Equipements + Linge + Chambres + WiFi routeur (21 champs)
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
      'equipements_wifi_routeur_photo', NEW.equipements_wifi_routeur_photo,
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

    -- PARTIE 5 : Nouveaux médias Équipements + Télétravail
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

      -- Télétravail
      'teletravail_speedtest_photos', NEW.teletravail_speedtest_photos,
      'teletravail_espace_travail_photos', NEW.teletravail_espace_travail_photos
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

### **94 Champs Média Total**

#### 🗝️ Clefs (5)

* clefs_emplacement_photo
* clefs_interphone_photo
* clefs_tempo_gache_photo
* clefs_digicode_photo
* clefs_photos

#### ⚙️ Équipements (10)

* equipements_poubelle_photos
* equipements_disjoncteur_photos
* equipements_vanne_eau_photos
* equipements_chauffage_eau_photos
* equipements_video_acces_poubelle
* equipements_video_systeme_chauffage
* equipements_wifi_routeur_photo (🆕 16/10)
* equipements_parking_photos
* equipements_parking_videos
* télétravail_speedtest_photos / télétravail_espace_travail_photos (🆕 16/10)

#### 🛏️ Chambres (6)

* chambres_chambre_1_photos_chambre
* chambres_chambre_2_photos_chambre
* chambres_chambre_3_photos_chambre
* chambres_chambre_4_photos_chambre
* chambres_chambre_5_photos_chambre
* chambres_chambre_6_photos_chambre

#### 🛁 Salles de bains (6)

* salle_de_bains_salle_de_bain_1_photos_salle_de_bain
* salle_de_bains_salle_de_bain_2_photos_salle_de_bain
* salle_de_bains_salle_de_bain_3_photos_salle_de_bain
* salle_de_bains_salle_de_bain_4_photos_salle_de_bain
* salle_de_bains_salle_de_bain_5_photos_salle_de_bain
* salle_de_bains_salle_de_bain_6_photos_salle_de_bain

#### 🍳 Cuisine (21)

**Vidéos tutos (14)** :
refrigerateur / congelateur / mini_refrigerateur / cuisiniere / plaque_cuisson / four / micro_ondes / lave_vaisselle / cafetiere / bouilloire / grille_pain / blender / cuiseur_riz / machine_pain
**Photos (6)** :
cuisiniere / plaque_cuisson / four / micro_ondes / lave_vaisselle / cafetiere
**Autres (1)** :
cuisine_2_photos_tiroirs_placards

#### 🛋️ Autres sections (12)

* salon_sam_photos_salon_sam
* exterieur_photos_espaces
* jacuzzi_photos_jacuzzi
* barbecue_photos
* piscine_video
* communs_photos_espaces_communs
* bebe_photos_equipements_bebe
* visite_video_visite
* guide_acces_photos_etapes
* guide_acces_video_acces
* securite_photos_equipements_securite
* linge_photos_linge / linge_emplacement_photos

#### ⚠️ Session 14/08 – Éléments abîmés + Avis (21)

* avis_video_globale_videos
* avis_logement_vis_a_vis_photos
* cuisine_1_elements_abimes_photos
* salon_sam_salon_elements_abimes_photos
* salon_sam_salle_manger_elements_abimes_photos
* chambres_chambre_[1–6]_elements_abimes_photos
* salle_de_bains_salle_de_bain_[1–6]_elements_abimes_photos
* equip_spe_ext_garage_elements_abimes_photos
* equip_spe_ext_buanderie_elements_abimes_photos
* equip_spe_ext_autres_pieces_elements_abimes_photos

#### 🔧 Session 16/10 – Vidéos Équipements (8)

* equipements_tv_video
* equipements_tv_console_video
* equipements_tv_services
* equipements_tv_consoles
* equipements_climatisation_video
* equipements_chauffage_video
* equipements_lave_linge_video
* equipements_seche_linge_video

---

💡 **Total : 94 champs média**
Cette version correspond **exactement** au trigger `notify_fiche_completed()` actuellement en production (20 octobre).

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

## ✅ **TESTS VALIDÉS (16 OCT 2025)**

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

*📝 Document technique de référence - Session 20 octobre 2025*  
*🔧 Triggers opérationnels - Architecture validée*