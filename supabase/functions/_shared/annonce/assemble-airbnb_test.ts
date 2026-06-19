// Tests d'assemblage — disclosure caméra extérieure + drapeau de conformité
// caméra intérieure. Fixtures synthétiques. Lancer : `deno test assemble-airbnb_test.ts`.

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  type AirbnbModelOutput,
  assembleAirbnbOutput,
  buildConformite,
  buildNoteEtat,
  buildNoteQuartier,
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

// ───────────────────── note_etat / note_quartier — disclosures ─────────────────────

Deno.test('note_etat : cas positif (aucun trigger) → chaîne vide', () => {
  assertEquals(buildNoteEtat(makeCode()), '')
})

Deno.test('note_etat : phrases canon corrigées (ponctuation, accord, généricité)', () => {
  const degrade = buildNoteEtat(makeCode({
    note_etat_triggers: { ...makeCode().note_etat_triggers, grille_verdict: 'etat_degrade' },
  }))
  assert(degrade.includes('nous sommes convaincus')) // accord corrigé (plus "convaincu")
  assert(degrade.endsWith('vous plaire.')) // point final présent
  // Propreté immeuble sale : générique "le logement" (plus "l'appartement").
  const sale = buildNoteEtat(makeCode({
    note_etat_triggers: { ...makeCode().note_etat_triggers, immeuble_proprete: 'sale' },
  }))
  assert(sale.includes('le logement reste agréable'))
  assert(!sale.toLowerCase().includes('appartement'))
})

Deno.test('note_etat : "non accessible PMR" UNIQUEMENT via grille Avis inaccessible', () => {
  const inaccessible = buildNoteEtat(makeCode({
    note_etat_triggers: { ...makeCode().note_etat_triggers, immeuble_accessibilite: 'inaccessible' },
  }))
  assertEquals(inaccessible, 'Le logement n\'est pas accessible aux personnes PMR.') // point final
  // La case Équipements n'existe plus comme trigger (pmr_accessible retiré du contrat) :
  // hors "inaccessible", aucune phrase PMR n'est injectée.
  assert(!buildNoteEtat(makeCode()).toLowerCase().includes('pmr'))
})

Deno.test('note_quartier : élément perturbateur → fragment autonome après deux-points', () => {
  const out = buildNoteQuartier(makeCode({
    note_quartier_triggers: {
      ...makeCode().note_quartier_triggers,
      quartier_perturbations: 'perturbateur',
      quartier_perturbations_details: 'une voie ferrée',
    },
  }))
  // Forme robuste : pas d'accord grammatical "de une", pas de redondance "à proximité".
  assertEquals(out, 'Un point à signaler concernant l\'environnement du logement : une voie ferrée.')
})

Deno.test('note_quartier : détail finissant par un point → pas de double point final', () => {
  const out = buildNoteQuartier(makeCode({
    note_quartier_triggers: {
      ...makeCode().note_quartier_triggers,
      quartier_perturbations: 'perturbateur',
      quartier_perturbations_details: 'une voie ferrée.',
    },
  }))
  assertEquals(out, 'Un point à signaler concernant l\'environnement du logement : une voie ferrée.')
  assert(!out.includes('..'))
  // Points de suspension + espace résiduel : même nettoyage, un seul point.
  const ellipse = buildNoteQuartier(makeCode({
    note_quartier_triggers: {
      ...makeCode().note_quartier_triggers,
      quartier_perturbations: 'perturbateur',
      quartier_perturbations_details: 'des travaux… ',
    },
  }))
  assertEquals(ellipse, 'Un point à signaler concernant l\'environnement du logement : des travaux.')
})

