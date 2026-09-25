// supabase/functions/monday-sync/index.ts
//
// Sync 7 champs Fiche Logement → Monday (board 1272144935), UN champ à la
// fois. La logique (diff, traduction par index, isolation des champs, calcul
// du snapshot) vit dans `sync.ts`, pur et testé ; ce fichier ne fait que le
// câblage : HTTP, secrets, client Supabase authentifié, appels Monday.
//
// Secrets / environnement (runtime Edge Functions Supabase) :
// - MONDAY_API_TOKEN  : secret Edge, token Monday admin-global, jamais côté client
// - SUPABASE_URL      : auto-injecté
// - SUPABASE_ANON_KEY : auto-injecté — client « appelant » (RLS de l'utilisateur)
//
// Pas de `service_role`, volontairement : la fiche est lue et son snapshot
// fusionné SOUS LES RLS de l'appelant (pattern de `monday-bien`). Un
// utilisateur ne peut donc synchroniser que les fiches qu'il a le droit de
// modifier — ce que l'ancienne version ne vérifiait pas.
//
// Codes HTTP : les issues « métier » (fiche introuvable, numéro périmé, item
// Monday absent, refus par champ) sont rendues en 200 avec `success:false` et
// le détail par champ : `supabase.functions.invoke` ne livre le corps au
// front qu'en 2xx. Seuls les défauts de requête ou de configuration sortent
// en 4xx/5xx.

// @ts-ignore — Deno runtime, pas de types Node
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-ignore — résolution Deno-only
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  BOARD_ID,
  COLUMN_IDS,
  FIELD_KEYS,
  synchroniser,
  type Deps,
  type FicheLue,
  type SyncError,
  type SyncFields,
  type SyncRequest,
  type SyncResponse
} from './sync.ts'

const MONDAY_API = 'https://api.monday.com/v2'
// Version historique de la fonction. Monday sert déjà des versions plus
// récentes ; le changement de version est un chantier à part (hors périmètre),
// le parsing d'erreur ci-dessous accepte les deux formats de réponse.
const MONDAY_API_VERSION = '2024-01'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function jsonResponse(body: SyncResponse | SyncError, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  })
}

