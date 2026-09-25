// supabase/functions/monday-sync/sync.test.ts
//
// Preuves du cœur de la synchronisation, sans Monday ni base : les
// dépendances sont des espions. Exécution : npm run test:edge
// (deno test, aucun accès réseau ni environnement requis).
//
// Ce qui est prouvé :
//   - isolation : un statut refusé par Monday n'empêche pas les mots de passe
//     d'arriver, et SEULS les champs écrits entrent dans le snapshot ;
//   - traduction par index, valeur legacy ignorée sans être envoyée ;
//   - diff contre le snapshot en base (rien à pousser → aucun appel Monday) ;
//   - gardes : fiche invisible (RLS), numéro périmé → rien n'est écrit ;
//   - renumérotation pendant le push → snapshot non persisté, pas d'écrasement ;
//   - aucun mot de passe ni identifiant dans les diagnostics ni les logs ;
//   - identifiants (emails) : poussés comme les mots de passe, isolés dans
//     les deux sens, snapshotés seulement si écrits, poussés sur un snapshot
//     antérieur qui ne les connaît pas, JAMAIS poussés s'ils ne sont pas
//     fournis (onglet resté sur l'ancien front) ;
//   - dry-run : aucun appel Monday, aucune écriture en base.

import { assert, assertEquals, assertFalse, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  COLUMN_IDS,
  champsAPousser,
  masquerSecrets,
  planifier,
  synchroniser,
  traduireValeur,
  type Deps,
  type FieldResult,
  type SyncFields,
  type SyncResponse
} from './sync.ts'

const MDP_AIRBNB = 'airbnb-secret-XYZ'
const MDP_BOOKING = 'booking-secret-QRS'
const EMAIL_AIRBNB = 'proprio.perso@example.test'
const EMAIL_BOOKING = 'bien-7755@letahost.example.test'

const FIELDS: SyncFields = {
  type_premier_menage: 'Vérification / Inventaire',
  type_premiere_maintenance: "Pas d'intervention",
  airbnb_mot_passe: MDP_AIRBNB,
  booking_mot_passe: MDP_BOOKING,
  airbnb_email: EMAIL_AIRBNB,
  booking_email: EMAIL_BOOKING,
  // Non fourni : ces tests-là ne portent pas sur « BAC secours » (tests dédiés
  // en fin de fichier). C'est aussi la requête d'un front antérieur au champ,
  // qui ne doit jamais le pousser.
  bac_secours: undefined
}

// Snapshot tel qu'il existe en base pour les fiches synchronisées avant
// l'ajout des identifiants : les 4 clés historiques, à jour.
const SNAPSHOT_HISTORIQUE = {
  type_premier_menage: 'Vérification / Inventaire',
  type_premiere_maintenance: "Pas d'intervention",
  airbnb_mot_passe: MDP_AIRBNB,
  booking_mot_passe: MDP_BOOKING
}

interface Espion {
  deps: Deps
  ecritures: Array<{ itemId: string; columnId: string; valeur: unknown }>
  lookups: string[]
  fusions: Array<{ ficheId: string; numeroBien: string; patch: Record<string, unknown> }>
  logs: string[]
}

// Espion configurable : quelle fiche est lue, quel item est trouvé, quelles
// colonnes Monday refuse, ce que rend la fusion.
function espion(options: {
  fiche?: { numeroBien: string | null; snapshot: Record<string, unknown> | null } | null
  itemId?: string | null
  refuser?: Record<string, string>          // columnId → message d'erreur Monday
  fusion?: 'merge' | 'null' | 'throw'
  lookupThrow?: string
} = {}): Espion {
  const ecritures: Espion['ecritures'] = []
  const lookups: string[] = []
  const fusions: Espion['fusions'] = []
  const logs: string[] = []
  const fiche = options.fiche === undefined ? { numeroBien: '7755', snapshot: null } : options.fiche
  const itemId = options.itemId === undefined ? '3097277938' : options.itemId
  const fusion = options.fusion ?? 'merge'
  const deps: Deps = {
    lireFiche: () => Promise.resolve(fiche),
    trouverItem: (numeroBien) => {
      lookups.push(numeroBien)
      if (options.lookupThrow) return Promise.reject(new Error(options.lookupThrow))
      return Promise.resolve(itemId)
    },
    ecrireColonne: (itemId, columnId, valeur) => {
      const refus = options.refuser?.[columnId]
      if (refus) return Promise.reject(new Error(refus))
      ecritures.push({ itemId, columnId, valeur })
      return Promise.resolve()
    },
    fusionnerSnapshot: (ficheId, numeroBien, patch) => {
      fusions.push({ ficheId, numeroBien, patch })
      if (fusion === 'throw') return Promise.reject(new Error('RPC indisponible'))
      if (fusion === 'null') return Promise.resolve(null)
      return Promise.resolve({ ...(fiche?.snapshot ?? {}), ...patch })
    },
    log: (m) => logs.push(m),
    warn: (m) => logs.push(m)
  }
  return { deps, ecritures, lookups, fusions, logs }
}

