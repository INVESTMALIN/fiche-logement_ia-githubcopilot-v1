// scripts/tests/fusionSauvegarde.test.mjs
//
// Une modification faite PENDANT une sauvegarde ne doit pas être écrasée par
// la réponse de cette sauvegarde, sans pour autant perdre les valeurs que
// seul le serveur connaît (id à la création, updated_at, snapshots).
//
// Exécution : npm test   (node --test, aucune dépendance, aucun réseau)

import test from 'node:test'
import assert from 'node:assert/strict'
import { chargerModule } from './_chargerModule.mjs'

const {
  fusionnerApresSauvegarde,
  creerCollecteursModifications,
  lireChemin,
  ecrireChemin,
} = await chargerModule('../../src/lib/fusionSauvegarde.js')

test('aucune modification en vol : la réponse est prise telle quelle', () => {
  const local = { id: 'f1', nom: 'Ancien' }
  const distant = { id: 'f1', nom: 'Bien 2189', updated_at: '2026-09-23T10:00:00Z' }

  // Comportement historique conservé : même objet, pas de copie inutile.
  assert.equal(fusionnerApresSauvegarde(local, distant, new Set()), distant)
  assert.equal(fusionnerApresSauvegarde(local, distant, null), distant)
})

test('saisie pendant la sauvegarde : la frappe survit, les champs serveur aussi', () => {
  // Départ : "Bien 21". L'utilisateur tape "89" pendant l'envoi.
  const local = { id: null, nom: 'Bien 2189', section_logement: { numero_bien: '2189' } }
  const distant = { id: 'cree-par-le-serveur', nom: 'Bien 21', section_logement: { numero_bien: '2189' }, updated_at: 'serveur' }

  const fusion = fusionnerApresSauvegarde(local, distant, ['nom'])

  assert.equal(fusion.nom, 'Bien 2189', 'la frappe survit')
  assert.equal(fusion.id, 'cree-par-le-serveur', 'l\'id créé par le serveur est conservé')
  assert.equal(fusion.updated_at, 'serveur')
})

test('média supprimé pendant la sauvegarde : il ne réapparaît pas', () => {
  // Le cas d'origine : suppression d'une photo, puis Enregistrer immédiat.
  // La réponse portait encore l'ancienne liste, avec une URL déjà morte.
  const local = { section_clefs: { photos: [], precision: 'sous le pot' } }
  const distant = { section_clefs: { photos: ['https://s/morte.jpg'], precision: 'sous le pot' }, updated_at: 'serveur' }

  const fusion = fusionnerApresSauvegarde(local, distant, ['section_clefs.photos'])

  assert.deepEqual(fusion.section_clefs.photos, [], 'la photo supprimée ne revient pas')
  assert.equal(fusion.section_clefs.precision, 'sous le pot', 'le reste de la section est intact')
  assert.equal(fusion.updated_at, 'serveur')
})

test('plusieurs chemins, y compris dans la même section', () => {
  const local = {
    section_clefs: { photos: ['a'], precision: 'nouvelle' },
    section_logement: { surface: 42 }
  }
  const distant = {
    section_clefs: { photos: [], precision: 'ancienne' },
    section_logement: { surface: 30 },
    id: 'f1'
  }

  const fusion = fusionnerApresSauvegarde(local, distant, ['section_clefs.photos', 'section_clefs.precision', 'section_logement.surface'])

  assert.deepEqual(fusion.section_clefs, { photos: ['a'], precision: 'nouvelle' })
  assert.equal(fusion.section_logement.surface, 42)
  assert.equal(fusion.id, 'f1')
})

test('section entière modifiée (updateSection) : elle est reprise en bloc', () => {
  const local = { section_bebe: { lit: true, chaise: false } }
  const distant = { section_bebe: { lit: false, chaise: false }, id: 'f1' }

  const fusion = fusionnerApresSauvegarde(local, distant, ['section_bebe'])
  assert.deepEqual(fusion.section_bebe, { lit: true, chaise: false })
})

