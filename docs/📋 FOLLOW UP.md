# 📋 SUIVI - Nouveaux champs Section Avis

*Mise à jour : 12 août 2025*

---

## 🆕 **NOUVEAUX CHAMPS AJOUTÉS (18 total)**

### **🎬 1. Évaluation Environnement (1 champ)**
| Champ FormContext | Colonne Supabase | Type | Alerte Auto |
|---|---|---|---|
| `video_globale_validation` | `avis_video_globale_validation` | Boolean | ✅ **OUI/NON → Notification** |

### **🏘️ 2. Évaluation Quartier (4 champs)**
| Champ FormContext | Colonne Supabase | Type | Alerte Auto |
|---|---|---|---|
| `quartier_types` | `avis_quartier_types` | Array | ✅ **"Quartier défavorisé" → Notification** |
| `quartier_securite` | `avis_quartier_securite` | Text | ✅ **"Zone à risques" → Notification (Refus ?)** |
| `quartier_perturbations` | `avis_quartier_perturbations` | Text | ❌ Pas d'alerte |
| `quartier_perturbations_details` | `avis_quartier_perturbations_details` | Text | ❌ Pas d'alerte |

### **🏢 3. Évaluation Immeuble (4 champs)**
| Champ FormContext | Colonne Supabase | Type | Alerte Auto |
|---|---|---|---|
| `immeuble_etat_general` | `avis_immeuble_etat_general` | Text | ✅ **"Mauvais état" → Notification** |
| `immeuble_proprete` | `avis_immeuble_proprete` | Text | ✅ **"Sale" → Notification** |
| `immeuble_accessibilite` | `avis_immeuble_accessibilite` | Text | ❌ Pas d'alerte |
| `immeuble_niveau_sonore` | `avis_immeuble_niveau_sonore` | Text | ❌ Pas d'alerte |

### **🏠 4. Évaluation Logement (9 champs)**
| Champ FormContext | Colonne Supabase | Type | Alerte Auto |
|---|---|---|---|
| `logement_etat_general` | `avis_logement_etat_general` | Text | ✅ **"Dégradé" → Pause travaux/Refus** |
| | | | ✅ **"Très mauvais" → Refus logement** |
| `logement_etat_details` | `avis_logement_etat_details` | Text | ❌ Pas d'alerte |
| `logement_proprete` | `avis_logement_proprete` | Text | ✅ **"Sale" → Remise en état/Refus/Travaux** |
| `logement_proprete_details` | `avis_logement_proprete_details` | Text | ❌ Pas d'alerte |
| `logement_ambiance` | `avis_logement_ambiance` | Array | ✅ **"Absence décoration" → Notification** |
| | | | ✅ **"Décoration personnalisée" → Notification** |
| `logement_absence_decoration_details` | `avis_logement_absence_decoration_details` | Text | ❌ Pas d'alerte |
| `logement_decoration_personnalisee_details` | `avis_logement_decoration_personnalisee_details` | Text | ❌ Pas d'alerte |
| `logement_vis_a_vis` | `avis_logement_vis_a_vis` | Text | ✅ **"Vis-à-vis direct" → Notification** |
| `logement_vis_a_vis_photos` | `avis_logement_vis_a_vis_photos` | Array | 📸 **PHOTOS → Drive** |

---

## **📊 Implémentation complète**

**36 colonnes Supabase créées :**
- ✅ **cuisine_1_elements_abimes** + photos
- ✅ **salon_sam_salon_elements_abimes** + photos  
- ✅ **salon_sam_salle_manger_elements_abimes** + photos
- ✅ **chambres_chambre_1-6_elements_abimes** + photos (12 colonnes)
- ✅ **salle_de_bains_salle_de_bain_1-6_elements_abimes** + photos (12 colonnes)
- ✅ **equip_spe_ext_garage_elements_abimes** + photos
- ✅ **equip_spe_ext_buanderie_elements_abimes** + photos
- ✅ **equip_spe_ext_autres_pieces_elements_abimes** + photos

**Mapping bidirectionnel complet :**
- ✅ **FormContext.jsx** : 36 champs ajoutés
- ✅ **supabaseHelpers.js** : Mapping FormContext ↔ DB complet
- ✅ **Pattern cohérent** : `{section}_elements_abimes` + `{section}_elements_abimes_photos`

**Interface utilisateur :**
- ✅ **7 sections modifiées** avec questions uniformes
- ✅ **Pattern OUI/NON** + upload conditionnel PhotoUpload
- ✅ **Suppression automatique** des photos si passage de OUI → NON
- ✅ **Accordéons dynamiques** pour Chambres/SDB (questions individuelles)
- ✅ **Mobile-responsive** avec style bleu clair conditionnel

### **🧪 Tests validés**
- ✅ **Sauvegarde/rechargement** fonctionne sur toutes les sections
- ✅ **Upload photos** : Storage Supabase + URLs en base
- ✅ **Suppression photos** : Nettoyage Storage + FormContext
- ✅ **Navigation** : Boutons restent sélectionnés après sauvegarde
- ✅ **Accordéons dynamiques** : Chambres/SDB individuelles fonctionnelles

### **📝 Sections impactées**
1. **FicheCuisine1.jsx** - 1 question cuisine
2. **FicheSalonSam.jsx** - 2 questions (salon + salle à manger)
3. **FicheChambre.jsx** - 6 questions (1 par chambre dans accordéons)
4. **FicheSalleDeBains.jsx** - 6 questions (1 par SDB dans accordéons)
5. **FicheEquipExterieur.jsx** - 3 questions (garage + buanderie + autres pièces)

---
## 🎯 **PROCHAINES MISSIONS**