const requete = (extra: Partial<Parameters<typeof synchroniser>[0]> = {}) => ({
  ficheId: 'fiche-test',
  numeroBien: '7755',
  fields: FIELDS,
  ...extra
})

const statutDe = (r: SyncResponse, field: string): FieldResult => {
  const found = r.results.find((x) => x.field === field)
  if (!found) throw new Error(`pas de résultat pour ${field}`)
  return found
}

// ------------------------------------------------------------
// Traduction
// ------------------------------------------------------------
Deno.test('traduction : statuts par index, mots de passe tels quels, vidage explicite', () => {
  assertEquals(traduireValeur('type_premier_menage', 'Vérification / Inventaire'), { index: 4 })
  assertEquals(traduireValeur('type_premier_menage', 'Classique'), { index: 1 })
  assertEquals(traduireValeur('type_premier_menage', 'Fait par Proprio'), { index: 7 })
  assertEquals(traduireValeur('type_premiere_maintenance', "Pas d'intervention"), { index: 1 })
  assertEquals(traduireValeur('type_premiere_maintenance', 'Intervention artisan'), { index: 2 })
  // Vidage : un objet vide vide la colonne status, la chaîne vide vide le text
  assertEquals(traduireValeur('type_premier_menage', null), {})
  assertEquals(traduireValeur('type_premiere_maintenance', ''), {})
  assertEquals(traduireValeur('airbnb_mot_passe', null), '')
  assertEquals(traduireValeur('booking_mot_passe', MDP_BOOKING), MDP_BOOKING)
  // Identifiants : colonnes text, même modèle que les mots de passe
  assertEquals(traduireValeur('airbnb_email', EMAIL_AIRBNB), EMAIL_AIRBNB)
  assertEquals(traduireValeur('booking_email', EMAIL_BOOKING), EMAIL_BOOKING)
  assertEquals(traduireValeur('airbnb_email', null), '')
  assertEquals(traduireValeur('booking_email', ''), '')
})

Deno.test('traduction : une valeur legacy ou inconnue est ignorée, jamais envoyée', () => {
  // Ancien label TYPES_PASSAGE écrit dans le champ maintenance avant la refonte
  assertEquals(traduireValeur('type_premiere_maintenance', 'Classique'), undefined)
  // Le libellé Monday actuel n'est PAS une valeur fiche : on ne le mappe pas
  assertEquals(traduireValeur('type_premier_menage', 'Vérification/Inventaire/Dépôt consommables/Autres'), undefined)
  assertEquals(traduireValeur('type_premier_menage', 'N importe quoi'), undefined)
})

// ------------------------------------------------------------
// Diff
// ------------------------------------------------------------
Deno.test('diff : snapshot absent ou pushAll → les 6 champs ; sinon seuls les champs modifiés', () => {
  assertEquals(champsAPousser(FIELDS, null, false).length, 6)
  assertEquals(champsAPousser(FIELDS, { airbnb_mot_passe: MDP_AIRBNB }, true).length, 6)

  const snapshot = { ...FIELDS, airbnb_mot_passe: 'ancien' }
  assertEquals(champsAPousser(FIELDS, snapshot, false), ['airbnb_mot_passe'])
  // Rien de changé → rien à pousser
  assertEquals(champsAPousser(FIELDS, { ...FIELDS }, false), [])
  // Clé absente du snapshot = jamais poussée → à pousser
  const { booking_mot_passe: _b, ...sansBooking } = FIELDS
  assertEquals(champsAPousser(FIELDS, sansBooking as Record<string, unknown>, false), ['booking_mot_passe'])
  // null et undefined côté fiche sont la même absence
  assertEquals(champsAPousser({ ...FIELDS, type_premier_menage: undefined }, { ...FIELDS, type_premier_menage: null }, false), [])
})

