import { createContext, useContext, useState } from 'react'

const FormContext = createContext()

// Structure initiale des données (compatible Supabase)
const initialFormData = {
  // Métadonnées
  id: null,
  user_id: null,
  created_at: null,
  updated_at: null,
  
  // Sections (mappées aux colonnes JSONB Supabase)
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
  // Placeholder pour les autres sections
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
  section_equip_spe_exterieur: {},
  section_communs: {},
  section_teletravail: {},
  section_bebe: {},
  section_securite: {}
}

export function FormProvider({ children }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(initialFormData)

  // Liste des sections pour mapper avec la sidebar
  const sections = [
    "Propriétaire", "Logement", "Clefs", "Airbnb", "Booking", "Réglementation",
    "Exigences", "Avis", "Gestion Linge", "Équipements", "Consommables", "Visite",
    "Chambres", "Salle De Bains", "Cuisine 1", "Cuisine 2", "Salon / SAM", "Équip. Spé. / Extérie",
    "Communs", "Télétravail", "Bébé", "Sécurité"
  ]

  const totalSteps = sections.length

  // Navigation
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

  // Gestion des données avec protection contre les undefined
  const updateSection = (sectionName, newData) => {
    setFormData(prev => {
      // S'assurer que la section existe
      const currentSection = prev[sectionName] || {}
      
      return {
        ...prev,
        [sectionName]: {
          ...currentSection,
          ...newData
        },
        updated_at: new Date().toISOString()
      }
    })
  }

  const updateField = (fieldPath, value) => {
    setFormData(prev => {
      const newData = { ...prev }
      const keys = fieldPath.split('.')
      let current = newData
      
      // Navigate to the parent of the target field, creating objects if needed
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || current[keys[i]] === null) {
          current[keys[i]] = {}
        } else if (typeof current[keys[i]] !== 'object') {
          // If it's a primitive value, convert to object
          current[keys[i]] = {}
        } else {
          // Clone the object to avoid mutations
          current[keys[i]] = { ...current[keys[i]] }
        }
        current = current[keys[i]]
      }
      
      // Set the value
      current[keys[keys.length - 1]] = value
      
      // Update timestamp
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
  }

  // Validation helper (pour plus tard)
  const validateSection = (sectionName) => {
    const section = formData[sectionName]
    // TODO: Implémenter la validation par section
    return { isValid: true, errors: [] }
  }

  // Debug helper
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
      // Navigation
      currentStep, 
      totalSteps, 
      sections,
      next, 
      back, 
      goTo, 
      getCurrentSection,
      
      // Data management
      formData,
      updateSection,
      updateField,
      getSection,
      getField,
      resetForm,
      validateSection,
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