import { createContext, useContext, useState } from 'react'

const FormContext = createContext()

export function FormProvider({ children }) {
  const [currentStep, setCurrentStep] = useState(0)

  // Liste des sections pour mapper avec la sidebar
  const sections = [
    "Propriétaire", "Logement", "Clefs", "Airbnb", "Booking", "Réglementation",
    "Exigences", "Avis", "Gestion Linge", "Équipements", "Consommables", "Visite",
    "Chambres", "Salle De Bains", "Cuisine 1", "Cuisine 2", "Salon / SAM", "Équip. Spé. / Extérie",
    "Communs", "Télétravail", "Bébé", "Sécurité"
  ]

  const totalSteps = sections.length

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

  return (
    <FormContext.Provider value={{ 
      currentStep, 
      totalSteps, 
      sections,
      next, 
      back, 
      goTo, 
      getCurrentSection 
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