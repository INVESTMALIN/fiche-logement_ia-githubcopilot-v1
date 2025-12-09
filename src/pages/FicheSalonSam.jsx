// src/pages/FicheSalonSam.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'


export default function FicheSalonSam() {
  const { 
    next, 
    back, 
    currentStep,
    totalSteps,
    getField, 
    updateField, 
    handleSave, 
    saveStatus 
  } = useForm()

  // Récupération des données de la section
  const formData = getField('section_salon_sam')

  // Handler pour champs simples
  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  // Handler pour checkboxes
  const handleCheckboxChange = (field, checked) => {
    updateField(field, checked ? true : null)
  }

  // Handler pour radio buttons
  const handleRadioChange = (field, value) => {
    updateField(field, value)
  }

  // Liste des équipements
  const equipements = [
    { key: 'equipements_table_manger', label: 'Table à manger' },
    { key: 'equipements_chaises', label: 'Chaises' },
    { key: 'equipements_canape', label: 'Canapé' },
    { key: 'equipements_canape_lit', label: 'Canapé-lit' },
    { key: 'equipements_fauteuils', label: 'Fauteuils' },
    { key: 'equipements_table_basse', label: 'Table basse' },
    { key: 'equipements_television', label: 'Télévision' },
    { key: 'equipements_cheminee', label: 'Cheminée' },
    { key: 'equipements_jeux_societe', label: 'Jeux de société' },
    { key: 'equipements_livres_magazines', label: 'Livres et magazines' },
    { key: 'equipements_livres_jouets_enfants', label: 'Livres et jouets pour enfants' },
    { key: 'equipements_climatisation', label: 'Climatisation' },
    { key: 'equipements_chauffage', label: 'Chauffage' },
    { key: 'equipements_stores_manuels', label: 'Stores manuels' },
    { key: 'equipements_volets', label: 'Volets' },
    { key: 'equipements_stores_electriques', label: 'Stores électriques' },
    { key: 'equipements_autre', label: 'Autre (veuillez préciser)' }
  ]

  // Types de cheminée
  const typesCheminee = [
    'Électrique',
    'Éthanol', 
    'Gaz',
    'Poêle à granulés',
    'Bois',
    'Décorative'
  ]

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Salon et salle à manger</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* 1. Description générale */}
            <div>
              <label className="block font-semibold mb-2">
                Description générale du salon et de la salle à manger <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Décrivez ces espaces, leur agencement, leur décoration, l'ambiance, les éléments notables, etc."
                value={formData.description_generale || ""}
                onChange={(e) => handleInputChange('section_salon_sam.description_generale', e.target.value)}
                className="w-full p-3 border rounded-lg h-32"
              />
            </div>

            {/* 2. Équipements disponibles */}
            <div>
              <label className="block font-semibold mb-3">
                Équipements disponibles dans le salon et la salle à manger <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {equipements.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData[key] === true}
                      onChange={(e) => handleCheckboxChange(`section_salon_sam.${key}`, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>

              {/* Champ conditionnel "Autre" */}
              {formData.equipements_autre === true && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Veuillez saisir une autre option ici"
                    value={formData.equipements_autre_details || ""}
                    onChange={(e) => handleInputChange('section_salon_sam.equipements_autre_details', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* 3. Cheminée - Type (conditionnel) */}
            {formData.equipements_cheminee === true && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <label className="block font-semibold mb-3">
                  Cheminée - Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {typesCheminee.map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cheminee_type"
                        value={type}
                        checked={formData.cheminee_type === type}
                        onChange={(e) => handleRadioChange('section_salon_sam.cheminee_type', e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 3bis. Canapé-lit - Vidéo (conditionnel) */}
            {formData.equipements_canape_lit === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <PhotoUpload 
                  fieldPath="section_salon_sam.canape_lit_video"
                  label="Vidéo du canapé-lit (ouverture/fermeture)"
                  multiple={true}
                  maxFiles={3}
                  acceptVideo={true}
                />
              </div>
            )}

            {/* 4. Autres équipements ou détails */}
            <div>
              <label className="block font-semibold mb-2">
                Autres équipements ou détails
              </label>
              <textarea
                placeholder="Indiquez tout autre équipement ou détail pertinent concernant le salon et la salle à manger."
                value={formData.autres_equipements_details || ""}
                onChange={(e) => handleInputChange('section_salon_sam.autres_equipements_details', e.target.value)}
                className="w-full p-3 border rounded-lg h-24"
              />
            </div>

            {/* 5. Photos du Salon et de la Salle à Manger */}
            <div>
              <PhotoUpload 
                fieldPath="section_salon_sam.photos_salon_sam"
                label="Photos du Salon et de la Salle à Manger"
                multiple={true}
                maxFiles={10}
              />
            </div>

            {/* 6. Nombre de places assises à la table à manger */}
            <div>
              <label className="block font-semibold mb-2">
                Nombre de places assises à la table à manger <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="par ex. 4"
                min="0"
                value={formData.nombre_places_table || ""}
                onChange={(e) => handleInputChange('section_salon_sam.nombre_places_table', e.target.value)}
                className="w-full max-w-xs p-3 border rounded-lg"
              />
            </div>

          </div>

{/* 🆕 ÉLÉMENTS ABÎMÉS SALON - À ajouter dans la section salon */}
<div className="bg-white rounded-xl p-6 shadow mb-6">
              <h2 className="text-base font-semibold mb-4">Éléments abîmés dans le salon</h2>
              
              <div className="mb-6">
                <label className="block font-semibold mb-3">
                  Photos de tous les éléments abîmés, cassés ou détériorés dans le salon
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Traces d'usures, tâches, joints colorés, joints décollés, meubles abîmés, tâches sur les tissus, 
                  tâches sur les murs, trous, absence de cache prise, absence de lustre, rayures, etc.
                </p>
                
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="salon_elements_abimes"
                      value="true"
                      checked={formData.salon_elements_abimes === true}
                      onChange={() => handleInputChange('section_salon_sam.salon_elements_abimes', true)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Oui</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="salon_elements_abimes"
                      value="false"
                      checked={formData.salon_elements_abimes === false}
                      onChange={() => {
                        handleInputChange('section_salon_sam.salon_elements_abimes', false)
                        handleInputChange('section_salon_sam.salon_elements_abimes_photos', [])
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Non</span>
                  </label>
                </div>
                
                {/* Upload conditionnel avec fond bleu clair */}
                {formData.salon_elements_abimes === true && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <PhotoUpload 
                      fieldPath="section_salon_sam.salon_elements_abimes_photos"
                      label="Photos des éléments abîmés du salon"
                      multiple={true}
                      maxFiles={10}
                      capture={true}
                      acceptVideo={false}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 🆕 ÉLÉMENTS ABÎMÉS SALLE À MANGER - À ajouter dans la section salle à manger */}
            <div className="bg-white rounded-xl p-6 shadow mb-6">
              <h2 className="text-base font-semibold mb-4">Éléments abîmés dans la salle à manger</h2>
              
              <div className="mb-6">
                <label className="block font-semibold mb-3">
                  Photos de tous les éléments abîmés, cassés ou détériorés dans la salle à manger
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Traces d'usures, tâches, joints colorés, joints décollés, meubles abîmés, tâches sur les tissus, 
                  tâches sur les murs, trous, absence de cache prise, absence de lustre, rayures, etc.
                </p>
                
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="salle_manger_elements_abimes"
                      value="true"
                      checked={formData.salle_manger_elements_abimes === true}
                      onChange={() => handleInputChange('section_salon_sam.salle_manger_elements_abimes', true)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Oui</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="salle_manger_elements_abimes"
                      value="false"
                      checked={formData.salle_manger_elements_abimes === false}
                      onChange={() => {
                        handleInputChange('section_salon_sam.salle_manger_elements_abimes', false)
                        handleInputChange('section_salon_sam.salle_manger_elements_abimes_photos', [])
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Non</span>
                  </label>
                </div>
                
                {/* Upload conditionnel avec fond bleu clair */}
                {formData.salle_manger_elements_abimes === true && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <PhotoUpload 
                      fieldPath="section_salon_sam.salle_manger_elements_abimes_photos"
                      label="Photos des éléments abîmés de la salle à manger"
                      multiple={true}
                      maxFiles={10}
                      capture={true}
                      acceptVideo={false}
                    />
                  </div>
                )}
              </div>
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