// src/pages/FicheInstructionsMenage.jsx
//
// 🧹 Section "Instructions Ménage" — informations destinées au prestataire de ménage.
//
// Ces trois blocs vivaient historiquement dans la section Avis, qui n'est pas rendue
// dans le PDF ménage : le prestataire ne voyait donc jamais le type de premier ménage
// ni la vidéo de l'état du logement, alors que ce sont exactement les informations dont
// il a besoin avant sa première intervention.
//
// ⚠️ EXCEPTION DE NOMMAGE ASSUMÉE : les champs restent persistés dans les colonnes
// `avis_*` de la table `fiches` (aucune migration, cf. supabaseHelpers.js).
//
// ⚠️ CONFIDENTIALITÉ : les contacts de maintenance saisis ici sont destinés au
// concierge, PAS au prestataire. Ils sont explicitement filtrés du PDF ménage
// (cf. MENAGE_EXCLUDED_FIELDS dans PDFMenageTemplate.jsx).
import React, { useMemo, useState, useEffect } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'
import { TYPES_PASSAGE, TYPES_MAINTENANCE } from '../lib/avisGrilleHelpers'
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

export default function FicheInstructionsMenage() {
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

  // Statut global de la fiche (cette page travaille sur formData scope
  // section_instructions_menage ci-dessous, donc on récupère le statut séparément).
  const ficheStatut = getField('statut')

  // État local du bouton "Synchroniser" — empêche les doubles clics et
  // affiche un loader pendant l'aller-retour Edge Function.
  const [isSyncingContacts, setIsSyncingContacts] = useState(false)

  const formData = getField('section_instructions_menage')

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

  const setTypePassage = (kind, value) => {
    const field = kind === 'menage' ? 'type_premier_menage' : 'type_premiere_maintenance'
    handleChange(`section_instructions_menage.${field}`, value)
  }

  // 🔧 Contacts de maintenance — toggle racine + CRUD sur la liste.
  // On passe le tableau entier à updateField (cohérent avec quartier_types,
  // logement_ambiance, etc.) car le helper FormContext.updateField ne sait pas
  // muter un élément d'array via dot-path.
  const toggleContactsMaintenance = (checked) => {
    if (checked) {
      handleChange('section_instructions_menage.a_contacts_maintenance', true)
    } else {
      handleChange('section_instructions_menage.a_contacts_maintenance', false)
      handleChange('section_instructions_menage.contacts_maintenance', [])
    }
  }

  const addContactMaintenance = () => {
    const current = formData.contacts_maintenance || []
    handleChange('section_instructions_menage.contacts_maintenance', [
      ...current,
      { ...EMPTY_CONTACT_MAINTENANCE, _localId: generateLocalId() }
    ])
  }

  const removeContactMaintenance = (index) => {
    const current = formData.contacts_maintenance || []
    handleChange(
      'section_instructions_menage.contacts_maintenance',
      current.filter((_, i) => i !== index)
    )
  }

  const updateContactMaintenance = (index, field, value) => {
    const current = formData.contacts_maintenance || []
    const next = current.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    handleChange('section_instructions_menage.contacts_maintenance', next)
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

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        <div className="flex-1 p-6 bg-muted/50">
          <h1 className="text-2xl font-bold mb-6">Instructions Ménage</h1>

          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Ce que le prestataire va recevoir</h2>
            <p className="text-sm leading-relaxed">
              Cette section alimente la fiche ménage transmise au prestataire avant sa première
              intervention. Filme les points sensibles, dépose la vidéo de l'état du logement et
              indique le type de premier passage nécessaire.
            </p>
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
              fieldPath="section_instructions_menage.logement_etat_videos"
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
                      className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${active
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
                      className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${active
                        ? 'bg-primary text-accent border-primary'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:bg-primary/5 hover:text-primary'
                        }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>

              {/* 📇 Contacts de maintenance fournis par le propriétaire
                  ⚠️ Destinés au concierge uniquement — jamais rendus dans le PDF ménage. */}
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
                    <p className="text-xs text-text-muted italic">
                      🔒 Ces coordonnées sont réservées au concierge : elles n'apparaissent pas
                      dans la fiche ménage transmise au prestataire.
                    </p>

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
