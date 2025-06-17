# 🗺️ ROADMAP.md - Fiche Logement Letahost
*Planification & Prochaines étapes - Juin 2025*

---

## 🎯 **OBJECTIF FINAL**

**Remplacement complet de Jotform** avec une application moderne qui améliore la productivité des coordinateurs terrain tout en maintenant la compatibilité workflow Monday.com existant.

---

## 🏁 **MILESTONES MAJEURS**

### **🎯 Milestone 1 : MVP Fonctionnel** ✅ ATTEINT
- ✅ 5 sections principales opérationnelles
- ✅ Dashboard + CRUD complet
- ✅ Smart naming system
- ✅ Navigation fluide + persistance
- **Date :** Juin 2025

### **🎯 Milestone 2 : Remplacement Jotform** 🔥 EN COURS
- 🔥 **Pré-population Monday** (BLOQUANT)
- ⚙️ Workflow statuts complet
- 📋 10+ sections additionnelles
- **Target :** Juillet 2025

### **🎯 Milestone 3 : Features Avancées**
- 🖼️ Upload photos/vidéos Google Drive
- 📄 Génération PDF automatique
- 🔄 Sync Monday.com bidirectionnelle
- **Target :** Septembre 2025

### **🎯 Milestone 4 : Scale & Polish**
- 👥 Système rôles (Admin, Super Admin)
- 📊 Analytics & reporting
- 🎨 UI/UX refinements
- **Target :** Novembre 2025

---

## 🚨 **SPRINT 1 - CRITIQUE (Semaine prochaine)**
*Bloquants pour remplacement Jotform*

### **🔥 PRIORITÉ ABSOLUE : Pré-population Monday**
**Pourquoi critique :** Sans ça, rupture workflow coordinateurs = échec adoption

**Implémentation :**
```javascript
// Dans FormContext useEffect
const mondayParams = {
  'proprietaire': queryParams.get('proprietaire'),
  'adresse': queryParams.get('adresse'), 
  'ville': queryParams.get('ville'),
  'email': queryParams.get('email')
  // + mapping complet champs Monday
}

// Auto-remplissage nouvelle fiche
Object.entries(mondayParams).forEach(([key, value]) => {
  if (value) updateField(mapMondayField(key), decodeURIComponent(value))
})
```

**Tests requis :**
- [ ] URL Monday → Champs pré-remplis
- [ ] Smart naming fonctionne avec données Monday
- [ ] Sauvegarde inclut données pré-remplies
- [ ] Validation aucune régression workflow

**Estimation :** 2-3 heures

### **⚙️ Menu contextuel Dashboard**
**Pourquoi important :** Interface plus propre mobile + preparation archivage

**Implémentation :**
```javascript
// Remplacer bouton 🗑️ par menu ⋮
<DropdownMenu>
  <MenuItem onClick={() => navigate(`/fiche?id=${fiche.id}`)}>
    ✏️ Modifier
  </MenuItem>
  <MenuItem onClick={() => handleArchive(fiche)}>
    📁 Archiver
  </MenuItem>
  <MenuItem onClick={() => handleDelete(fiche)}>
    🗑️ Supprimer
  </MenuItem>
</DropdownMenu>
```

**Estimation :** 2 heures

### **📊 Workflow statuts : Archivage**
**Features :**
- [ ] Fonction `updateFicheStatut(id, newStatut)` dans helpers
- [ ] Action "Archiver" dans menu contextuel  
- [ ] Onglet "Archivé" dans Dashboard (fiches archivées séparées)
- [ ] Bouton "Désarchiver" si nécessaire

**Estimation :** 3 heures

**🎯 Total Sprint 1 :** 7-8 heures → **Prêt pour remplacement Jotform !**

---

## 📋 **SPRINT 2 - EXPANSION FORMULAIRE (2 semaines)**
*Sections critiques métier*

### **📋 Sections prioritaires métier**
**Critères sélection :** Impact coordinateur + fréquence usage

