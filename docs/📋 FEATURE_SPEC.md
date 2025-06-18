# 📋 FEATURE_SPEC.md - Fiche Logement Letahost
*Spécifications fonctionnelles - État actuel : Juin 2025*

---

## 🎯 **VISION PRODUIT**

Application web mobile-first remplaçant les formulaires Jotform pour la création de fiches logement Letahost. Interface moderne, navigation fluide, sauvegarde Supabase et intelligence automatique pour optimiser le workflow terrain des coordinateurs.

---

## 👥 **USER STORIES IMPLÉMENTÉES**

### ✅ **Coordinateur Terrain**
- **Navigation fluide** : Je peux remplir une fiche étape par étape (22 sections) avec navigation libre
- **Persistance intelligente** : Je peux sauvegarder ma progression et revenir plus tard
- **Dashboard centralisé** : Je vois toutes mes fiches avec filtres et recherche
- **Modification facile** : Je peux rouvrir et modifier une fiche existante à tout moment
- **Nommage automatique** : Les noms de fiches se génèrent selon mes données (type + ville)
- **Contrôle utilisateur** : Je peux personnaliser le nom si je veux
- **Gestion erreurs** : Je peux supprimer mes fiches d'erreur facilement
- **Affichage conditionnel** : L'interface s'adapte selon mes réponses (radio buttons)

---

## ✅ **FEATURES CORE IMPLÉMENTÉES**

### 🏗️ **Architecture & State Management**

#### **FormContext - Cerveau de l'application**
```javascript
// State centralisé avec logiques complexes
const FormContext = {
  // Navigation
  currentStep: 0-21,          // Étape courante du wizard
  sections: [...],            // Liste des 22 sections
  next(), back(), goTo()      // Navigation programmable
  
  // Data management
  formData: initialFormData,  // Structure complète 22 sections
  updateField(),              // Mise à jour granulaire avec dot notation
  updateSection(),            // Mise à jour section complète
  getField(), getSection()    // Lecture sécurisée (jamais undefined)
  
  // Persistance
  handleSave(),               // Sauvegarde Supabase avec feedback
  handleLoad(),               // Chargement fiche existante
  saveStatus: {...}           // États UI (saving, saved, error)
  
  // Smart naming (innovation clé)
  generateFicheName(),        // Auto-génération intelligente
  hasManuallyNamedFiche       // Flag protection choix utilisateur
}
```

#### **Architecture des données**
```javascript
// Structure unifiée FormContext ↔ Supabase
const formData = {
  // Métadonnées fiche
  id, user_id, nom, statut, created_at, updated_at,
  
  // 22 sections mappées
  section_proprietaire: { prenom, nom, email, adresse: {...} },
  section_logement: { type, adresse: {...}, caracteristiques: {...} },
  section_clefs: { interphone, boiteType, ttlock: {...}, ... },
  section_airbnb: { annonce_active, url_annonce, ... },
  section_booking: { ... },
  // + 17 sections avec structure extensible (à venir)
}
```

### 🧠 **Smart Naming System**

#### **Logique auto-génération**
```javascript
const generateFicheName = (currentData) => {
  const type = currentData.section_logement?.type          // "appartement"
  const ville = currentData.section_logement?.adresse?.ville // "paris"
  
  // Capitalisation automatique
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  
  // Logique prioritaire
  if (type && ville) return `${capitalize(type)} ${capitalize(ville)}` // "Appartement Paris"
  else if (ville) return `Logement ${capitalize(ville)}`               // "Logement Paris"  
  else if (type) return `${capitalize(type)}`                          // "Appartement"
  return "Nouvelle fiche"                                              // Fallback
}
```

#### **Protection choix utilisateur**
```javascript
// Dans updateField() - Logique critique
if (fieldPath === 'nom') {
  // User modifie nom directement → mode manuel
  setHasManuallyNamedFiche(value !== "Nouvelle fiche")
} else if (!hasManuallyNamedFiche) {
  // User n'a pas pris contrôle → auto-génération autorisée
  const newName = generateFicheName(newData)
  if (shouldUpdateName(currentName, newName)) {
    newData.nom = newName
  }
}
```

