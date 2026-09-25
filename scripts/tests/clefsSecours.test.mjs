// scripts/tests/clefsSecours.test.mjs
//
// Boîte à clés de secours (section Clés) :
//   - nettoyage de la branche abandonnée (« non », changement de type) sans
//     jamais toucher aux photos ;
//   - masquage du bloc dans les rendus (PDF, aperçu) tant que la réponse
//     n'est pas « oui » ;
//   - valeur envoyée à la colonne Monday « BAC secours » ;
//   - validation à la finalisation : bloc « oui » incomplet refusé, « non »
//     accepté — sur `validateRequiredFields` réel, bundlé par esbuild (le
//     module a des imports), sans rien finaliser ni écrire.
// Exécution : npm test

import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { chargerModule } from './_chargerModule.mjs'

const {
  SECOURS_TYPES,
  LIBELLES_SECOURS,
  appliquerReponseSecours,
  appliquerTypeSecours,
  masquerSecoursInactif,
  valeurMondayBacSecours
} = await chargerModule('../../src/lib/clefsSecours.js')

async function chargerAvecImports(cheminRelatif) {
  const entree = fileURLToPath(new URL(cheminRelatif, import.meta.url))
  const res = await build({ entryPoints: [entree], bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent' })
  return import(`data:text/javascript;base64,${Buffer.from(res.outputFiles[0].text).toString('base64')}`)
}
const { validateRequiredFields } = await chargerAvecImports('../../src/lib/validationConfig.js')

const PHOTO_A = 'https://example.test/secours-emplacement.jpg'
const PHOTO_B = 'https://example.test/secours-emballage.jpg'

const sectionOuiTtlock = () => ({
  boiteType: 'Masterlock',
  masterlock: { code: '1111' },
  secours: true,
  secoursType: 'TTlock',
  secoursEmplacement: 'Derrière le portail',
  secoursEmplacementPhoto: [PHOTO_A],
  secoursEmplacementEmballage: 'Local poubelles',
  secoursEmplacementEmballagePhoto: [PHOTO_B],
  secoursTtlock: { masterpinConciergerie: '2863', codeProprietaire: '1234', codeMenage: '5678' },
  secoursMasterlock: { code: '9999' }
})

// ------------------------------------------------------------
// Nettoyage de branche
// ------------------------------------------------------------
test('« non » : type, emplacements et codes vidés, photos conservées, boîte principale intacte', () => {
  const s = appliquerReponseSecours(sectionOuiTtlock(), false)
  assert.equal(s.secours, false)
  assert.equal(s.secoursType, '')
  assert.equal(s.secoursEmplacement, '')
  assert.equal(s.secoursEmplacementEmballage, '')
  assert.deepEqual(s.secoursTtlock, { masterpinConciergerie: '', codeProprietaire: '', codeMenage: '' })
  assert.deepEqual(s.secoursMasterlock, { code: '' })
  assert.deepEqual(s.secoursEmplacementPhoto, [PHOTO_A])
  assert.deepEqual(s.secoursEmplacementEmballagePhoto, [PHOTO_B])
  assert.equal(s.boiteType, 'Masterlock')
  assert.deepEqual(s.masterlock, { code: '1111' })
})

test('réponse retirée (null) : même nettoyage que « non »', () => {
  const s = appliquerReponseSecours(sectionOuiTtlock(), null)
  assert.equal(s.secours, null)
  assert.equal(s.secoursType, '')
  assert.deepEqual(s.secoursTtlock.codeMenage, '')
})

test('« oui » : rien n\'est effacé', () => {
  const avant = { ...sectionOuiTtlock(), secours: false }
  const s = appliquerReponseSecours(avant, true)
  assert.equal(s.secours, true)
  assert.equal(s.secoursEmplacement, 'Derrière le portail')
  assert.equal(s.secoursTtlock.codeMenage, '5678')
})

test('changement de type : codes de l\'autre type vidés, ceux du type choisi conservés', () => {
  const versMasterlock = appliquerTypeSecours(sectionOuiTtlock(), 'Masterlock')
  assert.equal(versMasterlock.secoursType, 'Masterlock')
  assert.deepEqual(versMasterlock.secoursTtlock, { masterpinConciergerie: '', codeProprietaire: '', codeMenage: '' })
  assert.deepEqual(versMasterlock.secoursMasterlock, { code: '9999' })
  assert.equal(versMasterlock.secoursEmplacement, 'Derrière le portail')

  const versTtlock = appliquerTypeSecours(sectionOuiTtlock(), 'TTlock')
  assert.deepEqual(versTtlock.secoursMasterlock, { code: '' })
  assert.equal(versTtlock.secoursTtlock.codeMenage, '5678')
})

test('le nettoyage ne mute jamais la section d\'origine', () => {
  const origine = sectionOuiTtlock()
  appliquerReponseSecours(origine, false)
  appliquerTypeSecours(origine, 'Masterlock')
  assert.equal(origine.secoursTtlock.codeMenage, '5678')
  assert.equal(origine.secoursMasterlock.code, '9999')
})

test('types proposés : TTlock et Masterlock uniquement', () => {
  assert.deepEqual([...SECOURS_TYPES], ['TTlock', 'Masterlock'])
})

// ------------------------------------------------------------
// Masquage dans les rendus
// ------------------------------------------------------------
test('rendu : bloc de secours retiré (photos comprises) tant que la réponse n\'est pas « oui »', () => {
  for (const reponse of [false, null, undefined]) {
    const vu = masquerSecoursInactif('section_clefs', { ...sectionOuiTtlock(), secours: reponse })
    // Seule la réponse elle-même reste (rendue « Non », ou vide donc invisible)
    assert.deepEqual(Object.keys(vu).filter((k) => k.startsWith('secours')), ['secours'])
    assert.equal(vu.boiteType, 'Masterlock')
    assert.ok(!JSON.stringify(vu).includes(PHOTO_A))
  }
})

test('rendu : « oui » → section inchangée ; autres sections jamais touchées', () => {
  const s = sectionOuiTtlock()
  assert.equal(masquerSecoursInactif('section_clefs', s), s)
  const autre = { secoursType: 'x' }
  assert.equal(masquerSecoursInactif('section_logement', autre), autre)
  assert.equal(masquerSecoursInactif('section_clefs', null), null)
})

test('libellés : chaque clé du bloc a un libellé lisible', () => {
  for (const cle of Object.keys(sectionOuiTtlock()).filter((k) => k.startsWith('secours'))) {
    assert.ok(LIBELLES_SECOURS[cle], `libellé manquant : ${cle}`)
  }
})

// ------------------------------------------------------------
// Monday « BAC secours »
// ------------------------------------------------------------
test('Monday : oui + TTlock → TTlock ; oui + Masterlock → Masterlock ; non / sans réponse / sans type → null', () => {
  assert.equal(valeurMondayBacSecours({ secours: true, secoursType: 'TTlock' }), 'TTlock')
  assert.equal(valeurMondayBacSecours({ secours: true, secoursType: 'Masterlock' }), 'Masterlock')
  assert.equal(valeurMondayBacSecours({ secours: false, secoursType: 'TTlock' }), null)
  assert.equal(valeurMondayBacSecours({ secours: null, secoursType: 'TTlock' }), null)
  assert.equal(valeurMondayBacSecours({ secours: true, secoursType: '' }), null)
  assert.equal(valeurMondayBacSecours({ secours: true, secoursType: 'Igloohome' }), null)
  assert.equal(valeurMondayBacSecours(undefined), null)
})

// ------------------------------------------------------------
// Validation à la finalisation (validateRequiredFields réel)
// ------------------------------------------------------------
const erreursClefs = (sectionClefs) => {
  const base = {
    boiteType: 'Masterlock',
    emplacementBoite: 'Porte',
    masterlock: { code: '1111' },
    interphone: false,
    tempoGache: false,
    digicode: false
  }
  const errors = validateRequiredFields({ section_clefs: { ...base, ...sectionClefs } })
  return (errors.clefs || []).map((e) => e.field)
}

test('validation : question sans réponse → refusée', () => {
  assert.deepEqual(erreursClefs({ secours: null }), ['section_clefs.secours'])
})

test('validation : « non » → acceptée, même avec des restes (rien d\'obligatoire)', () => {
  assert.deepEqual(erreursClefs({ secours: false, secoursType: '', secoursEmplacement: '' }), [])
})

test('validation : « oui » incomplet → type et emplacement exigés', () => {
  assert.deepEqual(erreursClefs({ secours: true, secoursType: '', secoursEmplacement: '' }).sort(), [
    'section_clefs.secoursEmplacement',
    'section_clefs.secoursType'
  ])
})

test('validation : « oui » + TTlock → les trois codes TTlock exigés, pas le code Masterlock', () => {
  const champs = erreursClefs({ secours: true, secoursType: 'TTlock', secoursEmplacement: 'Portail', secoursTtlock: { masterpinConciergerie: '', codeProprietaire: '', codeMenage: '' } })
  assert.deepEqual(champs.sort(), [
    'section_clefs.secoursTtlock.codeMenage',
    'section_clefs.secoursTtlock.codeProprietaire',
    'section_clefs.secoursTtlock.masterpinConciergerie'
  ])
})

test('validation : « oui » + Masterlock → code exigé ; complet → accepté', () => {
  assert.deepEqual(erreursClefs({ secours: true, secoursType: 'Masterlock', secoursEmplacement: 'Portail', secoursMasterlock: { code: '' } }), [
    'section_clefs.secoursMasterlock.code'
  ])
  assert.deepEqual(erreursClefs({ secours: true, secoursType: 'Masterlock', secoursEmplacement: 'Portail', secoursMasterlock: { code: '4242' } }), [])
  assert.deepEqual(erreursClefs({ ...sectionOuiTtlock(), emplacementBoite: 'Porte' }), [])
})
