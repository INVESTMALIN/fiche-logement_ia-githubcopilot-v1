// Tests d'assemblage Booking : parsing strict, sanitisation du nom (règles dures
// Booking), scrub des interdits, et assemblage (réutilisation des blocs
// déterministes + champ caméra). Fixtures synthétiques. Le CodeZone est dérivé
// du VRAI mapper (mapFicheToContrat) pour ne pas coder en dur la forme du
// contrat. Lancer : `deno test assemble-booking_test.ts`.

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { mapFicheToContrat } from './mapper.ts'
import {
  ABOUT_HOST_BOOKING,
  assembleBookingOutput,
  type BookingModelOutput,
  parseBookingOutput,
  sanitizeNom,
  scrubInterdits,
} from './assemble-booking.ts'
import {
  buildMentionsReglementaires,
  buildNoteEtat,
  buildNoteQuartier,
  CAMERA_EXTERIEURE_DISCLOSURE,
} from './assemble-airbnb.ts'
import type { FicheRow } from './fiche.ts'

const codeDe = (fiche: FicheRow) => mapFicheToContrat(fiche).code

const MODEL: BookingModelOutput = {
  nom: 'Appartement Vue Mer - 4 pers - Plage 50m - Nice',
  about_property: 'Appartement de 65 m² rénové, 4 personnes, wifi fibre.',
  about_neighbourhood: 'Quartier calme à 50 mètres de la plage.',
}