### 📊 **Dashboard & Gestion Fiches**

#### **Hook useFiches - Interface Dashboard**
```javascript
export const useFiches = () => {
  const [fiches, setFiches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // CRUD operations
  const fetchFiches = async () => {
    const result = await getUserFiches(user.id)
    // Gestion states + erreurs
  }
  
  const handleDeleteFiche = async (ficheId) => {
    // Suppression optimiste : UI puis base
    setFiches(prev => prev.filter(f => f.id !== ficheId))
    await deleteFiche(ficheId)
  }
  
  return { fiches, loading, error, refetch, deleteFiche: handleDeleteFiche }
}
```

#### **Features Dashboard**
- **Filtres dynamiques** : "Tous", "Brouillon", "Complété", "Archivé" avec compteurs
- **Recherche temps réel** : Par nom de fiche, mise à jour instantanée
- **Suppression sécurisée** : Modal confirmation + suppression optimiste
- **Navigation intelligente** : 
  - `navigate('/fiche')` → Nouvelle fiche
  - `navigate(`/fiche?id=${fiche.id}`)` → Modification fiche existante

### 💾 **Persistance & Supabase Integration**

#### **Mapping bidirectionnel**
```javascript
// FormContext → Supabase (mapFormDataToSupabase)
{
  nom: formData.nom,
  proprietaire_prenom: formData.section_proprietaire?.prenom,
  logement_type: formData.section_logement?.type,
  // ... mapping complet vers colonnes plates
}

// Supabase → FormContext (mapSupabaseToFormData)  
{
  section_proprietaire: {
    prenom: supabaseData.proprietaire_prenom || "",
    // ... reconstruction structure imbriquée
  }
}
```

#### **CRUD Helpers format uniforme**
```javascript
// Pattern obligatoire pour tous les helpers
return {
  success: true/false,
  data: ...,           // Si success
  error: "...",        // Si échec
  message: "..."       // Feedback utilisateur
}

// Exemples implémentés
- saveFiche(formData, userId)     // CREATE/UPDATE avec détection automatique
- loadFiche(ficheId)              // READ avec mapping automatique  
- getUserFiches(userId)           // LIST avec tri par updated_at
- deleteFiche(ficheId)            // DELETE simple
```

### 🔐 **Authentification & Sécurité**

#### **AuthContext Supabase**
```javascript
// Gestion auth centralisée
const useAuth = () => ({
  user,                    // Objet user Supabase ou null
  loading,                 // État chargement session
  signIn(email, password), // Connexion
  signOut(),               // Déconnexion
  isAuthenticated: !!user  // Helper boolean
})

// Protection routes
<ProtectedRoute>
  <FormProvider>
    <FicheWizard />
  </FormProvider>
</ProtectedRoute>
```

#### **Row Level Security (RLS)**
- Chaque user voit **uniquement ses fiches** (isolation par user_id)
- Requêtes automatiquement filtrées par Supabase
- Pas de gestion côté client (sécurité serveur)

### 🧭 **Navigation & UX**

#### **Navigation unifiée**
```javascript
// Système centralisé dans FormContext
const navigation = {
  currentStep: 0-21,                    // Index section courante
  next(): setCurrentStep(step + 1),     // Avancer
  back(): setCurrentStep(step - 1),     // Reculer  
  goTo(index): setCurrentStep(index)    // Aller à section directe
}

// Synchronisation sidebar ↔ boutons
// Même source de vérité partout
```

#### **Barre de progression intelligente**
- **22 points** représentant chaque section
- **Pourcentage completion** calculé dynamiquement
- **États visuels** : complété (doré), actuel (cerclé), à venir (gris)
- **Tooltips** avec noms des sections
- **Responsive** : adaptation mobile automatique

#### **Chargement automatique URL**
```javascript
// Dans FormContext useEffect
const location = useLocation()
const queryParams = new URLSearchParams(location.search)
const ficheId = queryParams.get('id')

if (ficheId && !initialLoadComplete) {
  // Chargement automatique fiche existante
  const result = await handleLoad(ficheId)
  // + gestion hasManuallyNamedFiche selon nom chargé
}
```

