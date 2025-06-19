// src/components/FormContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom' // Ajout useNavigate
import { saveFiche, loadFiche } from '../lib/supabaseHelpers'
import { useAuth } from './AuthContext'

const FormContext = createContext()

const initialFormData = {
  id: null,
  user_id: null,
  created_at: null,
  updated_at: null,
  nom: "Nouvelle fiche",
  statut: "Brouillon",
  
  section_proprietaire: {
    prenom: "",
    nom: "",
    email: "",
    adresse: {
      rue: "",
      complement: "",
      ville: "",
      codePostal: ""
    }
  },
  section_logement: {
    // Nouveaux champs Monday
    type_propriete: "",           // Dropdown principal (Appartement, Maison, etc.)
    surface: "",                  // m² direct depuis Monday
    numero_bien: "",              // numeroDu depuis Monday
    typologie: "",                // T2, T3, T4, etc.
    nombre_personnes_max: "",     // nombreDe depuis Monday
    nombre_lits: "",              // lits depuis Monday (valeur brute)
    type_autre_precision: "",     // Si type = "Autre"
    
    // Structure appartement conditionnelle
    appartement: {
      nom_residence: "",
      batiment: "",
      acces: "",                  // RDC, Escalier, Ascenseur
      etage: "",
      numero_porte: ""
    },
    
    // Legacy - à garder pour compatibilité existante
    type: "",
    adresse: {
      rue: "",
      complement: "",
      ville: "",
      codePostal: "",
      batiment: "",
      etage: "",
      numeroPorte: ""
    },
    caracteristiques: {
      nombrePieces: "",
      nombreChambres: "",
      surface: ""
    },
    acces: ""
  },
  section_clefs: {
    interphone: null,
    interphoneDetails: "",
    interphonePhoto: null,
    tempoGache: null,
    tempoGacheDetails: "",
    tempoGachePhoto: null,
    digicode: null,
    digicodeDetails: "",
    digicodePhoto: null,
    clefs: {
      photos: [],
      precision: "",
      prestataire: null,
      details: ""
    }
  },
  section_airbnb: {
    preparation_guide: {
      video_complete: false,
      photos_etapes: false
    },
    annonce_active: null,
    url_annonce: "",
    identifiants_obtenus: null,
    email_compte: "",
    mot_passe: "",
    explication_refus: ""
  },
  section_booking: {
    annonce_active: null,
    url_annonce: "",
    identifiants_obtenus: null,
    email_compte: "",
    mot_passe: "",
    explication_refus: ""
  },

  section_reglementation: {
    ville_changement_usage: "",        // "NON !" ou nom de ville spécifique
    date_expiration_changement: "",    // Date d'expiration
    numero_declaration: "",            // Numéro de déclaration (partagé)
    ville_declaration_simple: "",      // "NON !" ou nom de ville spécifique
    details_reglementation: "",        // Textarea pour détails (toujours visible)
    
    // Documents checklist (toujours visible)
    documents: {
      carte_identite: false,
      rib: false,
      cerfa: false,
      assurance_pno: false,
      rcp: false,
      acte_propriete: false
    }
  },

  section_exigences: {},
  section_avis: {},
  section_gestion_linge: {},
  section_equipements: {},
  section_consommables: {},
  section_visite: {},
  section_chambres: {},
  section_salle_de_bains: {},
  section_cuisine_1: {},
  section_cuisine_2: {},
  section_salon_sam: {},
  section_equip_spe_exterieur: {},
  section_communs: {},
  section_teletravail: {},
  section_bebe: {},
  section_securite: {}
}

