# 📋 FEATURE_SPEC - Fiche Logement Letahost
*Spécifications fonctionnelles - Mise à jour : 25 Juilet 2025*

---

## 🎯 **VISION PRODUIT**

Application web mobile-first remplaçant le formulaire Jotform pour la création de fiches logement Letahost. Interface moderne, navigation fluide, sauvegarde Supabase et **pré-population automatique Monday.com** pour optimiser le workflow sur le terrain des coordinateurs.

---

## ✅ **FEATURES CORE IMPLÉMENTÉES**

### 🏗️ **Architecture & State Management**

#### **FormContext - Cerveau de l'application**
```javascript
const FormContext = {
  // Navigation
  currentStep: 0-21,          // Étape courante du wizard
  sections: [...],            // Liste des 23 sections
  next(), back(), goTo()      // Navigation programmable
  
  // Data management
  formData: initialFormData,  // Structure complète 23 sections
  updateField(),              // Mise à jour granulaire avec dot notation
  updateSection(),            // Mise à jour section complète
  getField(), getSection()    // Lecture sécurisée (jamais undefined)
  
  // Persistance
  handleSave(),               // Sauvegarde Supabase avec feedback
  handleLoad(),               // Chargement fiche existante
  saveStatus: {...}           // États UI (saving, saved, error)
  
  // Smart naming
  generateFicheName(),        // Auto-génération intelligente
  hasManuallyNamedFiche       // Flag protection choix utilisateur
  
  // Pré-population Monday
  parseMondayParams(),        // Parse query params Monday
  applyMondayData(),          // Applique données Monday au formData
  hasMondayParams()           // Détecte présence params Monday
}
```

#### **Authentication & Permissions**
```javascript
const AuthSystem = {
  // Rôles
  coordinateur: "read/write own fiches only",
  admin: "unused for now", 
  super_admin: "full access + user management + admin console",
  
  // Sécurité
  rls_strict: "user_id isolation",
  protected_routes: "/admin → super_admin only",
  session_management: "Supabase Auth",
  
  // Administration
  console_admin: "/admin complete",
  user_management: "create/modify/disable users",
  advanced_search: "real-time filtering"
}
```

### 🎯 **Pré-population Monday - Feature principale**

#### **Workflow Monday → Application**
```javascript
// URL Monday générée automatiquement
https://app.business-immobilier.fr/fiche?
nom=Florence%20TEISSIER&email=floteissier649@gmail.com&
adresse_rue=660%20Lara&adresse_ville=Saint%20Pons&adresse_postal=05000&
numero_bien=1163&nombre_personnes_max=2&surface=28&nombre_lits=1

// Mapping automatique Monday → FormContext
nom → section_proprietaire.nom
email → section_proprietaire.email  
adresse_rue → section_proprietaire.adresse.rue
adresse_ville → section_proprietaire.adresse.ville
adresse_postal → section_proprietaire.adresse.codePostal
numero_bien → section_logement.numero_bien
nombre_personnes_max → section_logement.nombre_personnes_max
surface → section_logement.surface
nombre_lits → section_logement.nombre_lits
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

---

## 📱 **SECTIONS FORMULAIRE IMPLÉMENTÉES (23/23)**

### **✅ Sections complètes**
1. **Propriétaire** - Identité + adresse + pré-population Monday
2. **Logement** - Type propriété + champs Monday + section appartement conditionnelle  
3. **Clefs** - Interphone + types boîtes + champs spécialisés + affichage conditionnel
4. **Airbnb** - Annonce active + identifiants + guide préparation
5. **Booking** - Structure identique à Airbnb
6. **Réglementation** - Documents + déclarations + changement usage
7. **Exigences** - Nuits minimum + checkin/checkout + restrictions
8. **Avis** - Collecte feedback + amélioration service
9. **Gestion Linge** - Inventaire + photos + état + emplacement
10. **Équipements** - Techniques + commodités + parking détaillé
11. **Consommables** - Fournis/non fournis + types café + sur demande
12. **Visite** - Types pièces + nombre chambres/SDB + vidéo visite
13. **Chambres** - Accordéons dynamiques + compteurs lits + équipements
14. **Salle De Bains** - Accordéons dynamiques + équipements + WC séparé + accès
15. **Cuisine 1** -
16. **Cuisine 2**
17. **Salon / SAM** -
18. **Équip. Spé. / Extérieur** -
19. **Communs** -
20. **Télétravail** -
21. **Bébé** -
22. **Guide d'accès** -
23. **Sécurité** -

---

## 🧪 **PATTERNS DE DÉVELOPPEMENT ÉTABLIS**

### **Template nouvelles sections**
```javascript
// Pattern obligatoire pour tous composants
const { getField, updateField, handleSave, saveStatus } = useForm()

