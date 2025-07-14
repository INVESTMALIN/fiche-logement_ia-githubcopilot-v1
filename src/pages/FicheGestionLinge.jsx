// src/pages/FicheGestionLinge.jsx
import React, { useState } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'


export default function FicheGestionLinge() {
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

  // État pour les sections collapsibles
  const [openSections, setOpenSections] = useState({
    '90x200': false,
    '140x200': false,
    '160x200': false,
    '180x200': false,
    'autres': false
  })

  // Récupération des données de la section
  const formData = getField('section_gestion_linge')
  const disposeDeLingeData = formData.dispose_de_linge

  // Handler pour champs simples
  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  // Handler pour checkbox booléens
  const handleBooleanChange = (field, value) => {
    updateField(field, value === 'true' ? true : value === 'false' ? false : null)
  }

  // Handler pour toggle sections
  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Composant pour une section d'inventaire
  const InventaireSection = ({ taille, titre, dataKey }) => {
    const inventaireData = formData[dataKey] || {}
    const isOpen = openSections[taille]
    
    return (
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => toggleSection(taille)}
          className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg font-semibold flex justify-between items-center"
        >
          <span>{titre}</span>
          <span className="text-gray-500">{isOpen ? '▼' : '▶'}</span>
        </button>
        
        {isOpen && (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(formData.inventaire_90x200 || {}).map((typeLingeKey) => {
              const typeLingeLabel = getLingeLabel(typeLingeKey)
              return (
                <div key={typeLingeKey}>
                  <label className="block text-sm font-medium mb-1">
                    {typeLingeLabel}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full p-2 border rounded text-sm"
                    value={inventaireData[typeLingeKey] || ""}
                    onChange={(e) => handleInputChange(`section_gestion_linge.${dataKey}.${typeLingeKey}`, e.target.value)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Helper pour les labels des types de linge
  const getLingeLabel = (key) => {
    const labels = {
      couettes: "Couettes",
      oreillers: "Oreillers", 
      draps_housses: "Draps housses (plats)",
      housses_couette: "Housses de couette",
      protections_matelas: "Protections matelas / Alaises",
      taies_oreillers: "Taies d'oreillers",
      draps_bain: "Grandes serviettes (par logement)",
      petites_serviettes: "Petites serviette (par logement)",
      tapis_bain: "Tapis de bain (par logement)",
      torchons: "Torchons (par logement)",
      plaids: "Plaids",
      oreillers_decoratifs: "Oreillers décoratifs"
    }
    return labels[key] || key
  }

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Gestion du linge</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* Question principale */}
            <div>
              <label className="block font-semibold mb-2">
                Le logement dispose-t-il de linge ? *
              </label>
              <div className="flex gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="dispose_de_linge"
                    checked={disposeDeLingeData === true}
                    onChange={() => handleInputChange('section_gestion_linge.dispose_de_linge', true)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span>Oui</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="dispose_de_linge"
                    checked={disposeDeLingeData === false}
                    onChange={() => handleInputChange('section_gestion_linge.dispose_de_linge', false)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span>Non</span>
                </label>
              </div>

            </div>

            {/* Sections conditionnelles si OUI */}
            {disposeDeLingeData === true && (
              <>
                {/* Inventaire par tailles - Sections collapsibles */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">
                    Inventaire - Veuillez indiquer les quantités par taille de lit
                  </h2>
                  <div className="space-y-3">
                    <InventaireSection 
                      taille="90x200" 
                      titre="90x200 (lit simple)" 
                      dataKey="inventaire_90x200"
                    />
                    <InventaireSection 
                      taille="140x200" 
                      titre="140x200 (lit standard)" 
                      dataKey="inventaire_140x200"
                    />
                    <InventaireSection 
                      taille="160x200" 
                      titre="160x200 (lit queen size)" 
                      dataKey="inventaire_160x200"
                    />
                    <InventaireSection 
                      taille="180x200" 
                      titre="180x200 (lit king size)" 
                      dataKey="inventaire_180x200"
                    />
                    <InventaireSection 
                      taille="autres" 
                      titre="Autres ou hors catégorie (serviettes, oreillers, taies, torchons etc)" 
                      dataKey="inventaire_autres"
                    />
                  </div>
                </div>

                {/* État du linge */}
                <div>
                  <label className="block font-semibold mb-3">État du linge</label>
                  <div className="grid grid-cols-1 gap-3 max-w-md">
                    {[
                      { key: 'etat_neuf', label: 'Neuf' },
                      { key: 'etat_usage', label: 'Usagé' },
                      { key: 'etat_propre', label: 'Propre' },
                      { key: 'etat_sale', label: 'Sale' },
                      { key: 'etat_tache', label: 'Taché (taches incrustées mais propre)' }
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input 
                          type="checkbox"
                          checked={formData[key] === true}
                          onChange={(e) => handleInputChange(`section_gestion_linge.${key}`, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Informations supplémentaires sur l'état */}
                <div>
                  <label className="block font-semibold mb-2">
                    État du linge - Informations supplémentaires sur l'état et/ou sur le linge manquant
                  </label>
                  <textarea 
                    className="w-full p-3 border rounded h-24"
                    placeholder="Décrivez l'état général du linge, les éléments manquants, les remplacements nécessaires..."
                    value={formData.etat_informations || ""}
                    onChange={(e) => handleInputChange('section_gestion_linge.etat_informations', e.target.value)}
                  />
                </div>

                {/* Photos du linge */}
                <div>
                  <PhotoUpload 
                    fieldPath="section_gestion_linge.photos_linge"
                    label="Photos du linge"
                    multiple={true}
                    maxFiles={5}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Appuyez pour prendre des photos ou accéder à la pellicule
                  </p>
                </div>

                {/* Emplacement du stock - Description */}
                <div>
                  <label className="block font-semibold mb-2">
                    Linge - Emplacement du stock - Description
                  </label>
                  <textarea 
                    className="w-full p-3 border rounded h-24"
                    placeholder="Décrivez précisément où se situe le stock de linge dans le logement. Combien-y-a-t-il de stockage dans le logement ? Supplément de certaines choses..."
                    value={formData.emplacement_description || ""}
                    onChange={(e) => handleInputChange('section_gestion_linge.emplacement_description', e.target.value)}
                  />
                </div>

                {/* Emplacement du stock - Photo */}
                <div>
                  <PhotoUpload 
                  fieldPath="section_gestion_linge.emplacement_photos"
                  label="Photos de l'emplacement du stock"
                  multiple={true}
                  maxFiles={5}
                />
                  <p className="text-sm text-gray-500 mt-1">
                    Appuyez pour prendre des photos des espaces de stockage
                  </p>
                </div>

                {/* Code du cadenas */}
                <div>
                  <label className="block font-semibold mb-2">
                    Linge - Emplacement du stock - Code du cadenas, de la malle ou emplacement de la clé ? *
                  </label>
                  <input 
                    type="text"
                    className="w-full p-3 border rounded"
                    placeholder="Précisez ici le code ou l'emplacement de la clé."
                    value={formData.emplacement_code_cadenas || ""}
                    onChange={(e) => handleInputChange('section_gestion_linge.emplacement_code_cadenas', e.target.value)}
                  />
                </div>
              </>
            )}

          

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