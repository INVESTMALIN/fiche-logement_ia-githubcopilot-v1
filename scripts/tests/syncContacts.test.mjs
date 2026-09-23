// scripts/tests/syncContacts.test.mjs
//
// Synchronisation manuelle des contacts maintenance vers Monday.
// Trois invariants :
//   (1) le second essai de sauvegarde part avec l'ÉTAT COURANT, jamais nu ;
//   (2) rien n'est poussé tant que tout n'est pas enregistré ;
//   (3) tout échec produit un message visible.
//
// Vérifiable ici et pas dans le navigateur : la synchronisation manuelle
// exige une fiche finalisée, et la fiche de démo ne doit jamais l'être.
//
// Exécution : npm test   (node --test, aucune dépendance, aucun réseau)

import test from 'node:test'
import assert from 'node:assert/strict'
import { chargerModule } from './_chargerModule.mjs'

const {
  orchestrerSyncContacts,
  libelleToastContacts,
  MESSAGE_SAVE_FAILED,
  MESSAGE_SAVE_INCOMPLETE,
} = await chargerModule('../../src/lib/syncContacts.js')

// Harnais : enregistre les arguments de chaque appel.
function harnais(reponsesSauvegarde, etatCourant = { v: 'à jour' }) {
  const journal = { sauvegardes: [], pousses: [], echecs: [], lecturesEtat: 0 }
  let i = 0
  return {
    journal,
    // Lu au dernier moment : le journal compte les lectures pour le prouver.
    lireEtatCourant: () => { journal.lecturesEtat += 1; return etatCourant },
    sauvegarder: async (etat) => {
      journal.sauvegardes.push(etat)
      return reponsesSauvegarde[Math.min(i++, reponsesSauvegarde.length - 1)]
    },
    pousser: async (data) => {
      journal.pousses.push(data)
      return { success: true, pushedCount: 1, data }
    },
    signalerEchec: (error, message) => {
      journal.echecs.push({ error, message })
      return { success: false, error, message }
    }
  }
}

const OK = { success: true, data: { id: 'f1', contacts: ['a'] } }

test('cas nominal : une sauvegarde, puis le push avec ses données', async () => {
  const h = harnais([OK])
  const res = await orchestrerSyncContacts(h)

  assert.equal(h.journal.sauvegardes.length, 1)
  assert.deepEqual(h.journal.pousses, [OK.data])
  assert.deepEqual(h.journal.echecs, [])
  assert.equal(res.success, true)
})

test('modification pendant l\'envoi : le second essai reçoit l\'ÉTAT COURANT', async () => {
  // Un `sauvegarder()` nu réutiliserait le formulaire figé dans la fermeture
  // de l'appelant et réécrirait des valeurs périmées.
  const etatCourant = { id: 'f1', contacts: ['a', 'b'], marqueur: 'à jour' }
  const h = harnais([
    { success: true, data: { id: 'f1', contacts: ['a'] }, modificationsEnAttente: true },
    { success: true, data: etatCourant }
  ], etatCourant)

  const res = await orchestrerSyncContacts(h)

  assert.equal(h.journal.sauvegardes.length, 2)
  assert.equal(h.journal.sauvegardes[0], undefined, 'le premier essai part sans état imposé')
  assert.deepEqual(h.journal.sauvegardes[1], etatCourant, 'le second essai porte l\'état courant')
  assert.deepEqual(h.journal.pousses, [etatCourant], 'et c\'est cet état qui est poussé')
  assert.equal(res.success, true)
})

test('l\'état courant est lu AU MOMENT du second essai, pas avant', async () => {
  // Lu trop tôt, il manquerait les saisies arrivées pendant le premier envoi.
  const h = harnais([
    { success: true, data: {}, modificationsEnAttente: true },
    { success: true, data: {} }
  ])
  const lecturesAvant = []
  const sauvegarderOrigine = h.sauvegarder
  h.sauvegarder = async (etat) => {
    lecturesAvant.push(h.journal.lecturesEtat)
    return sauvegarderOrigine(etat)
  }

  await orchestrerSyncContacts(h)

  assert.deepEqual(lecturesAvant, [0, 1], 'aucune lecture avant le 1er essai, une seule avant le 2e')
  assert.equal(h.journal.lecturesEtat, 1, 'l\'état n\'est lu qu\'une fois, au moment utile')
})

test('cas nominal : l\'état courant n\'est jamais lu', async () => {
  const h = harnais([OK])
  await orchestrerSyncContacts(h)
  assert.equal(h.journal.lecturesEtat, 0)
})

