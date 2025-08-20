// src/pages/FicheCuisine2.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'


export default function FicheCuisine2() {
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
  const formData = getField('section_cuisine_2')

  // Handler pour champs simples
  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  // Handler pour compteurs numériques (+ et -)
  const handleCounterChange = (field, delta) => {
    const currentValue = parseInt(formData[field.split('.').pop()]) || 0
    const newValue = Math.max(0, currentValue + delta) // Pas de valeurs négatives
    updateField(field, newValue)
  }

  // Handler pour radio buttons
  const handleRadioChange = (field, value) => {
    if (value === 'true') updateField(field, true)
    else if (value === 'false') updateField(field, false)
    else updateField(field, value)
  }

  // Composant CounterInput réutilisable
  const CounterInput = ({ label, fieldPath, value }) => {
  
    // Handler pour empêcher le scroll mobile
    const handleCounterClick = (delta, event) => {
      // Empêcher le scroll automatique mobile
      event.preventDefault()
      event.stopPropagation()
      
      // Appeler la fonction de compteur existante
      handleCounterChange(fieldPath, delta)
      
      // Forcer la perte de focus pour éviter le keyboard
      event.target.blur()
    }
    
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
        <span className="text-sm flex-1">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => handleCounterClick(-1, e)}
            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-lg font-semibold"
            style={{ touchAction: 'manipulation' }} // CSS inline pour ce bouton uniquement
          >
            −
          </button>
          <span className="w-12 text-center font-semibold text-lg">
            {value || 0}
          </span>
          <button
            type="button"
            onClick={(e) => handleCounterClick(1, e)}
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-lg font-semibold"
            style={{ touchAction: 'manipulation' }} // CSS inline pour ce bouton uniquement
          >
            +
          </button>
        </div>
      </div>
    )
  }

  // Listes des ustensiles par catégorie
  const vaisselle = [
    { key: 'vaisselle_assiettes_plates', label: 'Assiettes plates' },
    { key: 'vaisselle_assiettes_dessert', label: 'Assiettes à dessert' },
    { key: 'vaisselle_assiettes_creuses', label: 'Assiettes creuses' },
    { key: 'vaisselle_bols', label: 'Bols' }
  ]

  const couverts = [
    { key: 'couverts_verres_eau', label: 'Verres à eau' },
    { key: 'couverts_verres_vin', label: 'Verres à vin' },
    { key: 'couverts_tasses', label: 'Tasses' },
    { key: 'couverts_flutes_champagne', label: 'Flûtes à champagne' },
    { key: 'couverts_mugs', label: 'Mugs' },
    { key: 'couverts_couteaux_table', label: 'Couteaux de table' },
    { key: 'couverts_fourchettes', label: 'Fourchettes' },
    { key: 'couverts_couteaux_steak', label: 'Couteaux à steak' },
    { key: 'couverts_cuilleres_soupe', label: 'Cuillères à soupe' },
    { key: 'couverts_cuilleres_cafe', label: 'Cuillères à café' },
    { key: 'couverts_cuilleres_dessert', label: 'Cuillères à dessert' }
  ]

  const ustensilesCuisine = [
    { key: 'ustensiles_poeles_differentes_tailles', label: 'Poêles de différentes tailles' },
    { key: 'ustensiles_casseroles_differentes_tailles', label: 'Casseroles de différentes tailles' },
    { key: 'ustensiles_faitouts', label: 'Faitouts' },
    { key: 'ustensiles_wok', label: 'Wok' },
    { key: 'ustensiles_cocotte_minute', label: 'Cocotte-minute' },
    { key: 'ustensiles_couvercle_anti_eclaboussures', label: 'Couvercle anti-éclaboussures' },
    { key: 'ustensiles_robot_cuisine', label: 'Robot de cuisine' },
    { key: 'ustensiles_batteur_electrique', label: 'Batteur électrique' },
    { key: 'ustensiles_couteaux_cuisine', label: 'Couteaux de cuisine' },
    { key: 'ustensiles_spatules', label: 'Spatules' },
    { key: 'ustensiles_ecumoire', label: 'Écumoire' },
    { key: 'ustensiles_ouvre_boite', label: 'Ouvre-boîte' },
    { key: 'ustensiles_rape', label: 'Râpe' },
    { key: 'ustensiles_tire_bouchon', label: 'Tire-bouchon' },
    { key: 'ustensiles_econome', label: 'Économe' },
    { key: 'ustensiles_passoire', label: 'Passoire' },
    { key: 'ustensiles_planche_decouper', label: 'Planche à découper' },
    { key: 'ustensiles_rouleau_patisserie', label: 'Rouleau à pâtisserie' },
    { key: 'ustensiles_ciseaux_cuisine', label: 'Ciseaux de cuisine' },
    { key: 'ustensiles_balance_cuisine', label: 'Balance de cuisine' },
    { key: 'ustensiles_bac_glacon', label: 'Bac à glaçon' },
    { key: 'ustensiles_pince_cuisine', label: 'Pince de cuisine' },
    { key: 'ustensiles_couteau_huitre', label: 'Couteau à huître' },
    { key: 'ustensiles_verre_mesureur', label: 'Verre mesureur' },
    { key: 'ustensiles_presse_agrume_manuel', label: 'Presse-agrume manuel' },
    { key: 'ustensiles_pichet', label: 'Pichet' }
  ]

  const platsRecipients = [
    { key: 'plats_dessous_plat', label: 'Dessous de plat' },
    { key: 'plats_plateau', label: 'Plateau' },
    { key: 'plats_saladiers', label: 'Saladiers' },
    { key: 'plats_a_four', label: 'Plats à four' },
    { key: 'plats_carafes', label: 'Carafes' },
    { key: 'plats_moules', label: 'Moules' },
    { key: 'plats_theiere', label: 'Théière' },
    { key: 'plats_cafetiere_piston_filtre', label: 'Cafetière (piston ou filtre)' },
    { key: 'plats_ustensiles_barbecue', label: 'Ustensiles de barbecue' },
    { key: 'plats_gants_cuisine', label: 'Gants de cuisine' },
    { key: 'plats_maniques', label: 'Maniques' }
  ]

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Cuisine - Ustensiles</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-8">
            
            {/* Section principale : Introduction */}
            <div>
              <p className="text-gray-600 mb-6">
                Quels ustensiles et équipements de cuisine sont disponibles dans le logement ?
              </p>
            </div>

            {/* VAISSELLE */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-blue-800">Vaisselle :</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {vaisselle.map(({ key, label }) => (
                  <CounterInput
                    key={key}
                    label={label}
                    fieldPath={`section_cuisine_2.${key}`}
                    value={formData[key]}
                  />
                ))}
              </div>
            </div>

            {/* COUVERTS */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-blue-800">Couverts :</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {couverts.map(({ key, label }) => (
                  <CounterInput
                    key={key}
                    label={label}
                    fieldPath={`section_cuisine_2.${key}`}
                    value={formData[key]}
                  />
                ))}
              </div>
            </div>

            {/* USTENSILES DE CUISINE */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-blue-800">Ustensiles de cuisine :</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ustensilesCuisine.map(({ key, label }) => (
                  <CounterInput
                    key={key}
                    label={label}
                    fieldPath={`section_cuisine_2.${key}`}
                    value={formData[key]}
                  />
                ))}
              </div>
            </div>

            {/* PLATS ET RÉCIPIENTS */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-blue-800">Plats et récipients :</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {platsRecipients.map(({ key, label }) => (
                  <CounterInput
                    key={key}
                    label={label}
                    fieldPath={`section_cuisine_2.${key}`}
                    value={formData[key]}
                  />
                ))}
              </div>
            </div>

            {/* CHAMPS COMPLÉMENTAIRES */}
            <div className="space-y-6">
              
              {/* Autres ustensiles */}
              <div>
                <label className="block font-semibold mb-2">
                  Ustensiles Cuisine - Autres ?
                </label>
                <textarea
                  placeholder="Précisez les autres ustensiles ou équipements disponibles dans votre cuisine."
                  value={formData.autres_ustensiles || ""}
                  onChange={(e) => handleInputChange('section_cuisine_2.autres_ustensiles', e.target.value)}
                  className="w-full p-3 border rounded-lg h-24"
                />
              </div>

              {/* Question quantité suffisante */}
              <div>
                <label className="block font-semibold mb-3">
                  Disposez-vous d'une quantité suffisante de vaisselle et couverts pour le nombre maximal de voyageurs ? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="quantite_suffisante"
                      value="true"
                      checked={formData.quantite_suffisante === true}
                      onChange={(e) => handleRadioChange('section_cuisine_2.quantite_suffisante', e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="quantite_suffisante"
                      value="false"
                      checked={formData.quantite_suffisante === false}
                      onChange={(e) => handleRadioChange('section_cuisine_2.quantite_suffisante', e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Non</span>
                  </label>
                </div>

                {/* Champ conditionnel si "Non" */}
                {formData.quantite_suffisante === false && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <label className="block font-semibold mb-2">
                      Veuillez préciser les éléments manquants ou en quantité insuffisante et indiquez un commentaire sur l'état de la vaisselle <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      placeholder="Indiquez quels éléments ne sont pas disponibles en quantité suffisante et commentez l'état de la vaisselle."
                      value={formData.quantite_insuffisante_details || ""}
                      onChange={(e) => handleInputChange('section_cuisine_2.quantite_insuffisante_details', e.target.value)}
                      className="w-full p-3 border rounded-lg h-24"
                    />
                  </div>
                )}
              </div>

              {/* Question casseroles et poêles testées */}
              <div>
                <label className="block font-semibold mb-3">
                  Avez-vous testé les casseroles et les poêles ? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="casseroles_poeles_testees"
                      value="true"
                      checked={formData.casseroles_poeles_testees === true}
                      onChange={(e) => handleRadioChange('section_cuisine_2.casseroles_poeles_testees', e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="casseroles_poeles_testees"
                      value="false"
                      checked={formData.casseroles_poeles_testees === false}
                      onChange={(e) => handleRadioChange('section_cuisine_2.casseroles_poeles_testees', e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>

              {/* Upload photos */}
              <div>
                <PhotoUpload 
                  fieldPath="section_cuisine_2.photos_tiroirs_placards"
                  label="Photos de tous les tiroirs et placards de la cuisine"
                  multiple={true}
                  maxFiles={8}
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