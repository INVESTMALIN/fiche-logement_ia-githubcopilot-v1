// Tests du prompt d'édition : contrat de sortie identique à la génération,
// protection structurelle (les blocs code n'apparaissent pas comme éditables),
// drift minimal, et report de la consigne/prose dans le message utilisateur.
// Lancer : `deno test prompt-edit_test.ts`.

import { assert, assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { buildEditSystemPrompt, buildEditUserMessage, EDIT_PROMPT_VERSION } from './prompt-edit.ts'

Deno.test('version de prompt d\'édition figée', () => {
  assertEquals(EDIT_PROMPT_VERSION, 'edit-v1')
})

Deno.test('Airbnb : schéma de sortie = les 7 champs de prose, aucun bloc code', () => {
  const p = buildEditSystemPrompt('airbnb', { localisationDisponible: true })
  for (const cle of ['titres', 'description', 'logement', 'acces_voyageurs', 'quartier', 'comment_se_deplacer', 'autres_remarques']) {
    assertStringIncludes(p, `"${cle}"`)
  }
  // Les clés déterministes ne doivent JAMAIS apparaître comme clés de sortie
  // éditables (protection structurelle : le modèle ne les produit pas).
  for (const interdit of ['"echanges_voyageurs"', '"mentions_reglementaires"', '"note_etat"', '"note_quartier"', '"nombre_voyageurs"']) {
    assert(!p.includes(interdit), `le prompt ne doit pas exposer ${interdit} comme champ de sortie`)
  }
})

Deno.test('Airbnb : rappelle drift minimal et invariants de style', () => {
  const p = buildEditSystemPrompt('airbnb', { localisationDisponible: true })
  assertStringIncludes(p, 'drift minimal')
  assertStringIncludes(p, 'machine à café')
  assertStringIncludes(p, 'IDENTIQUE')
  // Les blocs légaux sont cités comme non éditables.
  assertStringIncludes(p, 'mentions réglementaires')
})

Deno.test('Booking : schéma = 3 champs profil, about_host non éditable', () => {
  const p = buildEditSystemPrompt('booking', { localisationDisponible: true })
  for (const cle of ['nom', 'about_property', 'about_neighbourhood']) {
    assertStringIncludes(p, `"${cle}"`)
  }
  assert(!p.includes('"about_host"'), 'about_host est posé par le code, pas un champ de sortie')
  assertStringIncludes(p, 'About the host')
})

Deno.test('Sans localisation : injonction ciblée de laisser le champ géo vide', () => {
  // Phrase distinctive du bloc conditionnel (≠ de la règle générique « si un
  // champ est vide, laisse-le vide » présente dans toutes les variantes).
  const MARQUEUR = 'actuellement vide faute de données de localisation'
  const airbnb = buildEditSystemPrompt('airbnb', { localisationDisponible: false })
  assertStringIncludes(airbnb, 'comment_se_deplacer')
  assertStringIncludes(airbnb, MARQUEUR)
  const booking = buildEditSystemPrompt('booking', { localisationDisponible: false })
  assertStringIncludes(booking, 'about_neighbourhood')
  assertStringIncludes(booking, MARQUEUR)

  // Avec localisation : pas d'injonction conditionnelle de vider le champ géo.
  const avec = buildEditSystemPrompt('airbnb', { localisationDisponible: true })
  assert(!avec.includes(MARQUEUR))
})

Deno.test('Message utilisateur : porte la prose actuelle ET la consigne', () => {
  const prose = { titres: ['A', 'B', 'C'], description: 'Joli logement avec verres à vin.' }
  const consigne = 'supprime la mention des verres à vin'
  const m = buildEditUserMessage('airbnb', prose, consigne)
  assertStringIncludes(m, 'verres à vin') // présent via la prose
  assertStringIncludes(m, consigne) // la consigne est reportée telle quelle
  assertStringIncludes(m, '"description"') // la prose est sérialisée en JSON
})
