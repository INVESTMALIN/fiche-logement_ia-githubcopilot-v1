// scripts/tests/numeroBien.test.mjs
//
// Règles du changement de numéro de bien côté interface.
// Exécution : npm test   (node --test, aucune dépendance)

import test from 'node:test'
import assert from 'node:assert/strict'
import { chargerModule } from './_chargerModule.mjs'

const {
  estNumeroBienValide,
  evaluerChangementNumero,
  normaliserNumeroBien,
  peutModifierNumeroBien,
} = await chargerModule('../../src/lib/numeroBien.js')

test('seuls admin et super_admin peuvent modifier le numéro', () => {
  assert.equal(peutModifierNumeroBien('admin'), true)
  assert.equal(peutModifierNumeroBien('super_admin'), true)
  // Le coordinateur garde le numéro verrouillé : c'est le comportement actuel.
  assert.equal(peutModifierNumeroBien('coordinateur'), false)
  assert.equal(peutModifierNumeroBien(null), false)
  assert.equal(peutModifierNumeroBien(undefined), false)
  assert.equal(peutModifierNumeroBien(''), false)
  // Aucune valeur inattendue ne doit ouvrir la porte.
  assert.equal(peutModifierNumeroBien('ADMIN'), false)
  assert.equal(peutModifierNumeroBien('superadmin'), false)
})

test('forme acceptée du numéro de bien', () => {
  assert.equal(estNumeroBienValide('2189'), true)
  assert.equal(estNumeroBienValide('PAR-2189'), true)
  assert.equal(estNumeroBienValide('A2189'), true)
  assert.equal(estNumeroBienValide(' 2189 '), true, 'les espaces de bord sont tolérés')

  assert.equal(estNumeroBienValide(''), false)
  assert.equal(estNumeroBienValide('   '), false)
  assert.equal(estNumeroBienValide(null), false)
  assert.equal(estNumeroBienValide(undefined), false)
  assert.equal(estNumeroBienValide('2084 BARBELLION'), false, 'texte libre refusé')
  assert.equal(estNumeroBienValide('-2189'), false, 'doit commencer par une lettre ou un chiffre')
  assert.equal(estNumeroBienValide('2189#'), false)
  assert.equal(estNumeroBienValide('9'.repeat(50)), true)
  assert.equal(estNumeroBienValide('9'.repeat(51)), false, 'varchar(50)')
})

test('normalisation : seuls les espaces de bord sautent', () => {
  assert.equal(normaliserNumeroBien('  2189  '), '2189')
  assert.equal(normaliserNumeroBien(2189), '2189')
  assert.equal(normaliserNumeroBien(null), '')
})

test('refus : numéro vide', () => {
  const r = evaluerChangementNumero({ numeroActuel: '2189', nouveauNumero: '   ', collision: { etat: 'libre' } })
  assert.equal(r.pret, false)
  assert.equal(r.erreur, 'VIDE')
})

test('refus : numéro invalide', () => {
  const r = evaluerChangementNumero({ numeroActuel: '2189', nouveauNumero: '2290 DUPONT', collision: { etat: 'libre' } })
  assert.equal(r.pret, false)
  assert.equal(r.erreur, 'FORMAT')
})

test('refus : numéro identique à l\'actuel, espaces compris', () => {
  const r = evaluerChangementNumero({ numeroActuel: '2189', nouveauNumero: ' 2189 ', collision: { etat: 'libre' } })
  assert.equal(r.pret, false)
  assert.equal(r.erreur, 'IDENTIQUE')
})

test('refus : numéro déjà utilisé par une autre fiche', () => {
  const r = evaluerChangementNumero({
    numeroActuel: '2189',
    nouveauNumero: '2290',
    collision: { etat: 'occupee', fiche: { nom: 'Bien 2290' } },
  })
  assert.equal(r.pret, false)
  assert.equal(r.erreur, 'COLLISION')
})

test('refus : collision non vérifiée ou vérification en échec', () => {
  for (const collision of [undefined, {}, { etat: 'inconnue' }]) {
    const r = evaluerChangementNumero({ numeroActuel: '2189', nouveauNumero: '2290', collision })
    assert.equal(r.pret, false, JSON.stringify(collision))
    assert.equal(r.erreur, 'COLLISION_INCONNUE')
  }
})

test('accepté : numéro valide, différent et libre', () => {
  const r = evaluerChangementNumero({ numeroActuel: '2189', nouveauNumero: ' 2290 ', collision: { etat: 'libre' } })
  assert.deepEqual(r, { pret: true, erreur: null, message: null })
})
