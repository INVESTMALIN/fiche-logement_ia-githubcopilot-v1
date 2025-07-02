import React from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'

const StyledCheckboxGrid = ({ options, values, path, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {options.map(({ key, label }) => (
      <label
        key={key}
        className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-primary hover:bg-primary/5"
      >
        <input
          type="checkbox"
          checked={values[key] || false}
          onChange={(e) => onChange(`${path}.${key}`, e.target.checked)}
          className="h-4 w-4 shrink-0 accent-primary"
        />
        <span className="text-sm text-gray-900 group-hover:text-primary transition-colors">{label}</span>
      </label>
    ))}
  </div>
)

export default function FicheAvis() {
  const {
    next,
    back,
    currentStep,
    totalSteps,
    getField,
    updateField,
    handleSave,
    saveStatus,
  } = useForm()

  const formData = getField('section_avis')
  const description = formData.description_emplacement || {}
  const atouts = formData.atouts_logement || {}
  const voyageurs = formData.types_voyageurs || {}
  const notation = formData.notation || {}

  const handleChange = (field, value) => updateField(field, value)

  const optionsEmplacement = [
    { key: 'tres_bien_situe', label: 'Très bien situé' },
    { key: 'quartier_calme', label: 'Quartier calme' },
    { key: 'environnement_rural', label: 'Campagne' },
    { key: 'bord_mer', label: 'Bord de mer' },
    { key: 'montagne', label: 'Montagne' },
    { key: 'autres_emplacement', label: 'Autre (préciser)' },
  ]

  const optionsAtouts = [
    { key: 'lumineux', label: 'Lumineux' },
    { key: 'rustique', label: 'Rustique' },
    { key: 'central', label: 'Central' },
    { key: 'convivial', label: 'Convivial' },
    { key: 'authentique', label: 'Authentique' },
    { key: 'douillet', label: 'Douillet' },
    { key: 'design_moderne', label: 'Design moderne' },
    { key: 'terrasse_balcon', label: 'Terrasse / Balcon' },
    { key: 'proche_transports', label: 'Proche des transports en commun' },
    { key: 'piscine', label: 'Piscine' },
    { key: 'jacuzzi', label: 'Jacuzzi' },
    { key: 'cheminee', label: 'Cheminée' },
    { key: 'charmant', label: 'Charmant' },
    { key: 'elegant', label: 'Élégant' },
    { key: 'atypique', label: 'Atypique' },
    { key: 'renove', label: 'Rénové' },
    { key: 'familial', label: 'Familial' },
    { key: 'cosy_confortable', label: 'Cosy / Confortable' },
    { key: 'decoration_traditionnelle', label: 'Décoration traditionnelle' },
    { key: 'jardin', label: 'Jardin' },
    { key: 'proche_commerces', label: 'Proche des commerces' },
    { key: 'sauna_spa', label: 'Sauna / Spa' },
    { key: 'video_projecteur', label: 'Vidéo Projecteur' },
    { key: 'station_recharge_electrique', label: 'Station de recharge pour véhicules électriques' },
    { key: 'romantique', label: 'Romantique' },
    { key: 'paisible', label: 'Paisible' },
    { key: 'chic', label: 'Chic' },
    { key: 'accueillant', label: 'Accueillant' },
    { key: 'tranquille', label: 'Tranquille' },
    { key: 'spacieux', label: 'Spacieux' },
    { key: 'vue_panoramique', label: 'Vue panoramique' },
    { key: 'parking_prive', label: 'Parking privé' },
    { key: 'equipements_haut_gamme', label: 'Équipements haut de gamme' },
    { key: 'billard', label: 'Billard' },
    { key: 'jeux_arcade', label: "Jeux d'arcade" },
    { key: 'table_ping_pong', label: 'Table de ping pong' },
    { key: 'autres_atouts', label: 'Autre (veuillez préciser)' },
  ]

  const optionsVoyageurs = [
    { key: 'duo_amoureux', label: "Duo d'amoureux" },
    { key: 'nomades_numeriques', label: 'Nomades numériques' },
    { key: 'aventuriers_independants', label: 'Aventuriers indépendants' },
    { key: 'tribus_familiales', label: 'Tribus familiales' },
    { key: 'bandes_amis', label: 'Bandes d\'amis' },
    { key: 'voyageurs_experience', label: "Voyageurs d'expérience" },
    { key: 'autres_voyageurs', label: 'Autre (préciser)' },
  ]

  const noteFields = [
    { key: 'emplacement', label: 'Emplacement' },
    { key: 'confort', label: 'Confort' },
    { key: 'vetuste', label: 'Vétusté' },
    { key: 'equipements', label: 'Équipements' },
  ]

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        <div className="flex-1 p-6 bg-muted/50">
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-6 mb-6">
        <h1 className="text-xl font-semibold mb-2">Votre avis compte !</h1>
        <p className="text-sm leading-relaxed">
            Votre avis compte énormément ! En tant que coordinateur sur place, votre perception du logement est unique et précieuse.
            Vos observations peuvent révéler des atouts cachés ou des particularités que seul quelqu'un ayant visité le lieu peut remarquer.
            Ces détails peuvent faire toute la différence dans l'annonce, alors n'hésitez pas à partager vos impressions !
        </p>
        </div>

          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <h2 className="text-base font-semibold mb-4">Comment décririez-vous l'emplacement du logement ? *</h2>
            <StyledCheckboxGrid
              options={optionsEmplacement}
              values={description}
              path="section_avis.description_emplacement"
              onChange={handleChange}
            />
            {description.autres_emplacement && (
              <textarea
                className="mt-4 w-full p-3 border rounded"
                placeholder="Précisez l'emplacement..."
                value={getField('section_avis.description_emplacement_autre') || ''}
                onChange={(e) => handleChange('section_avis.description_emplacement_autre', e.target.value)}
              />
            )}
            <label className="block mt-6 text-sm font-medium">Précisions supplémentaires</label>
            <textarea
              className="w-full p-3 border rounded"
              placeholder="Détails utiles sur l'emplacement..."
              value={getField('section_avis.precisions_emplacement') || ''}
              onChange={(e) => handleChange('section_avis.precisions_emplacement', e.target.value)}
            />
          </div>

          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <h2 className="text-base font-semibold mb-4">Atouts du logement</h2>
            <StyledCheckboxGrid
              options={optionsAtouts}
              values={atouts}
              path="section_avis.atouts_logement"
              onChange={handleChange}
            />
            {atouts.autres_atouts && (
              <textarea
                className="mt-4 w-full p-3 border rounded"
                placeholder="Précisez les autres atouts..."
                value={getField('section_avis.atouts_logement_autre') || ''}
                onChange={(e) => handleChange('section_avis.atouts_logement_autre', e.target.value)}
              />
            )}
            <label className="block mt-6 text-sm font-medium">Autres caractéristiques</label>
            <textarea
              className="w-full p-3 border rounded"
              placeholder="Aspects uniques à mettre en avant..."
              value={getField('section_avis.autres_caracteristiques') || ''}
              onChange={(e) => handleChange('section_avis.autres_caracteristiques', e.target.value)}
            />
          </div>

          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <h2 className="text-base font-semibold mb-4">Types de voyageurs</h2>
            <StyledCheckboxGrid
              options={optionsVoyageurs}
              values={voyageurs}
              path="section_avis.types_voyageurs"
              onChange={handleChange}
            />
            {voyageurs.autres_voyageurs && (
              <textarea
                className="mt-4 w-full p-3 border rounded"
                placeholder="Précisez le type de voyageurs..."
                value={getField('section_avis.types_voyageurs_autre') || ''}
                onChange={(e) => handleChange('section_avis.types_voyageurs_autre', e.target.value)}
              />
            )}
            <label className="block mt-6 text-sm font-medium">Pourquoi ce logement convient ?</label>
            <textarea
              className="w-full p-3 border rounded"
              placeholder="Expliquez l'adaptation du logement"
              value={getField('section_avis.explication_adaptation') || ''}
              onChange={(e) => handleChange('section_avis.explication_adaptation', e.target.value)}
            />
          </div>

          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <h2 className="text-base font-semibold mb-4">Évaluation globale</h2>
            <div className="grid grid-cols-1 gap-6">
              {noteFields.map(({ key, label }) => (
                <div key={key} className="text-left">
                  <p className="text-sm font-medium mb-2">{label}</p>
                  <div className="flex gap-3">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <label
                        key={val}
                        className={`flex flex-col items-center justify-center w-8 h-8 rounded-full border text-xs cursor-pointer transition-colors ${
                          notation[key] === val 
                            ? 'border-blue-500 bg-blue-500 text-white' 
                            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`notation_${key}`}
                          checked={notation[key] === val}
                          onChange={() => handleChange(`section_avis.notation.${key}`, val)}
                          className="hidden"
                        />
                        {val}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
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