---

## 🎨 **INTERFACE & DESIGN**

### **Mobile-First Responsive**
- **Breakpoints** : Mobile → Tablet → Desktop
- **Navigation** : Sidebar collapsible, boutons tactiles optimisés
- **Grilles** : 1 → 2 → 3 colonnes selon écran
- **Typography** : Hiérarchie claire, contraste optimisé

### **Feedback Utilisateur**
- **États loading** : Spinners + messages explicites
- **Messages succès/erreur** : Couleurs, icônes, auto-disparition
- **Confirmations** : Modals pour actions destructives
- **Placeholders** : Textes informatifs et guidants

### **Affichage Conditionnel**
```javascript
// Pattern pour champs selon réponses radio
const formData = getField('section_clefs')  // Pour booléens
const interphone = formData.interphone      // true/false/null

{interphone === true && (
  <div>
    <input placeholder="Détails interphone..." />
  </div>
)}
```

---

## 📱 **SECTIONS FORMULAIRE IMPLÉMENTÉES (5/22)**

### **✅ Section Propriétaire (FicheForm.jsx)**
- **Champ nom fiche** : Visible, modifiable, avec smart naming
- **Identité** : Prénom, nom, email avec validation
- **Adresse complète** : Rue, complément, ville, code postal
- **Integration** : getField/updateField pour tous les champs

### **✅ Section Logement (FicheLogement.jsx)**  
- **Type** : Select (Appartement, Maison, Studio, etc.)
- **Adresse logement** : Distincte de l'adresse propriétaire
- **Caractéristiques** : Nombre pièces, chambres, surface
- **Accès** : Description textuelle
- **Smart naming** : Type + ville → génération automatique nom

### **✅ Section Clefs (FicheClefs.jsx)**
- **Interphone** : Radio Oui/Non + détails conditionnels
- **Tempo gâche** : Radio + détails + photo
- **Digicode** : Radio + détails + photo  
- **Types boîtes** : TTlock, Igloohome, Masterlock
- **Champs spécialisés** : Codes spécifiques par type de boîte
- **Affichage conditionnel** : Interface adaptative selon réponses

### **✅ Section Airbnb (FicheAirbnb.jsx)**
- **Annonce active** : Radio Oui/Non
- **URL annonce** : Conditionnelle si active
- **Identifiants** : Radio obtenus/non + champs email/password
- **Guide préparation** : Checkboxes vidéo/photos
- **Explication refus** : Textarea si pas d'identifiants

### **✅ Section Booking (FicheBooking.jsx)**
- **Structure identique** : Même logique qu'Airbnb
- **Champs parallèles** : URL, identifiants, explication
- **Affichage conditionnel** : Même patterns

---

## 🧪 **PATTERNS DE DÉVELOPPEMENT ÉTABLIS**

### **Création nouvelle section (Template)**
```javascript
// 1. Copier FicheForm.jsx → FicheNouvelle.jsx
// 2. Adapter les imports et le titre
// 3. Utiliser le pattern obligatoire :

const { getField, updateField, handleSave, saveStatus } = useForm()

// 4. Pour champs simples :
<input 
  value={getField('section_nouvelle.champ')}
  onChange={(e) => updateField('section_nouvelle.champ', e.target.value)}
/>

// 5. Pour radio buttons (ATTENTION booléens) :
const formData = getField('section_nouvelle')  // Pas getField direct!
const radioValue = formData.radio_field        // true/false/null

<input 
  type="radio" 
  checked={radioValue === true}
  onChange={() => updateField('section_nouvelle.radio_field', true)}
/>

// 6. Affichage conditionnel :
{radioValue === true && (
  <div>Champs conditionnels</div>
)}

// 7. Ajouter dans FicheWizard.jsx steps[]
```

