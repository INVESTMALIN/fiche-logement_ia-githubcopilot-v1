// supabase/functions/monday-contacts-sync/index.ts
//
// Push CREATE-only des contacts de maintenance saisis dans la Fiche Logement
// vers le board Monday "Artisans / Maintenance" (5096884596, groupe `topics`).
//
// Pattern :
// - Idempotence par contact via le champ technique `_localId` (UUID front,
//   persisté dans le JSONB fiches.avis_contacts_maintenance). Présence d'un
//   `monday_item_id` sur le contact = déjà poussé → skip côté front avant
//   même l'invoke.
// - Pour chaque contact reçu (= déjà filtré côté front), on crée l'item
//   Monday puis on PATCHE immédiatement la fiche en DB via le service role
//   pour graver le `monday_item_id` sur le bon contact (lookup par _localId).
//   → Atomicité par contact : si le 2e échoue, le 1er est déjà sécurisé.
// - Fire-and-forget côté caller. Cette Edge Function ne bloque jamais la
//   finalisation. On retourne un résumé { results: [...] } que le client
//   utilise pour patcher son state local et afficher un toast d'erreur si
//   au moins un push a échoué.
//
// ⚠️ NE PAS MERGER avec monday-sync (UPDATE 4 colonnes statiques). Les deux
// fonctions ont une logique très différente et peu de code partageable.

// @ts-ignore — Deno runtime, pas de types Node
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-ignore — résolution Deno-only
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// ============================================================
// Configuration Monday
// ============================================================
const MONDAY_API = 'https://api.monday.com/v2'
const BOARD_ID = '5096884596'
const GROUP_ID = 'topics' // "Base de données"

const COLUMN_IDS = {
  activite: 'color_mm3hq80w',     // status — Activité
  telephone: 'phone_mm3hgx8j',    // phone
  email: 'email_mm3h5m5a',        // email
  commentaire: 'text_mm3r3k4j',   // text
  statusGlobal: 'status'          // status — Status global
} as const

// Mapping activité → index immuable du label dans la colonne Monday
// `color_mm3hq80w`. On envoie l'index (pas le label) pour être robuste aux
// renommages. Les IDs sont volontairement non séquentiels : des labels ont
// été supprimés/réordonnés côté board, c'est attendu.
const ACTIVITE_INDEX: Record<string, number> = {
  'Electricité': 0,
  'Plomberie': 1,
  'Serrurerie': 3,
  'Jardinerie / Paysagisme': 6,
  'Multi-Services / Homme à tout faire': 4,
  'Anti nuisibles': 8,
  'Autres': 7
}

// Status global à la création : toujours "Base de données" (index 0).
const STATUS_GLOBAL_INDEX_BASE_DE_DONNEES = 0

// ============================================================
// Types
// ============================================================
interface ContactInput {
  _localId: string
  nom_prenom: string
  societe?: string | null
  activite?: string | null
  telephone?: string | null
  email?: string | null
  commentaire?: string | null
}

interface SyncRequest {
  ficheId: string
  contacts: ContactInput[]
  dryRun?: boolean
}

interface ContactResultSuccess {
  _localId: string
  monday_item_id: string
}

interface ContactResultError {
  _localId: string
  error: 'INVALID_CONTACT' | 'MONDAY_API_ERROR' | 'DB_WRITE_ERROR'
  message: string
}

type ContactResult = ContactResultSuccess | ContactResultError

interface SyncResponse {
  success: boolean
  results: ContactResult[]
  dryRun?: boolean
}

interface SyncFatalError {
  success: false
  error: 'UNAUTHORIZED' | 'FORBIDDEN' | 'BAD_REQUEST' | 'SERVER_CONFIG'
  message: string
}

// ============================================================
// Monday GraphQL helper
// ============================================================
async function mondayQuery<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
      'API-Version': '2024-01'
    },
    body: JSON.stringify({ query, variables })
  })
  const json = await res.json()
  if (json.errors?.length) {
    throw new Error(`Monday GraphQL: ${JSON.stringify(json.errors)}`)
  }
  if (!res.ok) {
    throw new Error(`Monday HTTP ${res.status}: ${JSON.stringify(json)}`)
  }
  return json.data as T
}

