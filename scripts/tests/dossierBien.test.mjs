// scripts/tests/dossierBien.test.mjs
//
// Vérification du dossier Drive d'un bien : les quatre états rendus au client,
// et le rapprochement du nom de dossier avec le numéro.
// Exécution : npm test   (node --test, aucune dépendance, aucun appel réseau)

import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  chercherDossierBien,
  estNumeroExploitable,
  PARENT_FOLDER_ENV,
} = require('../../api/_dossierBienCore.cjs')
const { matchesPropertyFolder } = require('../../api/_googleDriveCore.cjs')

const PARENT = '1O2EPSs_aL0Mqk22Srw-v2822TIZf1PRx'

function avecDossierParent(valeur, fn) {
  const precedent = process.env[PARENT_FOLDER_ENV]
  if (valeur === null) delete process.env[PARENT_FOLDER_ENV]
  else process.env[PARENT_FOLDER_ENV] = valeur
  return Promise.resolve(fn()).finally(() => {
    if (precedent === undefined) delete process.env[PARENT_FOLDER_ENV]
    else process.env[PARENT_FOLDER_ENV] = precedent
  })
}

test('rapprochement du dossier : préfixe, pas "contains"', () => {
  // Convention Drive : « {numero}. {Nom Propriétaire} - {Ville} ».
  assert.equal(matchesPropertyFolder('2155. Sebastien VIAL - Vichy', '2155'), true)
  assert.equal(matchesPropertyFolder('2155 Sebastien VIAL', '2155'), true)
  assert.equal(matchesPropertyFolder('2155', '2155'), true)
  // Dossiers réels du Drive qui NE SONT PAS le dossier du bien 2155.
  assert.equal(matchesPropertyFolder('2155-TEST-COPIE. Sebastien VIAL - Vichy', '2155'), false)
  assert.equal(matchesPropertyFolder('21550. Autre proprietaire', '2155'), false)
  assert.equal(matchesPropertyFolder('Bien 2155', '2155'), false)
  assert.equal(matchesPropertyFolder('', '2155'), false)
})

test('numéro exploitable par la recherche Drive', () => {
  // Même forme que côté application : aucun numéro accepté par le formulaire ne
  // doit être refusé par la vérification Drive.
  assert.equal(estNumeroExploitable('2290'), true)
  assert.equal(estNumeroExploitable('PAR-2290'), true)
  assert.equal(estNumeroExploitable('2290.A'), true)
  assert.equal(estNumeroExploitable(' 2290 '), true)
  assert.equal(estNumeroExploitable(''), false)
  assert.equal(estNumeroExploitable(null), false)
  assert.equal(estNumeroExploitable('2290 DUPONT'), false)
  assert.equal(estNumeroExploitable('9'.repeat(51)), false)
  assert.equal(estNumeroExploitable("2290' or '1"), false, 'aucune injection dans la requête Drive')
  assert.equal(estNumeroExploitable('2290\\'), false, 'aucun antislash dans la requête Drive')
})

test('dossier trouvé : coche verte, nom exact et lien', async () => {
  await avecDossierParent(PARENT, async () => {
    const res = await chercherDossierBien('2155', {
      lister: async () => [{ id: 'abc123', name: '2155. Sebastien VIAL - Vichy' }],
    })
    assert.equal(res.etat, 'trouve')
    assert.equal(res.dossier.nom, '2155. Sebastien VIAL - Vichy')
    assert.equal(res.dossier.url, 'https://drive.google.com/drive/folders/abc123')
  })
})

test('dossier absent : état distinct, aucune erreur', async () => {
  await avecDossierParent(PARENT, async () => {
    const res = await chercherDossierBien('9998', { lister: async () => [] })
    assert.equal(res.etat, 'absent')
    assert.equal(res.dossier, null)
  })
})

test('plusieurs dossiers : signalé, avec les noms', async () => {
  await avecDossierParent(PARENT, async () => {
    const res = await chercherDossierBien('2155', {
      lister: async () => [
        { id: 'a', name: '2155. Un' },
        { id: 'b', name: '2155 Deux' },
      ],
    })
    assert.equal(res.etat, 'multiple')
    assert.deepEqual(res.dossiers.map((d) => d.nom), ['2155. Un', '2155 Deux'])
  })
})

test('panne Google : indisponible, jamais "absent"', async () => {
  await avecDossierParent(PARENT, async () => {
    const res = await chercherDossierBien('2155', {
      lister: async () => { throw new Error('Erreur Google Drive (503).') },
    })
    assert.equal(res.etat, 'indisponible')
    assert.equal(res.raison, 'erreur_google')
    assert.match(res.message, /impossible/i)
  })
})

test('dossier parent non configuré : indisponible, jamais "absent"', async () => {
  await avecDossierParent(null, async () => {
    let appele = false
    const res = await chercherDossierBien('2155', { lister: async () => { appele = true; return [] } })
    assert.equal(res.etat, 'indisponible')
    assert.equal(res.raison, 'config_absente')
    assert.equal(appele, false, 'aucun appel Google sans dossier parent configuré')
  })
})
