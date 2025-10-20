// src/pages/FicheTeletravail.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'

export default function FicheTeletravail() {
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
  const formData = getField('section_teletravail')

  const handleArrayCheckboxChange = (field, option, checked) => {
    const currentArray = formData[field.split('.').pop()] || []
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

  // Liste des équipements de télétravail
  const equipementsTeletravail = [
    'Bureau ou espace de travail dédié',
    'Chaise ergonomique',
    'Support pour ordinateur portable',
    'Éclairage adapté (lampe de bureau, lumière naturelle)',
    'Multiprise avec prises USB',
    'Fournitures de bureau (stylos, papier, etc.)',
    'Imprimante',
    'Scanner',
    'Autre (veuillez préciser)'
  ]

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
            <h1 className="text-2xl font-bold mb-6">Télétravail</h1>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    Le télétravail est une priorité pour de nombreux voyageurs. Veuillez nous fournir des 
                    informations précises sur l'équipement et la qualité de la connexion pour garantir une expérience 
                    optimale.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold mb-3">
                    Télétravail - Équipements pour le télétravail disponibles :
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {equipementsTeletravail.map(equipement => (
                      <label key={equipement} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.equipements || []).includes(equipement)}
                          onChange={(e) => handleArrayCheckboxChange('section_teletravail.equipements', equipement, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{equipement}</span>
                      </label>
                    ))}
                  </div>

                  {/* Champ conditionnel pour "Autre" */}
                  {(formData.equipements || []).includes('Autre (veuillez préciser)') && (
                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                      <label className="block font-semibold mb-2">
                        Autre (veuillez préciser) :
                      </label>
                      <input
                        type="text"
                        placeholder="Veuillez saisir une autre option ici"
                        className="w-full p-2 border rounded"
                        value={getField('section_teletravail.equipements_autre_details')}
                        onChange={(e) => handleInputChange('section_teletravail.equipements_autre_details', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Après la fermeture de la div des équipements, ajoute : */}

{/* Connexion Ethernet */}
<div className="mt-6">
  <label className="block font-semibold mb-3">
    Connexion par câble Ethernet disponible ? *
  </label>
  <div className="space-y-2">
    <label className="flex items-center gap-2 cursor-pointer">
      <input 
        type="radio"
        name="ethernet_disponible"
        value="true"
        checked={formData.ethernet_disponible === true}
        onChange={(e) => updateField('section_teletravail.ethernet_disponible', e.target.value === 'true')}
        className="w-4 h-4 text-blue-600"
      />
      <span className="text-sm">Oui</span>
    </label>
    <label className="flex items-center gap-2 cursor-pointer">
      <input 
        type="radio"
        name="ethernet_disponible"
        value="false"
        checked={formData.ethernet_disponible === false}
        onChange={(e) => updateField('section_teletravail.ethernet_disponible', e.target.value === 'true')}
        className="w-4 h-4 text-blue-600"
      />
      <span className="text-sm">Non</span>
    </label>
  </div>
</div>

{/* Speedtest résultat */}
<div className="mt-6">
  <label className="block font-semibold mb-2">
    Résultat du test de vitesse (Speedtest) *
  </label>
  <input
    type="text"
    placeholder="Ex: Download 150 Mbps / Upload 50 Mbps"
    className="w-full p-3 border rounded"
    value={formData.speedtest_resultat || ""}
    onChange={(e) => handleInputChange('section_teletravail.speedtest_resultat', e.target.value)}
  />
</div>

{/* Photos Speedtest */}
<div className="mt-6">
  <PhotoUpload 
    fieldPath="section_teletravail.speedtest_photos"
    label="Photos du test de vitesse (capture d'écran Speedtest)"
    multiple={true}
    maxFiles={3}
  />
</div>

{/* Photos espace de travail */}
<div className="mt-6">
  <PhotoUpload 
    fieldPath="section_teletravail.espace_travail_photos"
    label="Photos de l'espace de travail"
    multiple={true}
    maxFiles={10}
  />
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