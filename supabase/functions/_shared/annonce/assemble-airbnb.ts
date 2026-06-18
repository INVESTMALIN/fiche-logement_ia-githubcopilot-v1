// Assemblage de la sortie Airbnb : prose du modèle (7 champs) + blocs assemblés
// PAR LE CODE (jamais demandés au modèle). Source de vérité :
//   - structure : docs/agent-annonce/schema-sortie-airbnb-agent-annonce.md
//   - phrases   : docs/agent-annonce/phrases-code-injectees-airbnb.md (reprises
//                 verbatim ; validation finale d'Olga en attente, on les prend
//                 telles quelles pour ce premier jet).
//
// Les déclencheurs viennent de la zone `code` du contrat (CodeZone) — valeurs
// d'énumération réelles de la fiche (section_avis). Cas POSITIFS = aucune
// injection (le modèle reste maître de la prose).

import type { CodeZone } from './types.ts'

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// ───────────────────── Sortie du modèle (7 champs de prose) ─────────────────────

export interface AirbnbModelOutput {
  titres: string[]
  description: string
  logement: string
  acces_voyageurs: string
  quartier: string
  comment_se_deplacer: string
  autres_remarques: string
}

const TITRES_ATTENDUS = 3
const CHAMPS_TEXTE = [
  'description',
  'logement',
  'acces_voyageurs',
  'quartier',
  'comment_se_deplacer',
  'autres_remarques',
] as const

/**
 * Résultat de la validation de forme : succès (7 champs propres) ou rejet, avec
 * la raison ET la sortie brute préservée. On ne lève pas et on ne normalise
 * JAMAIS en champs vides : une forme invalide est une erreur de génération que
 * l'appelant persiste en statut `erreur` (réessayable, inspectable), pas un
 * faux succès silencieux.
 */
export type ModelOutputResult =
  | { ok: true; value: AirbnbModelOutput }
  | { ok: false; reason: string; brut: unknown }

/**
 * Récupère la valeur JSON de PREMIER NIVEAU de la sortie modèle, sans jamais
 * aller pêcher du JSON niché dans une structure ni dans de la prose. On ne force
 * pas response_format (agnostique du modèle), mais on ferme le parsing par
 * construction plutôt que par heuristique.
 *
 * Contrat (volontairement étroit) — deux seuls enrobages acceptés :
 *   1) un JSON nu, éventuellement entouré d'espaces / sauts de ligne ;
 *   2) un JSON dans UNE fence markdown qui couvre TOUT le contenu (```json … ```).
 * Dans les deux cas on parse la chaîne ENTIÈRE : la nature de premier niveau est
 * exactement celle rendue par le modèle (la validation de forme rejette ensuite
 * tout ce qui n'est pas un objet). Aucune découpe par accolades, aucune fence
 * cherchée « quelque part » → impossible de transformer un tableau/scalaire
 * enrobé en objet, ni d'extraire un objet niché.
 *
 * Compromis assumé : la prose libre collée à un JSON (« Voici la sortie : {…} »)
 * est rejetée — sortie hors contrat (le prompt interdit tout texte autour), à
 * régénérer. On garde seulement la fence-qui-couvre-tout, écart courant et sans
 * ambiguïté.
 */
function parseTopLevelJson(content: string): { ok: true; value: unknown } | { ok: false; reason: string } {
  let t = (content || '').trim()
  // Fence ANCRÉE début/fin : ne matche que si elle enveloppe l'intégralité du
  // contenu. Une fence nichée (ex. à l'intérieur d'un tableau) ne matche pas.
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fence) t = fence[1].trim()
  try {
    return { ok: true, value: JSON.parse(t) }
  } catch (e) {
    return { ok: false, reason: `JSON de premier niveau non parsable (${msg(e)})` }
  }
}

/**
 * Condition EXHAUSTIVE de validité de FORME (pas de qualité : ni longueurs cibles
 * ni style, traités ailleurs). Renvoie la raison du rejet, ou null si valide.
 * Forme valide = un objet (ni null ni tableau) ; `titres` = tableau d'exactement
 * 3 chaînes non vides ; les 6 champs texte présents, de type chaîne, non vides.
 * Ferme toute la classe des sorties mal formées (enveloppe, vide, tableau, champ
 * manquant ou vide, mauvais type, mauvais nombre de titres) d'un seul tenant.
 */
function raisonFormeInvalide(value: unknown): string | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return 'objet JSON attendu (ni null, ni tableau)'
  }
  const o = value as Record<string, unknown>
  if (!Array.isArray(o.titres)) return 'titres absent ou non-tableau'
  if (o.titres.length !== TITRES_ATTENDUS) return `titres: ${TITRES_ATTENDUS} attendus, ${o.titres.length} reçu(s)`
  if (!o.titres.every((t) => typeof t === 'string' && t.trim() !== '')) {
    return 'titres: chaque titre doit être une chaîne non vide'
  }
  for (const champ of CHAMPS_TEXTE) {
    const v = o[champ]
    if (typeof v !== 'string') return `champ ${champ} absent ou non-chaîne`
    if (v.trim() === '') return `champ ${champ} vide`
  }
  return null
}

