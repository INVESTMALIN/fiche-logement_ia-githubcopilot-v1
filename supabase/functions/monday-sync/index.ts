// supabase/functions/monday-sync/index.ts
//
// Sync 4 champs Fiche Logement → Monday (board 1272144935) :
// - avis_type_premier_menage      → colonne Premiers Ménages       (status)
// - avis_type_premiere_maintenance → colonne Maintenance           (status)
// - airbnb_mot_passe              → colonne MDP Airbnb Propriétaire (text)
// - booking_mot_passe             → colonne MDP Booking Propriétaire (text)
//
// Le token Monday admin-global est lu depuis Edge Secret `MONDAY_API_TOKEN`,
// jamais exposé côté client.
//
// Lookup de l'item Monday : par colonne `num_ro` (numbers) sur le board cible,
// via items_page_by_column_values. Si non trouvé → ITEM_NOT_FOUND (le client
// affichera un toast mais le save Supabase aura déjà réussi côté front).

// @ts-ignore — Deno runtime, pas de types Node
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

// ============================================================
// Configuration Monday
// ============================================================
const MONDAY_API = 'https://api.monday.com/v2'
const BOARD_ID = '1272144935'

const COLUMN_IDS = {
  numeroBien: 'num_ro',            // numbers — clé de lookup
  statut: 'statut47',              // status — Premiers Ménages
  maintenance: 'color_mm3ftnef',   // status — Maintenance
  airbnbPassword: 'text_mm2q5tw8', // text — MDP Airbnb Propriétaire
  bookingPassword: 'text_mm2qaz6a' // text — MDP Booking Propriétaire
} as const

// Mapping FormContext value → label Monday status
// Front : 'Vérification / Inventaire' (espaces autour du slash)
// Monday : 'Vérification/Inventaire' (sans espaces)
function normalizeTypePremierMenage(value: string | null): string | null {
  if (!value) return null
  // Strip ` / ` → `/` (seulement cette transformation, le reste est identique)
  return value.replace(' / ', '/')
}

// ============================================================
// Types
// ============================================================
type FieldKey = 'type_premier_menage' | 'type_premiere_maintenance' | 'airbnb_mot_passe' | 'booking_mot_passe'

interface SyncRequest {
  ficheId: string
  numeroBien: number | string
  fields: {
    type_premier_menage: string | null
    type_premiere_maintenance: string | null
    airbnb_mot_passe: string | null
    booking_mot_passe: string | null
  }
  changedFields?: FieldKey[]  // si absent → push tous les champs (finalisation initiale)
  dryRun?: boolean
}

interface SyncSuccess {
  success: true
  itemId: string
  updatedColumns: string[]
  dryRun?: boolean
}

interface SyncError {
  success: false
  error: 'ITEM_NOT_FOUND' | 'MONDAY_API_ERROR' | 'UNAUTHORIZED' | 'BAD_REQUEST' | 'NO_FIELDS_TO_UPDATE'
  message: string
}

// ============================================================
// Monday API helpers
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

async function findItemByNumeroBien(token: string, numeroBien: string): Promise<string | null> {
  const query = `
    query ($boardId: ID!, $columnId: String!, $value: String!) {
      items_page_by_column_values(
        board_id: $boardId,
        columns: [{ column_id: $columnId, column_values: [$value] }]
      ) {
        items { id name }
      }
    }
  `
  const data = await mondayQuery<{
    items_page_by_column_values: { items: Array<{ id: string; name: string }> }
  }>(token, query, {
    boardId: BOARD_ID,
    columnId: COLUMN_IDS.numeroBien,
    value: numeroBien
  })

  const items = data.items_page_by_column_values?.items || []
  if (items.length === 0) return null
  if (items.length > 1) {
    console.warn(`[monday-sync] ${items.length} items trouvés pour numero_bien=${numeroBien}, prend le premier (${items[0].id})`)
  }
  return items[0].id
}

async function updateItemColumns(token: string, itemId: string, columnValues: Record<string, unknown>): Promise<void> {
  const query = `
    mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        board_id: $boardId,
        item_id: $itemId,
        column_values: $columnValues
      ) { id }
    }
  `
  await mondayQuery(token, query, {
    boardId: BOARD_ID,
    itemId,
    // Monday attend une chaîne JSON, pas un objet
    columnValues: JSON.stringify(columnValues)
  })
}

