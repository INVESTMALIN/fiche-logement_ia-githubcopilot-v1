// supabase/functions/annonce-generate/index.ts
//
// Brique 2 du chantier agent annonce : le MOTEUR. Prend une fiche, produit une
// sortie Airbnb OU Booking selon `plateforme`, et la stocke dans `agent_outputs`.
// Premier jet bout-en-bout (flux complet qui tourne et écrit) ; on itère sur le rendu.
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
// Périmètre strict : moteur seul. Pas de Monday, pas de PDF, pas de push prod.
// Airbnb et Booking (routage par paramètre `plateforme`).

// @ts-ignore — Deno runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// Version alignée sur le type SupabaseClient attendu par le helper localisation
// (orchestrator.ts importe le type depuis @2) et sur admin-users.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { mapFicheToContrat } from '../_shared/annonce/mapper.ts'
import { ensureLocalisationFaits } from '../_shared/localisation/orchestrator.ts'
import { buildSystemPromptAirbnb, buildUserMessageAirbnb, PROMPT_VERSION } from '../_shared/annonce/prompt-airbnb.ts'
import { buildSystemPromptBooking, buildUserMessageBooking, PROMPT_VERSION_BOOKING } from '../_shared/annonce/prompt-booking.ts'
import { callOpenRouter, OpenRouterError, redactSecret } from '../_shared/annonce/openrouter.ts'
import { type AirbnbAssembled, type AirbnbModelOutput, assembleAirbnbOutput, buildConformite, parseModelOutput } from '../_shared/annonce/assemble-airbnb.ts'
import { assembleBookingOutput, type BookingAssembled, type BookingModelOutput, parseBookingOutput, raisonBookingPostInvalide } from '../_shared/annonce/assemble-booking.ts'
import { persistAnnonceOutput } from '../_shared/annonce/persist.ts'

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
  // Pilote l'instruction prompt ET la validation : sans localisation, le champ
  // « comment se déplacer » est laissé vide (pas d'invention de distances).
  const localisationDisponible = faits !== null
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
  // Routage par plateforme : seuls le prompt, sa version, le parsing et
  // l'assemblage diffèrent. Tout le reste (mapping, localisation, appel modèle,
  // meta, upsert) est partagé. Le contrat d'entrée est agnostique de plateforme.
  const isBooking = plateforme === 'booking'
  const promptVersion = isBooking ? PROMPT_VERSION_BOOKING : PROMPT_VERSION
  const systemPrompt = isBooking
    ? buildSystemPromptBooking({ localisationDisponible })
    : buildSystemPromptAirbnb({ localisationDisponible })
  const userMessage = isBooking
    ? buildUserMessageBooking(contrat.modele, faits)
    : buildUserMessageAirbnb(contrat.modele, faits)

  const startedAt = Date.now()
  let mr
  try {
    mr = await callOpenRouter({ apiKey: openrouterKey, model, system: systemPrompt, user: userMessage })
  } catch (e) {
    // Filet anti-fuite : OpenRouterError est déjà redacté, on re-scrub par sécurité.
    const safe = redactSecret(e instanceof OpenRouterError ? e.message : msg(e), openrouterKey)
    console.error(`[annonce-generate] appel modèle KO fiche=${ficheId}:`, safe)
    return json({ success: false, error: 'MODEL_CALL_FAILED', message: safe }, 502)
  }
  const latenceMs = Date.now() - startedAt

  // 5) VALIDATION DE FORME de la sortie modèle (contrat fermé propre à la
  //    plateforme : 7 champs Airbnb / 3 champs profil Booking, bons types, non
  //    vides). Une forme invalide n'est PAS une sortie exploitable : c'est une
  //    erreur de génération. On ne marque jamais `genere` sur une forme invalide
  //    — sinon faux succès en champs vides. Sans localisation, le champ
  //    déplacements (Airbnb) / about_neighbourhood (Booking) vide est toléré.
  const parsed = isBooking
    ? parseBookingOutput(mr.content, { localisationDisponible })
    : parseModelOutput(mr.content, { localisationDisponible })

  const nowISO = new Date().toISOString()
  // deno-lint-ignore no-explicit-any
  const generationMeta: any = {
    modele_demande: model,
    modele_servi: mr.model,
    prompt_version: promptVersion,
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
    // Conformité (informatif) : caméra intérieure signalée → jamais dans la
    // sortie, juste tracée. Caméra extérieure → disclosure assemblée par le code
    // (autres_remarques côté Airbnb, champ note_camera côté Booking).
    conformite: buildConformite(contrat.code),
    generated_at: nowISO,
  }

  // Assemblage + (Booking) REVALIDATION post-traitement. sanitizeNom et
  // scrubInterdits peuvent VIDER un champ requis qui avait pourtant passé
  // parseBookingOutput (ex. nom « Airbnb » → scrubé → vide ; about_property = une
  // URL seule → scrubée → vide). On ne persiste jamais un faux succès en champs
  // vides — même principe qu'Airbnb. about_host / réglementation / disclosures
  // ne sont pas concernés (posés par le code, vides légitimes).
  let outputAssemble: AirbnbAssembled | BookingAssembled | null = null
  let postErreur: string | null = null
  if (parsed.ok) {
    if (isBooking) {
      const assemble = assembleBookingOutput(parsed.value as BookingModelOutput, contrat.code, { localisationDisponible })
      const raison = raisonBookingPostInvalide(assemble, { localisationDisponible })
      if (raison) postErreur = raison
      else outputAssemble = assemble
    } else {
      outputAssemble = assembleAirbnbOutput(parsed.value as AirbnbModelOutput, contrat.code)
    }
  }

  // Échec = forme modèle invalide (parse) OU champ requis vidé par le
  // post-traitement Booking. Dans les deux cas : statut `erreur`, réessayable.
  const ok = parsed.ok && !postErreur
  const erreurType = parsed.ok ? 'BOOKING_POSTPROCESS_EMPTY' : 'MODEL_OUTPUT_INVALID'
  const statut = ok ? 'genere' : 'erreur'
  // Sortie brute TOUJOURS conservée pour inspection : forme invalide → brut parsé
  // ou texte non-JSON ; post-traitement vide → sortie modèle (valide en forme).
  const outputModeleBrut = parsed.ok ? parsed.value : parsed.brut
  let messageErreur: string | null = null
  if (!ok) {
    const reason = parsed.ok ? `post-traitement Booking: ${postErreur}` : parsed.reason
    messageErreur = redactSecret(reason, openrouterKey)
    generationMeta.erreur = { type: erreurType, message: messageErreur }
    console.error(`[annonce-generate] sortie invalide fiche=${ficheId} (${erreurType}): ${messageErreur}`)
  }

  // 6) Persistance mutualisée (_shared/annonce/persist.ts) : garde anti-écrasement
  //    #50 (un échec ne remplace JAMAIS une annonce valide existante) + upsert.
  //    Une GÉNÉRATION complète (ré)initialise le point de retour de l'édition :
  //    output_modele_origine = la prose produite (null si la génération a échoué,
  //    aucune origine valide à poser).
  const persistRes = await persistAnnonceOutput({
    service,
    ficheId,
    plateforme,
    ok,
    statut,
    outputAssemble,
    outputModeleBrut,
    outputModeleOrigine: ok ? outputModeleBrut : null,
    contrat,
    modele: model,
    promptVersion,
    generationMeta,
    nowISO,
  })
  if (!persistRes.ok) {
    console.error(`[annonce-generate] persistance échouée (${persistRes.code}):`, persistRes.error)
    return json({ success: false, error: persistRes.code, message: persistRes.error }, 500)
  }

  // Erreur de génération identifiable et réessayable (forme modèle invalide OU
  // champ requis vidé par le post-traitement). Si une annonce valide existait,
  // elle a été PRÉSERVÉE (aucune écriture) ; sinon la trace d'erreur est en base.
  if (!ok) {
    if (!persistRes.persiste) {
      console.warn(
        `[annonce-generate] échec fiche=${ficheId} plateforme=${plateforme} (${erreurType}) : ` +
        'annonce valide existante préservée, aucun écrasement',
      )
    }
    return json({
      success: false,
      error: erreurType,
      message: messageErreur,
      statut: 'erreur',
      ficheId,
      plateforme,
      modele: model,
    }, 502)
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
