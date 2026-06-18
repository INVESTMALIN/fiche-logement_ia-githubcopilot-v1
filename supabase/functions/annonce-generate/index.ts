// supabase/functions/annonce-generate/index.ts
//
// Brique 2 du chantier agent annonce : le MOTEUR. Prend une fiche, produit une
// annonce Airbnb complète, et la stocke dans `agent_outputs`. Premier jet
// bout-en-bout (flux complet qui tourne et écrit) ; on itérera sur le rendu.
//
// Flux :
//   1. mappe la fiche brute → contrat d'entrée propre (_shared/annonce/mapper).
//   2. enrichit la localisation via ensureLocalisationFaits importé EN DIRECT
//      (pas d'appel HTTP entre Edge Functions).
//   3. construit le prompt (prompt v1 + référentiel + données du bien + bloc loc).
//   4. appelle le modèle via OpenRouter (modèle en paramètre, défaut configurable).
//   5. assemble la sortie : 7 champs de prose du modèle + 5 blocs assemblés par le
//      code (nombre_voyageurs, échanges, réglementation, note_etat, note_quartier).
//   6. upsert dans agent_outputs.
//
// Le modèle ne voit QUE la zone `modele` du contrat + un bloc localisation sans
// rue ; tout ce qui est déterministe / légal / sensible est posé par le code.
//
// Auth : calqué sur annonce-localisation. verify_jwt = true + check d'ownership
// RLS-aware via le JWT appelant sur `fiches`. Écritures en service role.
//
// Périmètre strict : moteur seul. Pas de Monday, pas d'UI, pas de PDF. Airbnb
// uniquement (la plateforme reste un paramètre dès le départ).

// @ts-ignore — Deno runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// Version alignée sur le type SupabaseClient attendu par le helper localisation
// (orchestrator.ts importe le type depuis @2) et sur admin-users.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { mapFicheToContrat } from '../_shared/annonce/mapper.ts'
import { ensureLocalisationFaits } from '../_shared/localisation/orchestrator.ts'
import { buildUserMessageAirbnb, PROMPT_VERSION, SYSTEM_PROMPT_AIRBNB } from '../_shared/annonce/prompt-airbnb.ts'
import { callOpenRouter, OpenRouterError, redactSecret } from '../_shared/annonce/openrouter.ts'
import { assembleAirbnbOutput, parseModelOutput } from '../_shared/annonce/assemble-airbnb.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// charset=utf-8 indispensable : sans lui, mojibake côté client (accents).
// deno-lint-ignore no-explicit-any
function json(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  })
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// Modèle par défaut configurable (un mini-UI de test passera un modèle en
// paramètre). Surchargé par le secret OPENROUTER_DEFAULT_MODEL si présent.
const FALLBACK_MODEL = 'anthropic/claude-sonnet-4.5'

