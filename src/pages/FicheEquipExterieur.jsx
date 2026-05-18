// src/pages/FicheEquipExterieur.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'


// Cartes de schéma - définir quels champs nettoyer par branche
const BRANCH_SCHEMAS = {
  exterieur: [
    'exterieur_type_espace', 'exterieur_description_generale', 'exterieur_entretien_prestataire',
    'exterieur_entretien_frequence', 'exterieur_entretien_type_prestation', 'exterieur_entretien_qui',
    'exterieur_equipements', 'exterieur_equipements_autre_details', 'exterieur_nombre_chaises_longues',
    'exterieur_nombre_parasols', 'exterieur_acces', 'exterieur_type_acces', 'exterieur_type_acces_autre_details',
    'barbecue_instructions', 'barbecue_type', 'barbecue_combustible_fourni', 'barbecue_ustensiles_fournis'
  ],
  piscine: [
    'piscine_type', 'piscine_acces', 'piscine_dimensions', 'piscine_disponibilite',
    'piscine_periode_disponibilite', 'piscine_heures', 'piscine_horaires_ouverture',
    'piscine_caracteristiques', 'piscine_periode_chauffage', 'piscine_entretien_prestataire',
    'piscine_entretien_frequence', 'piscine_entretien_type_prestation', 'piscine_entretien_qui',
    'piscine_regles_utilisation'
  ],
  jacuzzi: [
    'jacuzzi_acces', 'jacuzzi_entretien_prestataire', 'jacuzzi_entretien_frequence',
    'jacuzzi_entretien_type_prestation', 'jacuzzi_entretien_qui', 'jacuzzi_taille',
    'jacuzzi_heures_utilisation', 'jacuzzi_instructions'
  ],
  cuisine_ext: [
    'cuisine_ext_entretien_prestataire', 'cuisine_ext_entretien_frequence',
    'cuisine_ext_entretien_type_prestation', 'cuisine_ext_entretien_qui',
    'cuisine_ext_superficie', 'cuisine_ext_type', 'cuisine_ext_caracteristiques'
  ],
  sauna: [
    'sauna_acces',
    'sauna_entretien_prestataire',
    'sauna_instructions',
    'sauna_photos'
  ],
  hammam: [
    'hammam_acces',
    'hammam_entretien_prestataire',
    'hammam_instructions',
    'hammam_photos'
  ],
  salle_cinema: [
    'salle_cinema_instructions',
    'salle_cinema_photos'
  ],
  salle_sport: [
    'salle_sport_instructions',
    'salle_sport_photos'
  ],
  salle_jeux: [
    'salle_jeux_equipements',
    'salle_jeux_billard_instructions',
    'salle_jeux_baby_foot_instructions',
    'salle_jeux_ping_pong_instructions',
    'salle_jeux_photos'
  ]
}

// 🔧 COMPOSANT ENTRETIEN PATTERN
// Composant réutilisable pour pattern entretien
const EntretienPattern = ({ prefix, label, formData, getField, handleInputChange, handleRadioChange }) => {
  const entretienField = `${prefix}_entretien_prestataire`
  const entretienValue = formData[entretienField.split('.').pop()]

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-semibold mb-3">
          Le prestataire doit-il gérer l'entretien {label} ?
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={entretienValue === true}
              onChange={() => handleRadioChange(entretienField, 'true')}
              className="w-4 h-4"
            />
            <span>Oui</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={entretienValue === false}
              onChange={() => handleRadioChange(entretienField, 'false')}
              className="w-4 h-4"
            />
            <span>Non</span>
          </label>
        </div>
      </div>

      {entretienValue === true && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
          <div>
            <label className="block font-semibold mb-1">Fréquence d'entretien</label>
            <input
              type="text"
              placeholder="Ex : 2 fois par semaine (lundi / vendredi)"
              className="w-full p-2 border rounded"
              value={getField(`${prefix}_entretien_frequence`)}
              onChange={(e) => handleInputChange(`${prefix}_entretien_frequence`, e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Type de prestation</label>
            <textarea
              placeholder="Ex : ajout des produits d'entretien"
              className="w-full p-2 border rounded h-20"
              value={getField(`${prefix}_entretien_type_prestation`)}
              onChange={(e) => handleInputChange(`${prefix}_entretien_type_prestation`, e.target.value)}
            />
          </div>
        </div>
      )}

      {entretienValue === false && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="block font-semibold mb-1">Qui s'occupe de l'entretien ?</label>
          <textarea
            placeholder="Ex : Une entreprise spécialisée..."
            className="w-full p-2 border rounded h-20"
            value={getField(`${prefix}_entretien_qui`)}
            onChange={(e) => handleInputChange(`${prefix}_entretien_qui`, e.target.value)}
          />
        </div>
      )}
    </div>
  )
}

