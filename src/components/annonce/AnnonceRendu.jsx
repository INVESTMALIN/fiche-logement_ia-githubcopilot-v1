// src/components/annonce/AnnonceRendu.jsx
// Rendu partagé d'une annonce générée (agent annonce), réutilisé par :
//   - la mini-UI d'inspection super_admin (/annonce-inspection),
//   - le panneau « agent annonce » du parcours coordinateur (FicheFinalisation).
// Source unique du rendu en blocs aérés (charte gold/ink), pour ne pas diverger.
//
// `data` = soit la réponse de generateAnnonce, soit une ligne agent_outputs : les
// deux exposent la même forme { output_assemble: { airbnb|booking }, generation_meta }.
//
// Deux extras propres à l'inspection, désactivables par prop :
//   - showCadrage : lignes de cadrage QA sous chaque titre (défaut true) ;
//   - showMeta    : pied de page coût / tokens / latence (défaut true).
// Le coordinateur (lecture seule, hors contexte d'audit) les passe à false.

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
    "Généré par le modèle. Prose en blocs par zone : chaque bloc commence par un intitulé court (Séjour, Cuisine, Chambres, Salle de bain, Extérieur, puis équipements spéciaux) suivi d'une vraie prose rédigée, jamais télégraphique, avec une ligne vide entre les blocs. Les intitulés font partie du texte Airbnb (sans emoji) ; n'invente jamais une pièce, un étage ou un niveau.",
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

// ── Champ « logement » : segmentation en blocs par zone ──────────────────────
// Le modèle rend « logement » en blocs (intitulé de zone seul sur sa ligne +
// prose, ligne vide entre blocs) — cf. instruction « Logement » du prompt
// (supabase/functions/_shared/annonce/prompt-airbnb.ts) et son doc miroir
// (docs/agent-annonce/prompt-v1-agent-annonce-airbnb.md). Les intitulés font
// partie du texte Airbnb (sans emoji) ; le front les reconnaît seulement pour
// les styliser en sous-niveau. Liste FERMÉE, à garder synchro avec le prompt.
const INTITULES_ZONE_LOGEMENT = ['Séjour', 'Cuisine', 'Chambres', 'Salle de bain', 'Extérieur', 'Piscine', 'Jacuzzi', 'Sauna']

// Normalisation tolérante pour la reconnaissance : strict sur le fond (égalité
// avec un intitulé connu), souple sur la forme (casse, puce/tiret en tête,
// ponctuation décorative en fin, espaces). On ne déforme jamais le texte affiché.
const normaliserIntitule = (s) =>
  s.trim().toLowerCase().replace(/^[-•*\s]+/, '').replace(/[\s.:]+$/u, '').replace(/\s+/g, ' ')

// Variantes acceptées en plus des canoniques (pluriel/singulier courants), filet
// de sécurité si le modèle dévie légèrement malgré la consigne d'intitulés exacts.
const INTITULES_ZONE_RECONNUS = new Set([
  ...INTITULES_ZONE_LOGEMENT.map(normaliserIntitule),
  'salle de bains',
  'chambre',
])

// Une ligne est un intitulé de zone si, normalisée, elle EST exactement l'un des
// intitulés connus (garde-fou de longueur contre un faux positif sur de la prose).
// Renvoie le libellé original (trimmé), pour un affichage fidèle au texte réel.
function intituleZone(ligne) {
  const t = ligne.trim()
  if (!t || t.length > 40) return null
  return INTITULES_ZONE_RECONNUS.has(normaliserIntitule(t)) ? t : null
}

// Découpe « logement » en blocs { titre, texte }. Parcours ligne à ligne : une
// ligne reconnue comme intitulé ouvre un bloc, les suivantes forment sa prose.
// Tout texte avant le premier intitulé — ou la totalité si AUCUN intitulé n'est
// reconnu — devient un bloc sans titre, rendu en prose simple (comportement
// historique préservé : on ne casse jamais l'affichage, même si le modèle dévie).
function decouperLogement(texte) {
  const blocs = []
  let courant = null
  for (const ligne of (texte || '').split('\n')) {
    const titre = intituleZone(ligne)
    if (titre) {
      if (courant) blocs.push(courant)
      courant = { titre, lignes: [] }
    } else {
      if (!courant) courant = { titre: null, lignes: [] }
      courant.lignes.push(ligne)
    }
  }
  if (courant) blocs.push(courant)
  return blocs
    .map((b) => ({ titre: b.titre, texte: b.lignes.join('\n').trim() }))
    .filter((b) => b.titre || b.texte)
}