/**
 * Parse + valide la FORME de la sortie modèle (les 7 champs de prose attendus).
 * Toute forme non conforme → { ok:false, reason, brut } (sortie brute conservée
 * pour inspection), jamais de normalisation silencieuse en champs vides.
 */
export function parseModelOutput(content: string): ModelOutputResult {
  const parsed = parseTopLevelJson(content)
  if (!parsed.ok) return { ok: false, reason: `sortie modèle invalide: ${parsed.reason}`, brut: content }
  const raison = raisonFormeInvalide(parsed.value)
  if (raison) return { ok: false, reason: `forme invalide: ${raison}`, brut: parsed.value }
  const o = parsed.value as Record<string, unknown>
  return {
    ok: true,
    value: {
      titres: o.titres as string[],
      description: o.description as string,
      logement: o.logement as string,
      acces_voyageurs: o.acces_voyageurs as string,
      quartier: o.quartier as string,
      comment_se_deplacer: o.comment_se_deplacer as string,
      autres_remarques: o.autres_remarques as string,
    },
  }
}

// ───────────────────── Blocs assemblés par le code ─────────────────────

/** Template conciergerie constant (jamais généré). */
export const ECHANGES_VOYAGEURS_AIRBNB =
  'Nous assurons des échanges fluides via la plateforme de réservation Airbnb. Nous restons disponibles avant, pendant et après votre venue pour tout besoin ou demande complémentaire.'

// Caméra extérieure : disclosure OBLIGATOIRE (Airbnb impose la déclaration des
// caméras extérieures). Le modèle ne voit jamais le signal caméra (filtré hors
// zone modèle par le mapper), donc personne ne la mentionne sans cette injection
// déterministe à l'assemblage. Wording validé par Julien (le doc des phrases
// laissait cette mention en arbitrage, sans verbatim).
export const CAMERA_EXTERIEURE_DISCLOSURE =
  "Une caméra de surveillance est installée à l'extérieur du logement."

// note_etat — état du logement (verdict de la grille). Positif = rien.
const NOTE_ETAT_LOGEMENT: Record<string, string> = {
  etat_moyen:
    "Notre logement a traversé le temps, avec quelques petites marques d'usage, mais nous l'avons pensé pour vous offrir un cadre chaleureux et pratique.",
  etat_degrade:
    "Notre logement n'est pas neuf, il a traversé les années, avec du mobilier et des installations marqués par le temps mais ce logement nous est cher et nous sommes convaincu qu'il saura vous plaire",
  tres_mauvais_etat:
    "Ce logement n'est pas tout neuf, mais il a une âme. C'est un vrai lieu de vie, avec quelques traces du temps ici ou là, rien de gênant, juste des marques d'authenticité. Si vous cherchez un endroit impeccable comme un hôtel, ce n'est peut-être pas ce qu'il vous faut. Mais si vous aimez les lieux chaleureux, simples et pleins de caractère, vous vous y sentirez bien.",
}

// note_etat — état de l'immeuble.
const NOTE_ETAT_IMMEUBLE_MAUVAIS =
  "L'immeuble est ancien, avec son charme et ses petites imperfections. Vous pourriez croiser des murs marqués ou une peinture un peu passée. Ce n'est pas du neuf, mais c'est vivant, simple, et agréable à vivre. On préfère le dire avec honnêteté, pour que vous réserviez avec les bonnes attentes."
const NOTE_ETAT_IMMEUBLE_SALE =
  "Même si les espaces communs peuvent manquer de soin, l'appartement reste agréable et fonctionnel pour votre séjour."
const NOTE_ETAT_NON_PMR = "Le logement n'est pas accessible aux personnes PMR"

// note_quartier.
// Quartier défavorisé : 3 variantes au choix du coordinateur — la fiche ne
// stocke pas (encore) ce choix, on retient une variante par défaut neutre.
const NOTE_QUARTIER_DEFAVORISE =
  "Un quartier en évolution, offrant une expérience simple et authentique de la vie locale."
const NOTE_QUARTIER_SECURITE =
  'Le logement se situe dans un quartier dynamique. Pour votre confort, nous vous recommandons toutefois de rester vigilant dans certaines zones environnantes.'

export interface MentionsReglementaires {
  numero_enregistrement: string
  dpe_classe: string
  mention_consommation_excessive: string
  estimation_depenses_annuelles: string
}

const CLASSES_EXCESSIVES = new Set(['F', 'G'])

function formatEuro(n: number): string {
  try {
    return new Intl.NumberFormat('fr-FR').format(n)
  } catch {
    return String(n)
  }
}

/** Conformité légale, zéro reformulation. Mention F/G uniquement. */
export function buildMentionsReglementaires(code: CodeZone): MentionsReglementaires {
  const r = code.reglementation
  const classe = (r.classe_dpe || '').trim().toUpperCase()
  const excessive = CLASSES_EXCESSIVES.has(classe)
  let estimation = ''
  if (excessive && r.dpe_depenses_min != null && r.dpe_depenses_max != null) {
    estimation = `Estimation des dépenses annuelles d'énergie : entre ${formatEuro(r.dpe_depenses_min)} € et ${formatEuro(r.dpe_depenses_max)} €.`
  }
  return {
    numero_enregistrement: r.numero_declaration || '',
    dpe_classe: r.classe_dpe || '',
    mention_consommation_excessive: excessive ? 'Logement à consommation énergétique excessive' : '',
    estimation_depenses_annuelles: estimation,
  }
}

