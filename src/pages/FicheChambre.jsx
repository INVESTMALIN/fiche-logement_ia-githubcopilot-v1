// src/pages/FicheChambre.jsx
import React, { useState, useCallback } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'

// ✅ COMPOSANT ACCORDEON SORTI EN DEHORS
const AccordeonChambre = ({ 
  chambreKey, 
  numeroAffiche, 
  formDataChambres, 
  accordeonsOuverts, 
  toggleAccordeon, 
  handleInputChange, 
  handleCheckboxChange, 
  handleCounterChange, 
  typesLits, 
  equipements 
}) => {
  const isOpen = accordeonsOuverts[chambreKey]
  const chambreData = formDataChambres[chambreKey] || {}
  
  // Composant Counter pour les lits (gardé à l'intérieur car il utilise des props locales)
  const Counter = ({ litType, label }) => {
    const value = formDataChambres[chambreKey]?.[litType] || 0
    
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleCounterChange(chambreKey, litType, 'decrement')}
            className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:bg-gray-300"
            disabled={value === 0}
          >
            −
          </button>
          <span className="w-8 text-center font-semibold">{value}</span>
          <button
            type="button"
            onClick={() => handleCounterChange(chambreKey, litType, 'increment')}
            className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600"
          >
            +
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
      {/* Header accordéon */}
      <button
        type="button"
        onClick={() => toggleAccordeon(chambreKey)}
        className="w-full px-4 py-3 bg-teal-600 text-white flex items-center justify-between hover:bg-teal-700 transition-colors"
      >
        <span className="font-semibold">Chambre {numeroAffiche}</span>
        <svg
          className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Contenu accordéon */}
      {isOpen && (
        <div className="p-6 space-y-6">
          
          {/* 1. Nom ou description */}
          <div>
            <label className="block font-semibold mb-2">
              Nom ou description de la chambre
            </label>
            <input
              type="text"
              placeholder="Indiquez le nom ou une courte description"
              value={chambreData.nom_description || ""}
              onChange={(e) => handleInputChange(chambreKey, 'nom_description', e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          {/* 2. Nombre de lits avec avertissement */}
          <div>
            <label className="block font-semibold mb-3">
              Nombre de lits
            </label>
            
            {/* Avertissement */}
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700">
              <p className="font-medium">
                ⚠️ ATTENTION ! EXCEPTION POUR LES LITS SUPERPOSÉS OU GIGOGNE :
              </p>
              <ul className="mt-2 text-sm space-y-1">
                <li>• 1 lit superposé = 2 lits (noter 2 dans la case)</li>
                <li>• 1 lit gigogne = 2 lits (noter 2 dans la case)</li>
              </ul>
            </div>

            {/* Compteurs de lits */}
            <div className="space-y-3">
              {typesLits.map(({ key, label }) => (
                <Counter
                  key={key}
                  litType={key}
                  label={label}
                />
              ))}
            </div>
          </div>

          {/* 3. Autre type de lit */}
          <div>
            <label className="block font-semibold mb-2">
              Autre type de lit ?
            </label>
            <input
              type="text"
              placeholder="ex : 1 très grand lit 200×200"
              value={chambreData.autre_type_lit || ""}
              onChange={(e) => handleInputChange(chambreKey, 'autre_type_lit', e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          {/* 4. Équipements */}
          <div>
            <label className="block font-semibold mb-3">
              Équipements dans la chambre
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {equipements.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={chambreData[key] === true}
                    onChange={(e) => handleCheckboxChange(chambreKey, key, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>

            {/* Champ conditionnel "Autre" */}
            {chambreData.equipements_autre === true && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Veuillez préciser..."
                  value={chambreData.equipements_autre_details || ""}
                  onChange={(e) => handleInputChange(chambreKey, 'equipements_autre_details', e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
            )}
          </div>

          {/* 5. Photos chambre */}
          <div>
            <PhotoUpload 
              fieldPath={`section_chambres.${chambreKey}.photos_chambre`}
              label="Photos de la chambre avec tous les équipements"
              multiple={true}
              maxFiles={3}
            />
          </div>

          {/* 🆕 ÉLÉMENTS ABÎMÉS - À ajouter APRÈS la section Photos chambre */}
          <div>
            <label className="block font-semibold mb-3">
              Photos de tous les éléments abîmés, cassés ou détériorés dans la chambre {numeroAffiche}
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Traces d'usures, tâches, joints colorés, joints décollés, meubles abîmés, tâches sur les tissus, 
              tâches sur les murs, trous, absence de cache prise, absence de lustre, rayures, etc.
            </p>
            
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`chambre_${numeroAffiche}_elements_abimes`}
                  value="true"
                  checked={chambreData.elements_abimes === true}
                  onChange={() => handleInputChange(chambreKey, 'elements_abimes', true)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span>Oui</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`chambre_${numeroAffiche}_elements_abimes`}
                  value="false"
                  checked={chambreData.elements_abimes === false}
                  onChange={() => {
                    handleInputChange(chambreKey, 'elements_abimes', false)
                    handleInputChange(chambreKey, 'elements_abimes_photos', [])
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <span>Non</span>
              </label>
            </div>
            
            {/* Upload conditionnel avec fond bleu clair */}
            {chambreData.elements_abimes === true && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <PhotoUpload 
                  fieldPath={`section_chambres.${chambreKey}.elements_abimes_photos`}
                  label={`Photos des éléments abîmés de la chambre ${numeroAffiche}`}
                  multiple={true}
                  maxFiles={10}
                  capture={true}
                  acceptVideo={false}
                />
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

// COMPOSANT PRINCIPAL FICHE CHAMBRE
export default function FicheChambre() {
  const { next, back, currentStep, totalSteps, getField, updateField, handleSave, saveStatus } = useForm()

  // Récupérer le nombre de chambres depuis la section Visite
  const formDataVisite = getField('section_visite')
  const nombreChambres = parseInt(formDataVisite.nombre_chambres) || 0
  
  // Récupérer les données chambres
  const formDataChambres = getField('section_chambres')

  // État pour gérer les accordéons ouverts
  const [accordeonsOuverts, setAccordeonsOuverts] = useState({
    chambre_1: true, // Premier accordéon ouvert par défaut
    chambre_2: false,
    chambre_3: false,
    chambre_4: false,
    chambre_5: false,
    chambre_6: false
  })

  // Fonction pour toggler un accordéon
  const toggleAccordeon = (chambreKey) => {
    setAccordeonsOuverts(prev => ({
      ...prev,
      [chambreKey]: !prev[chambreKey]
    }))
  }

  // Fonction pour modifier un compteur de lit
  const handleCounterChange = (chambreKey, litType, operation) => {
    const currentValue = formDataChambres[chambreKey]?.[litType] || 0
    const newValue = operation === 'increment' ? currentValue + 1 : Math.max(0, currentValue - 1)
    updateField(`section_chambres.${chambreKey}.${litType}`, newValue)
  }

  // Fonction pour modifier un champ simple
  const handleInputChange = useCallback((chambreKey, field, value) => {
    updateField(`section_chambres.${chambreKey}.${field}`, value)
  }, [updateField])

  // Fonction pour modifier une checkbox équipement
  const handleCheckboxChange = useCallback((chambreKey, field, checked) => {
    updateField(`section_chambres.${chambreKey}.${field}`, checked ? true : null)
  }, [updateField])

  // Configuration des types de lits
  const typesLits = [
    { key: 'lit_simple_90_190', label: 'Lit simple (90 × 190 cm)' },
    { key: 'lit_double_140_190', label: 'Lit double (140 × 190 cm)' },
    { key: 'lit_queen_160_200', label: 'Queen size (160 × 200 cm)' },
    { key: 'lit_king_180_200', label: 'King size (180 × 200 cm)' },
    { key: 'canape_lit_simple', label: 'Canapé-lit Simple (dimensions variables)' },
    { key: 'canape_lit_double', label: 'Canapé-lit Double (dimensions variables)' },
    { key: 'lits_superposes_90_190', label: 'Lits superposés (90 × 190 cm par lit)' },
    { key: 'lit_gigogne', label: 'Lit Gigogne' }
  ]

  // Configuration des équipements
  const equipements = [
    { key: 'equipements_draps_fournis', label: 'Draps fournis' },
    { key: 'equipements_climatisation', label: 'Climatisation' },
    { key: 'equipements_ventilateur_plafond', label: 'Ventilateur de plafond' },
    { key: 'equipements_espace_rangement', label: 'Espace de rangement pour les vêtements (placard, armoire)' },
    { key: 'equipements_lit_bebe_60_120', label: 'Lit pour bébé (60 × 120 cm)' },
    { key: 'equipements_stores', label: 'Stores' },
    { key: 'equipements_television', label: 'Télévision' },
    { key: 'equipements_oreillers_couvertures_sup', label: 'Oreillers et couvertures supplémentaires' },
    { key: 'equipements_chauffage', label: 'Chauffage' },
    { key: 'equipements_cintres', label: 'Cintres' },
    { key: 'equipements_moustiquaire', label: 'Moustiquaire' },
    { key: 'equipements_lit_parapluie_60_120', label: 'Lit parapluie (60 × 120 cm)' },
    { key: 'equipements_systeme_audio', label: 'Système audio' },
    { key: 'equipements_coffre_fort', label: 'Coffre-fort' },
    { key: 'equipements_autre', label: 'Autre (veuillez préciser)' }
  ]

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Chambres</h1>
          
          <div className="bg-white p-6 rounded-lg shadow">
            
            {/* Vérification nombre de chambres */}
            {nombreChambres === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  Aucune chambre configurée. Veuillez d'abord indiquer le nombre de chambres dans la section Visite.
                </p>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    // Naviguer vers la section Visite (index 11)
                    const sections = ["Propriétaire", "Logement", "Clefs", "Airbnb", "Booking", "Réglementation", "Exigences", "Avis", "Gestion Linge", "Équipements", "Consommables", "Visite"]
                    const visiteIndex = sections.indexOf("Visite")
                    if (visiteIndex !== -1) {
                      // Utiliser la fonction goTo du FormContext
                      back() // Pour l'instant, juste retour
                    }
                  }}
                >
                  Retourner à la section Visite
                </Button>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <p className="text-gray-600">
                    Configuration des <strong>{nombreChambres} chambre{nombreChambres > 1 ? 's' : ''}</strong> du logement
                  </p>
                </div>

                {/* ✅ ACCORDÉONS DYNAMIQUES AVEC PROPS PASSÉES */}
                {Array.from({ length: nombreChambres }, (_, index) => {
                  const chambreKey = `chambre_${index + 1}`
                  const numeroAffiche = index + 1
                  
                  return (
                    <AccordeonChambre
                      key={chambreKey}
                      chambreKey={chambreKey}
                      numeroAffiche={numeroAffiche}
                      formDataChambres={formDataChambres}
                      accordeonsOuverts={accordeonsOuverts}
                      toggleAccordeon={toggleAccordeon}
                      handleInputChange={handleInputChange}
                      handleCheckboxChange={handleCheckboxChange}
                      handleCounterChange={handleCounterChange}
                      typesLits={typesLits}
                      equipements={equipements}
                    />
                  )
                })}
              </div>
            )}
            
          </div>
          
          {/* Indicateur de sauvegarde */}
          {saveStatus.saving && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                ⏳ Sauvegarde en cours...
              </div>
            )}
            {saveStatus.saved && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                ✅ Sauvegardé avec succès !
              </div>
            )}
            {saveStatus.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                ❌ {saveStatus.error}
              </div>
            )}

            {/* Boutons de navigation */}
            <div className="mt-6 flex justify-between">
              <Button 
                variant="ghost" 
                onClick={back} 
                disabled={currentStep === 0}
              >
                Retour
              </Button>
              <div className="flex gap-3">
                <Button 
                  variant="secondary"
                  onClick={handleSave}
                  disabled={saveStatus.saving}
                >
                  {saveStatus.saving ? 'Sauvegarde...' : 'Enregistrer'}
                </Button>
                <Button 
                  variant="primary" 
                  onClick={next}
                  disabled={currentStep === totalSteps - 1}
                >
                  Suivant
                </Button>
              </div>
            </div>
        </div>
        <div className="h-20"></div>
      </div>
    </div>
  )
}