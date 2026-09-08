// scripts/tests/mondayBien.test.mjs
//
// Vérification Monday du parcours « changer le numéro de bien » : les quatre
// états déduits de la réponse de l'Edge Function `monday-bien`.
// Exécution : npm test   (node --test, aucune dépendance, aucun appel réseau)

import test from 'node:test'
import assert from 'node:assert/strict'
import { chargerModule } from './_chargerModule.mjs'

const { evaluerReponseMonday } = await chargerModule('../../src/lib/verificationMonday.js')

test('état 1 — une ligne : trouve, avec son nom', () => {
  const res = evaluerReponseMonday({
    success: true,
    lignes: [{ id: '9001', nom: '2290 - Dupont - Caen' }],
  })
  assert.equal(res.etat, 'trouve')
  assert.equal(res.lignes[0].nom, '2290 - Dupont - Caen')
})

test('état 2 — aucune ligne : absent', () => {
  const res = evaluerReponseMonday({ success: true, lignes: [] })
  assert.equal(res.etat, 'absent')
  assert.deepEqual(res.lignes, [])
})

test('état 3 — plusieurs lignes : multiple, toutes rendues', () => {
  const res = evaluerReponseMonday({
    success: true,
    lignes: [
      { id: '9001', nom: '2290 - Dupont - Caen' },
      { id: '9002', nom: '2290 - doublon' },
    ],
  })
  assert.equal(res.etat, 'multiple')
  assert.deepEqual(res.lignes.map((l) => l.nom), ['2290 - Dupont - Caen', '2290 - doublon'])
})

test('état 4 — échec serveur : indisponible, jamais "absent"', () => {
  // Panne Monday, rôle refusé, session expirée : on n'a pas pu regarder.
  // Répondre « absent » ferait créer un doublon d'une ligne qui existe.
  for (const reponse of [
    { success: false, error: 'MONDAY_API_ERROR', message: "Monday n'a pas répondu correctement." },
    { success: false, error: 'FORBIDDEN', message: 'Réservé aux administrateurs.' },
  ]) {
    const res = evaluerReponseMonday(reponse)
    assert.equal(res.etat, 'indisponible')
    assert.deepEqual(res.lignes, [])
  }
})

test('état 4 — réponse illisible : indisponible, jamais "absent"', () => {
  // Le piège : une réponse qui se dit réussie sans porter de lignes. La lire
  // comme une liste vide annoncerait une absence qui n'a pas été constatée.
  for (const reponse of [null, undefined, {}, { success: true }, { success: true, lignes: null }]) {
    const res = evaluerReponseMonday(reponse)
    assert.equal(res.etat, 'indisponible')
    assert.deepEqual(res.lignes, [])
  }
})
