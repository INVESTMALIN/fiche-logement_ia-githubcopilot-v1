// Tests d'assemblage — disclosure caméra extérieure + drapeau de conformité
// caméra intérieure. Fixtures synthétiques. Lancer : `deno test assemble-airbnb_test.ts`.

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  type AirbnbModelOutput,
  assembleAirbnbOutput,
  buildConformite,
  CAMERA_EXTERIEURE_DISCLOSURE,
  parseModelOutput,
} from './assemble-airbnb.ts'
import type { CodeZone } from './types.ts'

function makeCode(over: Partial<CodeZone> = {}): CodeZone {
  return {
    nombre_voyageurs: 4,
    reglementation: { numero_declaration: null, classe_dpe: null, dpe_depenses_min: null, dpe_depenses_max: null },
    note_etat_triggers: {
      immeuble_etat_general: null,
      immeuble_proprete: null,
      immeuble_accessibilite: null,
      immeuble_niveau_sonore: null,
      grille_verdict: null,
      grille_score_total: null,
      grille_notes: {},
      securite_dangers: [],
      securite_danger_detecte: false,
      pmr_accessible: null,
    },
    note_quartier_triggers: {
      quartier_securite: null,
      quartier_perturbations: null,
      quartier_perturbations_details: null,
      quartier_defavorise: false,
    },
    cameras: { exterieures: false, interieures_communs: false },
    regles_calculees: { fetes_autorisees: false, fumeurs_acceptes: false },
    ...over,
  }
}

const MODEL: AirbnbModelOutput = {
  titres: ['Titre A', 'Titre B', 'Titre C'],
  description: 'Description.',
  logement: 'Logement.',
  acces_voyageurs: 'Accès.',
  quartier: 'Quartier.',
  comment_se_deplacer: 'Déplacements.',
  autres_remarques: 'Animaux non acceptés.',
}

Deno.test('Caméra extérieure → disclosure verbatim ajoutée en fin d\'autres_remarques', () => {
  const out = assembleAirbnbOutput(MODEL, makeCode({ cameras: { exterieures: true, interieures_communs: false } }))
  assertEquals(out.airbnb.autres_remarques, `Animaux non acceptés. ${CAMERA_EXTERIEURE_DISCLOSURE}`)
})

Deno.test('Aucune caméra → autres_remarques inchangé, aucune mention caméra', () => {
  const out = assembleAirbnbOutput(MODEL, makeCode())
  assertEquals(out.airbnb.autres_remarques, 'Animaux non acceptés.')
  assert(!out.airbnb.autres_remarques.toLowerCase().includes('caméra'))
})

Deno.test('Caméra extérieure + autres_remarques vide → la phrase seule', () => {
  const out = assembleAirbnbOutput(
    { ...MODEL, autres_remarques: '' },
    makeCode({ cameras: { exterieures: true, interieures_communs: false } }),
  )
  assertEquals(out.airbnb.autres_remarques, CAMERA_EXTERIEURE_DISCLOSURE)
})

Deno.test('Caméra intérieure → drapeau de conformité levé, ZÉRO texte dans l\'annonce', () => {
  const code = makeCode({ cameras: { exterieures: false, interieures_communs: true } })
  const out = assembleAirbnbOutput(MODEL, code)
  // Jamais mentionnée dans l'annonce.
  assertEquals(out.airbnb.autres_remarques, 'Animaux non acceptés.')
  assert(!out.airbnb.autres_remarques.toLowerCase().includes('caméra'))
  // Mais tracée en conformité.
  assertEquals(buildConformite(code).camera_interieure_signalee, true)
})

Deno.test('Pas de caméra intérieure → drapeau de conformité à false', () => {
  assertEquals(buildConformite(makeCode()).camera_interieure_signalee, false)
})

// ───────────────────── Validation de forme de la sortie modèle ─────────────────────

