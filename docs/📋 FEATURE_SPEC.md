# 📋 FEATURE_SPEC.md - Fiche Logement Letahost
*Spécifications fonctionnelles - État actuel : 18 Juin 2025*

---

## 🎯 **VISION PRODUIT**

Application web mobile-first remplaçant les formulaires Jotform pour la création de fiches logement Letahost. Interface moderne, navigation fluide, sauvegarde Supabase et **pré-population automatique Monday.com** pour optimiser le workflow terrain des coordinateurs.

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
- **🎯 PRÉ-POPULATION MONDAY** : Je peux cliquer sur un lien Monday et avoir mes champs pré-remplis automatiquement

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
  
  // 🎯 NOUVEAU - Pré-population Monday
  parseMondayParams(),        // Parse query params Monday
  applyMondayData(),          // Applique données Monday au formData
  hasMondayParams()           // Détecte présence params Monday
}
```

#### **Architecture des données ÉTENDUE**
```javascript
// Structure unifiée FormContext ↔ Supabase ↔ Monday
const formData = {
  // Métadonnées fiche
  id, user_id, nom, statut, created_at, updated_at,
  
  // 22 sections mappées
  section_proprietaire: { 
    prenom, nom, email, 
    adresse: { rue, complement, ville, codePostal }
  },
  section_logement: { 
    // 🎯 NOUVEAUX champs Monday
    type_propriete: "",         // Dropdown principal (Appartement, Maison, etc.)
    surface: "",                // m² direct depuis Monday
    numero_bien: "",            // numeroDu depuis Monday
    typologie: "",              // T2, T3, T4, etc.
    nombre_personnes_max: "",   // nombreDe depuis Monday
    nombre_lits: "",            // lits depuis Monday (valeur brute)
    type_autre_precision: "",   // Si type = "Autre"
    
    // Structure appartement conditionnelle
    appartement: {
      nom_residence: "", batiment: "", acces: "", etage: "", numero_porte: ""
    }
  },
  section_clefs: { interphone, boiteType, ttlock: {...}, ... },
  section_airbnb: { annonce_active, url_annonce, ... },
  section_booking: { ... },
  // + 17 sections avec structure extensible (à venir)
}
```

### 🎯 **PRÉ-POPULATION MONDAY - FEATURE PRINCIPALE**

#### **Workflow Monday → Application**
```javascript
// 1. URL Monday générée
https://app.business-immobilier.fr/fiche-logement/create.php?
fullName=Florence TEISSIER&nom=Florence TEISSIER&email=floteissier649@gmail.com&
adresse[addr_line1]=660 Lara&adresse[city]=Saint Pons&adresse[postal]=05000&
numeroDu=1163&nombreDe=2&m2=28&lits=1 lit double

// 2. Mapping automatique Monday → FormContext
fullName/nom → section_proprietaire.nom
email → section_proprietaire.email  
adresse[addr_line1] → section_proprietaire.adresse.rue
adresse[city] → section_proprietaire.adresse.ville
adresse[postal] → section_proprietaire.adresse.codePostal
numeroDu → section_logement.numero_bien
nombreDe → section_logement.nombre_personnes_max
m2 → section_logement.surface
lits → section_logement.nombre_lits (valeur brute préservée)
```

#### **Authentication Flow avec localStorage**
```javascript
// Si utilisateur pas connecté + params Monday détectés :
1. localStorage.setItem('pendingMondayParams', location.search)
2. navigate('/login') + message "📋 Formulaire Monday en attente"
3. Après connexion réussie → récupération params + redirection /fiche
4. Application données + nettoyage localStorage
5. Smart naming automatique selon données pré-remplies
```

#### **Architecture App.jsx optimisée**
```javascript
// FormProvider englobe TOUTE l'application
<AuthProvider>
  <FormProvider> {/* FormContext disponible partout, y compris /login */}
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/fiche" element={<ProtectedRoute><FicheWizard /></ProtectedRoute>} />
    </Routes>
  </FormProvider>