Deno.test('plan : une valeur legacy sort en skipped et ne produit aucune écriture', () => {
  const plan = planifier({ ...FIELDS, type_premiere_maintenance: 'Classique' }, null, false)
  assertEquals(plan.ecritures.map((e) => e.field), ['type_premier_menage', 'airbnb_mot_passe', 'booking_mot_passe', 'airbnb_email', 'booking_email'])
  assertEquals(plan.ignores.length, 1)
  assertEquals(plan.ignores[0].field, 'type_premiere_maintenance')
  assertEquals(plan.ignores[0].status, 'skipped')
  assertEquals(plan.ignores[0].reason, 'VALEUR_NON_RECONNUE')
})

// ------------------------------------------------------------
// Isolation — le cœur du fix
// ------------------------------------------------------------
Deno.test('isolation : statut refusé par Monday → les deux mots de passe et la maintenance passent, snapshot = seuls les champs écrits', async () => {
  const e = espion({ refuser: { [COLUMN_IDS.statut]: 'ColumnValueException: label not found' } })
  const r = await synchroniser(requete(), e.deps) as SyncResponse

  assertFalse(r.success)
  assertEquals(r.itemId, '3097277938')
  assertEquals(statutDe(r, 'type_premier_menage').status, 'error')
  assertEquals(statutDe(r, 'type_premier_menage').reason, 'MONDAY_REFUSE')
  assertEquals(statutDe(r, 'type_premiere_maintenance').status, 'ok')
  assertEquals(statutDe(r, 'airbnb_mot_passe').status, 'ok')
  assertEquals(statutDe(r, 'booking_mot_passe').status, 'ok')
  assertEquals(statutDe(r, 'airbnb_email').status, 'ok')
  assertEquals(statutDe(r, 'booking_email').status, 'ok')

  // Les 5 autres colonnes ont bien été écrites, avec les bonnes valeurs
  assertEquals(e.ecritures.map((x) => x.columnId), [
    COLUMN_IDS.maintenance, COLUMN_IDS.airbnbPassword, COLUMN_IDS.bookingPassword, COLUMN_IDS.airbnbLogin, COLUMN_IDS.bookingLogin
  ])
  assertEquals(e.ecritures[0].valeur, { index: 1 })
  assertEquals(e.ecritures[1].valeur, MDP_AIRBNB)
  assertEquals(e.ecritures[2].valeur, MDP_BOOKING)
  assertEquals(e.ecritures[3].valeur, EMAIL_AIRBNB)
  assertEquals(e.ecritures[4].valeur, EMAIL_BOOKING)

  // Le patch snapshot ne contient QUE les champs écrits ; le statut refusé
  // reste absent → re-poussé au prochain enregistrement
  assertEquals(e.fusions.length, 1)
  assertEquals(e.fusions[0], {
    ficheId: 'fiche-test',
    numeroBien: '7755',
    patch: {
      type_premiere_maintenance: "Pas d'intervention",
      airbnb_mot_passe: MDP_AIRBNB,
      booking_mot_passe: MDP_BOOKING,
      airbnb_email: EMAIL_AIRBNB,
      booking_email: EMAIL_BOOKING
    }
  })
  assert(r.snapshotPersiste)
  assertEquals(r.snapshot?.type_premier_menage, undefined)
})

Deno.test('isolation : un champ en échec est re-tenté au prochain sync, les champs ok ne le sont pas', async () => {
  // Snapshot tel que laissé par le test précédent : 5 clés, pas de statut
  const snapshot = {
    type_premiere_maintenance: "Pas d'intervention",
    airbnb_mot_passe: MDP_AIRBNB,
    booking_mot_passe: MDP_BOOKING,
    airbnb_email: EMAIL_AIRBNB,
    booking_email: EMAIL_BOOKING
  }
  const e = espion({ fiche: { numeroBien: '7755', snapshot } })
  const r = await synchroniser(requete(), e.deps) as SyncResponse

  assert(r.success)
  assertEquals(r.results.map((x) => x.field), ['type_premier_menage'])
  assertEquals(e.ecritures.length, 1)
  assertEquals(e.ecritures[0], { itemId: '3097277938', columnId: COLUMN_IDS.statut, valeur: { index: 4 } })
  assertEquals(e.fusions[0].patch, { type_premier_menage: 'Vérification / Inventaire' })
})

