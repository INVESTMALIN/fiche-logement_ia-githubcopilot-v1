// src/components/FormContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react' // Ajout de useCallback
import { useLocation } from 'react-router-dom'
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
  section_equip_spe_exterieur: {},
  section_communs: {},
  section_teletravail: {},
  section_bebe: {},
  section_securite: {}
}

export function FormProvider({ children }) {
  const location = useLocation()
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
    "Chambres", "Salle De Bains", "Cuisine 1", "Cuisine 2", "Salon / SAM", "Équip. Spé. / Extérie",
    "Communs", "Télétravail", "Bébé", "Sécurité"
  ]

  const totalSteps = sections.length

  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const generateFicheName = (data) => {
    const type = data.section_logement?.type;
    const ville = data.section_logement?.adresse?.ville;

    if (type && ville) return `${capitalize(type)} ${capitalize(ville)}`;
    if (ville) return `Logement ${capitalize(ville)}`;
    return "Nouvelle fiche";
  };

  // DÉPLACER ICI : handleLoad AVANT useEffect
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
  }, []); // handleLoad ne dépend de rien qui change à chaque rendu


  // NOUVEAU: Chargement automatique si ID dans URL
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const ficheId = params.get('id')
        
    if (ficheId && formData.id !== ficheId && !saveStatus.saving) {
      handleLoad(ficheId).then(result => {
        if(result.success) {
          if (result.data.nom === "Nouvelle fiche" || generateFicheName(result.data) === result.data.nom) {
              setHasManuallyNamedFiche(false);
          } else {
              setHasManuallyNamedFiche(true);
          }
        }
      });
    } else if (!ficheId && formData.id !== null) {
      // Si on passe d'une fiche avec ID à une URL sans ID (ex: nouvelle fiche), on réinitialise.
      resetForm();
    }
  }, [location.search, formData.id, saveStatus.saving, handleLoad]); // Dépendances: location.search pour l'URL, formData.id pour l'état actuel, saveStatus.saving pour éviter conflits, handleLoad pour éviter warning


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
      if (current === null || current === undefined || typeof current !== 'object') {
        return ""
      }
      current = current[key]
    }
    
    return current || ""
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setCurrentStep(0)
    setHasManuallyNamedFiche(false);
  }

  const handleSave = async () => {
    setSaveStatus({ saving: true, saved: false, error: null })
    
    try {
      console.log('Données à sauvegarder:', formData)
      
      const userId = user?.id || null
      
      const result = await saveFiche(formData, userId)
      
      console.log('Résultat sauvegarde:', result)
      
      if (result.success) {
        setFormData(result.data)
        setSaveStatus({ saving: false, saved: true, error: null })
        
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, saved: false }))
        }, 3000)
      } else {
        setSaveStatus({ saving: false, saved: false, error: result.message })
      }
    } catch (error) {
      console.error('Erreur complète:', error)
      setSaveStatus({ saving: false, saved: false, error: error.message || 'Erreur de connexion' })
    }
  }

  const updateStatut = async (newStatut) => {
    setSaveStatus({ saving: true, saved: false, error: null });
    try {
      const updatedFormData = { ...formData, statut: newStatut };
      const userId = user?.id || null;
      const result = await saveFiche(updatedFormData, userId);

      if (result.success) {
        setFormData(result.data);
        setSaveStatus({ saving: false, saved: true, error: null });
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, saved: false }));
        }, 3000);
        return { success: true, message: `Statut mis à jour vers "${newStatut}"` };
      } else {
        setSaveStatus({ saving: false, saved: false, error: result.message });
        return { success: false, error: result.message };
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      setSaveStatus({ saving: false, saved: false, error: error.message || 'Erreur de connexion' });
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
      
      getFormDataPreview
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