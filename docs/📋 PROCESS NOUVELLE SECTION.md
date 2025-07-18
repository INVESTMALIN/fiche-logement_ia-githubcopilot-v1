# 📋 PROCESS COMPLET - Ajouter une nouvelle section au formulaire

> **CONTEXTE** : Application React "Fiche logement" avec FormContext centralisé, sauvegarde Supabase, 22 sections de formulaire. Architecture complète fonctionnelle avec mapping FormContext ↔ Supabase.

---

## 🎯 **ÉTAPE 1 : PLANIFICATION DE LA NOUVELLE SECTION**

### ✅ **1.1 - Définir la structure des données**
```javascript
// Exemple pour "section_exemple"
section_exemple: {
  champ_radio: null,               // Radio: true/false/null
  champ_radio_details: "",         // Input text conditionnel
  champ_textarea: "",              // Textarea
  champ_select: "",                // Select dropdown
  champ_checkbox: null,            // Checkbox: true/false/null
  photos_exemple: []               // Array de photos
}
```

### ✅ **1.2 - Lister les colonnes Supabase nécessaires**
```sql
-- Pattern de nommage : {section}_{champ}
exemple_champ_radio BOOLEAN
exemple_champ_radio_details TEXT
exemple_champ_textarea TEXT
exemple_champ_select TEXT
exemple_champ_checkbox BOOLEAN
exemple_photos_exemple TEXT[]
```

**📊 Organisation table Supabase :**
- **Colonnes métadonnées** : `id`, `user_id`, `nom`, `statut`, `created_at`, `updated_at`
- **Sections par ordre** : `proprietaire_*`, `logement_*`, `clefs_*`, `airbnb_*`, `booking_*`, `reglementation_*`, `exigences_*`, `avis_*`, `linge_*`, `equipements_*`, `consommables_*`, `visite_*`, `chambres_*`, `salle_de_bains_*`
- **Pattern cohérent** : `{section}_{champ}`
- **Types standards** : `TEXT`, `BOOLEAN`, `INTEGER`, `TEXT[]`

---

## 🗄️ **ÉTAPE 2 : MISE À JOUR SUPABASE**

### ✅ **2.1 - Exécuter le SQL d'ajout de colonnes**
```sql
-- Dans Supabase SQL Editor
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS exemple_champ_radio BOOLEAN;
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS exemple_champ_radio_details TEXT;
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS exemple_champ_textarea TEXT;
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS exemple_champ_select TEXT;
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS exemple_champ_checkbox BOOLEAN;
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS exemple_photos_exemple TEXT[];
```

### ✅ **2.2 - Vérification**
```sql
-- Vérifier que les colonnes sont créées
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'fiches' AND column_name LIKE 'exemple_%'
ORDER BY column_name;
```

---

## 🏗️ **ÉTAPE 3 : MISE À JOUR FormContext.jsx**

### ✅ **3.1 - Ajouter dans initialFormData**
```javascript
// Dans src/components/FormContext.jsx
// Remplacer section_exemple: {},
section_exemple: {
  champ_radio: null,
  champ_radio_details: "",
  champ_textarea: "",
  champ_select: "",
  champ_checkbox: null,
  photos_exemple: []
},
```

---

## 🔄 **ÉTAPE 4 : MISE À JOUR supabaseHelpers.js**

### ✅ **4.1 - Ajouter dans mapFormDataToSupabase()**
```javascript
// Dans src/lib/supabaseHelpers.js
// Ajouter après la dernière section
exemple_champ_radio: formData.section_exemple?.champ_radio ?? null,
exemple_champ_radio_details: formData.section_exemple?.champ_radio_details || null,
exemple_champ_textarea: formData.section_exemple?.champ_textarea || null,
exemple_champ_select: formData.section_exemple?.champ_select || null,
exemple_champ_checkbox: formData.section_exemple?.champ_checkbox ?? null,
exemple_photos_exemple: formData.section_exemple?.photos_exemple || [],
```

### ✅ **4.2 - Ajouter dans mapSupabaseToFormData()**
```javascript
// Dans src/lib/supabaseHelpers.js
// Ajouter après la dernière section
section_exemple: {
  champ_radio: supabaseData.exemple_champ_radio ?? null,
  champ_radio_details: supabaseData.exemple_champ_radio_details || "",
  champ_textarea: supabaseData.exemple_champ_textarea || "",
  champ_select: supabaseData.exemple_champ_select || "",
  champ_checkbox: supabaseData.exemple_champ_checkbox ?? null,
  photos_exemple: supabaseData.exemple_photos_exemple || []
},
```

