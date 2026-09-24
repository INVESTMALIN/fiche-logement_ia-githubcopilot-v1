// scripts/tests/indicateurVideoGuide.test.mjs
//
// Indicateur global de l'envoi de la vidéo du Guide d'accès : phase annoncée
// (envoi, puis préparation), disparition à la fin comme à l'échec, et
// confirmation des sorties de la fiche par un bouton de l'appli.
//
// Invariant tenu par ce fichier : l'indicateur est affiché EXACTEMENT quand la
// finalisation attend (même prédicat), jamais pour une autre fiche.
//
// Exécution : npm test   (node --test, aucune dépendance, aucun réseau)

import test from 'node:test'
import assert from 'node:assert/strict'
import { chargerModule } from './_chargerModule.mjs'

const {
  creerRegistreEnvois,
  PHASE_VIDEO_GUIDE,
  MESSAGE_VIDEO_GUIDE_EN_COURS,
  MESSAGE_QUITTER_FICHE_VIDEO_EN_COURS,
  peutQuitterFiche,
} = await chargerModule('../../src/lib/videoGuideAcces.js')

const GUIDE = 'section_guide_acces.video_acces'
const A = { session: 'session-A', id: 'fiche-A', numeroBien: '1111' }
const B = { session: 'session-B', id: 'fiche-B', numeroBien: '2222' }

test("envoi, puis préparation, puis plus rien à la fin", () => {
  const r = creerRegistreEnvois()
  assert.equal(r.phaseEnVol(A), null, 'rien en cours au départ')

  r.declarer('a1', A, GUIDE)
  assert.equal(r.phaseEnVol(A), PHASE_VIDEO_GUIDE.ENVOI)

  r.passerEnPreparation('a1')
  assert.equal(r.phaseEnVol(A), PHASE_VIDEO_GUIDE.PREPARATION)

  r.terminer('a1')
  assert.equal(r.phaseEnVol(A), null, "fin normale : l'indicateur disparaît")
})

test("échec pendant l'envoi ou pendant la préparation : l'indicateur disparaît", () => {
  // terminer() est appelé depuis le finally de PhotoUpload, quelle que soit l'issue
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)
  r.terminer('a1')
  assert.equal(r.phaseEnVol(A), null, "échec du téléversement")

  r.declarer('a2', A, GUIDE)
  r.passerEnPreparation('a2')
  r.terminer('a2')
  assert.equal(r.phaseEnVol(A), null, "échec de la compression")
})

test("vidéo supprimée pendant l'envoi : l'indicateur disparaît aussitôt", () => {
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)
  r.passerEnPreparation('a1')
  r.annulerChamp(GUIDE, A)
  assert.equal(r.phaseEnVol(A), null)
})

test("un envoi plus récent : c'est sa phase qui est annoncée", () => {
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)
  r.passerEnPreparation('a1')
  r.declarer('a2', A, GUIDE)
  assert.equal(r.phaseEnVol(A), PHASE_VIDEO_GUIDE.ENVOI, 'le nouvel envoi démarre')

  r.terminer('a2')
  assert.equal(r.phaseEnVol(A), null, "l'ancien, supplanté, ne peut plus écrire : rien à protéger")
})

test("l'indicateur suit la fiche affichée", () => {
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)
  assert.equal(r.phaseEnVol(B), null, "l'envoi de A ne s'affiche pas sur B")

  const apresReset = { session: 'session-neuve', id: null, numeroBien: null }
  assert.equal(r.phaseEnVol(apresReset), null, 'ni sur un formulaire réinitialisé')

  // Retour sur A, enregistrée : session neuve, même id → l'envoi peut encore
  // y écrire, l'indicateur revient.
  const retourSurA = { session: 'session-A-2', id: 'fiche-A', numeroBien: '1111' }
  assert.equal(r.phaseEnVol(retourSurA), PHASE_VIDEO_GUIDE.ENVOI)
})

test("fiche créée par l'autosave pendant l'envoi : l'indicateur reste", () => {
  const r = creerRegistreEnvois()
  const nouvelle = { session: 'session-N', id: null, numeroBien: '3333' }
  r.declarer('n1', nouvelle, GUIDE)
  const creee = { session: 'session-N', id: 'fiche-N', numeroBien: '3333' }
  assert.equal(r.phaseEnVol(creee), PHASE_VIDEO_GUIDE.ENVOI)
})

test("passerEnPreparation sur un envoi terminé ou inconnu : aucun effet", () => {
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)
  r.terminer('a1')
  r.passerEnPreparation('a1')
  r.passerEnPreparation('inconnu')
  assert.equal(r.phaseEnVol(A), null)
})

test("indicateur affiché ⇔ finalisation bloquée, à chaque étape", () => {
  const r = creerRegistreEnvois()
  const fiches = [A, B, { session: 'session-A-2', id: 'fiche-A', numeroBien: '1111' }]
  const verifier = (etape) => {
    for (const f of fiches) {
      assert.equal(r.aDesEnvoisEnVol(f), r.phaseEnVol(f) !== null, `${etape}, fiche ${f.session}`)
    }
  }
  verifier('départ')
  r.declarer('a1', A, GUIDE); verifier('a1 déclaré')
  r.declarer('b1', B, GUIDE); verifier('b1 déclaré')
  r.passerEnPreparation('a1'); verifier('a1 en préparation')
  r.declarer('a2', A, GUIDE); verifier('a2 supplante a1')
  r.annulerChamp(GUIDE, A); verifier('vidéo de A supprimée')
  r.terminer('a1'); r.terminer('a2'); verifier('A terminés')
  r.passerEnPreparation('b1'); r.terminer('b1'); verifier('b1 terminé')
})

test('textes de l\'indicateur, tels que demandés', () => {
  assert.equal(
    MESSAGE_VIDEO_GUIDE_EN_COURS[PHASE_VIDEO_GUIDE.ENVOI],
    "Envoi de la vidéo en cours. Ne fermez pas la Fiche Logement. Vous pouvez continuer à remplir les autres sections pendant l'envoi."
  )
  assert.equal(
    MESSAGE_VIDEO_GUIDE_EN_COURS[PHASE_VIDEO_GUIDE.PREPARATION],
    'Préparation de la vidéo en cours. Ne fermez pas la Fiche Logement. Vous pouvez continuer à remplir les autres sections pendant le traitement.'
  )
})

test('sortie de la fiche : aucune question sans envoi en cours', () => {
  let appels = 0
  const confirmer = () => { appels += 1; return false }
  assert.equal(peutQuitterFiche(null, confirmer), true)
  assert.equal(appels, 0, 'la confirmation ne doit pas être posée')
})

test('sortie de la fiche pendant un envoi : on demande, et la réponse décide', () => {
  for (const phase of [PHASE_VIDEO_GUIDE.ENVOI, PHASE_VIDEO_GUIDE.PREPARATION]) {
    const vus = []
    assert.equal(peutQuitterFiche(phase, (m) => { vus.push(m); return false }), false, `${phase} : refus → on reste`)
    assert.equal(peutQuitterFiche(phase, (m) => { vus.push(m); return true }), true, `${phase} : accord → on quitte`)
    assert.deepEqual(vus, [MESSAGE_QUITTER_FICHE_VIDEO_EN_COURS, MESSAGE_QUITTER_FICHE_VIDEO_EN_COURS])
  }
  assert.equal(
    MESSAGE_QUITTER_FICHE_VIDEO_EN_COURS,
    "Une vidéo est en cours d'envoi ou de préparation. Si vous quittez cette fiche, vous devrez peut-être supprimer puis réimporter la vidéo. Voulez-vous vraiment quitter ?"
  )
})