// Charset toléré par Booking : lettres, chiffres, espace, et ! # & ' " - ,
const HORS_CHARSET = /[^\p{L}\p{N} !#&'",-]/u

// ───────────────────── Parsing strict ─────────────────────

// deno-lint-ignore no-explicit-any
function validOutput(): Record<string, any> {
  return {
    nom: 'Studio Nice centre',
    about_property: 'Studio de 30 m² en centre-ville, wifi, climatisation.',
    about_neighbourhood: 'Commerces à 100 mètres, tramway à 5 minutes.',
  }
}

Deno.test('Booking parse : objet JSON pur → ok, 3 champs récupérés', () => {
  const r = parseBookingOutput(JSON.stringify(validOutput()))
  assert(r.ok)
  assertEquals(r.value.nom, 'Studio Nice centre')
})

Deno.test('Booking parse : fence markdown qui couvre tout → ok', () => {
  assert(parseBookingOutput('```json\n' + JSON.stringify(validOutput()) + '\n```').ok)
})

Deno.test('Booking parse : clé top-level en trop → forme invalide (dérive détectée)', () => {
  // Une clé déterministe que le modèle ne doit jamais produire.
  assert(!parseBookingOutput(JSON.stringify({ ...validOutput(), about_host: 'x' })).ok)
  assert(!parseBookingOutput(JSON.stringify({ ...validOutput(), note_etat: 'x' })).ok)
})

Deno.test('Booking parse : champ manquant ou vide → forme invalide', () => {
  const sansNom = validOutput()
  delete sansNom.nom
  assert(!parseBookingOutput(JSON.stringify(sansNom)).ok)
  assert(!parseBookingOutput(JSON.stringify({ ...validOutput(), nom: '   ' })).ok)
  assert(!parseBookingOutput(JSON.stringify({ ...validOutput(), about_property: '' })).ok)
})

Deno.test('Booking parse : tableau / scalaire → forme invalide ; non-JSON → brut brut conservé', () => {
  assert(!parseBookingOutput(JSON.stringify([validOutput()])).ok)
  assert(!parseBookingOutput('42').ok)
  // Texte non parsable → sortie brute (le texte tel quel) conservée pour inspection.
  const r = parseBookingOutput('je ne suis pas du JSON')
  assert(!r.ok)
  assertEquals(r.brut, 'je ne suis pas du JSON')
})

Deno.test('Booking parse : about_neighbourhood vide toléré SANS localisation seulement', () => {
  const o = { ...validOutput(), about_neighbourhood: '' }
  // Sans localisation : dégradation gracieuse acceptée.
  assert(parseBookingOutput(JSON.stringify(o), { localisationDisponible: false }).ok)
  // Avec localisation (défaut) : rejeté.
  assert(!parseBookingOutput(JSON.stringify(o), { localisationDisponible: true }).ok)
  assert(!parseBookingOutput(JSON.stringify(o)).ok)
  // La relaxation ne touche QUE le quartier : about_property vide reste rejeté.
  assert(!parseBookingOutput(JSON.stringify({ ...validOutput(), about_property: '' }), { localisationDisponible: false }).ok)
})

// ───────────────────── Sanitisation du nom ─────────────────────

Deno.test('Nom : un nom conforme passe inchangé', () => {
  assertEquals(sanitizeNom('Appartement Vue Mer - 4 pers - Plage 50m - Nice'), 'Appartement Vue Mer - 4 pers - Plage 50m - Nice')
})

Deno.test('Nom : caractères hors charset retirés (point, deux-points, slash, arobase)', () => {
  const out = sanitizeNom('Studio @ Nice: top/luxe.com')
  assert(!HORS_CHARSET.test(out)) // aucun caractère interdit ne survit
  assert(!out.includes('@') && !out.includes(':') && !out.includes('/') && !out.includes('.'))
})

Deno.test('Nom : typographie normalisée (tiret cadratin → trait d\'union, guillemets courbes → droits)', () => {
  assertEquals(sanitizeNom('Loft — Paris'), 'Loft - Paris')
  assertEquals(sanitizeNom('L’Appart Nice'), "L'Appart Nice")
})

Deno.test('Nom : tout-majuscules corrigé en Title Case', () => {
  assertEquals(sanitizeNom('STUDIO PARIS CENTRE'), 'Studio Paris Centre')
})

Deno.test('Nom : pas plus de 5 chiffres consécutifs (série tronquée)', () => {
  const out = sanitizeNom('Appart 123456789 Nice')
  assert(out.includes('12345'))
  assert(!/\d{6,}/.test(out))
})

Deno.test('Nom : plateforme concurrente et superlatif flagrant retirés', () => {
  assert(!/airbnb/i.test(sanitizeNom('Comme sur Airbnb a Nice')))
  assert(!/magnifique/i.test(sanitizeNom('Magnifique studio Nice')))
})

Deno.test('Nom : longueur plafonnée à 255', () => {
  const long = 'Studio ' + 'tres agreable et bien situe '.repeat(20) + 'Nice'
  const out = sanitizeNom(long)
  assert(out.length <= 255)
  assert(out.length >= 3)
})

// ───────────────────── Scrub des interdits (champs profil) ─────────────────────

Deno.test('Scrub : email, URL et domaine nu retirés', () => {
  assert(!scrubInterdits('Contact jean@mail.com svp').includes('@'))
  assert(!/https?:/i.test(scrubInterdits('Voir https://site.fr ici')))
  assert(!/monsite\.fr/i.test(scrubInterdits('Notre site monsite.fr est en ligne')))
})

Deno.test('Scrub : numéro de téléphone retiré, mais chiffres légitimes préservés', () => {
  assert(!scrubInterdits('Appelez le 06 12 34 56 78 pour réserver').includes('06 12'))
  // Faux positif à éviter : surfaces / capacités ne sont pas des téléphones.
  const concret = scrubInterdits('Appartement de 65 m² pour 4 personnes, 2 chambres')
  assert(concret.includes('65 m²') && concret.includes('4 personnes'))
})

Deno.test('Scrub : plateforme concurrente retirée, Booking préservé', () => {
  assert(!/abritel/i.test(scrubInterdits('Mieux que sur Abritel')))
  assert(/booking/i.test(scrubInterdits('Disponibles via la messagerie Booking')))
})

// ───────────────────── Assemblage ─────────────────────

Deno.test('Assemblage : structure booking complète + about_host constant', () => {
  const out = assembleBookingOutput(MODEL, codeDe({}))
  const b = out.booking
  assertEquals(b.about_host, ABOUT_HOST_BOOKING)
  assertEquals(typeof b.nom, 'string')
  assertEquals(typeof b.about_property, 'string')
  assertEquals(typeof b.about_neighbourhood, 'string')
  assert('mentions_reglementaires' in b && 'note_etat' in b && 'note_quartier' in b && 'note_camera' in b)
})

Deno.test('Assemblage : blocs déterministes RÉUTILISÉS tels quels (égalité avec les fonctions partagées)', () => {
  const code = codeDe({
    reglementation_numero_declaration: '12345',
    reglementation_classe_dpe: 'F',
    reglementation_dpe_depenses_min: 1500,
    reglementation_dpe_depenses_max: 2100,
    avis_immeuble_proprete: 'sale',
    avis_quartier_securite: 'modere',
  })
  const out = assembleBookingOutput(MODEL, code)
  assertEquals(out.booking.note_etat, buildNoteEtat(code))
  assertEquals(out.booking.note_quartier, buildNoteQuartier(code))
  assertEquals(out.booking.mentions_reglementaires, buildMentionsReglementaires(code))
  // F → mention de consommation excessive reprise de la réglementation.
  assert(out.booking.mentions_reglementaires.mention_consommation_excessive !== '')
})

Deno.test('Assemblage : caméra extérieure → champ note_camera (miroir Airbnb), sinon vide', () => {
  const avec = assembleBookingOutput(MODEL, codeDe({ securite_equipements: ['Caméras de surveillance extérieures'] }))
  assertEquals(avec.booking.note_camera, CAMERA_EXTERIEURE_DISCLOSURE)
  const sans = assembleBookingOutput(MODEL, codeDe({}))
  assertEquals(sans.booking.note_camera, '')
})

Deno.test('Assemblage : caméra intérieure → JAMAIS dans la sortie (drapeau de conformité géré ailleurs)', () => {
  const out = assembleBookingOutput(
    MODEL,
    codeDe({ securite_equipements: ['Caméras de surveillance intérieures (uniquement dans les espaces communs)'] }),
  )
  assertEquals(out.booking.note_camera, '')
  assert(!JSON.stringify(out).toLowerCase().includes('intérieure'))
})

Deno.test('Assemblage : nom sanitisé et champs profil scrubés en passant par l\'assemblage', () => {
  const out = assembleBookingOutput({
    nom: 'STUDIO @ Nice.com',
    about_property: 'Réservez vite, écrivez à jean@mail.com ou voir https://site.fr',
    about_neighbourhood: 'Quartier calme, mieux que sur Airbnb.',
  }, codeDe({}))
  assert(!HORS_CHARSET.test(out.booking.nom))
  assert(!out.booking.about_property.includes('@'))
  assert(!/https?:/i.test(out.booking.about_property))
  assert(!/airbnb/i.test(out.booking.about_neighbourhood))
})
