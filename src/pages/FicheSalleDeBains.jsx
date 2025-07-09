// src/pages/FicheSalleDeBains.jsx
import React, { useState, useCallback } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'


// ✅ COMPOSANT ACCORDEON SORTI EN DEHORS - FIX DU PROBLÈME FOCUS !
const AccordeonSalleDeBain = ({ 
  salleKey, 
  numeroAffiche, 
  formDataSallesDeBains, 
  accordeonsOuverts, 
  toggleAccordeon, 
  handleInputChange, 
  handleCheckboxChange, 
  handleRadioChange, 
  equipements 
}) => {
  const isOpen = accordeonsOuverts[salleKey]
  const salleData = formDataSallesDeBains[salleKey] || {}
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
      {/* Header accordéon */}
      <button
        type="button"
        onClick={() => toggleAccordeon(salleKey)}
        className="w-full px-4 py-3 bg-teal-600 text-white flex items-center justify-between hover:bg-teal-700 transition-colors"
      >
        <span className="font-semibold">Salle de bain {numeroAffiche}</span>
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
              Salle de bain {numeroAffiche} : Nom ou description
            </label>
            <input
              type="text"
              placeholder="Indiquez le nom ou une courte description"
              value={salleData.nom_description || ""}
              onChange={(e) => handleInputChange(salleKey, 'nom_description', e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          {/* 2. Équipements (obligatoire) */}
          <div>
            <label className="block font-semibold mb-3">
              Salle de bain {numeroAffiche} – Équipements <span className="text-red-500">*</span>
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {equipements.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={salleData[key] === true}
                    onChange={(e) => handleCheckboxChange(salleKey, key, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>

            {/* Champ conditionnel "Autre" */}
            {salleData.equipements_autre === true && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Veuillez préciser..."
                  value={salleData.equipements_autre_details || ""}
                  onChange={(e) => handleInputChange(salleKey, 'equipements_autre_details', e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
            )}

            {/* Champ conditionnel "WC séparé" si WC coché */}
            {salleData.equipements_wc === true && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block font-semibold mb-3">
                  WC Séparé ? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input
                      type="radio"
                      name={`${salleKey}_wc_separe`}
                      value="true"
                      checked={salleData.wc_separe === true}
                      onChange={(e) => handleRadioChange(salleKey, 'wc_separe', e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">Oui</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input
                      type="radio"
                      name={`${salleKey}_wc_separe`}
                      value="false"
                      checked={salleData.wc_separe === false}
                      onChange={(e) => handleRadioChange(salleKey, 'wc_separe', e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">Non</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 3. Accès (obligatoire) */}
          <div>
            <label className="block font-semibold mb-3">
              Salle de bain {numeroAffiche} – Accès <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg border border-gray-200">
                <input
                  type="radio"
                  name={`${salleKey}_acces`}
                  value="privee"
                  checked={salleData.acces === "privee"}
                  onChange={(e) => handleInputChange(salleKey, 'acces', e.target.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">Privée (attenante à une chambre)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg border border-gray-200">
                <input
                  type="radio"
                  name={`${salleKey}_acces`}
                  value="partagee"
                  checked={salleData.acces === "partagee"}
                  onChange={(e) => handleInputChange(salleKey, 'acces', e.target.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">Partagée</span>
              </label>
            </div>
          </div>

          {/* 4. Photos - Salle de bains */}
          <div>
            <PhotoUpload 
              fieldPath={`section_salle_de_bains.${salleKey}.photos_salle_de_bain`}
              label={`Salle de bain ${numeroAffiche} - Photos`}
              multiple={true}
              maxFiles={5}
            />
          </div>

        </div>
      )}
    </div>
  )
}

// COMPOSANT PRINCIPAL FICHE SALLE DE BAINS
export default function FicheSalleDeBains() {
  const { next, back, goTo, currentStep, totalSteps, getField, updateField, handleSave, saveStatus } = useForm()
  
  // Récupérer le nombre de salles de bains depuis la section Visite
  const formDataVisite = getField('section_visite')
  const nombreSallesDeBains = parseInt(formDataVisite.nombre_salles_bains) || 0
  
  // Récupérer les données salles de bains
  const formDataSallesDeBains = getField('section_salle_de_bains')

  // État pour gérer les accordéons ouverts
  const [accordeonsOuverts, setAccordeonsOuverts] = useState({
    salle_de_bain_1: true, // Premier accordéon ouvert par défaut
    salle_de_bain_2: false,
    salle_de_bain_3: false,
    salle_de_bain_4: false,
    salle_de_bain_5: false,
    salle_de_bain_6: false
  })

  // Fonction pour toggler un accordéon
  const toggleAccordeon = (salleKey) => {
    setAccordeonsOuverts(prev => ({
      ...prev,
      [salleKey]: !prev[salleKey]
    }))
  }

  // Fonction pour modifier un champ simple avec useCallback pour stabilité
  const handleInputChange = useCallback((salleKey, field, value) => {
    updateField(`section_salle_de_bains.${salleKey}.${field}`, value)
  }, [updateField])

  // Fonction pour modifier une checkbox équipement avec useCallback
  const handleCheckboxChange = useCallback((salleKey, field, checked) => {
    updateField(`section_salle_de_bains.${salleKey}.${field}`, checked ? true : null)
  }, [updateField])

  // Fonction pour modifier un radio button avec useCallback
  const handleRadioChange = useCallback((salleKey, field, value) => {
    updateField(`section_salle_de_bains.${salleKey}.${field}`, value === 'true' ? true : (value === 'false' ? false : null))
  }, [updateField])

  // Configuration des équipements
  const equipements = [
    { key: 'equipements_douche', label: 'Douche' },
    { key: 'equipements_baignoire', label: 'Baignoire' },
    { key: 'equipements_douche_baignoire_combinees', label: 'Douche et baignoire combinées' },
    { key: 'equipements_double_vasque', label: 'Double vasque' },
    { key: 'equipements_wc', label: 'WC' },
    { key: 'equipements_bidet', label: 'Bidet' },
    { key: 'equipements_chauffage', label: 'Chauffage' },
    { key: 'equipements_lave_linge', label: 'Lave-linge' },
    { key: 'equipements_seche_serviette', label: 'Sèche-serviette' },
    { key: 'equipements_seche_cheveux', label: 'Sèche-cheveux' },
    { key: 'equipements_autre', label: 'Autre (veuillez préciser)' }
  ]

  // Affichage principal
  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Salle de bains</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* Vérification nombre de salles de bains */}
            {nombreSallesDeBains === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune salle de bains configurée</h3>
                <p className="text-gray-600 mb-4">
                  Vous devez d'abord indiquer le nombre de salles de bains dans la section "Visite" pour configurer les détails des salles de bains.
                </p>
                <Button 
                  variant="primary" 
                  onClick={() => goTo(11)} // "Visite" est à l'index 11
                >
                  Retourner à la section Visite
                </Button>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <p className="text-gray-600">
                    Configuration des <strong>{nombreSallesDeBains} salle{nombreSallesDeBains > 1 ? 's' : ''} de bains</strong> du logement
                  </p>
                </div>

                {/* ✅ ACCORDÉONS DYNAMIQUES AVEC PROPS PASSÉES */}
                {Array.from({ length: nombreSallesDeBains }, (_, index) => {
                  const salleKey = `salle_de_bain_${index + 1}`
                  const numeroAffiche = index + 1
                  
                  return (
                    <AccordeonSalleDeBain
                      key={salleKey}
                      salleKey={salleKey}
                      numeroAffiche={numeroAffiche}
                      formDataSallesDeBains={formDataSallesDeBains}
                      accordeonsOuverts={accordeonsOuverts}
                      toggleAccordeon={toggleAccordeon}
                      handleInputChange={handleInputChange}
                      handleCheckboxChange={handleCheckboxChange}
                      handleRadioChange={handleRadioChange}
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
      </div>
    </div>
  )
}