// scripts/tests/registreEnvois.test.mjs
//
// Cycle de vie du registre des envois « cible livret » : isolation entre
// fiches et entre champs, envois concurrents, suppression pendant l'envoi,
// réussite, échec, fin normale, et absence d'entrée périmée.
//
// Deux invariants tenus par ce fichier :
//   (1) aucune entrée périmée ne bloque la finalisation d'une fiche ;
//   (2) aucun envoi ne peut invalider le résultat d'une AUTRE fiche.
//
// Exécution : npm test   (node --test, aucune dépendance, aucun réseau)

import test from 'node:test'
import assert from 'node:assert/strict'
import { chargerModule } from './_chargerModule.mjs'

const { creerRegistreEnvois } = await chargerModule('../../src/lib/videoGuideAcces.js')

const GUIDE = 'section_guide_acces.video_acces'
const AUTRE_CHAMP = 'section_equipements.video_acces_poubelle'
const A = { id: 'fiche-A', numeroBien: '1111' }
const B = { id: 'fiche-B', numeroBien: '2222' }

test('fin normale : l\'envoi cesse de bloquer, et garde le droit d\'écrire', () => {
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)

  assert.equal(r.aDesEnvoisEnVol(A), true)
  assert.equal(r.estDernier('a1'), true)

  r.terminer('a1')
  assert.equal(r.aDesEnvoisEnVol(A), false, 'terminé : ne bloque plus la finalisation')
  assert.equal(r.estDernier('a1'), true, 'reste le dernier de son groupe')
})

test('échec : le finally libère la fiche, exactement comme un succès', () => {
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)
  r.terminer('a1') // appelé depuis le finally, quelle que soit l'issue
  assert.equal(r.aDesEnvoisEnVol(A), false)
})

test('isolation entre fiches : un envoi sur A ne bloque pas la finalisation de B', () => {
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)

  assert.equal(r.aDesEnvoisEnVol(A), true)
  assert.equal(r.aDesEnvoisEnVol(B), false)
})

test('isolation entre fiches : un envoi sur B ne périme pas le résultat de A', () => {
  // Le défaut du round 5 : la clé était le champ seul, donc B écrasait A.
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)
  r.declarer('b1', B, GUIDE)

  assert.equal(r.estDernier('a1'), true, 'A reste maître de son champ')
  assert.equal(r.estDernier('b1'), true, 'B aussi, chacun chez soi')
})

test('isolation entre champs : deux champs d\'une même fiche ne se périment pas', () => {
  const r = creerRegistreEnvois()
  r.declarer('g1', A, GUIDE)
  r.declarer('e1', A, AUTRE_CHAMP)

  assert.equal(r.estDernier('g1'), true)
  assert.equal(r.estDernier('e1'), true)
})

test('envois concurrents : seul le plus récent du même champ et de la même fiche écrit', () => {
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)
  r.declarer('a2', A, GUIDE)

  assert.equal(r.estDernier('a1'), false, 'le 1er envoi est périmé')
  assert.equal(r.estDernier('a2'), true)
  assert.equal(r.aDesEnvoisEnVol(A), true, 'les deux sont encore en vol')
})

test('envois concurrents : ordre d\'arrivée défavorable (le 1er finit après le 2e)', () => {
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)
  r.declarer('a2', A, GUIDE)

  // Le 2e arrive et publie
  r.terminer('a2')
  // Le 1er arrive ensuite : il ne doit pas écraser le choix le plus récent
  assert.equal(r.estDernier('a1'), false)
  r.terminer('a1')
  assert.equal(r.aDesEnvoisEnVol(A), false)
})

test('suppression pendant l\'envoi : la finalisation est libérée immédiatement', () => {
  // Le défaut du round 5 : l'entrée restait en vol jusqu'à la fin du job,
  // bloquant la finalisation jusqu'à 20 minutes pour une vidéo supprimée.
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)
  assert.equal(r.aDesEnvoisEnVol(A), true)

  assert.equal(r.annulerChamp(GUIDE, A), 1)
  assert.equal(r.aDesEnvoisEnVol(A), false, 'plus rien ne bloque')
  assert.equal(r.estDernier('a1'), false, 'et l\'envoi annulé n\'écrit plus')

  // Le job finit bien plus tard : il ne réveille rien.
  r.terminer('a1')
  assert.equal(r.aDesEnvoisEnVol(A), false)
})

