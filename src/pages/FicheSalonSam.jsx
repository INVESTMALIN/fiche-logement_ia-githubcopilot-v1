// src/pages/FicheSalonSam.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'

export default function FicheSalonSam() {
  const { 
    next, 
    back, 
    currentStep,
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
          <h1 className="text-2xl font-bold mb-6">Salon et Salle à Manger</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* 1. Description générale */}
            <div>
              <label className="block font-semibold mb-2">
                Description générale du Salon et de la Salle à Manger <span className="text-red-500">*</span>
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
                Équipements disponibles dans le Salon et la Salle à Manger <span className="text-red-500">*</span>
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

            {/* 4. Autres équipements ou détails */}
            <div>
              <label className="block font-semibold mb-2">
                Autres équipements ou détails <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Indiquez tout autre équipement ou détail pertinent concernant le Salon et la Salle à Manger."
                value={formData.autres_equipements_details || ""}
                onChange={(e) => handleInputChange('section_salon_sam.autres_equipements_details', e.target.value)}
                className="w-full p-3 border rounded-lg h-24"
              />
            </div>

            {/* 5. Photos du Salon et de la Salle à Manger */}
            <div>
              <label className="block font-semibold mb-2">
                Photos du Salon et de la Salle à Manger
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 515.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-blue-600 font-medium">Parcourir les fichiers</p>
                <p className="text-sm text-gray-500 mt-1">Drag and drop files here</p>
              </div>
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

            {/* Messages de sauvegarde */}
            {saveStatus.saving && (
              <div className="text-blue-600">⏳ Sauvegarde en cours...</div>
            )}
            {saveStatus.saved && (
              <div className="text-green-600">✅ Sauvegardé avec succès !</div>
            )}
            {saveStatus.error && (
              <div className="text-red-600">❌ Erreur : {saveStatus.error}</div>
            )}

            {/* Boutons de navigation */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button 
                variant="ghost" 
                onClick={back} 
                disabled={currentStep === 0}
              >
                Retour
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handleSave}
                  disabled={saveStatus.saving}
                >
                  {saveStatus.saving ? 'Sauvegarde...' : 'Enregistrer'}
                </Button>
                <Button variant="primary" onClick={next}>Suivant</Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}