// ============================================================
// Build payload Monday pour un contact
// ============================================================
function buildItemName(contact: ContactInput): string {
  const nom = (contact.nom_prenom || '').trim()
  const societe = (contact.societe || '').trim()
  // Format : "Nom Prénom - Société" si société non vide, "Nom Prénom" sinon
  // (pas de tiret pendouillant).
  return societe ? `${nom} - ${societe}` : nom
}

function buildColumnValues(contact: ContactInput): Record<string, unknown> {
  const out: Record<string, unknown> = {
    // Status global toujours à "Base de données" à la création.
    [COLUMN_IDS.statusGlobal]: { index: STATUS_GLOBAL_INDEX_BASE_DE_DONNEES }
  }

  // Activité : on envoie par index (immuable). Si activite vide ou inconnue,
  // on omet la colonne — Monday la laissera vide, l'équipe pourra la corriger
  // à la main. On ne fait pas tomber tout le CREATE pour un libellé inconnu.
  const activite = (contact.activite || '').trim()
  if (activite && Object.prototype.hasOwnProperty.call(ACTIVITE_INDEX, activite)) {
    out[COLUMN_IDS.activite] = { index: ACTIVITE_INDEX[activite] }
  } else if (activite) {
    console.warn(`[monday-contacts-sync] activité inconnue ignorée: "${activite}"`)
  }

  // Téléphone (Monday "phone" column attend { phone, countryShortName }).
  // On ne valide pas le format ici (saisie libre côté fiche, format français
  // non garanti). L'équipe corrigera côté Monday si besoin. Country FR par
  // défaut car cible métier France.
  const telephone = (contact.telephone || '').trim()
  if (telephone) {
    out[COLUMN_IDS.telephone] = { phone: telephone, countryShortName: 'FR' }
  }

  // Email (Monday "email" column attend { email, text }).
  const email = (contact.email || '').trim()
  if (email) {
    out[COLUMN_IDS.email] = { email, text: email }
  }

  // Commentaire (Monday "text" column attend une string).
  const commentaire = (contact.commentaire || '').trim()
  if (commentaire) {
    out[COLUMN_IDS.commentaire] = commentaire
  }

  return out
}

// ============================================================
// Monday : create_item
// ============================================================
async function createMondayItem(token: string, contact: ContactInput): Promise<string> {
  const itemName = buildItemName(contact)
  const columnValues = buildColumnValues(contact)
  const query = `
    mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId,
        group_id: $groupId,
        item_name: $itemName,
        column_values: $columnValues,
        create_labels_if_missing: false
      ) { id }
    }
  `
  const data = await mondayQuery<{ create_item: { id: string } }>(token, query, {
    boardId: BOARD_ID,
    groupId: GROUP_ID,
    itemName,
    // Monday attend une chaîne JSON, pas un objet.
    columnValues: JSON.stringify(columnValues)
  })
  return data.create_item.id
}

// ============================================================
// DB : lookup atomique du monday_item_id d'un contact par _localId
// ============================================================
// Utilisé deux fois :
//   1. Pré-CREATE : avant de pousser un item Monday, on relit la DB pour voir
//      si une invocation concurrente n'a pas déjà gravé un monday_item_id sur
//      ce même contact. Si oui → skip le CREATE pour éviter un doublon dans
//      le board Monday.
//   2. Indirectement via patchMondayItemIdInDB qui fait son propre re-read
//      avant l'UPDATE (compare-and-set, cf. plus bas).
async function readContactMondayItemId(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  ficheId: string,
  localId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('fiches')
    .select('avis_contacts_maintenance')
    .eq('id', ficheId)
    .single()

  if (error) {
    throw new Error(`DB read failed: ${error.message}`)
  }

  const arr = Array.isArray(data?.avis_contacts_maintenance)
    ? data.avis_contacts_maintenance
    : []

  const found = arr.find(
    // deno-lint-ignore no-explicit-any
    (c: any) => c && typeof c === 'object' && c._localId === localId
  )
  if (!found) return null

  const id = (found as { monday_item_id?: unknown }).monday_item_id
  return typeof id === 'string' && id.length > 0 ? id : null
}

