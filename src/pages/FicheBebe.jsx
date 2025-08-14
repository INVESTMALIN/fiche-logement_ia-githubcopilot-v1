// src/pages/FicheBebe.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'


export default function FicheBebe() {
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

  // PATTERN IMPORTANT : Récupérer formData pour les arrays et booléens
  const formData = getField('section_bebe')

// 🔧 REMPLACER la fonction handleArrayCheckboxChange dans FicheBebe.jsx

const handleArrayCheckboxChange = (field, option, checked) => {
  const currentArray = formData[field.split('.').pop()] || []
  let newArray
  if (checked) {
    newArray = [...currentArray, option]
  } else {
    newArray = currentArray.filter(item => item !== option)
    
    // 🆕 NETTOYAGE AUTOMATIQUE des champs liés quand on décoche
    if (option === 'Lit bébé') {
      // Nettoyer tous les champs liés au lit bébé
      updateField('section_bebe.lit_bebe_type', '')
      updateField('section_bebe.lit_parapluie_disponibilite', '')
      updateField('section_bebe.lit_stores_occultants', null)
    }
    
    if (option === 'Chaise haute') {
      // Nettoyer tous les champs liés à la chaise haute
      updateField('section_bebe.chaise_haute_type', '')
      updateField('section_bebe.chaise_haute_disponibilite', '')
      updateField('section_bebe.chaise_haute_caracteristiques', [])
      updateField('section_bebe.chaise_haute_prix', '')
    }
    
    if (option === 'Jouets pour enfants') {
      // Nettoyer tous les champs liés aux jouets
      updateField('section_bebe.jouets_tranches_age', [])
    }
    
    if (option === 'Autre') {
      // Nettoyer le champ détails
      updateField('section_bebe.equipements_autre_details', '')
    }
  }
  
  updateField(field, newArray)
}

  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  const handleRadioChange = (field, value) => {
    updateField(field, value)
  }

  const handleCheckboxChange = (field, checked) => {
    updateField(field, checked)
  }

  // Liste des équipements bébé
  const equipementsBebe = [
    'Lit bébé',
    'Chaise haute',
    'Table à langer',
    'Baignoire pour bébé',
    'Barrières de sécurité pour bébé',
    'Jouets pour enfants',
    'Babyphone',
    'Caches-prises',
    'Protections sur les coins de tables',
    'Protections sur les fenêtres',
    'Autre (veuillez préciser)'
  ]

  // Déterminer quels équipements sont cochés
  const equipementsCoches = formData.equipements || []
  const litBebeSelected = equipementsCoches.includes('Lit bébé')
  const chaisseHauteSelected = equipementsCoches.includes('Chaise haute')
  const jouetsSelected = equipementsCoches.includes('Jouets pour enfants')
  const autreSelected = equipementsCoches.includes('Autre (veuillez préciser)')

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Équipements pour Bébé</h1>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="space-y-6">
                {/* Liste principale des équipements */}
                <div>
                  <label className="block font-semibold mb-3">
                    Équipements pour bébé disponibles dans le logement :
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {equipementsBebe.map(equipement => (
                      <label key={equipement} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={equipementsCoches.includes(equipement)}
                          onChange={(e) => handleArrayCheckboxChange('section_bebe.equipements', equipement, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{equipement}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* SECTION CONDITIONNELLE : LIT BÉBÉ */}
                {litBebeSelected && (
                  <div className="border-l-4 border-pink-500 pl-6 space-y-4">
                    <h3 className="text-lg font-semibold text-pink-700">Configuration Lit bébé</h3>
                    
                    {/* Type de lit bébé */}
                    <div>
                      <label className="block font-semibold mb-2">Type de lit bébé :</label>
                      <div className="space-y-2">
                        {['Lit pour bébé', 'Parc de voyage', 'Lit parapluie'].map(type => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="lit_bebe_type"
                              value={type}
                              checked={formData.lit_bebe_type === type}
                              onChange={(e) => handleRadioChange('section_bebe.lit_bebe_type', e.target.value)}
                              className="w-4 h-4"
                            />
                            <span>{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* SOUS-SECTION CONDITIONNELLE : LIT PARAPLUIE */}
                    {formData.lit_bebe_type === 'Lit parapluie' && (
                      <div className="bg-pink-50 p-4 rounded-lg space-y-4">
                        {/* Disponibilité lit parapluie */}
                        <div>
                          <label className="block font-semibold mb-2">Disponibilité du lit parapluie :</label>
                          <div className="space-y-2">
                            {['Toujours dans le logement', 'Sur demande'].map(dispo => (
                              <label key={dispo} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="lit_parapluie_disponibilite"
                                  value={dispo}
                                  checked={formData.lit_parapluie_disponibilite === dispo}
                                  onChange={(e) => handleRadioChange('section_bebe.lit_parapluie_disponibilite', e.target.value)}
                                  className="w-4 h-4"
                                />
                                <span>{dispo}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Stores occultants */}
                        <div>
                          <label className="block font-semibold mb-2">Caractéristique supplémentaire :</label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.lit_stores_occultants === true}
                              onChange={(e) => handleCheckboxChange('section_bebe.lit_stores_occultants', e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span>Stores occultants dans la pièce</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION CONDITIONNELLE : CHAISE HAUTE */}
                {chaisseHauteSelected && (
                  <div className="border-l-4 border-blue-500 pl-6 space-y-4">
                    <h3 className="text-lg font-semibold text-blue-700">Configuration Chaise haute</h3>
                    
                    {/* Type de chaise haute */}
                    <div>
                      <label className="block font-semibold mb-2">Type de chaise haute :</label>
                      <div className="space-y-2">
                        {['Indépendante', 'Pliable ou transformable', 'Rehausseur', 'Siège de table'].map(type => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="chaise_haute_type"
                              value={type}
                              checked={formData.chaise_haute_type === type}
                              onChange={(e) => handleRadioChange('section_bebe.chaise_haute_type', e.target.value)}
                              className="w-4 h-4"
                            />
                            <span>{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Disponibilité chaise haute */}
                    <div>
                      <label className="block font-semibold mb-2">Disponibilité de la chaise haute :</label>
                      <div className="space-y-2">
                        {['Toujours disponible dans le logement', 'Sur demande'].map(dispo => (
                          <label key={dispo} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="chaise_haute_disponibilite"
                              value={dispo}
                              checked={formData.chaise_haute_disponibilite === dispo}
                              onChange={(e) => handleRadioChange('section_bebe.chaise_haute_disponibilite', e.target.value)}
                              className="w-4 h-4"
                            />
                            <span>{dispo}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Caractéristiques chaise haute */}
                    <div>
                      <label className="block font-semibold mb-2">Caractéristiques de la chaise haute :</label>
                      <div className="space-y-2">
                        {['Rembourrée', 'Avec sangles ou harnais', 'Avec plateau'].map(carac => (
                          <label key={carac} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(formData.chaise_haute_caracteristiques || []).includes(carac)}
                              onChange={(e) => handleArrayCheckboxChange('section_bebe.chaise_haute_caracteristiques', carac, e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span>{carac}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Prix chaise haute */}
                    <div>
                      <label className="block font-semibold mb-2">Prix de la chaise haute :</label>
                      <div className="space-y-2">
                        {['Compris dans votre séjour', 'Disponible moyennant un supplément'].map(prix => (
                          <label key={prix} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="chaise_haute_prix"
                              value={prix}
                              checked={formData.chaise_haute_prix === prix}
                              onChange={(e) => handleRadioChange('section_bebe.chaise_haute_prix', e.target.value)}
                              className="w-4 h-4"
                            />
                            <span>{prix}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION CONDITIONNELLE : JOUETS */}
                {jouetsSelected && (
                  <div className="border-l-4 border-green-500 pl-6 space-y-4">
                    <h3 className="text-lg font-semibold text-green-700">🧸 Configuration Jouets pour enfants</h3>
                    
                    <div>
                      <label className="block font-semibold mb-2">Tranches d'âge concernées :</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['0 à 2 ans', '2 à 5 ans', '5 à 10 ans', 'Plus de 10 ans'].map(tranche => (
                          <label key={tranche} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(formData.jouets_tranches_age || []).includes(tranche)}
                              onChange={(e) => handleArrayCheckboxChange('section_bebe.jouets_tranches_age', tranche, e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span>{tranche}</span>
                          </label>
                        ))}
                      </div>
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
                        placeholder="Décrivez l'équipement bébé supplémentaire"
                        className="w-full p-2 border rounded"
                        value={getField('section_bebe.equipements_autre_details')}
                        onChange={(e) => handleInputChange('section_bebe.equipements_autre_details', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* PHOTOS (toujours visible si au moins un équipement coché) */}
                {equipementsCoches.length > 0 && (
                  <div className="border-t pt-6">
                    <PhotoUpload 
                      fieldPath="section_bebe.photos_equipements_bebe"
                      label="Photos - Tous les équipements bébé sélectionnés"
                      multiple={true}
                      maxFiles={12}
                    />
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