test('sauvegarde en échec : aucun push, message visible', async () => {
  const h = harnais([{ success: false, error: 'Erreur réseau' }])
  const res = await orchestrerSyncContacts(h)

  assert.deepEqual(h.journal.pousses, [], 'rien ne doit partir vers Monday')
  assert.equal(h.journal.echecs.length, 1)
  assert.equal(h.journal.echecs[0].error, 'SAVE_FAILED')
  assert.equal(h.journal.echecs[0].message, 'Erreur réseau', 'la raison réelle est remontée')
  assert.equal(res.success, false)
})

test('sauvegarde en échec sans raison : message par défaut, jamais vide', async () => {
  const h = harnais([{ success: false }])
  await orchestrerSyncContacts(h)
  assert.equal(h.journal.echecs[0].message, MESSAGE_SAVE_FAILED)
  assert.match(MESSAGE_SAVE_FAILED, /aucun contact/i)
})

test('second essai en échec : aucun push, message visible', async () => {
  const h = harnais([
    { success: true, data: {}, modificationsEnAttente: true },
    { success: false, error: 'Timeout' }
  ])
  const res = await orchestrerSyncContacts(h)

  assert.equal(h.journal.sauvegardes.length, 2)
  assert.deepEqual(h.journal.pousses, [])
  assert.equal(h.journal.echecs[0].error, 'SAVE_FAILED')
  assert.equal(res.success, false)
})

test('toujours incomplet après le second essai : on renonce, on ne pousse pas', async () => {
  const h = harnais([
    { success: true, data: {}, modificationsEnAttente: true },
    { success: true, data: {}, modificationsEnAttente: true }
  ])
  const res = await orchestrerSyncContacts(h)

  assert.equal(h.journal.sauvegardes.length, 2, 'un seul second essai, pas de boucle')
  assert.deepEqual(h.journal.pousses, [], 'aucun état partiel ne part vers Monday')
  assert.equal(h.journal.echecs[0].error, 'SAVE_INCOMPLETE')
  assert.equal(h.journal.echecs[0].message, MESSAGE_SAVE_INCOMPLETE)
  assert.match(MESSAGE_SAVE_INCOMPLETE, /aucun contact/i)
  assert.match(MESSAGE_SAVE_INCOMPLETE, /relancez/i, 'le message dit quoi faire')
  assert.equal(res.success, false)
})

test('réponse de sauvegarde absente ou inexploitable : échec, jamais de push', async () => {
  for (const reponse of [null, undefined, {}, 'oui', 0]) {
    const h = harnais([reponse])
    const res = await orchestrerSyncContacts(h)
    assert.deepEqual(h.journal.pousses, [], `push interdit pour ${JSON.stringify(reponse)}`)
    assert.equal(h.journal.echecs[0].error, 'SAVE_FAILED')
    assert.equal(res.success, false)
  }
})

test('libellé du toast : un message explicite l\'emporte sur le décompte', () => {
  const { titre, texte, avecRelance } = libelleToastContacts({ type: 'error', message: MESSAGE_SAVE_INCOMPLETE })
  assert.equal(titre, 'Synchronisation impossible')
  assert.equal(texte, MESSAGE_SAVE_INCOMPLETE)
  assert.equal(avecRelance, false, 'pas de « réessayez en sauvegardant » : rien n\'a été tenté')
})

test('libellé du toast : le décompte historique est conservé', () => {
  assert.deepEqual(libelleToastContacts({ failedCount: 2, total: 2 }), {
    titre: 'Sync Monday partielle',
    texte: '2 contacts n\'ont pas pu être remontés vers Monday.',
    avecRelance: true
  })
  assert.deepEqual(libelleToastContacts({ failedCount: 1, total: 1 }), {
    titre: 'Sync Monday partielle',
    texte: '1 contact n\'a pas pu être remonté vers Monday.',
    avecRelance: true
  })
  assert.equal(libelleToastContacts({ failedCount: 1, total: 3 }).texte, '1/3 contacts n\'ont pas pu être remontés vers Monday.')
})

test('libellé du toast : toast vide ou absent ne lève jamais', () => {
  for (const toast of [null, undefined, {}]) {
    const r = libelleToastContacts(toast)
    assert.ok(typeof r.titre === 'string' && r.titre.length > 0)
    assert.ok(typeof r.texte === 'string' && r.texte.length > 0)
  }
})
