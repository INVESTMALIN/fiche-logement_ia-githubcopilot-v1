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

// On écarte des LISTES de mots connus, jamais les mots courts en bloc : « Leu »
// (Saint-Leu) et « Roy » identifient, alors que « sur » et « SCI » non. Un
// filtre par longueur réduisait « Saint-Leu » au seul « saint » et le faisait
// correspondre à « Saint Brieuc ».

// Liaisons des toponymes français : présentes ou non selon la source, jamais
// discriminantes.
const MOTS_LIAISON_VILLE = new Set([
  'le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'sur', 'sous', 'en',
  'au', 'aux', 'et', 'lez', 'ls',
])

// Formes juridiques et mots d'enseigne : deux propriétaires distincts les
// partagent couramment (« SCI BETA IMMO » et « SCI ALPHA IMMO »).
const MOTS_GENERIQUES_PROPRIETAIRE = new Set([
  'sci', 'sarl', 'sas', 'sasu', 'eurl', 'sa', 'sc', 'scp', 'snc', 'sccv',
  'immo', 'immobilier', 'immobiliere', 'invest', 'investissement', 'investissements',
  'home', 'holding', 'group', 'groupe', 'patrimoine', 'gestion', 'conciergerie',
  'monsieur', 'madame', 'mr', 'mme',
])

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
 * Mots porteurs de sens, une fois les mots connus non discriminants retirés.
 * Si le filtrage ne laisse rien (un propriétaire nommé « SCI IMMO »), on rend
 * les mots d'origine : mieux vaut comparer faiblement que ne plus rien comparer.
 */
function motsSignificatifs(texte, motsIgnores) {
  const mots = normaliserPourComparaison(texte).split(' ').filter(Boolean)
  const retenus = mots.filter((mot) => !motsIgnores.has(mot))
  return retenus.length > 0 ? retenus : mots
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

function motsDuSegment(segment) {
  return new Set(normaliserPourComparaison(segment).split(' ').filter(Boolean))
}

/**
 * PROPRIÉTAIRE : au moins un mot significatif en commun.
 * Les deux côtés ne portent pas la même chose — la fiche a « ZINOUN », le
 * dossier « Mustapha ZINOUN » ; la fiche a « BERNARD / SCI PALAZZO IMMO », le
 * dossier peut n'avoir que « BERNARD ». Exiger tous les mots casserait ces cas.
 */
function proprietaireCorrespond(attendu, segment) {
  const motsSegment = motsDuSegment(segment)
  return motsSignificatifs(attendu, MOTS_GENERIQUES_PROPRIETAIRE).some((mot) => motsSegment.has(mot))
}

/**
 * Un propriétaire entièrement composé de mots génériques (« SCI IMMO ») ne
 * distingue rien : on le traite comme non comparable plutôt que d'en tirer un
 * vert ou un rouge que la donnée ne permet pas.
 */
function proprietaireEstDiscriminant(attendu) {
  return normaliserPourComparaison(attendu)
    .split(' ')
    .filter(Boolean)
    .some((mot) => !MOTS_GENERIQUES_PROPRIETAIRE.has(mot))
}

/**
 * VILLE : TOUS les mots identifiants doivent s'y retrouver.
 * Un seul mot commun suffirait sinon à confondre deux villes différentes, et la
 * France en est pleine : « Saint-Malo » et « Saint Brieuc » partagent « saint »,
 * « La Celle-Saint-Cloud » et « Saint-Cyprien » aussi. Une ville est une valeur
 * unique dont les mots forment un tout, contrairement au nom du propriétaire.
 */
function villeCorrespondAuSegment(attendue, segment) {
  const motsAttendus = motsSignificatifs(attendue, MOTS_LIAISON_VILLE)
  // Le code postal est régulièrement accolé à la ville dans le nom du dossier :
  // c'est le seul supplément toléré.
  const motsDossier = motsSignificatifs(segment, MOTS_LIAISON_VILLE)
    .filter((mot) => !/^\d+$/.test(mot))

  if (motsAttendus.length === 0 || motsDossier.length === 0) return false

  // Égalité des deux ensembles, pas une simple inclusion : sans ça
  // « Saint-Pierre » validerait « Saint-Pierre-des-Corps », deux communes
  // différentes, et le vert désignerait le dossier d'un autre logement.
  const ensembleDossier = new Set(motsDossier)
  return motsAttendus.length === ensembleDossier.size
    && motsAttendus.every((mot) => ensembleDossier.has(mot))
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

  // Ce qui est réellement COMPARABLE : il faut la donnée des deux côtés. Le
  // segment propriétaire existe toujours ; le segment ville, non.
  const nomComparable = !!nomAttendu && proprietaireEstDiscriminant(proprietaireNom)
  const villeComparable = !!villeAttendue && aUneVille

  // Rien de comparable : on ne conclut pas. On distingue les deux causes, elles
  // ne se corrigent pas au même endroit.
  if (!nomComparable && !villeComparable) {
    return {
      etat: 'incertain',
      motif: (!nomAttendu && !villeAttendue) ? 'FICHE_SANS_REFERENCE' : 'DOSSIER_SANS_VILLE',
      villeDuDossier,
    }
  }

  // Chaque référence contre SON segment.
  const nomCorrespond = nomComparable && proprietaireCorrespond(proprietaireNom, segments.proprietaire)
  const villeCorrespond = villeComparable && villeCorrespondAuSegment(ville, villeDuDossier)

  // Une information comparable qui CONTREDIT suffit à écarter le dossier.
  if (nomComparable && !nomCorrespond) {
    return {
      etat: 'autre_bien',
      motif: villeCorrespond ? 'PROPRIETAIRE_DIFFERENT' : 'AUCUNE_CORRESPONDANCE',
      villeDuDossier,
    }
  }
  if (villeComparable && !villeCorrespond) {
    // `nomVerifie` dit si le propriétaire a réellement été comparé : sans lui,
    // l'écran annoncerait « même propriétaire » alors que la fiche n'en porte
    // aucun et qu'aucune comparaison n'a eu lieu.
    return { etat: 'autre_bien', motif: 'VILLE_DIFFERENTE', villeDuDossier, nomVerifie: nomComparable }
  }

  // Le vert exige les DEUX : un propriétaire seul ne distingue pas ses deux
  // biens, une ville seule ne distingue pas deux propriétaires de la même ville.
  // Avec une seule information concordante, on demande une vérification.
  if (nomComparable && villeComparable) {
    return { etat: 'correspond', motif: null, villeDuDossier }
  }

  return {
    etat: 'incertain',
    motif: villeComparable ? 'FICHE_SANS_PROPRIETAIRE' : 'DOSSIER_SANS_VILLE',
    villeDuDossier,
  }
}