export function FormProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate() // Ajout navigation
  const { user, loading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(initialFormData)
  const [saveStatus, setSaveStatus] = useState({ 
    saving: false, 
    saved: false, 
    error: null 
  })
  const [hasManuallyNamedFiche, setHasManuallyNamedFiche] = useState(false)

  const sections = [
    "Propriétaire", "Logement", "Clefs", "Airbnb", "Booking", "Réglementation",
    "Exigences", "Avis", "Gestion Linge", "Équipements", "Consommables", "Visite",
    "Chambres", "Salle De Bains", "Cuisine 1", "Cuisine 2", "Salon / SAM", "Équip. Spé. / Extérieur",
    "Communs", "Télétravail", "Bébé", "Sécurité"
  ]

  const totalSteps = sections.length

  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const generateFicheName = (data) => {
    // Priorité aux nouveaux champs section_logement
    const type = data.section_logement?.type_propriete || data.section_logement?.type;
    const ville = data.section_proprietaire?.adresse?.ville || data.section_logement?.adresse?.ville;

    if (type && ville) return `${capitalize(type)} ${capitalize(ville)}`;
    if (ville) return `Logement ${capitalize(ville)}`;
    return "Nouvelle fiche";
  };

  // 🎯 FONCTION: Parser les paramètres Monday
  const parseMondayParams = useCallback((queryParams) => {
    const mondayData = {}
    
    // 👤 Section Propriétaire
    const fullName = queryParams.get('fullName') || queryParams.get('nom')
    const email = queryParams.get('email')
    const adresseRue = queryParams.get('adresse[addr_line1]')
    const adresseVille = queryParams.get('adresse[city]')
    const adressePostal = queryParams.get('adresse[postal]')
    
    if (fullName || email || adresseRue || adresseVille || adressePostal) {
      mondayData.section_proprietaire = {}
      
      if (fullName) mondayData.section_proprietaire.nom = decodeURIComponent(fullName)
      if (email) mondayData.section_proprietaire.email = decodeURIComponent(email)
      
      if (adresseRue || adresseVille || adressePostal) {
        mondayData.section_proprietaire.adresse = {}
        if (adresseRue) mondayData.section_proprietaire.adresse.rue = decodeURIComponent(adresseRue)
        if (adresseVille) mondayData.section_proprietaire.adresse.ville = decodeURIComponent(adresseVille)
        if (adressePostal) mondayData.section_proprietaire.adresse.codePostal = decodeURIComponent(adressePostal)
      }
    }
    
    // 🏠 Section Logement
    const numeroDu = queryParams.get('numeroDu')
    const nombreDe = queryParams.get('nombreDe')
    const m2 = queryParams.get('m2')
    const lits = queryParams.get('lits')
    
    if (numeroDu || nombreDe || m2 || lits) {
      mondayData.section_logement = {}
      
      if (numeroDu) mondayData.section_logement.numero_bien = decodeURIComponent(numeroDu)
      if (nombreDe) mondayData.section_logement.nombre_personnes_max = decodeURIComponent(nombreDe)
      if (m2) mondayData.section_logement.surface = decodeURIComponent(m2)
      if (lits) mondayData.section_logement.nombre_lits = decodeURIComponent(lits)
    }
    
    return mondayData
  }, [])

  // 🎯 FONCTION: Appliquer données Monday au formData
  const applyMondayData = useCallback((currentFormData, mondayData) => {
    const newFormData = { ...currentFormData }
    
    // Merge sections en préservant les données existantes
    Object.entries(mondayData).forEach(([sectionName, sectionData]) => {
      if (sectionName === 'section_proprietaire' && sectionData.adresse) {
        // Merge spécial pour adresse propriétaire
        newFormData[sectionName] = {
          ...(newFormData[sectionName] || {}),
          ...sectionData,
          adresse: {
            ...(newFormData[sectionName]?.adresse || {}),
            ...sectionData.adresse
          }
        }
      } else {
        // Merge standard pour les autres sections
        newFormData[sectionName] = {
          ...(newFormData[sectionName] || {}),
          ...sectionData
        }
      }
    })
    
    // Mettre à jour timestamp
    newFormData.updated_at = new Date().toISOString()
    
    return newFormData
  }, [])

  // 🎯 FONCTION: Appliquer données Monday depuis URL
  const applyMondayDataFromURL = useCallback((searchParams) => {
    const params = new URLSearchParams(searchParams)
    const mondayData = parseMondayParams(params)
    
    if (Object.keys(mondayData).length > 0) {
      console.log('🎯 Application données Monday depuis URL:', mondayData)
      
      const newFormData = applyMondayData(formData, mondayData)
      setFormData(newFormData)
      
      // Smart naming avec nouvelles données
      const generatedName = generateFicheName(newFormData)
      if (generatedName !== "Nouvelle fiche") {
        setFormData(prev => ({ ...prev, nom: generatedName }))
      }
      
      console.log('✅ Pré-population Monday terminée')
    }
  }, [formData, parseMondayParams, applyMondayData])

  // 🎯 FONCTION: Détection params Monday robuste
  const hasMondayParams = useCallback((searchParams) => {
    const params = new URLSearchParams(searchParams)
    const mondayParamKeys = ['fullName', 'nom', 'email', 'adresse[addr_line1]', 'adresse[city]', 'adresse[postal]', 'numeroDu', 'nombreDe', 'm2', 'lits']
    return mondayParamKeys.some(param => params.get(param))
  }, [])

  // DÉPLACER resetForm AVANT useEffect
  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setCurrentStep(0)
    setHasManuallyNamedFiche(false)
    setSaveStatus({ saving: false, saved: false, error: null })
  }, [])

  // handleLoad function
  const handleLoad = useCallback(async (ficheId) => {
    setSaveStatus({ saving: true, saved: false, error: null });
    try {
      const result = await loadFiche(ficheId)
      
      if (result.success) {
        setFormData(result.data)
        setCurrentStep(0)
        setSaveStatus({ saving: false, saved: true, error: null });
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, saved: false }))
        }, 3000)
        return { success: true, data: result.data }
      } else {
        setSaveStatus({ saving: false, saved: false, error: result.message });
        return { success: false, error: result.message }
      }
    } catch (error) {
      setSaveStatus({ saving: false, saved: false, error: error.message || 'Erreur de connexion' });
      return { success: false, error: 'Erreur de connexion' }
    }
  }, []);

  // 🎯 useEffect RÉORGANISÉ - PRIORITÉS selon Gemini
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ficheId = params.get('id');
    const mondayParamsPresentInURL = hasMondayParams(location.search);
    const pendingMondayParamsInStorage = localStorage.getItem('pendingMondayParams');

    // 🐛 DEBUG LOGS (commentés pour éviter spam)
    // console.log("--- FormContext useEffect ---");
    // console.log("location.search:", location.search);
    // console.log("ficheId:", ficheId);
    // console.log("mondayParamsPresentInURL:", mondayParamsPresentInURL);
    // console.log("pendingMondayParamsInStorage:", pendingMondayParamsInStorage);
    // console.log("authLoading:", authLoading);
    // console.log("user:", user);
    // console.log("formData.id:", formData.id);
    // console.log("formData.nom:", formData.nom);
    // console.log("---------------------------");

    // 🎯 PRIORITÉ 1: Traiter params Monday en attente APRÈS LOGIN
    if (user && pendingMondayParamsInStorage) {
        console.log('✅ Utilisateur connecté ET Monday params en attente. Application des données.');
        localStorage.removeItem('pendingMondayParams');
        const mondayData = parseMondayParams(new URLSearchParams(pendingMondayParamsInStorage));
        const newFormDataAfterMonday = applyMondayData(formData, mondayData);
        setFormData(newFormDataAfterMonday);

        // Smart naming
        const generatedName = generateFicheName(newFormDataAfterMonday);
        if (generatedName !== "Nouvelle fiche") {
            setHasManuallyNamedFiche(false);
            setFormData(prev => ({ ...prev, nom: generatedName }));
        }
        return; // STOP - Données appliquées
    }

    // 🎯 PRIORITÉ 2: Redirection login si params Monday + pas connecté
    if (mondayParamsPresentInURL && !ficheId && !authLoading && !user) {
        console.log('🔐 Utilisateur non connecté, sauvegarde params Monday pour après login.');
        localStorage.setItem('pendingMondayParams', location.search);
        navigate('/login', { replace: true });
        return; // STOP - Redirection en cours
    }

    // 🎯 PRIORITÉ 3: Application directe si connecté + params Monday
    if (user && mondayParamsPresentInURL && !ficheId && formData.id === null) {
        console.log('✅ Utilisateur déjà connecté, application directe des données Monday.');
        const mondayData = parseMondayParams(params);
        const newFormDataAfterMonday = applyMondayData(formData, mondayData);
        setFormData(newFormDataAfterMonday);

        const generatedName = generateFicheName(newFormDataAfterMonday);
        if (generatedName !== "Nouvelle fiche") {
            setHasManuallyNamedFiche(false);
            setFormData(prev => ({ ...prev, nom: generatedName }));
        }
        return; // STOP - Données appliquées
    }

    // 🎯 PRIORITÉ 4: Chargement fiche existante par ID
    if (ficheId && formData.id !== ficheId && !saveStatus.saving) {
      console.log('📂 Chargement de la fiche existante par ID:', ficheId);
      handleLoad(ficheId).then(result => {
        if (result.success) {
          if (result.data.nom === "Nouvelle fiche" || generateFicheName(result.data) === result.data.nom) {
            setHasManuallyNamedFiche(false);
          } else {
            setHasManuallyNamedFiche(true);
          }
        }
      });
      return; // STOP - Chargement en cours
    } 
    
    // 🎯 PRIORITÉ 5: Reset pour nouvelle fiche vide
    if (!ficheId && !mondayParamsPresentInURL && formData.id !== null) {
        console.log('🔄 Réinitialisation du formulaire pour une nouvelle fiche vide.');
        resetForm();
    }

  }, [
    location.search,
    authLoading,
    user,
    navigate
    // 🚨 SUPPRIMÉ les dépendances problématiques qui causent la boucle :
    // - formData.id, saveStatus.saving, handleLoad, 
    // - hasMondayParams, parseMondayParams, applyMondayData, generateFicheName, resetForm
  ]);

  const next = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const back = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goTo = (step) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step)
    }
  }

  const getCurrentSection = () => sections[currentStep]

  const updateSection = (sectionName, newData) => {
    setFormData(prev => {
      const updatedData = {
        ...prev,
        [sectionName]: {
          ...(prev[sectionName] || {}),
          ...newData
        },
        updated_at: new Date().toISOString()
      };

      if (!hasManuallyNamedFiche && sectionName === 'section_logement') {
        const generatedName = generateFicheName(updatedData);
        if (generatedName !== "Nouvelle fiche") {
          updatedData.nom = generatedName;
        }
      }
      return updatedData;
    });
  }

  const updateField = (fieldPath, value) => {
    setFormData(prev => {
      const newData = { ...prev }
      const keys = fieldPath.split('.')
      let current = newData
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || current[keys[i]] === null) {
          current[keys[i]] = {}
        } else if (typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {}
        } else {
          current[keys[i]] = { ...current[keys[i]] }
        }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      
      if (fieldPath === 'nom') {
        setHasManuallyNamedFiche(value !== "Nouvelle fiche");
      } else if (!hasManuallyNamedFiche) {
        const generatedName = generateFicheName(newData);
        if (generatedName !== "Nouvelle fiche") {
          newData.nom = generatedName;
        }
      }

      newData.updated_at = new Date().toISOString()
      
      return newData
    })
  }

  const getSection = (sectionName) => {
    return formData[sectionName] || {}
  }

  const getField = (fieldPath) => {
    const keys = fieldPath.split('.')
    let current = formData
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return ""
      }
    }
    
    return current !== null && current !== undefined ? current : ""
  }

  const handleSave = async () => {
    if (!user?.id) {
      setSaveStatus({ saving: false, saved: false, error: 'Utilisateur non connecté' });
      return { success: false, error: 'Utilisateur non connecté' };
    }

    setSaveStatus({ saving: true, saved: false, error: null });
    
    try {
      const dataToSave = {
        ...formData,
        user_id: user.id
      };

      const result = await saveFiche(dataToSave);
      
      if (result.success) {
        setFormData(result.data);
        setSaveStatus({ saving: false, saved: true, error: null });
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, saved: false }))
        }, 3000)
        return { success: true, data: result.data };
      } else {
        setSaveStatus({ saving: false, saved: false, error: result.message });
        return { success: false, error: result.message };
      }
    } catch (error) {
      const errorMessage = error.message || 'Erreur de connexion';
      setSaveStatus({ saving: false, saved: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const updateStatut = async (newStatut) => {
    if (!formData.id) {
      setSaveStatus({ saving: false, saved: false, error: 'Aucune fiche à mettre à jour' });
      return { success: false, error: 'Aucune fiche à mettre à jour' };
    }

    try {
      const updatedData = { ...formData, statut: newStatut };
      const result = await saveFiche(updatedData);
      
      if (result.success) {
        setFormData(result.data);
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.message };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Erreur de connexion' };
    }
  };
  
  const finaliserFiche = () => updateStatut('Complété');
  const archiverFiche = () => updateStatut('Archivé');

  const getFormDataPreview = () => {
    return {
      currentSection: getCurrentSection(),
      completedSections: Object.keys(formData).filter(key => 
        key.startsWith('section_') && 
        Object.values(formData[key]).some(val => val !== "" && val !== null)
      ),
      formData
    }
  }

  // 🐛 DEBUG HELPER (optionnel)
  const getMondayDebugInfo = () => {
    const params = new URLSearchParams(location.search)
    return {
      queryParams: Object.fromEntries(params.entries()),
      mondayParsed: parseMondayParams(params),
      formDataCurrent: formData,
      hasMondayParams: hasMondayParams(location.search)
    }
  }

  return (
    <FormContext.Provider value={{ 
      currentStep, 
      totalSteps, 
      sections,
      next, 
      back, 
      goTo, 
      getCurrentSection,
      
      formData,
      updateSection,
      updateField,
      getSection,
      getField,
      resetForm,
      
      handleSave,
      handleLoad,
      saveStatus,
      updateStatut,
      finaliserFiche,
      archiverFiche,
      
      getFormDataPreview,
      getMondayDebugInfo  // Pour debugging
    }}>
      {children}
    </FormContext.Provider>
  )
}

export function useForm() {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('useForm must be used within a FormProvider')
  }
  return context
}