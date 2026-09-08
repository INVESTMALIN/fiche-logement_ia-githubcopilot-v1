// scripts/tests/dossierBien.test.mjs
//
// Vérification du dossier Drive d'un bien : les quatre états rendus au client.
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

// Convention Drive « {numero}. {Nom Propriétaire} - {Ville} ». La vérification
// du parcours administrateur ne s'en sert PAS — elle montre tous les dossiers
// remontés et laisse l'administrateur juger. Ce rapprochement reste la garde du
// POC d'upload direct (`_drivePocCore.cjs`), qui lui doit refuser une cible.
test('rapprochement du dossier : préfixe « {numero}. », pas "contains"', () => {
  assert.equal(matchesPropertyFolder('2155. Sebastien VIAL - Vichy', '2155'), true)
  assert.equal(matchesPropertyFolder('  2155. Sebastien VIAL  ', '2155'), true)
  assert.equal(matchesPropertyFolder('2155 Sebastien VIAL', '2155'), false)
  assert.equal(matchesPropertyFolder('2155 Archive', '2155'), false)
  assert.equal(matchesPropertyFolder('2155', '2155'), false)
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

// `lister` rend la même forme que listPropertyFolders. Seuls les `candidats`
// comptent pour ce parcours : c'est ce que remonte la requête `contains`, donc
// ce que le scénario Make peut attraper.
function resultatDrive(candidats, numero = '2155') {
  return async () => ({
    candidats,
    correspondances: candidats.filter((d) => matchesPropertyFolder(d.name, numero)),
  })
}

// ── Les quatre états rendus au client ──────────────────────────────────────

test('état 1 — aucun dossier : absent, aucune erreur', async () => {
  await avecDossierParent(PARENT, async () => {
    const res = await chercherDossierBien('9998', { lister: resultatDrive([], '9998') })
    assert.equal(res.etat, 'absent')
    assert.deepEqual(res.dossiers, [])
  })
})

test('état 2 — un seul dossier : trouve, avec son nom exact et son lien', async () => {
  await avecDossierParent(PARENT, async () => {
    const res = await chercherDossierBien('2155', {
      lister: resultatDrive([{ id: 'abc123', name: '2155. Sebastien VIAL - Vichy' }]),
    })
    assert.equal(res.etat, 'trouve')
    assert.equal(res.dossiers.length, 1)
    assert.equal(res.dossiers[0].nom, '2155. Sebastien VIAL - Vichy')
    assert.equal(res.dossiers[0].url, 'https://drive.google.com/drive/folders/abc123')
  })
})

test('état 2 — un dossier hors convention : rendu tel quel, sans être écarté', async () => {
  // « 2155-TEST-COPIE. » n'est pas le dossier du bien 2155, mais Make le
  // trouverait quand même. On rend son nom exact : c'est lisible à l'œil nu et
  // l'écran demande de le vérifier. Rien ici ne prétend qu'il correspond.
  await avecDossierParent(PARENT, async () => {
    const res = await chercherDossierBien('2155', {
      lister: resultatDrive([{ id: 'b', name: '2155-TEST-COPIE. Sebastien VIAL - Vichy' }]),
    })
    assert.equal(res.etat, 'trouve')
    assert.equal(res.dossiers[0].nom, '2155-TEST-COPIE. Sebastien VIAL - Vichy')
  })
})

test('état 3 — plusieurs dossiers : ambigu, avec tous les noms', async () => {
  await avecDossierParent(PARENT, async () => {
    const res = await chercherDossierBien('2155', {
      lister: resultatDrive([
        { id: 'a', name: '2155. Un' },
        { id: 'b', name: '2155. Deux' },
      ]),
    })
    assert.equal(res.etat, 'ambigu')
    assert.deepEqual(res.dossiers.map((d) => d.nom), ['2155. Un', '2155. Deux'])
  })
})

test('état 3 — bon dossier + leurre : ambigu, les deux sont montrés', async () => {
  // Make cherche en `contains` avec limit 1 : il peut attraper le leurre et y
  // déposer les médias. Cacher le leurre laisserait ce risque invisible.
  await avecDossierParent(PARENT, async () => {
    const res = await chercherDossierBien('2155', {
      lister: resultatDrive([
        { id: 'a', name: '2155. Sebastien VIAL - Vichy' },
        { id: 'b', name: '2155-TEST-COPIE. Sebastien VIAL - Vichy' },
      ]),
    })
    assert.equal(res.etat, 'ambigu')
    assert.equal(res.dossiers.length, 2)
  })
})

test('état 4 — panne Google : indisponible, jamais "absent"', async () => {
  await avecDossierParent(PARENT, async () => {
    const res = await chercherDossierBien('2155', {
      lister: async () => { throw new Error('Erreur Google Drive (503).') },
    })
    assert.equal(res.etat, 'indisponible')
    assert.equal(res.raison, 'erreur_google')
    assert.deepEqual(res.dossiers, [])
    assert.match(res.message, /Drive/)
  })
})

test('état 4 — dossier parent non configuré : indisponible, jamais "absent"', async () => {
  await avecDossierParent(null, async () => {
    let appele = false
    const res = await chercherDossierBien('2155', {
      lister: async () => { appele = true; return { candidats: [], correspondances: [] } },
    })
    assert.equal(res.etat, 'indisponible')
    assert.equal(res.raison, 'config_absente')
    assert.deepEqual(res.dossiers, [])
    assert.equal(appele, false, 'aucun appel Google sans dossier parent configuré')
  })
})
