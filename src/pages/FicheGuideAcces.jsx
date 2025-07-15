// src/pages/FicheGuideAcces.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'

export default function FicheGuideAcces() {
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


  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Guide d'accès</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* Introduction */}
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
              <h3 className="font-semibold text-blue-800 mb-2">
                Préparation Guide d'accès : depuis le panneau de la rue ou un élément identifiable, jusqu'à l'intérieur de l'appartement
              </h3>
              <p className="text-blue-700 text-sm">
                Fournissez les éléments visuels nécessaires pour créer un guide d'accès complet pour les voyageurs.
              </p>
            </div>

            {/* Upload Photos étapes */}
            <div>
              <PhotoUpload 
                fieldPath="section_guide_acces.photos_etapes"
                label="Fournir plusieurs photos étape par étape pour le carrousel photo"
                multiple={true}
                maxFiles={20}
              />
              <p className="text-sm text-gray-500 mt-2">
                📸 Photos de chaque étape du parcours : panneau de rue, entrée immeuble, hall, ascenseur, palier, porte d'appartement, etc.
              </p>
            </div>

            {/* Upload Vidéo */}
            <div>
              <PhotoUpload 
                fieldPath="section_guide_acces.video_acces"
                label="Fournir une vidéo depuis le panneau de la rue ou un emplacement identifiable"
                multiple={true}
                maxFiles={1}
                acceptVideo={true}
              />
              <p className="text-sm text-gray-500 mt-2">
                🎥 Vidéo continue du trajet complet depuis un point de repère identifiable jusqu'à la porte d'entrée.
              </p>
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

          {/* Boutons navigation */}
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
                disabled={currentStep >= totalSteps - 1}
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