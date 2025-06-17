# 📋 FEATURE_SPEC.md - Fiche Logement Letahost
*Mise à jour : Juin 2025*

---

## 🎯 **VISION PRODUIT**

Application web mobile-first pour remplacer les formulaires Jotform actuels. Permet aux coordinateurs terrain de créer des fiches logement structurées avec navigation fluide, sauvegarde Supabase et génération automatique des noms.

---

## 👥 **USER STORIES**

### ✅ **Coordinateur Terrain (Utilisateur Principal)**
- ✅ Je veux remplir une fiche logement étape par étape (22 sections)
- ✅ Je veux que l'app adapte les champs selon mes réponses (affichage conditionnel)
- ✅ Je veux sauvegarder ma progression et revenir plus tard
- ✅ Je veux voir toutes mes fiches dans un dashboard central
- ✅ Je veux modifier une fiche existante facilement
- ✅ Je veux que les noms de fiches se génèrent automatiquement
- ✅ Je veux pouvoir supprimer mes fiches d'erreur
- 🔲 Je veux archiver mes fiches terminées
- 🔲 Je veux uploader des photos/vidéos dans mes fiches

### 🔲 **Admin/Manager (Futur)**
- 🔲 Je veux voir toutes les fiches de tous les coordinateurs
- 🔲 Je veux exporter les données en PDF stylé
- 🔲 Je veux gérer les accès utilisateurs

---

## ✅ **FEATURES IMPLÉMENTÉES**

### 🏗️ **Architecture & Navigation**
- ✅ **FormContext centralisé** - State management robuste avec persistance
- ✅ **Navigation unifiée** - Sidebar + boutons synchronisés
- ✅ **Route unique** `/fiche` avec wizard 22 étapes
- ✅ **Barre de progression** - 22 points avec pourcentages et tooltips

### 📊 **Dashboard & Gestion Fiches**
- ✅ **Dashboard connecté Supabase** - Vraies données utilisateur
- ✅ **Filtres par statut** - Tous, Brouillon, Complété, Archivé
- ✅ **Recherche en temps réel** - Par nom de fiche
- ✅ **Suppression sécurisée** - Bouton 🗑️ avec modal confirmation
- ✅ **Compteurs dynamiques** - Nombre de fiches par statut

### 🧠 **Smart Naming System**
- ✅ **Auto-génération intelligente** - Basée sur type + ville logement
- ✅ **Mode manuel respecté** - User peut prendre contrôle du nom
- ✅ **Capitalisation correcte** - "Studio Lyon" pas "studio lyon"
- ✅ **Champ nom visible** - Modifiable dans section Propriétaire

### 💾 **Persistance & Supabase**
- ✅ **Sauvegarde manuelle** - Bouton "Enregistrer" avec feedback
- ✅ **Chargement automatique** - Fiches existantes via URL params
- ✅ **Mapping bijectionnel** - FormContext ↔ Colonnes Supabase
- ✅ **Gestion erreurs robuste** - Loading/Error states partout

### 🔐 **Authentification**
- ✅ **Auth Supabase** - Login/logout fonctionnel
- ✅ **Routes protégées** - Redirection si non connecté
- ✅ **User isolation** - Chaque user voit ses fiches uniquement

### 📱 **Mobile-First & UX**
- ✅ **Design responsive** - Mobile → Desktop
- ✅ **Affichage conditionnel** - Champs selon réponses radio
- ✅ **Feedback utilisateur** - Messages succès/erreur
- ✅ **Navigation fluide** - Retour/Suivant + sidebar

---

## 🔲 **FEATURES EN COURS**

### 📋 **Sections Formulaire (5/22 implémentées)**
- ✅ **Propriétaire** - Nom, email, adresse (avec smart naming)
- ✅ **Logement** - Type, caractéristiques, adresse
- ✅ **Clefs** - Boîtes à clés, digicode, interphone
- ✅ **Airbnb** - Annonce, identifiants, guide préparation  
- ✅ **Booking** - Annonce, identifiants
- 🔲 **Réglementation** - Conformité, autorisations
- 🔲 **Exigences** - Standards Letahost
- 🔲 **Avis** - Gestion reviews clients
- 🔲 **Gestion Linge** - Protocols nettoyage
- 🔲 **Équipements** - Inventaire général
- 🔲 **Consommables** - Stock maintenance
- 🔲 **Visite** - Check-list visite terrain
- 🔲 **Chambres** - Détails chambres individuelles
- 🔲 **Salle de Bains** - Équipements sanitaires
- 🔲 **Cuisine 1** - Équipements cuisson
- 🔲 **Cuisine 2** - Électroménager, vaisselle
- 🔲 **Salon/SAM** - Mobilier, divertissement
- 🔲 **Équip. Spé./Extérieur** - Piscine, jardin, etc.
- 🔲 **Communs** - Parties communes immeuble
- 🔲 **Télétravail** - Setup bureau, wifi
- 🔲 **Bébé** - Équipements enfants
- 🔲 **Sécurité** - Alarmes, caméras, etc.

