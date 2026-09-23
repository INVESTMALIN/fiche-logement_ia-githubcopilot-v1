// scripts/tests/finalisationVideoGuide.test.mjs
//
// La finalisation est bloquée tant que la compression de la vidéo du Guide
// d'accès est en cours — et UNIQUEMENT elle : c'est la finalisation qui
// déclenche l'automatisation à un seul coup (migration des médias vers le
// Drive), et le résultat du job peut encore remplacer l'URL du champ.
//
// On exécute le VRAI `validateRequiredFields` du repo (imports réécrits en
// data: URL, même procédé que saveFiche.test.mjs) : c'est le câblage dans
// validateRequiredFields qui est l'assertion, pas seulement la fonction.
// Exécution : npm test   (node --test, aucun appel réseau)

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const RACINE = new URL('../../', import.meta.url)

function dataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`
}

function lire(chemin) {
  return readFileSync(new URL(chemin, RACINE), 'utf8')
}

async function chargerValidationConfig() {
  const source = lire('src/lib/validationConfig.js')
    .replace("'./phoneHelpers'", `'${dataUrl(lire('src/lib/phoneHelpers.js'))}'`)
    .replace("'./photoHelpers'", `'${dataUrl(lire('src/lib/photoHelpers.js'))}'`)
    .replace("'./videoGuideAcces'", `'${dataUrl(lire('src/lib/videoGuideAcces.js'))}'`)
  return import(dataUrl(source))
}

const { validateRequiredFields, SPECIAL_VALIDATIONS, erreurMediaGuideEnVol } = await chargerValidationConfig()

// Erreurs remontées pour la section Guide d'accès uniquement : le reste de la
// fiche de test est volontairement vide, donc plein d'autres erreurs.
function erreursGuide(avertissement) {
  const errors = validateRequiredFields({
    section_guide_acces: { video_acces: ['https://s/o.mp4'], video_avertissement: avertissement }
  })
  return errors.guide_acces || []
}

test('compression en cours : la finalisation est bloquée, avec le remède', () => {
  const erreurs = erreursGuide('compression_en_cours')
  assert.equal(erreurs.length, 1)
  assert.equal(erreurs[0].field, 'section_guide_acces.video_acces')
  assert.match(erreurs[0].message, /compression .* en cours/i)
  assert.match(erreurs[0].message, /supprimez la vidéo et réimportez-la/i, 'le message doit donner la sortie de secours')
})

test('états finaux et absence d\'avertissement : la finalisation n\'est pas bloquée', () => {
  // Une vidéo trop lourde ou dont la compression a échoué reste finalisable :
  // elle est enregistrée, le coordinateur est averti, c'est son arbitrage.
  for (const etat of [null, undefined, 'trop_lourde', 'compression_echouee']) {
    assert.deepEqual(erreursGuide(etat), [], `état ${String(etat)} : aucun blocage attendu`)
  }
})

test('une fiche sans section guide_acces ne lève rien', () => {
  assert.deepEqual(validateRequiredFields({}).guide_acces || [], [])
  assert.deepEqual(SPECIAL_VALIDATIONS.validateVideoGuideCompression({}), [])
})

test('média en vol : erreur dédiée, même section, message distinct de l\'état persistant', () => {
  const enVol = erreurMediaGuideEnVol()
  const enCours = SPECIAL_VALIDATIONS.validateVideoGuideCompression({
    section_guide_acces: { video_avertissement: 'compression_en_cours' }
  })[0]

  assert.equal(enVol.section, 'guide_acces', 'même section que l\'état persistant')
  assert.equal(enVol.field, enCours.field)
  assert.match(enVol.message, /envoi .* en cours/i)
  assert.match(enVol.message, /Drive/, 'le message dit ce qu\'on risque de perdre')
  assert.notEqual(enVol.message, enCours.message, 'envoi en cours ≠ compression en cours')
})

test('un média en vol ne se déduit PAS de formData : c\'est le registre qui le sait', () => {
  // Pendant l'envoi, la fiche ne référence encore rien : aucune validation
  // basée sur formData ne peut voir le média. D'où l'ajout au clic.
  const errors = validateRequiredFields({ section_guide_acces: { video_acces: [], video_avertissement: null } })
  assert.deepEqual(errors.guide_acces || [], [])
})

test('le blocage vient bien de la validation de finalisation (câblage)', () => {
  // Retirer la validation spéciale du lot ferait disparaître l'erreur : c'est
  // la preuve que c'est ce câblage-là qui bloque, et pas un autre contrôle.
  const directes = SPECIAL_VALIDATIONS.validateVideoGuideCompression({
    section_guide_acces: { video_avertissement: 'compression_en_cours' }
  })
  assert.equal(directes.length, 1)
  assert.equal(directes[0].section, 'guide_acces')
  assert.deepEqual(erreursGuide('compression_en_cours').map(e => e.message), directes.map(e => e.message))
})
