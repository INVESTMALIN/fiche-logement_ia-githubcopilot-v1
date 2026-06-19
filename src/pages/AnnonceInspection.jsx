// src/pages/AnnonceInspection.jsx
// Mini-UI d'inspection des annonces générées (brique 2, agent annonce). Outil
// interne en développement : on choisit une fiche (par numéro de bien), une
// plateforme (Airbnb ou Booking) et un modèle (comparaison), on appelle l'Edge
// Function annonce-generate, et on lit la sortie assemblée dans une mise en page
// soignée (charte gold/ink). Accès réservé super_admin (route).
//
// Deux rendus distincts selon la plateforme : Airbnb (annonce complète) et
// Booking (fiche : nom + 3 champs profil + blocs déterministes).

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Hammer, Loader2, Search, Sparkles } from 'lucide-react'
import { useLatestRef } from '../hooks/useLatestRef'
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

// Lignes de cadrage par section — contenu STATIQUE de présentation (pas calculé,
// ne dépend pas de l'annonce générée). Rappellent l'intention et les règles clés
// de chaque section pour juger la qualité / repérer un écart du modèle. Extraites
// fidèlement du prompt v1 (docs/agent-annonce/prompt-v1-agent-annonce-airbnb.md)
// et du schéma de sortie (schema-sortie-airbnb-agent-annonce.md) ; distillées à
// l'essentiel, jamais réinventées.
const CADRAGE = {
  titres:
    "Généré par le modèle. 3 propositions de 28 à 45 caractères (cible 37-43), combinant typologie, signal d'ambiance et ancrage géographique (ville + quartier, ou ville + distance à un point d'intérêt). Ni emoji, ni majuscules intégrales, ni prix ou capacité.",
  capacite: 'Recopié de la fiche (capacité maximale) — passthrough, pas généré par le modèle.',
  description:
    "Généré par le modèle. Résumé en prose de 380 à 470 caractères (cible 430-450) ; doit faire figurer la surface en m², la typologie, la capacité exacte et la ville.",
  logement:
    "Généré par le modèle. Prose fluide organisée par zone (séjour, cuisine, salle de bain, chambres, extérieur, équipements spéciaux), sans découpage rigide pièce par pièce ; n'invente jamais une pièce, un étage ou un niveau.",
  acces:
    "Généré par le modèle. Étage et mode d'accès (escalier ou ascenseur), arrivée autonome et stationnement ; jamais l'emplacement de la boîte à clés, jamais d'étage inventé.",
  echanges:
    'Texte constant posé par le système (template conciergerie), identique pour tous les biens — pas rédigé par le modèle.',
  quartier:
    "Généré par le modèle. Ambiance positive et points d'intérêt réels uniquement ; ne traite jamais la sécurité, les nuisances ni le caractère socio-économique (gérés par la note de quartier).",
  deplacements:
    "Généré par le modèle à partir des seuls faits de localisation (points d'intérêt et distances réels) ; n'invente jamais un lieu ni une distance. Vide si la localisation est indisponible.",
  autres:
    "Généré par le modèle. Règles internes habillées en phrases (animaux, fumeur, fêtes, horaires de tranquillité 22h-8h) et équipements de sécurité présents, caméras comprises.",
  mentions:
    'Assemblé par le système à partir de la fiche (numéro d\'enregistrement, classe DPE) — conformité légale, zéro reformulation par le modèle.',
  note_etat:
    "Posée de façon déterministe par le système : phrases approuvées de divulgation de l'état physique, uniquement dans les cas négatifs. Pas rédigée par le modèle.",
  note_quartier:
    'Posée de façon déterministe par le système : phrases approuvées sur le quartier (sécurité, nuisances, secteur), uniquement dans les cas négatifs. Pas rédigée par le modèle.',
}

// Bloc d'annonce : masqué si non visible (champ vide → pas de bloc disgracieux).
// `aide` = ligne de cadrage discrète sous le titre (gris atténué), facultative.
function Bloc({ titre, aide, visible = true, children }) {
  if (!visible) return null
  return (
    <section className="mb-8">
      <SectionTitre>{titre}</SectionTitre>
      {aide && <p className="text-xs italic text-text-muted leading-snug mb-3 max-w-2xl">{aide}</p>}
      {children}
    </section>
  )
}

