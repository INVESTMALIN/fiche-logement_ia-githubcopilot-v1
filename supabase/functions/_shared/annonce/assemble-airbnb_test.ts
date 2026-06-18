// Tests d'assemblage — disclosure caméra extérieure + drapeau de conformité
// caméra intérieure. Fixtures synthétiques. Lancer : `deno test assemble-airbnb_test.ts`.

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  type AirbnbModelOutput,
  assembleAirbnbOutput,
  buildConformite,
  CAMERA_EXTERIEURE_DISCLOSURE,
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
