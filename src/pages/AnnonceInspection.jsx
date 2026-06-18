// src/pages/AnnonceInspection.jsx
// Mini-UI d'inspection des annonces générées (brique 2, agent annonce). Outil
// interne en développement : on choisit une fiche (par numéro de bien), une
// plateforme (Airbnb actif, Booking à venir) et un modèle (comparaison), on
// appelle l'Edge Function annonce-generate, et on lit l'annonce assemblée dans
// une mise en page soignée (charte gold/ink). Accès réservé super_admin (route).

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Hammer, Loader2, Search, Sparkles } from 'lucide-react'
import {
  generateAnnonce,
  MODELE_PAR_DEFAUT,
  MODELES_ANNONCE,
  rechercherFichesParNumero,
} from '../services/annonceService'

const hasText = (v) => typeof v === 'string' && v.trim() !== ''

function formatCout(c) {
  if (typeof c !== 'number' || !Number.isFinite(c)) return '—'
  return `$${c.toFixed(4)}`
}

function formatTokens(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('fr-FR') : '?'
}

// Titre de section doré + filet, idiome de la charte maison.
function SectionTitre({ children }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-primary/30 pb-1.5 mb-3">
      {children}
    </h3>
  )
}

// Bloc d'annonce : masqué si non visible (champ vide → pas de bloc disgracieux).
function Bloc({ titre, visible = true, children }) {
  if (!visible) return null
  return (
    <section className="mb-8">
      <SectionTitre>{titre}</SectionTitre>
      {children}
    </section>
  )
}

function Texte({ children }) {
  return <p className="text-text leading-relaxed whitespace-pre-line">{children}</p>
}

function AnnonceResultat({ data }) {
  const a = data?.output_assemble?.airbnb
  const meta = data?.generation_meta || {}
  if (!a) return null

  const mr = a.mentions_reglementaires || {}
  const mentions = [
    hasText(mr.numero_enregistrement) && `Numéro d'enregistrement : ${mr.numero_enregistrement}`,
    hasText(mr.dpe_classe) && `Classe DPE : ${mr.dpe_classe}`,
    hasText(mr.mention_consommation_excessive) && mr.mention_consommation_excessive,
    hasText(mr.estimation_depenses_annuelles) && mr.estimation_depenses_annuelles,
  ].filter(Boolean)

  const titres = Array.isArray(a.titres) ? a.titres : []

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
      <Bloc titre="Propositions de titre" visible={titres.length > 0}>
        <ol className="space-y-2.5">
          {titres.map((t, i) => (
            <li key={i} className="flex gap-3 items-baseline">
              <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
              <span className="text-text font-medium">{t}</span>
            </li>
          ))}
        </ol>
      </Bloc>

      <Bloc titre="Capacité" visible={typeof a.nombre_voyageurs === 'number'}>
        <Texte>{a.nombre_voyageurs} voyageurs</Texte>
      </Bloc>

      <Bloc titre="Description" visible={hasText(a.description)}>
        <Texte>{a.description}</Texte>
      </Bloc>

      <Bloc titre="Le logement" visible={hasText(a.logement)}>
        <Texte>{a.logement}</Texte>
      </Bloc>

      <Bloc titre="Accès des voyageurs" visible={hasText(a.acces_voyageurs)}>
        <Texte>{a.acces_voyageurs}</Texte>
      </Bloc>

      <Bloc titre="Échanges voyageurs" visible={hasText(a.echanges_voyageurs)}>
        <Texte>{a.echanges_voyageurs}</Texte>
      </Bloc>

      <Bloc titre="Le quartier" visible={hasText(a.quartier)}>
        <Texte>{a.quartier}</Texte>
      </Bloc>

      <Bloc titre="Comment se déplacer" visible={hasText(a.comment_se_deplacer)}>
        <Texte>{a.comment_se_deplacer}</Texte>
      </Bloc>

      <Bloc titre="Autres remarques" visible={hasText(a.autres_remarques)}>
        <Texte>{a.autres_remarques}</Texte>
      </Bloc>

      <Bloc titre="Mentions réglementaires" visible={mentions.length > 0}>
        <ul className="space-y-1.5">
          {mentions.map((m, i) => <li key={i} className="text-text">{m}</li>)}
        </ul>
      </Bloc>

      <Bloc titre="Note sur l'état" visible={hasText(a.note_etat)}>
        <Texte>{a.note_etat}</Texte>
      </Bloc>

      <Bloc titre="Note sur le quartier" visible={hasText(a.note_quartier)}>
        <Texte>{a.note_quartier}</Texte>
      </Bloc>

      {/* Infos de génération — discrètes, c'est de l'inspection. */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-muted">
        <span>Modèle servi : <span className="font-medium text-text">{meta.modele_servi || '—'}</span></span>
        <span>Coût : <span className="font-medium text-text">{formatCout(meta.cout_usd)}</span></span>
        <span>
          Tokens : {formatTokens(meta.tokens?.entree)} entrée / {formatTokens(meta.tokens?.sortie)} sortie
        </span>
        <span>Latence : {typeof meta.latence_ms === 'number' ? `${meta.latence_ms} ms` : '—'}</span>
        {meta.localisation?.statut && <span>Localisation : {meta.localisation.statut}</span>}
      </div>
    </article>
  )
}

