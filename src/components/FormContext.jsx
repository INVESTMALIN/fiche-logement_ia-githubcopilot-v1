import { createContext, useContext, useState, useEffect } from 'react'
import { saveFiche, loadFiche } from '../lib/supabaseHelpers'
import { useAuth } from './AuthContext'
import { useLocation } from 'react-router-dom';

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
    boiteType: null,
    emplacementBoite: "",
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
    },
    ttlock: {
      masterpinConciergerie: "",
      codeProprietaire: "",
      codeMenage: ""
    },
    igloohome: {
      masterpinConciergerie: "",
      codeVoyageur: "",
      codeProprietaire: "",
      codeMenage: ""
    },
    masterlock: {
      code: ""
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
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(initialFormData)
  const [saveStatus, setSaveStatus] = useState({ 
    saving: false, 
    saved: false, 
    error: null 
  })
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [hasManuallyNamedFiche, setHasManuallyNamedFiche] = useState(false); 

  const { user, loading: authLoading } = useAuth()
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const ficheId = queryParams.get('id');

  const sections = [
    "Propriétaire", "Logement", "Clefs", "Airbnb", "Booking", "Réglementation",
    "Exigences", "Avis", "Gestion Linge", "Équipements", "Consommables", "Visite",
    "Chambres", "Salle De Bains", "Cuisine 1", "Cuisine 2", "Salon / SAM", "Équip. Spé. / Extérie",
    "Communs", "Télétravail", "Bébé", "Sécurité"
  ]

  const totalSteps = sections.length

  // Effet pour charger la fiche quand l'ID est détecté dans l'URL
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (ficheId && !initialLoadComplete) {
      const loadExistingFiche = async () => {
        console.log(`Tentative de chargement de la fiche ID: ${ficheId}`);
        const result = await handleLoad(ficheId);
        if (result.success) {
          console.log('Fiche chargée avec succès !');
          // Lors du chargement, on vérifie si le nom était le nom par défaut.
          // Si oui, on autorise l'auto-génération. Sinon, non.
          setHasManuallyNamedFiche(result.data.nom !== initialFormData.nom);
          setInitialLoadComplete(true);
        } else {
          console.error('Erreur lors du chargement de la fiche :', result.error);
          setSaveStatus({ saving: false, saved: false, error: `Impossible de charger la fiche: ${result.error}` });
          setFormData(initialFormData); 
          setHasManuallyNamedFiche(false); // Nouvelle fiche, donc pas de nom manuel
          setInitialLoadComplete(true);
        }
      };
      loadExistingFiche();
    } else if (!ficheId && !initialLoadComplete) { 
      resetForm(); 
      setHasManuallyNamedFiche(false); // Nouvelle fiche, donc pas de nom manuel
      setInitialLoadComplete(true);
    }
  }, [ficheId, authLoading, initialLoadComplete]);

  

  // Fonction pour générer le nom de la fiche
  const generateFicheName = (currentData) => {
    const type = currentData.section_logement?.type;
    const ville = currentData.section_logement?.adresse?.ville;
    const adresseRue = currentData.section_logement?.adresse?.rue;

    let newName = initialFormData.nom; 

    // Fonction utilitaire pour mettre la première lettre en majuscule
    const capitalizeFirstLetter = (string) => {
      if (!string) return '';
      return string.charAt(0).toUpperCase() + string.slice(1);
    };

    if (type && ville) {
        newName = `${capitalizeFirstLetter(type)} ${ville}`; // <-- Application de la majuscule ici
    } else if (type && adresseRue) {
        const rueShort = adresseRue.split(' ')[0];
        newName = `${capitalizeFirstLetter(type)} ${rueShort.length > 0 ? rueShort + '...' : ''}`; // <-- Application de la majuscule ici
    } else if (ville) {
        newName = `Logement ${ville}`;
    } else if (adresseRue) {
        const rueShort = adresseRue.split(' ')[0];
        newName = `Logement ${rueShort.length > 0 ? rueShort + '...' : ''}`;
    }
    
    return newName.trim();
  };

  // Override de updateField pour gérer le nom auto-généré
  const updateField = (fieldPath, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = fieldPath.split('.');
      let current = newData;
      
      // Navigue vers le parent du champ cible, crée des objets si nécessaire
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || current[keys[i]] === null) {
          current[keys[i]] = {};
        } else if (typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {};
        } else {
          current[keys[i]] = { ...current[keys[i]] };
        }
        current = current[keys[i]];
      }
      
      // Set the value
      current[keys[keys.length - 1]] = value;
      
      // Logique de renommage intelligent
      if (fieldPath === 'nom') { // Si l'utilisateur modifie directement le champ 'nom'
        // On marque que le nom a été modifié manuellement, sauf si la valeur redevient le nom par défaut
        setHasManuallyNamedFiche(value !== initialFormData.nom);
      } else if (!hasManuallyNamedFiche) { // Si l'utilisateur n'a PAS pris la main
        // Crée une copie temporaire des données avec le changement appliqué pour générer le nom
        const tempFormData = JSON.parse(JSON.stringify(newData)); // Clone profond pour la sûreté
        let tempCurrent = tempFormData;
        for (let i = 0; i < keys.length - 1; i++) {
          tempCurrent = tempCurrent[keys[i]];
        }
        tempCurrent[keys[keys.length - 1]] = value; // Applique la nouvelle valeur au clone

        const generatedName = generateFicheName(tempFormData);

        // Si le nom actuel est le nom par défaut OU l'ancien nom auto-généré, on met à jour
        // On évite d'écraser un nom personnalisé par l'utilisateur s'il n'a pas été marqué comme "manuel"
        if (
            newData.nom === initialFormData.nom || // Si c'est toujours le nom par défaut
            (prev.nom === generateFicheName(prev) && prev.nom !== initialFormData.nom) // Ou si c'était un ancien nom auto-généré (mais pas le défaut)
        ) {
            newData.nom = generatedName;
        }
      }
      
      // Update timestamp
      newData.updated_at = new Date().toISOString();
      
      return newData;
    });
  };


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

  // updateSection n'a plus besoin de générer le nom ici, car updateField le gère déjà au niveau du champ
  const updateSection = (sectionName, newData) => {
    setFormData(prev => {
      const currentSection = prev[sectionName] || {}
      
      const updatedData = {
        ...prev,
        [sectionName]: {
          ...currentSection,
          ...newData
        },
        updated_at: new Date().toISOString()
      };

      // Le nom auto-généré est géré par updateField quand un champ spécifique change
      // Si une section entière est mise à jour, et que le nom n'est pas manuel et est encore par défaut,
      // on peut forcer une génération ici, mais l'approche par champ est plus précise.
      // Pour l'instant, on se base sur la mise à jour par champ.
      
      return updatedData;
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
    if (authLoading) {
      setSaveStatus({ saving: false, saved: false, error: "Chargement de l'utilisateur en cours. Veuillez patienter." });
      return;
    }
    
    if (!user) {
        setSaveStatus({ saving: false, saved: false, error: "Vous devez être connecté pour sauvegarder votre fiche." });
        return;
    }

    setSaveStatus({ saving: true, saved: false, error: null });
    
    try {
      console.log('Données à sauvegarder:', formData);
      
      const userId = user.id;

      const result = await saveFiche(formData, userId); 
      
      console.log('Résultat sauvegarde:', result);
      
      if (result.success) {
        setFormData(result.data);
        setSaveStatus({ saving: false, saved: true, error: null });
        
        // Après la sauvegarde, si le nom dans la BDD correspond au nom par défaut,
        // on s'assure que hasManuallyNamedFiche est bien false pour permettre la génération future.
        // Sinon, on le marque comme manuel.
        if (result.data.nom === initialFormData.nom) {
            setHasManuallyNamedFiche(false);
        } else {
            setHasManuallyNamedFiche(true);
        }

        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, saved: false }));
        }, 3000);
      } else {
        setSaveStatus({ saving: false, saved: false, error: result.message });
      }
    } catch (error) {
      console.error('Erreur complète:', error);
      setSaveStatus({ saving: false, saved: false, error: error.message || 'Erreur de connexion' });
    }
  }

  const handleLoad = async (ficheId) => {
    try {
      const result = await loadFiche(ficheId)
      
      if (result.success) {
        setFormData(result.data)
        setCurrentStep(0)
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.message }
      }
    } catch (error) {
      return { success: false, error: 'Erreur de connexion' }
    }
  }

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