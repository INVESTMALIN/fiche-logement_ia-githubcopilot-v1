// scripts/tests/videoGuideAcces.test.mjs
//
// Règles de la compression « cible livret » de la vidéo du Guide d'accès :
// quand compresser, quelle vidéo garder, quel avertissement persister.
// Exécution : npm test   (node --test, aucune dépendance, aucun réseau)

import test from 'node:test'
import assert from 'node:assert/strict'
import { chargerModule } from './_chargerModule.mjs'

const {
  VIDEO_GUIDE_ACCES_CIBLE_OCTETS,
  VIDEO_GUIDE_ACCES_DELAI_COMPRESSION_MS,
  VIDEO_GUIDE_ACCES_POLL_MS,
  AVERTISSEMENT_VIDEO_GUIDE,
  doitCompresserVideoGuide,
  lireReponseCompression,
  lireEtatJobCompression,
  choisirVideoGuide,
  estMemeFiche,
  creerSessionFiche,
  publicationVideoGuide,
  formaterMio,
} = await chargerModule('../../src/lib/videoGuideAcces.js')

const MIO = 1024 * 1024
const CIBLE = VIDEO_GUIDE_ACCES_CIBLE_OCTETS

test('la cible est une constante unique, sous 50 Mo décimaux ET sous 50 Mio', () => {
  assert.equal(CIBLE, 40 * MIO)
  assert.ok(CIBLE < 50_000_000, 'sous 50 Mo décimaux')
  assert.ok(CIBLE < 50 * MIO, 'sous 50 Mio')
})

test('déclenchement sur la cible, pas sur l\'ancien seuil de 95 Mo', () => {
  assert.equal(doitCompresserVideoGuide(20 * MIO), false)
  assert.equal(doitCompresserVideoGuide(CIBLE), false, 'exactement la cible : pas de compression')
  assert.equal(doitCompresserVideoGuide(CIBLE + 1), true)
  // Le trou historique : entre la cible et 95 Mo, la compression DOIT partir.
  assert.equal(doitCompresserVideoGuide(60 * MIO), true)
  assert.equal(doitCompresserVideoGuide(94 * MIO), true)
  assert.equal(doitCompresserVideoGuide(300 * MIO), true)
  // Taille inconnue : on ne compresse pas plutôt que de planter.
  assert.equal(doitCompresserVideoGuide(undefined), false)
  assert.equal(doitCompresserVideoGuide(NaN), false)
})

test('lireReponseCompression : réponse valide → { url, taille }', () => {
  assert.deepEqual(
    lireReponseCompression({ compressedUrl: 'https://x/y_compressed.mp4', compressedSize: 12345, originalSize: 99, compressionRatio: '50%' }),
    { url: 'https://x/y_compressed.mp4', taille: 12345 }
  )
})

test('lireReponseCompression : réponse invalide → null (traitée comme un échec)', () => {
  for (const mauvaise of [
    null, undefined, 'texte', 42, [],
    {},
    { compressedUrl: 'https://x/y.mp4' },                                  // taille absente
    { compressedUrl: 'https://x/y.mp4', compressedSize: '123' },           // taille en string
    { compressedUrl: 'https://x/y.mp4', compressedSize: NaN },
    { compressedUrl: 'https://x/y.mp4', compressedSize: -1 },
    { compressedSize: 123 },                                               // URL absente
    { compressedUrl: 'ftp://x/y.mp4', compressedSize: 123 },
    { compressedUrl: '', compressedSize: 123 },
    { error: 'Compression failed', message: 'boom' },
  ]) {
    assert.equal(lireReponseCompression(mauvaise), null, `devrait rejeter ${JSON.stringify(mauvaise)}`)
  }
})

test('lireEtatJobCompression : running / done validé / failed avec message', () => {
  assert.deepEqual(lireEtatJobCompression({ jobId: 'j', status: 'running' }), { etat: 'running' })
  assert.deepEqual(
    lireEtatJobCompression({ jobId: 'j', status: 'done', result: { compressedUrl: 'https://s/c.mp4', compressedSize: 10 } }),
    { etat: 'done', compressee: { url: 'https://s/c.mp4', taille: 10 } }
  )
  assert.deepEqual(lireEtatJobCompression({ jobId: 'j', status: 'failed', error: 'Failed to download: 400' }),
    { etat: 'failed', erreur: 'Failed to download: 400' })
})

test('lireEtatJobCompression : tout ce qui n\'est pas exploitable est un échec, jamais une exception', () => {
  for (const mauvaise of [null, undefined, 'x', 42, {}, { status: 'bizarre' }, { status: 'failed' },
    { status: 'done' }, { status: 'done', result: {} }, { status: 'done', result: { compressedUrl: 'https://s/c.mp4' } }]) {
    const r = lireEtatJobCompression(mauvaise)
    assert.equal(r.etat, 'failed', `devrait échouer : ${JSON.stringify(mauvaise)}`)
    assert.ok(typeof r.erreur === 'string' && r.erreur.length > 0, 'un message d\'erreur non vide')
  }
})

