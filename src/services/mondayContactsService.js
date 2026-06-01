// src/services/mondayContactsService.js
//
// Push CREATE-only des contacts de maintenance (section_avis.contacts_maintenance)
// vers le board Monday "Artisans / Maintenance" via l'Edge Function
// `monday-contacts-sync`. Logique idempotente par contact :
//   - un contact poussé reçoit un `monday_item_id` (gravé en DB par l'Edge
//     Function, patché localement par le caller via le _localId).
//   - un contact qui a déjà un `monday_item_id` n'est PAS renvoyé à l'Edge
//     Function (filtré ici, côté front).
//
// Le hook qui orchestre tout ça est dans FormContext.triggerMondayContactsSync.

import { supabase } from '../lib/supabaseClient'

/**
 * Renvoie les contacts qui doivent être poussés vers Monday :
 *   - nom_prenom non vide (trimé)
 *   - _localId présent (sinon on ne saura pas patcher le monday_item_id)
 *   - pas encore de monday_item_id
 *
 * @param {Array<Object>} contacts — liste brute depuis formData.section_avis.contacts_maintenance
 * @returns {Array<Object>} contacts éligibles au push (référence directe, pas de copie)
 */
export function pickContactsToPush(contacts) {
  if (!Array.isArray(contacts)) return []
  return contacts.filter(c =>
    c &&
    typeof c === 'object' &&
    typeof c._localId === 'string' && c._localId.length > 0 &&
    typeof c.nom_prenom === 'string' && c.nom_prenom.trim().length > 0 &&
    !c.monday_item_id
  )
}

/**
 * Appelle l'Edge Function monday-contacts-sync. Best-effort : ne throw
 * jamais, retourne toujours un objet { success, results, ... } ou un objet
 * d'erreur réseau homogène pour que le caller puisse facilement décider de
 * l'affichage du toast.
 *
 * @param {Object} args
 * @param {string} args.ficheId
 * @param {Array<Object>} args.contacts — contacts à pousser (cf. pickContactsToPush)
 * @param {boolean} [args.dryRun=false]
 * @returns {Promise<{
 *   success: boolean,
 *   results?: Array<{_localId: string, monday_item_id?: string, error?: string, message?: string}>,
 *   error?: string,
 *   message?: string,
 *   dryRun?: boolean
 * }>}
 */
export async function pushContactsToMonday({ ficheId, contacts, dryRun = false }) {
  try {
    const { data, error } = await supabase.functions.invoke('monday-contacts-sync', {
      body: { ficheId, contacts, dryRun }
    })

    if (error) {
      // FunctionsHttpError, FunctionsRelayError, FunctionsFetchError
      return {
        success: false,
        error: 'NETWORK',
        message: error.message || 'Erreur réseau lors de l\'appel monday-contacts-sync'
      }
    }
    return data
  } catch (err) {
    return {
      success: false,
      error: 'NETWORK',
      message: err?.message || 'Erreur inattendue lors de l\'appel monday-contacts-sync'
    }
  }
}
