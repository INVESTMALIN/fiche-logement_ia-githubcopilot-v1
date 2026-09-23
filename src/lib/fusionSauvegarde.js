// src/lib/fusionSauvegarde.js
//
// Une sauvegarde n'est pas instantanée : entre l'instant où `handleSave`
// envoie `formData` et celui où Supabase répond, le coordinateur continue de
// travailler. Or la réponse remplaçait tout l'état local (`setFormData(result.data)`),
// donc tout ce qui avait été modifié dans cet intervalle disparaissait :
// une saisie au clavier, une photo supprimée qui réapparaissait avec une URL
// déjà morte, ou le résultat d'un traitement asynchrone.
//
// La réponse reste la référence — elle seule porte les valeurs décidées par le
// serveur (`id` à la création, `updated_at`, snapshots) — mais les champs
// touchés PENDANT l'envoi sont réappliqués par-dessus, depuis l'état local.
//
// Aucun import : ce module est chargeable tel quel par les tests Node.

/**
 * Chemins que la fusion ne doit JAMAIS réappliquer depuis l'état local.
 *
 * Le numéro de bien est posé à la création puis verrouillé : `saveFiche` le
 * retire de tout UPDATE, et seule la fonction SQL `changer_numero_bien` peut
 * le modifier. Conserver une saisie faite pendant la création afficherait donc
 * un numéro qui n'atteindra jamais la base — et les uploads suivants
 * viseraient un dossier Storage qui ne correspond à rien. Sur ce champ, la
 * valeur de la base fait foi, même si elle contredit l'écran.
 */
export const CHEMINS_NON_FUSIONNABLES = Object.freeze(['section_logement.numero_bien'])

/** Lit une valeur à un chemin pointé, sans jamais lever. */
export function lireChemin(source, chemin) {
  const cles = String(chemin).split('.')
  let courant = source
  for (const cle of cles) {
    if (courant === null || typeof courant !== 'object' || !(cle in courant)) return undefined
    courant = courant[cle]
  }
  return courant
}

/**
 * Écrit une valeur à un chemin pointé, en recopiant les objets traversés
 * (pas de mutation de l'objet d'origine).
 */
export function ecrireChemin(cible, chemin, valeur) {
  const cles = String(chemin).split('.')
  const racine = { ...cible }
  let courant = racine

  for (let i = 0; i < cles.length - 1; i++) {
    const cle = cles[i]
    const suivant = courant[cle]
    courant[cle] = (suivant !== null && typeof suivant === 'object' && !Array.isArray(suivant))
      ? { ...suivant }
      : {}
    courant = courant[cle]
  }

  courant[cles[cles.length - 1]] = valeur
  return racine
}

/**
 * Fusionne la réponse d'une sauvegarde avec les modifications survenues
 * pendant celle-ci.
 *
 * @param {object} local    état courant du formulaire (le plus récent)
 * @param {object} distant  état renvoyé par la sauvegarde
 * @param {Iterable<string>} cheminsModifies chemins touchés depuis le départ
 *                          de la sauvegarde ('nom', 'section_clefs.photos', …)
 * @returns {object} `distant`, avec les chemins modifiés repris de `local`
 *
 * Sans modification en vol, retourne `distant` tel quel : le comportement
 * historique est strictement conservé dans le cas courant.
 */
export function fusionnerApresSauvegarde(local, distant, cheminsModifies) {
  if (!distant || typeof distant !== 'object') return distant
  const chemins = [...(cheminsModifies || [])]
  if (chemins.length === 0) return distant
  if (!local || typeof local !== 'object') return distant

  let fusion = distant
  for (const chemin of chemins) {
    const valeurLocale = lireChemin(local, chemin)
    // Un chemin annoncé mais absent en local n'a rien à réappliquer : on ne
    // fabrique pas de `undefined` dans la fiche.
    if (valeurLocale === undefined) continue
    fusion = ecrireChemin(fusion, chemin, valeurLocale)
  }

  // Les champs verrouillés sont réimposés depuis la réponse, APRÈS la fusion :
  // cela couvre aussi bien une modification directe du champ qu'une section
  // entière réappliquée par-dessus (`updateSection`), qui l'emporterait avec elle.
  for (const chemin of CHEMINS_NON_FUSIONNABLES) {
    const valeurDistante = lireChemin(distant, chemin)
    if (valeurDistante === undefined) continue
    if (lireChemin(fusion, chemin) === valeurDistante) continue
    fusion = ecrireChemin(fusion, chemin, valeurDistante)
  }

  return fusion
}

/**
 * Collecteurs de chemins : une sauvegarde en vol = un collecteur. Plusieurs
 * peuvent coexister (autosave et clic « Enregistrer » qui se chevauchent) ;
 * chaque sauvegarde ne reprend que ce qui a bougé depuis SON départ.
 */
export function creerCollecteursModifications() {
  const collecteurs = new Set()

  return {
    /** Ouvre un collecteur pour une sauvegarde qui démarre. */
    ouvrir() {
      const chemins = new Set()
      collecteurs.add(chemins)
      return chemins
    },
    /** Ferme un collecteur et rend les chemins accumulés. */
    fermer(chemins) {
      collecteurs.delete(chemins)
      return chemins
    },
    /** Note un chemin modifié dans toutes les sauvegardes en vol. */
    noter(chemin) {
      if (collecteurs.size === 0) return
      for (const chemins of collecteurs) chemins.add(chemin)
    },
    /** Une sauvegarde est-elle en vol ? (tests) */
    actifs() {
      return collecteurs.size
    }
  }
}
