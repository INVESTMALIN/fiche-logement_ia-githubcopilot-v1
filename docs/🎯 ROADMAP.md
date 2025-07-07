# 🗺️ ROADMAP - Fiche Logement Letahost
*Mise à jour : 01 juillet 2025*

---

## 🎯 **STATUT ACTUEL**

### **✅ Sections complètes** (22/22) - **FORMULAIRE COMPLET !**
1. ✅ **Propriétaire** - FicheForm.jsx
2. ✅ **Logement** - FicheLogement.jsx  
3. ✅ **Clefs** - FicheClefs.jsx
4. ✅ **Airbnb** - FicheAirbnb.jsx
5. ✅ **Booking** - FicheBooking.jsx
6. ✅ **Réglementation** - FicheReglementation.jsx
7. ✅ **Exigences** - FicheExigences.jsx
8. ✅ **Avis** - FicheAvis.jsx
9. ✅ **Gestion Linge** - FicheGestionLinge.jsx
10. ✅ **Équipements** - FicheEquipements.jsx
11. ✅ **Consommables** - FicheConsommables.jsx
12. ✅ **Visite** - FicheVisite.jsx
13. ✅ **Chambres** - FicheChambre.jsx
14. ✅ **Salle De Bains** - FicheSalleDeBains.jsx
15. ✅ **Cuisine 1** - FicheCuisine1.jsx
16. ✅ **Cuisine 2** - FicheCuisine2.jsx
17. ✅ **Salon / SAM** - FicheSalonSam.jsx
18. ✅ **Équip. Spé. / Extérieur** - FicheEquipExterieur.jsx
19. ✅ **Communs** - FicheCommuns.jsx
20. ✅ **Télétravail** - FicheTeletravail.jsx *(NOUVEAU)*
21. ✅ **Bébé** - FicheBebe.jsx *(NOUVEAU)*
22. ✅ **Sécurité** - FicheSecutite.jsx *(NOUVEAU)*

---

## 🏁 **MILESTONES**

### **✅ Milestone 1 : Fondations** 
- ✅ Architecture FormContext + Supabase
- ✅ Dashboard CRUD complet
- ✅ Navigation + Smart naming
- ✅ Système auth + permissions

### **✅ Milestone 2 : Remplacement Jotform**
- ✅ Pré-population Monday 100% opérationnelle
- ✅ Workflow statuts (Brouillon → Complété → Archivé)
- ✅ Patterns UI établis et maîtrisés

### **✅ Milestone 3 : Administration** 
- ✅ Console admin complète (/admin)
- ✅ Gestion utilisateurs (créer/modifier/désactiver)
- ✅ Système rôles (coordinateur/admin/super_admin)
- ✅ Recherche avancée fiches

### **✅ Milestone 4 : Complétion formulaire** - **TERMINÉ !**
- ✅ **22 sections complètes** avec logique conditionnelle complexe
- ✅ **Bouton "Finaliser"** avec changement statut + modal confirmation
- ✅ **Patterns UI uniformes** à travers toutes les sections
- ✅ **Sauvegarde/chargement** fonctionnel sur les 22 sections

### **🔄 Milestone 5 : Upload PDF Automatique** - **EN COURS**
- [ ] **Génération PDF programmatique** réutilisant PDFTemplate existant
- [ ] **Upload automatique Supabase Storage** lors finalisation fiche  
- [ ] **Intégration Make** HTTP GET pour récupération PDF
- [ ] **Organisation Drive** dispatch PDF + photos par dossiers

### **🎯 Milestone 6 : Finalisation multimédia** - **PLANIFIÉ**
- [ ] **PDF Ménage** template séparé avec mapping champs spécifiques
- [ ] **Upload photos** remplacement input file sections restantes
- [ ] **Tests end-to-end** workflow complet frontend → Make → Drive/Monday

---

## 📋 **PROCHAINES PRIORITÉS**

### **🔥 Priorité immédiate**
1. **Upload PDF automatique** (EN COURS)
   - [ ] Installer html2pdf.js
   - [ ] Créer bucket "fiche-pdfs" Supabase
   - [ ] Adapter generatePDFBlob() réutilisant PDFTemplate
   - [ ] Modifier handleFinaliser() avec upload automatique
   - [ ] Configurer modules Make HTTP GET

2. **Upload photos sections restantes** 
   - [ ] Remplacer input file par PhotoUpload dans 8 sections restantes
   - [ ] Tester workflow complet upload → sauvegarde → chargement

### **Court terme**
3. **PDF Ménage** 
   - [ ] Créer PDFMenageTemplate.jsx (mapping champs ménage)
   - [ ] Intégrer génération double PDF (logement + ménage)

4. **Organisation Drive Make**
   - [ ] Configurer dispatch photos par dossiers Drive
   - [ ] Mapping sections → structure dossiers souhaitée

### **Moyen terme**
5. **Tests & Stabilisation**
   - [ ] Tests end-to-end workflow complet
   - [ ] Validation performance génération PDF
   - [ ] Monitoring uploads Drive/Monday

---

## 🔄 **PROCHAINE PHASE : UPLOAD PDF & FINALISATION MULTIMÉDIA**

### **🎯 Objectifs immédiats**
1. **PDF automatique** - Upload Storage lors finalisation  
2. **PDF Ménage** - Template séparé pour coordinateurs ménage
3. **Photos restantes** - PhotoUpload dans 8 sections manquantes
4. **Make integration** - Workflow Drive/Monday complet

**🎯 Objectif final :** Workflow 100% automatisé finalisation → PDF + photos → Drive structuré → Monday mis à jour