// ============================================================
// DB : compare-and-set du monday_item_id sur le bon contact
// ============================================================
// Stratégie : lecture → vérification que monday_item_id est toujours absent →
// patch. Si une invocation concurrente a gagné la course entre notre SELECT
// (ou notre CREATE Monday) et ce UPDATE, on n'écrase PAS le monday_item_id
// officiel. Sémantique "first writer wins" déterministe.
//
// Retourne l'ID effectif :
//   - mondayItemId si on a écrit (cas nominal)
//   - l'ID préexistant si on a détecté un concurrent qui a gagné (l'item
//     qu'on vient de créer côté Monday devient orphelin — on log un warning
//     pour monitoring, pas de delete côté Monday)
//
// Lance si :
//   - la lecture DB échoue (réseau, etc.)
//   - le contact ciblé n'existe plus dans le tableau (supprimé côté front
//     entre l'invoke et maintenant)
//   - l'écriture DB échoue
async function patchMondayItemIdInDB(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  ficheId: string,
  localId: string,
  mondayItemId: string
): Promise<string> {
  const { data: row, error: readErr } = await supabase
    .from('fiches')
    .select('avis_contacts_maintenance')
    .eq('id', ficheId)
    .single()

  if (readErr) {
    throw new Error(`DB read failed: ${readErr.message}`)
  }

  const current = Array.isArray(row?.avis_contacts_maintenance)
    ? row.avis_contacts_maintenance
    : []

  const idx = current.findIndex(
    // deno-lint-ignore no-explicit-any
    (c: any) => c && typeof c === 'object' && c._localId === localId
  )
  if (idx === -1) {
    // Contact supprimé côté front entre l'invoke et maintenant. L'item
    // Monday créé reste orphelin (CREATE only, pas de delete).
    throw new Error(`Contact _localId=${localId} introuvable dans la fiche (probablement supprimé entre-temps)`)
  }

  // Compare-and-set : si une invocation concurrente a déjà gravé un
  // monday_item_id, on conserve le sien et on signale notre item comme
  // doublon orphelin. L'item qu'on vient de créer côté Monday existe mais
  // n'est référencé nulle part dans la fiche.
  const existing = current[idx] as { monday_item_id?: unknown }
  if (typeof existing.monday_item_id === 'string' && existing.monday_item_id.length > 0) {
    console.warn(
      `[monday-contacts-sync] RACE detected fiche=${ficheId} _localId=${localId} ` +
      `existing=${existing.monday_item_id} our_orphan=${mondayItemId}`
    )
    return existing.monday_item_id
  }

  const patched = current.map(
    // deno-lint-ignore no-explicit-any
    (c: any, i: number) => (i === idx ? { ...c, monday_item_id: mondayItemId } : c)
  )

  const { error: writeErr } = await supabase
    .from('fiches')
    .update({ avis_contacts_maintenance: patched })
    .eq('id', ficheId)

  if (writeErr) {
    throw new Error(`DB write failed: ${writeErr.message}`)
  }

  return mondayItemId
}

