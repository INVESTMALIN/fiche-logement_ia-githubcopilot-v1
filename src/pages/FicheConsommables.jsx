import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'

export default function FicheConsommables() {
  const { next, back, currentStep, totalSteps, getField, updateField, handleSave, saveStatus } = useForm()

  // PATTERN IMPORTANT : Récupérer formData pour les booléens
  const formData = getField('section_consommables')
  const fournisParPrestataire = formData.fournis_par_prestataire

  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  const handleRadioChange = (field, value) => {
    updateField(field, value === 'true' ? true : (value === 'false' ? false : null))
  }

  const handleCheckboxChange = (field, checked) => {
    updateField(field, checked ? true : null)
  }

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Consommables</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* Question principale */}
            <div>
              <label className="block font-semibold mb-3">
                Consommables - Sont-ils fournis par le prestataire de ménage ? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="fournis_par_prestataire"
                    value="true"
                    checked={fournisParPrestataire === true}
                    onChange={(e) => handleRadioChange('section_consommables.fournis_par_prestataire', e.target.value)}
                    className="mr-2"
                  />
                  Oui
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="fournis_par_prestataire"
                    value="false"
                    checked={fournisParPrestataire === false}
                    onChange={(e) => handleRadioChange('section_consommables.fournis_par_prestataire', e.target.value)}
                    className="mr-2"
                  />
                  Non
                </label>
              </div>
            </div>

            {/* Si OUI : Liste rouge des consommables obligatoires */}
            {fournisParPrestataire === true && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <h3 className="font-semibold text-red-800 mb-3">
                  Les consommables ci-dessous devront OBLIGATOIREMENT être fourni par le prestataire de ménage :
                </h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• 2 rouleaux de papier toilette par toilette</li>
                  <li>• 1 savon pour les mains disponible par lavabo</li>
                  <li>• 1 produit vaisselle par cuisine</li>
                  <li>• 1 éponge par cuisine (en bon état)</li>
                  <li>• Sel, poivre, sucre (en quantité adéquate)</li>
                  <li>• Café et thé (1 sachet par personne)</li>
                  <li>• Essuie-tout/Sopalin</li>
                  <li>• Sac poubelle</li>
                  <li>• Produit vitres</li>
                  <li>• Produit sol</li>
                  <li>• Produit salle de bain/multi-surfaces ou vinaigre ménager</li>
                  <li>• Produit WC / Javel</li>
                </ul>
              </div>
            )}

            {/* Si OUI : Consommables "Sur demande" */}
            {fournisParPrestataire === true && (
              <div>
                <label className="block font-semibold mb-3">
                  Consommables "Sur demande" - Cocher pour ajouter d'autres consommables
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.gel_douche === true}
                      onChange={(e) => handleCheckboxChange('section_consommables.gel_douche', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">Gel douche</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.shampoing === true}
                      onChange={(e) => handleCheckboxChange('section_consommables.shampoing', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">Shampoing</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.apres_shampoing === true}
                      onChange={(e) => handleCheckboxChange('section_consommables.apres_shampoing', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">Après Shampoing</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.pastilles_lave_vaisselle === true}
                      onChange={(e) => handleCheckboxChange('section_consommables.pastilles_lave_vaisselle', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">Pastilles, sel et liquide de rinçage pour lave-vaisselle</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.autre_consommable === true}
                      onChange={(e) => handleCheckboxChange('section_consommables.autre_consommable', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">Autre (précisez)</span>
                  </label>
                </div>
                
                {/* Champ conditionnel "Autre" */}
                {formData.autre_consommable === true && (
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Précisez l'autre consommable..."
                      className="w-full p-2 border rounded"
                      value={formData.autre_consommable_details || ""}
                      onChange={(e) => handleInputChange('section_consommables.autre_consommable_details', e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Section Type de Café - TOUJOURS AFFICHÉE */}
            <div>
              <label className="block font-semibold mb-3">
                Consommables - Type de Café / Cafetière <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.cafe_nespresso === true}
                    onChange={(e) => handleCheckboxChange('section_consommables.cafe_nespresso', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm">Nespresso</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.cafe_senseo === true}
                    onChange={(e) => handleCheckboxChange('section_consommables.cafe_senseo', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm">Senseo</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.cafe_tassimo === true}
                    onChange={(e) => handleCheckboxChange('section_consommables.cafe_tassimo', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm">Tassimo</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.cafe_soluble === true}
                    onChange={(e) => handleCheckboxChange('section_consommables.cafe_soluble', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm">Café soluble</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.cafe_moulu === true}
                    onChange={(e) => handleCheckboxChange('section_consommables.cafe_moulu', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm">Café moulu</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.cafe_grain === true}
                    onChange={(e) => handleCheckboxChange('section_consommables.cafe_grain', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm">Café grain</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.cafe_autre === true}
                    onChange={(e) => handleCheckboxChange('section_consommables.cafe_autre', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm">Autre (précisez)</span>
                </label>
              </div>
              
              {/* Champ conditionnel "Autre café" */}
              {formData.cafe_autre === true && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Précisez le type de café..."
                    className="w-full p-2 border rounded"
                    value={formData.cafe_autre_details || ""}
                    onChange={(e) => handleInputChange('section_consommables.cafe_autre_details', e.target.value)}
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
      </div>
    </div>
  )
}