// ============================================================
// Monday GraphQL
// ============================================================
// Deux formats d'erreur coexistent selon la version servie : le tableau
// GraphQL standard `errors[]`, et l'ancien objet plat `{ error_code,
// error_message, status_code }` rendu en HTTP 200 SANS `errors` — que
// l'ancienne version de cette fonction prenait pour un succès. Une réponse
// sans `data` est aussi une erreur.
async function mondayQuery<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
      'API-Version': MONDAY_API_VERSION
    },
    body: JSON.stringify({ query, variables })
  })
  let json: Record<string, unknown>
  try {
    json = await res.json()
  } catch {
    throw new Error(`Monday HTTP ${res.status}: réponse non JSON`)
  }
  const errors = json.errors
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error(`Monday GraphQL: ${JSON.stringify(errors)}`)
  }
  if (typeof json.error_message === 'string' || typeof json.error_code === 'string') {
    throw new Error(`Monday ${json.error_code ?? 'error'}: ${json.error_message ?? ''} ${json.error_data ? JSON.stringify(json.error_data) : ''}`.trim())
  }
  if (!res.ok) {
    throw new Error(`Monday HTTP ${res.status}: ${JSON.stringify(json)}`)
  }
  if (json.data === undefined || json.data === null) {
    throw new Error('Monday: réponse sans data')
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

// Une colonne à la fois : c'est ce qui isole les champs les uns des autres.
async function changeColumnValue(token: string, itemId: string, columnId: string, valeur: unknown): Promise<void> {
  const query = `
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value
      ) { id }
    }
  `
  const data = await mondayQuery<{ change_column_value: { id: string } | null }>(token, query, {
    boardId: BOARD_ID,
    itemId,
    columnId,
    // Monday attend une chaîne JSON : `{"index":4}`, `{}` (vider un status),
    // `"mot de passe"` ou `""` (vider un text).
    value: JSON.stringify(valeur)
  })
  if (!data.change_column_value?.id) {
    throw new Error(`Monday: change_column_value sans id pour la colonne ${columnId}`)
  }
}

// ============================================================
// Requête
// ============================================================
function lireRequete(body: unknown): SyncRequest | string {
  if (!body || typeof body !== 'object') return 'Corps de requête invalide'
  const b = body as Record<string, unknown>
  if (typeof b.ficheId !== 'string' || b.ficheId.trim() === '') return 'ficheId manquant'
  if (b.numeroBien === undefined || b.numeroBien === null || String(b.numeroBien).trim() === '') return 'numeroBien manquant'
  if (!b.fields || typeof b.fields !== 'object') return 'fields manquant'
  const brut = b.fields as Record<string, unknown>
  const fields = {} as SyncFields
  for (const k of FIELD_KEYS) {
    // Clé absente = champ non fourni (front antérieur) : reste `undefined`,
    // `sync.ts` ne le pousse pas. Surtout pas `null`, qui viderait Monday.
    if (!Object.prototype.hasOwnProperty.call(brut, k)) {
      fields[k] = undefined
      continue
    }
    const v = brut[k]
    if (v !== undefined && v !== null && typeof v !== 'string') return `fields.${k} doit être une chaîne ou null`
    fields[k] = (v as string | null | undefined) ?? null
  }
  return {
    ficheId: b.ficheId,
    numeroBien: b.numeroBien as string | number,
    fields,
    pushAll: b.pushAll === true,
    dryRun: b.dryRun === true
  }
}

// ============================================================
// Handler
// ============================================================
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'Method not allowed' }, 405)
  }

  // @ts-ignore — Deno global
  const token = Deno.env.get('MONDAY_API_TOKEN')
  if (!token) {
    console.error('[monday-sync] MONDAY_API_TOKEN secret manquant')
    return jsonResponse({ success: false, error: 'UNAUTHORIZED', message: 'Server config: token Monday absent' }, 500)
  }
  // @ts-ignore — Deno global
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // @ts-ignore — Deno global
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) {
    console.error('[monday-sync] SUPABASE_URL / SUPABASE_ANON_KEY absents')
    return jsonResponse({ success: false, error: 'UNAUTHORIZED', message: 'Server config: Supabase absent' }, 500)
  }

  // Le JWT de l'appelant a déjà été vérifié par le runtime (verify_jwt). On le
  // rejoue vers PostgREST : la fiche est lue et fusionnée sous SES RLS.
  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) {
    return jsonResponse({ success: false, error: 'UNAUTHORIZED', message: 'Authentification requise.' }, 401)
  }
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let brut: unknown
  try {
    brut = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'Invalid JSON body' }, 400)
  }
  const requete = lireRequete(brut)
  if (typeof requete === 'string') {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: requete }, 400)
  }

  const deps: Deps = {
    lireFiche: async (ficheId: string): Promise<FicheLue | null> => {
      const { data, error } = await authClient
        .from('fiches')
        .select('id, logement_numero_bien, monday_snapshot')
        .eq('id', ficheId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return null
      const snapshot = data.monday_snapshot
      return {
        numeroBien: data.logement_numero_bien === null || data.logement_numero_bien === undefined ? null : String(data.logement_numero_bien),
        snapshot: snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot as Record<string, unknown> : null
      }
    },
    trouverItem: (numeroBien: string) => findItemByNumeroBien(token, numeroBien),
    ecrireColonne: (itemId: string, columnId: string, valeur: unknown) => changeColumnValue(token, itemId, columnId, valeur),
    fusionnerSnapshot: async (ficheId: string, numeroBien: string, patch: Record<string, unknown>) => {
      const { data, error } = await authClient.rpc('fusionner_monday_snapshot', {
        p_fiche_id: ficheId,
        p_numero_bien: numeroBien,
        p_patch: patch
      })
      if (error) throw new Error(error.message)
      return data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : null
    },
    log: (m: string) => console.log(m),
    warn: (m: string) => console.warn(m)
  }

  try {
    const resultat = await synchroniser(requete, deps)
    return jsonResponse(resultat, 200)
  } catch (err) {
    // Filet : `synchroniser` attrape déjà les erreurs par étape ; on ne laisse
    // jamais remonter un message brut (il pourrait porter une valeur).
    console.error('[monday-sync] erreur inattendue :', err instanceof Error ? err.message : String(err))
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'Erreur inattendue pendant la synchronisation.' }, 500)
  }
})
