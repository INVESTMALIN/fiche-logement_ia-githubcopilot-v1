// Assemblage de la sortie Booking : 3 champs profil du modèle (nom,
// about_property, about_neighbourhood) + blocs déterministes posés PAR LE CODE
// (about_host template, réglementation, disclosures état/quartier/caméra).
// Source de cadrage : docs/agent-annonce/cadrage-annonce-booking-2026.md ;
// structure : docs/agent-annonce/schema-sortie-booking-agent-annonce.md.
//
// Sur Booking, la grande description visible est auto-générée par la plateforme
// à partir des champs structurés. L'agent ne rédige donc PAS de bloc d'annonce :
// il remplit une fiche (nom + 3 courts champs profil). Les blocs déterministes
// (réglementation, note_etat, note_quartier, caméra) sont réutilisés tels quels
// d'Airbnb — décision Julien : on garde ces disclosures sur Booking aussi.

import type { CodeZone } from './types.ts'
import {
  buildMentionsReglementaires,
  buildNoteEtat,
  buildNoteQuartier,
  CAMERA_EXTERIEURE_DISCLOSURE,
  type MentionsReglementaires,
  type ParseOptions,
  parseTopLevelJson,
} from './assemble-airbnb.ts'

// ───────────────────── Sortie du modèle (3 champs profil) ─────────────────────

export interface BookingModelOutput {
  nom: string
  about_property: string
  about_neighbourhood: string
}

const CHAMP_QUARTIER = 'about_neighbourhood'
// Clés EXACTES attendues du modèle (et aucune autre). Une clé en trop — surtout
// une clé déterministe que le modèle ne doit jamais produire (about_host,
// mentions_reglementaires, note_*...) — est un dérapage à détecter, pas à avaler.
const CLES_AUTORISEES: ReadonlySet<string> = new Set(['nom', 'about_property', CHAMP_QUARTIER])

export type BookingOutputResult =
  | { ok: true; value: BookingModelOutput }
  | { ok: false; reason: string; brut: unknown }

/**
 * Condition EXHAUSTIVE de validité de FORME. Renvoie la raison du rejet, ou null
 * si valide. Forme valide = un objet (ni null ni tableau) ; ensemble EXACT des 3
 * clés ; `nom` et `about_property` chaînes non vides ; `about_neighbourhood`
 * chaîne, vide tolérée UNIQUEMENT en l'absence de localisation (dégradation
 * gracieuse : pas de faits → on n'invente pas, miroir de comment_se_deplacer).
 */
function raisonFormeInvalide(value: unknown, opts: ParseOptions): string | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return 'objet JSON attendu (ni null, ni tableau)'
  }
  const o = value as Record<string, unknown>
  const clesEnTrop = Object.keys(o).filter((k) => !CLES_AUTORISEES.has(k))
  if (clesEnTrop.length) return `clé(s) top-level inconnue(s): ${clesEnTrop.join(', ')}`
  for (const champ of CLES_AUTORISEES) {
    const v = o[champ]
    if (typeof v !== 'string') return `champ ${champ} absent ou non-chaîne`
    const videTolere = champ === CHAMP_QUARTIER && !opts.localisationDisponible
    if (!videTolere && v.trim() === '') return `champ ${champ} vide`
  }
  return null
}

/**
 * Parse + valide la FORME de la sortie modèle Booking (3 champs profil, AUCUNE
 * clé en trop). Mêmes principes qu'Airbnb : contrat fermé, jamais de
 * normalisation silencieuse en champs vides, sortie brute conservée en cas
 * d'erreur. `about_neighbourhood` n'est toléré vide que sans localisation.
 */
export function parseBookingOutput(
  content: string,
  opts: ParseOptions = { localisationDisponible: true },
): BookingOutputResult {
  const parsed = parseTopLevelJson(content)
  if (!parsed.ok) return { ok: false, reason: `sortie modèle invalide: ${parsed.reason}`, brut: content }
  const raison = raisonFormeInvalide(parsed.value, opts)
  if (raison) return { ok: false, reason: `forme invalide: ${raison}`, brut: parsed.value }
  const o = parsed.value as Record<string, unknown>
  return {
    ok: true,
    value: {
      nom: o.nom as string,
      about_property: o.about_property as string,
      about_neighbourhood: o.about_neighbourhood as string,
    },
  }
}

// ───────────────────── Blocs assemblés par le code ─────────────────────

// about_host : template conciergerie constant (jamais généré). Texte placeholder
// fourni au brief, repris verbatim (reformulation Olga en 2e temps).
export const ABOUT_HOST_BOOKING =
  'Votre séjour est pris en charge par notre équipe de conciergerie locale. Nous préparons le logement avec soin avant votre arrivée et restons disponibles tout au long de votre séjour via la messagerie Booking. Pour toute question, avant comme pendant votre venue, nous mettons un point d\'honneur à vous répondre rapidement.'