1. **Réglementation** (FicheReglementation.jsx)
   - Autorisations mairie, copropriété
   - Conformité location courte durée  
   - Assurances obligatoires
   - **Estimation :** 4h

2. **Exigences Letahost** (FicheExigences.jsx)
   - Standards qualité internes
   - Check-list conformité
   - Notes évaluateur
   - **Estimation :** 3h

3. **Chambres** (FicheChambres.jsx)
   - Nombre lits par chambre
   - Type literie, rangements
   - Équipements par chambre
   - **Estimation :** 5h (logique multiple chambres)

4. **Sécurité** (FicheSécurité.jsx)
   - Détecteurs fumée, CO
   - Alarmes, caméras
   - Consignes sécurité
   - **Estimation :** 4h

5. **Équipements** (FicheEquipements.jsx)
   - Inventaire électroménager
   - État, marques, références
   - Instructions d'usage
   - **Estimation :** 4h

**🎯 Total Sprint 2 :** 20h → **12 sections opérationnelles**

---

## 🖼️ **SPRINT 3 - MULTIMÉDIA & INTEGRATION (3 semaines)**
*Photos, vidéos, PDF*

### **📸 Upload Photos/Vidéos Google Drive**

**Architecture :**
```javascript
// Nouveau composant PhotoUpload.jsx
const PhotoUpload = ({ section, fieldName, multiple = false }) => {
  const uploadToDrive = async (files) => {
    // 1. Upload vers Google Drive API
    // 2. Récupérer URL publique  
    // 3. Sauver URL dans formData[section][fieldName]
  }
  
  return (
    <div>
      <input type="file" accept="image/*,video/*" />
      <div>Previews photos existantes</div>
    </div>
  )
}
```

**Intégration sections :**
- FicheClefs → Photos interphone, boîtes, clefs
- FicheLogement → Photos extérieur, entrée
- Toutes sections → Photos équipements spécifiques

**Tasks :**
- [ ] Setup Google Drive API credentials
- [ ] Composant PhotoUpload réutilisable
- [ ] Integration FormContext (URLs dans JSONB)
- [ ] Compression images automatique mobile
- [ ] Preview + suppression photos

**Estimation :** 25h

### **📄 Génération PDF Make.com**

**Workflow :**
```
Fiche finalisée → Webhook Make.com → 
GPT enrichissement texte → Template PDF → 
Sauvegarde Drive → Lien retour Supabase
```

**Tasks :**
- [ ] Webhook déclencheur "Finaliser fiche"
- [ ] Template PDF professionnel (interne + client)
- [ ] Enrichissement GPT descriptions
- [ ] Sauvegarde PDF organisée Drive

**Estimation :** 15h

**🎯 Total Sprint 3 :** 40h → **Application multimédia complète**

---

## 👥 **SPRINT 4 - SCALE & ADMIN (4 semaines)**
*Gestion utilisateurs, permissions*

### **🔐 Système de rôles avancé**

**Rôles définis :**
```javascript
const ROLES = {
  coordinateur: {
    permissions: ['read_own_fiches', 'write_own_fiches', 'delete_own_fiches']
  },
  admin: {
    permissions: ['read_all_fiches', 'export_data']  
  },
  super_admin: {
    permissions: ['*', 'manage_users', 'system_config']
  }
}
```

**Pages nouvelles :**
- AdminPanel.jsx → Gestion users, permissions
- Analytics.jsx → Stats usage, completion rates
- Settings.jsx → Configuration application

**Estimation :** 30h

### **🔄 Monday.com sync bidirectionnelle**

**Features :**
- Création item Monday depuis fiche finalisée
- Update automatique statuts
- Sync données critiques (dates, statuts, PDFs)

**Estimation :** 20h

**🎯 Total Sprint 4 :** 50h → **Solution enterprise-ready**

---

## 📊 **MÉTRIQUES DE SUCCÈS PAR SPRINT**

### **Sprint 1 - Critères acceptation**
- [ ] **100% compatibilité** liens Monday existants
- [ ] **0