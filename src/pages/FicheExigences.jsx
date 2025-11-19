import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'

export default function FicheExigences() {
  const { next, back, currentStep, totalSteps, getField, updateField, handleSave, saveStatus } = useForm()

  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Exigences du propriétaire</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Nombre de nuits minimum */}
            <div>
              <label className="block font-semibold mb-1">Nombre de nuits minimum imposées par le propriétaire</label>
              <input 
                type="number"
                placeholder="1"
                className="w-full p-2 border rounded"
                value={getField('section_exigences.nombre_nuits_minimum')}
                onChange={(e) => handleInputChange('section_exigences.nombre_nuits_minimum', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">en nuits</p>
            </div>

            {/* Tarif minimum/nuit */}
            <div>
              <label className="block font-semibold mb-1">Tarif minimum/nuit imposé par le propriétaire</label>
              <input 
                type="number"
                step="0.01"
                placeholder="0"
                className="w-full p-2 border rounded"
                value={getField('section_exigences.tarif_minimum_nuit')}
                onChange={(e) => handleInputChange('section_exigences.tarif_minimum_nuit', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">en Euros payé par le voyageur ! Si aucune réservation sous 10 jours, nous ajusterons notre stratégie.</p>
            </div>

          </div>

          {/* Dates à bloquer */}
          <div className="mt-6">
            <label className="block font-semibold mb-1">Dates à bloquer pour utilisation personnelle du propriétaire (ex du 01/01/2024 au 10/01/2025)</label>
            <p className="text-sm text-blue-600 mb-2">RAPPEL : 60 jours maximum par an ET 15 jours max Juillet - Août !</p>
            <input 
              type="text"
              placeholder="Ex: du 15/07/2024 au 30/07/2024, du 20/12/2024 au 05/01/2025"
              className="w-full p-2 border rounded"
              value={getField('section_exigences.dates_bloquees')}
              onChange={(e) => handleInputChange('section_exigences.dates_bloquees', e.target.value)}
            />
          </div>

          {/* Précisions */}
          <div className="mt-6">
            <label className="block font-semibold mb-1">Précisions sur les exigences du propriétaire :</label>
            <textarea 
              placeholder="Donnez plus de détails sur les exigences du propriétaire."
              className="w-full p-2 border rounded h-32"
              value={getField('section_exigences.precisions_exigences')}
              onChange={(e) => handleInputChange('section_exigences.precisions_exigences', e.target.value)}
            />
          </div>

          {/* Animaux acceptés */}
          <div className="col-span-1 md:col-span-2 mt-6">
            <label className="block font-semibold mb-3">Animaux acceptés</label>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio"
                  name="animaux_acceptes"
                  value="oui"
                  checked={getField('section_exigences.animaux_acceptes') === 'oui'}
                  onChange={(e) => handleInputChange('section_exigences.animaux_acceptes', e.target.value)}
                  className="w-4 h-4"
                />
                <span>OUI</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio"
                  name="animaux_acceptes"
                  value="non"
                  checked={getField('section_exigences.animaux_acceptes') === 'non'}
                  onChange={(e) => handleInputChange('section_exigences.animaux_acceptes', e.target.value)}
                  className="w-4 h-4"
                />
                <span>NON</span>
              </label>
            </div>
            
            {/* Commentaire conditionnel */}
            {getField('section_exigences.animaux_acceptes') && (
              <div className="mt-4">
                <label className="block font-medium mb-2">Commentaire (facultatif)</label>
                <textarea 
                  placeholder="Précisez les conditions d'acceptation des animaux, restrictions éventuelles..."
                  className="w-full p-3 border rounded h-24"
                  value={getField('section_exigences.animaux_commentaire')}
                  onChange={(e) => handleInputChange('section_exigences.animaux_commentaire', e.target.value)}
                />
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

          {/* Boutons navigation */}
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={back} disabled={currentStep === 0}>
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