### **🔧 1. Question WiFi** (priorité moyenne)
**Objectif :** Ajouter question WiFi dans section Équipements

**Specs Victoria :**
- **OUI** / **EN COURS** (+ détails) / **NON**
- **Si NON** → Notification automatique Mélissa + David
- **Automation Monday** → Colonne "WIFI" (OUI/NON)

**Implémentation requise :**
- 2 colonnes Supabase : `equipements_wifi_statut`, `equipements_wifi_details`
- Mapping FormContext ↔ DB
- Interface FicheEquipements.jsx
- Webhook pour notifications automatiques

## 🚨 **CHAMPS DÉCLENCHEURS D'ALERTES (11 champs)**

### **🔴 Alertes Critiques (Refus/Travaux)**
1. `avis_quartier_securite` = "zone_risques" → **Refus logement ?**
2. `avis_logement_etat_general` = "etat_degrade" → **Pause travaux/Refus**
3. `avis_logement_etat_general` = "tres_mauvais_etat" → **Refus logement**
4. `avis_logement_proprete` = "sale" → **Remise en état/Refus/Travaux**

### **🟡 Alertes Modérées (Notifications)**
5. `avis_video_globale_validation` = true/false → **Notification**
6. `avis_quartier_types` contient "quartier_defavorise" → **Notification**
7. `avis_immeuble_etat_general` = "mauvais_etat" → **Notification**
8. `avis_immeuble_proprete` = "sale" → **Notification**
9. `avis_logement_ambiance` contient "absence_decoration" → **Notification**
10. `avis_logement_ambiance` contient "decoration_personnalisee" → **Notification**
11. `avis_logement_vis_a_vis` = "vis_a_vis_direct" → **Notification**

---

## 📸 **CHAMPS PHOTOS À AJOUTER AU DRIVE**
*À ajouter dans l'automatisation Make.com pour le Drive*

| Champ | Colonne Supabase | Section Drive | Priorité |
|---|---|---|---|
| `logement_vis_a_vis_photos` | `avis_logement_vis_a_vis_photos` | `/section_avis/vis_a_vis/` | Moyenne |

## 📊 **nouveaux champs photos créés**

### **Avis (1 champs)**
1. `logement_vis_a_vis_photos`

### **Cuisine (1 champs)**
2. `cuisine_1_elements_abimes_photos`

### **Salon/Salle à manger (2 champs)**
3. `salon_sam_salon_elements_abimes_photos`
4. `salon_sam_salle_manger_elements_abimes_photos`

### **hambres (6 champs)**
5. `chambres_chambre_1_elements_abimes_photos`
6. `chambres_chambre_2_elements_abimes_photos`
7. `chambres_chambre_3_elements_abimes_photos`
8. `chambres_chambre_4_elements_abimes_photos`
9. `chambres_chambre_5_elements_abimes_photos`
10. `chambres_chambre_6_elements_abimes_photos`

### **Salle de bains (6 champs)**
11. `salle_de_bains_salle_de_bain_1_elements_abimes_photos`
12. `salle_de_bains_salle_de_bain_2_elements_abimes_photos`
13. `salle_de_bains_salle_de_bain_3_elements_abimes_photos`
14. `salle_de_bains_salle_de_bain_4_elements_abimes_photos`
15. `salle_de_bains_salle_de_bain_5_elements_abimes_photos`
16. `salle_de_bains_salle_de_bain_6_elements_abimes_photos`

### **Équipements Extérieurs (3 champs)**
17. `equip_spe_ext_garage_elements_abimes_photos`
18. `equip_spe_ext_buanderie_elements_abimes_photos`
19. `equip_spe_ext_autres_pieces_elements_abimes_photos`

---

**Action requise** : Ajouter ce champ au payload webhook + trigger Make.com

---

## 🔄 **ACTIONS FUTURES À PROGRAMMER**

### **🚨 1. Système d'Alertes Automatiques**
- **Webhook personnalisé** pour traiter les alertes
- **Format notification** : Email ? Monday ? Slack ?
- **Destinataires** : Mélissa + David (confirmé)
- **Template messages** selon type d'alerte

### **📸 2. Mise à jour Automatisation Drive**
- Ajouter `avis_logement_vis_a_vis_photos` au trigger SQL
- Mettre à jour payload webhook avec nouveau champ
- Configurer arborescence Drive `/section_avis/vis_a_vis/`

### **📍 3. Déplacement Section Avis**
- Passer de position 8 → position 3
- Modifier FormWizard.jsx + FormContext.jsx
- Tester navigation complète

### **🔧 4. Éléments Abîmés**
- Ajouter questions "Photos éléments abîmés" dans chaque section :
  - Cuisine (existante)
  - Salon (existante) 
  - Salle à manger (existante)
  - Salle de bain (existante)
  - Chambres (existante)
  - Garage/Buanderie (Équip. Extérieur)
  - Autres pièces (nouvelle section ?)

### **📶 5. Question WiFi**
- Ajouter dans section Équipements existante
- 3 options : Oui / En cours (+ détails) / Non
- Alerte si "Non" + colonne Monday

---

## 📊 **IMPACT SUR L'ARCHITECTURE**

### **✅ Terminé**
- ✅ 18 nouvelles colonnes Supabase
- ✅ Mapping FormContext ↔ DB
- ✅ Interface utilisateur complète
- ✅ Sauvegarde/chargement opérationnel
- ✅ Upload photos fonctionnel

### **⏳ En attente**
- ⏳ Webhook alertes automatiques
- ⏳ Mise à jour automatisation Photo -> Drive
- ⏳ Tests utilisateurs complets
- ⏳ Documentation utilisateur

---

*📝 Document à maintenir à jour lors des prochaines étapes*