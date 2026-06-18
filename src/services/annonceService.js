// src/services/annonceService.js
// Front → Edge Function `annonce-generate`. Le JWT de la session est attaché
// automatiquement par supabase-js : l'auth + le check d'ownership RLS-aware
// côté fonction s'appuient dessus (on ne génère que sur une fiche visible par
// l'utilisateur connecté).

import { supabase } from '../lib/supabaseClient'

/** Modèles proposés à la comparaison (identifiants OpenRouter valides). */
export const MODELES_ANNONCE = [
  { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
  { id: 'openai/gpt-5.1', label: 'GPT-5.1' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
]

export const MODELE_PAR_DEFAUT = 'anthropic/claude-sonnet-4.6'

/**
 * Recherche les fiches par numéro de bien (logement_numero_bien). Sous RLS :
 * ne remonte que les fiches visibles par l'utilisateur connecté. Renvoie une
 * liste (un même numéro peut théoriquement matcher plusieurs fiches).
 */
export async function rechercherFichesParNumero(numero) {
  const valeur = (numero || '').trim()
  if (!valeur) return { ok: true, fiches: [] }
  const { data, error } = await supabase
    .from('fiches')
    .select('id, nom, logement_numero_bien, proprietaire_adresse_ville, statut, updated_at')
    .eq('logement_numero_bien', valeur)
    .order('updated_at', { ascending: false })
  if (error) {
    return { ok: false, message: error.message || 'Erreur lors de la recherche de la fiche.' }
  }
  return { ok: true, fiches: data || [] }
}

/**
 * Lance la génération d'annonce. Normalise la réponse : un échec HTTP non-2xx
 * (ex. MODEL_OUTPUT_INVALID, statut `erreur`) arrive dans error.context, on en
 * extrait le JSON { success:false, error, message }.
 */
export async function generateAnnonce({ ficheId, plateforme, modele }) {
  const { data, error } = await supabase.functions.invoke('annonce-generate', {
    body: { ficheId, plateforme, modele },
  })

  if (error) {
    let payload = null
    try {
      payload = await error.context.json()
    } catch {
      payload = null
    }
    return {
      ok: false,
      error: payload?.error || 'EDGE_ERROR',
      message: payload?.message || error.message || 'Erreur lors de la génération.',
    }
  }

  if (!data || data.success !== true) {
    return {
      ok: false,
      error: data?.error || 'UNKNOWN',
      message: data?.message || 'Réponse inattendue de la génération.',
    }
  }

  return { ok: true, ...data }
}
