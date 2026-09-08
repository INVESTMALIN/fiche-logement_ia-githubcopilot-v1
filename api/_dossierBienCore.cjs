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
// On rend des FAITS, jamais un jugement : les dossiers que la recherche remonte,
// avec leur nom exact et leur lien. C'est l'administrateur qui dit si le dossier
// est le bon. Comparer automatiquement le nom du dossier au propriétaire et à la
// ville de la fiche a été tenté puis retiré : sur des chaînes libres saisies dans
// deux outils différents, la comparaison produisait des verts trompeurs
// (« Saint-Pierre » validait « Saint-Pierre-des-Corps », « LE GALL » validait
// « LE GOFF »), et un vert trompeur est le pire résultat possible ici.
//
// Cinq états, tous NON BLOQUANTS pour la renumérotation :
//   - `absent`         : la recherche a abouti et ne trouve rien ;
//   - `trouve`         : un seul dossier, dont le nom commence par « {numero}. » ;
//   - `hors_convention`: un seul dossier, qui CONTIENT le numéro sans commencer
//                        par « {numero}. » — « 2155-TEST-COPIE. Dupont » pour le
//                        bien 2155. Make le trouverait quand même et y déposerait
//                        les médias, il mérite donc son propre signal ;
//   - `ambigu`         : plusieurs dossiers contiennent ce numéro. Make cherche en
//                        `contains` avec `limit 1` : il peut déposer les médias
//                        dans n'importe lequel, on les montre donc tous ;
//   - `indisponible`   : la recherche n'a pas pu être faite (dossier parent non
//                        configuré, compte technique sans accès, panne Google).
//                        On ne dit JAMAIS « absent » dans ce cas.
//
// L'état ne dépend que du nombre de dossiers trouvés et du PRÉFIXE de leur nom :
// des faits vérifiables, pas des ressemblances. Le nom exact est toujours rendu,
// c'est lui que l'administrateur vérifie.
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
 * @returns {Promise<{etat: string, dossiers: object[], message?: string, raison?: string}>}
 */
async function chercherDossierBien(numeroBien, { lister = listPropertyFolders } = {}) {
  const parentFolderId = process.env[PARENT_FOLDER_ENV]
  if (!parentFolderId) {
    return {
      etat: 'indisponible',
      raison: 'config_absente',
      dossiers: [],
      message: "Le dossier Drive des propriétaires n'est pas configuré sur ce serveur.",
    }
  }

  try {
    // `candidats` = ce que la requête Drive `contains` remonte, donc exactement
    // ce que voit le scénario Make. Aucun n'est écarté : un dossier hors
    // convention reste un dossier que Make peut attraper, il doit rester visible.
    // `correspondances` = ceux dont le nom commence par « {numero}. ».
    const { candidats, correspondances } = await lister({ parentFolderId, propertyNumber: numeroBien })
    const dossiers = candidats.map((d) => ({ id: d.id, nom: d.name, url: folderUrl(d.id) }))

    if (dossiers.length === 0) return { etat: 'absent', dossiers }
    if (dossiers.length === 1) {
      return { etat: correspondances.length === 1 ? 'trouve' : 'hors_convention', dossiers }
    }
    return { etat: 'ambigu', dossiers }
  } catch (error) {
    // Panne, quota, dossier parent inaccessible au compte technique : on ne sait
    // pas si le dossier existe. Le dire est le seul comportement honnête.
    console.error('[dossier-bien] recherche Drive en echec :', error.message)
    return {
      etat: 'indisponible',
      raison: 'erreur_google',
      dossiers: [],
      message: "Le Drive n'a pas répondu correctement.",
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