---

## 📄 **ÉTAPE 5 : CRÉER LE COMPOSANT PAGE**

### ✅ **5.1 - Template composant OBLIGATOIRE**
```javascript
// src/pages/FicheExemple.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'

export default function FicheExemple() {
  // ⚠️ OBLIGATOIRE : Tous ces hooks pour le pattern standard
  const { 
    next, 
    back, 
    currentStep, 
    totalSteps, 
    getField, 
    updateField, 
    handleSave, 
    saveStatus 
  } = useForm()

  // PATTERN IMPORTANT : Récupérer formData pour les booléens
  const formData = getField('section_exemple')

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
          <h1 className="text-2xl font-bold mb-6">Titre Section</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* Exemple radio avec conditionnel */}
            <div>
              <label className="block font-semibold mb-3">Question radio</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.champ_radio === true}
                    onChange={() => handleRadioChange('section_exemple.champ_radio', 'true')}
                    className="w-4 h-4"
                  />
                  <span>Oui</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.champ_radio === false}
                    onChange={() => handleRadioChange('section_exemple.champ_radio', 'false')}
                    className="w-4 h-4"
                  />
                  <span>Non</span>
                </label>
              </div>
              
              {/* Affichage conditionnel */}
              {formData.champ_radio === true && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Détails..."
                    value={formData.champ_radio_details || ""}
                    onChange={(e) => handleInputChange('section_exemple.champ_radio_details', e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
              )}
            </div>

            {/* 🚨 OBLIGATOIRE : Indicateur de sauvegarde - PATTERN EXACT */}
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

            {/* 🚨 OBLIGATOIRE : Boutons navigation - PATTERN EXACT */}
            <div className="mt-6 flex justify-between">
              <Button 
                variant="ghost" 
                onClick={back} 
                disabled={currentStep === 0}
              >
                Retour
              </Button>
              <div className="flex gap-3">
                <Button 
                  variant="secondary"
                  onClick={handleSave}
                  disabled={saveStatus.saving}
                >
                  {saveStatus.saving ? 'Sauvegarde...' : 'Enregistrer'}
                </Button>
                <Button 
                  variant="primary" 
                  onClick={next}
                  disabled={currentStep === totalSteps - 1}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 🎯 **ÉTAPE 6 : INTÉGRATION DANS LE WIZARD**

### ✅ **6.1 - Ajouter dans FicheWizard.jsx**
```javascript
// Dans src/pages/FicheWizard.jsx
import FicheExemple from './FicheExemple'

// Dans le tableau steps, remplacer le PlaceholderSection par :
<FicheExemple key="exemple" />,
```

---

## 🧪 **ÉTAPE 7 : TESTS ET VALIDATION**

### ✅ **Tests obligatoires**
1. **Navigation** : Aller à la nouvelle section
2. **Saisie** : Remplir les champs (radio + conditionnel)
3. **Sauvegarde** : Cliquer "Enregistrer" → Message succès
4. **Persistence** : Recharger la page → Données présentes
5. **Navigation** : Changer de section et revenir → Données conservées

### ✅ **Vérification BDD**
```sql
-- Vérifier les données sauvegardées
SELECT exemple_* FROM fiches WHERE id = 'ID_FICHE';
```

---

## 🚨 **PATTERNS UI CRITIQUES À RESPECTER**

### ✅ **1. Messages de sauvegarde - PATTERN EXACT OBLIGATOIRE**
```javascript
// ✅ OBLIGATOIRE - Style exact avec fond coloré + padding + bordures
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

// ❌ INTERDIT - Style basique sans fond coloré
{saveStatus.saving && <div className="text-blue-600">⏳ Sauvegarde...</div>}

// ❌ INTERDIT - Messages dans les boutons
<Button>
  {saveStatus.saving && <div>Message</div>}  // ❌ CATASTROPHE !
  Enregistrer
</Button>

