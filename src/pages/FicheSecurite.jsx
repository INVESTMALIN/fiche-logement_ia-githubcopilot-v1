// Liste des équipements de sécurité// src/pages/FicheSecutite.jsx
import React, { useState } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import { useNavigate } from 'react-router-dom'
import PDFUpload from '../components/PDFUpload'
import PhotoUpload from '../components/PhotoUpload'


export default function FicheSecutite() {
  const navigate = useNavigate()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  
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
    await finaliserFiche()
    setShowConfirmModal(true)
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


  const handleGeneratePDF = () => {
    if (!formData || Object.keys(formData).length === 0) {
      alert('Erreur : aucune donnée de fiche disponible !')
      return
    }
    
    // Créer un iframe caché pour l'impression
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.left = '-9999px'
    iframe.style.top = '-9999px'
    document.body.appendChild(iframe)
    
    // Passer les données à l'iframe
    sessionStorage.setItem('pdf-data', JSON.stringify(formData))
    iframe.src = '/print-pdf'
    
    // Nettoyer après 10 secondes
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 10000)
  }

  const handlePDFGenerated = (url) => {
    console.log('✅ PDF généré avec succès:', url)
    setPdfUrl(url)
    setPdfGenerating(false)
    setShowConfirmModal(true)
  }


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
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <PDFUpload 
                formData={formData} 
                onPDFGenerated={(url) => console.log('PDF généré:', url)} 
                updateField={updateField}
                handleSave={handleSave}
              />
              </div>

              {/* 📝 NOTE EXPLICATIVE PDF - Design sympa */}
              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg 
                      className="w-5 h-5 text-blue-500 mt-0.5" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </div>
                  <div>

                    <div className="text-sm text-blue-700 leading-relaxed space-y-1">
                      <p>1. Cliquez sur <span className="font-semibold">"Générer la Fiche logement"</span>.</p>
                      <p>Les deux Fiches (logement + ménage) seront générées simultanément. Vous pourrez télécharger une copie de la fiche logement.</p>
                      <p>2. Cliquez ensuite sur <span className="font-semibold">"Finaliser la fiche"</span> ci-dessous pour compléter cette fiche et synchroniser les informations avec le Drive.</p>
                    </div>
                  </div>
                </div>
              </div>
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

        {/* MODAL DE CONFIRMATION AMÉLIORÉ - Remplace tout le bloc modal existant */}
      {/* MODAL DE CONFIRMATION */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-xl w-full mx-4 text-center">
            <div className="mb-8">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Fiche finalisée avec succès !
              </h2>
              <p className="text-gray-600 text-base">
                La fiche "<strong>{formData.nom}</strong>" a été marquée comme complétée.
              </p>
            </div>
            
            <div className="flex flex-col gap-5">

              
              <div className="flex gap-4 justify-center">
                <Button 
                  variant="secondary"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-6 py-3 min-w-[140px]"
                >
                  Continuer
                </Button>
                <Button 
                  variant="primary"
                  onClick={() => navigate('/')}
                  className="px-6 py-3 min-w-[140px]"
                >
                  Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}