/** Disclosure état physique : cas négatifs seulement, sinon chaîne vide. */
export function buildNoteEtat(code: CodeZone): string {
  const t = code.note_etat_triggers
  const parts: string[] = []
  const verdict = t.grille_verdict
  if (verdict && verdict in NOTE_ETAT_LOGEMENT) parts.push(NOTE_ETAT_LOGEMENT[verdict])
  if (t.immeuble_etat_general === 'mauvais_etat') parts.push(NOTE_ETAT_IMMEUBLE_MAUVAIS)
  if (t.immeuble_proprete === 'sale') parts.push(NOTE_ETAT_IMMEUBLE_SALE)
  // Non-PMR : immeuble inaccessible OU accessibilité PMR explicitement à false.
  if (t.immeuble_accessibilite === 'inaccessible' || t.pmr_accessible === false) parts.push(NOTE_ETAT_NON_PMR)
  // Niveau sonore très bruyant : AUCUNE phrase canon → rien (décision du doc).
  return parts.join(' ')
}

/** Disclosure quartier : cas négatifs seulement, sinon chaîne vide. */
export function buildNoteQuartier(code: CodeZone): string {
  const q = code.note_quartier_triggers
  const parts: string[] = []
  if (q.quartier_defavorise) parts.push(NOTE_QUARTIER_DEFAVORISE)
  if (q.quartier_securite === 'modere' || q.quartier_securite === 'zone_risques') parts.push(NOTE_QUARTIER_SECURITE)
  if (q.quartier_perturbations === 'perturbateur') {
    const detail = (q.quartier_perturbations_details || '').trim()
    // Template : on n'injecte que si l'élément précis est décrit (sinon vide de sens).
    if (detail) parts.push(`Il est important de souligner que le logement se situe à proximité de ${detail}.`)
  }
  return parts.join(' ')
}

/**
 * Réinjecte la disclosure caméra extérieure en fin d'`autres_remarques` (le
 * prompt v1 place le signalement des caméras dans ce bloc). Phrase verbatim,
 * uniquement si la fiche signale une caméra extérieure ; sinon le texte du
 * modèle est renvoyé inchangé.
 */
function withCameraDisclosure(autresRemarques: string, code: CodeZone): string {
  if (!code.cameras.exterieures) return autresRemarques
  const base = (autresRemarques || '').trim()
  return base ? `${base} ${CAMERA_EXTERIEURE_DISCLOSURE}` : CAMERA_EXTERIEURE_DISCLOSURE
}

/**
 * Drapeau de conformité (purement informatif, hors texte d'annonce) : une caméra
 * intérieure signalée n'est JAMAIS mentionnée dans l'annonce (catégorie interdite
 * par Airbnb depuis avril 2024), mais on en lève un signal pour traçabilité. Le
 * champ est nommé largement : il couvre toute caméra intérieure signalée (le cas
 * réel n'étant pas forcément un espace commun). Le statut de génération reste normal.
 */
export interface Conformite {
  camera_interieure_signalee: boolean
}

export function buildConformite(code: CodeZone): Conformite {
  return { camera_interieure_signalee: code.cameras.interieures_communs === true }
}

// ───────────────────── Assemblage final ─────────────────────

export interface AirbnbAssembled {
  airbnb: {
    titres: string[]
    nombre_voyageurs: number | null
    description: string
    logement: string
    acces_voyageurs: string
    echanges_voyageurs: string
    quartier: string
    comment_se_deplacer: string
    autres_remarques: string
    mentions_reglementaires: MentionsReglementaires
    note_etat: string
    note_quartier: string
  }
}

/**
 * Merge la prose du modèle et les blocs code en l'objet de sortie complet
 * (cf. schema-sortie-airbnb-agent-annonce.md). Le modèle ne fournit jamais les
 * champs assemblés ici (passthrough, template, réglementation, disclosures).
 */
export function assembleAirbnbOutput(model: AirbnbModelOutput, code: CodeZone): AirbnbAssembled {
  return {
    airbnb: {
      titres: model.titres,
      nombre_voyageurs: code.nombre_voyageurs,
      description: model.description,
      logement: model.logement,
      acces_voyageurs: model.acces_voyageurs,
      echanges_voyageurs: ECHANGES_VOYAGEURS_AIRBNB,
      quartier: model.quartier,
      comment_se_deplacer: model.comment_se_deplacer,
      // Disclosure caméra extérieure réinjectée ici (le modèle ne la voit jamais).
      autres_remarques: withCameraDisclosure(model.autres_remarques, code),
      mentions_reglementaires: buildMentionsReglementaires(code),
      note_etat: buildNoteEtat(code),
      note_quartier: buildNoteQuartier(code),
    },
  }
}