Deno.test('isolation : tout refusé → aucun champ ok, aucune fusion, retry complet au prochain sync', async () => {
  const e = espion({
    refuser: {
      [COLUMN_IDS.statut]: 'refus 1',
      [COLUMN_IDS.maintenance]: 'refus 2',
      [COLUMN_IDS.airbnbPassword]: 'refus 3',
      [COLUMN_IDS.bookingPassword]: 'refus 4',
      [COLUMN_IDS.airbnbLogin]: 'refus 5',
      [COLUMN_IDS.bookingLogin]: 'refus 6'
    }
  })
  const r = await synchroniser(requete(), e.deps) as SyncResponse
  assertFalse(r.success)
  assertEquals(r.results.filter((x) => x.status === 'error').length, 6)
  assertEquals(e.fusions.length, 0)
  assertEquals(r.snapshot, null)
  assertFalse(r.snapshotPersiste)
})

Deno.test('legacy : champ skipped non envoyé, non snapshoté, les autres passent, success=false (avertissement attendu)', async () => {
  const e = espion()
  const r = await synchroniser(requete({ fields: { ...FIELDS, type_premiere_maintenance: 'Classique' } }), e.deps) as SyncResponse
  assertFalse(r.success)
  assertEquals(statutDe(r, 'type_premiere_maintenance').status, 'skipped')
  assertEquals(statutDe(r, 'type_premiere_maintenance').reason, 'VALEUR_NON_RECONNUE')
  assertEquals(e.ecritures.length, 5)
  assertFalse(e.ecritures.some((x) => x.columnId === COLUMN_IDS.maintenance))
  assertEquals(Object.keys(e.fusions[0].patch).sort(), ['airbnb_email', 'airbnb_mot_passe', 'booking_email', 'booking_mot_passe', 'type_premier_menage'])
})

// ------------------------------------------------------------
// Rien à pousser
// ------------------------------------------------------------
Deno.test('snapshot à jour : aucun lookup, aucune écriture, aucune fusion, success', async () => {
  const e = espion({ fiche: { numeroBien: '7755', snapshot: { ...FIELDS } } })
  const r = await synchroniser(requete(), e.deps) as SyncResponse
  assert(r.success)
  assertEquals(r.results, [])
  assertEquals(e.lookups.length, 0)
  assertEquals(e.ecritures.length, 0)
  assertEquals(e.fusions.length, 0)
})

// ------------------------------------------------------------
// Gardes avant toute écriture
// ------------------------------------------------------------
Deno.test('garde : fiche invisible (RLS) ou inexistante → FICHE_INTROUVABLE, aucun appel Monday', async () => {
  const e = espion({ fiche: null })
  const r = await synchroniser(requete(), e.deps)
  assertEquals(r.success, false)
  assertEquals((r as { error: string }).error, 'FICHE_INTROUVABLE')
  assertEquals(e.lookups.length, 0)
  assertEquals(e.ecritures.length, 0)
  assertEquals(e.fusions.length, 0)
})

Deno.test('garde : numéro de bien renuméroté avant le push → NUMERO_BIEN_CHANGE, rien n\'est écrit nulle part', async () => {
  const e = espion({ fiche: { numeroBien: '8800', snapshot: null } })
  const r = await synchroniser(requete(), e.deps)
  assertEquals((r as { error: string }).error, 'NUMERO_BIEN_CHANGE')
  assertEquals(e.lookups.length, 0)
  assertEquals(e.ecritures.length, 0)
  assertEquals(e.fusions.length, 0)
})

Deno.test('garde : renumérotation PENDANT le push (RPC rend NULL) → snapshot non persisté, pas d\'écrasement', async () => {
  const e = espion({ fusion: 'null' })
  const r = await synchroniser(requete(), e.deps) as SyncResponse
  assertEquals(e.ecritures.length, 6)
  assertEquals(e.fusions.length, 1)
  assertFalse(r.snapshotPersiste)
  assertEquals(r.snapshot, null)
  // Les écritures Monday, elles, ont bien eu lieu : on le dit
  assertEquals(r.results.filter((x) => x.status === 'ok').length, 6)
})

