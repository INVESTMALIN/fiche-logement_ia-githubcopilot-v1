// supabase/functions/admin-users/index.ts
//
// Gestion des comptes utilisateurs depuis la Console Admin (onglet Utilisateurs).
//
// Toutes les écritures admin sur les profils passent par cette Edge Function :
// la clé `service_role` contourne RLS, et la fonction vérifie côté serveur que
// l'appelant est `super_admin` AVANT toute opération. Le rôle envoyé par le
// front n'est jamais utilisé — il est systématiquement re-vérifié en base.
//
// Actions exposées : create | update | toggleActive
// (pas de hard delete — décision métier : soft delete uniquement.)
//
// Variables d'environnement (runtime Edge Functions Supabase) :
// - SUPABASE_URL                : auto-injecté
// - SUPABASE_ANON_KEY           : auto-injecté — client "appelant" (vérif identité + rôle)
// - SUPABASE_SERVICE_ROLE_KEY   : auto-injecté — client privilégié (bypass RLS)
//
// Pattern calqué sur supabase/functions/monday-sync/index.ts.

// @ts-ignore — Deno runtime, pas de types Node
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-ignore — Deno runtime
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// Types
// ============================================================
type Role = 'coordinateur' | 'admin' | 'super_admin'

interface AdminRequest {
  action: 'create' | 'update' | 'toggleActive'
  payload: Record<string, unknown>
}

interface AdminResponse {
  success: boolean
  error?: string
  message?: string
  data?: unknown
}

const VALID_ROLES: Role[] = ['coordinateur', 'admin', 'super_admin']

// ============================================================
// HTTP helpers
// ============================================================
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function jsonResponse(body: AdminResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  })
}

// ============================================================
// Action : create
// ============================================================
// Crée le compte auth.users ; le trigger handle_new_user() crée ensuite la
// ligne `profiles` à partir de user_metadata (prenom / nom / role).
async function handleCreate(service: SupabaseClient, payload: Record<string, unknown>): Promise<Response> {
  const email = String(payload.email ?? '').trim()
  const password = String(payload.password ?? '')
  const prenom = String(payload.prenom ?? '')
  const nom = String(payload.nom ?? '')
  const role = payload.role as Role

  if (!email || !password || !VALID_ROLES.includes(role)) {
    return jsonResponse({ success: false, error: 'Champs manquants ou rôle invalide.' }, 400)
  }

  // email_confirm: true → compte créé déjà confirmé : l'utilisateur (un
  // collègue interne) peut se connecter immédiatement avec le mot de passe
  // temporaire fourni par l'admin. Pas de friction de confirmation email.
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { prenom, nom, role }
  })

  if (error) {
    const msg = error.message || ''
    if (/already|exist|registered/i.test(msg)) {
      return jsonResponse({ success: false, error: 'Cet email est déjà utilisé.' }, 409)
    }
    if (/password/i.test(msg)) {
      return jsonResponse({ success: false, error: 'Le mot de passe doit faire au moins 6 caractères.' }, 400)
    }
    return jsonResponse({ success: false, error: msg }, 502)
  }

  const newUser = data?.user
  if (!newUser?.id) {
    return jsonResponse({ success: false, error: "La création de l'utilisateur a échoué." }, 502)
  }

  // Vérifie que le trigger handle_new_user() a bien créé la ligne profiles.
  const { data: profileRow, error: profileError } = await service
    .from('profiles')
    .select('id')
    .eq('id', newUser.id)
    .maybeSingle()

  if (profileError || !profileRow) {
    console.error('[admin-users] profil non créé pour', newUser.id, profileError?.message ?? '')
    return jsonResponse({
      success: false,
      error: "Le compte a été créé mais son profil est introuvable (trigger handle_new_user). Contactez un administrateur technique."
    }, 500)
  }

  console.log(`[admin-users] create OK user=${newUser.id} email=${email} role=${role}`)
  return jsonResponse({
    success: true,
    message: 'Utilisateur créé. Communiquez-lui le mot de passe temporaire.'
  })
}

