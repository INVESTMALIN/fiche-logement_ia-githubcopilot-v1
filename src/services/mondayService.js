// src/services/mondayService.js
//
// Sync 4 champs Fiche Logement → Monday (board 1272144935) en best-effort,
// via l'Edge Function `monday-sync` (token admin Monday gardé côté serveur).
//
// Flow :
//   1. extractMondaySnapshot(formData) — extrait l'état actuel des 4 champs
//   2. getMondayChangedFields(current, saved) — diff vs snapshot précédent
//   3. pushToMonday(...) — appelle l'Edge Function ; ne throw jamais
//
// Le hook qui orchestre tout ça est dans FormContext.handleSave (post-save).

import { supabase } from '../lib/supabaseClient'

/**
 * Snapshot opérationnel : exactement les 4 champs qui seront envoyés à Monday.
 */
export function extractMondaySnapshot(formData) {
  return {
    type_premier_menage: formData?.section_avis?.type_premier_menage ?? null,
    type_premiere_maintenance: formData?.section_avis?.type_premiere_maintenance ?? null,
    airbnb_mot_passe: formData?.section_airbnb?.mot_passe ?? null,
    booking_mot_passe: formData?.section_booking?.mot_passe ?? null
  }
}

/**
 * Diff entre snapshot courant et snapshot sauvegardé en DB.
 * @returns {string[] | null} liste des keys ayant changé, ou null si pas de
 *   snapshot précédent (= push complet à faire, cas finalisation initiale).
 */
export function getMondayChangedFields(current, saved) {
  if (!saved || typeof saved !== 'object') return null
  return Object.keys(current).filter(k => current[k] !== saved[k])
}

/**
 * Appelle l'Edge Function monday-sync. Best-effort : ne throw jamais,
 * retourne toujours un objet `{ success, ... }`.
 *
 * @param {Object} args
 * @param {string} args.ficheId
 * @param {number|string} args.numeroBien
 * @param {Object} args.snapshot — { type_premier_menage, type_premiere_maintenance, airbnb_mot_passe, booking_mot_passe }
 * @param {string[]|null} args.changedFields — null = push complet
 * @param {boolean} [args.dryRun=false]
 */
export async function pushToMonday({ ficheId, numeroBien, snapshot, changedFields, dryRun = false }) {
  try {
    const { data, error } = await supabase.functions.invoke('monday-sync', {
      body: {
        ficheId,
        numeroBien,
        fields: snapshot,
        changedFields: changedFields ?? undefined,
        dryRun
      }
    })

    if (error) {
      // FunctionsHttpError, FunctionsRelayError, FunctionsFetchError
      return {
        success: false,
        error: 'NETWORK',
        message: error.message || 'Erreur réseau lors de l\'appel monday-sync'
      }
    }
    // L'Edge Function retourne déjà un objet { success, ... }
    return data
  } catch (err) {
    return {
      success: false,
      error: 'NETWORK',
      message: err?.message || 'Erreur inattendue lors de l\'appel monday-sync'
    }
  }
}