// ───────────────────── Sanitisation du nom (règles dures Booking) ─────────────────────

// Plateformes concurrentes : interdites dans les champs Booking. Booking lui-même
// est autorisé, donc absent de la liste. Filet de sécurité (le prompt l'interdit déjà).
const PLATEFORMES_CONCURRENTES = /\b(?:airbnb|abritel|vrbo|home\s?away)\b/gi

// Superlatifs marketing flagrants — Booking filtre certains mots à la
// publication (liste opaque, non résoluble côté code). On retire les patterns
// ÉVIDENTS ; l'opérateur ajuste dans l'extranet en cas de rejet (cf. cadrage §7).
const SUPERLATIFS_FLAGRANTS =
  /\b(?:exceptionnel(?:le|s|les)?|magnifique(?:s)?|somptueux|somptueuse(?:s)?|paradisiaque(?:s)?|idyllique(?:s)?|incroyable(?:s)?|extraordinaire(?:s)?|sublime(?:s)?|luxueux|luxueuse(?:s)?)\b/gi

// Hors charset Booking : tout ce qui n'est pas lettre, chiffre, espace, ou l'un
// des signes tolérés ! # & ' " - , (le point, les deux-points, la barre oblique,
// etc. coupent l'appel API). `-` en dernier dans la classe = littéral.
const HORS_CHARSET = /[^\p{L}\p{N} !#&'",-]/gu

const NOM_MAX = 255
const NOM_MIN = 3

/** Normalise les variantes typographiques vers les caractères tolérés. */
function normaliseTypographie(s: string): string {
  return s
    .replace(/[—–]/g, '-') // tirets cadratin/demi-cadratin → trait d'union toléré
    .replace(/[‘’‚‛]/g, "'") // apostrophes courbes → droite tolérée
    .replace(/[“”„‟]/g, '"') // guillemets courbes → droit toléré
    .replace(/…/g, '') // points de suspension → supprimés (le point n'est pas toléré)
}

/** Si la chaîne a des lettres mais aucune minuscule (tout-majuscules) → Title Case. */
function corrigeMajusculesIntegrales(s: string): string {
  if (!/\p{L}/u.test(s) || /\p{Ll}/u.test(s)) return s
  return s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_m, sep, ch) => sep + ch.toUpperCase())
}

/**
 * Sanitise le nom selon les RÈGLES DURES de Booking. Ne laisse JAMAIS sortir un
 * nom hors-charset ni une coordonnée. Ordre : normalisation typographique →
 * scrub des interdits (téléphone même espacé, email, URL, plateformes
 * concurrentes — mutualisé avec les champs profil) → retrait superlatifs → strip
 * hors-charset → correction tout-majuscules → plafond de 5 chiffres consécutifs
 * → espaces normalisés → longueur 3-255. Si le nom devient vide/trop court, la
 * revalidation post-traitement (raisonBookingPostInvalide) le rejette en erreur.
 */
export function sanitizeNom(nom: string): string {
  let s = normaliseTypographie(nom || '')
  // Mêmes interdits que les champs profil (un champ libre de la fiche peut être
  // recopié dans le nom par le modèle) : scrub AVANT le strip hors-charset pour
  // reconnaître emails/URL/numéros espacés (« 06 12 34 56 78 ») comme motifs,
  // pas comme suite de chiffres légitimes. Les chiffres utiles (« 4 pers »,
  // « 120 m² ») ne forment pas un blob de coordonnée et sont préservés.
  s = scrubInterdits(s)
  s = s.replace(SUPERLATIFS_FLAGRANTS, ' ')
  s = s.replace(HORS_CHARSET, ' ')
  s = corrigeMajusculesIntegrales(s)
  // Pas plus de 5 chiffres consécutifs (détection numéro de téléphone) : on
  // tronque toute série de 6+ chiffres à 5.
  s = s.replace(/\d{6,}/g, (run) => run.slice(0, 5))
  // Espaces normalisés + espace parasite avant une ponctuation collante retiré.
  s = s.replace(/\s+/g, ' ').replace(/\s+([!,])/g, '$1').trim()
  if (s.length > NOM_MAX) {
    // Coupe au dernier espace avant la limite pour ne pas tronquer un mot ; si
    // aucun espace exploitable (mot unique très long), coupe dur à la limite.
    const coupe = s.slice(0, NOM_MAX)
    const dernierEspace = coupe.lastIndexOf(' ')
    s = (dernierEspace >= NOM_MIN ? coupe.slice(0, dernierEspace) : coupe).trim()
  }
  return s
}

// ───────────────────── Scrub des interdits (champs profil) ─────────────────────

