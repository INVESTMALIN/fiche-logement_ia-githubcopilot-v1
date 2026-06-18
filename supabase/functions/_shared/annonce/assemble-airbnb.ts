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

const asString = (v: unknown): string => (typeof v === 'string' ? v : '')
const asStringArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/**
 * Extrait l'objet JSON de la sortie brute du modèle, tolérant aux fences
 * markdown et au texte parasite autour (on ne force pas response_format pour
 * rester agnostique du modèle OpenRouter choisi).
 */
function extractJsonObject(text: string): string {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('aucun objet JSON détecté dans la sortie du modèle')
  }
  return t.slice(start, end + 1)
}

/**
 * Parse + normalise la sortie du modèle vers les 7 champs attendus. Champs
 * manquants tolérés (chaîne vide / tableau vide) ; lève si rien de parsable.
 */
export function parseModelOutput(content: string): AirbnbModelOutput {
  // deno-lint-ignore no-explicit-any
  let obj: any
  try {
    obj = JSON.parse(extractJsonObject(content))
  } catch (e) {
    throw new Error(`sortie modèle non parsable en JSON: ${msg(e)}`)
  }
  if (!obj || typeof obj !== 'object') throw new Error('sortie modèle: objet JSON attendu')
  return {
    titres: asStringArray(obj.titres),
    description: asString(obj.description),
    logement: asString(obj.logement),
    acces_voyageurs: asString(obj.acces_voyageurs),
    quartier: asString(obj.quartier),
    comment_se_deplacer: asString(obj.comment_se_deplacer),
    autres_remarques: asString(obj.autres_remarques),
  }
}

// ───────────────────── Blocs assemblés par le code ─────────────────────

/** Template conciergerie constant (jamais généré). */
export const ECHANGES_VOYAGEURS_AIRBNB =
  'Nous assurons des échanges fluides via la plateforme de réservation Airbnb. Nous restons disponibles avant, pendant et après votre venue pour tout besoin ou demande complémentaire.'

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
      autres_remarques: model.autres_remarques,
      mentions_reglementaires: buildMentionsReglementaires(code),
      note_etat: buildNoteEtat(code),
      note_quartier: buildNoteQuartier(code),
    },
  }
}
