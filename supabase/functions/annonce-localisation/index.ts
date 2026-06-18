// supabase/functions/annonce-localisation/index.ts
//
// Brique 1 du chantier agent annonce : construit (ou réutilise) la fiche de
// FAITS de localisation enrichie d'un logement et la stocke dans la table
// dédiée `fiche_localisation_faits` (1 ligne / fiche).
//
// Cette Edge Function est un WRAPPER HTTP fin : elle gère le transport (CORS,
// méthode, corps), l'auth (verify_jwt + check d'ownership RLS-aware), puis
// délègue TOUTE la logique métier « réutilise-ou-recalcule-et-upsert » au helper
// partagé `_shared/localisation/orchestrator.ts`. Ce même helper est importé
// directement par l'Edge Function `annonce-generate` (sans saut HTTP, sans
// nouveau JWT) — une seule source de vérité pour la décision reuse/recompute.
//
// Données seules : aucun appel modèle, aucune génération d'annonce.
//
// Auth : même pattern que monday-contacts-sync. verify_jwt = true (signature
// vérifiée par le runtime) + check d'ownership RLS via le JWT appelant sur
// `fiches`. Les écritures (dans le helper) passent en service role (bypass RLS).

// @ts-ignore — Deno runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-ignore — résolution Deno-only
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  ensureLocalisationFaits,
  type LocalisationFaitsErrorCode,
} from '../_shared/localisation/orchestrator.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// deno-lint-ignore no-explicit-any
function json(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

// Traduction des codes d'erreur métier (contrat du helper) en status HTTP. Seule
// responsabilité HTTP qui reste autour de l'orchestration ; le helper, lui,
// ignore tout de HTTP.
const ERROR_STATUS: Record<LocalisationFaitsErrorCode, number> = {
  DB_READ_ERROR: 500,
  ADDRESS_INSUFFICIENT: 422,
  SERVER_CONFIG: 500,
  GEOCODE_FAILED: 502,
  BUILD_FAILED: 502,
  DB_WRITE_ERROR: 500,
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ success: false, error: 'BAD_REQUEST', message: 'Method not allowed' }, 405)

  // @ts-ignore — Deno global
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // @ts-ignore — Deno global
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  // @ts-ignore — Deno global
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  // Supabase est nécessaire à TOUS les chemins (même la réutilisation lit la DB).
  // La clé Geoapify, elle, n'est requise QUE pour un recalcul → vérifiée dans le
  // helper, juste avant le build (cf. chemin réutilisation sans clé).
  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('[annonce-localisation] clés Supabase incomplètes')
    return json({ success: false, error: 'SERVER_CONFIG', message: 'Config serveur Supabase incomplète' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ success: false, error: 'UNAUTHORIZED', message: 'Authorization header manquant' }, 401)

  // deno-lint-ignore no-explicit-any
  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ success: false, error: 'BAD_REQUEST', message: 'JSON invalide' }, 400)
  }
  const ficheId: unknown = body?.ficheId
  const force = body?.force === true
  if (!ficheId || typeof ficheId !== 'string') {
    return json({ success: false, error: 'BAD_REQUEST', message: 'ficheId manquant ou invalide' }, 400)
  }

  // Ownership : client "user" sous RLS. Si 0 ligne → la fiche n'existe pas ou
  // n'appartient pas au caller. On refuse sans rien divulguer.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: owned, error: ownErr } = await userClient
    .from('fiches')
    .select('id')
    .eq('id', ficheId)
    .maybeSingle()
  if (ownErr) {
    console.error('[annonce-localisation] ownership check failed:', ownErr)
    return json({ success: false, error: 'SERVER_CONFIG', message: `Ownership check: ${ownErr.message}` }, 502)
  }
  if (!owned) {
    console.warn(`[annonce-localisation] ownership refused fiche=${ficheId}`)
    return json({ success: false, error: 'FORBIDDEN', message: 'Fiche introuvable ou accès refusé' }, 403)
  }

  // Service role : lecture adresse + upsert faits (bypass RLS). Le client est
  // construit ici puis injecté dans le helper, qui porte toute la logique métier.
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const result = await ensureLocalisationFaits({
    service,
    ficheId,
    force,
    logTag: 'annonce-localisation',
  })

  if (!result.ok) {
    return json({ success: false, error: result.error, message: result.message }, ERROR_STATUS[result.error])
  }

  return json({
    success: true,
    ficheId,
    reused: result.reused,
    recomputed: result.recomputed,
    adresse_key: result.adresseKey,
    computed_at: result.computedAt,
    faits: result.faits,
  })
})