function Texte({ children }) {
  return <p className="text-text leading-relaxed whitespace-pre-line">{children}</p>
}

// Lignes de cadrage propres aux champs Booking (cf. cadrage-annonce-booking-2026.md
// et schema-sortie-booking-agent-annonce.md). Distillées à l'essentiel.
const CADRAGE_BOOKING = {
  nom:
    "Généré par le modèle, puis validé et corrigé par le système. 3 à 255 caractères, combine type + capacité + atout + lieu ; uniquement les caractères tolérés par Booking (lettres, chiffres et ! # & ' \" - ,), jamais en majuscules intégrales, pas plus de 5 chiffres consécutifs.",
  about_property:
    "Généré par le modèle (~2000 caractères). Couvre les 7 dimensions d'avis (propreté, confort, emplacement, personnel, équipements, rapport qualité-prix, wifi) en faits concrets, ton hôtelier rassurant. Pas de storytelling façon Airbnb, pas d'adjectif vague non quantifié.",
  about_neighbourhood:
    "Généré par le modèle à partir des seuls faits de localisation (quartier, transports, points d'intérêt), ton positif. Vide si la localisation est indisponible.",
  about_host:
    'Texte constant posé par le système (template conciergerie), identique pour tous les biens — pas rédigé par le modèle. Reformulation à venir.',
  note_camera:
    "Posée par le système : déclaration légale d'une caméra extérieure si la fiche en signale une (obligation Booking comme Airbnb). Caméra intérieure jamais affichée.",
}

// Pied de page commun : infos de génération discrètes (modèle, coût, tokens…).
function MetaFooter({ meta }) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-muted">
      <span>Modèle servi : <span className="font-medium text-text">{meta.modele_servi || '—'}</span></span>
      <span>Coût : <span className="font-medium text-text">{formatCout(meta.cout_usd)}</span></span>
      <span>
        Tokens : {formatTokens(meta.tokens?.entree)} entrée / {formatTokens(meta.tokens?.sortie)} sortie
      </span>
      <span>Latence : {typeof meta.latence_ms === 'number' ? `${meta.latence_ms} ms` : '—'}</span>
      {meta.localisation?.statut && <span>Localisation : {meta.localisation.statut}</span>}
    </div>
  )
}

// Mentions réglementaires → liste de lignes affichables (partagé Airbnb/Booking).
function mentionsLignes(mr = {}) {
  return [
    hasText(mr.numero_enregistrement) && `Numéro d'enregistrement : ${mr.numero_enregistrement}`,
    hasText(mr.dpe_classe) && `Classe DPE : ${mr.dpe_classe}`,
    hasText(mr.mention_consommation_excessive) && mr.mention_consommation_excessive,
    hasText(mr.estimation_depenses_annuelles) && mr.estimation_depenses_annuelles,
  ].filter(Boolean)
}

