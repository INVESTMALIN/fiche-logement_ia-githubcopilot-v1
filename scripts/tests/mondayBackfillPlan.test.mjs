// scripts/tests/mondayBackfillPlan.test.mjs
//
// Preuves du plan de rattrapage identifiants / MDP → Monday, sans réseau :
//   - une cellule Monday déjà remplie n'est JAMAIS planifiée (même si la base
//     diffère) ;
//   - une cellule vide n'est remplie que si la base a une valeur ;
//   - numéro absent de Monday, numéro en double, numéro vide → fiche sautée,
//     aucune écriture ;
//   - le rapport (décisions, fiches sautées, résumé) ne contient aucune valeur.
// Exécution : npm test

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHAMPS,
  estVide,
  indexerItems,
  masquer,
  planifierRattrapage,
  resumer
} from '../lib/mondayBackfillPlan.mjs'

const COL = Object.fromEntries(CHAMPS.map((c) => [c.field, c.columnId]))

const item = (id, numero, cellules = {}) => ({
  id,
  name: `Item ${id}`,
  column_values: [
    { id: 'num_ro', text: numero },
    ...CHAMPS.map((c) => ({ id: c.columnId, text: cellules[c.field] ?? '' }))
  ]
})

const EMAIL_A = 'perso.proprio@example.test'
const EMAIL_B = 'bien@letahost.example.test'
const MDP_A = 'secret-airbnb-123'
const MDP_B = 'secret-booking-456'

const ficheComplete = (id, numero, extra = {}) => ({
  id,
  logement_numero_bien: numero,
  airbnb_email: EMAIL_A,
  booking_email: EMAIL_B,
  airbnb_mot_passe: MDP_A,
  booking_mot_passe: MDP_B,
  ...extra
})

const decisionsDe = (plan, numero) => Object.fromEntries(
  plan.decisions.filter((d) => d.numeroBien === numero).map((d) => [d.field, d.action === 'remplir' ? 'remplir' : d.raison])
)

test('cellules vides + valeurs en base → les 4 cellules sont à remplir, avec la bonne colonne', () => {
  const plan = planifierRattrapage([ficheComplete('f1', '1001')], indexerItems([item('i1', '1001')]))
  assert.equal(plan.ecritures.length, 4)
  assert.deepEqual(
    plan.ecritures.map((e) => [e.field, e.columnId, e.itemId]).sort(),
    CHAMPS.map((c) => [c.field, c.columnId, 'i1']).sort()
  )
  assert.equal(plan.ecritures.find((e) => e.field === 'airbnb_email').valeur, EMAIL_A)
})

test('JAMAIS d\'écrasement : une cellule Monday remplie est sautée, même si la base diffère', () => {
  const monday = item('i1', '1001', { airbnb_email: 'autre@example.test', booking_mot_passe: 'ancien-mdp' })
  const plan = planifierRattrapage([ficheComplete('f1', '1001')], indexerItems([monday]))
  assert.deepEqual(decisionsDe(plan, '1001'), {
    airbnb_email: 'DEJA_REMPLI',
    booking_email: 'remplir',
    airbnb_mot_passe: 'remplir',
    booking_mot_passe: 'DEJA_REMPLI'
  })
  assert.ok(!plan.ecritures.some((e) => e.columnId === COL.airbnb_email || e.columnId === COL.booking_mot_passe))
})

test('une cellule contenant seulement des espaces compte comme vide', () => {
  const plan = planifierRattrapage([ficheComplete('f1', '1001')], indexerItems([item('i1', '1001', { airbnb_email: '   ' })]))
  assert.equal(decisionsDe(plan, '1001').airbnb_email, 'remplir')
})

