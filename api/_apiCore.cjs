// api/_apiCore.cjs
//
// Plomberie commune aux fonctions serverless `/api` : réponse JSON, lecture du
// corps, et contrôle d'identité + de rôle contre Supabase.
//
// Extrait de `_drivePocCore.cjs` (POC upload Drive) pour être partagé avec la
// vérification de dossier Drive du parcours « changer le numéro de bien ». Le
// contrôle de rôle est fait ici, côté serveur : masquer un bouton dans React ne
// protège rien.

const { createClient } = require('@supabase/supabase-js')

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') return request.body

  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  if (chunks.length === 0) return {}

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('Corps JSON invalide.')
  }
}

function getBearerToken(request) {
  const authorization = request.headers.authorization || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Configuration Supabase serveur manquante.')
  }

  return { url, anonKey }
}

/**
 * Vérifie la session Supabase portée par l'en-tête Authorization et exige un
 * rôle. Un compte désactivé (`profiles.active = false`) est refusé même avec un
 * JWT encore valide.
 *
 * @param {object} request
 * @param {string[]} allowedRoles - rôles acceptés, ex. ['admin', 'super_admin']
 * @param {{message?: string}} [options] - message de refus affiché à l'appelant
 * @returns {Promise<object>} l'utilisateur Supabase
 */
async function requireRole(request, allowedRoles, options = {}) {
  const token = getBearerToken(request)
  if (!token) {
    const error = new Error('Session utilisateur manquante.')
    error.statusCode = 401
    throw error
  }

  const { url, anonKey } = getSupabaseConfig()
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    const error = new Error('Session utilisateur invalide ou expirée.')
    error.statusCode = 401
    throw error
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profile) {
    const error = new Error('Impossible de vérifier le rôle utilisateur.')
    error.statusCode = 403
    throw error
  }

  if (profile.active === false || !allowedRoles.includes(profile.role)) {
    const error = new Error(options.message || 'Accès refusé.')
    error.statusCode = 403
    throw error
  }

  return userData.user
}

module.exports = { sendJson, readJsonBody, getBearerToken, getSupabaseConfig, requireRole }