// Rendu du champ « logement » en blocs par zone. L'intitulé de zone est un
// SOUS-NIVEAU sous le titre de section doré : encre semibold, casse normale,
// filet doré à gauche — hiérarchie nette sans concurrencer le doré uppercase des
// sections. Sans intitulé reconnu, on retombe sur un simple paragraphe (legacy).
function LogementBlocs({ texte }) {
  const blocs = decouperLogement(texte)
  return (
    <div className="space-y-5">
      {blocs.map((b, i) =>
        b.titre ? (
          <div key={i} className="border-l-2 border-primary/60 pl-3">
            <h4 className="text-sm font-semibold text-text mb-1.5">{b.titre}</h4>
            {b.texte && <p className="text-text leading-relaxed whitespace-pre-line">{b.texte}</p>}
          </div>
        ) : (
          <p key={i} className="text-text leading-relaxed whitespace-pre-line">{b.texte}</p>
        ),
      )}
    </div>
  )
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

export function AnnonceResultat({ data, showCadrage = true, showMeta = true }) {
  const a = data?.output_assemble?.airbnb
  const meta = data?.generation_meta || {}
  if (!a) return null

  const mentions = mentionsLignes(a.mentions_reglementaires)
  const titres = Array.isArray(a.titres) ? a.titres : []

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
      <Bloc titre="Propositions de titre" aide={showCadrage && CADRAGE.titres} visible={titres.length > 0}>
        <ol className="space-y-2.5">
          {titres.map((t, i) => (
            <li key={i} className="flex gap-3 items-baseline">
              <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
              <span className="text-text font-medium">{t}</span>
            </li>
          ))}
        </ol>
      </Bloc>

      <Bloc titre="Capacité" aide={showCadrage && CADRAGE.capacite} visible={typeof a.nombre_voyageurs === 'number'}>
        <Texte>{a.nombre_voyageurs} voyageurs</Texte>
      </Bloc>

      <Bloc titre="Description" aide={showCadrage && CADRAGE.description} visible={hasText(a.description)}>
        <Texte>{a.description}</Texte>
      </Bloc>

      <Bloc titre="Le logement" aide={showCadrage && CADRAGE.logement} visible={hasText(a.logement)}>
        <LogementBlocs texte={a.logement} />
      </Bloc>

      <Bloc titre="Accès des voyageurs" aide={showCadrage && CADRAGE.acces} visible={hasText(a.acces_voyageurs)}>
        <Texte>{a.acces_voyageurs}</Texte>
      </Bloc>

      <Bloc titre="Échanges voyageurs" aide={showCadrage && CADRAGE.echanges} visible={hasText(a.echanges_voyageurs)}>
        <Texte>{a.echanges_voyageurs}</Texte>
      </Bloc>

      <Bloc titre="Le quartier" aide={showCadrage && CADRAGE.quartier} visible={hasText(a.quartier)}>
        <Texte>{a.quartier}</Texte>
      </Bloc>

      <Bloc titre="Comment se déplacer" aide={showCadrage && CADRAGE.deplacements} visible={hasText(a.comment_se_deplacer)}>
        <Texte>{a.comment_se_deplacer}</Texte>
      </Bloc>

      <Bloc titre="Autres remarques" aide={showCadrage && CADRAGE.autres} visible={hasText(a.autres_remarques)}>
        <Texte>{a.autres_remarques}</Texte>
      </Bloc>

      <Bloc titre="Mentions réglementaires" aide={showCadrage && CADRAGE.mentions} visible={mentions.length > 0}>
        <ul className="space-y-1.5">
          {mentions.map((m, i) => <li key={i} className="text-text">{m}</li>)}
        </ul>
      </Bloc>

      <Bloc titre="Note sur l'état" aide={showCadrage && CADRAGE.note_etat} visible={hasText(a.note_etat)}>
        <Texte>{a.note_etat}</Texte>
      </Bloc>

      <Bloc titre="Note sur le quartier" aide={showCadrage && CADRAGE.note_quartier} visible={hasText(a.note_quartier)}>
        <Texte>{a.note_quartier}</Texte>
      </Bloc>

      {showMeta && <MetaFooter meta={meta} />}
    </article>
  )
}

// Rendu Booking : on ne rédige pas une annonce, on remplit une fiche. Nom + 3
// champs profil (dont about_host posé par le code) + blocs déterministes
// (réglementation, note état/quartier, déclaration caméra).
export function BookingResultat({ data, showCadrage = true, showMeta = true }) {
  const b = data?.output_assemble?.booking
  const meta = data?.generation_meta || {}
  if (!b) return null

  const mentions = mentionsLignes(b.mentions_reglementaires)

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
      <Bloc titre="Nom de l'hébergement" aide={showCadrage && CADRAGE_BOOKING.nom} visible={hasText(b.nom)}>
        <Texte>{b.nom}</Texte>
        <p className="text-xs text-text-muted mt-1">{b.nom.length} caractères (limite Booking : 3 à 255)</p>
      </Bloc>

      <Bloc titre="About the property" aide={showCadrage && CADRAGE_BOOKING.about_property} visible={hasText(b.about_property)}>
        <Texte>{b.about_property}</Texte>
        <p className="text-xs text-text-muted mt-1">{b.about_property.length} caractères (cible ~2000)</p>
      </Bloc>

      <Bloc titre="About the neighbourhood" aide={showCadrage && CADRAGE_BOOKING.about_neighbourhood} visible={hasText(b.about_neighbourhood)}>
        <Texte>{b.about_neighbourhood}</Texte>
      </Bloc>

      <Bloc titre="About the host" aide={showCadrage && CADRAGE_BOOKING.about_host} visible={hasText(b.about_host)}>
        <Texte>{b.about_host}</Texte>
      </Bloc>

      <Bloc titre="Mentions réglementaires" aide={showCadrage && CADRAGE.mentions} visible={mentions.length > 0}>
        <ul className="space-y-1.5">
          {mentions.map((m, i) => <li key={i} className="text-text">{m}</li>)}
        </ul>
      </Bloc>

      <Bloc titre="Note sur l'état" aide={showCadrage && CADRAGE.note_etat} visible={hasText(b.note_etat)}>
        <Texte>{b.note_etat}</Texte>
      </Bloc>

      <Bloc titre="Note sur le quartier" aide={showCadrage && CADRAGE.note_quartier} visible={hasText(b.note_quartier)}>
        <Texte>{b.note_quartier}</Texte>
      </Bloc>

      <Bloc titre="Caméra (déclaration)" aide={showCadrage && CADRAGE_BOOKING.note_camera} visible={hasText(b.note_camera)}>
        <Texte>{b.note_camera}</Texte>
      </Bloc>

      {showMeta && <MetaFooter meta={meta} />}
    </article>
  )
}
