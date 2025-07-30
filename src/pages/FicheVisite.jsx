import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'

export default function FicheVisite() {
  const { next, back, currentStep, totalSteps, getField, updateField, handleSave, saveStatus } = useForm()

  // PATTERN IMPORTANT : Récupérer formData pour les booléens
  const formDataVisite = getField('section_visite')
  const formDataLogement = getField('section_logement')
  
  // Pour la validation croisée
  const typologie = formDataLogement.typologie
  const nombreChambres = formDataVisite.nombre_chambres !== "" ? parseInt(formDataVisite.nombre_chambres) : null
  const chambreSelectionnee = formDataVisite.pieces_chambre === true
  const salleDebainsSelectionnee = formDataVisite.pieces_salle_bains === true

  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  const handleCheckboxChange = (field, checked) => {
    updateField(field, checked ? true : null)
  }

  const handleRadioChange = (field, value) => {
    updateField(field, value === 'true' ? true : (value === 'false' ? false : null))
  }

  // Logique de validation typologie vs nombre de chambres
  const getExpectedChambres = (typologie) => {
    switch (typologie) {
      case 'Studio': return 0
      case 'T2': return 1
      case 'T3': return 2
      case 'T4': return 3
      case 'T5': return 4
      case 'T6+': return 5
      default: return null
    }
  }

  const expectedChambres = getExpectedChambres(typologie)
  const showValidationError = chambreSelectionnee && 
                              nombreChambres !== null && 
                              expectedChambres !== null && 
                              nombreChambres !== expectedChambres

  // Options pour les types de pièces
  const pieceOptions = [
    { key: 'pieces_chambre', label: 'Chambre' },
    { key: 'pieces_salon', label: 'Salon' },
    { key: 'pieces_salle_bains', label: 'Salle de bains' },
    { key: 'pieces_salon_prive', label: 'Salon privé' },
    { key: 'pieces_kitchenette', label: 'Kitchenette' },
    { key: 'pieces_cuisine', label: 'Cuisine' },
    { key: 'pieces_salle_manger', label: 'Salle à manger' },
    { key: 'pieces_bureau', label: 'Bureau' },
    { key: 'pieces_salle_jeux', label: 'Salle de jeux' },
    { key: 'pieces_salle_sport', label: 'Salle de sport' },
    { key: 'pieces_buanderie', label: 'Buanderie' },
    { key: 'pieces_terrasse', label: 'Terrasse' },
    { key: 'pieces_balcon', label: 'Balcon' },
    { key: 'pieces_jardin', label: 'Jardin' },
    { key: 'pieces_autre', label: 'Autre (veuillez préciser)' }
  ]

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Visite du logement</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* Types de pièces */}
            <div>
              <label className="block font-semibold mb-3">
                Visite – Quelles types de pièces le logement comprend-il ? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {pieceOptions.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formDataVisite[key] === true}
                      onChange={(e) => handleCheckboxChange(`section_visite.${key}`, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
              
              {/* Champ conditionnel "Autre" */}
              {formDataVisite.pieces_autre === true && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Veuillez préciser..."
                    className="w-full p-2 border rounded"
                    value={formDataVisite.pieces_autre_details || ""}
                    onChange={(e) => handleInputChange('section_visite.pieces_autre_details', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Conditionnel : Nombre de chambres si "Chambre" cochée */}
            {chambreSelectionnee && (
              <div>
                <label className="block font-semibold mb-3">
                  Visite – Nombre de chambres <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full max-w-xs p-2 border rounded"
                  value={formDataVisite.nombre_chambres || ""}
                  onChange={(e) => handleInputChange('section_visite.nombre_chambres', e.target.value)}
                >
                  <option value="">Veuillez sélectionner</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
                
                {/* Alerte de validation croisée */}
                {showValidationError && (
                  <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-400 text-red-700">
                    <p className="font-medium">
                      ⚠️ Le nombre de chambres ne correspond pas à la typologie du bien ! 
                      Merci de vérifier ces informations !
                    </p>
                    <p className="text-sm mt-1">
                      Typologie actuelle : <strong>{typologie}</strong> 
                      {expectedChambres !== null && (
                        <> (attendu : {expectedChambres} chambre{expectedChambres > 1 ? 's' : ''})</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Conditionnel : Nombre de salles de bains si "Salle de bains" cochée */}
            {salleDebainsSelectionnee && (
              <div>
                <label className="block font-semibold mb-3">
                  Visite – Nombre de salles de bains <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full max-w-xs p-2 border rounded"
                  value={formDataVisite.nombre_salles_bains || ""}
                  onChange={(e) => handleInputChange('section_visite.nombre_salles_bains', e.target.value)}
                >
                  <option value="">Veuillez sélectionner</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>
            )}

            {/* Upload Vidéo de visite */}
            <div>
              <PhotoUpload 
                fieldPath="section_visite.video_visite"
                label="Vidéo de Visite : Pensez à commenter !"
                multiple={true}
                maxFiles={1}
                acceptVideo={true}
              />
              <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                <h4 className="font-semibold text-blue-800 mb-2">📹 Instructions pour la vidéo :</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Parlez clairement</strong> et articulez bien</li>
                  <li>• <strong>Commentez chaque pièce</strong> visitée et ses équipements</li>
                  <li>• <strong>Attention au bruit ambiant</strong> (évitez la musique, circulation...)</li>
                  <li>• <strong>Filmez en mode paysage</strong> pour une meilleure qualité</li>
                  <li>• <strong>Éclairage suffisant</strong> : allumez les lumières si nécessaire</li>
                  <li>• <strong>Mouvements lents</strong> pour éviter le flou</li>
                </ul>
              </div>
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
        <div className="h-20"></div>
      </div>
    </div>
  )
}