### **Structure obligatoire composant section**
```javascript
<div className="flex min-h-screen">
  <SidebarMenu />
  <div className="flex-1 flex flex-col">
    <ProgressBar />
    <div className="flex-1 p-6 bg-gray-100">
      <h1 className="text-2xl font-bold mb-6">Titre Section</h1>
      
      {/* Champs formulaire */}
      
      {/* Messages sauvegarde */}
      {saveStatus.saving && <div>⏳ Sauvegarde...</div>}
      {saveStatus.saved && <div>✅ Sauvegardé !</div>}
      {saveStatus.error && <div>❌ {saveStatus.error}</div>}
      
      {/* Boutons navigation */}
      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={back}>Retour</Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleSave}>Enregistrer</Button>
          <Button variant="primary" onClick={next}>Suivant</Button>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## ⚡ **LOGIQUES CRITIQUES - À NE JAMAIS CASSER**

### **🔥 Smart Naming - Séquence exacte**
```javascript
// 1. User tape type "appartement" → updateField déclenché
// 2. hasManuallyNamedFiche vérifié (false = auto-gen autorisée)
// 3. generateFicheName() appelée avec nouvelles données
// 4. Conditions vérifiées (nom actuel = "Nouvelle fiche" ou ancien auto-généré)
// 5. Nouveau nom appliqué avec capitalisation
// 6. Si user modifie nom direct → hasManuallyNamedFiche = true (protection)
```

### **🔥 Navigation URL - Gestion états**
```javascript
// Variables clés dans FormContext useEffect :
- ficheId          // ID depuis URL (?id=123)
- authLoading      // Attendre auth avant chargement
- initialLoadComplete // Éviter boucles infinies

// Séquence chargement :
1. useEffect détecte ficheId dans URL
2. Attente authLoading = false (user disponible)
3. handleLoad(ficheId) appelé UNE FOIS
4. Success → formData mis à jour + hasManuallyNamedFiche défini
5. initialLoadComplete = true (stop boucle)
```

### **🔥 Suppression optimiste - Ordre opérations**
```javascript
// CORRECT (UI réactive) :
1. setFiches(prev => prev.filter(f => f.id !== ficheId))  // UI immédiate
2. await deleteFiche(ficheId)                             // Base après
3. Si erreur → refetch() pour corriger UI

// INCORRECT (UI lente) :
1. await deleteFiche(ficheId)   // User attend...
2. refetch()                    // Encore attendre...
```

### **🔥 FormContext updateField - Dot notation**
```javascript
// Gestion path complexes avec création objets :
'section_proprietaire.adresse.rue' → 
{
  section_proprietaire: {
    adresse: {
      rue: "valeur"
    }
  }
}