test('suppression : n\'annule que le bon champ et la bonne fiche', () => {
  const r = creerRegistreEnvois()
  r.declarer('a_guide', A, GUIDE)
  r.declarer('a_equip', A, AUTRE_CHAMP)
  r.declarer('b_guide', B, GUIDE)

  assert.equal(r.annulerChamp(GUIDE, A), 1, 'un seul envoi concerné')
  assert.equal(r.estDernier('a_guide'), false)
  assert.equal(r.estDernier('a_equip'), true, 'autre champ : intact')
  assert.equal(r.estDernier('b_guide'), true, 'autre fiche : intacte')
  assert.equal(r.aDesEnvoisEnVol(B), true)
})

test('remplacement : supprimer puis réimporter rend la main au nouvel envoi', () => {
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)
  r.annulerChamp(GUIDE, A)
  r.declarer('a2', A, GUIDE)

  assert.equal(r.estDernier('a2'), true)
  assert.equal(r.estDernier('a1'), false)
  assert.equal(r.aDesEnvoisEnVol(A), true, 'le nouvel envoi bloque de nouveau, lui')
})

test('une clé inconnue n\'a aucun droit', () => {
  const r = creerRegistreEnvois()
  assert.equal(r.estDernier('jamais-declaree'), false)
  assert.equal(r.aDesEnvoisEnVol(A), false)
})

test('fiche créée pendant l\'envoi : l\'id apparaît, l\'envoi reste le sien', () => {
  // id null au départ (fiche pas encore en base), connu ensuite : c'est le
  // numéro de bien qui fait l'identité, comme partout ailleurs.
  const r = creerRegistreEnvois()
  const avant = { id: null, numeroBien: '9999' }
  const apres = { id: 'fiche-neuve', numeroBien: '9999' }
  r.declarer('n1', avant, GUIDE)

  assert.equal(r.aDesEnvoisEnVol(apres), true)
  assert.equal(r.estDernier('n1'), true)
  assert.equal(r.aDesEnvoisEnVol(B), false)
})

test('aucune entrée périmée ne s\'accumule : le registre reste borné', () => {
  const r = creerRegistreEnvois()

  // 50 envois successifs sur le même champ, chacun terminé avant le suivant.
  for (let i = 0; i < 50; i++) {
    r.declarer(`a${i}`, A, GUIDE)
    r.terminer(`a${i}`)
  }
  assert.equal(r.taille(), 1, 'un seul envoi conservé : le dernier de son groupe')
  assert.equal(r.estDernier('a49'), true)

  // Plusieurs fiches et plusieurs champs : une entrée par groupe, pas plus.
  for (let i = 0; i < 20; i++) {
    const fiche = { id: `f${i}`, numeroBien: `${i}` }
    r.declarer(`x${i}`, fiche, GUIDE)
    r.terminer(`x${i}`)
    r.declarer(`y${i}`, fiche, AUTRE_CHAMP)
    r.terminer(`y${i}`)
  }
  assert.equal(r.taille(), 41, '1 (groupe A) + 20 fiches × 2 champs')
})

test('les envois encore en vol ne sont jamais purgés', () => {
  const r = creerRegistreEnvois()
  r.declarer('a1', A, GUIDE)   // reste en vol (envoi très long)
  for (let i = 0; i < 10; i++) {
    r.declarer(`a_bis${i}`, A, GUIDE)
    r.terminer(`a_bis${i}`)
  }
  assert.equal(r.aDesEnvoisEnVol(A), true, 'l\'envoi long bloque toujours')
  assert.equal(r.estDernier('a1'), false, 'mais il est périmé, il n\'écrira pas')
  assert.equal(r.taille(), 2, 'l\'envoi en vol + le dernier terminé')
})

test('deux registres sont indépendants (aucun état partagé entre instances)', () => {
  const r1 = creerRegistreEnvois()
  const r2 = creerRegistreEnvois()
  r1.declarer('a1', A, GUIDE)
  assert.equal(r2.aDesEnvoisEnVol(A), false)
  assert.equal(r2.estDernier('a1'), false)
})