test('le polling est borné : délai global et cadence cohérents', () => {
  assert.ok(VIDEO_GUIDE_ACCES_POLL_MS >= 5_000 && VIDEO_GUIDE_ACCES_POLL_MS <= 30_000)
  assert.ok(VIDEO_GUIDE_ACCES_DELAI_COMPRESSION_MS >= 10 * 60_000, 'au moins 10 min : 3 encodages possibles')
  assert.ok(VIDEO_GUIDE_ACCES_DELAI_COMPRESSION_MS / VIDEO_GUIDE_ACCES_POLL_MS >= 30, 'assez d\'itérations')
})

const originale = { url: 'https://s/orig.mp4', taille: 90 * MIO }

test('cas 1 : compressée sous la cible → compressée, aucun avertissement', () => {
  const r = choisirVideoGuide({ originale, compressee: { url: 'https://s/orig_compressed.mp4', taille: 30 * MIO } })
  assert.deepEqual(r, { url: 'https://s/orig_compressed.mp4', taille: 30 * MIO, avertissement: null })
})

test('cas 1 bis : exactement la cible compte comme sous la cible', () => {
  const r = choisirVideoGuide({ originale, compressee: { url: 'https://s/c.mp4', taille: CIBLE } })
  assert.equal(r.avertissement, null)
})

test('cas 2 : compressée mais encore au-dessus → la plus légère, avertissement TROP_LOURDE', () => {
  const r = choisirVideoGuide({ originale, compressee: { url: 'https://s/c.mp4', taille: 60 * MIO } })
  assert.deepEqual(r, { url: 'https://s/c.mp4', taille: 60 * MIO, avertissement: AVERTISSEMENT_VIDEO_GUIDE.TROP_LOURDE })
})

test('cas 2 : la « compressée » est plus lourde que l\'originale → on garde l\'originale', () => {
  // Source déjà très compressée : la passe CRF peut grossir le fichier.
  const r = choisirVideoGuide({ originale, compressee: { url: 'https://s/c.mp4', taille: 95 * MIO } })
  assert.equal(r.url, originale.url)
  assert.equal(r.taille, originale.taille)
  assert.equal(r.avertissement, AVERTISSEMENT_VIDEO_GUIDE.TROP_LOURDE)
})

test('cas 2 : à taille égale, l\'originale est conservée (pas de changement d\'URL inutile)', () => {
  const r = choisirVideoGuide({ originale, compressee: { url: 'https://s/c.mp4', taille: originale.taille } })
  assert.equal(r.url, originale.url)
})

test('cas 3 : échec (réseau, timeout, réponse invalide) → originale, avertissement COMPRESSION_ECHOUEE', () => {
  const r = choisirVideoGuide({ originale, compressee: null })
  assert.deepEqual(r, { url: originale.url, taille: originale.taille, avertissement: AVERTISSEMENT_VIDEO_GUIDE.COMPRESSION_ECHOUEE })
})

test('les trois états sont distincts : en cours (provisoire), trop lourde, échec', () => {
  const valeurs = Object.values(AVERTISSEMENT_VIDEO_GUIDE)
  assert.equal(new Set(valeurs).size, 3)
  assert.deepEqual([...valeurs].sort(), ['compression_echouee', 'compression_en_cours', 'trop_lourde'])
  assert.ok(Object.isFrozen(AVERTISSEMENT_VIDEO_GUIDE))
  // choisirVideoGuide ne rend jamais l'état provisoire : il est posé au départ
  // du job, jamais à l'arrivée.
  for (const compressee of [null, { url: 'https://s/c.mp4', taille: 10 * MIO }, { url: 'https://s/c.mp4', taille: 60 * MIO }]) {
    assert.notEqual(choisirVideoGuide({ originale, compressee }).avertissement, AVERTISSEMENT_VIDEO_GUIDE.COMPRESSION_EN_COURS)
  }
})

test('session : la même fiche qui reçoit son id en cours de traitement reste la même', () => {
  // L'autosave crée la ligne PENDANT le traitement : l'id apparaît, mais rien
  // n'a été rechargé ni réinitialisé, donc la session ne bouge pas.
  const session = creerSessionFiche()
  const avant = { session, id: null, numeroBien: '9999' }
  const apres = { session, id: 'cree-par-autosave', numeroBien: '9999' }
  assert.equal(estMemeFiche(avant, apres), true)
})

test('session : deux fiches au MÊME numéro de bien ne sont plus confondues', () => {
  // Le trou que la session ferme : les doublons de numéro sont autorisés, et
  // le repli par numéro laissait écrire la vidéo de A dans B.
  const depart = { session: creerSessionFiche(), id: null, numeroBien: '2189' }
  const autreFiche = { session: creerSessionFiche(), id: 'fiche-B', numeroBien: '2189' }
  assert.equal(estMemeFiche(depart, autreFiche), false)

  // Y compris quand les deux sont encore sans id.
  const autreSansId = { session: creerSessionFiche(), id: null, numeroBien: '2189' }
  assert.equal(estMemeFiche(depart, autreSansId), false)
})

