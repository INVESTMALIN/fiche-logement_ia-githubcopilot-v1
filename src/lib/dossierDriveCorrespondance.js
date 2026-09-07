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
// Module volontairement SANS import : règle pure, testable directement
// (scripts/tests/dossierDriveCorrespondance.test.mjs).

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
 * Partie « ville » du nom de dossier : ce qui suit le dernier tiret séparateur.
 * Rend '' quand le dossier n'en comporte pas — cas réel des dossiers créés hors
 * convention, qu'il ne faut pas confondre avec « ville différente ».
 */
function partieVilleDuDossier(nomDossier) {
  const nom = String(nomDossier || '')
  const separateur = nom.lastIndexOf(' - ')
  return separateur === -1 ? '' : nom.slice(separateur + 3)
}

/**
 * Compare le dossier trouvé à la fiche.
 *
 * @param {object} params
 * @param {string} params.nomDossier          nom exact du dossier Drive
 * @param {string} params.proprietaireNom     `proprietaire_nom` de la fiche (nom de famille)
 * @param {string} params.ville               `proprietaire_adresse_ville` — c'est bien la ville
 *                                            DU BIEN (elle part comme `address.city` du logement
 *                                            Loomky), malgré le préfixe `proprietaire_` de la colonne
 * @returns {{etat: 'correspond'|'autre_bien'|'incertain', motif: string|null,
 *            villeDuDossier: string}}
 */
export function evaluerCorrespondanceDossier({ nomDossier, proprietaireNom, ville } = {}) {
  const dossier = normaliserPourComparaison(nomDossier)
  const nomAttendu = normaliserPourComparaison(proprietaireNom)
  const villeAttendue = normaliserPourComparaison(ville)
  const villeDuDossier = partieVilleDuDossier(nomDossier)

  // Rien à comparer côté fiche : on ne conclut pas.
  if (!nomAttendu && !villeAttendue) {
    return { etat: 'incertain', motif: 'FICHE_SANS_REFERENCE', villeDuDossier }
  }

  const nomCorrespond = !!nomAttendu && dossier.includes(nomAttendu)
  const villeCorrespond = !!villeAttendue && dossier.includes(villeAttendue)

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
  if (nomCorrespond && !villeCorrespond && normaliserPourComparaison(villeDuDossier) === '') {
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
