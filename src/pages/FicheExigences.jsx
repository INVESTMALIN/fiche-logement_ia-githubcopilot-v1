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
              <Button variant="primary" onClick={next}>Suivant</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}