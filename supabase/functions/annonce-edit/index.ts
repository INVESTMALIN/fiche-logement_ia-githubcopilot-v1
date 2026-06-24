// supabase/functions/annonce-edit/index.ts
//
// PR2 du chantier agent annonce : l'ÉDITION par consigne. Le coordinateur ajuste
// une annonce DÉJÀ générée via une consigne en langage naturel (« supprime la
// mention des verres à vin », « insiste sur la terrasse »). Deux actions :
//   - action='edit'    : applique une consigne. L'édition repart de la PROSE
//                        courante (output_modele_brut), PAS de la fiche → drift
//                        minimal. Un seul appel modèle (localise → applique →
//                        vérifie, en interne). Le contrat de sortie est le MÊME
//                        qu'à la génération → parsing/assemblage réutilisés.
//   - action='restore' : « Revenir à la version d'origine ». Restaure la toute
//                        première prose générée (output_modele_origine). Aucun
//                        appel modèle : on ré-assemble et on persiste.
//
// PROTECTION STRUCTURELLE des blocs légaux/déterministes : le modèle ne reçoit
// QUE les champs de prose (output_modele_brut). Les blocs posés par le code
// (réglementation, caméra, note_etat, note_quartier, échanges, capacité,
// about_host) ne sont pas dans l'entrée et sont réinjectés à l'identique par
// l'assemblage. Aucune consigne ne peut donc les modifier.
//
// PRÉSERVATION (doctrine #50, mutualisée dans _shared/annonce/persist.ts) : si
// l'appel échoue ou sort un format invalide, l'annonce valide existante n'est
// JAMAIS écrasée. On remonte l'erreur, on ne persiste pas une annonce cassée.
//
// Auth : calqué sur annonce-generate. La lecture de la ligne agent_outputs se
// fait sous RLS (client "user") → vaut contrôle d'ownership ET récupération de la
// prose ; les écritures en service role.

// @ts-ignore — Deno runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callOpenRouter, OpenRouterError, redactSecret } from '../_shared/annonce/openrouter.ts'
import {
  type AirbnbAssembled,
  type AirbnbModelOutput,
  assembleAirbnbOutput,
  buildConformite,
  parseModelOutput,
} from '../_shared/annonce/assemble-airbnb.ts'
import {
  assembleBookingOutput,
  type BookingAssembled,
  type BookingModelOutput,
  parseBookingOutput,
  raisonBookingPostInvalide,
} from '../_shared/annonce/assemble-booking.ts'
import { buildEditSystemPrompt, buildEditUserMessage, EDIT_PROMPT_VERSION, type Plateforme } from '../_shared/annonce/prompt-edit.ts'
import { persistAnnonceOutput } from '../_shared/annonce/persist.ts'
import type { CodeZone } from '../_shared/annonce/types.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// deno-lint-ignore no-explicit-any
function json(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  })
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// Aligné sur annonce-generate (même sélecteur de modèle côté panneau coordinateur).
const FALLBACK_MODEL = 'anthropic/claude-sonnet-4.5'
const SUPPORTED_PLATEFORMES = new Set(['airbnb', 'booking'])
const CONSIGNE_MAX = 2000

// Édition : on vise la stabilité plutôt que la créativité (drift minimal).
const EDIT_TEMPERATURE = 0.3

