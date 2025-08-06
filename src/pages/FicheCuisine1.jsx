// src/pages/FicheCuisine1.jsx
import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'

export default function FicheCuisine1() {
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
  const formData = getField('section_cuisine_1')

  // Handler pour champs simples
  const handleInputChange = (field, value) => {
    updateField(field, value)
  }

  // Handler pour checkboxes (équipements principaux et types cafetière)
  const handleCheckboxChange = (field, checked) => {
    updateField(field, checked ? true : null)
  }

  // Handler pour radio buttons (vidéo et café fourni)
  const handleRadioChange = (field, value) => {
    if (value === 'true') updateField(field, true)
    else if (value === 'false') updateField(field, false)
    else updateField(field, value) // Pour les strings comme café fourni
  }

  // Liste des équipements principaux
  const equipements = [
    { key: 'equipements_refrigerateur', label: 'Réfrigérateur' },
    { key: 'equipements_congelateur', label: 'Congélateur' },
    { key: 'equipements_mini_refrigerateur', label: 'Mini réfrigérateur' },
    { key: 'equipements_cuisiniere', label: 'Cuisinière' },
    { key: 'equipements_plaque_cuisson', label: 'Plaque de cuisson' },
    { key: 'equipements_four', label: 'Four' },
    { key: 'equipements_micro_ondes', label: 'Four à micro-ondes' },
    { key: 'equipements_lave_vaisselle', label: 'Lave-vaisselle' },
    { key: 'equipements_cafetiere', label: 'Cafetière' },
    { key: 'equipements_bouilloire', label: 'Bouilloire électrique' },
    { key: 'equipements_grille_pain', label: 'Grille-pain' },
    { key: 'equipements_blender', label: 'Blender' },
    { key: 'equipements_cuiseur_riz', label: 'Cuiseur à riz' },
    { key: 'equipements_machine_pain', label: 'Machine à pain' },
    { key: 'equipements_lave_linge', label: 'Lave-linge' },
    { key: 'equipements_autre', label: 'Autre (veuillez préciser)' }
  ]

  // Types de cafetière
  const typesCafetiere = [
    { key: 'cafetiere_type_filtre', label: 'Cafetière filtre' },
    { key: 'cafetiere_type_expresso', label: 'Machine à expresso' },
    { key: 'cafetiere_type_piston', label: 'Cafetière à piston' },
    { key: 'cafetiere_type_keurig', label: 'Machine à café Keurig' },
    { key: 'cafetiere_type_nespresso', label: 'Nespresso' },
    { key: 'cafetiere_type_manuelle', label: 'Cafetière manuelle' },
    { key: 'cafetiere_type_bar_grain', label: 'Cafetière bar grain (type Delonghi)' },
    { key: 'cafetiere_type_bar_moulu', label: 'Cafetière bar café moulu (type Delonghi)' }
  ]

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Cuisine 1 - Équipements</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* Section principale : Sélection des équipements */}
            <div>
              <label className="block font-semibold mb-3">
                Cuisine - Quels équipements électroménagers sont disponibles dans la cuisine ? <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {equipements.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData[key] === true}
                      onChange={(e) => handleCheckboxChange(`section_cuisine_1.${key}`, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>

              {/* Champ conditionnel "Autre" */}
              {formData.equipements_autre === true && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Veuillez préciser..."
                    value={formData.equipements_autre_details || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.equipements_autre_details', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* RÉFRIGÉRATEUR */}
            {formData.equipements_refrigerateur === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Réfrigérateur - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Réfrigérateur - Marque <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Précisez la marque du réfrigérateur"
                    value={formData.refrigerateur_marque || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.refrigerateur_marque', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Réfrigérateur - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation du réfrigérateur"
                    value={formData.refrigerateur_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.refrigerateur_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.refrigerateur_video"
                    label="Réfrigérateur - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>

              </div>
            )}

            {/* CONGÉLATEUR */}
            {formData.equipements_congelateur === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Congélateur - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Congélateur - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation du congélateur"
                    value={formData.congelateur_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.congelateur_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.congelateur_video"
                    label="Congélateur - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>

              </div>
            )}

            {/* MINI RÉFRIGÉRATEUR */}
            {formData.equipements_mini_refrigerateur === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Mini réfrigérateur - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Mini réfrigérateur - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation du mini réfrigérateur"
                    value={formData.mini_refrigerateur_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.mini_refrigerateur_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.mini_refrigerateur_video"
                    label="Mini réfrigérateur - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>

              </div>
            )}

            {/* CUISINIÈRE */}
            {formData.equipements_cuisiniere === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Cuisinière - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Cuisinière - Marque <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Précisez la marque de la cuisinière"
                    value={formData.cuisiniere_marque || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.cuisiniere_marque', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Cuisinière - Type
                  </label>
                  <select
                    value={formData.cuisiniere_type || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.cuisiniere_type', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">Sélectionnez le type</option>
                    <option value="Électrique">Électrique</option>
                    <option value="Gaz">Gaz</option>
                    <option value="Induction">Induction</option>
                    <option value="À bois">À bois</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Cuisinière - Nombre de feux
                  </label>
                  <input
                    type="number"
                    placeholder="Indiquez le nombre de feux"
                    value={formData.cuisiniere_nombre_feux || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.cuisiniere_nombre_feux', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Cuisinière - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation de la cuisinière"
                    value={formData.cuisiniere_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.cuisiniere_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.cuisiniere_photo"
                    label="Cuisinière - Photo"
                    multiple={true}
                    maxFiles={3}
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.cuisiniere_video"
                    label="Cuisinière - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>

              </div>
            )}

            {/* PLAQUE DE CUISSON */}
            {formData.equipements_plaque_cuisson === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Plaque de cuisson - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Plaque de cuisson - Marque <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Précisez la marque de la plaque de cuisson"
                    value={formData.plaque_cuisson_marque || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.plaque_cuisson_marque', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Plaque de cuisson - Type
                  </label>
                  <select
                    value={formData.plaque_cuisson_type || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.plaque_cuisson_type', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">Sélectionnez le type</option>
                    <option value="Électrique">Électrique</option>
                    <option value="Gaz">Gaz</option>
                    <option value="Induction">Induction</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Plaque de cuisson - Nombre de feux
                  </label>
                  <input
                    type="number"
                    placeholder="Indiquez le nombre de feux"
                    value={formData.plaque_cuisson_nombre_feux || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.plaque_cuisson_nombre_feux', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Plaque de cuisson - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation de la plaque de cuisson"
                    value={formData.plaque_cuisson_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.plaque_cuisson_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.plaque_cuisson_photo"
                    label="Plaque de cuisson - Photo"
                    multiple={true}
                    maxFiles={3}
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.plaque_cuisson_video"
                    label="Plaque de cuisson - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>
              </div>
            )}

            {/* FOUR */}
            {formData.equipements_four === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Four - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Four - Marque <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Précisez la marque du four"
                    value={formData.four_marque || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.four_marque', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Four - Type
                  </label>
                  <select
                    value={formData.four_type || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.four_type', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">Sélectionnez le type</option>
                    <option value="Simple">Simple</option>
                    <option value="Double">Double</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Four - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation du four"
                    value={formData.four_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.four_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.four_photo"
                    label="Four - Photo"
                    multiple={true}
                    maxFiles={3}
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.four_video"
                    label="Four - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>
              </div>
            )}

            {/* FOUR À MICRO-ONDES */}
            {formData.equipements_micro_ondes === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Four à micro-ondes - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Four à micro-ondes - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation du four à micro-ondes"
                    value={formData.micro_ondes_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.micro_ondes_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.micro_ondes_photo"
                    label="Four à micro-ondes - Photo"
                    multiple={true}
                    maxFiles={3}
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.micro_ondes_video"
                    label="Four à micro-ondes - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>
              </div>
            )}

            {/* LAVE-VAISSELLE */}
            {formData.equipements_lave_vaisselle === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Lave-vaisselle - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Lave-vaisselle - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation du lave-vaisselle"
                    value={formData.lave_vaisselle_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.lave_vaisselle_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.lave_vaisselle_photo"
                    label="Lave-vaisselle - Photo"
                    multiple={true}
                    maxFiles={3}
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.lave_vaisselle_video"
                    label="Lave-vaisselle - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>
              </div>
            )}

            {/* CAFETIÈRE */}
            {formData.equipements_cafetiere === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Cafetière - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Cafetière - Marque <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Précisez la marque de la cafetière"
                    value={formData.cafetiere_marque || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.cafetiere_marque', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-3">
                    Cafetière - Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {typesCafetiere.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={formData[key] === true}
                          onChange={(e) => handleCheckboxChange(`section_cuisine_1.${key}`, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Cafetière - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation de la cafetière"
                    value={formData.cafetiere_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.cafetiere_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.cafetiere_photo"
                    label="Cafetière - Photo"
                    multiple={true}
                    maxFiles={3}
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.cafetiere_video"
                    label="Cafetière - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Le café est-il fourni ?
                  </label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cafetiere_cafe_fourni"
                        value="Non"
                        checked={formData.cafetiere_cafe_fourni === "Non"}
                        onChange={(e) => handleRadioChange('section_cuisine_1.cafetiere_cafe_fourni', e.target.value)}
                        className="w-4 h-4"
                      />
                      <span>Non</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cafetiere_cafe_fourni"
                        value="Oui par le propriétaire"
                        checked={formData.cafetiere_cafe_fourni === "Oui par le propriétaire"}
                        onChange={(e) => handleRadioChange('section_cuisine_1.cafetiere_cafe_fourni', e.target.value)}
                        className="w-4 h-4"
                      />
                      <span>Oui par le propriétaire</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cafetiere_cafe_fourni"
                        value="Oui par la fée du logis"
                        checked={formData.cafetiere_cafe_fourni === "Oui par la fée du logis"}
                        onChange={(e) => handleRadioChange('section_cuisine_1.cafetiere_cafe_fourni', e.target.value)}
                        className="w-4 h-4"
                      />
                      <span>Oui par la fée du logis</span>
                    </label>
                  </div>
                </div>

                {/* Champ conditionnel marque du café */}
                {(formData.cafetiere_cafe_fourni === "Oui par le propriétaire" || formData.cafetiere_cafe_fourni === "Oui par la fée du logis") && (
                  <div>
                    <label className="block font-semibold mb-2">
                      Marque du café fourni
                    </label>
                    <input
                      type="text"
                      placeholder="Précisez la marque du café fourni"
                      value={formData.cafetiere_marque_cafe || ""}
                      onChange={(e) => handleInputChange('section_cuisine_1.cafetiere_marque_cafe', e.target.value)}
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}

            {/* BOUILLOIRE ÉLECTRIQUE */}
            {formData.equipements_bouilloire === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Bouilloire électrique - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Bouilloire électrique - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation de la bouilloire électrique"
                    value={formData.bouilloire_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.bouilloire_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.bouilloire_video"
                    label="Bouilloire électrique - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>
              </div>
            )}

            {/* GRILLE-PAIN */}
            {formData.equipements_grille_pain === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Grille-pain - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Grille-pain - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation du grille-pain"
                    value={formData.grille_pain_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.grille_pain_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.grille_pain_video"
                    label="Grille-pain - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>
              </div>
            )}

            {/* BLENDER */}
            {formData.equipements_blender === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Blender - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Blender - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation du blender"
                    value={formData.blender_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.blender_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.blender_video"
                    label="Blender - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>
              </div>
            )}

            {/* CUISEUR À RIZ */}
            {formData.equipements_cuiseur_riz === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Cuiseur à riz - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Cuiseur à riz - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation du cuiseur à riz"
                    value={formData.cuiseur_riz_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.cuiseur_riz_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.cuiseur_riz_video"
                    label="Cuiseur à riz - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>
              </div>
            )}

            {/* MACHINE À PAIN */}
            {formData.equipements_machine_pain === true && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-800">Machine à pain - Détails</h3>
                
                <div>
                  <label className="block font-semibold mb-2">
                    Machine à pain - Instructions d'utilisation
                  </label>
                  <textarea
                    placeholder="Instructions d'utilisation de la machine à pain"
                    value={formData.machine_pain_instructions || ""}
                    onChange={(e) => handleInputChange('section_cuisine_1.machine_pain_instructions', e.target.value)}
                    className="w-full p-3 border rounded-lg h-24"
                  />
                </div>

                <div>
                  <PhotoUpload 
                    fieldPath="section_cuisine_1.machine_pain_video"
                    label="Machine à pain - Vidéo d'utilisation"
                    multiple={true}
                    maxFiles={1}
                    acceptVideo={true}
                  />
                </div>
              </div>
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