// ============================================================
// Build column_values selon les champs à push
// ============================================================
function buildColumnValues(fields: SyncRequest['fields'], onlyKeys: FieldKey[] | undefined): Record<string, unknown> {
  const shouldPush = (key: FieldKey) => onlyKeys === undefined || onlyKeys.includes(key)
  const out: Record<string, unknown> = {}

  // ⚠️ On envoie TOUJOURS une valeur pour chaque champ qu'on veut push, même null/vide.
  // Sinon une suppression côté Fiche Logement (user efface un mot de passe ou décoche
  // le statut) ne se propageait jamais à Monday — la colonne restait avec l'ancienne
  // valeur indéfiniment. Pour Monday : `{label: null}` vide une status column,
  // string vide vide une text column.
  if (shouldPush('type_premier_menage')) {
    const normalized = normalizeTypePremierMenage(fields.type_premier_menage)
    out[COLUMN_IDS.statut] = normalized ? { label: normalized } : { label: null }
  }
  if (shouldPush('type_premiere_maintenance')) {
    // Valeur envoyée telle quelle : les labels TYPES_MAINTENANCE côté front sont
    // alignés sur ceux de la colonne Monday. Si un mismatch de label apparaît au
    // test E2E (apostrophe typographique vs droite), ajouter ici une normalisation
    // dédiée comme normalizeTypePremierMenage.
    const maintenance = fields.type_premiere_maintenance
    out[COLUMN_IDS.maintenance] = maintenance ? { label: maintenance } : { label: null }
  }
  if (shouldPush('airbnb_mot_passe')) {
    out[COLUMN_IDS.airbnbPassword] = fields.airbnb_mot_passe ?? ''
  }
  if (shouldPush('booking_mot_passe')) {
    out[COLUMN_IDS.bookingPassword] = fields.booking_mot_passe ?? ''
  }

  return out
}

// ============================================================
// Handler
// ============================================================
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function jsonResponse(body: SyncSuccess | SyncError, status = 200): Response {
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

  // Auth : on vérifie juste la présence du JWT Supabase. Le client a déjà été
  // authentifié par Supabase pour appeler cette fonction (le runtime Edge le check
  // automatiquement quand verify_jwt = true dans config.toml — défaut).
  // @ts-ignore — Deno global
  const token = Deno.env.get('MONDAY_API_TOKEN')
  if (!token) {
    console.error('[monday-sync] MONDAY_API_TOKEN secret manquant')
    return jsonResponse({ success: false, error: 'UNAUTHORIZED', message: 'Server config: token Monday absent' }, 500)
  }

  let body: SyncRequest
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'Invalid JSON body' }, 400)
  }

  if (!body.numeroBien) {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'numeroBien manquant' }, 400)
  }
  if (!body.fields || typeof body.fields !== 'object') {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'fields manquant' }, 400)
  }

  const numeroBienStr = String(body.numeroBien)
  const columnValues = buildColumnValues(body.fields, body.changedFields)
  const updatedColumns = Object.keys(columnValues)

  if (updatedColumns.length === 0) {
    // Cas anormal depuis le fix null-skip : ne devrait survenir que si
    // changedFields est passé en array explicitement vide [] par le client
    // (le hook front ne devrait jamais appeler dans ce cas).
    return jsonResponse({
      success: false,
      error: 'NO_FIELDS_TO_UPDATE',
      message: 'changedFields vide : aucun champ demandé pour le push'
    }, 200)
  }

  // Dry-run : on log et on s'arrête avant tout appel Monday
  if (body.dryRun) {
    console.log('[monday-sync DRY-RUN]', JSON.stringify({
      ficheId: body.ficheId,
      numeroBien: numeroBienStr,
      changedFields: body.changedFields,
      columnValuesToSend: columnValues
    }))
    return jsonResponse({
      success: true,
      itemId: 'DRY_RUN',
      updatedColumns,
      dryRun: true
    })
  }

  // 1. Lookup de l'item Monday par num_ro
  let itemId: string | null
  try {
    itemId = await findItemByNumeroBien(token, numeroBienStr)
  } catch (err) {
    console.error('[monday-sync] Lookup error:', err)
    return jsonResponse({
      success: false,
      error: 'MONDAY_API_ERROR',
      message: `Lookup item échoué: ${err instanceof Error ? err.message : String(err)}`
    }, 502)
  }

  if (!itemId) {
    return jsonResponse({
      success: false,
      error: 'ITEM_NOT_FOUND',
      message: `Aucun item Monday trouvé sur le board ${BOARD_ID} avec num_ro=${numeroBienStr}`
    }, 404)
  }

  // 2. Update des colonnes
  try {
    await updateItemColumns(token, itemId, columnValues)
  } catch (err) {
    console.error('[monday-sync] Update error:', err)
    return jsonResponse({
      success: false,
      error: 'MONDAY_API_ERROR',
      message: `Update item échoué: ${err instanceof Error ? err.message : String(err)}`
    }, 502)
  }

  console.log(`[monday-sync] OK fiche=${body.ficheId} numero_bien=${numeroBienStr} item=${itemId} columns=${updatedColumns.join(',')}`)
  return jsonResponse({ success: true, itemId, updatedColumns })
})