// La localisation n'est PAS recalculée à l'édition (on ancre sur la prose, qui a
// déjà absorbé ou non les faits). On relit le statut figé dans la meta pour piloter
// la tolérance de validation (champ géo vide accepté seulement si loc absente).
// deno-lint-ignore no-explicit-any
function localisationDisponibleFromMeta(meta: any): boolean {
  return meta?.localisation?.statut !== 'absent'
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
  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('[annonce-edit] clés Supabase incomplètes')
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

  const action: string = typeof body?.action === 'string' ? body.action.trim() : 'edit'
  if (action !== 'edit' && action !== 'restore') {
    return json({ success: false, error: 'BAD_REQUEST', message: `Action inconnue: ${action}` }, 400)
  }

  // Consigne requise et bornée pour l'édition uniquement.
  let consigne = ''
  if (action === 'edit') {
    if (typeof body?.consigne !== 'string' || !body.consigne.trim()) {
      return json({ success: false, error: 'BAD_REQUEST', message: 'Consigne manquante ou vide' }, 400)
    }
    consigne = body.consigne.trim()
    if (consigne.length > CONSIGNE_MAX) {
      return json({ success: false, error: 'BAD_REQUEST', message: `Consigne trop longue (max ${CONSIGNE_MAX} caractères)` }, 400)
    }
  }

  const modeleParam = typeof body?.modele === 'string' && body.modele.trim() ? body.modele.trim() : null

  // Lecture de la ligne SOUS RLS (client user) : vaut contrôle d'ownership ET
  // récupération de la prose/contrat. 0 ligne → inexistante ou non accessible.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: row, error: readErr } = await userClient
    .from('agent_outputs')
    .select('statut, output_assemble, output_modele_brut, output_modele_origine, contrat_entree, generation_meta, modele, prompt_version')
    .eq('fiche_id', ficheId)
    .eq('plateforme', plateforme)
    .maybeSingle()
  if (readErr) {
    console.error('[annonce-edit] lecture agent_outputs échouée:', readErr)
    return json({ success: false, error: 'DB_READ_ERROR', message: readErr.message }, 502)
  }
  if (!row) {
    console.warn(`[annonce-edit] aucune annonce accessible fiche=${ficheId} plateforme=${plateforme}`)
    return json({ success: false, error: 'NOT_FOUND', message: 'Aucune annonce à éditer pour cette plateforme (ou accès refusé)' }, 404)
  }

  // L'édition exige une annonce VALIDE et un contrat exploitable. Une ligne en
  // `erreur` (sans sortie) ou un contrat absent (ligne trop ancienne) → on
  // demande une (re)génération plutôt que d'éditer dans le vide.
  if (row.statut === 'erreur' || row.output_assemble == null) {
    return json({ success: false, error: 'NOT_EDITABLE', message: 'Aucune annonce valide à éditer : génère d\'abord une annonce.' }, 409)
  }
  // deno-lint-ignore no-explicit-any
  const contrat: any = row.contrat_entree
  const code: CodeZone | undefined = contrat?.code
  if (!code) {
    return json({ success: false, error: 'NOT_EDITABLE', message: 'Annonce incompatible avec l\'édition (contrat absent) : régénère l\'annonce.' }, 409)
  }

  const isBooking = plateforme === 'booking'
  const localisationDisponible = localisationDisponibleFromMeta(row.generation_meta)
  const localisationMeta = row.generation_meta?.localisation ?? null
  const nowISO = new Date().toISOString()

  // ─────────────────── Obtention de la prose éditée (par action) ───────────────────
  // Les deux actions convergent ensuite vers le MÊME tube parse → assemble →
  // persiste. Seule diffère la façon d'obtenir le contenu modèle et la meta.
  let modelContent: string
  let modelePersiste: string
  let promptVersionPersiste: string
  // deno-lint-ignore no-explicit-any
  let generationMeta: any
  // Point de retour à persister : (re)posé seulement par les chemins concernés.
  let outputModeleOrigine: unknown
  let openrouterKey = ''

  if (action === 'restore') {
    const origine = row.output_modele_origine
    if (origine == null) {
      return json({ success: false, error: 'NO_ORIGINE', message: 'Aucune version d\'origine à restaurer.' }, 409)
    }
    // La prose d'origine repasse par le MÊME parsing/validation que la génération
    // (uniformité). Elle était valide à sa création ; on revalide par sécurité.
    modelContent = JSON.stringify(origine)
    modelePersiste = row.modele || FALLBACK_MODEL
    promptVersionPersiste = row.prompt_version || EDIT_PROMPT_VERSION
    outputModeleOrigine = origine // inchangé
    generationMeta = {
      prompt_version: promptVersionPersiste,
      localisation: localisationMeta,
      conformite: buildConformite(code),
      generated_at: nowISO,
      // Marqueur de provenance : la ligne est revenue à l'origine (pas d'édition active).
      restore: { restored_at: nowISO, base: 'origine' },
    }
  } else {
    // ── action='edit' : un appel modèle, ancré sur la prose courante. ──
    // @ts-ignore — Deno global
    openrouterKey = Deno.env.get('OPENROUTER_API_KEY') || ''
    if (!openrouterKey) {
      console.error('[annonce-edit] secret OPENROUTER_API_KEY manquant')
      return json({ success: false, error: 'SERVER_CONFIG', message: 'Secret OpenRouter absent côté serveur' }, 500)
    }
    // @ts-ignore — Deno global
    const model = modeleParam || Deno.env.get('OPENROUTER_DEFAULT_MODEL') || FALLBACK_MODEL
    const systemPrompt = buildEditSystemPrompt(plateforme as Plateforme, { localisationDisponible })
    const userMessage = buildEditUserMessage(plateforme as Plateforme, row.output_modele_brut, consigne)

    const startedAt = Date.now()
    let mr
    try {
      mr = await callOpenRouter({ apiKey: openrouterKey, model, system: systemPrompt, user: userMessage, temperature: EDIT_TEMPERATURE })
    } catch (e) {
      const safe = redactSecret(e instanceof OpenRouterError ? e.message : msg(e), openrouterKey)
      console.error(`[annonce-edit] appel modèle KO fiche=${ficheId}:`, safe)
      return json({ success: false, error: 'MODEL_CALL_FAILED', message: safe }, 502)
    }
    const latenceMs = Date.now() - startedAt

    modelContent = mr.content
    modelePersiste = model
    promptVersionPersiste = EDIT_PROMPT_VERSION
    // Point de retour : on conserve l'origine EXISTANTE (les consignes s'enchaînent).
    // Première édition d'une ligne sans origine (annonce générée avant cette PR) →
    // on capture la prose PRÉ-édition comme origine, pour garder un point de retour.
    const origineExistante = row.output_modele_origine
    outputModeleOrigine = origineExistante ?? row.output_modele_brut
    generationMeta = {
      modele_demande: model,
      modele_servi: mr.model,
      prompt_version: EDIT_PROMPT_VERSION,
      tokens: { entree: mr.usage.prompt_tokens, sortie: mr.usage.completion_tokens, total: mr.usage.total_tokens },
      cout_usd: mr.usage.cost,
      cout_source: mr.usage.cost != null ? 'openrouter_usage' : null,
      latence_ms: latenceMs,
      openrouter_generation_id: mr.generationId,
      finish_reason: mr.finishReason,
      localisation: localisationMeta,
      conformite: buildConformite(code),
      generated_at: nowISO,
      // Marqueur d'édition : pilote l'affichage du bouton « Revenir à l'origine ».
      edition: { consigne, base: origineExistante ? 'courante' : 'origine-initiale', applied_at: nowISO },
    }
  }

  // ─────────────────── Tube commun : parse → assemble → persiste ───────────────────
  const parsed = isBooking
    ? parseBookingOutput(modelContent, { localisationDisponible })
    : parseModelOutput(modelContent, { localisationDisponible })

  let outputAssemble: AirbnbAssembled | BookingAssembled | null = null
  let postErreur: string | null = null
  if (parsed.ok) {
    if (isBooking) {
      const assemble = assembleBookingOutput(parsed.value as BookingModelOutput, code, { localisationDisponible })
      const raison = raisonBookingPostInvalide(assemble, { localisationDisponible })
      if (raison) postErreur = raison
      else outputAssemble = assemble
    } else {
      outputAssemble = assembleAirbnbOutput(parsed.value as AirbnbModelOutput, code)
    }
  }

  const ok = parsed.ok && !postErreur
  const erreurType = parsed.ok ? 'EDIT_POSTPROCESS_EMPTY' : 'EDIT_OUTPUT_INVALID'
  const statut = ok ? 'genere' : 'erreur'
  const outputModeleBrut = parsed.ok ? parsed.value : parsed.brut
  let messageErreur: string | null = null
  if (!ok) {
    const reason = parsed.ok ? `post-traitement Booking: ${postErreur}` : parsed.reason
    messageErreur = redactSecret(reason, openrouterKey)
    generationMeta.erreur = { type: erreurType, message: messageErreur }
    console.error(`[annonce-edit] sortie invalide fiche=${ficheId} action=${action} (${erreurType}): ${messageErreur}`)
  }

  // Persistance mutualisée (garde anti-écrasement #50). En édition une annonce
  // valide existe TOUJOURS (préalable vérifié) : un échec ne persiste donc rien et
  // l'annonce valide est préservée — exactement la doctrine attendue.
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const persistRes = await persistAnnonceOutput({
    service,
    ficheId,
    plateforme,
    ok,
    statut,
    outputAssemble,
    outputModeleBrut,
    outputModeleOrigine,
    contrat,
    modele: modelePersiste,
    promptVersion: promptVersionPersiste,
    generationMeta,
    nowISO,
  })
  if (!persistRes.ok) {
    console.error(`[annonce-edit] persistance échouée (${persistRes.code}):`, persistRes.error)
    return json({ success: false, error: persistRes.code, message: persistRes.error }, 500)
  }

  if (!ok) {
    if (!persistRes.persiste) {
      console.warn(
        `[annonce-edit] échec fiche=${ficheId} plateforme=${plateforme} action=${action} (${erreurType}) : ` +
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
      modele: modelePersiste,
    }, 502)
  }

  console.log(
    `[annonce-edit] OK fiche=${ficheId} plateforme=${plateforme} action=${action} modele=${modelePersiste}`,
  )

  return json({
    success: true,
    ficheId,
    plateforme,
    modele: modelePersiste,
    statut: 'genere',
    output_assemble: outputAssemble,
    generation_meta: generationMeta,
  })
})
