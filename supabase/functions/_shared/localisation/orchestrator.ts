// Couche d'ORCHESTRATION de la localisation enrichie : « réutilise le cache, ou
// recalcule, puis upsert ». Extraite de l'Edge Function `annonce-localisation`
// pour être réutilisable SANS saut HTTP par d'autres Edge Functions
// (`annonce-generate`) qui possèdent déjà leur propre contexte service role.
//
// Frontière : ce module ne connaît RIEN de HTTP (ni Request/Response, ni status
// code, ni auth/ownership — tout ça reste le rôle du wrapper). Il reçoit un
// client Supabase service role DÉJÀ construit par l'appelant, lit l'adresse de la
// fiche, décide réutilisation vs recalcul, appelle la fabrique de faits pure
// (`buildFacts`) puis upserte. La fabrique de faits, la table, la RLS, la gestion
// des secrets et l'invalidation par `schema_version` sont inchangées : on
// déplace l'orchestration, on ne la réécrit pas.
//
// Décision de recompute (identique à l'historique) :
//   - pas de ligne, ou adresse changée, ou version de schéma périmée → recalcul
//     Geoapify + upsert ;
//   - adresse + version inchangées (et pas de `force`) → réutilisation, AUCUN
//     appel Geoapify ;
//   - `force: true` → recalcul forcé (test / rafraîchissement manuel).
//
// Les logs tracent REUSE/RECOMPUTE pour que le comportement reste vérifiable en
// live (Supabase logs), préfixés par `logTag` (le wrapper passe
// 'annonce-localisation' pour des logs strictement identiques à l'historique).

// Import de TYPE uniquement (effacé au build) — même source que admin-users, qui
// est le précédent du repo pour typer un client service role injecté.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildLocalisationFacts } from './buildFacts.ts'
import { adresseKey, isGeocodable } from './address.ts'
import { GeocodeError } from './geoapify.ts'
import { scrubApiKey } from './util.ts'
import { FAITS_SCHEMA_VERSION } from './config.ts'
import type { Adresse, Faits } from './types.ts'

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

/**
 * Codes d'erreur métier stables. Contrat machine-readable commun à tous les
 * appelants ; la traduction en status HTTP est un détail du wrapper HTTP.
 */
export type LocalisationFaitsErrorCode =
  | 'DB_READ_ERROR'
  | 'ADDRESS_INSUFFICIENT'
  | 'SERVER_CONFIG'
  | 'GEOCODE_FAILED'
  | 'BUILD_FAILED'
  | 'DB_WRITE_ERROR'

/**
 * Résultat de l'orchestration. Union discriminée sur `ok` : succès (faits +
 * métadonnées reuse/recompute) ou échec métier (code + message déjà redacté).
 * Aucune erreur n'est levée pour ces issues attendues — l'appelant décide quoi
 * en faire (réponse HTTP côté wrapper, ou suite du pipeline côté annonce-generate).
 */
export type LocalisationFaitsResult =
  | {
      ok: true
      reused: boolean
      recomputed: boolean
      adresseKey: string
      computedAt: string
      faits: Faits
    }
  | {
      ok: false
      error: LocalisationFaitsErrorCode
      message: string
    }

export interface EnsureLocalisationFaitsInput {
  /** Client Supabase service role déjà construit par l'appelant (bypass RLS). */
  service: SupabaseClient
  /** Identifiant de la fiche (déjà validé non vide par l'appelant). */
  ficheId: string
  /** Force le recalcul même si l'adresse et la version de schéma sont inchangées. */
  force?: boolean
  /** Préfixe des logs (le wrapper HTTP passe 'annonce-localisation'). */
  logTag?: string
}

/**
 * Obtient les faits de localisation d'une fiche en réutilisant le cache quand
 * c'est légitime, sinon en recalculant via Geoapify puis en upsertant.
 * Importable et appelable directement depuis une autre Edge Function disposant
 * de son propre client service role — aucun saut HTTP, aucun nouveau JWT.
 */
