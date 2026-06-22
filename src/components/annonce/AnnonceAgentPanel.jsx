// src/components/annonce/AnnonceAgentPanel.jsx
// Panneau « agent annonce (nouveau) » du parcours coordinateur, inséré dans
// FicheFinalisation sous l'assistant annonce n8n EXISTANT (qui reste le flux
// officiel). Zone de test en conditions réelles, marquée « Dev en cours ».
//
// Périmètre (PR 1) : AFFICHAGE + GÉNÉRATION seulement. Pas d'édition, pas de
// validation, pas de PDF, pas de Monday (PRs suivantes).
//
// Cycle indépendant par plateforme (Airbnb / Booking), piloté par l'état déjà
// présent dans agent_outputs :
//   - aucune ligne exploitable → bouton « Générer » ;
//   - une annonce existe → « Annonce créée » + « Voir l'annonce » (volet
//     repliable, fermé par défaut) + « Régénérer ».
// À l'ouverture on LIT l'état (SELECT, RLS owner), on n'appelle JAMAIS le modèle
// automatiquement : pas de coût à chaque ouverture. Génération sur clic explicite.

import { useState, useEffect } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Construction,
  Eye, EyeOff, Loader2, PenTool, RefreshCw, Sparkles,
} from 'lucide-react'
import { AnnonceResultat, BookingResultat } from './AnnonceRendu'
import {
  generateAnnonce,
  getAnnonceOutputs,
  MODELES_ANNONCE_COORDINATEUR,
  MODELE_COORDINATEUR_DEFAUT,
} from '../../services/annonceService'

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

export default function AnnonceAgentPanel({ ficheId }) {
  const [panelOpen, setPanelOpen] = useState(true)
  const [modele, setModele] = useState(MODELE_COORDINATEUR_DEFAUT)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [outputs, setOutputs] = useState({}) // { airbnb?: row, booking?: row }

  const [generating, setGenerating] = useState({}) // { [plateforme]: bool }
  const [genError, setGenError] = useState({}) // { [plateforme]: string }
  const [voletOpen, setVoletOpen] = useState({}) // { [plateforme]: bool }

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

  const handleGenerer = async (plateforme) => {
    if (generating[plateforme]) return
    setGenerating((g) => ({ ...g, [plateforme]: true }))
    setGenError((e) => ({ ...e, [plateforme]: '' }))
    const res = await generateAnnonce({ ficheId, plateforme, modele })
    setGenerating((g) => ({ ...g, [plateforme]: false }))
    if (!res.ok) {
      setGenError((e) => ({ ...e, [plateforme]: res.message }))
      return
    }
    // Succès : la réponse a la même forme qu'une ligne table (output_assemble +
    // generation_meta) → on la stocke et on déroule le volet (clic explicite,
    // l'utilisateur veut voir ce qu'il vient de générer). NB : la réponse Edge
    // porte `generated_at` dans generation_meta (pas en colonne top-level comme
    // la ligne table relue) ; on le normalise pour que l'en-tête « Généré le… »
    // s'affiche à l'identique au frais et après rechargement.
    setOutputs((o) => ({ ...o, [plateforme]: { ...res, generated_at: res.generation_meta?.generated_at } }))
    setVoletOpen((v) => ({ ...v, [plateforme]: true }))
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
            <span className="block text-sm text-gray-600">Génération Airbnb et Booking via le nouvel agent IA.</span>
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
                Phase de test : vous pouvez générer et relire le résultat, mais le flux officiel reste l'assistant annonce ci-dessus.
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
                const enCours = !!generating[id]
                const ouvert = !!voletOpen[id]
                return (
                  <div key={id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900">{label}</span>
                      {existe && (
                        <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Annonce créée
                        </span>
                      )}
                    </div>

                    {existe && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateHeure(row.generated_at) ? `Généré le ${formatDateHeure(row.generated_at)} · ` : ''}
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
                            onClick={() => handleGenerer(id)}
                            disabled={enCours}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            {enCours ? 'Régénération…' : 'Régénérer'}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleGenerer(id)}
                          disabled={enCours}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {enCours ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                          {enCours ? 'Génération…' : 'Générer'}
                        </button>
                      )}
                    </div>

                    {enCours && (
                      <p className="mt-2 text-xs text-gray-500">L'appel modèle prend une quinzaine de secondes…</p>
                    )}

                    {/* Volet repliable : l'annonce n'est jamais affichée par défaut */}
                    {existe && ouvert && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
                        {id === 'booking'
                          ? <BookingResultat data={row} showCadrage={false} showMeta={false} />
                          : <AnnonceResultat data={row} showCadrage={false} showMeta={false} />}
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
