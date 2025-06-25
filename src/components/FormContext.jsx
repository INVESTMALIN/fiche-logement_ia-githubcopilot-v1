import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { 
  saveFiche, 
  loadFiche, 
  deleteFiche, 
  checkExistingFiche,
  mapFormDataToSupabase,
  mapSupabaseToFormData 
} from '../lib/supabaseHelpers'

const FormContext = createContext()

const initialFormData = {
  id: null,
  user_id: null,
  nom: "Nouvelle fiche",
  statut: "brouillon",
  created_at: null,
  updated_at: null,
  
  section_proprietaire: {
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    adresse: {
      rue: "",
      complement: "",
      ville: "",
      codePostal: ""
    }
  },
  
  section_logement: {
    // 🎯 CHAMPS MONDAY ESSENTIELS
    type_propriete: "",
    surface: "",
    numero_bien: "",
    nombre_personnes_max: "",
    nombre_lits: "",
    typologie: "",
    type_autre_precision: "",
    
    // Structure appartement conditionnelle  
    appartement: {
      nom_residence: "",
      batiment: "",
      acces: "",
      etage: "",
      numero_porte: ""
    },
    
    // Legacy pour compatibilité
    type: "",
    caracteristiques: {
      surface: "",
      pieces: "",
      chambres: "",
      couchages: "",
      sdb: ""
    },
    adresse: {
      rue: "",
      complement: "",
      ville: "",
      codePostal: ""
    }
  },
  
  section_clefs: {},
  section_airbnb: {},
  section_booking: {},
  section_reglementation: {},
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
  section_equipements_exterieur: {},
  section_communs: {},
  section_teletravail: {},
  section_bebe: {},
  section_securite: {}
}