---

## 🎯 **ROADMAP PRIORITÉS**

### 🚨 **Sprint 1 (Immédiat)**
- **🔥 PRÉ-POPULATION MONDAY** - **BLOQUANT REMPLACEMENT JOTFORM**
  - Lecture query parameters URL (`?adresse=123Rue&ville=Paris&proprietaire=Dupont`)
  - Pré-remplissage automatique champs FormContext
  - Compatibilité liens existants Monday → Notre app
- **Menu contextuel Dashboard** - Remplacer bouton 🗑️ par menu ⋮
  - Actions : Modifier, Archiver, Supprimer
  - Plus mobile-friendly
- **Workflow statuts** - Bouton "Finaliser fiche" (Brouillon → Complété)
- **Onglet "Archivé"** - Séparé des fiches actives

### 📋 **Sprint 2 (Court terme)**
- **3-5 sections importantes** - Réglementation, Exigences, Chambres
- **Validation par section** - Empêcher navigation si champs requis vides
- **Messages d'erreur précis** - Par champ avec indications

### 🖼️ **Sprint 3 (Moyen terme)**
- **Upload photos/vidéos** - Intégration Google Drive (120To dispo)
- **Génération PDF** - Make.com + GPT pour textes enrichis
- **Monday.com sync** - Création/update items automatique

### 👥 **Sprint 4 (Long terme)**
- **Système de rôles** - Admin, Super Admin
- **Panel admin** - Gestion utilisateurs
- **Analytics usage** - Tracking completion rates

---

## 🏗️ **ARCHITECTURE TECHNIQUE**

### **Stack Principal**
- **Frontend :** React 18 + Vite + Tailwind CSS
- **Backend :** Supabase (Auth + PostgreSQL + Storage)
- **Déploiement :** Vercel (auto-deploy main branch)
- **Intégrations :** Google Drive API, Make.com, Monday.com

### **Structure Codebase**
```
src/
├── components/
│   ├── FormContext.jsx          # State management centralisé
│   ├── AuthContext.jsx          # Authentification Supabase
│   ├── ProtectedRoute.jsx       # Routes sécurisées
│   ├── SidebarMenu.jsx          # Navigation sections
│   ├── ProgressBar.jsx          # Barre progression 22 étapes
│   └── Button.jsx               # Composant bouton réutilisable
├── pages/
│   ├── Dashboard.jsx            # Liste fiches + actions
│   ├── Login.jsx                # Page connexion
│   ├── FicheWizard.jsx          # Router 22 étapes
│   ├── FicheForm.jsx            # Section Propriétaire
│   ├── FicheLogement.jsx        # Section Logement
│   └── [17 autres sections...]  # Pattern établi
├── hooks/
│   ├── useFiches.js             # Hook gestion fiches Dashboard
│   └── [futurs hooks...]
├── lib/
│   ├── supabaseClient.js        # Configuration Supabase
│   ├── supabaseHelpers.js       # CRUD functions + mapping
│   └── [futurs helpers...]
└── App.jsx                      # Routes principales
```

### **Patterns de Développement**
- **Composants sections :** Copier `FicheForm.jsx` + adapter champs
- **State management :** `getField()` + `updateField()` obligatoires
- **Supabase helpers :** Format `{ success, data, error }` uniforme
- **Mobile-first :** Responsive par défaut, classes Tailwind

---

## 📊 **MÉTRIQUES CIBLES**

### **Performance**
- ⏱️ **Temps chargement** < 2s mobile 3G
- 📱 **Score mobile** > 90 (Lighthouse)
- 🔄 **Temps sauvegarde** < 1s

### **Usage**
- 📋 **Taux completion** > 80% fiches commencées
- ⚡ **Temps remplissage** < 15min par fiche complète
- 🔁 **Taux retour** > 60% fiches modifiées après création

### **Adoption**
- 👥 **10 coordinateurs** utilisateurs actifs
- 📈 **100+ fiches/mois** créées
- 🎯 **Remplacement Jotform** à 100%

---

## 🚀 **ENVIRONNEMENTS**

### **Production**
- **URL :** https://fiche-logement-ia-githubcopilot-v1.vercel.app/
- **Auto-deploy :** Push `main` → Vercel
- **Database :** Supabase Production
- **Monitoring :** Vercel Analytics

### **Développement**
- **Local :** `npm run dev` (Vite)
- **Database :** Supabase (même instance, RLS par user)
- **Hot reload :** Temps réel

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