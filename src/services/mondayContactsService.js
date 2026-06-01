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
// Le hook qui orchestre tout ça est dans FormContext (déclenchement
// automatique à la transition Brouillon → Complété, ou déclenchement manuel
// via le bouton "Synchroniser" dans FicheAvis post-finalisation).

import { supabase } from '../lib/supabaseClient'
import { normalizePhoneE164 } from '../lib/phoneHelpers'

/**
 * Renvoie les contacts qui doivent être poussés vers Monday.
 *
 * Critères de "validité métier" — identiques à la règle de validation à la
 * finalisation (cf. validationConfig.SPECIAL_VALIDATIONS.validateContactsMaintenance) :
 *   - `nom_prenom` non vide (trimé)
 *   - `telephone` non vide (trimé)
 *   - `activite` non vide (trimé)
 *
 * Critères techniques :
 *   - `_localId` présent (sinon on ne saura pas patcher le monday_item_id)
 *   - pas encore de `monday_item_id` (idempotence : si déjà poussé, skip)
 *
 * Cohérence amont (blocage finalisation) + aval (filtre push) : aucun cas
 * où un contact bloque la finalisation mais ne serait pas pushé, ni
 * inversement.
 *
 * @param {Array<Object>} contacts — liste brute depuis formData.section_avis.contacts_maintenance
 * @returns {Array<Object>} contacts éligibles au push (référence directe, pas de copie)
 */
export function pickContactsToPush(contacts) {
  if (!Array.isArray(contacts)) return []
  return contacts.filter(c => {
    if (!c || typeof c !== 'object') return false
    if (typeof c._localId !== 'string' || c._localId.length === 0) return false
    if (c.monday_item_id) return false
    if (typeof c.nom_prenom !== 'string' || c.nom_prenom.trim().length === 0) return false
    if (typeof c.telephone !== 'string' || c.telephone.trim().length === 0) return false
    if (typeof c.activite !== 'string' || c.activite.trim().length === 0) return false
    return true
  })
}

/**
 * Appelle l'Edge Function monday-contacts-sync. Best-effort : ne throw
 * jamais, retourne toujours un objet { success, results, ... } ou un objet
 * d'erreur réseau homogène pour que le caller puisse facilement décider de
 * l'affichage du toast.
 *
 * Normalisation : le `telephone` de chaque contact est normalisé en E.164
 * juste avant l'invoke (transformation au boundary, pas de mutation du
 * state). Sans ça, le parser de la colonne `phone` Monday devine le pays à
 * partir d'un numéro brut et le résultat est inconsistant (drapeaux Vietnam
 * vs France pour deux numéros français quasi identiques observé en prod).
 * Avec un E.164 strict, Monday lit le pays directement dans le préfixe.
 *
 * Si la normalisation retourne `''` pour un téléphone (saisie tronquée ou
 * format non reconnu), on l'envoie quand même sous forme vide : le filtre
 * `pickContactsToPush` aurait déjà dû arrêter ce contact en amont, mais on
 * ne fait pas confiance aveuglément à l'appelant. L'Edge Function omet la
 * colonne `phone` côté Monday si la valeur est vide, l'item est créé sans
 * téléphone (l'équipe peut compléter à la main).
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
  const normalizedContacts = Array.isArray(contacts)
    ? contacts.map(c => {
        if (!c || typeof c !== 'object') return c
        return { ...c, telephone: normalizePhoneE164(c.telephone) }
      })
    : []

  try {
    const { data, error } = await supabase.functions.invoke('monday-contacts-sync', {
      body: { ficheId, contacts: normalizedContacts, dryRun }
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