// deno-lint-ignore no-explicit-any
function validOutput(): Record<string, any> {
  return {
    titres: ['Titre A', 'Titre B', 'Titre C'],
    description: 'Une description.',
    logement: 'Le logement.',
    acces_voyageurs: 'Accès.',
    quartier: 'Quartier.',
    comment_se_deplacer: 'Déplacements.',
    autres_remarques: 'Remarques.',
  }
}

Deno.test('Forme valide → ok, les 7 champs récupérés', () => {
  const r = parseModelOutput(JSON.stringify(validOutput()))
  assert(r.ok)
  assertEquals(r.value.titres.length, 3)
  assertEquals(r.value.description, 'Une description.')
  assertEquals(r.value.autres_remarques, 'Remarques.')
})

Deno.test('Forme valide tolère les fences markdown et la prose autour', () => {
  const json = JSON.stringify(validOutput())
  assert(parseModelOutput('```json\n' + json + '\n```').ok)
  assert(parseModelOutput('Voici la sortie :\n' + json).ok)
})

Deno.test('Enveloppe {airbnb:{...}} → forme invalide (pas de faux succès)', () => {
  const r = parseModelOutput(JSON.stringify({ airbnb: validOutput() }))
  assert(!r.ok)
  assert(r.brut !== undefined) // sortie brute conservée pour inspection
})

Deno.test('Objet vide {} → forme invalide', () => {
  const r = parseModelOutput('{}')
  assert(!r.ok)
})

Deno.test('Tableau → forme invalide', () => {
  assert(!parseModelOutput(JSON.stringify(['a', 'b'])).ok)
  // tableau contenant un objet bien formé : reste invalide (le modèle a renvoyé un tableau)
  assert(!parseModelOutput(JSON.stringify([validOutput()])).ok)
})

Deno.test('Champ texte manquant → forme invalide', () => {
  const o = validOutput()
  delete o.quartier
  assert(!parseModelOutput(JSON.stringify(o)).ok)
})

Deno.test('Champ texte vide → forme invalide', () => {
  const o = validOutput()
  o.description = '   '
  assert(!parseModelOutput(JSON.stringify(o)).ok)
})

Deno.test('Titres absents → forme invalide', () => {
  const o = validOutput()
  delete o.titres
  assert(!parseModelOutput(JSON.stringify(o)).ok)
})

Deno.test('Titres en mauvais nombre → forme invalide', () => {
  assert(!parseModelOutput(JSON.stringify({ ...validOutput(), titres: ['A', 'B'] })).ok)
  assert(!parseModelOutput(JSON.stringify({ ...validOutput(), titres: ['A', 'B', 'C', 'D'] })).ok)
})

Deno.test('Titre vide parmi les 3 → forme invalide', () => {
  assert(!parseModelOutput(JSON.stringify({ ...validOutput(), titres: ['A', '', 'C'] })).ok)
})

Deno.test('Sortie non JSON → forme invalide, texte brut conservé', () => {
  const r = parseModelOutput('je ne suis pas du JSON')
  assert(!r.ok)
  assertEquals(r.brut, 'je ne suis pas du JSON')
})

// Round 3 : l'enrobage (prose/fences) ne doit JAMAIS changer la nature de la
// valeur de premier niveau. Un tableau enrobé reste un tableau → rejet.

Deno.test('Tableau bien formé ENTOURÉ DE PROSE → forme invalide (pas de plongée dans le tableau)', () => {
  const r = parseModelOutput('Voici la sortie : ' + JSON.stringify([validOutput()]))
  assert(!r.ok)
})

Deno.test('Objet bien formé entouré de prose (avant ET après) → reste valide', () => {
  const r = parseModelOutput('Voici la sortie :\n' + JSON.stringify(validOutput()) + '\nMerci !')
  assert(r.ok)
  assertEquals(r.value.titres.length, 3)
})

Deno.test('Objet bien formé en bloc markdown → reste valide', () => {
  const r = parseModelOutput('```json\n' + JSON.stringify(validOutput()) + '\n```')
  assert(r.ok)
})

Deno.test('Scalaire entouré de prose → forme invalide (nature de premier niveau préservée)', () => {
  assert(!parseModelOutput('La réponse est : 42').ok)
})