Deno.test('garde : numéro stocké avec des espaces → la garde tolère, la RPC reçoit le numéro EXACT de la base', async () => {
  // mapFormDataToSupabase stocke la saisie brute ; l'onglet, lui, envoie une
  // valeur trimmée. La pré-vérification compare trimmé/trimmé, mais la RPC
  // compare à l'exact : il faut lui donner la valeur telle qu'en base, sinon
  // le snapshot n'avancerait jamais pour cette fiche (re-push à chaque save).
  const e = espion({ fiche: { numeroBien: ' 7755 ', snapshot: null } })
  const r = await synchroniser(requete({ numeroBien: '7755' }), e.deps) as SyncResponse
  assert(r.success)
  assertEquals(e.lookups, ['7755'])
  assertEquals(e.fusions.length, 1)
  assertEquals(e.fusions[0].numeroBien, ' 7755 ')
  assert(r.snapshotPersiste)
})

Deno.test('garde : RPC en erreur → écritures Monday conservées, snapshot non persisté, pas d\'exception', async () => {
  const e = espion({ fusion: 'throw' })
  const r = await synchroniser(requete(), e.deps) as SyncResponse
  assert(r.success)
  assertFalse(r.snapshotPersiste)
  assertEquals(r.snapshot, null)
})

Deno.test('item Monday introuvable → 6 erreurs ITEM_NOT_FOUND, aucune fusion', async () => {
  const e = espion({ itemId: null })
  const r = await synchroniser(requete(), e.deps) as SyncResponse
  assertFalse(r.success)
  assertEquals(r.results.length, 6)
  assert(r.results.every((x) => x.status === 'error' && x.reason === 'ITEM_NOT_FOUND'))
  assertEquals(e.fusions.length, 0)
})

Deno.test('lookup Monday en erreur → 6 erreurs MONDAY_API_ERROR, aucune écriture', async () => {
  const e = espion({ lookupThrow: 'HTTP 429 quota' })
  const r = await synchroniser(requete(), e.deps) as SyncResponse
  assertFalse(r.success)
  assert(r.results.every((x) => x.status === 'error' && x.reason === 'MONDAY_API_ERROR'))
  assertEquals(e.ecritures.length, 0)
})

// ------------------------------------------------------------
// Secrets
// ------------------------------------------------------------
Deno.test('secrets : un mot de passe renvoyé par Monday dans son erreur n\'apparaît ni dans la réponse ni dans les logs', async () => {
  const e = espion({
    refuser: { [COLUMN_IDS.airbnbPassword]: `ColumnValueException: invalid value "${MDP_AIRBNB}" for text` },
    lookupThrow: undefined
  })
  const r = await synchroniser(requete(), e.deps) as SyncResponse
  // Les diagnostics (results) ne portent jamais de valeur. Le `snapshot`, lui,
  // est l'état en base de la fiche de l'appelant : il contient ses propres
  // mots de passe, comme la fiche qu'il vient d'enregistrer.
  const diagnostics = JSON.stringify(r.results)
  assertFalse(diagnostics.includes(MDP_AIRBNB), 'mot de passe Airbnb dans les diagnostics')
  assertFalse(diagnostics.includes(MDP_BOOKING), 'mot de passe Booking dans les diagnostics')
  assertStringIncludes(statutDe(r, 'airbnb_mot_passe').message ?? '', '•••')
  for (const ligne of e.logs) {
    assertFalse(ligne.includes(MDP_AIRBNB), `mot de passe Airbnb dans un log : ${ligne}`)
    assertFalse(ligne.includes(MDP_BOOKING), `mot de passe Booking dans un log : ${ligne}`)
  }
})

Deno.test('secrets : masquerSecrets remplace toutes les occurrences et tronque', () => {
  assertEquals(masquerSecrets(`a ${MDP_AIRBNB} b ${MDP_AIRBNB}`, [MDP_AIRBNB, null, '']), 'a ••• b •••')
  assertEquals(masquerSecrets('x'.repeat(400), [], 300).length, 301)
})

Deno.test('dry-run : aucun appel Monday, aucune fusion, plan rendu sans valeurs', async () => {
  const e = espion()
  const r = await synchroniser(requete({ dryRun: true }), e.deps) as SyncResponse
  assertEquals(r.dryRun, true)
  assertEquals(r.itemId, 'DRY_RUN')
  assertEquals(e.lookups.length, 0)
  assertEquals(e.ecritures.length, 0)
  assertEquals(e.fusions.length, 0)
  assertEquals(r.results.length, 6)
  for (const valeur of [MDP_AIRBNB, MDP_BOOKING, EMAIL_AIRBNB, EMAIL_BOOKING]) {
    assertFalse(JSON.stringify(r).includes(valeur))
    assertFalse(e.logs.join('\n').includes(valeur))
  }
})

