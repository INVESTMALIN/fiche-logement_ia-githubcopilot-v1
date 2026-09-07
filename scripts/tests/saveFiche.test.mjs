// scripts/tests/saveFiche.test.mjs
//
// Le numéro de bien ne doit JAMAIS repartir en base par un enregistrement
// ordinaire : il est posé à la création, puis seul `changer_numero_bien` le
// modifie. Sans ça, un onglet ouvert AVANT une renumérotation restaurerait
// l'ancien numéro au premier champ modifié.
//
// On exécute le VRAI `saveFiche` du repo, avec un client Supabase espion à la
// place du vrai : le payload réellement envoyé est l'assertion.
// Exécution : npm test   (node --test, aucun appel réseau)

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const RACINE = new URL('../../', import.meta.url)

// base64 et pas encodeURIComponent : l'URL est réinjectée entre quotes simples
// dans le source du module appelant, or encodeURIComponent laisse passer les
// quotes — elles fermeraient le specifier d'import.
function dataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`
}

// Client Supabase espion : mémorise la dernière opération et son payload, et
// renvoie une ligne plausible pour que `mapSupabaseToFormData` ait de quoi
// travailler.
const SOURCE_CLIENT_ESPION = `
export const appels = []
function chainable(op, payload) {
  appels.push({ op, payload })
  const chaine = {
    eq: () => chaine,
    select: () => chaine,
    single: () => Promise.resolve({ data: { id: 'fiche-1', logement_numero_bien: 'EN-BASE' }, error: null }),
    then: (resoudre) => Promise.resolve({ data: { id: 'fiche-1' }, error: null }).then(resoudre),
  }
  return chaine
}
export const supabase = {
  from: () => ({
    update: (payload) => chainable('update', payload),
    insert: (payload) => chainable('insert', payload),
  }),
}
export const safeSupabaseQuery = async (requete) => requete
`

async function chargerSupabaseHelpers() {
  const avisGrille = readFileSync(new URL('src/lib/avisGrilleHelpers.js', RACINE), 'utf8')
  let source = readFileSync(new URL('src/lib/supabaseHelpers.js', RACINE), 'utf8')
  source = source
    .replace("'./supabaseClient'", `'${dataUrl(SOURCE_CLIENT_ESPION)}'`)
    .replace("'./avisGrilleHelpers'", `'${dataUrl(avisGrille)}'`)
  return import(dataUrl(source))
}

const { saveFiche } = await chargerSupabaseHelpers()
const { appels } = await import(dataUrl(SOURCE_CLIENT_ESPION))

function ficheDeTest(id) {
  return {
    id,
    nom: 'Bien 2189',
    statut: 'Brouillon',
    section_logement: { numero_bien: '2189', surface: '42', typologie: 'T2' },
  }
}

test('création : le numéro de bien part bien en base', async () => {
  appels.length = 0
  await saveFiche(ficheDeTest(null), 'user-1')
  const insertion = appels.find((a) => a.op === 'insert')
  assert.ok(insertion, 'un INSERT devait être émis')
  assert.equal(insertion.payload.logement_numero_bien, '2189')
})

test('enregistrement ordinaire : le numéro de bien est exclu du payload', async () => {
  appels.length = 0
  await saveFiche(ficheDeTest('fiche-1'))
  const miseAJour = appels.find((a) => a.op === 'update')
  assert.ok(miseAJour, 'un UPDATE devait être émis')
  assert.equal(
    'logement_numero_bien' in miseAJour.payload,
    false,
    "le numéro de bien ne doit jamais être réécrit par un save : seul changer_numero_bien le modifie"
  )
  // Le reste de la section continue bien d'être enregistré.
  assert.equal(miseAJour.payload.logement_surface, 42)
  assert.equal(miseAJour.payload.logement_typologie, 'T2')
})
