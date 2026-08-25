import React, { useMemo, useState } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'
import {
  GRILLE_CRITERES,
  SECURITE_DANGERS,
  VUE_TYPES,
  computeGrilleStats
} from '../lib/avisGrilleHelpers'

// ℹ️ Les blocs "Points sensibles à filmer", "Vidéo de l'état du logement" et
// "Type de 1er ménage" (avec les contacts de maintenance) ont été déplacés dans
// la section Instructions Ménage — cf. src/pages/FicheInstructionsMenage.jsx.
// Motif : la section Avis n'est pas rendue dans le PDF ménage, le prestataire ne
// voyait donc jamais ces informations. La vidéo globale ci-dessous reste ici.

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
  const atouts = formData.atouts_logement || {}
  const voyageurs = formData.types_voyageurs || {}

  const handleChange = (field, value) => updateField(field, value)

  const grilleStats = useMemo(() => computeGrilleStats(formData), [formData])
  const securiteDangers = formData.securite_dangers || []
  const dangerDetecte = securiteDangers.length > 0

  const toggleSecurite = (key) => {
    const current = formData.securite_dangers || []
    const next = current.includes(key)
      ? current.filter(d => d !== key)
      : [...current, key]
    handleChange('section_avis.securite_dangers', next)
  }

  const setGrilleNote = (critereKey, note) => {
    handleChange(`section_avis.grille_${critereKey}_note`, note)
  }

  const setGrilleObs = (critereKey, value) => {
    handleChange(`section_avis.grille_${critereKey}_obs`, value)
  }

  const verdictPalette = {
    excellent_etat: 'bg-emerald-100 text-emerald-800',
    bon_etat: 'bg-green-100 text-green-800',
    etat_moyen: 'bg-amber-100 text-amber-800',
    etat_degrade: 'bg-orange-100 text-orange-800',
    tres_mauvais_etat: 'bg-red-100 text-red-800'
  }

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
    { key: 'pied_des_pistes', label: 'Au pied des pistes' },
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
    { key: 'romantique', label: 'Romantique' },
    { key: 'paisible', label: 'Paisible' },
    { key: 'chic', label: 'Chic' },
    { key: 'accueillant', label: 'Accueillant' },
    { key: 'tranquille', label: 'Tranquille' },
    { key: 'spacieux', label: 'Spacieux' },
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

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        <div className="flex-1 p-6 bg-muted/50">
          <h1 className="text-2xl font-bold mb-6">Avis sur le logement</h1>
          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-6 mb-6">

            <h1 className="text-xl font-semibold mb-2">Votre avis compte !</h1>
            <p className="text-sm leading-relaxed">
              Votre avis compte énormément ! En tant que coordinateur sur place, votre perception du logement est unique et précieuse.
              Vos observations peuvent révéler des atouts cachés ou des particularités que seul quelqu'un ayant visité le lieu peut remarquer.
              Ces détails peuvent faire toute la différence dans l'annonce, alors n'hésitez pas à partager vos impressions !
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold mb-1">Évaluation de l'environnement et du logement</h2>
              <h3 className="text-sm font-medium text-gray-700">Vidéo globale à l'arrivée dans le logement (vidéo du quartier, de l'immeuble, du logement)</h3>
            </div>
            {/* Question vidéo globale */}
            <div className="mb-4">

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="video_globale_validation"
                    value="true"
                    checked={formData.video_globale_validation === true}
                    onChange={() => handleChange('section_avis.video_globale_validation', true)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span>Oui</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="video_globale_validation"
                    value="false"
                    checked={formData.video_globale_validation === false}
                    onChange={() => handleChange('section_avis.video_globale_validation', false)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span>Non</span>
                </label>
              </div>
              {formData.video_globale_validation === true && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <PhotoUpload
                    fieldPath="section_avis.video_globale_videos"
                    label="Vidéos globales du quartier, immeuble et logement"
                    multiple={true}
                    maxFiles={5}
                    acceptVideo={true}
                  />
                </div>
              )}
            </div>
          </div>


          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <h2 className="text-base font-semibold mb-4">Évaluation du quartier</h2>

            {/* Type de quartier - Choix multiples */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">Type de quartier</label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { key: 'quartier_neuf', label: 'Quartier neuf (récemment développé, moderne)' },
                  { key: 'quartier_ancien', label: 'Quartier ancien (historique, caractère authentique)' },
                  { key: 'quartier_populaire', label: 'Quartier populaire (vivant, mais parfois moins soigné)' },
                  { key: 'quartier_residentiel', label: 'Quartier résidentiel (principalement des logements)' },
                  { key: 'quartier_excentre', label: 'Quartier excentré (loin des points d\'intérêt principaux)' },
                  { key: 'quartier_central', label: 'Quartier central (proche du centre-ville, bien desservi)' },
                  { key: 'quartier_chic', label: 'Quartier chic (haut de gamme, commerçants et services de luxe)' },
                  { key: 'quartier_intermediaire', label: 'Quartier intermédiaire (familial, moyen de gamme)' },
                  { key: 'quartier_defavorise', label: 'Quartier défavorisé (secteur avec des conditions de vie moins favorables) ⚠️' },
                  { key: 'quartier_rural', label: 'Zone rurale (campagne isolée, éloignée des commodités et transports)' },
                  { key: 'quartier_village', label: 'Village (centre-bourg avec commerces de proximité, ambiance locale)' },
                  { key: 'quartier_balneaire', label: 'Bord de mer / Station Balnéaire (proche plage, côte, activités saisonnières ou touristiques)' },
                  { key: 'quartier_station_ski', label: 'Station de ski (proche des pistes, des remontées mécaniques et des activités de montagne)' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-primary hover:bg-primary/5"
                  >
                    <input
                      type="checkbox"
                      checked={formData.quartier_types?.includes(key) || false}
                      onChange={(e) => {
                        const currentTypes = formData.quartier_types || []
                        const newTypes = e.target.checked
                          ? [...currentTypes, key]
                          : currentTypes.filter(type => type !== key)
                        handleChange('section_avis.quartier_types', newTypes)
                      }}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="text-sm text-gray-900 group-hover:text-primary transition-colors">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sécurité du quartier */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">Sécurité du quartier</label>

              <div className="flex flex-col gap-3">
                {[
                  { value: 'securise', label: 'Sécurisé (quartier calme)' },
                  { value: 'modere', label: 'Quartier modéré (risques modérés de délinquance)' },
                  { value: 'zone_risques', label: 'Zone à risques (Pas de sentiment de sécurité, quartiers difficiles à sécuriser. Risque de vol, d\'intrusion, délinquance ou plus.) ⚠️' }
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="quartier_securite"
                      value={value}
                      checked={formData.quartier_securite === value}
                      onChange={() => handleChange('section_avis.quartier_securite', value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Perturbations du quartier */}
            <div className="mb-4">
              <label className="block font-semibold mb-3">Perturbations du quartier</label>

              <div className="flex flex-col gap-3">
                {[
                  { value: 'aucune', label: 'Pas d\'élément perturbateur' },
                  { value: 'perturbateur', label: 'Élément perturbateur à proximité (ex : restaurant avec forte odeur, rue bruyante, lieux de fêtes)' }
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="quartier_perturbations"
                      value={value}
                      checked={formData.quartier_perturbations === value}
                      onChange={() => handleChange('section_avis.quartier_perturbations', value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              {/* Champ conditionnel - Détails perturbations */}
              {formData.quartier_perturbations === 'perturbateur' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    L'élément perturbateur, en quelques mots (pas une phrase)
                  </label>
                  <textarea
                    className="w-full p-3 border rounded"
                    rows="2"
                    placeholder="Ex : une voie ferrée, des travaux, un bar de nuit"
                    value={formData.quartier_perturbations_details || ''}
                    onChange={(e) => handleChange('section_avis.quartier_perturbations_details', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <h2 className="text-base font-semibold mb-4">Évaluation de l'immeuble et de la façade</h2>

            {/* État général de l'immeuble */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">État général de l'immeuble</label>

              <div className="flex flex-col gap-3">
                {[
                  { value: 'bon_etat', label: 'Bon état (entretien régulier, bâtiment bien conservé, récentes rénovations)' },
                  { value: 'etat_correct', label: 'État correct (l\'immeuble est bien entretenu et a besoin d\'améliorations mineures)' },
                  { value: 'mauvais_etat', label: 'Mauvais état (bâtiment vétuste, rénovations nécessaires) ⚠️' }
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="immeuble_etat_general"
                      value={value}
                      checked={formData.immeuble_etat_general === value}
                      onChange={() => handleChange('section_avis.immeuble_etat_general', value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Propreté de l'immeuble */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">Propreté de l'immeuble</label>

              <div className="flex flex-col gap-3">
                {[
                  { value: 'propre', label: 'Propre (espaces communs bien entretenus)' },
                  { value: 'sale', label: 'Sale (espaces communs mal nettoyés, débris visibles) ⚠️' }
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="immeuble_proprete"
                      value={value}
                      checked={formData.immeuble_proprete === value}
                      onChange={() => handleChange('section_avis.immeuble_proprete', value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Accessibilité de l'immeuble */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">Accessibilité de l'immeuble</label>

              <div className="flex flex-col gap-3">
                {[
                  { value: 'tres_accessible', label: 'Très accessible (ascenseur fonctionnel, rampes, accès facile aux personnes à mobilité réduite)' },
                  { value: 'moderement_accessible', label: 'Modérément accessible (accès aux étages supérieurs possible, mais avec quelques limitations)' },
                  { value: 'inaccessible', label: 'Inaccessible (pas d\'ascenseur, rampes non présentes, escalier raide difficultés d\'accès pour personnes à mobilité réduite)' }
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="immeuble_accessibilite"
                      value={value}
                      checked={formData.immeuble_accessibilite === value}
                      onChange={() => handleChange('section_avis.immeuble_accessibilite', value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Niveau sonore de l'immeuble */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">Niveau sonore de l'immeuble</label>

              <div className="flex flex-col gap-3">
                {[
                  { value: 'tres_calme', label: 'Très calme (absence de bruit, excellente isolation sonore)' },
                  { value: 'relativement_calme', label: 'Relativement calme (bruit modéré provenant des voisins ou de l\'extérieur)' },
                  { value: 'tres_bruyant', label: 'Très bruyant (nuisances sonores importantes, mauvaise insonorisation)' }
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="immeuble_niveau_sonore"
                      value={value}
                      checked={formData.immeuble_niveau_sonore === value}
                      onChange={() => handleChange('section_avis.immeuble_niveau_sonore', value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 📸 Photos de la façade — photos seules, réutilisables pour l'annonce */}
            <div>
              <label className="block font-semibold mb-1">Photos de la façade <span className="text-red-500">*</span></label>
              <p className="text-sm text-text-muted mb-3">
                📸 Les photos de la façade sont désormais obligatoires pour l'annonce.
              </p>
              <PhotoUpload
                fieldPath="section_avis.immeuble_facade_photos"
                label=""
                multiple={true}
                maxFiles={5}
                acceptVideo={false}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <div className="flex items-baseline justify-between gap-4 flex-wrap mb-1">
              <h2 className="text-base font-semibold">Évaluation du logement</h2>
              <span className="text-xs text-text-muted">
                {grilleStats.filled} / {GRILLE_CRITERES.length} critères évalués · {grilleStats.total} pts
              </span>
            </div>
            <p className="text-sm text-text-muted mb-4">
              Pour chaque critère, sélectionne le niveau qui correspond le mieux à ce que tu observes sur place. Tu peux ajouter une observation libre si besoin.
            </p>

            <div className="bg-primary/10 border border-primary/30 text-text rounded-xl p-4 mb-6 text-sm leading-relaxed">
              <p className="font-semibold mb-1">💡 Comment ça marche</p>
              Chaque critère est noté de 1 (mauvais état) à 5 (excellent état). Le score total (sur 45) et le verdict global se calculent automatiquement en fonction de tes choix.
            </div>

            {/* 9 critères */}
            <div className="divide-y divide-gray-200">
              {GRILLE_CRITERES.map((critere) => {
                const noteValue = formData[`grille_${critere.key}_note`]
                const obsValue = formData[`grille_${critere.key}_obs`] || ''
                return (
                  <div key={critere.key} className="py-5 first:pt-0 last:pb-0">
                    <p className="font-semibold mb-3">{critere.label}</p>
                    <div className="flex flex-col gap-2 mb-3">
                      {critere.niveaux.map((n) => {
                        const checked = noteValue === n.val
                        const pointBadge = n.val === 1
                          ? 'bg-red-100 text-red-800'
                          : n.val === 2
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        return (
                          <label
                            key={n.val}
                            className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary hover:bg-primary/5'
                              }`}
                          >
                            <input
                              type="radio"
                              name={`grille_${critere.key}`}
                              value={n.val}
                              checked={checked}
                              onChange={() => setGrilleNote(critere.key, n.val)}
                              className="mt-1 h-4 w-4 accent-primary cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-sm font-semibold ${checked ? 'text-primary' : 'text-text'}`}>{n.name}</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pointBadge}`}>
                                  {n.val} pt{n.val > 1 ? 's' : ''}
                                </span>
                              </div>
                              <p className="text-sm text-text-muted leading-snug">{n.desc}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Observations (optionnel)</label>
                    <textarea
                      className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      rows="2"
                      placeholder="Précise un détail particulier sur ce critère…"
                      value={obsValue}
                      onChange={(e) => setGrilleObs(critere.key, e.target.value)}
                    />
                  </div>
                )
              })}
            </div>

            {/* Bloc verdict global */}
            <div
              className="mt-6 rounded-xl p-5 text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #e3bd7a, #c89a4a)' }}
            >
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <p className="text-sm opacity-90 mb-1">Score total</p>
                  <p className="text-3xl font-bold leading-none">{grilleStats.total} / 45</p>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${grilleStats.verdict ? verdictPalette[grilleStats.verdict] : 'bg-white/20 text-white'
                    }`}
                >
                  {grilleStats.verdictLabel || (grilleStats.filled > 0 ? `En cours (${grilleStats.filled}/9)` : 'À compléter')}
                </span>
              </div>
              <div className="h-2 bg-white/25 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (grilleStats.total / 45) * 100)}%` }}
                />
              </div>
              <p className="text-xs opacity-85 mt-2">{grilleStats.filled} / 9 critères évalués</p>
            </div>
          </div>

          {/* ⚠️ Vérification sécurité */}
          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <h2 className="text-base font-semibold mb-1">⚠️ Vérification sécurité</h2>
            <p className="text-sm text-text-muted mb-4">
              Coche tout élément dangereux que tu as observé. Si au moins un élément est coché, le logement sera signalé comme présentant un danger.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SECURITE_DANGERS.map((item) => {
                const checked = securiteDangers.includes(item.key)
                return (
                  <label
                    key={item.key}
                    className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-lg cursor-pointer text-sm transition-colors ${checked ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-primary hover:bg-primary/5'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSecurite(item.key)}
                      className="h-4 w-4 cursor-pointer"
                      style={{ accentColor: '#dc2626' }}
                    />
                    <span>{item.label}</span>
                  </label>
                )
              })}
            </div>
            {dangerDetecte && (
              <div className="mt-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded-lg text-sm flex items-center gap-2.5">
                <span>🚨</span>
                <span><strong>Danger détecté.</strong> Le logement présente des éléments de sécurité préoccupants qui nécessitent une intervention.</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <h2 className="text-base font-semibold mb-4">Ambiance & vis-à-vis du logement</h2>

            {/* Ambiance générale du logement */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">Ambiance générale du logement</label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'logement_epure', label: 'Logement épuré (décor minimaliste, espaces aérés)' },
                  { key: 'logement_charge', label: 'Logement chargé (beaucoup de décorations, de meubles, de bibelots etc)' },
                  { key: 'decoration_moderne', label: 'Décoration moderne (meubles neufs ou récents, lignes modernes)' },
                  { key: 'decoration_traditionnelle', label: 'Décoration traditionnelle (meubles anciens et décoration ancienne)' },
                  { key: 'decoration_specifique', label: 'Décoration spécifique (logement à thème)' },
                  { key: 'absence_decoration', label: 'Absence de décoration' },
                  { key: 'decoration_personnalisee', label: 'Décoration très personnalisée (décor familiale avec des éléments personnels de propriétaires) ⚠️' }
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-primary hover:bg-primary/5"
                  >
                    <input
                      type="checkbox"
                      checked={formData.logement_ambiance?.includes(key) || false}
                      onChange={(e) => {
                        const currentAmbiance = formData.logement_ambiance || []
                        const newAmbiance = e.target.checked
                          ? [...currentAmbiance, key]
                          : currentAmbiance.filter(item => item !== key)
                        handleChange('section_avis.logement_ambiance', newAmbiance)
                      }}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="text-sm text-gray-900 group-hover:text-primary transition-colors">
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Champ conditionnel - Absence de décoration */}
              {formData.logement_ambiance?.includes('absence_decoration') && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Décrire les éléments à rajouter (ex : cadres, rideaux etc)
                  </label>
                  <textarea
                    className="w-full p-3 border rounded"
                    rows="3"
                    placeholder="Listez les éléments décoratifs manquants..."
                    value={formData.logement_absence_decoration_details || ''}
                    onChange={(e) => handleChange('section_avis.logement_absence_decoration_details', e.target.value)}
                  />
                </div>
              )}

              {/* Champ conditionnel - Décoration personnalisée */}
              {formData.logement_ambiance?.includes('decoration_personnalisee') && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Décrire l'élément personnalisés (ex : photos de famille, éléments religieux etc)
                  </label>
                  <textarea
                    className="w-full p-3 border rounded"
                    rows="3"
                    placeholder="Décrivez les éléments personnels..."
                    value={formData.logement_decoration_personnalisee_details || ''}
                    onChange={(e) => handleChange('section_avis.logement_decoration_personnalisee_details', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Vis-à-vis du logement */}
            <div className="mb-4">
              <label className="block font-semibold mb-3">Vis-à-vis du logement</label>

              <div className="flex flex-col gap-3">
                {[
                  { value: 'vue_degagee', label: 'Vue dégagée sur pièce principale et jardin' },
                  { value: 'vis_a_vis_partielle', label: 'Vis-à-vis partielle sur pièce principale et jardin (arbres, clôture etc)' },
                  { value: 'vis_a_vis_direct', label: 'Vis-à-vis direct sur pièce principale et jardin ⚠️' }
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="logement_vis_a_vis"
                      value={value}
                      checked={formData.logement_vis_a_vis === value}
                      onChange={() => handleChange('section_avis.logement_vis_a_vis', value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              {/* Photos vis-à-vis */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Photos du vis-à-vis</label>
                <PhotoUpload
                  fieldPath="section_avis.logement_vis_a_vis_photos"
                  label=""
                  multiple={true}
                  maxFiles={5}
                  acceptVideo={false}
                />
              </div>
            </div>
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

          {/* 👁️ Vue depuis le logement */}
          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <h2 className="text-base font-semibold mb-1">Vue depuis le logement</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {VUE_TYPES.map(({ key, label }) => (
                <label
                  key={key}
                  className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-primary hover:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    checked={formData.vue_types?.includes(key) || false}
                    onChange={(e) => {
                      const currentVues = formData.vue_types || []
                      const newVues = e.target.checked
                        ? [...currentVues, key]
                        : currentVues.filter(vue => vue !== key)
                      handleChange('section_avis.vue_types', newVues)
                    }}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="text-sm text-gray-900 group-hover:text-primary transition-colors">
                    {label}
                  </span>
                </label>
              ))}
            </div>
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
          <div className="h-20"></div>
        </div>
      </div>
    </div>
  )
}
