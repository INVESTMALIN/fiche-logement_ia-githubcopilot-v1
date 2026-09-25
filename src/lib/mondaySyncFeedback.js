// src/lib/mondaySyncFeedback.js
//
// Traduit la réponse de l'Edge Function `monday-sync` en message pour
// l'utilisateur. Module PUR, sans import : chargeable tel quel par les tests
// Node (scripts/tests/_chargerModule.mjs).
//
// Règle absolue : on nomme des CHAMPS, jamais des valeurs. Quatre des sept
// champs sont des mots de passe ou des emails de propriétaires.

export const MONDAY_FIELD_LABELS = Object.freeze({
  type_premier_menage: 'Premiers Ménages',
  type_premiere_maintenance: 'Maintenance',
  airbnb_mot_passe: 'Mot de passe Airbnb',
  booking_mot_passe: 'Mot de passe Booking',
  airbnb_email: 'Identifiant Airbnb',
  booking_email: 'Identifiant Booking',
  bac_secours: 'BAC secours'
})

// Champs dont la valeur n'est pas un secret : leur valeur peut entrer dans la
// clé de déduplication (jamais dans un message affiché pour autant).
const CHAMPS_NON_SENSIBLES = new Set(['type_premier_menage', 'type_premiere_maintenance', 'bac_secours'])

const libelle = (field) => MONDAY_FIELD_LABELS[field] || field

const raisonLisible = (reason) => {
  switch (reason) {
    case 'VALEUR_NON_RECONNUE':
      return 'valeur non reconnue par Monday, re-sélectionnez-la dans la liste'
    case 'ITEM_NOT_FOUND':
      return 'aucune ligne Monday pour ce numéro de bien'
    case 'MONDAY_API_ERROR':
      return 'Monday injoignable'
    case 'MONDAY_REFUSE':
      return 'refusé par Monday'
    default:
      return 'erreur'
  }
}

const joindre = (labels) => {
  if (labels.length <= 1) return labels.join('')
  return labels.slice(0, -1).join(', ') + ' et ' + labels[labels.length - 1]
}

/**
 * Construit le feedback à afficher après un sync.
 *
 * @param {Object|null} reponse — corps rendu par l'Edge Function (ou l'objet
 *   `{ success:false, error:'NETWORK', message }` de pushToMonday)
 * @param {Object} [valeurs] — les 4 valeurs envoyées, pour la clé de
 *   déduplication des champs non sensibles (jamais affichées)
 * @returns {null | {
 *   type: 'succes' | 'partiel' | 'echec',
 *   titre: string,
 *   message: string,
 *   champsOk: string[],
 *   champsEnEchec: Array<{ field: string, label: string, reason: string }>,
 *   cle: string
 * }}
 *   null = rien à afficher (rien n'a été poussé).
 */
export function construireFeedbackMonday(reponse, valeurs = {}) {
  if (!reponse || typeof reponse !== 'object') {
    return {
      type: 'echec',
      titre: 'Sync Monday impossible',
      message: 'Réponse illisible du service de synchronisation. Réessai au prochain enregistrement.',
      champsOk: [],
      champsEnEchec: [],
      cle: 'echec|illisible'
    }
  }

  // Échec global sans détail par champ : réseau, fiche introuvable, numéro
  // périmé, ancien contrat de l'Edge Function…
  if (!Array.isArray(reponse.results)) {
    if (reponse.success === true) {
      // Ancien contrat (Edge Function pas encore redéployée) : succès global
      return {
        type: 'succes',
        titre: 'Monday mis à jour',
        message: 'Les champs modifiés ont été envoyés à Monday.',
        champsOk: [],
        champsEnEchec: [],
        cle: 'succes|global'
      }
    }
    const code = typeof reponse.error === 'string' ? reponse.error : 'INCONNU'
    const message = code === 'NUMERO_BIEN_CHANGE'
      ? 'Le numéro de bien de cette fiche a changé : rechargez la page, rien n\'a été envoyé à Monday.'
      : code === 'FICHE_INTROUVABLE'
        ? 'Fiche introuvable ou non autorisée pour votre compte : rien n\'a été envoyé à Monday.'
        : 'Monday n\'a pas pu être mis à jour. Réessai automatique au prochain enregistrement.'
    return {
      type: 'echec',
      titre: 'Sync Monday impossible',
      message,
      champsOk: [],
      champsEnEchec: [],
      cle: `echec|${code}`
    }
  }

  const ok = reponse.results.filter((r) => r && r.status === 'ok')
  const ko = reponse.results.filter((r) => r && r.status !== 'ok')

  if (ok.length === 0 && ko.length === 0) return null

  const champsOk = ok.map((r) => libelle(r.field))
  const champsEnEchec = ko.map((r) => ({
    field: r.field,
    label: libelle(r.field),
    reason: r.reason || 'ERREUR'
  }))

  // Clé de déduplication : même contenu → même clé. Pour les champs non
  // sensibles ignorés (valeur legacy), la valeur fautive entre dans la clé :
  // l'avertissement revient dès qu'elle change, pas avant.
  const cle = [
    ko.length === 0 ? 'succes' : ok.length > 0 ? 'partiel' : 'echec',
    'ok:' + ok.map((r) => r.field).sort().join(','),
    'ko:' + ko.map((r) => {
      const valeur = CHAMPS_NON_SENSIBLES.has(r.field) && r.status === 'skipped' ? `=${valeurs[r.field] ?? ''}` : ''
      return `${r.field}:${r.status}:${r.reason || ''}${valeur}`
    }).sort().join(',')
  ].join('|')

  if (ko.length === 0) {
    return {
      type: 'succes',
      titre: 'Monday mis à jour',
      message: `${joindre(champsOk)} envoyé${champsOk.length > 1 ? 's' : ''} à Monday.`,
      champsOk,
      champsEnEchec,
      cle
    }
  }

  const detailEchecs = champsEnEchec.map((c) => `${c.label} (${raisonLisible(c.reason)})`)
  const aRetenter = champsEnEchec.some((c) => c.reason !== 'VALEUR_NON_RECONNUE')
  const suite = aRetenter
    ? ' Réessai automatique au prochain enregistrement.'
    : ''

  if (ok.length > 0) {
    return {
      type: 'partiel',
      titre: 'Sync Monday partielle',
      message: `Envoyé : ${joindre(champsOk)}. Non synchronisé : ${joindre(detailEchecs)}.${suite}`,
      champsOk,
      champsEnEchec,
      cle
    }
  }
  return {
    type: 'echec',
    titre: 'Sync Monday impossible',
    message: `Non synchronisé : ${joindre(detailEchecs)}.${suite}`,
    champsOk,
    champsEnEchec,
    cle
  }
}

/**
 * Faut-il afficher ce feedback, sachant le dernier affiché ?
 * Un succès s'affiche toujours (c'est la confirmation d'une action). Un
 * avertissement identique au précédent (même clé) est tu : tant que la
 * situation n'a pas changé, l'utilisateur l'a déjà vu. Un succès remet le
 * compteur à zéro : le même avertissement réapparaîtra s'il revient ensuite.
 */
export function doitAfficherFeedback(feedback, derniereCleAffichee) {
  if (!feedback) return false
  if (feedback.type === 'succes') return true
  return feedback.cle !== derniereCleAffichee
}
