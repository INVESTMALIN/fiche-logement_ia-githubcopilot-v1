// Tests du PRÉDICAT pur de la doctrine #50 (garde anti-écrasement). L'I/O
// (persistAnnonceOutput) n'est pas testé ici (nécessite un client Supabase) ;
// seule la DÉCISION, qui est la partie subtile, l'est. Lancer : `deno test persist_test.ts`.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { annonceValideExistante, doitPersister } from './persist.ts'

Deno.test('annonceValideExistante : aucune ligne → false', () => {
  assertEquals(annonceValideExistante(null), false)
})

Deno.test('annonceValideExistante : ligne en erreur (sortie nulle) → false', () => {
  assertEquals(annonceValideExistante({ statut: 'erreur', output_assemble: null }), false)
})

Deno.test('annonceValideExistante : statut genere + sortie présente → true', () => {
  assertEquals(annonceValideExistante({ statut: 'genere', output_assemble: { airbnb: {} } }), true)
})

Deno.test('annonceValideExistante : statut valide + sortie présente → true', () => {
  assertEquals(annonceValideExistante({ statut: 'valide', output_assemble: { booking: {} } }), true)
})

Deno.test('annonceValideExistante : statut non-erreur mais sortie nulle → false', () => {
  // Cas pathologique : on ne protège pas une ligne sans contenu exploitable.
  assertEquals(annonceValideExistante({ statut: 'genere', output_assemble: null }), false)
})

Deno.test('doitPersister : un SUCCÈS écrit toujours, quel que soit l\'existant', () => {
  assertEquals(doitPersister(true, null), true)
  assertEquals(doitPersister(true, { statut: 'genere', output_assemble: { airbnb: {} } }), true)
})

Deno.test('doitPersister : un ÉCHEC ne persiste PAS si une annonce valide existe', () => {
  // Cœur de la doctrine #50 : préserver l'annonce valide (édition ratée incluse).
  assertEquals(doitPersister(false, { statut: 'genere', output_assemble: { airbnb: {} } }), false)
})

Deno.test('doitPersister : un ÉCHEC persiste la trace s\'il n\'y a rien à protéger', () => {
  assertEquals(doitPersister(false, null), true)
  assertEquals(doitPersister(false, { statut: 'erreur', output_assemble: null }), true)
})
