// scripts/tests/guideAccesReponse.test.mjs
//
// Lecture de la réponse du webhook de l'assistant Guide d'accès : une réponse
// vide, non JSON ou sans guide doit lever une erreur typée (message clair côté
// écran, diagnostic en console), jamais planter sur JSON.parse ni passer pour
// un guide. Les formats valides d'aujourd'hui doivent rendre le même texte.
//
// Exécution : npm test   (node --test, aucune dépendance, aucun réseau)

import test from 'node:test'
import assert from 'node:assert/strict'
import { chargerModule } from './_chargerModule.mjs'

const {
  extraireGuide,
  ReponseGuideAccesInexploitable,
  CAS_REPONSE_INEXPLOITABLE,
  MESSAGE_GUIDE_NON_GENERE,
  MESSAGE_SUIVI_SANS_REPONSE,
} = await chargerModule('../../src/lib/guideAccesReponse.js')

function attendInexploitable(texte, cas, status = 200) {
  assert.throws(
    () => extraireGuide(texte, status),
    err => {
      assert.ok(err instanceof ReponseGuideAccesInexploitable, `type d'erreur : ${err?.name}`)
      assert.equal(err.cas, cas)
      assert.equal(err.status, status)
      assert.deepEqual(err.diagnostic, { cas, status, apercu: err.apercu })
      return true
    }
  )
}

test('réponse 200 vide : cas VIDE, pas de SyntaxError', () => {
  attendInexploitable('', CAS_REPONSE_INEXPLOITABLE.VIDE)
  attendInexploitable('   \n\t ', CAS_REPONSE_INEXPLOITABLE.VIDE)
  attendInexploitable(undefined, CAS_REPONSE_INEXPLOITABLE.VIDE)
})

test('réponse non JSON : cas NON_JSON, aperçu du corps gardé pour le diagnostic', () => {
  const html = '<html><body>Bad Gateway</body></html>'
  attendInexploitable(html, CAS_REPONSE_INEXPLOITABLE.NON_JSON)
  assert.throws(() => extraireGuide(html, 200), err => err.apercu === html)

  attendInexploitable('{"output": "tronqué', CAS_REPONSE_INEXPLOITABLE.NON_JSON)
})

test("l'aperçu est borné : un corps énorme n'inonde pas la console", () => {
  const enorme = 'x'.repeat(10000)
  assert.throws(() => extraireGuide(enorme, 200), err => err.apercu.length === 300)
})

test('JSON sans guide : cas SANS_GUIDE, plus de « format non reconnu » affiché comme un guide', () => {
  for (const texte of ['{}', '[]', 'null', '[null]', '{"output": ""}', '{"output": "   "}',
    '{"data": {}}', '{"output": 42}', '"une chaîne"']) {
    attendInexploitable(texte, CAS_REPONSE_INEXPLOITABLE.SANS_GUIDE)
  }
})

test('le statut HTTP reçu est transmis au diagnostic', () => {
  attendInexploitable('', CAS_REPONSE_INEXPLOITABLE.VIDE, 204)
})

test('formats valides inchangés : data.output, output, response, tableau', () => {
  const guide = '## Accès\n\n1. Entrez par la porte rouge.'
  assert.equal(extraireGuide(JSON.stringify({ data: { output: guide } }), 200), guide)
  assert.equal(extraireGuide(JSON.stringify({ output: guide }), 200), guide)
  assert.equal(extraireGuide(JSON.stringify({ response: guide }), 200), guide)
  assert.equal(extraireGuide(JSON.stringify([{ output: guide }]), 200), guide)
  assert.equal(extraireGuide(JSON.stringify([{ data: { output: guide } }, { output: 'autre' }]), 200), guide)
})

test('priorité historique conservée : data.output > output > response', () => {
  assert.equal(extraireGuide(JSON.stringify({ data: { output: 'A' }, output: 'B', response: 'C' }), 200), 'A')
  assert.equal(extraireGuide(JSON.stringify({ output: 'B', response: 'C' }), 200), 'B')
})

test('les messages affichés disent quoi faire', () => {
  assert.match(MESSAGE_GUIDE_NON_GENERE, /n'a pas pu générer le guide/)
  assert.match(MESSAGE_GUIDE_NON_GENERE, /Réessayez un peu plus tard/)
  assert.match(MESSAGE_SUIVI_SANS_REPONSE, /Réessayez un peu plus tard/)
})
