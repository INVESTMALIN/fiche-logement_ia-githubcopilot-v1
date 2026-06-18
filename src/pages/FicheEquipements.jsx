// src/pages/FicheEquipements.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'

// Cartes de schéma - définir quels champs nettoyer par branche
const BRANCH_SCHEMAS = {
  tv: [
    'tv_type', 'tv_taille', 'tv_type_autre_details', 'tv_video',
    'tv_services', 'tv_consoles', 'tv_console_video'
  ],
  climatisation: [
    'climatisation_type', 'climatisation_instructions', 'climatisation_video'
  ],
  chauffage: [
    'chauffage_types', 'chauffage_instructions', 'chauffage_video'
  ],
  ventilateur: [
    'ventilateur_types', 'ventilateur_nombre', 'ventilateur_emplacement',
    'ventilateur_photos', 'ventilateur_videos'
  ],
  seche_serviettes: [
    'seche_serviettes_photos', 'seche_serviettes_videos'
  ],
  lave_linge: [
    'lave_linge_prix', 'lave_linge_emplacement',
    'lave_linge_instructions', 'lave_linge_video'
  ],
  seche_linge: [
    'seche_linge_prix', 'seche_linge_emplacement',
    'seche_linge_instructions', 'seche_linge_video'
  ],
  parking_equipement: [
    'parking_photos', 'parking_videos'
  ],
  piano: [
    'piano_marque', 'piano_type'
  ],
  accessible_mobilite_reduite: [
    'pmr_details'
  ],
  wifi_disponible: [
    'wifi_nom_reseau',
    'wifi_mot_de_passe',
    'wifi_routeur_photo'
  ]
}

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

  // Handler pour champs simples avec nettoyage des branches
  const handleInputChange = (field, value) => {
    // Détection si c'est une checkbox d'équipement principale qui passe à false
    const fieldKey = field.split('.').pop()

    if (BRANCH_SCHEMAS[fieldKey] && value === false) {
      // C'est une checkbox racine qui est décochée, nettoyer la branche
      const currentData = getField('section_equipements')
      const newData = { ...currentData }

      // Nettoyer tous les champs de la branche
      BRANCH_SCHEMAS[fieldKey].forEach(key => {
        if (Array.isArray(newData[key])) {
          newData[key] = []
        } else if (typeof newData[key] === 'object' && newData[key] !== null) {
          newData[key] = {}
        } else {
          newData[key] = null
        }
      })

      // Remettre explicitement le flag racine à false
      newData[fieldKey] = false

      // Une seule mise à jour atomique
      updateField('section_equipements', newData)
    } else {
      // Comportement normal pour les autres cas
      updateField(field, value)
    }
  }

  // 🧹 Handler spécialisé pour le statut WiFi avec nettoyage
  const handleWifiStatutChange = (field, value) => {
    updateField(field, value)

    // Nettoyer les identifiants si on quitte "oui"
    if (value !== 'oui') {
      updateField('section_equipements.wifi_nom_reseau', '')
      updateField('section_equipements.wifi_mot_de_passe', '')
    }

    // Nettoyer les détails si on quitte "en_cours"
    if (value !== 'en_cours') {
      updateField('section_equipements.wifi_details', '')
    }
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

  // 🧹 Handler spécialisé pour le type de parking avec nettoyage des sous-options
  const handleParkingTypeChange = (field, value) => {
    updateField(field, value)

    // Nettoyer les champs des autres types non sélectionnés    
    if (value !== 'rue') {
      updateField('section_equipements.parking_rue_details', '')
    }
    if (value !== 'sur_place') {
      updateField('section_equipements.parking_sur_place_types', [])
      updateField('section_equipements.parking_sur_place_details', '')
    }
    if (value !== 'payant') {
      updateField('section_equipements.parking_payant_type', '')
      updateField('section_equipements.parking_payant_details', '')
    }
  }

  // Liste des équipements pour la checklist
  const equipements = [
    // Colonne 1
    { key: 'climatisation', label: 'Climatisation' },
    { key: 'lave_linge', label: 'Lave-linge' },
    { key: 'seche_linge', label: 'Sèche-linge' },
    { key: 'parking_equipement', label: 'Parking' },
    { key: 'tourne_disque', label: 'Tourne disque' },
    { key: 'coffre_fort', label: 'Coffre fort' },
    { key: 'ascenseur', label: 'Ascenseur' },
    { key: 'fetes_autorisees', label: 'Fêtes autorisées' },

    // Colonne 2
    { key: 'tv', label: 'TV' },
    { key: 'chauffage', label: 'Chauffage' },
    { key: 'ventilateur', label: 'Ventilateur' },
    { key: 'seche_serviettes', label: 'Sèche-serviettes' },
    { key: 'fer_repasser', label: 'Fer à repasser' },
    { key: 'etendoir', label: 'Étendoir' },
    { key: 'piano', label: 'Piano' },
    { key: 'cinema', label: 'Cinéma' },
    { key: 'compacteur_dechets', label: 'Compacteur de déchets' },
    { key: 'accessible_mobilite_reduite', label: 'Accessible aux personnes à mobilité réduite' },
    { key: 'fumeurs_acceptes', label: 'Fumeurs acceptés' }
  ]

  // Types de parking pour GRATUIT SUR PLACE (4 options, checkboxes multiples)
  const typesParkingGratuitOptions = [
    'Parking souterrain',
    'Abri voiture',
    'Stationnement dans une allée privée',
    'Garage individuel'
  ]

  // Types de parking pour PAYANT (3 options, radio unique)
  const typesParkingPayantOptions = [
    'Parking souterrain',
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
              <h2 className="text-lg font-semibold mb-4">Équipements techniques essentiels</h2>

              {/* Vidéo accès local poubelle */}
              <div className="mb-4">
                <PhotoUpload
                  fieldPath="section_equipements.video_acces_poubelle"
                  label="Faire une vidéo de l'accès au local poubelle"
                  multiple={true}
                  maxFiles={1}
                  acceptVideo={true}
                />
              </div>

              {/* Local Poubelle - Emplacement */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Emplacement du local poubelle *
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
                  Programmation du ramassage des déchets *
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
                <PhotoUpload
                  fieldPath="section_equipements.poubelle_photos"
                  label="Photos du local poubelle"
                  multiple={true}
                  maxFiles={10}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Appuyez pour prendre des photos du local poubelle
                </p>
              </div>

              {/* Disjoncteur - Emplacement */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Emplacement du disjoncteur *
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
                <PhotoUpload
                  fieldPath="section_equipements.disjoncteur_photos"
                  label="Photos du disjoncteur"
                  multiple={true}
                  maxFiles={10}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Appuyez pour prendre des photos du disjoncteur
                </p>
              </div>

              {/* Vanne d'arrêt d'eau - Emplacement */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Emplacement de la vanne d'arrêt d'eau *
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
                <PhotoUpload
                  fieldPath="section_equipements.vanne_arret_photos"
                  label="Photos de la vanne d'arrêt d'eau"
                  multiple={true}
                  maxFiles={10}
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
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="systeme_chauffage_eau"
                      checked={formData.systeme_chauffage_eau === 'Chaudière'}
                      onChange={() => handleInputChange('section_equipements.systeme_chauffage_eau', 'Chaudière')}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Chaudière</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="systeme_chauffage_eau"
                      checked={formData.systeme_chauffage_eau === 'Ballon d\'eau chaude'}
                      onChange={() => handleInputChange('section_equipements.systeme_chauffage_eau', 'Ballon d\'eau chaude')}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Ballon d'eau chaude</span>
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
                <PhotoUpload
                  fieldPath="section_equipements.chauffage_eau_photos"
                  label="Photos du système de chauffage d'eau"
                  multiple={true}
                  maxFiles={10}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Appuyez pour prendre des photos du système de chauffage
                </p>
              </div>

              {/* Vidéo système chauffage */}
              <div className="mb-4">
                <PhotoUpload
                  fieldPath="section_equipements.video_systeme_chauffage"
                  label="Faire une vidéo du système de chauffage"
                  multiple={true}
                  maxFiles={1}
                  acceptVideo={true}
                />
              </div>
            </div>


            {/* SECTION 2: Équipements et C=commodités */}
            <div>
              <div>
                <h2 className="text-lg font-semibold mb-4">Équipements et commodités</h2>

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

                {/* ============================================
                    TV - AFFICHAGE CONDITIONNEL
                    ============================================ */}
                {formData.tv === true && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-3 text-gray-800">📺 Télévision</h3>

                    {/* Type de TV */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Type de TV *</label>
                      <select
                        className="w-full p-3 border rounded"
                        value={formData.tv_type || ""}
                        onChange={(e) => handleInputChange('section_equipements.tv_type', e.target.value)}
                      >
                        <option value="">Sélectionnez un type</option>
                        <option value="TV standard">TV standard</option>
                        <option value="TV HD">TV HD</option>
                        <option value="Smart TV">Smart TV</option>
                        <option value="TV avec câble/satellite">TV avec câble/satellite</option>
                        <option value="TV connectée (services de streaming)">TV connectée (services de streaming)</option>
                        <option value="Autre (veuillez préciser)">Autre (veuillez préciser)</option>
                      </select>
                    </div>

                    {/* Taille de la TV */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Taille de la TV</label>
                      <input
                        type="text"
                        className="w-full p-3 border rounded"
                        placeholder="Ex: 55 pouces"
                        value={formData.tv_taille || ""}
                        onChange={(e) => handleInputChange('section_equipements.tv_taille', e.target.value)}
                      />
                    </div>

                    {/* Autre - Précisions */}
                    {formData.tv_type === "Autre (veuillez préciser)" && (
                      <div className="mb-4">
                        <label className="block font-medium mb-2">Précisions *</label>
                        <textarea
                          className="w-full p-3 border rounded h-24"
                          placeholder="Précisez le type de TV..."
                          value={formData.tv_type_autre_details || ""}
                          onChange={(e) => handleInputChange('section_equipements.tv_type_autre_details', e.target.value)}
                        />
                      </div>
                    )}

                    {/* Vidéo de la TV */}
                    <div className="mb-4">
                      <PhotoUpload
                        fieldPath="section_equipements.tv_video"
                        label="Faire une vidéo de la TV"
                        multiple={true}
                        maxFiles={1}
                        acceptVideo={true}
                      />
                    </div>

                    {/* Services ou fonctionnalités disponibles */}
                    <div className="mb-4">
                      <label className="block font-medium mb-3">Services ou fonctionnalités disponibles</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[
                          "Amazon Prime Video",
                          "Apple TV",
                          "Chromecast",
                          "Disney+",
                          "Fire TV",
                          "Max",
                          "Hulu",
                          "Netflix",
                          "Télévision par câble haut de gamme",
                          "Roku",
                          "Abonnement au câble standard",
                          "Lecteur DVD",
                          "Console"
                        ].map(service => (
                          <label key={service} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(formData.tv_services || []).includes(service)}
                              onChange={(e) => handleCheckboxArrayChange('section_equipements.tv_services', service, e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm">{service}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Console - Sous-section conditionnelle */}
                    {(formData.tv_services || []).includes("Console") && (
                      <div className="ml-6 p-3 border-l-4 border-blue-400 bg-blue-50">
                        <h4 className="font-medium mb-3">🎮 Consoles disponibles</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                          {[
                            "Nintendo Switch",
                            "Nintendo Wii",
                            "Nintendo Wii U",
                            "PS2",
                            "PS3",
                            "PS4",
                            "PS5",
                            "Xbox 360",
                            "Xbox One",
                            "Xbox Series X"
                          ].map(console => (
                            <label key={console} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(formData.tv_consoles || []).includes(console)}
                                onChange={(e) => handleCheckboxArrayChange('section_equipements.tv_consoles', console, e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm">{console}</span>
                            </label>
                          ))}
                        </div>

                        {/* Vidéo instruction console */}
                        <PhotoUpload
                          fieldPath="section_equipements.tv_console_video"
                          label="Vidéo d'instruction pour utiliser la console"
                          multiple={true}
                          maxFiles={1}
                          acceptVideo={true}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================
                    CLIMATISATION - AFFICHAGE CONDITIONNEL
                    ============================================ */}
                {formData.climatisation === true && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-3 text-gray-800">❄️ Climatisation</h3>

                    {/* Type de climatisation */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Type(s) de climatisation</label>
                      <div className="space-y-2">
                        {[
                          'Climatisation centrale',
                          'Climatiseur portable',
                          'Climatiseur de fenêtre',
                          'Système split sans évacuation'
                        ].map(option => (
                          <label key={option} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(formData.climatisation_type || []).includes(option)}
                              onChange={(e) => {
                                const currentArray = formData.climatisation_type || []
                                if (e.target.checked) {
                                  handleInputChange('section_equipements.climatisation_type', [...currentArray, option])
                                } else {
                                  handleInputChange('section_equipements.climatisation_type', currentArray.filter(item => item !== option))
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Instructions d'utilisation */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Instructions d'utilisation</label>
                      <textarea
                        className="w-full p-3 border rounded h-24"
                        placeholder="Décrivez comment utiliser la climatisation..."
                        value={formData.climatisation_instructions || ""}
                        onChange={(e) => handleInputChange('section_equipements.climatisation_instructions', e.target.value)}
                      />
                    </div>

                    {/* Vidéo d'instruction */}
                    <PhotoUpload
                      fieldPath="section_equipements.climatisation_video"
                      label="Vidéo d'instruction climatisation"
                      multiple={true}
                      maxFiles={1}
                      acceptVideo={true}
                    />
                  </div>
                )}

                {/* ============================================
                    CHAUFFAGE - AFFICHAGE CONDITIONNEL
                    ============================================ */}
                {formData.chauffage === true && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-3 text-gray-800">🔥 Chauffage</h3>

                    {/* Types de chauffage - Sélection multiple */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Types de chauffage *</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          'Chauffage central',
                          'Chauffage d\'appoint',
                          'Chauffage radiant',
                          'Système split sans évacuation',
                          'Chauffage soufflant',
                          'Chauffage mobile'
                        ].map((type) => (
                          <label key={type} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={(formData.chauffage_types || []).includes(type)}
                              onChange={(e) => {
                                const currentTypes = formData.chauffage_types || []
                                const newTypes = e.target.checked
                                  ? [...currentTypes, type]
                                  : currentTypes.filter(t => t !== type)
                                handleInputChange('section_equipements.chauffage_types', newTypes)
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Instructions d'utilisation */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Instructions d'utilisation</label>
                      <textarea
                        className="w-full p-3 border rounded h-24"
                        placeholder="Décrivez comment utiliser le système de chauffage..."
                        value={formData.chauffage_instructions || ""}
                        onChange={(e) => handleInputChange('section_equipements.chauffage_instructions', e.target.value)}
                      />
                    </div>

                    {/* Vidéo du thermostat/système */}
                    <PhotoUpload
                      fieldPath="section_equipements.chauffage_video"
                      label="Vidéo du thermostat / système de chauffage"
                      multiple={true}
                      maxFiles={1}
                      acceptVideo={true}
                    />
                  </div>
                )}

                {/* ============================================
                    VENTILATEUR - AFFICHAGE CONDITIONNEL
                    ============================================ */}
                {formData.ventilateur === true && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-3 text-gray-800">🌀 Ventilateur et rafraîchisseurs</h3>

                    {/* Types de ventilateur - Sélection multiple */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Types de ventilateur *</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          'Ventilateur de plafond',
                          'Ventilateur Mobile',
                          'Rafraichisseur d\'air'
                        ].map((type) => (
                          <label key={type} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={(formData.ventilateur_types || []).includes(type)}
                              onChange={(e) => {
                                const currentTypes = formData.ventilateur_types || []
                                const newTypes = e.target.checked
                                  ? [...currentTypes, type]
                                  : currentTypes.filter(t => t !== type)
                                handleInputChange('section_equipements.ventilateur_types', newTypes)
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Nombre */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Nombre de ventilateurs</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full p-3 border rounded"
                        placeholder="Ex: 2"
                        value={formData.ventilateur_nombre || ""}
                        onChange={(e) => handleInputChange('section_equipements.ventilateur_nombre', e.target.value)}
                      />
                    </div>

                    {/* Emplacement */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Emplacement</label>
                      <textarea
                        className="w-full p-3 border rounded h-24"
                        placeholder="Décrivez où se trouvent les ventilateurs..."
                        value={formData.ventilateur_emplacement || ""}
                        onChange={(e) => handleInputChange('section_equipements.ventilateur_emplacement', e.target.value)}
                      />
                    </div>

                    {/* Photos */}
                    <div className="mb-4">
                      <PhotoUpload
                        fieldPath="section_equipements.ventilateur_photos"
                        label="Photos des ventilateurs"
                        multiple={true}
                        maxFiles={10}
                      />
                    </div>

                    {/* Vidéos */}
                    <PhotoUpload
                      fieldPath="section_equipements.ventilateur_videos"
                      label="Vidéos des ventilateurs"
                      multiple={true}
                      maxFiles={3}
                      acceptVideo={true}
                    />
                  </div>
                )}

                {/* ============================================
    SÈCHE SERVIETTES - AFFICHAGE CONDITIONNEL
    ============================================ */}
                {formData.seche_serviettes === true && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-3 text-gray-800">🔥 Sèche serviettes</h3>

                    {/* Photos */}
                    <div className="mb-4">
                      <PhotoUpload
                        fieldPath="section_equipements.seche_serviettes_photos"
                        label="Photos du sèche serviettes"
                        multiple={true}
                        maxFiles={10}
                      />
                    </div>

                    {/* Vidéos */}
                    <PhotoUpload
                      fieldPath="section_equipements.seche_serviettes_videos"
                      label="Vidéos du sèche serviettes"
                      multiple={true}
                      maxFiles={3}
                      acceptVideo={true}
                    />
                  </div>
                )}

                {/* ============================================
                    LAVE-LINGE - AFFICHAGE CONDITIONNEL
                    ============================================ */}
                {formData.lave_linge === true && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-3 text-gray-800">🧺 Lave-linge</h3>

                    {/* Prix */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Prix</label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="lave_linge_prix"
                            checked={formData.lave_linge_prix === 'compris'}
                            onChange={() => handleInputChange('section_equipements.lave_linge_prix', 'compris')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Compris</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="lave_linge_prix"
                            checked={formData.lave_linge_prix === 'supplément'}
                            onChange={() => handleInputChange('section_equipements.lave_linge_prix', 'supplément')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Supplément</span>
                        </label>
                      </div>
                    </div>

                    {/* Emplacement */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Emplacement</label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="lave_linge_emplacement"
                            checked={formData.lave_linge_emplacement === 'dans logement'}
                            onChange={() => handleInputChange('section_equipements.lave_linge_emplacement', 'dans logement')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Dans le logement</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="lave_linge_emplacement"
                            checked={formData.lave_linge_emplacement === 'dans immeuble'}
                            onChange={() => handleInputChange('section_equipements.lave_linge_emplacement', 'dans immeuble')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Dans l'immeuble</span>
                        </label>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Instructions d'utilisation</label>
                      <textarea
                        className="w-full p-3 border rounded h-24"
                        placeholder="Décrivez comment utiliser le lave-linge..."
                        value={formData.lave_linge_instructions || ""}
                        onChange={(e) => handleInputChange('section_equipements.lave_linge_instructions', e.target.value)}
                      />
                    </div>

                    {/* Vidéo de l'appareil */}
                    <PhotoUpload
                      fieldPath="section_equipements.lave_linge_video"
                      label="Vidéo du lave-linge"
                      multiple={true}
                      maxFiles={1}
                      acceptVideo={true}
                    />
                  </div>
                )}

                {/* ============================================
                    SÈCHE-LINGE - AFFICHAGE CONDITIONNEL
                    ============================================ */}
                {formData.seche_linge === true && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-3 text-gray-800">🌀 Sèche-linge</h3>

                    {/* Prix */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Prix</label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="seche_linge_prix"
                            checked={formData.seche_linge_prix === 'compris'}
                            onChange={() => handleInputChange('section_equipements.seche_linge_prix', 'compris')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Compris</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="seche_linge_prix"
                            checked={formData.seche_linge_prix === 'supplément'}
                            onChange={() => handleInputChange('section_equipements.seche_linge_prix', 'supplément')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Supplément</span>
                        </label>
                      </div>
                    </div>

                    {/* Emplacement */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Emplacement</label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="seche_linge_emplacement"
                            checked={formData.seche_linge_emplacement === 'dans logement'}
                            onChange={() => handleInputChange('section_equipements.seche_linge_emplacement', 'dans logement')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Dans le logement</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="seche_linge_emplacement"
                            checked={formData.seche_linge_emplacement === 'dans immeuble'}
                            onChange={() => handleInputChange('section_equipements.seche_linge_emplacement', 'dans immeuble')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Dans l'immeuble</span>
                        </label>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Instructions d'utilisation</label>
                      <textarea
                        className="w-full p-3 border rounded h-24"
                        placeholder="Décrivez comment utiliser le sèche-linge..."
                        value={formData.seche_linge_instructions || ""}
                        onChange={(e) => handleInputChange('section_equipements.seche_linge_instructions', e.target.value)}
                      />
                    </div>

                    {/* Vidéo de l'appareil */}
                    <PhotoUpload
                      fieldPath="section_equipements.seche_linge_video"
                      label="Vidéo du sèche-linge"
                      multiple={true}
                      maxFiles={1}
                      acceptVideo={true}
                    />
                  </div>
                )}

                {/* ============================================
                    PARKING - AFFICHAGE CONDITIONNEL (PHOTOS/VIDÉOS UNIQUEMENT)
                    ============================================ */}
                {formData.parking_equipement === true && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-3 text-gray-800">🚗 Parking - Photos et Vidéo</h3>

                    {/* Photos de la place */}
                    <div className="mb-4">
                      <PhotoUpload
                        fieldPath="section_equipements.parking_photos"
                        label="Photos de la place de stationnement"
                        multiple={true}
                        maxFiles={10}
                        acceptVideo={false}
                      />
                    </div>

                    {/* Vidéo de la place */}
                    <PhotoUpload
                      fieldPath="section_equipements.parking_videos"
                      label="Vidéo de la place de stationnement"
                      multiple={true}
                      maxFiles={1}
                      acceptVideo={true}
                    />
                  </div>
                )}

                {/* ============================================
                    PIANO - AFFICHAGE CONDITIONNEL
                    ============================================ */}
                {formData.piano === true && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-3 text-gray-800">🎹 Piano</h3>

                    {/* Marque */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Marque</label>
                      <input
                        type="text"
                        className="w-full p-3 border rounded"
                        placeholder="Ex: Yamaha, Steinway..."
                        value={formData.piano_marque || ""}
                        onChange={(e) => handleInputChange('section_equipements.piano_marque', e.target.value)}
                      />
                    </div>

                    {/* Type */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">Type de piano</label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="piano_type"
                            checked={formData.piano_type === 'à queue'}
                            onChange={() => handleInputChange('section_equipements.piano_type', 'à queue')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Piano à queue</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="piano_type"
                            checked={formData.piano_type === 'numérique'}
                            onChange={() => handleInputChange('section_equipements.piano_type', 'numérique')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Piano numérique</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="piano_type"
                            checked={formData.piano_type === 'droit'}
                            onChange={() => handleInputChange('section_equipements.piano_type', 'droit')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Piano droit</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================
                    PMR - AFFICHAGE CONDITIONNEL
                    ============================================ */}
                {formData.accessible_mobilite_reduite === true && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-3 text-gray-800">♿ Accessibilité PMR</h3>

                    {/* Détails obligatoires */}
                    <div className="mb-4">
                      <label className="block font-medium mb-2">
                        Détails sur les équipements et aménagements d'accessibilité *
                      </label>
                      <textarea
                        className="w-full p-3 border rounded h-32"
                        placeholder="Veuillez fournir des informations détaillées sur les équipements et aménagements d'accessibilité du logement (rampes, largeur des portes, salle de bain adaptée, etc.)"
                        value={formData.pmr_details || ""}
                        onChange={(e) => handleInputChange('section_equipements.pmr_details', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* SECTION Configuration Wi-Fi (EXISTANT - NE PAS TOUCHER) */}
                <div className="mt-6 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-blue-800">📶 Configuration Wi-Fi</h3>

                  <div className="mb-4">
                    <label className="block font-semibold mb-3">Statut du WiFi</label>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="wifi_statut"
                          value="non"
                          checked={formData.wifi_statut === 'non'}
                          onChange={(e) => handleWifiStatutChange('section_equipements.wifi_statut', e.target.value)}
                          className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-red-600 font-medium">Non (pas de WiFi disponible) ❌</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="wifi_statut"
                          value="en_cours"
                          checked={formData.wifi_statut === 'en_cours'}
                          onChange={(e) => handleWifiStatutChange('section_equipements.wifi_statut', e.target.value)}
                          className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span>En cours d'installation</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="wifi_statut"
                          value="oui"
                          checked={formData.wifi_statut === 'oui'}
                          onChange={(e) => handleWifiStatutChange('section_equipements.wifi_statut', e.target.value)}
                          className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span>Oui (WiFi disponible et fonctionnel)</span>
                      </label>
                    </div>
                  </div>

                  {/* Champ conditionnel pour "En cours" */}
                  {formData.wifi_statut === 'en_cours' && (
                    <div className="mt-4">
                      <label className="block font-semibold mb-2">Détails sur l'installation</label>
                      <textarea
                        className="w-full p-3 border rounded h-24"
                        placeholder="Décrivez la date d'installation du Wi-Fi, comment et par qui..."
                        value={formData.wifi_details || ""}
                        onChange={(e) => handleInputChange('section_equipements.wifi_details', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Champs conditionnels pour WiFi disponible */}
                  {formData.wifi_statut === 'oui' && (
                    <div className="mt-4 space-y-4 border-l-4 border-green-500 pl-4">
                      <div>
                        <label className="block font-semibold mb-2">Nom du réseau WiFi *</label>
                        <input
                          type="text"
                          className="w-full p-3 border rounded"
                          placeholder="SSID du réseau WiFi"
                          value={formData.wifi_nom_reseau || ""}
                          onChange={(e) => handleInputChange('section_equipements.wifi_nom_reseau', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-2">Mot de passe WiFi *</label>
                        <input
                          type="text"
                          className="w-full p-3 border rounded"
                          placeholder="Mot de passe du réseau"
                          value={formData.wifi_mot_de_passe || ""}
                          onChange={(e) => handleInputChange('section_equipements.wifi_mot_de_passe', e.target.value)}
                        />
                      </div>
                      <div>
                        <PhotoUpload
                          fieldPath="section_equipements.wifi_routeur_photo"
                          label="Photo du routeur ou des instructions WiFi"
                          multiple={true}
                          maxFiles={5}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ============================================
    SECTION ÉQUIPEMENT MÉNAGE - TOUJOURS VISIBLE
    ============================================ */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-4 text-gray-800">🧹 Équipement ménage</h2>

                  <div className="space-y-6 p-4 border border-gray-200 rounded-lg bg-gray-50">

                    {/* 1. ASPIRATEUR */}
                    <div className="pb-4 border-b border-gray-300">
                      <h3 className="font-semibold mb-3 text-gray-700">Aspirateur</h3>

                      {/* Types - Sélection multiple */}
                      <div className="mb-4">
                        <label className="block font-medium mb-2">Type(s) d'aspirateur (sélection multiple)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            'Avec fil',
                            'Sans fil',
                            'Aspirateur balais',
                            'Aspirateur classique',
                            'Aspirateur de chantier'
                          ].map((type) => (
                            <label key={type} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={(formData.menage_aspirateur_types || []).includes(type)}
                                onChange={(e) => {
                                  const currentTypes = formData.menage_aspirateur_types || []
                                  const newTypes = e.target.checked
                                    ? [...currentTypes, type]
                                    : currentTypes.filter(t => t !== type)
                                  handleInputChange('section_equipements.menage_aspirateur_types', newTypes)
                                }}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Photos */}
                      <PhotoUpload
                        fieldPath="section_equipements.menage_aspirateur_photos"
                        label="Photos de l'aspirateur"
                        multiple={true}
                        maxFiles={5}
                      />
                    </div>

                    {/* 2. SERPILLÈRE ET SEAU */}
                    <div className="pb-4 border-b border-gray-300">
                      <h3 className="font-semibold mb-3 text-gray-700">Serpillère et Seau</h3>

                      {/* Types - Sélection multiple */}
                      <div className="mb-4">
                        <label className="block font-medium mb-2">Type(s) de serpillère (sélection multiple)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            'Serpillère espagnole (frange)',
                            'Serpillère torchon',
                            'Serpillière MOP plate (microfibres)'
                          ].map((type) => (
                            <label key={type} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={(formData.menage_serpillere_types || []).includes(type)}
                                onChange={(e) => {
                                  const currentTypes = formData.menage_serpillere_types || []
                                  const newTypes = e.target.checked
                                    ? [...currentTypes, type]
                                    : currentTypes.filter(t => t !== type)
                                  handleInputChange('section_equipements.menage_serpillere_types', newTypes)
                                }}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Photos */}
                      <PhotoUpload
                        fieldPath="section_equipements.menage_serpillere_photos"
                        label="Photos de la serpillère et du seau"
                        multiple={true}
                        maxFiles={5}
                      />
                    </div>

                    {/* 3. BALAIS */}
                    <div className="pb-4 border-b border-gray-300">
                      <h3 className="font-semibold mb-3 text-gray-700">Balais</h3>

                      <PhotoUpload
                        fieldPath="section_equipements.menage_balais_photos"
                        label="Photos du balais"
                        multiple={true}
                        maxFiles={5}
                      />
                    </div>

                    {/* 4. BALAYETTE */}
                    <div className="pb-4 border-b border-gray-300">
                      <h3 className="font-semibold mb-3 text-gray-700">Balayette</h3>

                      <PhotoUpload
                        fieldPath="section_equipements.menage_balayette_photos"
                        label="Photos de la balayette"
                        multiple={true}
                        maxFiles={5}
                      />
                    </div>

                    {/* 5. AUTRES ÉLÉMENTS */}
                    <div>
                      <h3 className="font-semibold mb-3 text-gray-700">Autres éléments de nettoyage</h3>

                      {/* Texte libre */}
                      <div className="mb-4">
                        <label className="block font-medium mb-2">Description</label>
                        <textarea
                          className="w-full p-3 border rounded h-24"
                          placeholder="Décrivez les autres éléments de nettoyage..."
                          value={formData.menage_autres_elements || ""}
                          onChange={(e) => handleInputChange('section_equipements.menage_autres_elements', e.target.value)}
                        />
                      </div>

                      {/* Photos */}
                      <PhotoUpload
                        fieldPath="section_equipements.menage_autres_elements_photos"
                        label="Photos des autres éléments"
                        multiple={true}
                        maxFiles={10}
                      />
                    </div>

                  </div>
                </div>

                {/* SECTION PARKING (EXISTANT - NE PAS TOUCHER) */}
                <div className="mb-4">
                  <label className="block font-semibold mb-3">Parking *</label>
                  <div className="space-y-1 max-w-lg">
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="parking_type"
                        checked={formData.parking_type === 'rue'}
                        onChange={() => handleParkingTypeChange('section_equipements.parking_type', 'rue')}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm">Parking gratuit dans la rue</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="parking_type"
                        checked={formData.parking_type === 'sur_place'}
                        onChange={() => handleParkingTypeChange('section_equipements.parking_type', 'sur_place')}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm">Parking gratuit sur place</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="parking_type"
                        checked={formData.parking_type === 'payant'}
                        onChange={() => handleParkingTypeChange('section_equipements.parking_type', 'payant')}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm">Stationnement payant à l'extérieur de la propriété</span>
                    </label>
                  </div>
                </div>

                {/* Champs conditionnels parking (EXISTANT - NE PAS TOUCHER) */}
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