export default function FicheEquipExterieur() {
  const { next, back, currentStep, getField, updateField, handleSave, saveStatus } = useForm()

  // PATTERN IMPORTANT : Récupérer formData pour les booléens
  const formData = getField('section_equip_spe_exterieur')

  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  const handleRadioChange = (field, value) => {
    const boolValue = value === 'true' ? true : (value === 'false' ? false : null)

    // Si on passe à false sur une question racine, nettoyer la branche
    if (boolValue === false) {
      const currentData = getField('section_equip_spe_exterieur')
      const newData = { ...currentData }

      // Déterminer quelle branche nettoyer
      let branchToClean = null
      if (field.includes('dispose_exterieur')) branchToClean = 'exterieur'
      else if (field.includes('dispose_piscine')) branchToClean = 'piscine'
      else if (field.includes('dispose_jacuzzi')) branchToClean = 'jacuzzi'
      else if (field.includes('dispose_cuisine_exterieure')) branchToClean = 'cuisine_ext'
      else if (field.includes('dispose_sauna')) branchToClean = 'sauna'
      else if (field.includes('dispose_hammam')) branchToClean = 'hammam'
      else if (field.includes('dispose_salle_cinema')) branchToClean = 'salle_cinema'
      else if (field.includes('dispose_salle_sport')) branchToClean = 'salle_sport'
      else if (field.includes('dispose_salle_jeux')) branchToClean = 'salle_jeux'

      if (branchToClean) {
        // Nettoyer les champs de la branche
        BRANCH_SCHEMAS[branchToClean].forEach(key => {
          if (Array.isArray(newData[key])) {
            newData[key] = []
          } else if (typeof newData[key] === 'object' && newData[key] !== null) {
            newData[key] = {}
          } else {
            newData[key] = null
          }
        })
      }

      // Remettre explicitement le flag racine à false
      const fieldKey = field.split('.').pop()
      newData[fieldKey] = false

      // Une seule mise à jour atomique
      updateField('section_equip_spe_exterieur', newData)
    } else {
      // Comportement normal pour les autres cas
      updateField(field, boolValue)
    }
  }

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

  const handleNumberChange = (field, value) => {
    updateField(field, value === '' ? null : parseInt(value))
  }



  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Équipements spécifiques et extérieurs</h1>

          <div className="bg-white p-6 rounded-lg shadow space-y-8">

            {/* CHAMPS RACINES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <label className="block font-semibold mb-3">
                  Le logement dispose-t-il d'un extérieur ? *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_exterieur === true}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_exterieur', 'true')}
                      className="w-4 h-4"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_exterieur === false}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_exterieur', 'false')}
                      className="w-4 h-4"
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-3">
                  Le logement propose-t-il une piscine ?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_piscine === true}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_piscine', 'true')}
                      className="w-4 h-4"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_piscine === false}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_piscine', 'false')}
                      className="w-4 h-4"
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-3">
                  Le logement propose-t-il un jacuzzi ?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_jacuzzi === true}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_jacuzzi', 'true')}
                      className="w-4 h-4"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_jacuzzi === false}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_jacuzzi', 'false')}
                      className="w-4 h-4"
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-3">
                  Le logement propose-t-il une cuisine extérieure ?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_cuisine_exterieure === true}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_cuisine_exterieure', 'true')}
                      className="w-4 h-4"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_cuisine_exterieure === false}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_cuisine_exterieure', 'false')}
                      className="w-4 h-4"
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-3">
                  Le logement dispose-t-il d'un sauna ? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_sauna === true}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_sauna', 'true')}
                      className="w-4 h-4"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_sauna === false}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_sauna', 'false')}
                      className="w-4 h-4"
                    />
                    <span>Non</span>
                  </label>
                </div>

              </div>

              <div>
                <label className="block font-semibold mb-3">
                  Le logement dispose-t-il d'un hammam ? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_hammam === true}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_hammam', 'true')}
                      className="w-4 h-4"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_hammam === false}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_hammam', 'false')}
                      className="w-4 h-4"
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-3">
                  Le logement dispose-t-il d'une salle de cinéma ? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_salle_cinema === true}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_salle_cinema', 'true')}
                      className="w-4 h-4"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_salle_cinema === false}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_salle_cinema', 'false')}
                      className="w-4 h-4"
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-3">
                  Le logement dispose-t-il d'une salle de sport ? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_salle_sport === true}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_salle_sport', 'true')}
                      className="w-4 h-4"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_salle_sport === false}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_salle_sport', 'false')}
                      className="w-4 h-4"
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-3">
                  Le logement dispose-t-il d'une salle de jeux ? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_salle_jeux === true}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_salle_jeux', 'true')}
                      className="w-4 h-4"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.dispose_salle_jeux === false}
                      onChange={() => handleRadioChange('section_equip_spe_exterieur.dispose_salle_jeux', 'false')}
                      className="w-4 h-4"
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>

            </div>

            {/* BRANCHE EXTÉRIEUR */}
            {formData.dispose_exterieur === true && (
              <div className="border-l-4 border-green-500 pl-6 space-y-6">
                <h2 className="text-xl font-semibold text-green-700">🌿 Espace extérieur</h2>
                <div>
                  <label className="block font-semibold mb-3">
                    Quel type d'espace extérieur est disponible ?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {['Balcon', 'Terrasse', 'Jardin', 'Patio', 'Aucun'].map(option => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.exterieur_type_espace || []).includes(option)}
                          onChange={(e) => handleArrayCheckboxChange('section_equip_spe_exterieur.exterieur_type_espace', option, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Description générale du ou des espace(s) extérieur(s)
                  </label>
                  <textarea
                    placeholder="Décrivez l'espace extérieur, son agencement, sa décoration, les équipements présents (par ex: table, chaises, barbecue) et l'ambiance (vue, orientation, etc.)"
                    className="w-full p-3 border rounded h-24"
                    value={getField('section_equip_spe_exterieur.exterieur_description_generale')}
                    onChange={(e) => handleInputChange('section_equip_spe_exterieur.exterieur_description_generale', e.target.value)}
                  />
                </div>

                <EntretienPattern
                  prefix="section_equip_spe_exterieur.exterieur"
                  label="de l'extérieur"
                  formData={formData}
                  getField={getField}
                  handleInputChange={handleInputChange}
                  handleRadioChange={handleRadioChange}
                />

                <div>
                  <label className="block font-semibold mb-3">
                    Équipements disponibles dans l'espace extérieur :
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      'Table extérieure', 'Chaises', 'Chaises longues', 'Barbecue', 'Parasol',
                      'Produits pour la plage', 'Brasero', 'Hamac', 'Jeux pour enfants',
                      'Éclairage extérieur', 'Brise-vue', 'Clôture', 'Douche extérieure',
                      'Moustiquaire', 'Store banne électrique', 'Store banne manuel', 'Autre'
                    ].map(option => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.exterieur_equipements || []).includes(option)}
                          onChange={(e) => handleArrayCheckboxChange('section_equip_spe_exterieur.exterieur_equipements', option, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>

                  {(formData.exterieur_equipements || []).includes('Autre') && (
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Veuillez saisir une autre option ici"
                        className="w-full p-2 border rounded"
                        value={getField('section_equip_spe_exterieur.exterieur_equipements_autre_details')}
                        onChange={(e) => handleInputChange('section_equip_spe_exterieur.exterieur_equipements_autre_details', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(formData.exterieur_equipements || []).includes('Chaises longues') && (
                    <div>
                      <label className="block font-semibold mb-1">Chaises longues - Nombre</label>
                      <input
                        type="number"
                        placeholder="par ex. 23"
                        className="w-full p-2 border rounded"
                        value={formData.exterieur_nombre_chaises_longues || ''}
                        onChange={(e) => handleNumberChange('section_equip_spe_exterieur.exterieur_nombre_chaises_longues', e.target.value)}
                      />
                    </div>
                  )}

                  {(formData.exterieur_equipements || []).includes('Parasol') && (
                    <div>
                      <label className="block font-semibold mb-1">Parasols - Nombre</label>
                      <input
                        type="number"
                        placeholder="par ex. 23"
                        className="w-full p-2 border rounded"
                        value={formData.exterieur_nombre_parasols || ''}
                        onChange={(e) => handleNumberChange('section_equip_spe_exterieur.exterieur_nombre_parasols', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <PhotoUpload
                    fieldPath="section_equip_spe_exterieur.exterieur_photos"
                    label="Photos de l'extérieur"
                    multiple={true}
                    maxFiles={12}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Accès à l'espace extérieur :
                  </label>
                  <textarea
                    placeholder="Expliquez comment accéder à l'espace extérieur (par ex: directement depuis le salon ou via un escalier extérieur)"
                    className="w-full p-3 border rounded h-20"
                    value={getField('section_equip_spe_exterieur.exterieur_acces')}
                    onChange={(e) => handleInputChange('section_equip_spe_exterieur.exterieur_acces', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-3">
                    Est-ce que l'espace extérieur est privé ou partagé ?
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      'Privé',
                      'Partagé avec d\'autres logements',
                      'Partagé avec le voisinage',
                      'Autre'
                    ].map(option => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.exterieur_type_acces === option}
                          onChange={() => handleInputChange('section_equip_spe_exterieur.exterieur_type_acces', option)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>

                  {formData.exterieur_type_acces === 'Autre' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Veuillez saisir une autre option ici"
                        className="w-full p-2 border rounded"
                        value={getField('section_equip_spe_exterieur.exterieur_type_acces_autre_details')}
                        onChange={(e) => handleInputChange('section_equip_spe_exterieur.exterieur_type_acces_autre_details', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* SOUS-BRANCHE BARBECUE */}
                {(formData.exterieur_equipements || []).includes('Barbecue') && (
                  <div className="border-l-4 border-orange-500 pl-6 space-y-4">
                    <h3 className="text-lg font-semibold text-orange-700">🔥 Section Barbecue</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-1">Instructions d'utilisation</label>
                        <textarea
                          placeholder="Fournissez des informations sur l'utilisation du barbecue"
                          className="w-full p-2 border rounded h-20"
                          value={getField('section_equip_spe_exterieur.barbecue_instructions')}
                          onChange={(e) => handleInputChange('section_equip_spe_exterieur.barbecue_instructions', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">Type de barbecue</label>
                        <input
                          type="text"
                          placeholder="Indiquez le type de barbecue (charbon, gaz, électrique)"
                          className="w-full p-2 border rounded"
                          value={getField('section_equip_spe_exterieur.barbecue_type')}
                          onChange={(e) => handleInputChange('section_equip_spe_exterieur.barbecue_type', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-3">Le combustible est-il fourni ?</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={formData.barbecue_combustible_fourni === true}
                              onChange={() => handleRadioChange('section_equip_spe_exterieur.barbecue_combustible_fourni', 'true')}
                              className="w-4 h-4"
                            />
                            <span>Oui</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={formData.barbecue_combustible_fourni === false}
                              onChange={() => handleRadioChange('section_equip_spe_exterieur.barbecue_combustible_fourni', 'false')}
                              className="w-4 h-4"
                            />
                            <span>Non</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold mb-3">Les ustensiles sont-ils fournis ?</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={formData.barbecue_ustensiles_fournis === true}
                              onChange={() => handleRadioChange('section_equip_spe_exterieur.barbecue_ustensiles_fournis', 'true')}
                              className="w-4 h-4"
                            />
                            <span>Oui</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={formData.barbecue_ustensiles_fournis === false}
                              onChange={() => handleRadioChange('section_equip_spe_exterieur.barbecue_ustensiles_fournis', 'false')}
                              className="w-4 h-4"
                            />
                            <span>Non</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <PhotoUpload
                        fieldPath="section_equip_spe_exterieur.barbecue_photos"
                        label="Photos du barbecue et des ustensiles"
                        multiple={true}
                        maxFiles={10}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BRANCHE PISCINE */}
            {formData.dispose_piscine === true && (
              <div className="border-l-4 border-blue-500 pl-6 space-y-6">
                <h2 className="text-xl font-semibold text-blue-700">🏊‍♂️ Piscine</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-3">Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.piscine_type === 'Privée'}
                          onChange={() => handleInputChange('section_equip_spe_exterieur.piscine_type', 'Privée')}
                          className="w-4 h-4"
                        />
                        <span>Privée</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.piscine_type === 'Publique ou partagée'}
                          onChange={() => handleInputChange('section_equip_spe_exterieur.piscine_type', 'Publique ou partagée')}
                          className="w-4 h-4"
                        />
                        <span>Publique ou partagée</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-3">Accès</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.piscine_acces === 'Intérieur'}
                          onChange={() => handleInputChange('section_equip_spe_exterieur.piscine_acces', 'Intérieur')}
                          className="w-4 h-4"
                        />
                        <span>Intérieur</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.piscine_acces === 'Extérieur'}
                          onChange={() => handleInputChange('section_equip_spe_exterieur.piscine_acces', 'Extérieur')}
                          className="w-4 h-4"
                        />
                        <span>Extérieur</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Dimensions</label>
                  <input
                    type="text"
                    placeholder="ex : 5m sur 2m"
                    className="w-full p-2 border rounded"
                    value={getField('section_equip_spe_exterieur.piscine_dimensions')}
                    onChange={(e) => handleInputChange('section_equip_spe_exterieur.piscine_dimensions', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-3">Disponibilité</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.piscine_disponibilite === 'Disponible toute l\'année'}
                        onChange={() => handleInputChange('section_equip_spe_exterieur.piscine_disponibilite', 'Disponible toute l\'année')}
                        className="w-4 h-4"
                      />
                      <span>Disponible toute l'année</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.piscine_disponibilite === 'Disponible à certaines périodes'}
                        onChange={() => handleInputChange('section_equip_spe_exterieur.piscine_disponibilite', 'Disponible à certaines périodes')}
                        className="w-4 h-4"
                      />
                      <span>Disponible à certaines périodes</span>
                    </label>
                  </div>

                  {formData.piscine_disponibilite === 'Disponible à certaines périodes' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Indiquez les périodes de disponibilité de la piscine"
                        className="w-full p-2 border rounded"
                        value={getField('section_equip_spe_exterieur.piscine_periode_disponibilite')}
                        onChange={(e) => handleInputChange('section_equip_spe_exterieur.piscine_periode_disponibilite', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold mb-3">Heures d'utilisation</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.piscine_heures === 'Ouverture 24h/24'}
                        onChange={() => handleInputChange('section_equip_spe_exterieur.piscine_heures', 'Ouverture 24h/24')}
                        className="w-4 h-4"
                      />
                      <span>Ouverture 24h/24</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.piscine_heures === 'Heures d\'ouverture spécifiques'}
                        onChange={() => handleInputChange('section_equip_spe_exterieur.piscine_heures', 'Heures d\'ouverture spécifiques')}
                        className="w-4 h-4"
                      />
                      <span>Heures d'ouverture spécifiques</span>
                    </label>
                  </div>

                  {formData.piscine_heures === 'Heures d\'ouverture spécifiques' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Indiquez les horaires d'ouverture de la piscine"
                        className="w-full p-2 border rounded"
                        value={getField('section_equip_spe_exterieur.piscine_horaires_ouverture')}
                        onChange={(e) => handleInputChange('section_equip_spe_exterieur.piscine_horaires_ouverture', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold mb-3">
                    Caractéristiques de la piscine
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      'Chauffée', 'À débordement', 'Couloir de nage', 'Taille olympique',
                      'Toit-terrasse', 'Eau salée', 'Bâche de piscine', 'Jouets de piscine',
                      'Toboggan aquatique'
                    ].map(option => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.piscine_caracteristiques || []).includes(option)}
                          onChange={(e) => handleArrayCheckboxChange('section_equip_spe_exterieur.piscine_caracteristiques', option, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>

                  {(formData.piscine_caracteristiques || []).includes('Chauffée') && (
                    <div className="mt-3">
                      <label className="block font-semibold mb-1">Période de chauffage de la piscine</label>
                      <input
                        type="text"
                        placeholder="ex : Septembre - Juin"
                        className="w-full p-2 border rounded"
                        value={getField('section_equip_spe_exterieur.piscine_periode_chauffage')}
                        onChange={(e) => handleInputChange('section_equip_spe_exterieur.piscine_periode_chauffage', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <EntretienPattern
                  prefix="section_equip_spe_exterieur.piscine"
                  label="de la piscine"
                  formData={formData}
                  getField={getField}
                  handleInputChange={handleInputChange}
                  handleRadioChange={handleRadioChange}
                />

                <div>
                  <label className="block font-semibold mb-1">Règles d'utilisation</label>
                  <textarea
                    placeholder="Indiquez les règles d'utilisation ou consignes particulières pour l'utilisation de la piscine."
                    className="w-full p-3 border rounded h-24"
                    value={getField('section_equip_spe_exterieur.piscine_regles_utilisation')}
                    onChange={(e) => handleInputChange('section_equip_spe_exterieur.piscine_regles_utilisation', e.target.value)}
                  />
                </div>

                <div>
                  <PhotoUpload
                    fieldPath="section_equip_spe_exterieur.piscine_video"
                    label="Vidéo de la piscine"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>
              </div>
            )}

            {/* BRANCHE JACUZZI */}
            {formData.dispose_jacuzzi === true && (
              <div className="border-l-4 border-purple-500 pl-6 space-y-6">
                <h2 className="text-xl font-semibold text-purple-700">💦 Jacuzzi</h2>

                <div>
                  <label className="block font-semibold mb-3">Accès</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.jacuzzi_acces === 'Intérieur'}
                        onChange={() => handleInputChange('section_equip_spe_exterieur.jacuzzi_acces', 'Intérieur')}
                        className="w-4 h-4"
                      />
                      <span>Intérieur</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.jacuzzi_acces === 'Extérieur'}
                        onChange={() => handleInputChange('section_equip_spe_exterieur.jacuzzi_acces', 'Extérieur')}
                        className="w-4 h-4"
                      />
                      <span>Extérieur</span>
                    </label>
                  </div>
                </div>

                <EntretienPattern
                  prefix="section_equip_spe_exterieur.jacuzzi"
                  label="du jacuzzi"
                  formData={formData}
                  getField={getField}
                  handleInputChange={handleInputChange}
                  handleRadioChange={handleRadioChange}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1">Taille</label>
                    <input
                      type="text"
                      placeholder="Indiquez les dimensions du jacuzzi"
                      className="w-full p-2 border rounded"
                      value={getField('section_equip_spe_exterieur.jacuzzi_taille')}
                      onChange={(e) => handleInputChange('section_equip_spe_exterieur.jacuzzi_taille', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Heures d'utilisation</label>
                    <input
                      type="text"
                      placeholder="Ex : Disponible 24h/24 ou heures précises"
                      className="w-full p-2 border rounded"
                      value={getField('section_equip_spe_exterieur.jacuzzi_heures_utilisation')}
                      onChange={(e) => handleInputChange('section_equip_spe_exterieur.jacuzzi_heures_utilisation', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Instructions d'utilisation</label>
                  <textarea
                    className="w-full p-3 border rounded h-20"
                    value={getField('section_equip_spe_exterieur.jacuzzi_instructions')}
                    onChange={(e) => handleInputChange('section_equip_spe_exterieur.jacuzzi_instructions', e.target.value)}
                  />
                </div>

                <div>
                  <PhotoUpload
                    fieldPath="section_equip_spe_exterieur.jacuzzi_photos"
                    label="Photos du Jacuzzi"
                    multiple={true}
                    maxFiles={10}
                  />
                </div>
              </div>
            )}

            {/* BRANCHE CUISINE EXTÉRIEURE */}
            {formData.dispose_cuisine_exterieure === true && (
              <div className="border-l-4 border-yellow-500 pl-6 space-y-6">
                <h2 className="text-xl font-semibold text-yellow-700">🍳 Cuisine extérieure</h2>

                <EntretienPattern
                  prefix="section_equip_spe_exterieur.cuisine_ext"
                  label="de la cuisine extérieure"
                  formData={formData}
                  getField={getField}
                  handleInputChange={handleInputChange}
                  handleRadioChange={handleRadioChange}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1">Superficie</label>
                    <input
                      type="text"
                      placeholder="Indiquez la taille de la cuisine extérieure"
                      className="w-full p-2 border rounded"
                      value={getField('section_equip_spe_exterieur.cuisine_ext_superficie')}
                      onChange={(e) => handleInputChange('section_equip_spe_exterieur.cuisine_ext_superficie', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-3">Type de cuisine extérieure</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.cuisine_ext_type === 'Privée'}
                          onChange={() => handleInputChange('section_equip_spe_exterieur.cuisine_ext_type', 'Privée')}
                          className="w-4 h-4"
                        />
                        <span>Privée</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.cuisine_ext_type === 'Publique ou partagée'}
                          onChange={() => handleInputChange('section_equip_spe_exterieur.cuisine_ext_type', 'Publique ou partagée')}
                          className="w-4 h-4"
                        />
                        <span>Publique ou partagée</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-3">Caractéristiques</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Four', 'Évier'].map(option => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.cuisine_ext_caracteristiques || []).includes(option)}
                          onChange={(e) => handleArrayCheckboxChange('section_equip_spe_exterieur.cuisine_ext_caracteristiques', option, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BRANCHE SAUNA */}
            {formData.dispose_sauna === true && (
              <div className="border-l-4 border-purple-500 pl-6 space-y-6">
                <h2 className="text-xl font-semibold text-purple-700">🧖 Sauna</h2>

                <div>
                  <label className="block font-semibold mb-3">
                    Accès <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.sauna_acces === 'Intérieur'}
                        onChange={() => handleInputChange('section_equip_spe_exterieur.sauna_acces', 'Intérieur')}
                        className="w-4 h-4"
                      />
                      <span>Intérieur</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.sauna_acces === 'Extérieur'}
                        onChange={() => handleInputChange('section_equip_spe_exterieur.sauna_acces', 'Extérieur')}
                        className="w-4 h-4"
                      />
                      <span>Extérieur</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-3">
                    Le prestataire doit-il gérer l'entretien du sauna ?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.sauna_entretien_prestataire === true}
                        onChange={() => handleRadioChange('section_equip_spe_exterieur.sauna_entretien_prestataire', 'true')}
                        className="w-4 h-4"
                      />
                      <span>Oui</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.sauna_entretien_prestataire === false}
                        onChange={() => handleRadioChange('section_equip_spe_exterieur.sauna_entretien_prestataire', 'false')}
                        className="w-4 h-4"
                      />
                      <span>Non</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Décrivez les instructions pour utiliser le sauna en toute sécurité"
                    className="w-full p-3 border rounded h-24"
                    value={getField('section_equip_spe_exterieur.sauna_instructions')}
                    onChange={(e) => handleInputChange('section_equip_spe_exterieur.sauna_instructions', e.target.value)}
                  />
                </div>
                <div>
                  <PhotoUpload
                    fieldPath="section_equip_spe_exterieur.sauna_photos"
                    label="Photos du sauna"
                    multiple={true}
                    maxFiles={10}
                  />
                </div>
              </div>
            )}

            {/* BRANCHE HAMMAM */}
            {formData.dispose_hammam === true && (
              <div className="border-l-4 border-indigo-500 pl-6 space-y-6">
                <h2 className="text-xl font-semibold text-indigo-700">💨 Hammam</h2>

                <div>
                  <label className="block font-semibold mb-3">
                    Accès <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.hammam_acces === 'Intérieur'}
                        onChange={() => handleInputChange('section_equip_spe_exterieur.hammam_acces', 'Intérieur')}
                        className="w-4 h-4"
                      />
                      <span>Intérieur</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.hammam_acces === 'Extérieur'}
                        onChange={() => handleInputChange('section_equip_spe_exterieur.hammam_acces', 'Extérieur')}
                        className="w-4 h-4"
                      />
                      <span>Extérieur</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-3">
                    Le prestataire doit-il gérer l'entretien du hammam ?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.hammam_entretien_prestataire === true}
                        onChange={() => handleRadioChange('section_equip_spe_exterieur.hammam_entretien_prestataire', 'true')}
                        className="w-4 h-4"
                      />
                      <span>Oui</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.hammam_entretien_prestataire === false}
                        onChange={() => handleRadioChange('section_equip_spe_exterieur.hammam_entretien_prestataire', 'false')}
                        className="w-4 h-4"
                      />
                      <span>Non</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Décrivez les instructions pour utiliser le hammam en toute sécurité"
                    className="w-full p-3 border rounded h-24"
                    value={getField('section_equip_spe_exterieur.hammam_instructions')}
                    onChange={(e) => handleInputChange('section_equip_spe_exterieur.hammam_instructions', e.target.value)}
                  />
                </div>
                <div>
                  <PhotoUpload
                    fieldPath="section_equip_spe_exterieur.hammam_photos"
                    label="Photos du hammam"
                    multiple={true}
                    maxFiles={10}
                  />
                </div>
              </div>
            )}

            {/* BRANCHE SALLE DE CINÉMA */}
            {formData.dispose_salle_cinema === true && (
              <div className="border-l-4 border-pink-500 pl-6 space-y-6">
                <h2 className="text-xl font-semibold text-pink-700">🎬 Salle de cinéma</h2>

                <div>
                  <label className="block font-semibold mb-1">
                    Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Décrivez les instructions pour utiliser la salle de cinéma (équipements, télécommandes, réglages, etc.)"
                    className="w-full p-3 border rounded h-24"
                    value={getField('section_equip_spe_exterieur.salle_cinema_instructions')}
                    onChange={(e) => handleInputChange('section_equip_spe_exterieur.salle_cinema_instructions', e.target.value)}
                  />
                </div>
                <div>
                  <PhotoUpload
                    fieldPath="section_equip_spe_exterieur.salle_cinema_photos"
                    label="Photos de la salle de cinéma"
                    multiple={true}
                    maxFiles={10}
                  />
                </div>
              </div>
            )}

            {/* BRANCHE SALLE DE SPORT */}
            {formData.dispose_salle_sport === true && (
              <div className="border-l-4 border-green-500 pl-6 space-y-6">
                <h2 className="text-xl font-semibold text-green-700">🏋️ Salle de sport</h2>

                <div>
                  <label className="block font-semibold mb-1">
                    Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Décrivez les instructions pour utiliser la salle de sport (équipements disponibles, consignes de sécurité, etc.)"
                    className="w-full p-3 border rounded h-24"
                    value={getField('section_equip_spe_exterieur.salle_sport_instructions')}
                    onChange={(e) => handleInputChange('section_equip_spe_exterieur.salle_sport_instructions', e.target.value)}
                  />
                </div>
                <div>
                  <PhotoUpload
                    fieldPath="section_equip_spe_exterieur.salle_sport_photos"
                    label="Photos de la salle de sport"
                    multiple={true}
                    maxFiles={10}
                  />
                </div>
              </div>
            )}

            {/* BRANCHE SALLE DE JEUX */}
            {formData.dispose_salle_jeux === true && (
              <div className="border-l-4 border-orange-500 pl-6 space-y-6">
                <h2 className="text-xl font-semibold text-orange-700">🎮 Salle de jeux</h2>

                <div>
                  <label className="block font-semibold mb-3">
                    Équipements disponibles :
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {['Billard', 'Baby Foot', 'Ping Pong'].map(option => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.salle_jeux_equipements || []).includes(option)}
                          onChange={(e) => handleArrayCheckboxChange('section_equip_spe_exterieur.salle_jeux_equipements', option, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {(formData.salle_jeux_equipements || []).includes('Billard') && (
                  <div>
                    <label className="block font-semibold mb-1">
                      Billard - Instructions d'utilisation
                    </label>
                    <textarea
                      placeholder="Décrivez les instructions pour utiliser le billard"
                      className="w-full p-3 border rounded h-24"
                      value={getField('section_equip_spe_exterieur.salle_jeux_billard_instructions')}
                      onChange={(e) => handleInputChange('section_equip_spe_exterieur.salle_jeux_billard_instructions', e.target.value)}
                    />
                  </div>
                )}

                {(formData.salle_jeux_equipements || []).includes('Baby Foot') && (
                  <div>
                    <label className="block font-semibold mb-1">
                      Baby Foot - Instructions d'utilisation
                    </label>
                    <textarea
                      placeholder="Décrivez les instructions pour utiliser le baby foot"
                      className="w-full p-3 border rounded h-24"
                      value={getField('section_equip_spe_exterieur.salle_jeux_baby_foot_instructions')}
                      onChange={(e) => handleInputChange('section_equip_spe_exterieur.salle_jeux_baby_foot_instructions', e.target.value)}
                    />
                  </div>
                )}

                {(formData.salle_jeux_equipements || []).includes('Ping Pong') && (
                  <div>
                    <label className="block font-semibold mb-1">
                      Ping Pong - Instructions d'utilisation
                    </label>
                    <textarea
                      placeholder="Décrivez les instructions pour utiliser la table de ping pong"
                      className="w-full p-3 border rounded h-24"
                      value={getField('section_equip_spe_exterieur.salle_jeux_ping_pong_instructions')}
                      onChange={(e) => handleInputChange('section_equip_spe_exterieur.salle_jeux_ping_pong_instructions', e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <PhotoUpload
                    fieldPath="section_equip_spe_exterieur.salle_jeux_photos"
                    label="Photos de la salle de jeux"
                    multiple={true}
                    maxFiles={10}
                  />
                </div>
              </div>
            )}

            {/* 🆕 ÉLÉMENTS ABÎMÉS GARAGE - À ajouter à la fin de la section */}
            <div className="bg-white rounded-xl p-6 shadow mb-6">
              <h2 className="text-base font-semibold mb-4">Éléments abîmés dans le garage</h2>

              <div className="mb-6">
                <label className="block font-semibold mb-3">
                  Photos de tous les éléments abîmés, cassés ou détériorés dans le garage
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Traces d'usures, tâches, joints colorés, joints décollés, meubles abîmés, tâches sur les tissus,
                  tâches sur les murs, trous, absence de cache prise, absence de lustre, rayures, etc.
                </p>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="garage_elements_abimes"
                      value="true"
                      checked={getField('section_equip_spe_exterieur.garage_elements_abimes') === true}
                      onChange={() => handleInputChange('section_equip_spe_exterieur.garage_elements_abimes', true)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Oui</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="garage_elements_abimes"
                      value="false"
                      checked={getField('section_equip_spe_exterieur.garage_elements_abimes') === false}
                      onChange={() => {
                        handleInputChange('section_equip_spe_exterieur.garage_elements_abimes', false)
                        handleInputChange('section_equip_spe_exterieur.garage_elements_abimes_photos', [])
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Non</span>
                  </label>
                </div>

                {/* Upload conditionnel avec fond bleu clair */}
                {getField('section_equip_spe_exterieur.garage_elements_abimes') === true && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <PhotoUpload
                      fieldPath="section_equip_spe_exterieur.garage_elements_abimes_photos"
                      label="Photos des éléments abîmés du garage"
                      multiple={true}
                      maxFiles={10}
                      capture={true}
                      acceptVideo={false}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 🆕 ÉLÉMENTS ABÎMÉS BUANDERIE - À ajouter à la fin de la section */}
            <div className="bg-white rounded-xl p-6 shadow mb-6">
              <h2 className="text-base font-semibold mb-4">Éléments abîmés dans la buanderie</h2>

              <div className="mb-6">
                <label className="block font-semibold mb-3">
                  Photos de tous les éléments abîmés, cassés ou détériorés dans la buanderie
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Traces d'usures, tâches, joints colorés, joints décollés, meubles abîmés, tâches sur les tissus,
                  tâches sur les murs, trous, absence de cache prise, absence de lustre, rayures, etc.
                </p>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="buanderie_elements_abimes"
                      value="true"
                      checked={getField('section_equip_spe_exterieur.buanderie_elements_abimes') === true}
                      onChange={() => handleInputChange('section_equip_spe_exterieur.buanderie_elements_abimes', true)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Oui</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="buanderie_elements_abimes"
                      value="false"
                      checked={getField('section_equip_spe_exterieur.buanderie_elements_abimes') === false}
                      onChange={() => {
                        handleInputChange('section_equip_spe_exterieur.buanderie_elements_abimes', false)
                        handleInputChange('section_equip_spe_exterieur.buanderie_elements_abimes_photos', [])
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Non</span>
                  </label>
                </div>

                {/* Upload conditionnel avec fond bleu clair */}
                {getField('section_equip_spe_exterieur.buanderie_elements_abimes') === true && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <PhotoUpload
                      fieldPath="section_equip_spe_exterieur.buanderie_elements_abimes_photos"
                      label="Photos des éléments abîmés de la buanderie"
                      multiple={true}
                      maxFiles={10}
                      capture={true}
                      acceptVideo={false}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 🆕 ÉLÉMENTS ABÎMÉS AUTRES PIÈCES - À ajouter à la fin de la section */}
            <div className="bg-white rounded-xl p-6 shadow mb-6">
              <h2 className="text-base font-semibold mb-4">Éléments abîmés dans autres pièces</h2>

              <div className="mb-6">
                <label className="block font-semibold mb-3">
                  Photos de tous les éléments abîmés, cassés ou détériorés dans autres pièces (palier, bureau, couloir, escalier etc)
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Traces d'usures, tâches, joints colorés, joints décollés, meubles abîmés, tâches sur les tissus,
                  tâches sur les murs, trous, absence de cache prise, absence de lustre, rayures, etc.
                </p>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="autres_pieces_elements_abimes"
                      value="true"
                      checked={getField('section_equip_spe_exterieur.autres_pieces_elements_abimes') === true}
                      onChange={() => handleInputChange('section_equip_spe_exterieur.autres_pieces_elements_abimes', true)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Oui</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="autres_pieces_elements_abimes"
                      value="false"
                      checked={getField('section_equip_spe_exterieur.autres_pieces_elements_abimes') === false}
                      onChange={() => {
                        handleInputChange('section_equip_spe_exterieur.autres_pieces_elements_abimes', false)
                        handleInputChange('section_equip_spe_exterieur.autres_pieces_elements_abimes_photos', [])
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Non</span>
                  </label>
                </div>

                {/* Upload conditionnel avec fond bleu clair */}
                {getField('section_equip_spe_exterieur.autres_pieces_elements_abimes') === true && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <PhotoUpload
                      fieldPath="section_equip_spe_exterieur.autres_pieces_elements_abimes_photos"
                      label="Photos des éléments abîmés des autres pièces"
                      multiple={true}
                      maxFiles={10}
                      capture={true}
                      acceptVideo={false}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 🆕 LOCAL À VÉLO */}
            <div className="bg-white rounded-xl p-6 shadow mb-6">
              <h2 className="text-base font-semibold mb-4">Local à vélo</h2>

              <div className="mb-6">
                <label className="block font-semibold mb-3">
                  Le logement propose-t-il un local à vélo ?
                </label>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dispose_local_velo"
                      value="true"
                      checked={getField('section_equip_spe_exterieur.dispose_local_velo') === true}
                      onChange={() => handleInputChange('section_equip_spe_exterieur.dispose_local_velo', true)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Oui</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dispose_local_velo"
                      value="false"
                      checked={getField('section_equip_spe_exterieur.dispose_local_velo') === false}
                      onChange={() => {
                        handleInputChange('section_equip_spe_exterieur.dispose_local_velo', false)
                        handleInputChange('section_equip_spe_exterieur.local_velo_photos', [])
                        handleInputChange('section_equip_spe_exterieur.local_velo_video_acces', [])
                        handleInputChange('section_equip_spe_exterieur.local_velo_type_acces', null)
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Non</span>
                  </label>
                </div>

                {/* Sous-bloc conditionnel avec fond bleu clair */}
                {getField('section_equip_spe_exterieur.dispose_local_velo') === true && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                    {/* Type d'accès au local à vélo */}
                    <div>
                      <label className="block font-semibold mb-3">Type d'accès au local à vélo</label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="local_velo_type_acces"
                            checked={getField('section_equip_spe_exterieur.local_velo_type_acces') === 'libre'}
                            onChange={() => handleInputChange('section_equip_spe_exterieur.local_velo_type_acces', 'libre')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Libre</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="local_velo_type_acces"
                            checked={getField('section_equip_spe_exterieur.local_velo_type_acces') === 'avec_cle'}
                            onChange={() => handleInputChange('section_equip_spe_exterieur.local_velo_type_acces', 'avec_cle')}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>Avec clé</span>
                        </label>
                      </div>
                    </div>

                    <PhotoUpload
                      fieldPath="section_equip_spe_exterieur.local_velo_photos"
                      label="Photos du local à vélo"
                      multiple={true}
                      maxFiles={10}
                      capture={true}
                      acceptVideo={false}
                    />

                    <PhotoUpload
                      fieldPath="section_equip_spe_exterieur.local_velo_video_acces"
                      label="Vidéo d'accès au local à vélo"
                      multiple={false}
                      maxFiles={1}
                      capture={true}
                      acceptVideo={true}
                    />
                  </div>
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
        <div className="h-20"></div>
      </div>
    </div>
  )
}