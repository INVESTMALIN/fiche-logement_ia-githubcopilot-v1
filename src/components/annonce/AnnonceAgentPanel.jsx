// src/components/annonce/AnnonceAgentPanel.jsx
// Panneau « agent annonce (nouveau) » du parcours coordinateur, inséré dans
// FicheFinalisation sous l'assistant annonce n8n EXISTANT (qui reste le flux
// officiel). Zone de test en conditions réelles, marquée « Dev en cours ».
//
// Périmètre (PR2) : AFFICHAGE + GÉNÉRATION + ÉDITION PAR CONSIGNE. Pas de
// validation, pas de PDF, pas de Monday (PR3).
//
// Cycle indépendant par plateforme (Airbnb / Booking), piloté par l'état déjà
// présent dans agent_outputs :
//   - aucune ligne exploitable → bouton « Générer » ;
//   - une annonce existe → « Annonce créée » + « Voir l'annonce » (volet
//     repliable, fermé par défaut) + « Régénérer » (avec confirmation, car une
//     régénération complète écrase l'annonce et les consignes appliquées).
//   - dans le volet ouvert : zone de consigne pour AJUSTER l'annonce en langage
//     naturel + « Revenir à la version d'origine » (si l'annonce a été éditée).
// À l'ouverture on LIT l'état (SELECT, RLS owner), on n'appelle JAMAIS le modèle
// automatiquement : pas de coût à chaque ouverture. Génération/édition sur clic.

import { useState, useEffect, useRef } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Construction,
  Eye, EyeOff, Info, Loader2, PenTool, RefreshCw, Sparkles, Undo2, UploadCloud, Wand2,
} from 'lucide-react'
import { AnnonceResultat, BookingResultat } from './AnnonceRendu'
import {
  editAnnonce,
  generateAnnonce,
  getAnnonceOutputs,
  MODELES_ANNONCE_COORDINATEUR,
  MODELE_COORDINATEUR_DEFAUT,
  restoreAnnonce,
  validateAnnonce,
} from '../../services/annonceService'
import { buildAnnonceStructuredPdfBase64 } from '../../lib/generateAssistantPDF'

const PLATEFORMES = [
  { id: 'airbnb', label: 'Airbnb' },
  { id: 'booking', label: 'Booking' },
]

// "google/gemini-3-flash-preview" → "Gemini Flash 3" si connu, sinon le suffixe
// lisible (ex. une annonce produite via l'outil d'inspection avec un modèle hors
// liste coordinateur, lisible par l'owner via RLS).
function libelleModele(id) {
  if (!id) return '—'
  const connu = MODELES_ANNONCE_COORDINATEUR.find((m) => m.id === id)
  return connu ? connu.label : id.split('/').pop()
}

