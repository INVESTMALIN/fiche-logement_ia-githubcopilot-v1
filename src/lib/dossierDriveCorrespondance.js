// src/lib/dossierDriveCorrespondance.js
//
// 🎯 Le dossier Drive trouvé pour un numéro est-il bien celui de CE logement ?
//
// Trouver un dossier au bon numéro ne suffit pas : si le numéro saisi est celui
// d'un autre bien, son dossier existe et porterait un vert trompeur. On compare
// donc le nom du dossier au propriétaire et à la ville de la fiche.
//
// Convention Drive Letahost : « {numero}. {Nom Propriétaire} - {Ville} ».
// Elle n'est pas toujours respectée : dossiers sans ville, deux propriétaires
// séparés par « / », code postal accolé à la ville, casse libre. La comparaison
// distingue donc CONTREDIT (rouge) de NE SAIT PAS (orange) : on n'affirme jamais
// qu'un dossier est le mauvais quand l'information manque.
//
// DEUX RÈGLES QUI ÉVITENT LES FAUX VERTS, le pire résultat possible ici (un vert
// laisse diriger les photos vers un dossier sans que personne ne vérifie) :
//   1. On compare des MOTS ENTIERS, pas des sous-chaînes : « MARTIN » ne doit pas
//      valider un dossier « MARTINEZ », ni « Paris » un dossier « Parisot ».
//   2. Chaque référence est comparée à SON segment : le propriétaire contre la
//      partie propriétaire, la ville contre la partie ville. Sinon une ville
//      pourrait se reconnaître dans le nom du propriétaire, et inversement.
//
// Module volontairement SANS import : règle pure, testable directement
// (scripts/tests/dossierDriveCorrespondance.test.mjs).

// En dessous de 4 caractères, un mot n'identifie plus rien de façon fiable
// (« le », « sur », « sci », « des »…) : le retenir rouvrirait la porte aux faux
// verts que les mots entiers viennent de fermer.
const LONGUEUR_MOT_SIGNIFICATIF = 4

/**
 * Forme comparable : minuscules, sans accents, sans ponctuation ni séparateurs.
 * Indispensable — les deux sources divergent systématiquement sur la forme :
 * la fiche écrit « Hermanville-sur-Mer, », le dossier « Hermanville sur Mer ».
 */
export function normaliserPourComparaison(texte) {
  return String(texte == null ? '' : texte)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Mots retenus pour la comparaison. On privilégie les mots significatifs et on
 * ne retombe sur les mots courts que s'il n'en reste aucun — un nom de famille
 * de trois lettres (ROY, FAY) doit rester comparable.
 */
function motsSignificatifs(texte) {
  const mots = normaliserPourComparaison(texte).split(' ').filter(Boolean)
  const longs = mots.filter((mot) => mot.length >= LONGUEUR_MOT_SIGNIFICATIF)
  return longs.length > 0 ? longs : mots
}

/**
 * Découpe « 2173. Mustapha ZINOUN - Hermanville sur Mer » en ses deux segments.
 * Le séparateur de ville est le DERNIER « - » entouré d'espaces : les noms de
 * villes en contiennent aussi (« Vaulnaveys-le-Haut »), mais sans espaces.
 * `ville` vaut '' quand le dossier n'en porte pas — à ne pas confondre avec
 * « ville différente ».
 */
function segmentsDuDossier(nomDossier) {
  const nom = String(nomDossier || '')
  const finNumero = nom.indexOf('.')
  const apresNumero = finNumero === -1 ? nom : nom.slice(finNumero + 1)

  const separateur = apresNumero.lastIndexOf(' - ')
  return separateur === -1
    ? { proprietaire: apresNumero.trim(), ville: '' }
    : {
      proprietaire: apresNumero.slice(0, separateur).trim(),
      ville: apresNumero.slice(separateur + 3).trim(),
    }
}

/** Au moins un mot significatif en commun, comparé en mots ENTIERS. */
function partagentUnMot(attendu, segment) {
  const motsSegment = new Set(normaliserPourComparaison(segment).split(' ').filter(Boolean))
  return motsSignificatifs(attendu).some((mot) => motsSegment.has(mot))
}

/**
 * Compare le dossier trouvé à la fiche.
 *
 * @param {object} params
 * @param {string} params.nomDossier          nom exact du dossier Drive
 * @param {string} params.proprietaireNom     `proprietaire_nom` de la fiche
 * @param {string} params.ville               `proprietaire_adresse_ville` — c'est bien la ville
 *                                            DU BIEN (elle part comme `address.city` du logement
 *                                            Loomky), malgré le préfixe `proprietaire_` de la colonne
 * @returns {{etat: 'correspond'|'autre_bien'|'incertain', motif: string|null,
 *            villeDuDossier: string}}
 */
export function evaluerCorrespondanceDossier({ nomDossier, proprietaireNom, ville } = {}) {
  const segments = segmentsDuDossier(nomDossier)
  const villeDuDossier = segments.ville
  const aUneVille = normaliserPourComparaison(villeDuDossier) !== ''

  const nomAttendu = normaliserPourComparaison(proprietaireNom)
  const villeAttendue = normaliserPourComparaison(ville)

  // Rien à comparer côté fiche : on ne conclut pas.
  if (!nomAttendu && !villeAttendue) {
    return { etat: 'incertain', motif: 'FICHE_SANS_REFERENCE', villeDuDossier }
  }

  // Chaque référence contre SON segment.
  const nomCorrespond = !!nomAttendu && partagentUnMot(proprietaireNom, segments.proprietaire)
  const villeCorrespond = !!villeAttendue && aUneVille && partagentUnMot(ville, villeDuDossier)

  if (nomCorrespond && villeCorrespond) {
    return { etat: 'correspond', motif: null, villeDuDossier }
  }

  // Une seule des deux informations est vérifiable côté fiche : on ne peut pas
  // exiger l'autre.
  if (!nomAttendu || !villeAttendue) {
    return nomCorrespond || villeCorrespond
      ? { etat: 'correspond', motif: null, villeDuDossier }
      : { etat: 'autre_bien', motif: 'AUCUNE_CORRESPONDANCE', villeDuDossier }
  }

  // Le dossier ne porte aucune ville : impossible de contredire sur ce point.
  // Le propriétaire correspond → on demande une vérification, on n'accuse pas.
  if (nomCorrespond && !aUneVille) {
    return { etat: 'incertain', motif: 'DOSSIER_SANS_VILLE', villeDuDossier }
  }

  if (nomCorrespond && !villeCorrespond) {
    return { etat: 'autre_bien', motif: 'VILLE_DIFFERENTE', villeDuDossier }
  }
  if (!nomCorrespond && villeCorrespond) {
    return { etat: 'autre_bien', motif: 'PROPRIETAIRE_DIFFERENT', villeDuDossier }
  }

  return { etat: 'autre_bien', motif: 'AUCUNE_CORRESPONDANCE', villeDuDossier }
}
