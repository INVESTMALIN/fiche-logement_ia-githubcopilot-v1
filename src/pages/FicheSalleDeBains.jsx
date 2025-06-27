// src/pages/FicheSalleDeBains.jsx
import React, { useState } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'

export default function FicheSalleDeBains() {
  const { next, back, currentStep, totalSteps, getField, updateField, handleSave, saveStatus } = useForm()

  // Récupérer le nombre de salles de bains depuis la section Visite
  const formDataVisite = getField('section_visite')
  const nombreSallesDeBains = parseInt(formDataVisite.nombre_salles_bains) || 0
  
  // Récupérer les données salles de bains
  const formDataSallesDeBains = getField('section_salle_de_bains')

  // État pour gérer les accordéons ouverts
  const [accordeonsOuverts, setAccordeonsOuverts] = useState({
    salle_de_bain_1: true, // Premier accordéon ouvert par défaut
    salle_de_bain_2: false,
    salle_de_bain_3: false,
    salle_de_bain_4: false,
    salle_de_bain_5: false,
    salle_de_bain_6: false
  })

  // Fonction pour toggler un accordéon
  const toggleAccordeon = (salleKey) => {
    setAccordeonsOuverts(prev => ({
      ...prev,
      [salleKey]: !prev[salleKey]
    }))
  }

  // Fonction pour modifier un champ simple
  const handleInputChange = (salleKey, field, value) => {
    updateField(`section_salle_de_bains.${salleKey}.${field}`, value)
  }

  // Fonction pour modifier une checkbox équipement
  const handleCheckboxChange = (salleKey, field, checked) => {
    updateField(`section_salle_de_bains.${salleKey}.${field}`, checked ? true : null)
  }

  // Fonction pour modifier un radio button
  const handleRadioChange = (salleKey, field, value) => {
    updateField(`section_salle_de_bains.${salleKey}.${field}`, value === 'true' ? true : (value === 'false' ? false : value))
  }

  // Configuration des équipements
  const equipements = [
    { key: 'equipements_douche', label: 'Douche' },
    { key: 'equipements_baignoire', label: 'Baignoire' },
    { key: 'equipements_douche_baignoire_combinees', label: 'Douche et baignoire combinées' },
    { key: 'equipements_double_vasque', label: 'Double vasque' },
    { key: 'equipements_wc', label: 'WC' },
    { key: 'equipements_bidet', label: 'Bidet' },
    { key: 'equipements_chauffage', label: 'Chauffage' },
    { key: 'equipements_lave_linge', label: 'Lave-linge' },
    { key: 'equipements_seche_serviette', label: 'Sèche-serviette' },
    { key: 'equipements_seche_cheveux', label: 'Sèche-cheveux' },
    { key: 'equipements_autre', label: 'Autre (veuillez préciser)' }
  ]

  // Composant AccordeonSalleDeBain
  const AccordeonSalleDeBain = ({ salleKey, numeroAffiche }) => {
    const isOpen = accordeonsOuverts[salleKey]
    const salleData = formDataSallesDeBains[salleKey] || {}
    
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        {/* Header accordéon */}
        <button
          type="button"
          onClick={() => toggleAccordeon(salleKey)}
          className="w-full px-4 py-3 bg-teal-600 text-white flex items-center justify-between hover:bg-teal-700 transition-colors"
        >
          <span className="font-semibold">Salle de bain {numeroAffiche}</span>
          <svg
            className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Contenu accordéon */}
        {isOpen && (
          <div className="p-6 space-y-6">
            
            {/* 1. Nom ou description */}
            <div>
              <label className="block font-semibold mb-2">
                Salle de Bain {numeroAffiche} : Nom ou description
              </label>
              <input
                type="text"
                placeholder="Indiquez le nom ou une courte description"
                value={salleData.nom_description || ""}
                onChange={(e) => handleInputChange(salleKey, 'nom_description', e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>

            {/* 2. Équipements (obligatoire) */}
            <div>
              <label className="block font-semibold mb-3">
                Salle de Bain {numeroAffiche} – Équipements <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {equipements.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={salleData[key] === true}
                      onChange={(e) => handleCheckboxChange(salleKey, key, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>

              {/* Champ conditionnel "Autre" */}
              {salleData.equipements_autre === true && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Veuillez préciser..."
                    value={salleData.equipements_autre_details || ""}
                    onChange={(e) => handleInputChange(salleKey, 'equipements_autre_details', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              )}

              {/* Champ conditionnel "WC séparé" si WC coché */}
              {salleData.equipements_wc === true && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block font-semibold mb-3">
                    WC Séparé ? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                      <input
                        type="radio"
                        name={`${salleKey}_wc_separe`}
                        value="true"
                        checked={salleData.wc_separe === true}
                        onChange={(e) => handleRadioChange(salleKey, 'wc_separe', e.target.value)}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm">Oui</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                      <input
                        type="radio"
                        name={`${salleKey}_wc_separe`}
                        value="false"
                        checked={salleData.wc_separe === false}
                        onChange={(e) => handleRadioChange(salleKey, 'wc_separe', e.target.value)}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm">Non</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Accès (obligatoire) */}
            <div>
              <label className="block font-semibold mb-3">
                Salle de Bain {numeroAffiche} – Accès <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <input
                    type="radio"
                    name={`${salleKey}_acces`}
                    value="privee"
                    checked={salleData.acces === "privee"}
                    onChange={(e) => handleInputChange(salleKey, 'acces', e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">Privée (attenante à une chambre)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <input
                    type="radio"
                    name={`${salleKey}_acces`}
                    value="partagee"
                    checked={salleData.acces === "partagee"}
                    onChange={(e) => handleInputChange(salleKey, 'acces', e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">Partagée</span>
                </label>
              </div>
            </div>

            {/* 4. Photos - Placeholder pour l'instant */}
            <div>
              <label className="block font-semibold mb-3">
                Salle de Bain {numeroAffiche} – Photos
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-gray-600">Parcourir les fichiers</p>
                  <p className="text-sm text-gray-500">Drag and drop files here</p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    )
  }

  // Affichage principal
  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Salle De Bains</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* Vérification nombre de salles de bains */}
            {nombreSallesDeBains === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune salle de bains configurée</h3>
                <p className="text-gray-600 mb-4">
                  Vous devez d'abord indiquer le nombre de salles de bains dans la section "Visite" pour configurer les détails des salles de bains.
                </p>
                <Button 
                  variant="primary" 
                  onClick={back}
                >
                  Retourner à la section Visite
                </Button>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <p className="text-gray-600">
                    Configuration des <strong>{nombreSallesDeBains} salle{nombreSallesDeBains > 1 ? 's' : ''} de bains</strong> du logement
                  </p>
                </div>

                {/* Accordéons dynamiques */}
                {Array.from({ length: nombreSallesDeBains }, (_, index) => {
                  const salleKey = `salle_de_bain_${index + 1}`
                  const numeroAffiche = index + 1
                  
                  return (
                    <AccordeonSalleDeBain
                      key={salleKey}
                      salleKey={salleKey}
                      numeroAffiche={numeroAffiche}
                    />
                  )
                })}
              </div>
            )}

            {/* Messages de sauvegarde */}
            {saveStatus.saving && (
              <div className="text-blue-600">⏳ Sauvegarde en cours...</div>
            )}
            {saveStatus.saved && (
              <div className="text-green-600">✅ Sauvegardé avec succès !</div>
            )}
            {saveStatus.error && (
              <div className="text-red-600">❌ Erreur : {saveStatus.error}</div>
            )}

            {/* Boutons de navigation */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button 
                variant="ghost" 
                onClick={back} 
                disabled={currentStep === 0}
              >
                Retour
              </Button>
              
              <div className="flex gap-2">
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
    </div>
  )
}