// ------------------------------------------------------------
// Identifiants (emails de connexion propriétaire)
// ------------------------------------------------------------
Deno.test('identifiants : snapshot antérieur à 4 clés à jour → seuls les 2 emails sont poussés, puis snapshotés', async () => {
  const e = espion({ fiche: { numeroBien: '7755', snapshot: { ...SNAPSHOT_HISTORIQUE } } })
  const r = await synchroniser(requete(), e.deps) as SyncResponse

  assert(r.success)
  assertEquals(r.results.map((x) => x.field), ['airbnb_email', 'booking_email'])
  assertEquals(e.ecritures, [
    { itemId: '3097277938', columnId: COLUMN_IDS.airbnbLogin, valeur: EMAIL_AIRBNB },
    { itemId: '3097277938', columnId: COLUMN_IDS.bookingLogin, valeur: EMAIL_BOOKING }
  ])
  assertEquals(e.fusions[0].patch, { airbnb_email: EMAIL_AIRBNB, booking_email: EMAIL_BOOKING })
  // Snapshot fusionné : les 4 clés historiques conservées + les 2 nouvelles
  assertEquals(Object.keys(r.snapshot ?? {}).sort(), [
    'airbnb_email', 'airbnb_mot_passe', 'booking_email', 'booking_mot_passe', 'type_premier_menage', 'type_premiere_maintenance'
  ])
})

Deno.test('identifiants : un email refusé n\'empêche pas l\'autre email ni les autres champs, et n\'entre pas dans le snapshot', async () => {
  const e = espion({ refuser: { [COLUMN_IDS.airbnbLogin]: 'ColumnValueException: text too long' } })
  const r = await synchroniser(requete(), e.deps) as SyncResponse

  assertFalse(r.success)
  assertEquals(statutDe(r, 'airbnb_email').status, 'error')
  assertEquals(statutDe(r, 'airbnb_email').reason, 'MONDAY_REFUSE')
  for (const f of ['type_premier_menage', 'type_premiere_maintenance', 'airbnb_mot_passe', 'booking_mot_passe', 'booking_email']) {
    assertEquals(statutDe(r, f).status, 'ok', f)
  }
  assertEquals(e.ecritures.length, 5)
  assertFalse(e.ecritures.some((x) => x.columnId === COLUMN_IDS.airbnbLogin))
  assertFalse('airbnb_email' in e.fusions[0].patch)
  assertEquals(e.fusions[0].patch.booking_email, EMAIL_BOOKING)

  // Au sync suivant (snapshot = état laissé ci-dessus), seul l'email en échec repart
  const e2 = espion({ fiche: { numeroBien: '7755', snapshot: { ...e.fusions[0].patch } } })
  const r2 = await synchroniser(requete(), e2.deps) as SyncResponse
  assert(r2.success)
  assertEquals(r2.results.map((x) => x.field), ['airbnb_email'])
  assertEquals(e2.ecritures, [{ itemId: '3097277938', columnId: COLUMN_IDS.airbnbLogin, valeur: EMAIL_AIRBNB }])
})

Deno.test('identifiants : et inversement, un mot de passe et un statut refusés n\'empêchent pas les emails', async () => {
  const e = espion({
    refuser: {
      [COLUMN_IDS.airbnbPassword]: 'refus mdp',
      [COLUMN_IDS.statut]: 'refus statut'
    }
  })
  const r = await synchroniser(requete(), e.deps) as SyncResponse

  assertFalse(r.success)
  assertEquals(statutDe(r, 'airbnb_mot_passe').status, 'error')
  assertEquals(statutDe(r, 'type_premier_menage').status, 'error')
  assertEquals(statutDe(r, 'airbnb_email').status, 'ok')
  assertEquals(statutDe(r, 'booking_email').status, 'ok')
  assertEquals(e.fusions[0].patch.airbnb_email, EMAIL_AIRBNB)
  assertEquals(e.fusions[0].patch.booking_email, EMAIL_BOOKING)
  assertFalse('airbnb_mot_passe' in e.fusions[0].patch)
  assertFalse('type_premier_menage' in e.fusions[0].patch)
})