// ============================================================
// Action : update
// ============================================================
// Met à jour prénom / nom / rôle d'un profil. L'email n'est pas modifiable.
async function handleUpdate(service: SupabaseClient, payload: Record<string, unknown>): Promise<Response> {
  const userId = String(payload.userId ?? '')
  const prenom = String(payload.prenom ?? '')
  const nom = String(payload.nom ?? '')
  const role = payload.role as Role

  if (!userId || !VALID_ROLES.includes(role)) {
    return jsonResponse({ success: false, error: 'Champs manquants ou rôle invalide.' }, 400)
  }

  const { data, error } = await service
    .from('profiles')
    .update({ prenom, nom, role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id')

  if (error) {
    return jsonResponse({ success: false, error: error.message }, 502)
  }
  if (!data || data.length !== 1) {
    return jsonResponse({ success: false, error: 'Utilisateur introuvable.' }, 404)
  }

  console.log(`[admin-users] update OK user=${userId} role=${role}`)
  return jsonResponse({ success: true, message: 'Utilisateur modifié.' })
}

// ============================================================
// Action : toggleActive
// ============================================================
// Active / désactive un compte (soft delete). Les sessions actives ne sont pas
// révoquées — cf. note dans le corps de la fonction.
async function handleToggleActive(service: SupabaseClient, payload: Record<string, unknown>): Promise<Response> {
  const userId = String(payload.userId ?? '')
  const active = payload.active

  if (!userId || typeof active !== 'boolean') {
    return jsonResponse({ success: false, error: 'Champs manquants ou paramètre "active" invalide.' }, 400)
  }

  const { data, error } = await service
    .from('profiles')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id')

  if (error) {
    return jsonResponse({ success: false, error: error.message }, 502)
  }
  if (!data || data.length !== 1) {
    return jsonResponse({ success: false, error: 'Utilisateur introuvable.' }, 404)
  }

  // Note : on ne révoque pas les sessions actives à la désactivation.
  // L'API auth.admin.signOut attend un JWT valide, pas un userId.
  // Limitation acceptée : un user désactivé garde sa session active
  // jusqu'à expiration du JWT (max 1h). Le check `active` au login
  // dans AuthContext.signIn bloque toute reconnexion.

  console.log(`[admin-users] toggleActive OK user=${userId} active=${active}`)
  return jsonResponse({
    success: true,
    message: active ? 'Utilisateur activé.' : 'Utilisateur désactivé.'
  })
}

// ============================================================
// Handler
// ============================================================
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Méthode non autorisée.' }, 405)
  }

  // --- Configuration serveur ---
  // @ts-ignore — Deno global
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // @ts-ignore — Deno global
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  // @ts-ignore — Deno global
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('[admin-users] Variables d\'environnement manquantes')
    return jsonResponse({ success: false, error: 'Configuration serveur incomplète.' }, 500)
  }

  // --- 1. Authentification de l'appelant ---
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return jsonResponse({ success: false, error: 'Authentification requise.' }, 401)
  }

  // Client anon : sert uniquement à valider le JWT et récupérer l'identité.
  const authClient = createClient(supabaseUrl, anonKey)
  const { data: { user }, error: userError } = await authClient.auth.getUser(token)
  if (userError || !user) {
    return jsonResponse({ success: false, error: 'Session invalide.' }, 401)
  }

  // --- 2. Client privilégié (bypass RLS) ---
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // --- 3. Vérification du caller (toujours re-vérifié en base, jamais via le front) ---
  // Lookup via le client service_role : le client anon ne transmet pas le JWT
  // aux requêtes PostgREST, le SELECT tournerait en anonyme et serait filtré
  // par RLS → 403 systématique.
  const { data: callerProfile, error: roleError } = await service
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .maybeSingle()

  if (roleError || !callerProfile) {
    return jsonResponse({ success: false, error: 'Profil appelant introuvable.' }, 403)
  }
  // Un super_admin désactivé alors que son onglet est encore ouvert conserve un
  // JWT valide jusqu'à 1h : on le rejette ici, avant tout dispatch.
  if (callerProfile.active === false) {
    return jsonResponse({ success: false, error: 'Votre compte a été désactivé.' }, 403)
  }
  if (callerProfile.role !== 'super_admin') {
    return jsonResponse({
      success: false,
      error: 'Accès refusé : action réservée aux super administrateurs.'
    }, 403)
  }

  // --- 4. Parsing de la requête ---
  let body: AdminRequest
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Corps de requête JSON invalide.' }, 400)
  }

  const action = body?.action
  const payload = body?.payload ?? {}
  if (action !== 'create' && action !== 'update' && action !== 'toggleActive') {
    return jsonResponse({ success: false, error: 'Action inconnue.' }, 400)
  }

  // --- 5. Dispatch ---
  try {
    if (action === 'create') return await handleCreate(service, payload)
    if (action === 'update') return await handleUpdate(service, payload)
    return await handleToggleActive(service, payload)
  } catch (err) {
    console.error('[admin-users] Erreur inattendue:', err)
    return jsonResponse({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }, 500)
  }
})
