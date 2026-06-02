import React, { useMemo, useState, useEffect } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'
import {
  GRILLE_CRITERES,
  SECURITE_DANGERS,
  TYPES_PASSAGE,
  TYPES_MAINTENANCE,
  computeGrilleStats
} from '../lib/avisGrilleHelpers'
import { pickContactsToPush } from '../services/mondayContactsService'

// Liste fermée des activités de maintenance (libellés métier figés, alignés
// sur la future remontée Monday — ne pas modifier sans validation produit).
const ACTIVITES_MAINTENANCE = [
  'Electricité',
  'Plomberie',
  'Serrurerie',
  'Jardinerie / Paysagisme',
  'Multi-Services / Homme à tout faire',
  'Anti nuisibles',
  'Autres'
]

const EMPTY_CONTACT_MAINTENANCE = {
  nom_prenom: '',
  societe: '',
  activite: '',
  telephone: '',
  email: '',
  commentaire: ''
}

// Identifiant technique stable du contact, persisté dans le JSONB. Sert
// d'ancre pour l'idempotence de la remontée Monday (cf. mondayContactsService) :
// l'Edge Function patche le monday_item_id sur le contact via ce _localId.
// crypto.randomUUID requires un contexte sécurisé (HTTPS ou localhost) —
// fallback minimal sinon, suffisant car cet ID n'est jamais cryptographique.
const generateLocalId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

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
    mondayContactsToast,
    clearMondayContactsToast,
    syncContactsToMondayManual,
  } = useForm()

  // Statut global de la fiche (FicheAvis travaille sur formData scope
  // section_avis ci-dessous, donc on récupère le statut séparément).
  const ficheStatut = getField('statut')

  // État local du bouton "Synchroniser" — empêche les doubles clics et
  // affiche un loader pendant l'aller-retour Edge Function.
  const [isSyncingContacts, setIsSyncingContacts] = useState(false)

  const formData = getField('section_avis')
  const atouts = formData.atouts_logement || {}
  const voyageurs = formData.types_voyageurs || {}

  const handleChange = (field, value) => updateField(field, value)

  const [checklistOpen, setChecklistOpen] = useState(false)

  // Auto-dismiss du toast Monday Contacts au bout de 10s. Le user peut aussi
  // le fermer manuellement. On clear l'état partagé dans FormContext pour
  // qu'il ne re-apparaisse pas en re-rendant.
  useEffect(() => {
    if (!mondayContactsToast) return
    const t = setTimeout(() => clearMondayContactsToast(), 10000)
    return () => clearTimeout(t)
  }, [mondayContactsToast, clearMondayContactsToast])

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

  const setTypePassage = (kind, value) => {
    const field = kind === 'menage' ? 'type_premier_menage' : 'type_premiere_maintenance'
    handleChange(`section_avis.${field}`, value)
  }

  // 🔧 Contacts de maintenance — toggle racine + CRUD sur la liste.
  // On passe le tableau entier à updateField (cohérent avec quartier_types,
  // logement_ambiance, etc.) car le helper FormContext.updateField ne sait pas
  // muter un élément d'array via dot-path.
  const toggleContactsMaintenance = (checked) => {
    if (checked) {
      handleChange('section_avis.a_contacts_maintenance', true)
    } else {
      handleChange('section_avis.a_contacts_maintenance', false)
      handleChange('section_avis.contacts_maintenance', [])
    }
  }

  const addContactMaintenance = () => {
    const current = formData.contacts_maintenance || []
    handleChange('section_avis.contacts_maintenance', [
      ...current,
      { ...EMPTY_CONTACT_MAINTENANCE, _localId: generateLocalId() }
    ])
  }

  const removeContactMaintenance = (index) => {
    const current = formData.contacts_maintenance || []
    handleChange(
      'section_avis.contacts_maintenance',
      current.filter((_, i) => i !== index)
    )
  }

  const updateContactMaintenance = (index, field, value) => {
    const current = formData.contacts_maintenance || []
    const next = current.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    handleChange('section_avis.contacts_maintenance', next)
  }

  // Contacts éligibles au push Monday (mêmes critères que côté service :
  // nom_prenom + telephone + activite renseignés, _localId présent, pas de
  // monday_item_id). Utilisé pour conditionner la visibilité du bouton
  // "Synchroniser" et son libellé.
  const contactsToPushCount = useMemo(
    () => pickContactsToPush(formData.contacts_maintenance || []).length,
    [formData.contacts_maintenance]
  )

  // Bouton visible uniquement post-finalisation ET s'il y a au moins un
  // contact à synchroniser. En brouillon, la sync se fera automatiquement à
  // la finalisation, donc pas de bouton (UI épurée).
  const canSyncContactsToMonday =
    ficheStatut === 'Complété' &&
    formData.a_contacts_maintenance === true &&
    contactsToPushCount > 0

  const handleSyncContactsToMonday = async () => {
    if (isSyncingContacts) return
    setIsSyncingContacts(true)
    try {
      await syncContactsToMondayManual()
      // Succès → les badges apparaissent automatiquement sur les contacts
      // qui ont reçu un monday_item_id (patch state local côté FormContext).
      // Échec → mondayContactsToast est déjà set par _pushContactsCore et le
      // mini-toast d'erreur existant l'affichera.
    } finally {
      setIsSyncingContacts(false)
    }
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
                    Décrire l'élément perturbateur (ex : bruit de discothèque, odeurs de cuisine d'un restaurant, circulation dense etc)
                  </label>
                  <textarea
                    className="w-full p-3 border rounded"
                    rows="3"
                    placeholder="Décrivez précisément l'élément perturbateur..."
                    value={formData.quartier_perturbations_details || ''}
                    onChange={(e) => handleChange('section_avis.quartier_perturbations_details', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <h2 className="text-base font-semibold mb-4">Évaluation de l'immeuble</h2>

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
            <div className="mb-4">
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
                            className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              checked ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary hover:bg-primary/5'
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
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${
                    grilleStats.verdict ? verdictPalette[grilleStats.verdict] : 'bg-white/20 text-white'
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
                    className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-lg cursor-pointer text-sm transition-colors ${
                      checked ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-primary hover:bg-primary/5'
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

          {/* 📋 Pense-bête pliable */}
          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <button
              type="button"
              className="w-full flex justify-between items-center text-left"
              onClick={() => setChecklistOpen(o => !o)}
              aria-expanded={checklistOpen}
            >
              <span className="flex items-center gap-3">
                <span className="text-lg">📋</span>
                <span>
                  <span className="block text-base font-semibold">Points sensibles à filmer</span>
                  <span className="block text-xs text-text-muted mt-0.5">Pense-bête : ce qu'il faut absolument capturer dans la vidéo</span>
                </span>
              </span>
              <span className={`text-xl text-text-muted transition-transform ${checklistOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {checklistOpen && (
              <div className="mt-5 pt-5 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Colonne Ménage */}
                <div>
                  <h3 className="text-sm font-semibold pb-2 mb-3 border-b border-gray-200">🧹 Ménage</h3>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Logement de manière général</p>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">
                    Mobilier <span className="font-normal text-text-muted">(derrière, au-dessus, à l'intérieur si poussière)</span>
                  </p>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Cuisine :</p>
                  <ul className="ml-5 list-disc text-xs text-text-muted space-y-0.5">
                    <li>État de l'évier et robinetterie</li>
                    <li>Four et micro-ondes</li>
                    <li>Hotte et filtre</li>
                    <li>Réfrigérateur / congélateur (moisissures ?)</li>
                    <li>État des placards</li>
                  </ul>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Salle de bain :</p>
                  <ul className="ml-5 list-disc text-xs text-text-muted space-y-0.5">
                    <li>Cuvette des WC stable et fonctionnelle</li>
                    <li>Cabine de douche / carrelage</li>
                    <li>Joints / moisissures</li>
                    <li>Siphons qui évacuent bien</li>
                  </ul>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Linge :</p>
                  <ul className="ml-5 list-disc text-xs text-text-muted space-y-0.5">
                    <li>Draps et serviettes en bon état, non tachés</li>
                  </ul>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Extérieurs :</p>
                  <ul className="ml-5 list-disc text-xs text-text-muted space-y-0.5">
                    <li>Mobilier en bon état</li>
                  </ul>
                </div>
                {/* Colonne Maintenance */}
                <div>
                  <h3 className="text-sm font-semibold pb-2 mb-3 border-b border-gray-200">🔧 Maintenance</h3>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Éclairage : ampoules fonctionnelles</p>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Électricité :</p>
                  <ul className="ml-5 list-disc text-xs text-text-muted space-y-0.5">
                    <li>Prises</li>
                    <li>Interrupteurs</li>
                    <li>Télécommande / TV / Wi-Fi</li>
                  </ul>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Plomberie :</p>
                  <ul className="ml-5 list-disc text-xs text-text-muted space-y-0.5">
                    <li>Fuites sous éviers / WC</li>
                    <li>Pression d'eau</li>
                    <li>Eau chaude</li>
                  </ul>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Chauffage / climatisation opérationnels</p>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Fenêtres / volets / rideaux fonctionnels</p>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Électroménager :</p>
                  <ul className="ml-5 list-disc text-xs text-text-muted space-y-0.5">
                    <li>Lave-linge</li>
                    <li>Lave-vaisselle</li>
                    <li>Cafetière, bouilloire, etc.</li>
                  </ul>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Détecteur de fumée présent et fonctionnel</p>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Mobilier :</p>
                  <ul className="ml-5 list-disc text-xs text-text-muted space-y-0.5">
                    <li>Casse</li>
                    <li>Rayures</li>
                    <li>Mal fixé</li>
                  </ul>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Traces de nuisibles :</p>
                  <ul className="ml-5 list-disc text-xs text-text-muted space-y-0.5">
                    <li>Insectes</li>
                    <li>Humidité</li>
                    <li>Moisissures</li>
                  </ul>
                  <p className="text-xs font-medium text-gray-700 mt-3 mb-1">Murs et plafonds :</p>
                  <ul className="ml-5 list-disc text-xs text-text-muted space-y-0.5">
                    <li>Tâches</li>
                    <li>Trous</li>
                    <li>Fissures</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* 🎥 Vidéo état du logement */}
          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <h2 className="text-base font-semibold mb-1">🎥 Vidéo de l'état du logement</h2>
            <p className="text-sm text-text-muted mb-4">
              Ajoute une ou plusieurs vidéos qui illustrent l'état général du logement (vue d'ensemble, points sensibles, défauts constatés…).
            </p>
            <PhotoUpload
              fieldPath="section_avis.logement_etat_videos"
              label=""
              multiple={true}
              maxFiles={5}
              acceptVideo={true}
            />
          </div>

          {/* 🏷️ Type de 1er passage */}
          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <h2 className="text-base font-semibold mb-1">🏷️ Type de 1er ménage</h2>
            <p className="text-sm text-text-muted mb-4">
              Sur la base de ce que tu as filmé et constaté, indique le type d'intervention nécessaire pour le ménage et la maintenance.
            </p>

            <div className="mb-5">
              <p className="text-sm font-semibold text-gray-700 mb-2">🧹 Ménage</p>
              <div className="flex flex-wrap gap-2">
                {TYPES_PASSAGE.map((opt) => {
                  const active = formData.type_premier_menage === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTypePassage('menage', active ? null : opt)}
                      className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                        active
                          ? 'bg-primary text-accent border-primary'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:bg-primary/5 hover:text-primary'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">🔧 Maintenance</p>
              <div className="flex flex-wrap gap-2">
                {TYPES_MAINTENANCE.map((opt) => {
                  const active = formData.type_premiere_maintenance === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTypePassage('maintenance', active ? null : opt)}
                      className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                        active
                          ? 'bg-primary text-accent border-primary'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:bg-primary/5 hover:text-primary'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>

              {/* 📇 Contacts de maintenance fournis par le propriétaire */}
              <div className="mt-5 pt-5 border-t border-gray-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.a_contacts_maintenance === true}
                    onChange={(e) => toggleContactsMaintenance(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
                  />
                  <span className="text-sm text-gray-900">
                    Le propriétaire a des contacts de maintenance à nous fournir
                  </span>
                </label>

                {formData.a_contacts_maintenance === true && (
                  <div className="mt-4 space-y-4">
                    {(formData.contacts_maintenance || []).length === 0 && (
                      <p className="text-sm text-text-muted italic">
                        Aucun contact saisi pour le moment.
                      </p>
                    )}

                    {(formData.contacts_maintenance || []).map((contact, index) => (
                      <div
                        key={contact._localId || index}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Contact #{index + 1}
                            </span>
                            {contact.monday_item_id && (
                              <span
                                title="Ce contact a été remonté vers le board Monday Artisans / Maintenance"
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200"
                              >
                                <span aria-hidden="true">✓</span>
                                <span>Synchronisé Monday</span>
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeContactMaintenance(index)}
                            className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                          >
                            🗑️ Supprimer
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Nom et prénom
                            </label>
                            <input
                              type="text"
                              className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              value={contact.nom_prenom || ''}
                              onChange={(e) =>
                                updateContactMaintenance(index, 'nom_prenom', e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Société
                            </label>
                            <input
                              type="text"
                              className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              value={contact.societe || ''}
                              onChange={(e) =>
                                updateContactMaintenance(index, 'societe', e.target.value)
                              }
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Activité
                            </label>
                            <select
                              className="w-full p-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              value={contact.activite || ''}
                              onChange={(e) =>
                                updateContactMaintenance(index, 'activite', e.target.value)
                              }
                            >
                              <option value="">— Sélectionner —</option>
                              {ACTIVITES_MAINTENANCE.map((act) => (
                                <option key={act} value={act}>{act}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Téléphone
                            </label>
                            <input
                              type="tel"
                              className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              value={contact.telephone || ''}
                              onChange={(e) =>
                                updateContactMaintenance(index, 'telephone', e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              value={contact.email || ''}
                              onChange={(e) =>
                                updateContactMaintenance(index, 'email', e.target.value)
                              }
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Commentaire
                            </label>
                            <textarea
                              rows="2"
                              className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              value={contact.commentaire || ''}
                              onChange={(e) =>
                                updateContactMaintenance(index, 'commentaire', e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={addContactMaintenance}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-dashed border-primary text-primary hover:bg-primary/5 transition-colors"
                      >
                        <span className="text-lg leading-none">+</span>
                        <span>Ajouter un contact</span>
                      </button>

                      {/* 🟦 Synchronisation manuelle vers Monday — visible uniquement
                          post-finalisation, lorsqu'au moins un contact passe le filtre
                          (nom_prenom + telephone + activite renseignés, pas encore poussé).
                          En brouillon, la sync se fera automatiquement à la finalisation. */}
                      {canSyncContactsToMonday && (
                        <button
                          type="button"
                          onClick={handleSyncContactsToMonday}
                          disabled={isSyncingContacts || saveStatus.saving}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                          <span aria-hidden="true">{isSyncingContacts ? '⏳' : '🟦'}</span>
                          <span>
                            {isSyncingContacts
                              ? 'Synchronisation...'
                              : `Synchroniser ${contactsToPushCount} contact${contactsToPushCount > 1 ? 's' : ''} vers Monday`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
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

      {/* 🟦 Toast Monday Contacts — erreur de sync (fire-and-forget côté FormContext) */}
      {mondayContactsToast?.type === 'error' && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-red-300 bg-white shadow-lg p-4 flex items-start gap-3"
        >
          <span className="text-xl leading-none" aria-hidden="true">⚠️</span>
          <div className="flex-1 text-sm text-gray-800">
            <p className="font-semibold text-red-700 mb-1">
              Sync Monday partielle
            </p>
            <p className="text-gray-700">
              {mondayContactsToast.failedCount === mondayContactsToast.total
                ? `${mondayContactsToast.failedCount} contact${mondayContactsToast.failedCount > 1 ? 's' : ''} n'${mondayContactsToast.failedCount > 1 ? 'ont' : 'a'} pas pu être remonté${mondayContactsToast.failedCount > 1 ? 's' : ''} vers Monday.`
                : `${mondayContactsToast.failedCount}/${mondayContactsToast.total} contacts n'ont pas pu être remontés vers Monday.`}
              {' '}
              <span className="text-gray-600">
                Réessayez en sauvegardant à nouveau la fiche.
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={clearMondayContactsToast}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
