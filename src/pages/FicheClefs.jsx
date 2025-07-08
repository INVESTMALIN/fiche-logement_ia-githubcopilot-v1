// src/pages/FicheClefs.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'


export default function FicheClefs() {
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

  // Récupération des données de la section
  const formData = getField('section_clefs')

  // Handlers
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
          <div className="bg-white p-6 rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-6">Gestion des clés et accès</h1>
            
            {/* Type de boîte à clés */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">Type de boîte à clés *</label>
              <div className="flex gap-6">
                {["TTlock", "Igloohome", "Masterlock"].map(type => (
                  <label key={type} className="inline-flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="boiteType" 
                      value={type}
                      checked={formData.boiteType === type}
                      onChange={(e) => handleInputChange('section_clefs.boiteType', e.target.value)}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="font-medium">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Emplacement de la boîte à clés */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">Emplacement de la boîte à clés *</label>
              <textarea 
                placeholder="Décrivez précisément où se trouve la boîte à clés (ex: à côté de la porte d'entrée, sur la droite)"
                className="w-full p-3 border rounded h-20 resize-none"
                value={formData.emplacementBoite}
                onChange={(e) => handleInputChange('section_clefs.emplacementBoite', e.target.value)}
              />
            </div>

            {/* Photo de l'emplacement */}
            <div className="mb-6">
              <PhotoUpload 
                fieldPath="section_clefs.emplacementPhoto"
                label="Photo de l'emplacement"
                multiple={true}
                maxFiles={5}
              />
              <p className="text-xs text-gray-500 mt-1">Photo obligatoire pour localiser la boîte à clés</p>
            </div>

            {/* Sections conditionnelles selon le type de boîte */}
            {formData.boiteType === "TTlock" && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-4">Configuration TTlock</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold mb-2">Code Masterpin conciergerie *</label>
                    <input 
                      type="text" 
                      placeholder="ex: 2863"
                      className="w-full p-2 border rounded"
                      value={formData.ttlock?.masterpinConciergerie || ''}
                      onChange={(e) => handleInputChange('section_clefs.ttlock.masterpinConciergerie', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2">Code Propriétaire *</label>
                    <input 
                      type="text" 
                      placeholder="ex: 1234"
                      className="w-full p-2 border rounded"
                      value={formData.ttlock?.codeProprietaire || ''}
                      onChange={(e) => handleInputChange('section_clefs.ttlock.codeProprietaire', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2">Code Ménage *</label>
                    <input 
                      type="text" 
                      placeholder="ex: 5678"
                      className="w-full p-2 border rounded"
                      value={formData.ttlock?.codeMenage || ''}
                      onChange={(e) => handleInputChange('section_clefs.ttlock.codeMenage', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.boiteType === "Igloohome" && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-4">Configuration Igloohome</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-2">Masterpin conciergerie *</label>
                    <input 
                      type="text" 
                      placeholder="ex: 2863"
                      className="w-full p-2 border rounded"
                      value={formData.igloohome?.masterpinConciergerie || ''}
                      onChange={(e) => handleInputChange('section_clefs.igloohome.masterpinConciergerie', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2">Code Voyageur *</label>
                    <input 
                      type="text" 
                      placeholder="ex: 1111"
                      className="w-full p-2 border rounded"
                      value={formData.igloohome?.codeVoyageur || ''}
                      onChange={(e) => handleInputChange('section_clefs.igloohome.codeVoyageur', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2">Code Propriétaire *</label>
                    <input 
                      type="text" 
                      placeholder="ex: 1234"
                      className="w-full p-2 border rounded"
                      value={formData.igloohome?.codeProprietaire || ''}
                      onChange={(e) => handleInputChange('section_clefs.igloohome.codeProprietaire', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2">Code Ménage *</label>
                    <input 
                      type="text" 
                      placeholder="ex: 5678"
                      className="w-full p-2 border rounded"
                      value={formData.igloohome?.codeMenage || ''}
                      onChange={(e) => handleInputChange('section_clefs.igloohome.codeMenage', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.boiteType === "Masterlock" && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-4">Configuration Masterlock</h3>
                <div>
                  <label className="block font-semibold mb-2">Code de la boîte à clés *</label>
                  <input 
                    type="text" 
                    placeholder="ex: 2863"
                    className="w-full p-2 border rounded max-w-md"
                    value={formData.masterlock?.code || ''}
                    onChange={(e) => handleInputChange('section_clefs.masterlock.code', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Interphone */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">Logement équipé d'un interphone ? *</label>
              <div className="flex gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="interphone" 
                    value="true"
                    checked={formData.interphone === true}
                    onChange={(e) => handleRadioChange('section_clefs.interphone', e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  Oui
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="interphone" 
                    value="false"
                    checked={formData.interphone === false}
                    onChange={(e) => handleRadioChange('section_clefs.interphone', e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  Non
                </label>
              </div>
            </div>

            {/* Champs conditionnels Interphone */}
            {formData.interphone === true && (
              <div className="mb-6 pl-6 border-l-4 border-blue-500 space-y-4">
                <div>
                  <label className="block font-semibold mb-2">Instructions pour l'interphone</label>
                  <textarea 
                    placeholder="S'il existe un code d'accès, notez-le ici et expliquez comment l'utiliser. S'il n'y a pas de code, précisez à quel nom il faut sonner. Ajoutez toute instruction spéciale."
                    className="w-full p-3 border rounded h-24 resize-none"
                    value={formData.interphoneDetails}
                    onChange={(e) => handleInputChange('section_clefs.interphoneDetails', e.target.value)}
                  />
                </div>
                <div>
                <PhotoUpload 
                  fieldPath="section_clefs.interphonePhoto"
                  label="Photo de l'interphone"
                  multiple={true}
                  maxFiles={5}
                />
                </div>
              </div>
            )}

            {/* Tempo-gâche */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">Logement équipé d'un tempo-gâche ? *</label>
              <div className="flex gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="tempoGache" 
                    value="true"
                    checked={formData.tempoGache === true}
                    onChange={(e) => handleRadioChange('section_clefs.tempoGache', e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  Oui
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="tempoGache" 
                    value="false"
                    checked={formData.tempoGache === false}
                    onChange={(e) => handleRadioChange('section_clefs.tempoGache', e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  Non
                </label>
              </div>
            </div>

            {/* Champs conditionnels Tempo-gâche */}
            {formData.tempoGache === true && (
              <div className="mb-6 pl-6 border-l-4 border-green-500 space-y-4">
                <div>
                  <label className="block font-semibold mb-2">Instructions pour le tempo-gâche</label>
                  <textarea 
                    placeholder="Expliquez comment utiliser le tempo-gâche, le délai d'ouverture, les codes nécessaires, etc."
                    className="w-full p-3 border rounded h-20 resize-none"
                    value={formData.tempoGacheDetails}
                    onChange={(e) => handleInputChange('section_clefs.tempoGacheDetails', e.target.value)}
                  />
                </div>
                <div>
                <PhotoUpload 
                  fieldPath="section_clefs.tempoGachePhoto"
                  label="Photo du tempo-gâche"
                  multiple={true}
                  maxFiles={5}
                />
                </div>
              </div>
            )}

            {/* Digicode */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">Logement équipé d'un digicode ? *</label>
              <div className="flex gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="digicode" 
                    value="true"
                    checked={formData.digicode === true}
                    onChange={(e) => handleRadioChange('section_clefs.digicode', e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  Oui
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="digicode" 
                    value="false"
                    checked={formData.digicode === false}
                    onChange={(e) => handleRadioChange('section_clefs.digicode', e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  Non
                </label>
              </div>
            </div>

            {/* Champs conditionnels Digicode */}
            {formData.digicode === true && (
              <div className="mb-6 pl-6 border-l-4 border-purple-500 space-y-4">
                <div>
                  <label className="block font-semibold mb-2">Code et instructions du digicode</label>
                  <textarea 
                    placeholder="Indiquez le code du digicode et expliquez comment l'utiliser (ex: tapez le code puis #, attendez le bip, etc.)"
                    className="w-full p-3 border rounded h-20 resize-none"
                    value={formData.digicodeDetails}
                    onChange={(e) => handleInputChange('section_clefs.digicodeDetails', e.target.value)}
                  />
                </div>
                <div>
                <PhotoUpload 
                  fieldPath="section_clefs.digicodePhoto"
                  label="Photo du digicode"
                  multiple={true}
                  maxFiles={5}
                />
                </div>
              </div>
            )}

            {/* Section Clefs physiques */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-4">Clefs physiques - 3 JEUX DE CLEFS OBLIGATOIRES</h3>
              
              <div className="space-y-4">
                <div>
                <PhotoUpload 
                  fieldPath="section_clefs.clefs.photos"
                  label="Photos/Vidéos des clefs"
                  multiple={true}
                  maxFiles={5}
                  acceptVideo={true}
                />
                  <p className="text-xs text-gray-500 mt-1">Photos et vidéos acceptées - Plusieurs fichiers possibles</p>
                </div>

                <div>
                  <label className="block font-semibold mb-2">Précisions sur les clefs</label>
                  <textarea 
                    placeholder="Décrivez les clefs : nombre total, types (porte d'entrée, boîte aux lettres, cave, etc.), particularités..."
                    className="w-full p-3 border rounded h-20 resize-none"
                    value={formData.clefs?.precision || ''}
                    onChange={(e) => handleInputChange('section_clefs.clefs.precision', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-3">Le prestataire a-t-il reçu les clefs ? *</label>
                  <div className="flex gap-6">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="clefsPrestataire" 
                        value="true"
                        checked={formData.clefs?.prestataire === true}
                        onChange={(e) => handleRadioChange('section_clefs.clefs.prestataire', e.target.value)}
                        className="text-primary focus:ring-primary"
                      />
                      Oui
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="clefsPrestataire" 
                        value="false"
                        checked={formData.clefs?.prestataire === false}
                        onChange={(e) => handleRadioChange('section_clefs.clefs.prestataire', e.target.value)}
                        className="text-primary focus:ring-primary"
                      />
                      Non
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-2">Détails sur la remise des clefs</label>
                  <textarea 
                    placeholder="Le prestataire a-t-il reçu les clés en mains propres ? Où sont stockées les clés ? Quel type de clef ? Précisions complémentaires..."
                    className="w-full p-3 border rounded h-20 resize-none"
                    value={formData.clefs?.details || ''}
                    onChange={(e) => handleInputChange('section_clefs.clefs.details', e.target.value)}
                  />
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
          </div>

          {/* Boutons de navigation - PATTERN EXACT OBLIGATOIRE */}
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