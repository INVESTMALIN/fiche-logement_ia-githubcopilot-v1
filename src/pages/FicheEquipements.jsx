// src/pages/FicheEquipements.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'

export default function FicheEquipements() {
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
  const formData = getField('section_equipements')

  // Handler pour champs simples
  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  // Handler pour checkboxes multiples (parking sur place types)
  const handleCheckboxArrayChange = (field, value, checked) => {
    const currentArray = formData[field.split('.').pop()] || []
    if (checked) {
      const newArray = [...currentArray, value]
      updateField(field, newArray)
    } else {
      const newArray = currentArray.filter(item => item !== value)
      updateField(field, newArray)
    }
  }

  // Liste des équipements pour la checklist
  const equipements = [
    // Colonne 1
    { key: 'wifi', label: 'Wi-Fi' },
    { key: 'climatisation', label: 'Climatisation' },
    { key: 'lave_linge', label: 'Lave-linge' },
    { key: 'seche_linge', label: 'Sèche-linge' },
    { key: 'parking_equipement', label: 'Parking' },
    { key: 'tourne_disque', label: 'Tourne disque' },
    { key: 'coffre_fort', label: 'Coffre fort' },
    { key: 'ascenseur', label: 'Ascenseur' },
    { key: 'animaux_acceptes', label: 'Animaux acceptés' },
    { key: 'fetes_autorisees', label: 'Fêtes autorisées' },
    
    // Colonne 2
    { key: 'tv', label: 'TV' },
    { key: 'chauffage', label: 'Chauffage' },
    { key: 'fer_repasser', label: 'Fer à repasser' },
    { key: 'etendoir', label: 'Etendoir' },
    { key: 'piano', label: 'Piano' },
    { key: 'cinema', label: 'Cinéma' },
    { key: 'compacteur_dechets', label: 'Compacteur de déchets' },
    { key: 'accessible_mobilite_reduite', label: 'Accessible aux personnes à mobilité réduite' },
    { key: 'fumeurs_acceptes', label: 'Fumeurs acceptés' }
  ]

  // Types de parking pour GRATUIT SUR PLACE (4 options, checkboxes multiples)
  const typesParkingGratuitOptions = [
    'Parking sous-terrain',
    'Abri voiture', 
    'Stationnement dans une allée privée',
    'Garage individuel'
  ]

  // Types de parking pour PAYANT (3 options, radio unique)
  const typesParkingPayantOptions = [
    'Parking sous-terrain',
    'Abri voiture', 
    'Stationnement dans une allée privée'
  ]

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Équipements</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* SECTION 1: Équipements techniques essentiels */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Équipements Techniques Essentiels</h2>
              
              {/* Vidéo accès local poubelle */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Faire une vidéo de l'accès au local poubelle
                </label>
                <div className="flex gap-6">
                  <label className="inline-flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="video_acces_poubelle"
                      checked={formData.video_acces_poubelle === true}
                      onChange={() => handleInputChange('section_equipements.video_acces_poubelle', true)}
                    />
                    Fait
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="video_acces_poubelle"
                      checked={formData.video_acces_poubelle === false}
                      onChange={() => handleInputChange('section_equipements.video_acces_poubelle', false)}
                    />
                    À faire
                  </label>
                </div>
              </div>

              {/* Local Poubelle - Emplacement */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Local Poubelle - Emplacement du local Poubelle *
                </label>
                <textarea 
                  className="w-full p-3 border rounded h-24"
                  placeholder="Décrivez l'emplacement du local poubelle"
                  value={formData.poubelle_emplacement || ""}
                  onChange={(e) => handleInputChange('section_equipements.poubelle_emplacement', e.target.value)}
                />
              </div>

              {/* Local Poubelle - Ramassage */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Local Poubelle - Programmation du ramassage des déchets *
                </label>
                <textarea 
                  className="w-full p-3 border rounded h-24"
                  placeholder="Décrivez le fonctionnement du ramassage des déchets, les jours de ramassage, etc."
                  value={formData.poubelle_ramassage || ""}
                  onChange={(e) => handleInputChange('section_equipements.poubelle_ramassage', e.target.value)}
                />
              </div>

              {/* Photo Local Poubelle */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">Photo du Local Poubelle</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  multiple
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Appuyez pour prendre des photos du local poubelle
                </p>
              </div>

              {/* Disjoncteur - Emplacement */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Disjoncteur - Emplacement du disjoncteur *
                </label>
                <textarea 
                  className="w-full p-3 border rounded h-24"
                  placeholder="Décrivez l'emplacement du disjoncteur principal"
                  value={formData.disjoncteur_emplacement || ""}
                  onChange={(e) => handleInputChange('section_equipements.disjoncteur_emplacement', e.target.value)}
                />
              </div>

              {/* Photo Disjoncteur */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">Photo du disjoncteur</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  multiple
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Appuyez pour prendre des photos du disjoncteur
                </p>
              </div>

              {/* Vanne d'arrêt d'eau - Emplacement */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Vanne d'arrêt d'eau - Emplacement de la vanne *
                </label>
                <textarea 
                  className="w-full p-3 border rounded h-24"
                  placeholder="Décrivez où se trouve la vanne d'arrêt d'eau principale"
                  value={formData.vanne_eau_emplacement || ""}
                  onChange={(e) => handleInputChange('section_equipements.vanne_eau_emplacement', e.target.value)}
                />
              </div>

              {/* Photo Vanne d'eau */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">Photo de la vanne d'arrêt d'eau</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  multiple
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Appuyez pour prendre des photos de la vanne d'arrêt d'eau
                </p>
              </div>

              {/* Système de chauffage d'eau */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Système de chauffage d'eau *
                </label>
                <div className="flex gap-6">
                  <label className="inline-flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="systeme_chauffage_eau"
                      checked={formData.systeme_chauffage_eau === 'Chaudière'}
                      onChange={() => handleInputChange('section_equipements.systeme_chauffage_eau', 'Chaudière')}
                    />
                    Chaudière
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="systeme_chauffage_eau"
                      checked={formData.systeme_chauffage_eau === 'Ballon d\'eau chaude'}
                      onChange={() => handleInputChange('section_equipements.systeme_chauffage_eau', 'Ballon d\'eau chaude')}
                    />
                    Ballon d'eau chaude
                  </label>
                </div>
              </div>

              {/* Emplacement système chauffage */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Emplacement du système de chauffage d'eau *
                </label>
                <textarea 
                  className="w-full p-3 border rounded h-24"
                  placeholder="Décrivez où se trouve la chaudière ou le ballon d'eau chaude"
                  value={formData.chauffage_eau_emplacement || ""}
                  onChange={(e) => handleInputChange('section_equipements.chauffage_eau_emplacement', e.target.value)}
                />
              </div>

              {/* Photo système chauffage */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">Photo du système de chauffage d'eau</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  multiple
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Appuyez pour prendre des photos du système de chauffage
                </p>
              </div>

              {/* Vidéo système chauffage */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Faire une vidéo du système de chauffage
                </label>
                <div className="flex gap-6">
                  <label className="inline-flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="video_systeme_chauffage"
                      checked={formData.video_systeme_chauffage === true}
                      onChange={() => handleInputChange('section_equipements.video_systeme_chauffage', true)}
                    />
                    Fait
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="video_systeme_chauffage"
                      checked={formData.video_systeme_chauffage === false}
                      onChange={() => handleInputChange('section_equipements.video_systeme_chauffage', false)}
                    />
                    À faire
                  </label>
                </div>
              </div>
            </div>

            {/* SECTION 2: Équipements et Commodités */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Équipements et Commodités</h2>
              
              {/* Checklist équipements en 2 colonnes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {equipements.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input 
                      type="checkbox"
                      checked={formData[key] === true}
                      onChange={(e) => handleInputChange(`section_equipements.${key}`, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>

              {/* Parking principal */}
              <div className="mb-4">
                <label className="block font-semibold mb-3">Parking *</label>
                <div className="space-y-3 max-w-lg">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input 
                      type="radio" 
                      name="parking_type"
                      checked={formData.parking_type === 'rue'}
                      onChange={() => handleInputChange('section_equipements.parking_type', 'rue')}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">Parking gratuit dans la rue</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input 
                      type="radio" 
                      name="parking_type"
                      checked={formData.parking_type === 'sur_place'}
                      onChange={() => handleInputChange('section_equipements.parking_type', 'sur_place')}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">Parking gratuit sur place</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input 
                      type="radio" 
                      name="parking_type"
                      checked={formData.parking_type === 'payant'}
                      onChange={() => handleInputChange('section_equipements.parking_type', 'payant')}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">Stationnement payant à l'extérieur de la propriété</span>
                  </label>
                </div>
              </div>

              {/* Champs conditionnels parking */}
              {formData.parking_type === 'rue' && (
                <div className="mb-4">
                  <label className="block font-semibold mb-2">
                    Parking gratuit dans la rue - Détails *
                  </label>
                  <textarea 
                    className="w-full p-3 border rounded h-32"
                    placeholder={`Fournissez des informations détaillées sur le parking gratuit :
• Emplacement des places de stationnement (noms des rues spécifiques)
• Disponibilité habituelle des places (facile/difficile à trouver)
• Restrictions éventuelles (horaires, durée maximale, jours spécifiques)
• Règles de stationnement particulières (ex: alternance côté pair/impair)
• Distance approximative du logement
• Conseils pour trouver une place
• Sécurité du quartier pour le stationnement
• Toute autre information utile pour les voyageurs`}
                    value={formData.parking_rue_details || ""}
                    onChange={(e) => handleInputChange('section_equipements.parking_rue_details', e.target.value)}
                  />
                </div>
              )}


            {formData.parking_type === 'sur_place' && (
              <>
                <div className="mb-4">
                  <label className="block font-semibold mb-2">Parking - Type * (plusieurs choix possibles)</label>
                  <div className="space-y-2">
                    {typesParkingGratuitOptions.map(option => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={(formData.parking_sur_place_types || []).includes(option)}
                          onChange={(e) => handleCheckboxArrayChange('section_equipements.parking_sur_place_types', option, e.target.checked)}
                          className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block font-semibold mb-2">
                    Parking gratuit sur place - Détails *
                  </label>
                  <textarea 
                    className="w-full p-3 border rounded h-32"
                    placeholder={`Fournissez des informations détaillées sur le parking gratuit...`}
                    value={formData.parking_sur_place_details || ""}
                    onChange={(e) => handleInputChange('section_equipements.parking_sur_place_details', e.target.value)}
                  />
                </div>
              </>
            )}



              {formData.parking_type === 'payant' && (
                <>
                  <div className="mb-4">
                    <label className="block font-semibold mb-2">Parking - Stationnement payant - Type *</label>
                    <div className="space-y-2">
                      {typesParkingPayantOptions.map(option => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio"
                            name="parking_payant_type"
                            checked={formData.parking_payant_type === option}
                            onChange={() => handleInputChange('section_equipements.parking_payant_type', option)}
                            className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block font-semibold mb-2">
                      Parking - Stationnement payant - Détails *
                    </label>
                    <textarea 
                      className="w-full p-3 border rounded h-32"
                      placeholder={`Fournissez des informations détaillées sur le parking payant...`}
                      value={formData.parking_payant_details || ""}
                      onChange={(e) => handleInputChange('section_equipements.parking_payant_details', e.target.value)}
                    />
                  </div>
                </>
              )}
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
      </div>
    </div>
  )
}