// Pour champs simples
<input 
  value={getField('section_nouvelle.champ')}
  onChange={(e) => updateField('section_nouvelle.champ', e.target.value)}
/>

// Pour radio buttons (CRITIQUE : pas getField direct sur booléens)
const formData = getField('section_nouvelle')
const radioValue = formData.radio_field  // true/false/null

// Affichage conditionnel
{radioValue === true && (
  <div>Champs conditionnels</div>
)}

// Structure accordéons dynamiques (Chambres/SDB)
const nombreElements = parseInt(getField('section_visite.nombre_chambres')) || 0
{Array.from({ length: nombreElements }, (_, index) => (
  <AccordeonElement key={`element_${index + 1}`} />
))}
```

### **Classes CSS Standards**
```javascript
// Labels
className="block font-semibold mb-1"

// Inputs  
className="w-full p-2 border rounded"

// Grilles responsive
className="grid grid-cols-1 md:grid-cols-2 gap-4"

// Accordéons headers
className="w-full px-4 py-3 bg-teal-600 text-white flex items-center justify-between hover:bg-teal-700"
```

---

## 🎨 **INTERFACE & DESIGN**

### **Mobile-First Responsive**
- **Breakpoints** : Mobile → Tablet → Desktop
- **Navigation** : Sidebar collapsible + boutons synchronisés
- **Grilles** : 1 → 2 → 3 colonnes selon écran
- **Accordéons** : Interface adaptative pour sections complexes

### **Feedback Utilisateur**
- **États loading** : Spinners + messages explicites
- **Messages succès/erreur** : Couleurs, icônes, auto-disparition
- **Confirmations** : Modals pour actions destructives
- **Affichage conditionnel** : Interface reactive selon réponses utilisateur

### **Système couleurs**
- **Coordinateur** : Doré (#dbae61) + Noir (#000000)
- **Admin** : Rouge pour différenciation console
- **Feedback** : Vert (succès), Bleu (info), Rouge (erreur)

---

## 🔒 **SÉCURITÉ & PERMISSIONS**

### **Row Level Security (RLS)**
- Chaque user voit **uniquement ses fiches** (isolation par user_id)
- Requêtes automatiquement filtrées par Supabase
- Pas de gestion côté client (sécurité serveur)

### **Système rôles**
- **coordinateur** : CRUD fiches personnelles + dashboard
- **super_admin** : Accès console admin + gestion utilisateurs + toutes fiches

### **Console Administration (/admin)**
- Gestion utilisateurs (créer/modifier/désactiver)
- Vue globale toutes fiches + recherche avancée
- Statistiques temps réel
- Protection route super_admin uniquement

---

## 🚀 **ÉTAT ACTUEL & PERFORMANCE**

### **✅ Validé en production**
- **23 sections fonctionnelles** avec sauvegarde/chargement
- **Pré-population Monday** opérationnelle
- **Console admin** complète et sécurisée
- **Dashboard** avec recherche temps réel
- **Navigation fluide** 23 sections

### **Métriques actuelles**
- ⏱️ **Chargement Dashboard** < 1s
- 💾 **Sauvegarde fiche** < 500ms  
- 📱 **Score mobile** > 85
- 🔄 **Navigation sections** instantanée
- 🎯 **Pré-population Monday** < 2s

---

*📅 Dernière mise à jour : 01 août 2025*