// ❌ INTERDIT - Styles différents (px-4 py-3, bg-blue-100, etc.)
<div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
```

### ✅ **2. Boutons navigation - PATTERN EXACT OBLIGATOIRE**
```javascript
// ✅ OBLIGATOIRE - Structure et disabled exacts
<div className="mt-6 flex justify-between">  {/* mt-6 pas pt-6 border-t */}
  <Button 
    variant="ghost" 
    onClick={back} 
    disabled={currentStep === 0}  {/* ✅ OBLIGATOIRE */}
  >
    Retour
  </Button>
  <div className="flex gap-3">  {/* gap-3 pas gap-2 */}
    <Button 
      variant="secondary"
      onClick={handleSave}
      disabled={saveStatus.saving}  {/* ✅ OBLIGATOIRE */}
    >
      {saveStatus.saving ? 'Sauvegarde...' : 'Enregistrer'}  {/* ✅ Texte dynamique */}
    </Button>
    <Button 
      variant="primary" 
      onClick={next}
      disabled={currentStep === totalSteps - 1}  {/* ✅ OBLIGATOIRE */}
    >
      Suivant
    </Button>
  </div>
</div>

// ❌ INTERDIT - Style incohérent
<div className="flex justify-between items-center pt-6 border-t">  // ❌ pt-6 border-t
<div className="flex gap-2">  // ❌ gap-2

// ❌ INTERDIT - Disabled manquants
<Button onClick={back}>Retour</Button>  // ❌ Pas de disabled
<Button onClick={next}>Suivant</Button>  // ❌ Pas de disabled

// ❌ INTERDIT - Texte statique
<Button onClick={handleSave}>Enregistrer</Button>  // ❌ Pas de texte dynamique
```

### ✅ **3. Hooks obligatoires**
```javascript
// ✅ OBLIGATOIRE - Tous ces hooks dans useForm()
const { 
  next, 
  back, 
  currentStep,    // ✅ Pour disabled boutons
  totalSteps,     // ✅ Pour disabled boutons
  getField, 
  updateField, 
  handleSave, 
  saveStatus      // ✅ Pour messages + disabled
} = useForm()

// ❌ INTERDIT - Hooks manquants
const { next, back, getField, updateField } = useForm()  // ❌ Manque hooks UI
```

### ✅ **4. Radio Buttons avec Booléens**
```javascript
// ✅ CORRECT - Récupérer formData puis propriété
const formData = getField('section_exemple')
const radioValue = formData.champ_radio  // true/false/null

// ❌ MAUVAIS - getField direct sur booléen
const radioValue = getField('section_exemple.champ_radio')
```

### ✅ **5. Affichage Conditionnel**
```javascript
// Pattern obligatoire pour conditions
{radioValue === true && (
  <div>Champs conditionnels</div>
)}
```

### ✅ **6. Mapping Supabase**
```javascript
// Booléens : utiliser ?? null (permet true/false/null)
exemple_boolean: formData.section_exemple?.boolean_field ?? null,

// Textes : utiliser || null (évite chaînes vides)
exemple_text: formData.section_exemple?.text_field || null,

// Arrays : utiliser || [] (valeur par défaut)
exemple_array: formData.section_exemple?.array_field || [],
```

---

## 📋 **CHECKLIST FINALE**

- [ ] Colonnes Supabase ajoutées et vérifiées
- [ ] `initialFormData` mis à jour dans FormContext
- [ ] `mapFormDataToSupabase()` étendu
- [ ] `mapSupabaseToFormData()` étendu  
- [ ] ✅ **COMPOSANT avec PATTERN UI EXACT (messages + boutons)**
- [ ] ✅ **HOOKS COMPLETS dans useForm()**
- [ ] Import ajouté dans FicheWizard
- [ ] Test sauvegarde ✅
- [ ] Test chargement ✅
- [ ] Test navigation ✅
- [ ] Test affichage conditionnel ✅

---

## 🎯 **BONNES PRATIQUES**

1. **Pattern de nommage cohérent** : `{section}_{champ}`
2. **Types Supabase standards** : `BOOLEAN`, `TEXT`, `INTEGER`, `TEXT[]`
3. **Mapping booléens** : Toujours `?? null` pour préserver true/false/null
4. **Structure composant** : Même layout que les sections existantes
5. **Tests immédiat** : Valider après chaque étape
6. **Organisation BDD** : Respecter l'ordre des sections existantes
7. **🚨 UI PATTERNS STRICTS** : Messages et boutons exacts, pas de variations !

---

## 🚨 **PAGES DE RÉFÉRENCE VALIDÉES**

Utiliser uniquement ces pages comme modèles :
- ✅ **FicheForm** (Propriétaire) - Logique spéciale bouton Annuler
- ✅ **FicheLogement** - Pattern standard parfait
- ✅ **FicheAirbnb** - Pattern standard parfait  
- ✅ **FicheBooking** - Pattern standard parfait
- ✅ **FicheCommuns** - Pattern standard parfait

**Ce process garantit une intégration parfaite sans casser l'existant !** ✅