test('valeurs fausses mais légitimes : false, 0, "" et null sont réappliqués', () => {
  const local = { section_x: { b: false, n: 0, s: '', z: null } }
  const distant = { section_x: { b: true, n: 9, s: 'texte', z: 'quelque chose' } }

  const fusion = fusionnerApresSauvegarde(local, distant, ['section_x.b', 'section_x.n', 'section_x.s', 'section_x.z'])
  assert.deepEqual(fusion.section_x, { b: false, n: 0, s: '', z: null })
})

test('chemin absent en local : rien n\'est inventé dans la fiche', () => {
  const local = { section_x: { a: 1 } }
  const distant = { section_x: { a: 1, b: 2 } }

  const fusion = fusionnerApresSauvegarde(local, distant, ['section_x.inexistant'])
  assert.deepEqual(fusion.section_x, { a: 1, b: 2 })
  assert.equal('inexistant' in fusion.section_x, false)
})

test('la réponse distante n\'est jamais mutée', () => {
  const local = { nom: 'local' }
  const distant = { nom: 'distant', section_x: { a: 1 } }
  const copie = JSON.parse(JSON.stringify(distant))

  fusionnerApresSauvegarde(local, distant, ['nom'])
  assert.deepEqual(distant, copie)
})

test('réponse inexploitable : on la rend telle quelle, sans exception', () => {
  for (const distant of [null, undefined, 'texte', 42]) {
    assert.equal(fusionnerApresSauvegarde({ nom: 'x' }, distant, ['nom']), distant)
  }
  // État local absent : on ne peut rien réappliquer, la réponse fait foi.
  const distant = { nom: 'distant' }
  assert.equal(fusionnerApresSauvegarde(null, distant, ['nom']), distant)
})

test('lireChemin / ecrireChemin : profondeur, absence, tableaux', () => {
  const source = { a: { b: { c: 1 } }, liste: [1, 2] }
  assert.equal(lireChemin(source, 'a.b.c'), 1)
  assert.deepEqual(lireChemin(source, 'liste'), [1, 2])
  assert.equal(lireChemin(source, 'a.z.c'), undefined)
  assert.equal(lireChemin(null, 'a'), undefined)

  const ecrit = ecrireChemin(source, 'a.b.c', 9)
  assert.equal(ecrit.a.b.c, 9)
  assert.equal(source.a.b.c, 1, 'la source n\'est pas mutée')

  // Le chemin est créé s'il n'existe pas, sans écraser les frères
  const cree = ecrireChemin({ garde: 1 }, 'x.y', 'v')
  assert.deepEqual(cree, { garde: 1, x: { y: 'v' } })
})

test('collecteurs : sans sauvegarde en vol, rien n\'est noté', () => {
  const c = creerCollecteursModifications()
  c.noter('nom')
  assert.equal(c.actifs(), 0)

  const chemins = c.ouvrir()
  assert.equal(c.actifs(), 1)
  c.noter('nom')
  c.fermer(chemins)
  assert.deepEqual([...chemins], ['nom'])
  assert.equal(c.actifs(), 0)
})

test('collecteurs : deux sauvegardes qui se chevauchent voient chacune SA fenêtre', () => {
  const c = creerCollecteursModifications()

  const save1 = c.ouvrir()
  c.noter('champ.pendant.save1')     // vu par save1 seulement
  const save2 = c.ouvrir()
  c.noter('champ.pendant.les.deux')  // vu par les deux

  c.fermer(save1)
  c.noter('champ.apres.save1')       // vu par save2 seulement
  c.fermer(save2)

  assert.deepEqual([...save1].sort(), ['champ.pendant.les.deux', 'champ.pendant.save1'])
  assert.deepEqual([...save2].sort(), ['champ.apres.save1', 'champ.pendant.les.deux'])
  assert.equal(c.actifs(), 0)
})

test('collecteurs : un même chemin modifié plusieurs fois ne compte qu\'une fois', () => {
  const c = creerCollecteursModifications()
  const chemins = c.ouvrir()
  c.noter('nom'); c.noter('nom'); c.noter('nom')
  c.fermer(chemins)
  assert.deepEqual([...chemins], ['nom'])
})