test('session : après une réinitialisation, plus rien n\'est écrit dans le formulaire vide', () => {
  const depart = { session: creerSessionFiche(), id: 'fiche-A', numeroBien: '2189' }
  const apresReset = { session: creerSessionFiche(), id: null, numeroBien: null }
  assert.equal(estMemeFiche(depart, apresReset), false)
})

test('session : elle fait autorité, même si un seul côté en porte une', () => {
  const session = creerSessionFiche()
  // Un côté sans session ne peut pas être « la même fiche » : on refuse
  // plutôt que de retomber sur un repli qui confondrait des doublons.
  assert.equal(estMemeFiche({ session, id: 'A', numeroBien: '1' }, { id: 'A', numeroBien: '1' }), false)
  assert.equal(estMemeFiche({ id: 'A', numeroBien: '1' }, { session, id: 'A', numeroBien: '1' }), false)
  assert.equal(estMemeFiche({ session }, { session }), true)
})

test('creerSessionFiche : deux sessions ne sont jamais égales', () => {
  const sessions = new Set()
  for (let i = 0; i < 200; i++) sessions.add(creerSessionFiche())
  assert.equal(sessions.size, 200)
  assert.ok([...sessions].every(s => typeof s === 'string' && s.length > 0))
})

test('estMemeFiche : id quand il existe des deux côtés, sinon numéro de bien', () => {
  assert.equal(estMemeFiche({ id: 'A', numeroBien: '1' }, { id: 'A', numeroBien: '1' }), true)
  assert.equal(estMemeFiche({ id: 'A', numeroBien: '1' }, { id: 'B', numeroBien: '1' }), false, 'doublon de numéro : les ids priment')
  // Fiche créée par l'autosave PENDANT le job : id null au départ, connu à l'arrivée
  assert.equal(estMemeFiche({ id: null, numeroBien: '9999' }, { id: 'nouveau', numeroBien: '9999' }), true)
  assert.equal(estMemeFiche({ id: null, numeroBien: '9999' }, { id: 'autre', numeroBien: '1234' }), false)
  assert.equal(estMemeFiche({ id: '', numeroBien: '' }, { id: '', numeroBien: '' }), false, 'sans identité, on n\'écrit pas')
  assert.equal(estMemeFiche(undefined, { id: 'A', numeroBien: '1' }), false)
})

test('la cible est passée à choisirVideoGuide (paramétrable, défaut = constante)', () => {
  const compressee = { url: 'https://s/c.mp4', taille: 45 * MIO }
  assert.equal(choisirVideoGuide({ originale, compressee }).avertissement, AVERTISSEMENT_VIDEO_GUIDE.TROP_LOURDE)
  assert.equal(choisirVideoGuide({ originale, compressee, cible: 50 * MIO }).avertissement, null)
})

test('publicationVideoGuide : un champ borné à 1 ne contient jamais deux URLs', () => {
  const p = (actuelles, url) => publicationVideoGuide({ actuelles, url, multiple: true, maxFiles: 1 })

  assert.deepEqual(p([], 'https://s/a.mp4'), ['https://s/a.mp4'])
  // Deux envois concurrents : la plus RÉCENTE gagne, l'ancienne est évincée.
  assert.deepEqual(p(['https://s/a.mp4'], 'https://s/b.mp4'), ['https://s/b.mp4'])
  // Même un champ déjà incohérent (cas hérité) est ramené à la limite.
  assert.deepEqual(p(['https://s/a.mp4', 'https://s/b.mp4'], 'https://s/c.mp4'), ['https://s/c.mp4'])
})

test('publicationVideoGuide : un champ multi-photos garde son comportement d\'ajout', () => {
  assert.deepEqual(
    publicationVideoGuide({ actuelles: ['1', '2'], url: '3', multiple: true, maxFiles: 25 }),
    ['1', '2', '3']
  )
  // maxFiles absent ou absurde : on n'invente pas de limite.
  assert.deepEqual(publicationVideoGuide({ actuelles: ['1'], url: '2', multiple: true, maxFiles: 0 }), ['1', '2'])
  assert.deepEqual(publicationVideoGuide({ actuelles: ['1'], url: '2', multiple: true }), ['1', '2'])
})

test('publicationVideoGuide : champ simple (multiple=false) → la valeur, pas un tableau', () => {
  assert.equal(publicationVideoGuide({ actuelles: ['https://s/a.mp4'], url: 'https://s/b.mp4', multiple: false, maxFiles: 1 }), 'https://s/b.mp4')
})

test('publicationVideoGuide : valeur de champ inattendue → jamais d\'exception', () => {
  for (const actuelles of [null, undefined, 'https://s/a.mp4', 42, {}]) {
    const r = publicationVideoGuide({ actuelles, url: 'https://s/b.mp4', multiple: true, maxFiles: 1 })
    assert.deepEqual(r, ['https://s/b.mp4'], `actuelles=${JSON.stringify(actuelles)}`)
  }
})

test('formaterMio', () => {
  assert.equal(formaterMio(40 * MIO), '40 Mio')
  assert.equal(formaterMio(61165643), '58.3 Mio')
})
