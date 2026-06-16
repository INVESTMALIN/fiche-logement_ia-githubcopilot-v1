// supabase/functions/annonce-localisation/index.ts
//
// Brique 1 du chantier agent annonce : construit (ou réutilise) la fiche de
// FAITS de localisation enrichie d'un logement et la stocke dans la table
// dédiée `fiche_localisation_faits` (1 ligne / fiche).
//
// Données seules : aucun appel modèle, aucune génération d'annonce. La fiche de
// faits sera consommée plus tard par l'Edge Function `annonce-generate` (qui
// importera directement le module _shared/localisation, sans saut HTTP).
//
// Recompute :
//   - pas de ligne, ou adresse changée depuis le dernier calcul → recalcul
//     Geoapify + upsert.
//   - adresse identique → réutilisation, AUCUN appel Geoapify.
//   - `force: true` → recalcul forcé (test / rafraîchissement manuel).
// La réponse expose `reused` / `recomputed` et les logs tracent REUSE/RECOMPUTE
// pour que le comportement soit vérifiable en live (Supabase logs).
//
// Auth : même pattern que monday-contacts-sync. verify_jwt = true (signature
// vérifiée par le runtime) + check d'ownership RLS via le JWT appelant sur
// `fiches`. Les écritures passent en service role (bypass RLS).

// @ts-ignore — Deno runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-ignore — résolution Deno-only
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { buildLocalisationFacts } from '../_shared/localisation/buildFacts.ts'
import { adresseKey, isGeocodable } from '../_shared/localisation/address.ts'
import { GeocodeError } from '../_shared/localisation/geoapify.ts'
import { scrubApiKey } from '../_shared/localisation/util.ts'
import type { Adresse } from '../_shared/localisation/types.ts'

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

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ success: false, error: 'BAD_REQUEST', message: 'Method not allowed' }, 405)

  // @ts-ignore — Deno global
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // @ts-ignore — Deno global
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  // @ts-ignore — Deno global
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  // @ts-ignore — Deno global
  const geoapifyKey = Deno.env.get('GEOAPIFY_API_KEY')

  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('[annonce-localisation] clés Supabase incomplètes')
    return json({ success: false, error: 'SERVER_CONFIG', message: 'Config serveur Supabase incomplète' }, 500)
  }
  if (!geoapifyKey) {
    console.error('[annonce-localisation] secret GEOAPIFY_API_KEY manquant')
    return json({ success: false, error: 'SERVER_CONFIG', message: 'Secret Geoapify absent côté serveur' }, 500)
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

  // Service role : lecture adresse + upsert faits (bypass RLS).
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: fiche, error: ficheErr } = await service
    .from('fiches')
    .select('proprietaire_adresse_rue, proprietaire_adresse_complement, proprietaire_adresse_ville, proprietaire_adresse_code_postal')
    .eq('id', ficheId)
    .single()
  if (ficheErr || !fiche) {
    console.error('[annonce-localisation] lecture fiche échouée:', ficheErr)
    return json({ success: false, error: 'DB_READ_ERROR', message: ficheErr?.message || 'Fiche introuvable' }, 500)
  }

  const adresse: Adresse = {
    rue: fiche.proprietaire_adresse_rue || '',
    complement: fiche.proprietaire_adresse_complement || '',
    ville: fiche.proprietaire_adresse_ville || '',
    code_postal: fiche.proprietaire_adresse_code_postal || '',
  }
  const key = adresseKey(adresse)

  // Réutilisation si une ligne existe avec la même clé d'adresse (sauf force).
  const { data: existing, error: exErr } = await service
    .from('fiche_localisation_faits')
    .select('adresse_key, faits, computed_at')
    .eq('fiche_id', ficheId)
    .maybeSingle()
  if (exErr) {
    console.error('[annonce-localisation] lecture faits existants échouée:', exErr)
    return json({ success: false, error: 'DB_READ_ERROR', message: exErr.message }, 500)
  }

  if (!force && existing && existing.adresse_key === key) {
    console.log(`[annonce-localisation] REUSE (adresse inchangée) fiche=${ficheId} — aucun appel Geoapify`)
    return json({
      success: true,
      ficheId,
      reused: true,
      recomputed: false,
      adresse_key: key,
      computed_at: existing.computed_at,
      faits: existing.faits,
    })
  }

  if (!isGeocodable(adresse)) {
    console.warn(`[annonce-localisation] adresse insuffisante fiche=${ficheId}`)
    return json({ success: false, error: 'ADDRESS_INSUFFICIENT', message: 'Adresse insuffisante pour géocoder (ville requise)' }, 422)
  }

  // Recalcul Geoapify.
  const nowISO = new Date().toISOString()
  let result
  try {
    result = await buildLocalisationFacts(adresse, geoapifyKey, nowISO)
  } catch (e) {
    // Filet anti-fuite : le build est le seul chemin qui porte des erreurs
    // Geoapify (URL avec apiKey). Déjà redacté à la source, scrub en plus ici
    // avant log ET réponse.
    const code = e instanceof GeocodeError ? 'GEOCODE_FAILED' : 'BUILD_FAILED'
    const safe = scrubApiKey(msg(e))
    console.error(`[annonce-localisation] build KO fiche=${ficheId}:`, safe)
    return json({ success: false, error: code, message: safe }, 502)
  }

  const row = {
    fiche_id: ficheId,
    adresse_used: { rue: adresse.rue, complement: adresse.complement, ville: adresse.ville, code_postal: adresse.code_postal },
    adresse_key: key,
    lat: result.geocode.lat,
    lon: result.geocode.lon,
    geocode_confidence: result.geocode.confidence,
    geocode_result_type: result.geocode.result_type,
    faits: result.faits,
    source: 'geoapify',
    computed_at: nowISO,
    updated_at: nowISO,
  }
  const { error: upErr } = await service
    .from('fiche_localisation_faits')
    .upsert(row, { onConflict: 'fiche_id' })
  if (upErr) {
    console.error('[annonce-localisation] upsert faits échoué:', upErr)
    return json({ success: false, error: 'DB_WRITE_ERROR', message: upErr.message }, 500)
  }

  console.log(
    `[annonce-localisation] RECOMPUTE (${existing ? 'adresse changée' : 'première fois'}) fiche=${ficheId} ` +
    `routing=${result.faits.meta.routing} degraded=${result.faits.meta.degraded.length}`,
  )
  return json({
    success: true,
    ficheId,
    reused: false,
    recomputed: true,
    adresse_key: key,
    computed_at: nowISO,
    faits: result.faits,
  })
})