// Protection undefined + spread operators pour immutabilité
```

---

## 🧪 **TESTS VALIDÉS & SCÉNARIOS**

### **✅ Smart Naming complet**
1. **Nouvelle fiche** → "Nouvelle fiche" affiché ✓
2. **Type "Studio" + ville "Lyon"** → "Studio Lyon" généré ✓
3. **Modification manuelle** → "Mon Appart Personnel" protégé ✓
4. **Modification logement après manual** → Nom reste protégé ✓
5. **Reset nom à "Nouvelle fiche"** → Auto-génération reprend ✓
6. **Capitalisation** → "Appartement Paris" pas "appartement paris" ✓

### **✅ Workflow complet Dashboard ↔ Formulaire**
1. **Dashboard → Nouvelle fiche** → Formulaire vide ✓
2. **Remplissage + sauvegarde** → Retour Dashboard → Fiche listée ✓
3. **Dashboard → Modifier fiche** → Données pré-remplies ✓
4. **Modification + sauvegarde** → Timestamp updated_at mis à jour ✓
5. **Navigation sections** → Données persistantes entre pages ✓

### **✅ Suppression & gestion erreurs**
1. **Clic poubelle** → Modal confirmation ✓
2. **Confirmer** → Fiche disparaît immédiatement + BDD ✓
3. **Annuler** → Modal ferme, rien ne change ✓
4. **Filtres Dashboard** → Compteurs mis à jour automatiquement ✓

### **✅ Affichage conditionnel (FicheClefs)**
1. **Interphone = Non** → Champs détails cachés ✓
2. **Interphone = Oui** → Champs détails visibles ✓
3. **Type boîte TTlock** → Champs TTlock visibles uniquement ✓
4. **Sauvegarde booléens** → Values true/false/null correctes en base ✓

---

## 🚀 **ENVIRONNEMENTS & DÉPLOIEMENT**

### **Production**
- **URL :** https://fiche-logement-ia-githubcopilot-v1.vercel.app/
- **Auto-deploy :** Push `main` → Vercel
- **Database :** Supabase Production (RLS activé)
- **Performance :** Mobile 3G < 2s loading

### **Développement**  
- **Local :** `npm run dev` (Vite hot reload)
- **Database :** Même instance Supabase (isolation par user_id)
- **Debug :** Console logs + debug panels disponibles

---

## 📊 **MÉTRIQUES DE SUCCÈS ACTUELLES**

### **✅ Performance validée**
- ⏱️ **Chargement Dashboard** < 1s
- 💾 **Sauvegarde fiche** < 500ms  
- 📱 **Score mobile Lighthouse** > 85
- 🔄 **Navigation sections** instantanée

### **✅ UX validée**
- 🧭 **Navigation intuitive** (sidebar + boutons synchronisés)
- 💡 **Smart naming apprécié** (plus de "Nouvelle fiche" partout)
- 🗑️ **Suppression sécurisée** (zéro suppression accidentelle en test)
- 📊 **Dashboard lisible** (statuts, dates, recherche efficace)

---

## ⚠️ **LIMITATIONS CONNUES**

### **Techniques**
- **Pas d'offline** : Connexion internet requise
- **RLS strict** : Pas de partage fiches entre users (volontaire)
- **Sauvegarde manuelle** : Pas d'auto-save (choix UX)

### **Fonctionnelles**
- **17 sections manquantes** : Pattern établi pour ajout
- **Pas d'upload photos** : Google Drive API à intégrer
- **Pas de PDF génération** : Make.com + GPT à connecter
- **Statuts workflow incomplet** : "Archivé" pas opérationnel

---

*Dernière mise à jour : Session du 17 Juin 2025*  
*Architecture validée, prête pour extension 17 sections restantes*

---

## ⚠️ **CONTRAINTES & LIMITATIONS**

### **Business CRITIQUES**
- **🔥 COMPATIBILITÉ MONDAY** - Liens existants doivent fonctionner sans modification
  - Query parameters format : `?adresse=123+Rue&ville=Paris&proprietaire=Dupont`
  - Pré-remplissage automatique obligatoire (workflow actuel coordinateurs)
  - Pas de rupture dans l'expérience utilisateur

### **Techniques**
- **Supabase RLS** - Isolation users obligatoire
- **Mobile-first** - Design optimisé petit écran prioritaire
- **Offline** - Pas de support hors ligne (connexion requise)

### **Business**
- **Utilisateurs :** < 10 coordinateurs (pas de scale massive)
- **Budget :** Coûts Supabase minimaux (free tier suffisant)
- **Maintenance :** Solution simple et maintenable

### **UX**
- **Formation :** Transition douce depuis Jotform
- **Compatibilité :** Tous navigateurs mobiles récents
- **Accessibilité :** Contraste et tailles tactiles respectés

---

## 🎉 **SUCCÈS ACTUELS**

✅ **Dashboard fonctionnel** - Navigation + CRUD complet  
✅ **Smart naming** - Auto-génération + contrôle utilisateur  
✅ **Persistance robuste** - Sauvegarde + chargement fiables  
✅ **UX mobile** - Interface fluide sur terrain  
✅ **Architecture scalable** - Prêt pour 17 sections restantes  

**Status :** 🟢 **Prêt pour production MVP** avec 5 sections  
**Next :** 🎯 Menu contextuel + nouvelles sections  

---

*Dernière mise à jour : Session du 17 Juin 2025*  
*Contributeurs : Julien (PO), Claude (Dev), Gemini (Dev)*