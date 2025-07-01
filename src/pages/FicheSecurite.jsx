// Liste des équipements de sécurité// src/pages/FicheSecutite.jsx
import React, { useState } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import { useNavigate } from 'react-router-dom'

export default function FicheSecutite() {
  const navigate = useNavigate()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  
  const { 
    next, 
    back, 
    currentStep, 
    totalSteps, 
    getField, 
    updateField, 
    handleSave, 
    saveStatus,
    finaliserFiche,
    formData
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

  const handleFinaliser = async () => {
    const saveResult = await handleSave()
    if (saveResult.success) {
      await finaliserFiche()
      setShowConfirmModal(true)
    }
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
                  <label className="block font-semibold mb-2">Photos de tous les équipements disponibles</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Prenez des photos de tous les équipements de sécurité que vous avez sélectionnés
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 🚨 MESSAGES DE SAUVEGARDE - PATTERN EXACT OBLIGATOIRE */}
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

          {/* 🚨 BOUTONS NAVIGATION - PATTERN EXACT OBLIGATOIRE */}
          <div className="mt-6 flex justify-between">
            <Button 
              variant="ghost" 
              onClick={back} 
              disabled={currentStep === 0}
            >
              Retour
            </Button>
            
            {/* Dernière page : deux boutons distincts */}
            {currentStep === totalSteps - 1 ? (
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
                  onClick={handleFinaliser}
                  disabled={saveStatus.saving}
                >
                  {saveStatus.saving ? 'Finalisation...' : 'Finaliser la fiche'}
                </Button>
              </div>
            ) : (
              /* Pages normales : boutons standards */
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
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMATION */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Fiche finalisée avec succès !
              </h2>
              <p className="text-gray-600">
                La fiche "<strong>{formData.nom}</strong>" a été marquée comme complétée.
              </p>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button 
                variant="secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Continuer à modifier
              </Button>
              <Button 
                variant="primary"
                onClick={() => navigate('/')}
              >
                Retourner au Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}