test('base vide (null, "", espaces) → cellule sautée, rien d\'écrit', () => {
  const fiche = ficheComplete('f1', '1001', { airbnb_email: null, booking_email: '', airbnb_mot_passe: '  ' })
  const plan = planifierRattrapage([fiche], indexerItems([item('i1', '1001')]))
  assert.deepEqual(decisionsDe(plan, '1001'), {
    airbnb_email: 'BASE_VIDE',
    booking_email: 'BASE_VIDE',
    airbnb_mot_passe: 'BASE_VIDE',
    booking_mot_passe: 'remplir'
  })
  assert.equal(plan.ecritures.length, 1)
})

test('aucune ligne Monday pour le numéro → fiche sautée entière, aucune écriture', () => {
  const plan = planifierRattrapage([ficheComplete('f1', '1001')], indexerItems([item('i9', '9999')]))
  assert.equal(plan.ecritures.length, 0)
  assert.deepEqual(plan.fichesSautees, [{ ficheId: 'f1', numeroBien: '1001', raison: 'ITEM_ABSENT' }])
})

test('plusieurs lignes Monday pour le même numéro → fiche sautée (le sync prendrait la première, pas nous)', () => {
  const plan = planifierRattrapage([ficheComplete('f1', '1001')], indexerItems([item('i1', '1001'), item('i2', '1001')]))
  assert.equal(plan.ecritures.length, 0)
  assert.equal(plan.fichesSautees[0].raison, 'ITEM_AMBIGU')
  assert.deepEqual(plan.fichesSautees[0].itemIds, ['i1', 'i2'])
})

test('numéro de bien vide en base → fiche sautée', () => {
  const plan = planifierRattrapage([ficheComplete('f1', null)], indexerItems([item('i1', '1001')]))
  assert.equal(plan.fichesSautees[0].raison, 'NUMERO_VIDE')
  assert.equal(plan.ecritures.length, 0)
})

test('numéros comparés après trim (base et Monday)', () => {
  const plan = planifierRattrapage([ficheComplete('f1', ' 1001 ')], indexerItems([item('i1', '1001 ')]))
  assert.equal(plan.ecritures.length, 4)
})

test('les items sans numéro sont ignorés à l\'indexation', () => {
  const index = indexerItems([item('i1', ''), item('i2', null), item('i3', '42')])
  assert.deepEqual([...index.keys()], ['42'])
})

test('rapport sans aucune valeur : décisions, fiches sautées et résumé', () => {
  const fiches = [
    ficheComplete('f1', '1001'),
    ficheComplete('f2', '1002'),
    ficheComplete('f3', '1003'),
    ficheComplete('f4', '1004', { booking_email: null })
  ]
  const items = [
    item('i1', '1001'),
    item('i2', '1002', { airbnb_email: 'deja@example.test' }),
    item('i4a', '1004'),
    item('i4b', '1004')
  ]
  const plan = planifierRattrapage(fiches, indexerItems(items))
  const rapport = JSON.stringify({ decisions: plan.decisions, fichesSautees: plan.fichesSautees, resume: resumer(plan) })
  for (const v of [EMAIL_A, EMAIL_B, MDP_A, MDP_B, 'deja@example.test']) {
    assert.ok(!rapport.includes(v), `valeur dans le rapport : ${v}`)
  }
  const r = resumer(plan)
  assert.equal(r.cellulesARemplir, 7)
  assert.equal(r.fichesTouchees, 2)
  assert.deepEqual(r.parColonne['Identifiant Airbnb'], { remplir: 1, DEJA_REMPLI: 1, BASE_VIDE: 0 })
  assert.deepEqual(r.fichesSautees, { ITEM_ABSENT: 1, ITEM_AMBIGU: 1 })
})

test('masquer : toutes les occurrences remplacées, message tronqué', () => {
  assert.equal(masquer(`x ${MDP_A} y ${EMAIL_A} ${MDP_A}`, [MDP_A, EMAIL_A, '', null]), 'x ••• y ••• •••')
  assert.equal(masquer('a'.repeat(400), []).length, 301)
})

test('estVide', () => {
  for (const v of [undefined, null, '', '   ']) assert.equal(estVide(v), true)
  for (const v of ['a', ' a ', 0]) assert.equal(estVide(v), false)
})