const SUPPORTED_PLATEFORMES = new Set(['airbnb', 'booking'])

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ success: false, error: 'BAD_REQUEST', message: 'Method not allowed' }, 405)

  // @ts-ignore — Deno global
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // @ts-ignore — Deno global
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  // @ts-ignore — Deno global
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('[annonce-generate] clés Supabase incomplètes')
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
  if (!ficheId || typeof ficheId !== 'string') {
    return json({ success: false, error: 'BAD_REQUEST', message: 'ficheId manquant ou invalide' }, 400)
  }

  const plateforme: string = typeof body?.plateforme === 'string' && body.plateforme.trim()
    ? body.plateforme.trim()
    : 'airbnb'
  if (!SUPPORTED_PLATEFORMES.has(plateforme)) {
    return json({ success: false, error: 'BAD_REQUEST', message: `Plateforme inconnue: ${plateforme}` }, 400)
  }
  if (plateforme !== 'airbnb') {
    return json({ success: false, error: 'NOT_IMPLEMENTED', message: `Plateforme ${plateforme} pas encore supportée (Airbnb uniquement en v1)` }, 501)
  }

  const modeleParam = typeof body?.modele === 'string' && body.modele.trim() ? body.modele.trim() : null

  // Ownership : client "user" sous RLS. 0 ligne → fiche inexistante ou non
  // accessible au caller. On refuse sans rien divulguer.
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
    console.error('[annonce-generate] ownership check failed:', ownErr)
    return json({ success: false, error: 'SERVER_CONFIG', message: `Ownership check: ${ownErr.message}` }, 502)
  }
  if (!owned) {
    console.warn(`[annonce-generate] ownership refused fiche=${ficheId}`)
    return json({ success: false, error: 'FORBIDDEN', message: 'Fiche introuvable ou accès refusé' }, 403)
  }

  // Service role : lecture fiche brute + upsert sortie (bypass RLS).
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: fiche, error: ficheErr } = await service
    .from('fiches')
    .select('*')
    .eq('id', ficheId)
    .single()
  if (ficheErr || !fiche) {
    console.error('[annonce-generate] lecture fiche échouée:', ficheErr)
    return json({ success: false, error: 'DB_READ_ERROR', message: ficheErr?.message || 'Fiche introuvable' }, 500)
  }

  // 1) Mapping fiche → contrat d'entrée propre (transformation pure).
  const contrat = mapFicheToContrat(fiche)

  // 2) Localisation enrichie via le helper partagé, EN DIRECT (pas de saut HTTP).
  //    Dégradation gracieuse : si indisponible, on génère quand même sans le bloc
  //    localisation (le modèle reste sur la ville, sans inventer) et on le trace.
  const loc = await ensureLocalisationFaits({ service, ficheId, logTag: 'annonce-generate' })
  const faits = loc.ok ? loc.faits : null
  // deno-lint-ignore no-explicit-any
  const localisationMeta: any = loc.ok
    ? { statut: loc.reused ? 'reuse' : 'recompute', degraded: loc.faits.meta.degraded }
    : { statut: 'absent', error: loc.error, message: loc.message }
  if (!loc.ok) {
    console.warn(`[annonce-generate] localisation indisponible fiche=${ficheId}: ${loc.error}`)
  }

  // 3+4) Prompt + appel modèle via OpenRouter.
  // @ts-ignore — Deno global
  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!openrouterKey) {
    console.error('[annonce-generate] secret OPENROUTER_API_KEY manquant')
    return json({ success: false, error: 'SERVER_CONFIG', message: 'Secret OpenRouter absent côté serveur' }, 500)
  }
  // @ts-ignore — Deno global
  const model = modeleParam || Deno.env.get('OPENROUTER_DEFAULT_MODEL') || FALLBACK_MODEL
  const userMessage = buildUserMessageAirbnb(contrat.modele, faits)

  const startedAt = Date.now()
  let mr
  try {
    mr = await callOpenRouter({ apiKey: openrouterKey, model, system: SYSTEM_PROMPT_AIRBNB, user: userMessage })
  } catch (e) {
    // Filet anti-fuite : OpenRouterError est déjà redacté, on re-scrub par sécurité.
    const safe = redactSecret(e instanceof OpenRouterError ? e.message : msg(e), openrouterKey)
    console.error(`[annonce-generate] appel modèle KO fiche=${ficheId}:`, safe)
    return json({ success: false, error: 'MODEL_CALL_FAILED', message: safe }, 502)
  }
  const latenceMs = Date.now() - startedAt

  // 5) Parse + assemblage (prose du modèle + blocs code).
  let modelOut
  try {
    modelOut = parseModelOutput(mr.content)
  } catch (e) {
    const safe = redactSecret(msg(e), openrouterKey)
    console.error(`[annonce-generate] sortie modèle invalide fiche=${ficheId}:`, safe)
    return json({ success: false, error: 'MODEL_OUTPUT_INVALID', message: safe }, 502)
  }
  const outputAssemble = assembleAirbnbOutput(modelOut, contrat.code)

  const nowISO = new Date().toISOString()
  const generationMeta = {
    modele_demande: model,
    modele_servi: mr.model,
    prompt_version: PROMPT_VERSION,
    tokens: {
      entree: mr.usage.prompt_tokens,
      sortie: mr.usage.completion_tokens,
      total: mr.usage.total_tokens,
    },
    cout_usd: mr.usage.cost,
    cout_source: mr.usage.cost != null ? 'openrouter_usage' : null,
    latence_ms: latenceMs,
    openrouter_generation_id: mr.generationId,
    finish_reason: mr.finishReason,
    localisation: localisationMeta,
    generated_at: nowISO,
  }

  // 6) Upsert dans agent_outputs (1 ligne par (fiche, plateforme), on écrase).
  const row = {
    fiche_id: ficheId,
    plateforme,
    output_assemble: outputAssemble,
    output_modele_brut: modelOut,
    contrat_entree: contrat,
    modele: model,
    prompt_version: PROMPT_VERSION,
    generation_meta: generationMeta,
    statut: 'genere',
    // Sur régénération (upsert UPDATE), les DEFAULT now() ne se rejouent pas →
    // on rafraîchit explicitement (pas d'historique en v1, on écrase).
    generated_at: nowISO,
    updated_at: nowISO,
  }
  const { error: upErr } = await service
    .from('agent_outputs')
    .upsert(row, { onConflict: 'fiche_id,plateforme' })
  if (upErr) {
    console.error('[annonce-generate] upsert agent_outputs échoué:', upErr)
    return json({ success: false, error: 'DB_WRITE_ERROR', message: upErr.message }, 500)
  }

  console.log(
    `[annonce-generate] OK fiche=${ficheId} plateforme=${plateforme} modele=${model} ` +
    `tokens=${mr.usage.total_tokens ?? '?'} cout=${mr.usage.cost ?? '?'} latence=${latenceMs}ms ` +
    `localisation=${localisationMeta.statut}`,
  )

  return json({
    success: true,
    ficheId,
    plateforme,
    modele: model,
    statut: 'genere',
    output_assemble: outputAssemble,
    generation_meta: generationMeta,
  })
})