export function FormProvider({ children }) {
  const [formData, setFormData] = useState(initialFormData)
  const [currentStep, setCurrentStep] = useState(0)
  const [saveStatus, setSaveStatus] = useState({ saving: false, saved: false, error: null })
  const [hasManuallyNamedFiche, setHasManuallyNamedFiche] = useState(false)
  const [duplicateAlert, setDuplicateAlert] = useState(null)
  
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const sections = [
    "Propriétaire", "Logement", "Clefs", "Airbnb", "Booking", 
    "Réglementation", "Exigences", "Avis", "Gestion Linge", 
    "Équipements", "Consommables", "Visite", "Chambres", 
    "Salle De Bains", "Cuisine 1", "Cuisine 2", "Salon / SAM", 
    "Équip. Spé. / Extérieur", "Communs", "Télétravail", "Bébé", "Sécurité"
  ]

  const totalSteps = sections.length

  // 🎯 FONCTION: Smart naming avec capitalisation
  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const generateFicheName = (data) => {
    // Simple : utiliser le numéro de bien qui vient de Monday
    const numeroBien = data.section_logement?.numero_bien;
    
    if (numeroBien) return `Bien ${numeroBien}`;
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
      
      // Séparation fullName en prénom/nom
      if (fullName) {
        const decodedFullName = decodeURIComponent(fullName)
        const nameParts = decodedFullName.trim().split(' ')
        
        if (nameParts.length >= 2) {
          mondayData.section_proprietaire.prenom = nameParts[0]
          mondayData.section_proprietaire.nom = nameParts.slice(1).join(' ')
        } else {
          mondayData.section_proprietaire.prenom = decodedFullName
          mondayData.section_proprietaire.nom = ""
        }
      }
      
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

  // 🎯 FONCTION: Détection params Monday robuste
  const hasMondayParams = useCallback((searchParams) => {
    const params = new URLSearchParams(searchParams)
    const mondayParamKeys = ['fullName', 'nom', 'email', 'adresse[addr_line1]', 'adresse[city]', 'adresse[postal]', 'numeroDu', 'nombreDe', 'm2', 'lits']
    return mondayParamKeys.some(param => params.get(param))
  }, [])

  // 🎯 FONCTION: Appliquer données Monday avec smart naming
  const applyMondayDataAndGenerate = useCallback((mondayData) => {
    const newFormDataAfterMonday = applyMondayData(formData, mondayData);
    setFormData(newFormDataAfterMonday);

    const generatedName = generateFicheName(newFormDataAfterMonday);
    if (generatedName !== "Nouvelle fiche") {
      setHasManuallyNamedFiche(false);
      setFormData(prev => ({ ...prev, nom: generatedName }));
    }
  }, [formData, applyMondayData, generateFicheName, setHasManuallyNamedFiche]);

  // 🎯 FONCTION: Reset formulaire
  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setCurrentStep(0)
    setHasManuallyNamedFiche(false)
    setSaveStatus({ saving: false, saved: false, error: null })
  }, [])

  // 🎯 FONCTION: handleLoad avec gestion erreurs
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

  // 🎯 useEffect PRINCIPAL - Gestion Monday + Navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ficheId = params.get('id');
    const mondayParamsPresentInURL = hasMondayParams(location.search);
    const pendingMondayParamsInStorage = localStorage.getItem('pendingMondayParams');

    console.log("--- FormContext useEffect ---");
    console.log("location.search:", location.search);
    console.log("ficheId:", ficheId);
    console.log("mondayParamsPresentInURL:", mondayParamsPresentInURL);
    console.log("pendingMondayParamsInStorage:", pendingMondayParamsInStorage);
    console.log("authLoading:", authLoading);
    console.log("user:", !!user);
    console.log("---------------------------");

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
        
        // 🎯 REDIRECTION FORCÉE vers /fiche pour éviter que Login.jsx prenne le relais
        navigate('/fiche', { replace: true });
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
      console.log('✅ Utilisateur déjà connecté, vérification doublons avant application...');
      
      const mondayData = parseMondayParams(params);
      const numeroBien = mondayData.section_logement?.numero_bien;
      
      // 🔍 Check doublon si numéro de bien présent
      if (numeroBien) {
        checkExistingFiche(numeroBien, user.id).then(result => {
          if (result.exists) {
            // Afficher modal de confirmation
            setDuplicateAlert({
              existingFiche: result.fiche,
              mondayData: mondayData
            });
            return; // STOP - Attendre choix utilisateur
          } else {
            // Pas de doublon, application normale
            applyMondayDataAndGenerate(mondayData);
          }
        });
      } else {
        // Pas de numéro bien, application normale  
        applyMondayDataAndGenerate(mondayData);
      }
      return;
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
    // 🚨 DÉPENDANCES LIMITÉES pour éviter boucles infinies
  ]);

  // 🎯 FONCTIONS: Gestion modal doublons
  const handleOpenExisting = useCallback(() => {
    if (duplicateAlert?.existingFiche) {
      navigate(`/fiche?id=${duplicateAlert.existingFiche.id}`);
      setDuplicateAlert(null);
    }
  }, [duplicateAlert, navigate]);

  const handleCreateNew = useCallback(() => {
    if (duplicateAlert?.mondayData) {
      applyMondayDataAndGenerate(duplicateAlert.mondayData);
      setDuplicateAlert(null);
    }
  }, [duplicateAlert, applyMondayDataAndGenerate]);

  const handleCancelDuplicate = useCallback(() => {
    setDuplicateAlert(null);
    navigate('/');
  }, [navigate]);

  // 🎯 FONCTIONS: Navigation
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

  // 🎯 FONCTIONS: Gestion données
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

  // 🎯 FONCTIONS: Sauvegarde Supabase
  const handleSave = async () => {
    if (!user) {
      setSaveStatus({ saving: false, saved: false, error: 'Utilisateur non connecté' });
      return { success: false, error: 'Utilisateur non connecté' };
    }

    setSaveStatus({ saving: true, saved: false, error: null });

    try {
      const dataToSave = {
        ...formData,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      const result = await saveFiche(dataToSave);
      
      if (result.success) {
        setFormData(result.data);
        setSaveStatus({ saving: false, saved: true, error: null });
        
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, saved: false }));
        }, 3000);

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

  // 🎯 FONCTIONS: Gestion statuts
  const updateStatut = async (newStatut) => {
    const updatedData = { ...formData, statut: newStatut };
    setFormData(updatedData);
    return await handleSave();
  };

  const finaliserFiche = async () => {
    return await updateStatut('termine');
  };

  const archiverFiche = async () => {
    return await updateStatut('archive');
  };

  // 🎯 FONCTION: Debug Monday
  const getMondayDebugInfo = () => {
    const params = new URLSearchParams(location.search)
    return {
      queryParams: Object.fromEntries(params.entries()),
      mondayParsed: parseMondayParams(params),
      formDataCurrent: formData,
      hasMondayParams: hasMondayParams(location.search)
    }
  }

  // 🎯 FONCTION: Preview pour Dashboard
  const getFormDataPreview = () => {
    const propriétaire = formData.section_proprietaire || {};
    const logement = formData.section_logement || {};
    
    return {
      proprietaireNom: `${propriétaire.prenom || ''} ${propriétaire.nom || ''}`.trim() || 'Non renseigné',
      proprietaireEmail: propriétaire.email || 'Non renseigné',
      ville: propriétaire.adresse?.ville || logement.adresse?.ville || 'Non renseigné',
      typeLogement: logement.type_propriete || logement.type || 'Non renseigné',
      surface: logement.surface || logement.caracteristiques?.surface || 'Non renseigné',
      numeroBien: logement.numero_bien || 'Non renseigné'
    };
  };

  return (
    <FormContext.Provider value={{ 
      // Navigation
      currentStep, 
      totalSteps, 
      sections,
      next, 
      back, 
      goTo, 
      getCurrentSection,
      
      // Données
      formData,
      updateSection,
      updateField,
      getSection,
      getField,
      resetForm,
      
      // Sauvegarde
      handleSave,
      handleLoad,
      saveStatus,
      updateStatut,
      finaliserFiche,
      archiverFiche,
      
      // Utilitaires
      getFormDataPreview,
      getMondayDebugInfo,
      
      // Gestion doublons Monday
      duplicateAlert,
      handleOpenExisting,
      handleCreateNew,
      handleCancelDuplicate
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