Deno.test('identifiants : email vidé dans la fiche → colonne Monday vidée (même modèle que les mots de passe)', async () => {
  const snapshot = { ...SNAPSHOT_HISTORIQUE, airbnb_email: EMAIL_AIRBNB, booking_email: EMAIL_BOOKING }
  const e = espion({ fiche: { numeroBien: '7755', snapshot } })
  const r = await synchroniser(requete({ fields: { ...FIELDS, booking_email: null } }), e.deps) as SyncResponse
  assert(r.success)
  assertEquals(e.ecritures, [{ itemId: '3097277938', columnId: COLUMN_IDS.bookingLogin, valeur: '' }])
  assertEquals(e.fusions[0].patch, { booking_email: null })
})

Deno.test('identifiants NON FOURNIS (onglet sur l\'ancien front) → jamais poussés, même en pushAll ou sans snapshot', async () => {
  // Requête de l'ancien front : les 4 clés historiques seulement
  const anciensChamps: SyncFields = {
    ...SNAPSHOT_HISTORIQUE,
    type_premier_menage: 'Classique',
    airbnb_email: undefined,
    booking_email: undefined,
    bac_secours: undefined
  }
  assertEquals(champsAPousser(anciensChamps, null, false).length, 4)
  assertEquals(champsAPousser(anciensChamps, null, true).length, 4)
  assertEquals(champsAPousser(anciensChamps, { ...SNAPSHOT_HISTORIQUE }, false), ['type_premier_menage'])

  for (const cas of [{ snapshot: null, pushAll: true }, { snapshot: { ...SNAPSHOT_HISTORIQUE }, pushAll: false }]) {
    const e = espion({ fiche: { numeroBien: '7755', snapshot: cas.snapshot } })
    const r = await synchroniser(requete({ fields: anciensChamps, pushAll: cas.pushAll }), e.deps) as SyncResponse
    assert(r.success)
    assertFalse(e.ecritures.some((x) => x.columnId === COLUMN_IDS.airbnbLogin || x.columnId === COLUMN_IDS.bookingLogin))
    assertFalse(r.results.some((x) => x.field === 'airbnb_email' || x.field === 'booking_email'))
    for (const f of e.fusions) {
      assertFalse('airbnb_email' in f.patch)
      assertFalse('booking_email' in f.patch)
    }
  }
})

Deno.test('secrets : un email renvoyé par Monday dans son erreur n\'apparaît ni dans la réponse ni dans les logs', async () => {
  const e = espion({
    refuser: {
      [COLUMN_IDS.airbnbLogin]: `invalid value "${EMAIL_AIRBNB}"`,
      [COLUMN_IDS.bookingLogin]: `invalid value "${EMAIL_BOOKING}"`
    }
  })
  const r = await synchroniser(requete(), e.deps) as SyncResponse
  const diagnostics = JSON.stringify(r.results)
  assertFalse(diagnostics.includes(EMAIL_AIRBNB))
  assertFalse(diagnostics.includes(EMAIL_BOOKING))
  assertStringIncludes(statutDe(r, 'airbnb_email').message ?? '', '•••')
  for (const ligne of e.logs) {
    assertFalse(ligne.includes(EMAIL_AIRBNB), `email Airbnb dans un log : ${ligne}`)
    assertFalse(ligne.includes(EMAIL_BOOKING), `email Booking dans un log : ${ligne}`)
  }
})

// ------------------------------------------------------------
// BAC secours (type de la boîte à clés de secours, colonne status)
// ------------------------------------------------------------
const SNAPSHOT_A_JOUR_6 = { ...SNAPSHOT_HISTORIQUE, airbnb_email: EMAIL_AIRBNB, booking_email: EMAIL_BOOKING }

Deno.test('BAC secours : traduction par index (0 TTlock, 1 Masterlock), vide → {}, inconnu → ignoré', () => {
  assertEquals(traduireValeur('bac_secours', 'TTlock'), { index: 0 })
  assertEquals(traduireValeur('bac_secours', 'Masterlock'), { index: 1 })
  assertEquals(traduireValeur('bac_secours', null), {})
  assertEquals(traduireValeur('bac_secours', ''), {})
  // Igloohome et « Autre » sont exclus de la boîte de secours
  assertEquals(traduireValeur('bac_secours', 'Igloohome'), undefined)
})

