// src/lib/numeroBien.js
//
// 🎯 Source unique des règles du NUMÉRO DE BIEN : forme acceptée, droit de le
// modifier, et conditions de refus d'un changement.
//
// Le numéro de bien identifie le logement partout ailleurs : dossier photos
// Supabase (`user-{id}/fiche-{numero_bien}`), dossier Google Drive du bien,
// item Monday, et lookup de l'agent annonce. Il est donc verrouillé dès que la
// fiche existe (cf. FicheLogement) et ne se change que par le parcours
// administrateur dédié, qui s'appuie sur ces règles côté client ET sur la
// fonction SQL `changer_numero_bien` côté serveur (autorité réelle).
//
// Module volontairement SANS import : il porte de la règle pure, testable
// directement (scripts/tests/numeroBien.test.mjs) et réutilisée par
// `mondayFieldConstraints` pour valider le paramètre Monday `numeroDu`.

// Identifiant compact : lettres/chiffres + séparateurs usuels, mais NI espace NI
// texte libre. Autorise les formats à préfixe utilisés chez Letahost
// (« PAR-2189 », « A2189 ») et rejette la contamination réelle type
// « 2084 BARBELLION » (cf. incident du 13/07 documenté dans mondayFieldConstraints).
export const NUMERO_BIEN_FORMAT = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/

// DB : fiches.logement_numero_bien varchar(50).
export const NUMERO_BIEN_LONGUEUR_MAX = 50

export const NUMERO_BIEN_ATTENDU = 'un numéro sans espace ni texte autour (ex : 2189)'

/** Forme comparable et stockable : on ne retire QUE les espaces de bord. */
export function normaliserNumeroBien(valeur) {
  return valeur == null ? '' : String(valeur).trim()
}

/** Valide la forme ET la longueur de colonne (les deux, cf. mondayFieldConstraints). */
export function estNumeroBienValide(valeur) {
  const numero = normaliserNumeroBien(valeur)
  return numero !== '' && numero.length <= NUMERO_BIEN_LONGUEUR_MAX && NUMERO_BIEN_FORMAT.test(numero)
}

/**
 * Qui peut modifier le numéro d'une fiche déjà créée. Le coordinateur en est
 * exclu : le numéro reste verrouillé pour lui, comme avant.
 * ⚠️ Masquer le bouton ne protège rien : l'autorité est la fonction SQL
 * `changer_numero_bien`, qui refait ce contrôle sur `profiles.role`.
 */
export function peutModifierNumeroBien(role) {
  return role === 'admin' || role === 'super_admin'
}

/**
 * Conditions de refus d'un changement de numéro, côté interface.
 *
 * @param {object} params
 * @param {string} params.numeroActuel
 * @param {string} params.nouveauNumero
 * @param {{etat: 'inconnue'|'libre'|'occupee', fiche?: object}} params.collision
 *   État de la recherche d'une autre fiche portant déjà ce numéro. `inconnue`
 *   couvre « pas encore vérifié » ET « vérification en échec » : dans les deux
 *   cas on ne laisse pas continuer, faute de savoir. Le serveur revérifie de
 *   toute façon, sous verrou.
 * @returns {{pret: boolean, erreur: string|null, message: string|null}}
 */
export function evaluerChangementNumero({ numeroActuel, nouveauNumero, collision } = {}) {
  const actuel = normaliserNumeroBien(numeroActuel)
  const nouveau = normaliserNumeroBien(nouveauNumero)

  if (nouveau === '') {
    return { pret: false, erreur: 'VIDE', message: 'Saisissez le nouveau numéro de bien.' }
  }
  if (!estNumeroBienValide(nouveau)) {
    return {
      pret: false,
      erreur: 'FORMAT',
      message: `Numéro invalide : attendu ${NUMERO_BIEN_ATTENDU}, 50 caractères maximum.`
    }
  }
  if (nouveau === actuel) {
    return { pret: false, erreur: 'IDENTIQUE', message: 'Le nouveau numéro est identique au numéro actuel.' }
  }

  const etatCollision = collision?.etat || 'inconnue'
  if (etatCollision === 'occupee') {
    return {
      pret: false,
      erreur: 'COLLISION',
      message: `Le numéro ${nouveau} est déjà utilisé par une autre fiche.`
    }
  }
  if (etatCollision !== 'libre') {
    return {
      pret: false,
      erreur: 'COLLISION_INCONNUE',
      message: 'Vérification des autres fiches en cours ou indisponible.'
    }
  }

  return { pret: true, erreur: null, message: null }
}