export async function ensureLocalisationFaits(
  input: EnsureLocalisationFaitsInput,
): Promise<LocalisationFaitsResult> {
  const { service, ficheId, force = false, logTag = 'localisation' } = input

  // Service role : lecture adresse de la fiche (bypass RLS).
  const { data: fiche, error: ficheErr } = await service
    .from('fiches')
    .select('proprietaire_adresse_rue, proprietaire_adresse_complement, proprietaire_adresse_ville, proprietaire_adresse_code_postal')
    .eq('id', ficheId)
    .single()
  if (ficheErr || !fiche) {
    console.error(`[${logTag}] lecture fiche échouée:`, ficheErr)
    return { ok: false, error: 'DB_READ_ERROR', message: ficheErr?.message || 'Fiche introuvable' }
  }

  const adresse: Adresse = {
    rue: fiche.proprietaire_adresse_rue || '',
    complement: fiche.proprietaire_adresse_complement || '',
    ville: fiche.proprietaire_adresse_ville || '',
    code_postal: fiche.proprietaire_adresse_code_postal || '',
  }
  const key = adresseKey(adresse)

  // Lecture de la ligne existante (sert à décider réutilisation vs recalcul,
  // sur la clé d'adresse ET la version de schéma).
  const { data: existing, error: exErr } = await service
    .from('fiche_localisation_faits')
    .select('adresse_key, schema_version, faits, computed_at')
    .eq('fiche_id', ficheId)
    .maybeSingle()
  if (exErr) {
    console.error(`[${logTag}] lecture faits existants échouée:`, exErr)
    return { ok: false, error: 'DB_READ_ERROR', message: exErr.message }
  }

  // Réutilisation seulement si l'adresse correspond ET que la version de schéma
  // stockée est la version courante du code. Sinon (contrat des faits modifié)
  // les faits sont périmés → recalcul. `force` court-circuite toujours.
  if (!force && existing && existing.adresse_key === key && existing.schema_version === FAITS_SCHEMA_VERSION) {
    console.log(`[${logTag}] REUSE (adresse + version inchangées) fiche=${ficheId} — aucun appel Geoapify`)
    return {
      ok: true,
      reused: true,
      recomputed: false,
      adresseKey: key,
      computedAt: existing.computed_at,
      faits: existing.faits,
    }
  }

  if (!isGeocodable(adresse)) {
    console.warn(`[${logTag}] adresse insuffisante fiche=${ficheId}`)
    return { ok: false, error: 'ADDRESS_INSUFFICIENT', message: 'Adresse insuffisante pour géocoder (ville requise)' }
  }

  // Clé Geoapify requise UNIQUEMENT ici (recalcul). On la lit et on fail loud
  // juste avant le build → pendant une rotation de secret / un deploy sans clé,
  // les fiches déjà calculées continuent de servir leurs faits (chemin REUSE).
  // @ts-ignore — Deno global
  const geoapifyKey = Deno.env.get('GEOAPIFY_API_KEY')
  if (!geoapifyKey) {
    console.error(`[${logTag}] secret GEOAPIFY_API_KEY manquant (recalcul requis)`)
    return { ok: false, error: 'SERVER_CONFIG', message: 'Secret Geoapify absent côté serveur (recalcul requis)' }
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
    const code: LocalisationFaitsErrorCode = e instanceof GeocodeError ? 'GEOCODE_FAILED' : 'BUILD_FAILED'
    const safe = scrubApiKey(msg(e))
    console.error(`[${logTag}] build KO fiche=${ficheId}:`, safe)
    return { ok: false, error: code, message: safe }
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
    schema_version: FAITS_SCHEMA_VERSION,
    source: 'geoapify',
    computed_at: nowISO,
    updated_at: nowISO,
  }
  const { error: upErr } = await service
    .from('fiche_localisation_faits')
    .upsert(row, { onConflict: 'fiche_id' })
  if (upErr) {
    console.error(`[${logTag}] upsert faits échoué:`, upErr)
    return { ok: false, error: 'DB_WRITE_ERROR', message: upErr.message }
  }

  console.log(
    `[${logTag}] RECOMPUTE (${existing ? 'adresse changée' : 'première fois'}) fiche=${ficheId} ` +
    `routing=${result.faits.meta.routing} degraded=${result.faits.meta.degraded.length}`,
  )
  return {
    ok: true,
    reused: false,
    recomputed: true,
    adresseKey: key,
    computedAt: nowISO,
    faits: result.faits,
  }
}