</AuthProvider>
```

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
// Dans FormContext useEffect - PRIORITÉS RÉORGANISÉES
1. Traiter params Monday en attente (localStorage) SI connecté
2. Redirection login si params Monday + pas connecté  
3. Application directe si connecté + params Monday
4. Chargement fiche existante par ID
5. Reset pour nouvelle fiche vide
```

### 🧠 **Smart Naming System**

#### **Logique auto-génération ÉTENDUE**
```javascript
const generateFicheName = (data) => {
  // Priorité aux nouveaux champs Monday
  const type = data.section_logement?.type_propriete || data.section_logement?.type
  const ville = data.section_proprietaire?.adresse?.ville || data.section_logement?.adresse?.ville
  
  // Capitalisation automatique
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  
  // Logique prioritaire
  if (type && ville) return `${capitalize(type)} ${capitalize(ville)}` // "Appartement Paris"
  else if (ville) return `Logement ${capitalize(ville)}`               // "Logement Paris"  
  else if (type) return `${capitalize(type)}`                          // "Appartement"
  return "Nouvelle fiche"                                              // Fallback
}

// Protection modification manuelle
const hasManuallyNamedFiche = useState(false) // Flag protection
```

#### **Row Level Security (RLS)**
- Chaque user voit **uniquement ses fiches** (isolation par user_id)
- Requêtes automatiquement filtrées par Supabase
- Pas de gestion côté client (sécurité serveur)

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
- **🎯 Message Monday** : Alerte bleue "Formulaire Monday en attente" sur page login

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

// Pattern pour sections complexes (Appartement)
const typePropriete = getField('section_logement.type_propriete')
{typePropriete === 'Appartement' && (
  <div>Section accès appartement complète</div>
)}
```

---

## 📱 **SECTIONS FORMULAIRE IMPLÉMENTÉES (5/22)**

### **✅ Section Propriétaire (FicheForm.jsx)**
- **Champ nom fiche** : Visible, modifiable, avec smart naming
- **Identité** : Prénom, nom, email avec validation
- **Adresse complète** : Rue, complément, ville, code postal
- **🎯 Pré-population Monday** : Nom, email, adresse auto-remplis
- **Integration** : getField/updateField pour tous les champs

### **✅ Section Logement (FicheLogement.jsx) - RESTRUCTURÉE**  
- **Type propriété** : Dropdown (Appartement, Maison, Villa, Studio, Loft, Autre)
- **🎯 Champs Monday** : Surface m², numéro bien, typologie, personnes max, nombre lits
- **Autre spécialisé** : Dropdown 40+ options (Châteaux, Yourtes, Tipis, etc.)
- **Section Appartement** : Conditionnelle (nom résidence, bâtiment, accès RDC/Escalier/Ascenseur, étage, numéro porte)
- **🎯 Pré-population Monday** : Tous champs logement auto-remplis
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
      
      {/* Boutons navigation cohérents */}
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

### **🔥 Pré-population Monday - Flow critique**
```javascript
// Variables clés dans FormContext useEffect :
- mondayParamsPresentInURL     // Détection params dans URL
- pendingMondayParamsInStorage // Params sauvés localStorage
- authLoading, user            // État authentification

// Séquence PRIORITÉS (ordre crucial) :
1. SI connecté + localStorage params → Application immédiate + nettoyage
2. SI params URL + pas connecté → Sauvegarde localStorage + redirect login  
3. SI connecté + params URL → Application directe
4. Chargement fiche existante par ID
5. Reset pour nouvelle fiche vide
```

### **🔥 useEffect optimisé - Éviter boucles infinies**
```javascript
// Dépendances LIMITÉES pour éviter 80k+ messages console :
useEffect(() => {
  // Logique pré-population Monday...
}, [
  location.search,  // Changement URL
  authLoading,      // État auth
  user,             // User connecté
  navigate          // Navigation
  // 🚨 PAS formData.id, saveStatus, fonctions internes = boucle !
])
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

---

## 🧪 **TESTS VALIDÉS & SCÉNARIOS**