for (const [cas, valeur, attendu] of [
  ['TTlock', 'TTlock', { index: 0 }],
  ['Masterlock', 'Masterlock', { index: 1 }],
  ['vide (non, ou question non répondue)', null, {}]
] as const) {
  Deno.test(`BAC secours ${cas} : seule la colonne color_mm7hfdn5 est écrite, puis snapshotée`, async () => {
    const e = espion({ fiche: { numeroBien: '7755', snapshot: { ...SNAPSHOT_A_JOUR_6 } } })
    const r = await synchroniser(requete({ fields: { ...FIELDS, bac_secours: valeur } }), e.deps) as SyncResponse
    assert(r.success)
    assertEquals(r.results.map((x) => x.field), ['bac_secours'])
    assertEquals(e.ecritures, [{ itemId: '3097277938', columnId: COLUMN_IDS.bacSecours, valeur: attendu }])
    assertEquals(e.fusions[0].patch, { bac_secours: valeur })
  })
}

Deno.test('BAC secours : snapshot antérieur sans la clé → poussé une fois (vide vers colonne vide), puis plus rien', async () => {
  const e = espion({ fiche: { numeroBien: '7755', snapshot: { ...SNAPSHOT_A_JOUR_6 } } })
  const r = await synchroniser(requete({ fields: { ...FIELDS, bac_secours: null } }), e.deps) as SyncResponse
  assert(r.success)
  assertEquals(e.ecritures.map((x) => x.columnId), [COLUMN_IDS.bacSecours])
  const e2 = espion({ fiche: { numeroBien: '7755', snapshot: { ...SNAPSHOT_A_JOUR_6, bac_secours: null } } })
  const r2 = await synchroniser(requete({ fields: { ...FIELDS, bac_secours: null } }), e2.deps) as SyncResponse
  assert(r2.success)
  assertEquals(e2.ecritures.length, 0)
})

Deno.test('BAC secours refusé par Monday → les 6 autres champs passent, BAC secours hors snapshot', async () => {
  const e = espion({ refuser: { [COLUMN_IDS.bacSecours]: 'ColumnValueException: label not found' } })
  const r = await synchroniser(requete({ fields: { ...FIELDS, bac_secours: 'Masterlock' } }), e.deps) as SyncResponse
  assertFalse(r.success)
  assertEquals(statutDe(r, 'bac_secours').status, 'error')
  assertEquals(statutDe(r, 'bac_secours').reason, 'MONDAY_REFUSE')
  assertEquals(r.results.filter((x) => x.status === 'ok').length, 6)
  assertFalse('bac_secours' in e.fusions[0].patch)
  assertEquals(Object.keys(e.fusions[0].patch).length, 6)
})

Deno.test('et inversement : statut et mot de passe refusés → BAC secours passe et est snapshoté', async () => {
  const e = espion({ refuser: { [COLUMN_IDS.statut]: 'refus statut', [COLUMN_IDS.airbnbPassword]: 'refus mdp' } })
  const r = await synchroniser(requete({ fields: { ...FIELDS, bac_secours: 'TTlock' } }), e.deps) as SyncResponse
  assertFalse(r.success)
  assertEquals(statutDe(r, 'bac_secours').status, 'ok')
  assertEquals(e.fusions[0].patch.bac_secours, 'TTlock')
  assert(e.ecritures.some((x) => x.columnId === COLUMN_IDS.bacSecours && JSON.stringify(x.valeur) === '{"index":0}'))
})

Deno.test('BAC secours : valeur inconnue → skipped, jamais envoyée, les autres passent', async () => {
  const e = espion({ fiche: { numeroBien: '7755', snapshot: { ...SNAPSHOT_A_JOUR_6 } } })
  const r = await synchroniser(requete({ fields: { ...FIELDS, bac_secours: 'Igloohome' } }), e.deps) as SyncResponse
  assertFalse(r.success)
  assertEquals(statutDe(r, 'bac_secours').status, 'skipped')
  assertEquals(statutDe(r, 'bac_secours').reason, 'VALEUR_NON_RECONNUE')
  assertEquals(e.ecritures.length, 0)
})

Deno.test('BAC secours NON FOURNI (front antérieur) → jamais écrit, même en pushAll', async () => {
  const e = espion({ fiche: { numeroBien: '7755', snapshot: null } })
  const r = await synchroniser(requete({ pushAll: true }), e.deps) as SyncResponse
  assert(r.success)
  assertFalse(e.ecritures.some((x) => x.columnId === COLUMN_IDS.bacSecours))
  assertFalse('bac_secours' in e.fusions[0].patch)
})