export default function AnnonceInspection() {
  const [numero, setNumero] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [resultatsRecherche, setResultatsRecherche] = useState(null) // null = pas encore cherché
  const [ficheSelectionnee, setFicheSelectionnee] = useState(null)

  const [plateforme, setPlateforme] = useState('airbnb')
  const [modele, setModele] = useState(MODELE_PAR_DEFAUT)

  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [resultat, setResultat] = useState(null)

  const rechercher = async () => {
    if (!numero.trim() || searching) return
    setSearching(true)
    setSearchError('')
    setResultatsRecherche(null)
    setFicheSelectionnee(null)
    setResultat(null)
    setGenError('')
    const res = await rechercherFichesParNumero(numero)
    setSearching(false)
    if (!res.ok) {
      setSearchError(res.message)
      return
    }
    setResultatsRecherche(res.fiches)
    if (res.fiches.length === 1) setFicheSelectionnee(res.fiches[0])
  }

  const lancerGeneration = async () => {
    if (!ficheSelectionnee || generating || plateforme !== 'airbnb') return
    setGenerating(true)
    setGenError('')
    setResultat(null)
    const res = await generateAnnonce({ ficheId: ficheSelectionnee.id, plateforme, modele })
    setGenerating(false)
    if (!res.ok) {
      setGenError(res.message)
      return
    }
    setResultat(res)
  }

  return (
    <div className="min-h-screen bg-background font-sans text-text">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="flex items-center justify-between gap-4 mb-2">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary transition-colors">
            <ArrowLeft size={16} /> Retour
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1 border border-primary/30">
            <Hammer size={13} /> En développement
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Inspection des annonces</h1>
        <p className="text-text-muted mb-8">
          Génère une annonce à partir d'une fiche et lis le rendu assemblé. Outil interne pour fiabiliser le contenu et comparer les modèles.
        </p>

        {/* Contrôles */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
          {/* 1. Fiche */}
          <label className="block text-sm font-semibold mb-2">Numéro de bien</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && rechercher()}
              placeholder="ex. 1965"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <button
              onClick={rechercher}
              disabled={!numero.trim() || searching}
              className="inline-flex items-center gap-2 rounded-lg bg-text text-white px-4 py-2 text-sm font-medium hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Rechercher
            </button>
          </div>

          {searchError && (
            <p className="mt-3 text-sm text-red-600">{searchError}</p>
          )}

          {resultatsRecherche && resultatsRecherche.length === 0 && !searchError && (
            <p className="mt-3 text-sm text-text-muted">Aucune fiche trouvée pour ce numéro (ou accès refusé).</p>
          )}

          {/* Liste de résultats (si plusieurs, on choisit) */}
          {resultatsRecherche && resultatsRecherche.length > 0 && (
            <div className="mt-3 space-y-2">
              {resultatsRecherche.map((f) => {
                const actif = ficheSelectionnee?.id === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => setFicheSelectionnee(f)}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                      actif ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium">{f.nom || 'Sans nom'}</div>
                    <div className="text-xs text-text-muted">
                      N° {f.logement_numero_bien || '—'}
                      {f.proprietaire_adresse_ville ? ` · ${f.proprietaire_adresse_ville}` : ''}
                      {f.statut ? ` · ${f.statut}` : ''}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* 2. Plateforme + 3. Modèle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Plateforme</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPlateforme('airbnb')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    plateforme === 'airbnb' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 text-text'
                  }`}
                >
                  Airbnb
                </button>
                <button
                  disabled
                  title="Booking n'est pas encore disponible"
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed bg-gray-50"
                >
                  Booking <span className="text-[10px] uppercase">· à venir</span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="modele" className="block text-sm font-semibold mb-2">Modèle</label>
              <select
                id="modele"
                value={modele}
                onChange={(e) => setModele(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                {MODELES_ANNONCE.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Générer */}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={lancerGeneration}
              disabled={!ficheSelectionnee || generating}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-5 py-2.5 font-semibold shadow-sm hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {generating ? 'Génération en cours…' : 'Générer l\'annonce'}
            </button>
            {ficheSelectionnee && !generating && (
              <span className="text-sm text-text-muted">
                Fiche <span className="font-medium text-text">{ficheSelectionnee.nom || ficheSelectionnee.logement_numero_bien}</span> · Airbnb
              </span>
            )}
          </div>
          {generating && (
            <p className="mt-3 text-sm text-text-muted">La génération prend une quinzaine de secondes (appel modèle), merci de patienter…</p>
          )}
        </div>

        {/* Erreur de génération */}
        {genError && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">La génération a échoué</p>
              <p className="text-sm text-red-600 mt-0.5">{genError}</p>
              <p className="text-xs text-red-500/80 mt-1">Tu peux relancer la génération (l'erreur est réessayable).</p>
            </div>
          </div>
        )}

        {/* Résultat */}
        {resultat && <AnnonceResultat data={resultat} />}
      </div>
    </div>
  )
}