function AnnonceResultat({ data }) {
  const a = data?.output_assemble?.airbnb
  const meta = data?.generation_meta || {}
  if (!a) return null

  const mentions = mentionsLignes(a.mentions_reglementaires)
  const titres = Array.isArray(a.titres) ? a.titres : []

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
      <Bloc titre="Propositions de titre" aide={CADRAGE.titres} visible={titres.length > 0}>
        <ol className="space-y-2.5">
          {titres.map((t, i) => (
            <li key={i} className="flex gap-3 items-baseline">
              <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
              <span className="text-text font-medium">{t}</span>
            </li>
          ))}
        </ol>
      </Bloc>

      <Bloc titre="Capacité" aide={CADRAGE.capacite} visible={typeof a.nombre_voyageurs === 'number'}>
        <Texte>{a.nombre_voyageurs} voyageurs</Texte>
      </Bloc>

      <Bloc titre="Description" aide={CADRAGE.description} visible={hasText(a.description)}>
        <Texte>{a.description}</Texte>
      </Bloc>

      <Bloc titre="Le logement" aide={CADRAGE.logement} visible={hasText(a.logement)}>
        <Texte>{a.logement}</Texte>
      </Bloc>

      <Bloc titre="Accès des voyageurs" aide={CADRAGE.acces} visible={hasText(a.acces_voyageurs)}>
        <Texte>{a.acces_voyageurs}</Texte>
      </Bloc>

      <Bloc titre="Échanges voyageurs" aide={CADRAGE.echanges} visible={hasText(a.echanges_voyageurs)}>
        <Texte>{a.echanges_voyageurs}</Texte>
      </Bloc>

      <Bloc titre="Le quartier" aide={CADRAGE.quartier} visible={hasText(a.quartier)}>
        <Texte>{a.quartier}</Texte>
      </Bloc>

      <Bloc titre="Comment se déplacer" aide={CADRAGE.deplacements} visible={hasText(a.comment_se_deplacer)}>
        <Texte>{a.comment_se_deplacer}</Texte>
      </Bloc>

      <Bloc titre="Autres remarques" aide={CADRAGE.autres} visible={hasText(a.autres_remarques)}>
        <Texte>{a.autres_remarques}</Texte>
      </Bloc>

      <Bloc titre="Mentions réglementaires" aide={CADRAGE.mentions} visible={mentions.length > 0}>
        <ul className="space-y-1.5">
          {mentions.map((m, i) => <li key={i} className="text-text">{m}</li>)}
        </ul>
      </Bloc>

      <Bloc titre="Note sur l'état" aide={CADRAGE.note_etat} visible={hasText(a.note_etat)}>
        <Texte>{a.note_etat}</Texte>
      </Bloc>

      <Bloc titre="Note sur le quartier" aide={CADRAGE.note_quartier} visible={hasText(a.note_quartier)}>
        <Texte>{a.note_quartier}</Texte>
      </Bloc>

      <MetaFooter meta={meta} />
    </article>
  )
}

// Rendu Booking : on ne rédige pas une annonce, on remplit une fiche. Nom + 3
// champs profil (dont about_host posé par le code) + blocs déterministes
// (réglementation, note état/quartier, déclaration caméra).
function BookingResultat({ data }) {
  const b = data?.output_assemble?.booking
  const meta = data?.generation_meta || {}
  if (!b) return null

  const mentions = mentionsLignes(b.mentions_reglementaires)

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
      <Bloc titre="Nom de l'hébergement" aide={CADRAGE_BOOKING.nom} visible={hasText(b.nom)}>
        <Texte>{b.nom}</Texte>
        <p className="text-xs text-text-muted mt-1">{b.nom.length} caractères (limite Booking : 3 à 255)</p>
      </Bloc>

      <Bloc titre="About the property" aide={CADRAGE_BOOKING.about_property} visible={hasText(b.about_property)}>
        <Texte>{b.about_property}</Texte>
        <p className="text-xs text-text-muted mt-1">{b.about_property.length} caractères (cible ~2000)</p>
      </Bloc>

      <Bloc titre="About the neighbourhood" aide={CADRAGE_BOOKING.about_neighbourhood} visible={hasText(b.about_neighbourhood)}>
        <Texte>{b.about_neighbourhood}</Texte>
      </Bloc>

      <Bloc titre="About the host" aide={CADRAGE_BOOKING.about_host} visible={hasText(b.about_host)}>
        <Texte>{b.about_host}</Texte>
      </Bloc>

      <Bloc titre="Mentions réglementaires" aide={CADRAGE.mentions} visible={mentions.length > 0}>
        <ul className="space-y-1.5">
          {mentions.map((m, i) => <li key={i} className="text-text">{m}</li>)}
        </ul>
      </Bloc>

      <Bloc titre="Note sur l'état" aide={CADRAGE.note_etat} visible={hasText(b.note_etat)}>
        <Texte>{b.note_etat}</Texte>
      </Bloc>

      <Bloc titre="Note sur le quartier" aide={CADRAGE.note_quartier} visible={hasText(b.note_quartier)}>
        <Texte>{b.note_quartier}</Texte>
      </Bloc>

      <Bloc titre="Caméra (déclaration)" aide={CADRAGE_BOOKING.note_camera} visible={hasText(b.note_camera)}>
        <Texte>{b.note_camera}</Texte>
      </Bloc>

      <MetaFooter meta={meta} />
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
