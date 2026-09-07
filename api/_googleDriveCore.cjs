// api/_googleDriveCore.cjs
//
// Accès Google Drive côté serveur : jeton du compte technique, appels REST, et
// résolution du dossier d'un bien dans un dossier parent.
//
// Extrait de `_drivePocCore.cjs` (POC upload direct) pour être partagé avec la
// vérification LECTURE SEULE de dossier du parcours « changer le numéro de
// bien ». Ce module ne fait aucune écriture : l'upload, le partage et la
// corbeille restent dans le POC.
//
// Convention de nommage des dossiers de bien (Drive Letahost, dossier
// « 2. DOSSIERS PROPRIETAIRES ») : « {numero}. {Nom Propriétaire} - {Ville} ».
// Le rapprochement se fait donc sur le PRÉFIXE, pas sur un `contains` : le
// dossier « 2155-TEST-COPIE. Sébastien VIAL » ne doit pas être pris pour le
// dossier du bien 2155.

const fs = require('node:fs')
const crypto = require('node:crypto')

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive'

let cachedGoogleToken = null
let cachedGoogleTokenExpiresAt = 0

function getCredentials() {
  if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON)
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!credentialsPath) {
    throw new Error('Configuration du compte technique Google manquante.')
  }

  return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
}

function encodeJwtPart(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

async function getGoogleAccessToken() {
  if (cachedGoogleToken && Date.now() < cachedGoogleTokenExpiresAt) {
    return cachedGoogleToken
  }

  const credentials = getCredentials()
  const now = Math.floor(Date.now() / 1000)
  const signingInput = `${encodeJwtPart({ alg: 'RS256', typ: 'JWT' })}.${encodeJwtPart({
    iss: credentials.client_email,
    scope: GOOGLE_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`
  const signature = crypto
    .sign('RSA-SHA256', Buffer.from(signingInput), credentials.private_key)
    .toString('base64url')

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${signature}`,
    }),
  })
  const tokenData = await tokenResponse.json()

  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error(`Authentification Google refusée (${tokenResponse.status}).`)
  }

  cachedGoogleToken = tokenData.access_token
  cachedGoogleTokenExpiresAt = Date.now() + Math.max(60, tokenData.expires_in - 120) * 1000
  return cachedGoogleToken
}

async function googleRequest(url, options = {}) {
  const accessToken = await getGoogleAccessToken()
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  })

  const raw = await response.text()
  let data = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = raw
  }

  if (!response.ok) {
    const message = data?.error?.message || `Erreur Google Drive (${response.status}).`
    const error = new Error(message)
    error.statusCode = response.status
    throw error
  }

  return { response, data }
}

// Même forme que le numéro de bien côté application (src/lib/numeroBien.js),
// ce qui évite de refuser ici un numéro que l'application accepte. Elle sert
// aussi de garde-fou pour la requête Drive : ni espace, ni quote, ni antislash,
// donc rien qui puisse casser ou détourner le `q=` envoyé à l'API.
const PROPERTY_NUMBER_FORMAT = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
const PROPERTY_NUMBER_MAX_LENGTH = 50

function isPropertyNumberSafe(value) {
  const propertyNumber = String(value || '').trim()
  return propertyNumber.length <= PROPERTY_NUMBER_MAX_LENGTH && PROPERTY_NUMBER_FORMAT.test(propertyNumber)
}

function normalizePropertyNumber(value) {
  const propertyNumber = String(value || '').trim()
  if (!isPropertyNumberSafe(propertyNumber)) {
    const error = new Error('Le numéro de bien est invalide.')
    error.statusCode = 400
    throw error
  }
  return propertyNumber
}

function matchesPropertyFolder(folderName, propertyNumber) {
  const escapedNumber = propertyNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escapedNumber}(?:\\.|\\s|$)`, 'i').test(String(folderName || '').trim())
}

/**
 * Dossiers du dossier parent dont le NOM commence par le numéro de bien.
 * Lecture seule. La requête Drive filtre en `contains` (seul opérateur
 * disponible), le rapprochement exact est refait localement par
 * `matchesPropertyFolder`.
 *
 * @param {{parentFolderId: string, propertyNumber: string}} params
 * @returns {Promise<Array<object>>} dossiers correspondants (0, 1 ou plusieurs)
 */
async function listPropertyFolders({ parentFolderId, propertyNumber }) {
  const numero = normalizePropertyNumber(propertyNumber)
  const query = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false and name contains '${numero}'`
  const params = new URLSearchParams({
    q: query,
    spaces: 'drive',
    pageSize: '1000',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
    fields: 'nextPageToken,files(id,name,mimeType,parents,trashed,capabilities(canAddChildren))',
  })
  const matches = []
  let nextPageToken = null

  do {
    if (nextPageToken) params.set('pageToken', nextPageToken)
    else params.delete('pageToken')

    const { data } = await googleRequest(`https://www.googleapis.com/drive/v3/files?${params}`)
    matches.push(...(data.files || []).filter((folder) => matchesPropertyFolder(folder.name, numero)))
    nextPageToken = data.nextPageToken || null
  } while (nextPageToken)

  return matches
}

function folderUrl(folderId) {
  return `https://drive.google.com/drive/folders/${folderId}`
}

module.exports = {
  getGoogleAccessToken,
  googleRequest,
  isPropertyNumberSafe,
  normalizePropertyNumber,
  matchesPropertyFolder,
  listPropertyFolders,
  folderUrl,
}