function formatDateHeure(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

// Une ligne agent_outputs est « affichable » si la génération a réussi (statut
// non-erreur) et qu'une sortie assemblée existe. Une ligne en `erreur` (sortie
// nulle, conservée pour debug) est traitée comme « pas encore d'annonce ».
function aUneAnnonce(row) {
  return !!row && row.statut !== 'erreur' && !!row.output_assemble
}

// Une annonce est « éditée » si sa dernière opération est une consigne (marqueur
// generation_meta.edition, posé par annonce-edit, retiré par un retour à
// l'origine). Pilote le libellé « Modifié le » et le bouton « Revenir à l'origine ».
function estEditee(row) {
  return !!row?.generation_meta?.edition
}

// Une annonce est « validée » (= poussée sur Monday et à jour) quand son statut
// vaut `valide`. Toute mutation (consigne, régénération, retour origine) réécrit
// `genere` côté serveur → ce flag retombe seul, et « Synchronisé sur Monday »
// disparaît : « validé » veut toujours dire « ce qui est sur Monday = l'annonce actuelle ».
function estValidee(row) {
  return row?.statut === 'valide'
}

export default function AnnonceAgentPanel({ ficheId, pdfMetadata }) {
  const [panelOpen, setPanelOpen] = useState(true)
  const [modele, setModele] = useState(MODELE_COORDINATEUR_DEFAUT)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [outputs, setOutputs] = useState({}) // { airbnb?: row, booking?: row }

  const [genError, setGenError] = useState({}) // { [plateforme]: string }
  const [voletOpen, setVoletOpen] = useState({}) // { [plateforme]: bool }
  const [confirmRegen, setConfirmRegen] = useState({}) // { [plateforme]: bool }

  // Édition par consigne (par plateforme).
  const [consigne, setConsigne] = useState({}) // { [plateforme]: string }
  const [editError, setEditError] = useState({}) // { [plateforme]: string }

  // Validation (push Monday) par plateforme.
  const [confirmRevalidate, setConfirmRevalidate] = useState({}) // { [plateforme]: bool }
  const [validateError, setValidateError] = useState({}) // { [plateforme]: string }

  // UNE SEULE action mutante à la fois par plateforme. Générer, régénérer,
  // appliquer une consigne, revenir à l'origine et VALIDER (push Monday) touchent
  // tous la MÊME ligne agent_outputs : les laisser partir en parallèle ferait
  // courir deux écritures qui se télescopent. `action` pilote le rendu (libellés +
  // désactivation centralisée via `occupe`) ; `enVolRef` est le verrou SYNCHRONE
  // qui empêche un second départ même avant le prochain re-render (double-clic,
  // action croisée pendant un appel en vol).
  const [action, setAction] = useState({}) // { [plateforme]: 'generation'|'edition'|'retour'|'validation' }
  const enVolRef = useRef({}) // { [plateforme]: bool }

  // Lecture de l'état à l'ouverture : SELECT seul, jamais d'appel modèle. Le flag
  // `actif` jette une réponse arrivée après démontage / changement de fiche.
  useEffect(() => {
    let actif = true
    if (!ficheId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError('')
    getAnnonceOutputs(ficheId).then((res) => {
      if (!actif) return
      setLoading(false)
      if (!res.ok) {
        setLoadError(res.message)
        return
      }
      setOutputs(res.outputs || {})
    })
    return () => { actif = false }
  }, [ficheId])

  // Succès génération/édition/retour : la réponse a la même forme qu'une ligne
  // table (output_assemble + generation_meta) → on la stocke et on déroule le
  // volet. La réponse Edge porte `generated_at` dans generation_meta (pas en
  // colonne top-level comme la ligne relue) ; on le normalise pour que l'en-tête
  // « Généré/Modifié le… » s'affiche à l'identique au frais et après rechargement.
  const appliquerResultat = (plateforme, res) => {
    setOutputs((o) => ({ ...o, [plateforme]: { ...res, generated_at: res.generation_meta?.generated_at } }))
    setVoletOpen((v) => ({ ...v, [plateforme]: true }))
  }

  // Verrou : démarre une action mutante seulement si AUCUNE n'est déjà en vol sur
  // cette plateforme (test + pose du verrou synchrones, donc atomiques côté UI).
  // Une action mutante supplante aussi une confirmation (régénération / revalidation) pendante.
  const lancerAction = (plateforme, type) => {
    if (enVolRef.current[plateforme]) return false
    enVolRef.current[plateforme] = true
    setAction((a) => ({ ...a, [plateforme]: type }))
    setConfirmRegen((c) => ({ ...c, [plateforme]: false }))
    setConfirmRevalidate((c) => ({ ...c, [plateforme]: false }))
    return true
  }
  const cloreAction = (plateforme) => {
    enVolRef.current[plateforme] = false
    setAction((a) => ({ ...a, [plateforme]: null }))
  }

  const handleGenerer = async (plateforme) => {
    if (!lancerAction(plateforme, 'generation')) return
    setGenError((e) => ({ ...e, [plateforme]: '' }))
    const res = await generateAnnonce({ ficheId, plateforme, modele })
    cloreAction(plateforme)
    if (!res.ok) {
      setGenError((e) => ({ ...e, [plateforme]: res.message }))
      return
    }
    appliquerResultat(plateforme, res)
  }

  // Régénération : confirmation en deux temps. Une régénération complète repart
  // de la fiche et écrase l'annonce actuelle (et les consignes déjà appliquées) ;
  // distincte de « Revenir à l'origine » (restaure la 1re version, sans modèle).
  const demanderRegeneration = (plateforme) =>
    setConfirmRegen((c) => ({ ...c, [plateforme]: true }))
  const annulerRegeneration = (plateforme) =>
    setConfirmRegen((c) => ({ ...c, [plateforme]: false }))

  const handleAppliquerConsigne = async (plateforme) => {
    const texte = (consigne[plateforme] || '').trim()
    if (!texte) return
    if (!lancerAction(plateforme, 'edition')) return
    setEditError((e) => ({ ...e, [plateforme]: '' }))
    const res = await editAnnonce({ ficheId, plateforme, modele, consigne: texte })
    cloreAction(plateforme)
    if (!res.ok) {
      setEditError((e) => ({ ...e, [plateforme]: res.message }))
      return
    }
    appliquerResultat(plateforme, res)
    setConsigne((c) => ({ ...c, [plateforme]: '' })) // consigne appliquée → champ vidé
  }

  const handleRevenirOrigine = async (plateforme) => {
    if (!lancerAction(plateforme, 'retour')) return
    setEditError((e) => ({ ...e, [plateforme]: '' }))
    const res = await restoreAnnonce({ ficheId, plateforme })
    cloreAction(plateforme)
    if (!res.ok) {
      setEditError((e) => ({ ...e, [plateforme]: res.message }))
      return
    }
    appliquerResultat(plateforme, res)
  }

  // Validation = fabrication du PDF (front) + push Monday (Edge Function). Première
  // validation : direct. Revalidation (statut déjà `valide`) : passe par une
  // confirmation inline d'abord (on remplace le doc déjà sur Monday).
  const demanderRevalidation = (plateforme) =>
    setConfirmRevalidate((c) => ({ ...c, [plateforme]: true }))
  const annulerRevalidation = (plateforme) =>
    setConfirmRevalidate((c) => ({ ...c, [plateforme]: false }))

  const handleValider = async (plateforme) => {
    if (!lancerAction(plateforme, 'validation')) return
    setValidateError((e) => ({ ...e, [plateforme]: '' }))
    try {
      const row = outputs[plateforme]
      // PDF fabriqué côté front (jsPDF, header Letahost) puis transmis en base64.
      // Étape synchrone qui peut lever → try/finally pour toujours relâcher le verrou.
      const pdfBase64 = buildAnnonceStructuredPdfBase64({
        outputAssemble: row?.output_assemble,
        plateforme,
        metadata: { ...(pdfMetadata || {}), generated_at: row?.generated_at },
      })
      const res = await validateAnnonce({ ficheId, plateforme, pdfBase64 })
      if (!res.ok) {
        setValidateError((e) => ({ ...e, [plateforme]: res.message }))
        return
      }
      // Push Monday OK → statut `valide` (on ne retouche que le statut, pas le contenu).
      setOutputs((o) => ({ ...o, [plateforme]: { ...o[plateforme], statut: 'valide' } }))
    } catch (err) {
      setValidateError((e) => ({ ...e, [plateforme]: `Fabrication du PDF impossible : ${err?.message || err}` }))
    } finally {
      cloreAction(plateforme)
    }
  }

  const toggleVolet = (plateforme) =>
    setVoletOpen((v) => ({ ...v, [plateforme]: !v[plateforme] }))

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-purple-300 p-6 mb-6">
      {/* En-tête repliable (button = phrasing content uniquement → spans, pas h3) */}
      <button
        type="button"
        onClick={() => setPanelOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <PenTool className="w-5 h-5 text-white" />
          </span>
          <span className="block">
            <span className="block text-lg font-semibold text-gray-900">Agent annonce (nouveau)</span>
            <span className="block text-sm text-gray-600">Génération et ajustement Airbnb et Booking via le nouvel agent IA.</span>
          </span>
        </span>
        {panelOpen
          ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
      </button>

      {panelOpen && (
        <div className="mt-5 space-y-5">
          {/* Bandeau DEV — même idiome que le bloc Loomky */}
          <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg flex items-start gap-3">
            <Construction className="w-6 h-6 text-yellow-900 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-900">DEV EN COURS</p>
              <p className="text-xs text-yellow-800 mt-1">
                Phase de test : vous pouvez générer, ajuster et relire le résultat, mais le flux officiel reste l'assistant annonce ci-dessus.
              </p>
            </div>
          </div>

          {/* Sélecteur de modèle partagé + recommandations figées */}
          <div>
            <label htmlFor="annonce-modele" className="block text-sm font-semibold text-gray-900 mb-2">Modèle</label>
            <select
              id="annonce-modele"
              value={modele}
              onChange={(e) => setModele(e.target.value)}
              className="w-full sm:w-72 rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {MODELES_ANNONCE_COORDINATEUR.map((m) => (
                <option key={m.id} value={m.id}>{m.label}{m.defaut ? ' (par défaut)' : ''}</option>
              ))}
            </select>
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              {MODELES_ANNONCE_COORDINATEUR.map((m) => (
                <li key={m.id}>
                  <span className="font-medium text-gray-800">{m.label}{m.defaut ? ' (par défaut)' : ''}</span> : {m.note}
                </li>
              ))}
            </ul>
          </div>

          {/* Pas de fiche enregistrée → on ne peut pas cibler agent_outputs */}
          {!ficheId && (
            <p className="text-sm text-gray-600">Enregistrez la fiche pour générer une annonce.</p>
          )}

          {/* Lecture de l'état */}
          {ficheId && loading && (
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" /> Lecture de l'état des annonces…
            </p>
          )}
          {ficheId && loadError && (
            <p className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {loadError}
            </p>
          )}

          {/* Zones par plateforme — cycles indépendants */}
          {ficheId && !loading && !loadError && (
            <div className="space-y-4">
              {PLATEFORMES.map(({ id, label }) => {
                const row = outputs[id]
                const existe = aUneAnnonce(row)
                const editee = existe && estEditee(row)
                const valide = existe && estValidee(row)
                const typeAction = action[id] || null
                const enCours = typeAction === 'generation'
                const enEdition = typeAction === 'edition'
                const enRetour = typeAction === 'retour'
                const enValidation = typeAction === 'validation'
                // `occupe` = une action mutante est en vol sur cette plateforme →
                // désactive TOUTES les actions mutantes (anti-concurrence centralisée).
                const occupe = !!typeAction
                const ouvert = !!voletOpen[id]
                const confirmation = !!confirmRegen[id]
                const confirmationRevalidation = !!confirmRevalidate[id]
                return (
                  <div key={id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900">{label}</span>
                      {existe && (
                        <span className="flex items-center gap-2 flex-wrap">
                          {/* Vert = l'annonce existe ; Bleu = elle est partie sur Monday. Deux états distincts. */}
                          <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Annonce créée
                          </span>
                          {valide && (
                            <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-1.5">
                              <UploadCloud className="w-4 h-4" /> Synchronisé sur Monday
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {existe && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateHeure(row.generated_at) ? `${editee ? 'Modifié le' : 'Généré le'} ${formatDateHeure(row.generated_at)} · ` : ''}
                        modèle {libelleModele(row.modele)}
                      </p>
                    )}

                    {genError[id] && (
                      <p className="mt-3 flex items-start gap-2 text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{genError[id]} <span className="text-red-500/80">(réessayable)</span></span>
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      {existe ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleVolet(id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-purple-700 border border-purple-300 hover:bg-purple-50 transition-colors"
                          >
                            {ouvert ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {ouvert ? 'Masquer l\'annonce' : 'Voir l\'annonce'}
                          </button>
                          <button
                            type="button"
                            onClick={() => demanderRegeneration(id)}
                            disabled={occupe}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            {enCours ? 'Régénération…' : 'Régénérer'}
                          </button>
                          {/* Valider = PDF + push Monday. Bleu (identité « synchro Monday »).
                              Déjà validé → « Revalider » en secondaire, avec confirmation (écrase le doc Monday). */}
                          <button
                            type="button"
                            onClick={() => (valide ? demanderRevalidation(id) : handleValider(id))}
                            disabled={occupe}
                            className={valide
                              ? 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-blue-700 border border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                              : 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'}
                          >
                            {enValidation ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                            {enValidation ? 'Validation…' : (valide ? 'Revalider' : 'Valider')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleGenerer(id)}
                          disabled={occupe}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {enCours ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                          {enCours ? 'Génération…' : 'Générer'}
                        </button>
                      )}
                    </div>

                    {/* Confirmation de régénération (écrase l'annonce + les consignes) */}
                    {confirmation && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            La régénération repart de la fiche et remplace l'annonce actuelle{editee ? ', y compris les consignes que vous avez appliquées' : ''}. Le point de retour sera réinitialisé sur cette nouvelle version.
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => handleGenerer(id)}
                            disabled={occupe}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RefreshCw className="w-4 h-4" /> Régénérer quand même
                          </button>
                          <button
                            type="button"
                            onClick={() => annulerRegeneration(id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Confirmation de revalidation (un doc est déjà sur Monday, on l'écrase) */}
                    {confirmationRevalidation && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            Un document est déjà synchronisé sur Monday pour cette plateforme. Revalider va le remplacer par l'annonce actuelle.
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => handleValider(id)}
                            disabled={occupe}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <UploadCloud className="w-4 h-4" /> Revalider quand même
                          </button>
                          <button
                            type="button"
                            onClick={() => annulerRevalidation(id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}

                    {validateError[id] && (
                      <p className="mt-3 flex items-start gap-2 text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{validateError[id]} <span className="text-red-500/80">(l'annonce reste non synchronisée)</span></span>
                      </p>
                    )}

                    {enValidation && (
                      <p className="mt-2 text-xs text-gray-500">Fabrication du PDF et envoi sur Monday…</p>
                    )}

                    {enCours && (
                      <p className="mt-2 text-xs text-gray-500">L'appel modèle prend une quinzaine de secondes…</p>
                    )}

                    {/* Volet repliable : rendu de l'annonce, puis édition par consigne en bas */}
                    {existe && ouvert && (
                      <div className="mt-4 space-y-4">
                        {/* Rendu de l'annonce (lecture seule, sans cadrage ni méta) */}
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          {id === 'booking'
                            ? <BookingResultat data={row} showCadrage={false} showMeta={false} />
                            : <AnnonceResultat data={row} showCadrage={false} showMeta={false} />}
                        </div>

                        {/* Zone de consigne — édition en langage naturel (en bas : on lit l'annonce, puis on l'ajuste) */}
                        <div className="bg-purple-50/60 rounded-lg p-4 border border-purple-200">
                          <label htmlFor={`consigne-${id}`} className="block text-sm font-semibold text-gray-900 mb-1.5">
                            Modifier l'annonce avec une consigne
                          </label>
                          <textarea
                            id={`consigne-${id}`}
                            value={consigne[id] || ''}
                            onChange={(e) => setConsigne((c) => ({ ...c, [id]: e.target.value }))}
                            rows={3}
                            disabled={occupe}
                            placeholder="Ex. : supprime la mention des verres à vin. Ou : insiste un peu plus sur la terrasse."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60"
                          />
                          <p className="mt-1.5 text-xs text-gray-500 flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>
                              La consigne ajuste l'annonce à partir de sa version actuelle : le point visé change, mais d'autres formulations peuvent légèrement évoluer. Les mentions légales et de conformité (réglementation, caméra, notes d'état et de quartier) ne sont pas modifiables par une consigne.
                            </span>
                          </p>

                          {editError[id] && (
                            <p className="mt-2 flex items-start gap-2 text-sm text-red-700">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{editError[id]} <span className="text-red-500/80">(l'annonce actuelle est conservée)</span></span>
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <button
                              type="button"
                              onClick={() => handleAppliquerConsigne(id)}
                              disabled={occupe || !(consigne[id] || '').trim()}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {enEdition ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                              {enEdition ? 'Application…' : 'Appliquer la consigne'}
                            </button>

                            {editee && (
                              <button
                                type="button"
                                onClick={() => handleRevenirOrigine(id)}
                                disabled={occupe}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {enRetour ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                                {enRetour ? 'Restauration…' : 'Revenir à la version d\'origine'}
                              </button>
                            )}
                          </div>

                          {enEdition && (
                            <p className="mt-2 text-xs text-gray-500">L'appel modèle prend une quinzaine de secondes…</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
