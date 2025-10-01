// src/pages/FicheSecurite.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'

export default function FicheSecurite() {
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

  // PATTERN IMPORTANT : Récupérer formData pour les arrays
  const sectionData = getField('section_securite')

  const handleArrayCheckboxChange = (field, option, checked) => {
    const currentArray = sectionData[field.split('.').pop()] || []
    let newArray
    if (checked) {
      newArray = [...currentArray, option]
    } else {
      newArray = currentArray.filter(item => item !== option)
    }
    updateField(field, newArray)
  }

  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  const equipementsSecurite = [
    'Détecteur de fumée',
    'Détecteur de monoxyde de carbone',
    'Extincteur',
    'Trousse de premiers secours',
    'Verrou de sécurité sur la porte d\'entrée',
    'Système d\'alarme',
    'Caméras de surveillance extérieures',
    'Caméras de surveillance intérieures (uniquement dans les espaces communs)',
    'Autre (veuillez préciser)'
  ]

  // Déterminer quels équipements sont cochés
  const equipementsCoches = sectionData.equipements || []
  const systemeAlarmeSelected = equipementsCoches.includes('Système d\'alarme')
  const autreSelected = equipementsCoches.includes('Autre (veuillez préciser)')

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Équipements de Sécurité</h1>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="space-y-6">
              {/* Liste principale des équipements */}
              <div>
                <label className="block font-semibold mb-3">
                  Sécurité - Équipements de sécurité disponibles :
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {equipementsSecurite.map(equipement => (
                    <label key={equipement} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={equipementsCoches.includes(equipement)}
                        onChange={(e) => handleArrayCheckboxChange('section_securite.equipements', equipement, e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{equipement}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* SECTION CONDITIONNELLE : SYSTÈME D'ALARME */}
              {systemeAlarmeSelected && (
                <div className="border-l-4 border-red-500 pl-6 space-y-4">
                  <h3 className="text-lg font-semibold text-red-700">Système d'alarme</h3>
                  
                  <div>
                    <label className="block font-semibold mb-2">
                      Précisez comment désamorcer le système d'alarme (seulement si nécessaire pour entrer dans le logement) *
                    </label>
                    <textarea
                      placeholder="Rédigez un descriptif précis pour permettre de désamorcer l'alarme si nécessaire pour entrer dans le logement."
                      className="w-full p-3 border rounded h-24"
                      value={getField('section_securite.alarme_desarmement')}
                      onChange={(e) => handleInputChange('section_securite.alarme_desarmement', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* SECTION CONDITIONNELLE : AUTRE */}
              {autreSelected && (
                <div className="border-l-4 border-gray-500 pl-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700">Autre équipement</h3>
                  
                  <div>
                    <label className="block font-semibold mb-2">Veuillez préciser :</label>
                    <input
                      type="text"
                      placeholder="Décrivez l'équipement de sécurité supplémentaire"
                      className="w-full p-2 border rounded"
                      value={getField('section_securite.equipements_autre_details')}
                      onChange={(e) => handleInputChange('section_securite.equipements_autre_details', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* PHOTOS (toujours visible si au moins un équipement coché) */}
              {equipementsCoches.length > 0 && (
                <div className="border-t pt-6">
                  <PhotoUpload 
                    fieldPath="section_securite.photos_equipements_securite"
                    label="Photos de tous les équipements disponibles"
                    multiple={true}
                    maxFiles={10}
                  />
                </div>
              )}
            </div>
          </div>

          {/* MESSAGES DE SAUVEGARDE - PATTERN EXACT OBLIGATOIRE */}
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

          {/* BOUTONS NAVIGATION STANDARDS */}
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
          <div className="h-20"></div>       
        </div>
      </div>
    </div>
  )
}