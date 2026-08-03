// src/lib/pendingMondayParams.js
//
// Mémoire courte des paramètres d'un lien Monday ouvert par un utilisateur non
// connecté : on les met de côté, on l'envoie se connecter, et on le ramène sur
// le formulaire pré-rempli juste après.
//
// Ce souvenir doit être BORNÉ. L'implémentation précédente utilisait
// `localStorage` sans horodatage : l'entrée survivait à la fermeture de
// l'onglet, du navigateur, et aux jours qui passaient. Un coordinateur qui
// avait ouvert un lien Monday sans aller au bout était renvoyé vers un
// formulaire de création vierge à sa prochaine connexion — même plusieurs jours
// plus tard, alors qu'il voulait simplement reprendre sa fiche en cours. Il
// croyait rouvrir sa fiche, il en créait une deuxième.
//
// Deux bornes, complémentaires :
//   - `sessionStorage` : le souvenir meurt avec l'onglet, donc jamais transmis
//     à une session ultérieure ;
//   - un horodatage : couvre l'onglet resté ouvert plusieurs jours.
//
// Le parcours nominal (ouvrir le lien, se connecter dans la foulée) tient
// largement dans cette fenêtre.

const STORAGE_KEY = 'pendingMondayParams'
const DUREE_DE_VIE_MS = 30 * 60 * 1000 // 30 minutes

// Purge de l'ancienne entrée `localStorage`, non horodatée donc d'âge inconnu.
// Sans ça, les souvenirs déjà présents dans les navigateurs des coordinateurs
// survivraient au déploiement du correctif.
const purgerAncienneEntree = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Purge pendingMondayParams (localStorage) impossible:', error)
  }
}

export const savePendingMondayParams = (search) => {
  purgerAncienneEntree()
  if (!search) return

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ search, savedAt: Date.now() }))
  } catch (error) {
    console.warn('Mémorisation des params Monday impossible:', error)
  }
}

export const clearPendingMondayParams = () => {
  purgerAncienneEntree()
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Nettoyage des params Monday impossible:', error)
  }
}

// Renvoie la query string mémorisée, ou null si absente, illisible ou périmée.
// Toute entrée invalide est purgée au passage : on ne veut pas d'un souvenir
// qui traîne et ressort à une connexion suivante.
export const readPendingMondayParams = () => {
  purgerAncienneEntree()

  let brut = null
  try {
    brut = sessionStorage.getItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Lecture des params Monday impossible:', error)
    return null
  }

  if (!brut) return null

  let entree = null
  try {
    entree = JSON.parse(brut)
  } catch {
    clearPendingMondayParams()
    return null
  }

  if (!entree?.search || typeof entree.savedAt !== 'number') {
    clearPendingMondayParams()
    return null
  }

  const age = Date.now() - entree.savedAt
  if (age < 0 || age > DUREE_DE_VIE_MS) {
    console.log('⏳ Params Monday périmés, ignorés (lien ouvert dans une session antérieure)')
    clearPendingMondayParams()
    return null
  }

  return entree.search
}