Deno.test('note_quartier : perturbateur sans détail → rien (template vide de sens évité)', () => {
  assertEquals(
    buildNoteQuartier(makeCode({
      note_quartier_triggers: { ...makeCode().note_quartier_triggers, quartier_perturbations: 'perturbateur' },
    })),
    '',
  )
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

// ───────────────────── Contrat de parsing — DOIT RÉUSSIR ─────────────────────
// On accepte uniquement : un objet JSON nu, ou un objet dans UNE fence qui couvre
// tout le contenu. La nature de premier niveau n'est jamais modifiée.

Deno.test('Objet JSON pur → ok, les 7 champs récupérés', () => {
  const r = parseModelOutput(JSON.stringify(validOutput()))
  assert(r.ok)
  assertEquals(r.value.titres.length, 3)
  assertEquals(r.value.description, 'Une description.')
  assertEquals(r.value.autres_remarques, 'Remarques.')
})

Deno.test('Objet entouré uniquement d\'espaces / sauts de ligne → ok', () => {
  assert(parseModelOutput('\n\n  ' + JSON.stringify(validOutput()) + '  \n').ok)
})

Deno.test('Objet dans une fence markdown qui couvre tout → ok', () => {
  assert(parseModelOutput('```json\n' + JSON.stringify(validOutput()) + '\n```').ok)
  // fence sans le tag de langage
  assert(parseModelOutput('```\n' + JSON.stringify(validOutput()) + '\n```').ok)
})

// ───────────────────── Contrat de parsing — DOIT ÉCHOUER ─────────────────────
// Tout ce qui n'est pas « objet nu » ou « fence couvrant tout » est rejeté en
// erreur de forme, sortie brute conservée. Aucune plongée dans une structure,
// aucune extraction de JSON niché.

Deno.test('Tableau nu (même contenant un objet bien formé) → forme invalide', () => {
  assert(!parseModelOutput(JSON.stringify(['a', 'b'])).ok)
  assert(!parseModelOutput(JSON.stringify([validOutput()])).ok)
})

Deno.test('Tableau entouré de prose → forme invalide', () => {
  assert(!parseModelOutput('Voici la sortie : ' + JSON.stringify([validOutput()])).ok)
})

Deno.test('Objet en fence NICHÉ dans un tableau → forme invalide (cas round 4)', () => {
  const fenced = '```json\n' + JSON.stringify(validOutput()) + '\n```'
  const enrobe = 'Voici la sortie : [' + fenced + ']'
  const r = parseModelOutput(enrobe)
  assert(!r.ok)
  assertEquals(r.brut, enrobe) // sortie brute conservée pour inspection
})

Deno.test('Prose libre collée à un objet → forme invalide (hors contrat, à régénérer)', () => {
  assert(!parseModelOutput('Voici la sortie : ' + JSON.stringify(validOutput())).ok)
  assert(!parseModelOutput('Voici :\n' + JSON.stringify(validOutput()) + '\nMerci !').ok)
})

Deno.test('Scalaire / chaîne / nombre, enrobés ou non → forme invalide', () => {
  assert(!parseModelOutput('42').ok)
  assert(!parseModelOutput('"une chaîne"').ok)
  assert(!parseModelOutput('La réponse est : 42').ok)
})

Deno.test('JSON invalide / texte non parsable → forme invalide, texte brut conservé', () => {
  const r = parseModelOutput('je ne suis pas du JSON')
  assert(!r.ok)
  assertEquals(r.brut, 'je ne suis pas du JSON')
})

// ───────── Validation de forme (round 2, inchangée) : un objet est obtenu, puis
// on exige les 7 champs, 3 titres non vides, champs texte non vides ─────────────

Deno.test('Enveloppe {airbnb:{...}} → forme invalide (objet, mais pas la bonne forme)', () => {
  const r = parseModelOutput(JSON.stringify({ airbnb: validOutput() }))
  assert(!r.ok)
  assert(r.brut !== undefined) // sortie brute conservée pour inspection
})

Deno.test('Objet vide {} → forme invalide', () => {
  assert(!parseModelOutput('{}').ok)
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

// ───── Point 1 : dégradation gracieuse quand la localisation est absente ─────
// Sans localisation, le champ déplacements peut être vide (on n'invente pas) ;
// avec localisation, il reste exigé non vide. La relaxation ne touche QUE ce champ.

Deno.test('Localisation absente → comment_se_deplacer vide accepté (dégradation)', () => {
  const o = { ...validOutput(), comment_se_deplacer: '' }
  const r = parseModelOutput(JSON.stringify(o), { localisationDisponible: false })
  assert(r.ok)
  assertEquals(r.value.comment_se_deplacer, '')
})

Deno.test('Localisation présente → comment_se_deplacer vide rejeté (strict, défaut)', () => {
  const o = { ...validOutput(), comment_se_deplacer: '' }
  assert(!parseModelOutput(JSON.stringify(o), { localisationDisponible: true }).ok)
  assert(!parseModelOutput(JSON.stringify(o)).ok) // défaut = strict
})

Deno.test('Localisation absente ne relaxe QUE déplacements (description vide → rejet)', () => {
  const o = { ...validOutput(), description: '' }
  assert(!parseModelOutput(JSON.stringify(o), { localisationDisponible: false }).ok)
})

// ───── Point 2 : ensemble EXACT de clés top-level (les 7, aucune autre) ─────

Deno.test('Clé top-level en trop → forme invalide (dérive du modèle détectée)', () => {
  assert(!parseModelOutput(JSON.stringify({ ...validOutput(), nombre_voyageurs: 4 })).ok)
  assert(!parseModelOutput(JSON.stringify({ ...validOutput(), mentions_reglementaires: {} })).ok)
})

Deno.test('Exactement les 7 clés attendues → accepté', () => {
  assertEquals(Object.keys(validOutput()).length, 7)
  assert(parseModelOutput(JSON.stringify(validOutput())).ok)
})
