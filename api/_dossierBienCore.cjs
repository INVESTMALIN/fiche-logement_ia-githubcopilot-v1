// api/_dossierBienCore.cjs
//
// Vérification LECTURE SEULE du dossier Google Drive d'un bien, utilisée par le
// parcours administrateur « changer le numéro de bien » : avant de renuméroter,
// l'administrateur doit savoir si le dossier du NOUVEAU numéro existe déjà dans
// « 2. DOSSIERS PROPRIETAIRES ».
//
// Pourquoi c'est utile : le scénario Make V2 cherche le dossier du bien AVANT
// les transferts de médias. Sans dossier, le flux n'atteint jamais les uploads,
// et comme la réponse au webhook est envoyée avant ce travail, l'absence de
// transfert est SILENCIEUSE.
//
// Trois états distincts, tous NON BLOQUANTS pour la renumérotation :
//   - `trouve`        : dossier identifié sans ambiguïté, on rend son nom exact
//                       et son lien ;
//   - `absent`        : la recherche a abouti et ne trouve rien ;
//   - `indisponible`  : la recherche n'a pas pu être faite (dossier parent non
//                       configuré, compte technique sans accès, panne Google).
//                       On ne dit JAMAIS « absent » dans ce cas.
//
// `ambigu` est un quatrième cas, non bloquant lui aussi : plusieurs dossiers
// CONTIENNENT ce numéro, ou le seul qui le contient ne respecte pas la
// convention de nommage. Il existe parce que Make cherche en `contains` avec
// `limit 1` : dès qu'il a plus d'un candidat, ou un candidat qui n'est pas le
// bon dossier, il peut déposer les médias au mauvais endroit. Répondre « trouvé »
// (vert) ou « absent » dans ces cas donnerait un signal faux.
//
// Aucune écriture : ni création, ni renommage, ni upload. Le POC d'upload direct
// reste cantonné à `/api/drive-poc`.

const { sendJson, readJsonBody, requireRole } = require('./_apiCore.cjs')
const { listPropertyFolders, folderUrl, isPropertyNumberSafe } = require('./_googleDriveCore.cjs')

// Identifiant du dossier « 2. DOSSIERS PROPRIETAIRES » du Drive Letahost.
// Volontairement SANS valeur par défaut : un défaut qui pointerait sur le
// dossier de test ferait répondre « absent » sur des biens qui existent.
const PARENT_FOLDER_ENV = 'GOOGLE_DRIVE_DOSSIERS_PROPRIETAIRES_FOLDER_ID'

const MESSAGE_ROLE = 'La vérification du dossier Drive est réservée aux administrateurs.'

// Une seule définition de la forme acceptée, côté Drive comme côté application.
const estNumeroExploitable = isPropertyNumberSafe

/**
 * @param {string} numeroBien
 * @param {{lister?: Function}} [deps] - `lister` n'est là que pour les tests
 *   (scripts/tests/dossierBien.test.mjs) : les quatre états se prouvent hors
 *   ligne, sans compte technique Google ni réseau.
 * @returns {Promise<{etat: string, dossier: object|null, dossiers?: object[], message?: string, raison?: string}>}
 */
async function chercherDossierBien(numeroBien, { lister = listPropertyFolders } = {}) {
  const parentFolderId = process.env[PARENT_FOLDER_ENV]
  if (!parentFolderId) {
    return {
      etat: 'indisponible',
      raison: 'config_absente',
      dossier: null,
      message: "Vérification impossible : le dossier Drive des propriétaires n'est pas configuré sur ce serveur.",
    }
  }

  try {
    const { candidats, correspondances } = await lister({ parentFolderId, propertyNumber: numeroBien })

    if (candidats.length === 0) {
      return { etat: 'absent', dossier: null }
    }

    // Un seul candidat ET c'est le bon : Make ne peut pas se tromper de cible.
    if (candidats.length === 1 && correspondances.length === 1) {
      const dossier = correspondances[0]
      return { etat: 'trouve', dossier: { id: dossier.id, nom: dossier.name, url: folderUrl(dossier.id) } }
    }

    return {
      etat: 'ambigu',
      dossier: null,
      // `candidat_non_conforme` : rien ne porte le numéro selon la convention,
      // mais un dossier le contient et Make le prendrait quand même.
      raison: correspondances.length === 0 ? 'candidat_non_conforme' : 'plusieurs_candidats',
      dossiers: candidats.map((d) => ({ id: d.id, nom: d.name, url: folderUrl(d.id) })),
    }
  } catch (error) {
    // Panne, quota, dossier parent inaccessible au compte technique : on ne sait
    // pas si le dossier existe. Le dire est le seul comportement honnête.
    console.error('[dossier-bien] recherche Drive en echec :', error.message)
    return {
      etat: 'indisponible',
      raison: 'erreur_google',
      dossier: null,
      message: "Vérification impossible : le Drive n'a pas répondu correctement.",
    }
  }
}

async function handleDossierBienRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { success: false, error: 'Méthode non autorisée.' })
    return
  }

  try {
    await requireRole(request, ['admin', 'super_admin'], { message: MESSAGE_ROLE })
    const body = await readJsonBody(request)

    if (!estNumeroExploitable(body.numeroBien)) {
      sendJson(response, 400, { success: false, error: 'Le numéro de bien est invalide.' })
      return
    }

    const resultat = await chercherDossierBien(String(body.numeroBien).trim())
    sendJson(response, 200, { success: true, ...resultat })
  } catch (error) {
    console.error('[dossier-bien]', error.message)
    sendJson(response, error.statusCode || 500, {
      success: false,
      error: error.message || 'Erreur inattendue pendant la vérification du dossier Drive.',
    })
  }
}

module.exports = {
  handleDossierBienRequest,
  chercherDossierBien,
  estNumeroExploitable,
  PARENT_FOLDER_ENV,
}