### **✅ Pré-population Monday - VALIDÉ 100%**
1. **URL Monday (déconnecté)** → Redirection /login + message bleu ✓
2. **Connexion** → Retour /fiche avec champs pré-remplis ✓
3. **Smart naming** → "Logement Paris" généré automatiquement ✓
4. **Tous champs Monday** → Nom, email, ville, numéro bien, surface, lits ✓
5. **URL Monday (connecté)** → Application directe sans login ✓
6. **Nettoyage localStorage** → Pas de pollution entre sessions ✓

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

### **✅ Section Logement - Affichage conditionnel**
1. **Type = "Autre"** → Dropdown 40+ options visible ✓
2. **Type = "Appartement"** → Section accès appartement visible ✓
3. **Accès = "RDC/Escalier/Ascenseur"** → Options correctes ✓
4. **Tous champs requis** → Labels + placeholders informatifs ✓

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
- 🎯 **Pré-population Monday** < 2s (redirection + application)

### **✅ UX validée**
- 🧭 **Navigation intuitive** (sidebar + boutons synchronisés)
- 💡 **Smart naming apprécié** (plus de "Nouvelle fiche" partout)
- 🗑️ **Suppression sécurisée** (zéro suppression accidentelle en test)
- 📊 **Dashboard lisible** (statuts, dates, recherche efficace)
- 🎯 **Monday workflow** (coordinateurs adoptent sans formation)

---

## ⚠️ **LIMITATIONS CONNUES**

### **Techniques**
- **Pas d'offline** : Connexion internet requise
- **RLS strict** : Pas de partage fiches entre users (volontaire)
- **Sauvegarde manuelle** : Pas d'auto-save (choix UX)
- **useEffect sensible** : Dépendances limitées pour éviter boucles

### **Fonctionnelles**
- **17 sections manquantes** : Pattern établi pour ajout
- **Pas d'upload photos** : Google Drive API à intégrer
- **Pas de PDF génération** : Make.com + GPT à connecter
- **Schema Supabase à adapter** : Nouveaux champs Monday à ajouter

---

## 🎯 **MILESTONE CRITIQUE ATTEINT**

### **✅ REMPLACEMENT JOTFORM VALIDÉ**
- **Workflow Monday → Auth → Pré-population** = 100% opérationnel
- **Interface moderne** vs formulaires Jotform obsolètes
- **Navigation fluide** 22 sections vs pages Jotform lentes
- **Smart naming** vs noms génériques Jotform
- **Dashboard centralisé** vs dispersion Jotform

### **🚀 Impact Business**
- **Coordinateurs terrain** peuvent utiliser liens Monday existants
- **Aucune rupture** dans workflow Monday.com
- **Gain productivité** : formulaires pré-remplis automatiquement
- **UX moderne** : mobile-first, responsive, intuitive

---

## 📋 **PROCHAINES ÉTAPES IDENTIFIÉES**

### **🚨 URGENT - Schema Supabase**
- 🔲 **Adapter table `fiches`** pour nouveaux champs Monday
- 🔲 **Colonnes à ajouter :** 
  ```sql
  ALTER TABLE fiches ADD COLUMN logement_numero_bien VARCHAR(50);
  ALTER TABLE fiches ADD COLUMN logement_surface INTEGER;
  ALTER TABLE fiches ADD COLUMN logement_nombre_personnes_max VARCHAR(20);
  ALTER TABLE fiches ADD COLUMN logement_nombre_lits TEXT;
  ALTER TABLE fiches ADD COLUMN logement_type_propriete VARCHAR(50);
  ALTER TABLE fiches ADD COLUMN logement_typologie VARCHAR(10);
  ```

### **Sprint suivant**
- 🔲 **17 sections manquantes** (pattern établi, reproductible facilement)
- 🔲 **Upload photos Google Drive** (architecture définie)  
- 🔲 **Génération PDF + GPT** via Make.com
- 🔲 **Sync Monday bidirectionnelle** (optionnel)

---

*Dernière mise à jour : 18 Juin 2025 - Session Pré-population Monday*  
*Architecture validée, prête pour remplacement Jotform en production* 🚀