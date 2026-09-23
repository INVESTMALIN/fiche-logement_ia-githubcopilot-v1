// src/lib/syncContacts.js
//
// Enchaînement de la synchronisation manuelle des contacts maintenance vers
// Monday : sauvegarder, puis pousser. L'Edge Function retrouve les contacts
// en base par leur `_localId`, donc pousser un état qui n'est pas encore
// entièrement enregistré omet des contacts en silence — et les sauvegardes
// automatiques suivantes ne resynchronisent volontairement pas les contacts.
//
// D'où la règle tenue ici : ON NE POUSSE QUE SI TOUT EST ENREGISTRÉ. Sinon on
// renonce avec un message, plutôt que d'annoncer un succès partiel.
//
// Isolé du FormContext, sans import, pour être vérifiable hors navigateur :
// la synchronisation manuelle exige une fiche finalisée, et la fiche de démo
// ne doit jamais l'être.

export const MESSAGE_SAVE_FAILED =
  'La sauvegarde a échoué : aucun contact n\'a été synchronisé.'

export const MESSAGE_SAVE_INCOMPLETE =
  'Des modifications sont encore en cours d\'enregistrement : aucun contact n\'a été synchronisé. ' +
  'Patientez quelques secondes puis relancez la synchronisation.'

/**
 * @param {object} p
 * @param {(etat?: object) => Promise<{success, data, modificationsEnAttente, error}>} p.sauvegarder
 *        Appelé SANS argument la première fois ; au second essai, avec l'état
 *        à imposer.
 * @param {() => object} p.lireEtatCourant
 *        Lu au dernier moment, juste avant le second essai : c'est la seule
 *        lecture à jour. La fermeture de l'appelant, elle, porte encore le
 *        formulaire d'avant les dernières saisies, et la réécrirait par-dessus
 *        ce qui vient d'être enregistré.
 * @param {(data: object) => Promise<object>} p.pousser
 * @param {(error: string, message: string) => object} p.signalerEchec
 *        Pose le message visible et rend le résultat d'échec.
 */
export async function orchestrerSyncContacts({ sauvegarder, lireEtatCourant, pousser, signalerEchec }) {
  let save = await sauvegarder()
  if (!save?.success) {
    return signalerEchec('SAVE_FAILED', save?.error || MESSAGE_SAVE_FAILED)
  }

  if (save.modificationsEnAttente) {
    // UN seul second essai, avec l'état courant. Jamais un `sauvegarder()` nu.
    save = await sauvegarder(lireEtatCourant())
    if (!save?.success) {
      return signalerEchec('SAVE_FAILED', save?.error || MESSAGE_SAVE_FAILED)
    }
    if (save.modificationsEnAttente) {
      return signalerEchec('SAVE_INCOMPLETE', MESSAGE_SAVE_INCOMPLETE)
    }
  }

  return await pousser(save.data)
}

/**
 * Libellé du toast d'échec de synchronisation.
 *
 * Un `message` explicite l'emporte sur le décompte : il décrit un échec
 * survenu AVANT le push (sauvegarde ratée ou incomplète), où aucun contact
 * n'a été tenté — afficher « X/Y contacts » y serait faux.
 */
export function libelleToastContacts(toast) {
  if (toast?.message) {
    return { titre: 'Synchronisation impossible', texte: toast.message, avecRelance: false }
  }
  const { failedCount = 0, total = 0 } = toast || {}
  const pluriel = failedCount > 1
  const texte = failedCount === total
    ? `${failedCount} contact${pluriel ? 's' : ''} n'${pluriel ? 'ont' : 'a'} pas pu être remonté${pluriel ? 's' : ''} vers Monday.`
    : `${failedCount}/${total} contacts n'ont pas pu être remontés vers Monday.`
  return { titre: 'Sync Monday partielle', texte, avecRelance: true }
}
