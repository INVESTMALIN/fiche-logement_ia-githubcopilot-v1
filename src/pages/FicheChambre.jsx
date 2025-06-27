// src/pages/FicheChambre.jsx
import React, { useState } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'

export default function FicheChambre() {
  const { next, back, currentStep, totalSteps, getField, updateField, handleSave, saveStatus } = useForm()

  // Récupérer le nombre de chambres depuis la section Visite
  const formDataVisite = getField('section_visite')
  const nombreChambres = parseInt(formDataVisite.nombre_chambres) || 0
  
  // Récupérer les données chambres
  const formDataChambres = getField('section_chambres')

  // État pour gérer les accordéons ouverts
  const [accordeonsOuverts, setAccordeonsOuverts] = useState({
    chambre_1: true, // Premier accordéon ouvert par défaut
    chambre_2: false,
    chambre_3: false,
    chambre_4: false,
    chambre_5: false,
    chambre_6: false
  })

  // Fonction pour toggler un accordéon
  const toggleAccordeon = (chambreKey) => {
    setAccordeonsOuverts(prev => ({
      ...prev,
      [chambreKey]: !prev[chambreKey]
    }))
  }

  // Fonction pour modifier un compteur de lit
  const handleCounterChange = (chambreKey, litType, operation) => {
    const currentValue = formDataChambres[chambreKey]?.[litType] || 0
    const newValue = operation === 'increment' ? currentValue + 1 : Math.max(0, currentValue - 1)
    updateField(`section_chambres.${chambreKey}.${litType}`, newValue)
  }

  // Fonction pour modifier un champ simple
  const handleInputChange = (chambreKey, field, value) => {
    updateField(`section_chambres.${chambreKey}.${field}`, value)
  }

  // Fonction pour modifier une checkbox équipement
  const handleCheckboxChange = (chambreKey, field, checked) => {
    updateField(`section_chambres.${chambreKey}.${field}`, checked ? true : null)
  }

  // Configuration des types de lits
  const typesLits = [
    { key: 'lit_simple_90_190', label: 'Lit simple (90 × 190 cm)' },
    { key: 'lit_double_140_190', label: 'Lit double (140 × 190 cm)' },
    { key: 'lit_queen_160_200', label: 'Queen size (160 × 200 cm)' },
    { key: 'lit_king_180_200', label: 'King size (180 × 200 cm)' },
    { key: 'canape_lit_simple', label: 'Canapé-lit Simple (dimensions variables)' },
    { key: 'canape_lit_double', label: 'Canapé-lit Double (dimensions variables)' },
    { key: 'lits_superposes_90_190', label: 'Lits superposés (90 × 190 cm par lit)' },
    { key: 'lit_gigogne', label: 'Lit Gigogne' }
  ]

  // Configuration des équipements
  const equipements = [
    { key: 'equipements_draps_fournis', label: 'Draps fournis' },
    { key: 'equipements_climatisation', label: 'Climatisation' },
    { key: 'equipements_ventilateur_plafond', label: 'Ventilateur de plafond' },
    { key: 'equipements_espace_rangement', label: 'Espace de rangement pour les vêtements (placard, armoire)' },
    { key: 'equipements_lit_bebe_60_120', label: 'Lit pour bébé (60 × 120 cm)' },
    { key: 'equipements_stores', label: 'Stores' },
    { key: 'equipements_television', label: 'Télévision' },
    { key: 'equipements_oreillers_couvertures_sup', label: 'Oreillers et couvertures supplémentaires' },
    { key: 'equipements_chauffage', label: 'Chauffage' },
    { key: 'equipements_cintres', label: 'Cintres' },
    { key: 'equipements_moustiquaire', label: 'Moustiquaire' },
    { key: 'equipements_lit_parapluie_60_120', label: 'Lit parapluie (60 × 120 cm)' },
    { key: 'equipements_systeme_audio', label: 'Système audio' },
    { key: 'equipements_coffre_fort', label: 'Coffre-fort' },
    { key: 'equipements_autre', label: 'Autre (veuillez préciser)' }
  ]

  // Composant Counter pour les lits
  const Counter = ({ chambreKey, litType, label }) => {
    const value = formDataChambres[chambreKey]?.[litType] || 0
    
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleCounterChange(chambreKey, litType, 'decrement')}
            className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:bg-gray-300"
            disabled={value === 0}
          >
            −
          </button>
          <span className="w-8 text-center font-semibold">{value}</span>
          <button
            type="button"
            onClick={() => handleCounterChange(chambreKey, litType, 'increment')}
            className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600"
          >
            +
          </button>
        </div>
      </div>
    )
  }

  // Composant AccordeonChambre
  const AccordeonChambre = ({ chambreKey, numeroAffiche }) => {
    const isOpen = accordeonsOuverts[chambreKey]
    const chambreData = formDataChambres[chambreKey] || {}
    
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        {/* Header accordéon */}
        <button
          type="button"
          onClick={() => toggleAccordeon(chambreKey)}
          className="w-full px-4 py-3 bg-teal-600 text-white flex items-center justify-between hover:bg-teal-700 transition-colors"
        >
          <span className="font-semibold">Chambre {numeroAffiche}</span>
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
                Nom ou description de la chambre
              </label>
              <input
                type="text"
                placeholder="Indiquez le nom ou une courte description"
                value={chambreData.nom_description || ""}
                onChange={(e) => handleInputChange(chambreKey, 'nom_description', e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>

            {/* 2. Nombre de lits avec avertissement */}
            <div>
              <label className="block font-semibold mb-3">
                Nombre de lits
              </label>
              
              {/* Avertissement */}
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700">
                <p className="font-medium">
                  ⚠️ ATTENTION ! EXCEPTION POUR LES LITS SUPERPOSÉS OU GIGOGNE :
                </p>
                <ul className="mt-2 text-sm space-y-1">
                  <li>• 1 lit superposé = 2 lits (noter 2 dans la case)</li>
                  <li>• 1 lit gigogne = 2 lits (noter 2 dans la case)</li>
                </ul>
              </div>

              {/* Compteurs de lits */}
              <div className="space-y-3">
                {typesLits.map(({ key, label }) => (
                  <Counter
                    key={key}
                    chambreKey={chambreKey}
                    litType={key}
                    label={label}
                  />
                ))}
              </div>
            </div>

            {/* 3. Autre type de lit */}
            <div>
              <label className="block font-semibold mb-2">
                Autre type de lit ?
              </label>
              <input
                type="text"
                placeholder="ex : 1 très grand lit 200×200"
                value={chambreData.autre_type_lit || ""}
                onChange={(e) => handleInputChange(chambreKey, 'autre_type_lit', e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>

            {/* 4. Équipements */}
            <div>
              <label className="block font-semibold mb-3">
                Équipements dans la chambre
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {equipements.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={chambreData[key] === true}
                      onChange={(e) => handleCheckboxChange(chambreKey, key, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>

              {/* Champ conditionnel "Autre" */}
              {chambreData.equipements_autre === true && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Veuillez préciser..."
                    value={chambreData.equipements_autre_details || ""}
                    onChange={(e) => handleInputChange(chambreKey, 'equipements_autre_details', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* 5. Photos - Placeholder pour l'instant */}
            <div>
              <label className="block font-semibold mb-3">
                Photos de la chambre avec tous les équipements
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
          <h1 className="text-2xl font-bold mb-6">Chambres</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* Vérification nombre de chambres */}
            {nombreChambres === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune chambre configurée</h3>
                <p className="text-gray-600 mb-4">
                  Vous devez d'abord indiquer le nombre de chambres dans la section "Visite" pour configurer les détails des chambres.
                </p>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    // Naviguer vers la section Visite (index 11)
                    const sections = ["Propriétaire", "Logement", "Clefs", "Airbnb", "Booking", "Réglementation", "Exigences", "Avis", "Gestion Linge", "Équipements", "Consommables", "Visite"]
                    const visiteIndex = sections.indexOf("Visite")
                    if (visiteIndex !== -1) {
                      // Utiliser la fonction goTo du FormContext
                      back() // Pour l'instant, juste retour
                    }
                  }}
                >
                  Retourner à la section Visite
                </Button>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <p className="text-gray-600">
                    Configuration des <strong>{nombreChambres} chambre{nombreChambres > 1 ? 's' : ''}</strong> du logement
                  </p>
                </div>

                {/* Accordéons dynamiques */}
                {Array.from({ length: nombreChambres }, (_, index) => {
                  const chambreKey = `chambre_${index + 1}`
                  const numeroAffiche = index + 1
                  
                  return (
                    <AccordeonChambre
                      key={chambreKey}
                      chambreKey={chambreKey}
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