// ============================================================
// Handler
// ============================================================
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function jsonResponse(body: SyncResponse | SyncFatalError, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'Method not allowed' }, 405)
  }

  // @ts-ignore — Deno global
  const mondayToken = Deno.env.get('MONDAY_API_TOKEN')
  if (!mondayToken) {
    console.error('[monday-contacts-sync] MONDAY_API_TOKEN secret manquant')
    return jsonResponse({ success: false, error: 'UNAUTHORIZED', message: 'Server config: token Monday absent' }, 500)
  }

  // @ts-ignore — Deno global
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // @ts-ignore — Deno global
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  // @ts-ignore — Deno global
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error('[monday-contacts-sync] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY manquant')
    return jsonResponse({ success: false, error: 'SERVER_CONFIG', message: 'Server config: clés Supabase incomplètes' }, 500)
  }

  // ⚠️ Auth — le runtime Edge vérifie déjà la SIGNATURE du JWT (verify_jwt = true
  // par défaut), donc on est certain que le caller est un user Supabase
  // authentifié. MAIS le ficheId vient du payload front : sans vérification
  // d'ownership, un user A pourrait passer le ficheId d'un user B et stamper
  // des items Monday + des monday_item_id sur la fiche de B (l'Edge Function
  // écrit en DB via service role qui bypass RLS).
  //
  // On s'appuie sur les policies RLS existantes côté table `fiches` :
  //   - coordinateur_own_fiches  (user_id = auth.uid())
  //   - super_admin_all_fiches   (super_admin)
  // En créant un client Supabase avec la clé anon + le header Authorization
  // du caller, les requêtes tournent sous le JWT du user → RLS bouchonne
  // les fiches qu'il n'a pas le droit de voir. Si le SELECT renvoie 0 ligne,
  // on retourne 403 sans toucher à Monday ni à la DB.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ success: false, error: 'UNAUTHORIZED', message: 'Authorization header manquant' }, 401)
  }

  let body: SyncRequest
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'Invalid JSON body' }, 400)
  }

  if (!body.ficheId || typeof body.ficheId !== 'string') {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'ficheId manquant ou invalide' }, 400)
  }
  if (!Array.isArray(body.contacts) || body.contacts.length === 0) {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'contacts vide ou invalide' }, 400)
  }

  // Client "user" : sous RLS. Sert UNIQUEMENT au check d'ownership.
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  })
  const { data: ownerCheck, error: ownerErr } = await userClient
    .from('fiches')
    .select('id')
    .eq('id', body.ficheId)
    .maybeSingle()

  if (ownerErr) {
    // Erreur DB (réseau, etc.) — pas une décision d'autorisation. On loggue
    // et on retourne 502 pour distinguer du 403 (caller pas autorisé).
    console.error('[monday-contacts-sync] ownership check failed:', ownerErr)
    return jsonResponse({
      success: false,
      error: 'SERVER_CONFIG',
      message: `Ownership check failed: ${ownerErr.message}`
    }, 502)
  }
  if (!ownerCheck) {
    // RLS a filtré → soit la fiche n'existe pas, soit le caller n'y a pas
    // accès. Dans les deux cas on refuse sans rien divulguer.
    console.warn(`[monday-contacts-sync] ownership refused for fiche=${body.ficheId}`)
    return jsonResponse({
      success: false,
      error: 'FORBIDDEN',
      message: 'Fiche introuvable ou accès refusé'
    }, 403)
  }

  // Client "service role" : bypass RLS. Sert UNIQUEMENT pour le patch DB
  // monday_item_id après chaque CREATE Monday (besoin de write sur des champs
  // que la user ne peut pas forcément écrire selon les policies updates).
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  const results: ContactResult[] = []

  // Dry-run : on log ce qu'on aurait poussé sans appeler Monday ni la DB.
  if (body.dryRun) {
    for (const c of body.contacts) {
      if (!c?._localId || !(c.nom_prenom || '').trim()) {
        results.push({ _localId: c?._localId || '', error: 'INVALID_CONTACT', message: '_localId ou nom_prenom manquant' })
        continue
      }
      console.log('[monday-contacts-sync DRY-RUN]', JSON.stringify({
        ficheId: body.ficheId,
        localId: c._localId,
        itemName: buildItemName(c),
        columnValues: buildColumnValues(c)
      }))
      results.push({ _localId: c._localId, monday_item_id: 'DRY_RUN' })
    }
    return jsonResponse({ success: true, results, dryRun: true })
  }

  // Boucle séquentielle : chaque contact est traité indépendamment.
  // Un échec sur un contact n'arrête pas les suivants (résilience par item).
  //
  // 🛡 Idempotence renforcée serveur (anti-doublon Monday) :
  //   1. Pré-CREATE : on relit la DB par _localId. Si monday_item_id déjà
  //      gravé par une invocation concurrente terminée, on skip le CREATE
  //      et on retourne l'ID existant comme succès (état de vérité = DB,
  //      pas le payload entrant).
  //   2. patchMondayItemIdInDB est en compare-and-set : si une invocation
  //      concurrente a gagné la course entre notre SELECT et notre UPDATE,
  //      on conserve son ID en DB et le nôtre devient orphelin sur le board
  //      Monday (warn loggué pour monitoring).
  // Cette double protection ferme la quasi-totalité des fenêtres de race.
  // Reste un cas résiduel où deux invocations seraient strictement
  // simultanées sur l'appel HTTP Monday lui-même → orphelin sur le board,
  // visible dans les logs.
  for (const contact of body.contacts) {
    const localId = contact?._localId
    const nomPrenom = (contact?.nom_prenom || '').trim()

    if (!localId || !nomPrenom) {
      results.push({
        _localId: localId || '',
        error: 'INVALID_CONTACT',
        message: '_localId ou nom_prenom manquant'
      })
      continue
    }

    // 1) Pré-CREATE : la DB fait foi. Si un monday_item_id existe déjà,
    // ne pas re-créer un item Monday.
    let existingItemId: string | null
    try {
      existingItemId = await readContactMondayItemId(supabase, body.ficheId, localId)
    } catch (err) {
      console.error(`[monday-contacts-sync] pre-CREATE read failed (_localId=${localId}):`, err)
      results.push({
        _localId: localId,
        error: 'DB_WRITE_ERROR',
        message: err instanceof Error ? err.message : String(err)
      })
      continue
    }
    if (existingItemId) {
      console.log(
        `[monday-contacts-sync] SKIP (already pushed) fiche=${body.ficheId} ` +
        `_localId=${localId} mondayItem=${existingItemId}`
      )
      results.push({ _localId: localId, monday_item_id: existingItemId })
      continue
    }

    // 2) CREATE Monday.
    let itemId: string
    try {
      itemId = await createMondayItem(mondayToken, contact)
    } catch (err) {
      console.error(`[monday-contacts-sync] CREATE failed (_localId=${localId}):`, err)
      results.push({
        _localId: localId,
        error: 'MONDAY_API_ERROR',
        message: err instanceof Error ? err.message : String(err)
      })
      continue
    }

    // 3) Compare-and-set en DB. L'ID effectif peut différer de l'ID qu'on
    // vient de créer si une invocation concurrente a gagné la course.
    let effectiveItemId: string
    try {
      effectiveItemId = await patchMondayItemIdInDB(supabase, body.ficheId, localId, itemId)
    } catch (err) {
      console.error(`[monday-contacts-sync] DB patch failed (_localId=${localId}, mondayItem=${itemId}):`, err)
      // L'item Monday a été créé mais la DB n'a pas été patchée. On le remonte
      // au front, qui pourra retenter au prochain save — la protection pré-CREATE
      // évitera de re-créer un doublon si la DB a été patchée entre-temps.
      results.push({
        _localId: localId,
        error: 'DB_WRITE_ERROR',
        message: err instanceof Error ? err.message : String(err)
      })
      continue
    }

    results.push({ _localId: localId, monday_item_id: effectiveItemId })
    if (effectiveItemId === itemId) {
      console.log(`[monday-contacts-sync] OK fiche=${body.ficheId} localId=${localId} mondayItem=${effectiveItemId}`)
    } else {
      // patchMondayItemIdInDB a déjà loggué le warning RACE détaillé.
      console.log(`[monday-contacts-sync] OK (raced) fiche=${body.ficheId} localId=${localId} kept=${effectiveItemId}`)
    }
  }

  const allOk = results.every(r => 'monday_item_id' in r)
  return jsonResponse({ success: allOk, results })
})
