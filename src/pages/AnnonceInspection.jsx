// src/pages/AnnonceInspection.jsx
// Mini-UI d'inspection des annonces générées (brique 2, agent annonce). Outil
// interne en développement : on choisit une fiche (par numéro de bien), une
// plateforme (Airbnb ou Booking) et un modèle (comparaison), on appelle l'Edge
// Function annonce-generate, et on lit la sortie assemblée dans une mise en page
// soignée (charte gold/ink). Accès réservé super_admin (route).
//
// Le rendu en blocs de l'annonce est factorisé dans components/annonce/AnnonceRendu
// (partagé avec le panneau coordinateur de FicheFinalisation). Ici on montre les
// extras d'inspection : lignes de cadrage QA + pied de page coût/tokens (défauts).

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Hammer, Loader2, Search, Sparkles } from 'lucide-react'
import { useLatestRef } from '../hooks/useLatestRef'
import { AnnonceResultat, BookingResultat } from '../components/annonce/AnnonceRendu'
import {
  generateAnnonce,
  MODELE_PAR_DEFAUT,
  MODELES_ANNONCE,
  rechercherFichesParNumero,
} from '../services/annonceService'

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

  // Miroirs synchrones du contexte courant (numéro saisi, fiche, plateforme),
  // lus au RETOUR des appels async pour détecter une réponse périmée : si le
  // contexte a changé pendant l'appel en vol, on jette la réponse. On lit la
  // valeur COURANTE (ref), pas celle capturée à l'envoi (closure périmée).
  const numeroRef = useLatestRef(numero)
  const ficheRef = useLatestRef(ficheSelectionnee)
  const plateformeRef = useLatestRef(plateforme)

  // Changer de fiche remet l'affichage à zéro : on ne lit jamais un résultat (ou
  // une erreur) qui appartiendrait à une autre fiche que la fiche active.
  const selectionnerFiche = (f) => {
    setFicheSelectionnee(f)
    setResultat(null)
    setGenError('')
  }

  // Changer de plateforme remet aussi l'affichage à zéro : c'est un comparateur,
  // on ne montre jamais un résultat d'une plateforme sous l'onglet de l'autre.
  const choisirPlateforme = (p) => {
    setPlateforme(p)
    setResultat(null)
    setGenError('')
  }

  const rechercher = async () => {
    const terme = numero.trim()
    if (!terme || searching) return
    setSearching(true)
    setSearchError('')
    setResultatsRecherche(null)
    setFicheSelectionnee(null)
    setResultat(null)
    setGenError('')
    const res = await rechercherFichesParNumero(terme)
    // Réponse périmée : le numéro saisi a changé pendant la recherche → on jette
    // (on libère quand même l'état "en cours" pour ne pas figer le bouton).
    const perimee = numeroRef.current.trim() !== terme
    setSearching(false)
    if (perimee) return
    if (!res.ok) {
      setSearchError(res.message)
      return
    }
    setResultatsRecherche(res.fiches)
    if (res.fiches.length === 1) selectionnerFiche(res.fiches[0])
  }

  const lancerGeneration = async () => {
    if (!ficheSelectionnee || generating) return
    const ficheIdLance = ficheSelectionnee.id
    const plateformeLancee = plateforme
    setGenerating(true)
    setGenError('')
    setResultat(null)
    const res = await generateAnnonce({ ficheId: ficheIdLance, plateforme: plateformeLancee, modele })
    // Réponse périmée : la fiche OU la plateforme a changé pendant l'appel → on
    // jette (on libère quand même l'état "en cours" pour ne pas figer le bouton).
    const perimee = ficheRef.current?.id !== ficheIdLance || plateformeRef.current !== plateformeLancee
    setGenerating(false)
    if (perimee) return
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
                    onClick={() => selectionnerFiche(f)}
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
                  onClick={() => choisirPlateforme('airbnb')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    plateforme === 'airbnb' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 text-text'
                  }`}
                >
                  Airbnb
                </button>
                <button
                  onClick={() => choisirPlateforme('booking')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    plateforme === 'booking' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 text-text'
                  }`}
                >
                  Booking
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
                Fiche <span className="font-medium text-text">{ficheSelectionnee.nom || ficheSelectionnee.logement_numero_bien}</span>
                {' · '}{plateforme === 'booking' ? 'Booking' : 'Airbnb'}
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

        {/* Résultat — rendu distinct selon la plateforme. */}
        {resultat && (resultat.plateforme === 'booking'
          ? <BookingResultat data={resultat} />
          : <AnnonceResultat data={resultat} />)}
      </div>
    </div>
  )
}
