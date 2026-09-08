// supabase/functions/monday-bien/index.ts
//
// Le bien existe-t-il déjà dans Monday ? Vérification LECTURE SEULE utilisée par
// le parcours administrateur « changer le numéro de bien » : avant de
// renuméroter, la ligne du NOUVEAU numéro doit exister sur le board de
// production, sinon toutes les synchronisations qui la cherchent échoueront.
//
// STRICTEMENT EN LECTURE. Ce fichier ne contient aucune mutation GraphQL, et
// n'écrit ni dans Monday, ni dans Supabase, ni dans la fiche. C'est pour ça
// qu'il ne réutilise pas `monday-sync` ni `annonce-validate` : ces deux
// fonctions font le même lookup mais écrivent dans la foulée, les appeler pour
// une simple vérification exposerait leurs écritures.
//
// Le token Monday vient du secret Edge `MONDAY_API_TOKEN`, déjà en place pour
// les deux autres fonctions. Il ne quitte jamais le serveur : le navigateur
// reçoit uniquement les noms des lignes trouvées.
//
// Variables d'environnement (runtime Edge Functions Supabase) :
// - SUPABASE_URL       : auto-injecté
// - SUPABASE_ANON_KEY  : auto-injecté — client « appelant » (identité + rôle)
// - MONDAY_API_TOKEN   : secret Edge, partagé avec monday-sync
//
// Pas de `service_role` ici, volontairement : la seule lecture Supabase est le
// profil de l'appelant, que les RLS l'autorisent déjà à lire lui-même (c'est ce
// que fait AuthContext dans le navigateur). Une fonction en lecture seule n'a
// pas besoin d'une clé qui contourne les RLS.

// @ts-ignore — Deno runtime, pas de types Node
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-ignore — Deno runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// Configuration Monday — mêmes cibles que monday-sync
// ============================================================
const MONDAY_API = 'https://api.monday.com/v2'
const BOARD_ID = '1272144935'
const NUMERO_COLUMN = 'num_ro' // colonne numbers, clé de lookup

const ROLES_AUTORISES = ['admin', 'super_admin']

// Même forme que src/lib/numeroBien.js : aucun numéro accepté par l'application
// ne doit être refusé ici.
const NUMERO_FORMAT = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
const NUMERO_LONGUEUR_MAX = 50

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface Ligne {
  id: string
  nom: string
}

interface Succes {
  success: true
  lignes: Ligne[]
}

interface Echec {
  success: false
  error: 'UNAUTHORIZED' | 'FORBIDDEN' | 'BAD_REQUEST' | 'MONDAY_API_ERROR' | 'SERVER_CONFIG'
  message: string
}

function jsonResponse(body: Succes | Echec, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  })
}

function numeroExploitable(valeur: unknown): boolean {
  const numero = String(valeur ?? '').trim()
  return numero.length > 0
    && numero.length <= NUMERO_LONGUEUR_MAX
    && NUMERO_FORMAT.test(numero)
}

/**
 * Les lignes du board dont la colonne `num_ro` porte ce numéro.
 * Une seule requête, aucune mutation. Rend TOUTES les lignes : c'est à
 * l'appelant de distinguer « une » de « plusieurs », un doublon dans Monday
 * étant précisément ce qu'il faut montrer à l'administrateur.
 */
async function chercherLignes(token: string, numero: string): Promise<Ligne[]> {
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
  const response = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
      'API-Version': '2024-01'
    },
    body: JSON.stringify({
      query,
      variables: { boardId: BOARD_ID, columnId: NUMERO_COLUMN, value: numero }
    })
  })

  const data = await response.json()
  if (data.errors?.length) {
    throw new Error(`Monday GraphQL: ${JSON.stringify(data.errors)}`)
  }
  if (!response.ok) {
    throw new Error(`Monday HTTP ${response.status}`)
  }

  // Une réponse 200 dont la forme n'est pas celle attendue n'est PAS une liste
  // vide. La replier sur `[]` ferait dire à l'écran « le bien n'existe pas dans
  // Monday » alors que personne n'a rien constaté, et le contrôle côté
  // navigateur ne pourrait plus rattraper le coup : il recevrait une réponse
  // réussie et parfaitement lisible. On lève, l'appelant répondra
  // « vérification impossible ».
  const items = data.data?.items_page_by_column_values?.items
  if (!Array.isArray(items)) {
    throw new Error('Monday: réponse sans items_page_by_column_values exploitable')
  }

  return items.map((item: { id: string; name: string }) => ({ id: item.id, nom: item.name }))
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'Méthode non autorisée.' }, 405)
  }

  // @ts-ignore — Deno global
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // @ts-ignore — Deno global
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  // @ts-ignore — Deno global
  const mondayToken = Deno.env.get('MONDAY_API_TOKEN')

  if (!supabaseUrl || !anonKey) {
    console.error('[monday-bien] variables Supabase manquantes')
    return jsonResponse({ success: false, error: 'SERVER_CONFIG', message: 'Configuration serveur incomplète.' }, 500)
  }
  if (!mondayToken) {
    console.error('[monday-bien] MONDAY_API_TOKEN secret manquant')
    return jsonResponse({ success: false, error: 'SERVER_CONFIG', message: 'Token Monday absent du serveur.' }, 500)
  }

  // --- 1. Identité de l'appelant ---
  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) {
    return jsonResponse({ success: false, error: 'UNAUTHORIZED', message: 'Authentification requise.' }, 401)
  }

  // Le JWT est passé en en-tête global : sans lui, le SELECT partirait en
  // anonyme et les RLS le filtreraient.
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: { user }, error: userError } = await authClient.auth.getUser(jwt)
  if (userError || !user) {
    return jsonResponse({ success: false, error: 'UNAUTHORIZED', message: 'Session invalide.' }, 401)
  }

  // --- 2. Rôle, toujours re-vérifié en base, jamais d'après le front ---
  const { data: profil, error: profilError } = await authClient
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .maybeSingle()

  if (profilError || !profil) {
    return jsonResponse({ success: false, error: 'FORBIDDEN', message: 'Profil appelant introuvable.' }, 403)
  }
  // Un compte désactivé garde un JWT valide jusqu'à une heure : on le rejette.
  if (profil.active === false) {
    return jsonResponse({ success: false, error: 'FORBIDDEN', message: 'Votre compte a été désactivé.' }, 403)
  }
  if (!ROLES_AUTORISES.includes(profil.role)) {
    return jsonResponse({
      success: false,
      error: 'FORBIDDEN',
      message: 'La vérification Monday est réservée aux administrateurs.'
    }, 403)
  }

  // --- 3. Requête ---
  let body: { numeroBien?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'Corps de requête invalide.' }, 400)
  }

  if (!numeroExploitable(body.numeroBien)) {
    return jsonResponse({ success: false, error: 'BAD_REQUEST', message: 'Le numéro de bien est invalide.' }, 400)
  }

  // --- 4. Lecture Monday ---
  try {
    const lignes = await chercherLignes(mondayToken, String(body.numeroBien).trim())
    return jsonResponse({ success: true, lignes })
  } catch (err) {
    // Panne, quota, board inaccessible : on ne sait pas si le bien existe.
    // L'appelant affichera « vérification impossible », jamais « absent ».
    console.error('[monday-bien] lecture Monday en echec :', err instanceof Error ? err.message : String(err))
    return jsonResponse({
      success: false,
      error: 'MONDAY_API_ERROR',
      message: "Monday n'a pas répondu correctement."
    }, 502)
  }
})
