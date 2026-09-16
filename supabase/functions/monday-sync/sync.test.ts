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
//   - aucun mot de passe dans les diagnostics ni les logs ;
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

const FIELDS: SyncFields = {
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
Deno.test('diff : snapshot absent ou pushAll → les 4 champs ; sinon seuls les champs modifiés', () => {
  assertEquals(champsAPousser(FIELDS, null, false).length, 4)
  assertEquals(champsAPousser(FIELDS, { airbnb_mot_passe: MDP_AIRBNB }, true).length, 4)

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
  assertEquals(plan.ecritures.map((e) => e.field), ['type_premier_menage', 'airbnb_mot_passe', 'booking_mot_passe'])
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

  // Les 3 autres colonnes ont bien été écrites, avec les bonnes valeurs
  assertEquals(e.ecritures.map((x) => x.columnId), [COLUMN_IDS.maintenance, COLUMN_IDS.airbnbPassword, COLUMN_IDS.bookingPassword])
  assertEquals(e.ecritures[0].valeur, { index: 1 })
  assertEquals(e.ecritures[1].valeur, MDP_AIRBNB)
  assertEquals(e.ecritures[2].valeur, MDP_BOOKING)

  // Le patch snapshot ne contient QUE les champs écrits ; le statut refusé
  // reste absent → re-poussé au prochain enregistrement
  assertEquals(e.fusions.length, 1)
  assertEquals(e.fusions[0], {
    ficheId: 'fiche-test',
    numeroBien: '7755',
    patch: {
      type_premiere_maintenance: "Pas d'intervention",
      airbnb_mot_passe: MDP_AIRBNB,
      booking_mot_passe: MDP_BOOKING
    }
  })
  assert(r.snapshotPersiste)
  assertEquals(r.snapshot?.type_premier_menage, undefined)
})

Deno.test('isolation : un champ en échec est re-tenté au prochain sync, les champs ok ne le sont pas', async () => {
  // Snapshot tel que laissé par le test précédent : 3 clés, pas de statut
  const snapshot = {
    type_premiere_maintenance: "Pas d'intervention",
    airbnb_mot_passe: MDP_AIRBNB,
    booking_mot_passe: MDP_BOOKING
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
      [COLUMN_IDS.bookingPassword]: 'refus 4'
    }
  })
  const r = await synchroniser(requete(), e.deps) as SyncResponse
  assertFalse(r.success)
  assertEquals(r.results.filter((x) => x.status === 'error').length, 4)
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
  assertEquals(e.ecritures.length, 3)
  assertFalse(e.ecritures.some((x) => x.columnId === COLUMN_IDS.maintenance))
  assertEquals(Object.keys(e.fusions[0].patch).sort(), ['airbnb_mot_passe', 'booking_mot_passe', 'type_premier_menage'])
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
  assertEquals(e.ecritures.length, 4)
  assertEquals(e.fusions.length, 1)
  assertFalse(r.snapshotPersiste)
  assertEquals(r.snapshot, null)
  // Les écritures Monday, elles, ont bien eu lieu : on le dit
  assertEquals(r.results.filter((x) => x.status === 'ok').length, 4)
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

Deno.test('item Monday introuvable → 4 erreurs ITEM_NOT_FOUND, aucune fusion', async () => {
  const e = espion({ itemId: null })
  const r = await synchroniser(requete(), e.deps) as SyncResponse
  assertFalse(r.success)
  assertEquals(r.results.length, 4)
  assert(r.results.every((x) => x.status === 'error' && x.reason === 'ITEM_NOT_FOUND'))
  assertEquals(e.fusions.length, 0)
})

Deno.test('lookup Monday en erreur → 4 erreurs MONDAY_API_ERROR, aucune écriture', async () => {
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
  assertEquals(r.results.length, 4)
  assertFalse(JSON.stringify(r).includes(MDP_AIRBNB))
  assertFalse(e.logs.join('\n').includes(MDP_AIRBNB))
})
