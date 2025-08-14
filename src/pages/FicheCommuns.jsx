// src/pages/FicheCommuns.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'


export default function FicheCommuns() {
  const { next, back, currentStep, totalSteps, getField, updateField, handleSave, saveStatus } = useForm()

  // PATTERN IMPORTANT : Récupérer formData pour les booléens
  const formData = getField('section_communs')

  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  const handleRadioChange = (field, value) => {
    updateField(field, value === 'true' ? true : (value === 'false' ? false : null))
  }

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Espace(s) Commun(s)</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* Question principale : Dispose d'espaces communs */}
            <div>
              <label className="block font-semibold mb-3">
                Le logement propose-t-il d'un ou plusieurs espace(s) commun(s) ? *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.dispose_espaces_communs === true}
                    onChange={() => handleRadioChange('section_communs.dispose_espaces_communs', 'true')}
                    className="w-4 h-4"
                  />
                  <span>Oui</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.dispose_espaces_communs === false}
                    onChange={() => handleRadioChange('section_communs.dispose_espaces_communs', 'false')}
                    className="w-4 h-4"
                  />
                  <span>Non</span>
                </label>
              </div>
            </div>

            {/* BRANCHE CONDITIONNELLE : Si oui */}
            {formData.dispose_espaces_communs === true && (
              <div className="border-l-4 border-blue-500 pl-6 space-y-6">
                
                {/* Description générale */}
                <div>
                  <label className="block font-semibold mb-3">
                    Description générale du ou des espace(s) commun(s) *
                  </label>
                  <textarea
                    placeholder="Décrivez l'espace extérieur, son agencement, sa décoration, les équipements présents (par exemple, table, chaises, barbecue, etc.) et l'ambiance (vue, orientation, etc.)"
                    className="w-full p-3 border rounded h-24"
                    value={formData.description_generale || ""}
                    onChange={(e) => handleInputChange('section_communs.description_generale', e.target.value)}
                  />
                </div>

                {/* Question entretien */}
                <div>
                  <label className="block font-semibold mb-3">
                    Le prestataire doit-il gérer l'entretien de/des(s) espace(s) commun(s) ? *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.entretien_prestataire === true}
                        onChange={() => handleRadioChange('section_communs.entretien_prestataire', 'true')}
                        className="w-4 h-4"
                      />
                      <span>Oui</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.entretien_prestataire === false}
                        onChange={() => handleRadioChange('section_communs.entretien_prestataire', 'false')}
                        className="w-4 h-4"
                      />
                      <span>Non</span>
                    </label>
                  </div>
                </div>

                {/* SOUS-BRANCHE : Si entretien = OUI */}
                {formData.entretien_prestataire === true && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div>
                      <label className="block font-semibold mb-1">
                        Précisez la fréquence *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 2 fois par semaine (lundi et vendredi)"
                        className="w-full p-2 border rounded"
                        value={formData.entretien_frequence || ""}
                        onChange={(e) => handleInputChange('section_communs.entretien_frequence', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* SOUS-BRANCHE : Si entretien = NON */}
                {formData.entretien_prestataire === false && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block font-semibold mb-1">
                        Qui s'occupe de l'entretien ? *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Une entreprise spécialisée"
                        className="w-full p-2 border rounded"
                        value={formData.entretien_qui || ""}
                        onChange={(e) => handleInputChange('section_communs.entretien_qui', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Upload photos */}
                <div>
                  <PhotoUpload 
                    fieldPath="section_communs.photos_espaces_communs"
                    label="Photos des espaces communs"
                    multiple={true}
                    maxFiles={8}
                  />
                </div>

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