// Filet de sécurité sur les champs profil (le prompt interdit déjà tout cela) :
// aucune coordonnée (téléphone, email), aucun lien/URL, aucune plateforme
// concurrente. Rejet automatique de publication côté Booking sinon.
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
const URL = /\b(?:https?:\/\/|www\.)\S+/gi
// Domaine nu (mot.tld) avec TLD courant — conservateur pour limiter les faux positifs.
const DOMAINE_NU = /\b[A-Za-z0-9-]+\.(?:com|fr|net|org|io|co|eu|be|ch|info)\b\S*/gi
// Séquence ressemblant à un téléphone : un blob de chiffres/séparateurs. On ne
// retire que si le blob contient au moins 9 chiffres (évite « 65 m², 4 pers »).
const TEL_CANDIDAT = /\+?\d[\d\s().-]{7,}\d/g

function stripTelephones(s: string): string {
  return s.replace(TEL_CANDIDAT, (blob) => ((blob.match(/\d/g) || []).length >= 9 ? ' ' : blob))
}

/**
 * Neutralise les interdits Booking sur un champ profil, puis renormalise les
 * espaces (et l'espace parasite devant une ponctuation). Best-effort : le prompt
 * reste la première ligne de défense, ceci est le filet.
 */
export function scrubInterdits(texte: string): string {
  let s = texte || ''
  s = s.replace(URL, ' ').replace(EMAIL, ' ').replace(DOMAINE_NU, ' ')
  s = stripTelephones(s)
  s = s.replace(PLATEFORMES_CONCURRENTES, ' ')
  s = s.replace(/[ \t]+/g, ' ').replace(/ +([.,!?;:])/g, '$1').replace(/ +\n/g, '\n').trim()
  return s
}

// ───────────────────── Assemblage final ─────────────────────

export interface BookingAssembled {
  booking: {
    nom: string
    about_property: string
    about_neighbourhood: string
    about_host: string
    mentions_reglementaires: MentionsReglementaires
    note_etat: string
    note_quartier: string
    // Divulgation caméra extérieure (obligation légale, miroir d'Airbnb) exposée
    // en champ distinct : Booking n'a pas de bloc disclosure, l'opérateur la
    // recopie dans l'extranet. Caméra intérieure → drapeau de conformité (meta),
    // jamais affichée. Vide si aucune caméra extérieure.
    note_camera: string
  }
}

/**
 * Merge les 3 champs profil du modèle (sanitisés / scrubés) et les blocs
 * déterministes posés par le code. Le modèle ne fournit jamais les champs
 * assemblés ici (template, réglementation, disclosures).
 */
export function assembleBookingOutput(
  model: BookingModelOutput,
  code: CodeZone,
  opts: ParseOptions = { localisationDisponible: true },
): BookingAssembled {
  return {
    booking: {
      nom: sanitizeNom(model.nom),
      about_property: scrubInterdits(model.about_property),
      // Sans localisation : on VIDE le quartier (on jette le contenu, inventé ou
      // non) plutôt que de faire échouer toute la fiche. Dégradation gracieuse :
      // on n'invente pas, mais la fiche reste valide (nom + about_property +
      // about_host + disclosures). Avec localisation : scrubé et exigé non vide.
      about_neighbourhood: opts.localisationDisponible ? scrubInterdits(model.about_neighbourhood) : '',
      about_host: ABOUT_HOST_BOOKING,
      mentions_reglementaires: buildMentionsReglementaires(code),
      note_etat: buildNoteEtat(code),
      note_quartier: buildNoteQuartier(code),
      note_camera: code.cameras.exterieures ? CAMERA_EXTERIEURE_DISCLOSURE : '',
    },
  }
}

/**
 * REVALIDATION post-traitement : sanitizeNom et scrubInterdits peuvent VIDER un
 * champ requis qui avait pourtant passé parseBookingOutput (ex. nom « Airbnb »
 * → scrubé → vide ; about_property = une URL seule → scrubée → vide). On ne
 * persiste jamais un faux succès en champs vides — même principe qu'Airbnb.
 * Renvoie la raison du rejet, ou null si la sortie assemblée est exploitable.
 * `about_neighbourhood` vide reste toléré sans localisation (dégradation, miroir
 * de comment_se_deplacer). about_host / réglementation / disclosures ne sont PAS
 * concernés : posés par le code, ils peuvent être vides légitimement.
 */
export function raisonBookingPostInvalide(assembled: BookingAssembled, opts: ParseOptions): string | null {
  const b = assembled.booking
  if (b.nom.trim().length < NOM_MIN) return `nom vide ou trop court après sanitisation (< ${NOM_MIN} caractères)`
  if (b.about_property.trim() === '') return 'about_property vide après scrub'
  if (opts.localisationDisponible && b.about_neighbourhood.trim() === '') return 'about_neighbourhood vide après scrub'
  return null
}
