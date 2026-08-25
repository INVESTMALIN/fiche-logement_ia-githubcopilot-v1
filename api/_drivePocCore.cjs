const fs = require('node:fs')
const crypto = require('node:crypto')
const { createClient } = require('@supabase/supabase-js')

const DEFAULT_FOLDER_ID = '1XY1JgojvBJhHjIq6yHrAQ9p4ek2IzKBn'
const MAX_FILE_SIZE = 25 * 1024 * 1024
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive'

let cachedGoogleToken = null
let cachedGoogleTokenExpiresAt = 0

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') return request.body

  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  if (chunks.length === 0) return {}

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('Corps JSON invalide.')
  }
}

function getBearerToken(request) {
  const authorization = request.headers.authorization || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Configuration Supabase serveur manquante.')
  }

  return { url, anonKey }
}

async function requireSuperAdmin(request) {
  const token = getBearerToken(request)
  if (!token) {
    const error = new Error('Session utilisateur manquante.')
    error.statusCode = 401
    throw error
  }

  const { url, anonKey } = getSupabaseConfig()
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    const error = new Error('Session utilisateur invalide ou expirée.')
    error.statusCode = 401
    throw error
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profile) {
    const error = new Error('Impossible de vérifier le rôle utilisateur.')
    error.statusCode = 403
    throw error
  }

  if (profile.active === false || profile.role !== 'super_admin') {
    const error = new Error('Cette page de test est réservée au super-administrateur.')
    error.statusCode = 403
    throw error
  }

  return userData.user
}

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

function getTargetFolderId() {
  return process.env.GOOGLE_DRIVE_POC_FOLDER_ID || DEFAULT_FOLDER_ID
}

function sanitizeFileName(fileName) {
  const safeName = String(fileName || 'photo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return safeName.slice(-140) || 'photo'
}

function normalizePropertyNumber(value) {
  const propertyNumber = String(value || '').trim()
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(propertyNumber)) {
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

async function resolvePropertyFolder(propertyNumberInput) {
  const propertyNumber = normalizePropertyNumber(propertyNumberInput)
  const query = `'${getTargetFolderId()}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false and name contains '${propertyNumber}'`
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
    matches.push(...(data.files || []).filter((folder) => matchesPropertyFolder(folder.name, propertyNumber)))
    nextPageToken = data.nextPageToken || null
  } while (nextPageToken)

  if (matches.length === 0) {
    const error = new Error(`Aucun dossier de bien ne commence par « ${propertyNumber}. » dans le dossier de test.`)
    error.statusCode = 404
    throw error
  }
  if (matches.length > 1) {
    const error = new Error(`Plusieurs dossiers correspondent au bien ${propertyNumber}. L’upload est bloqué pour éviter une mauvaise destination.`)
    error.statusCode = 409
    throw error
  }
  if (!matches[0].capabilities?.canAddChildren) {
    const error = new Error(`Le compte technique ne peut pas écrire dans le dossier du bien ${propertyNumber}.`)
    error.statusCode = 403
    throw error
  }

  return matches[0]
}

async function getVerifiedPropertyFolder(folderIdInput, propertyNumberInput) {
  const folderId = String(folderIdInput || '')
  const propertyNumber = normalizePropertyNumber(propertyNumberInput)
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(folderId)) {
    const error = new Error('Identifiant du dossier de bien invalide.')
    error.statusCode = 400
    throw error
  }

  const fields = 'id,name,mimeType,parents,trashed,capabilities(canAddChildren)'
  const { data } = await googleRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,
  )
  if (
    data.trashed
    || data.mimeType !== 'application/vnd.google-apps.folder'
    || !data.parents?.includes(getTargetFolderId())
    || !matchesPropertyFolder(data.name, propertyNumber)
  ) {
    const error = new Error('Le dossier de destination ne correspond pas au numéro de bien demandé.')
    error.statusCode = 403
    throw error
  }
  if (!data.capabilities?.canAddChildren) {
    const error = new Error(`Le compte technique ne peut pas écrire dans le dossier du bien ${propertyNumber}.`)
    error.statusCode = 403
    throw error
  }
  return data
}

function buildStoredFileName(originalName, prefixInput) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const randomId = crypto.randomBytes(4).toString('hex')
  const cleanOriginalName = sanitizeFileName(originalName)
  const extensionMatch = cleanOriginalName.match(/(\.[a-zA-Z0-9]{1,10})$/)
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : ''
  const prefix = sanitizeFileName(prefixInput || 'Photo-test').replace(/\.[a-zA-Z0-9]{1,10}$/, '')
  return `${prefix}-photo-${timestamp}-${randomId}${extension}`
}

async function isAllowedUploadParent(parentId) {
  if (parentId === getTargetFolderId()) return true
  const fields = 'id,mimeType,parents,trashed'
  const { data } = await googleRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(parentId)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,
  )
  return !data.trashed
    && data.mimeType === 'application/vnd.google-apps.folder'
    && data.parents?.includes(getTargetFolderId())
}

async function getVerifiedTargetFile(fileId) {
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(String(fileId || ''))) {
    const error = new Error('Identifiant Drive invalide.')
    error.statusCode = 400
    throw error
  }

  const fields = 'id,name,mimeType,parents,size,trashed,webViewLink,webContentLink,thumbnailLink'
  const { data } = await googleRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,
  )

  const allowedParent = !data.trashed && data.parents?.length === 1 && await isAllowedUploadParent(data.parents[0])
  if (!allowedParent) {
    const error = new Error('Ce fichier ne se trouve pas dans le dossier POC autorisé.')
    error.statusCode = 403
    throw error
  }

  return data
}

async function handleHealth() {
  const fields = 'id,name,mimeType,capabilities(canAddChildren,canShare,canTrashChildren)'
  const { data } = await googleRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(getTargetFolderId())}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,
  )

  if (data.mimeType !== 'application/vnd.google-apps.folder' || !data.capabilities?.canAddChildren) {
    throw new Error("Le compte technique n'a pas le droit d'ajouter des fichiers dans le dossier POC.")
  }

  return {
    folder: data,
    folderUrl: `https://drive.google.com/drive/folders/${data.id}`,
  }
}

async function handleResolveFolder(body) {
  const folder = await resolvePropertyFolder(body.propertyNumber)
  return {
    folder,
    folderUrl: `https://drive.google.com/drive/folders/${folder.id}`,
  }
}

async function handleCreateSession(body, request, user) {
  const name = String(body.name || '')
  const mimeType = String(body.mimeType || '')
  const size = Number(body.size)

  if (!name || !mimeType.startsWith('image/')) {
    const error = new Error('Seules les images sont acceptées sur cette page de test.')
    error.statusCode = 400
    throw error
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
    const error = new Error('La photo doit faire moins de 25 Mo après optimisation.')
    error.statusCode = 400
    throw error
  }

  const propertyFolder = await getVerifiedPropertyFolder(body.folderId, body.propertyNumber)

  const accessToken = await getGoogleAccessToken()
  let origin = request.headers.origin || 'https://localhost'
  if (!request.headers.origin && request.headers.referer) {
    try {
      origin = new URL(request.headers.referer).origin
    } catch {
      origin = 'https://localhost'
    }
  }
  const sessionResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,parents,size,webViewLink,webContentLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(size),
        Origin: origin,
      },
      body: JSON.stringify({
        name: buildStoredFileName(name, body.prefix),
        parents: [propertyFolder.id],
        appProperties: {
          source: 'fiche-logement-drive-poc',
          uploadedBy: user.id,
          propertyNumber: normalizePropertyNumber(body.propertyNumber),
        },
      }),
    },
  )

  if (!sessionResponse.ok) {
    const details = await sessionResponse.text()
    throw new Error(`Google a refusé l'ouverture de la session (${sessionResponse.status})${details ? '.' : ''}`)
  }

  const sessionUrl = sessionResponse.headers.get('location')
  if (!sessionUrl) throw new Error("Google n'a pas renvoyé d'URL de session d'upload.")

  return { sessionUrl }
}

async function ensurePublicPermission(fileId) {
  const fields = 'permissions(id,type,role,allowFileDiscovery)'
  const { data: permissionsData } = await googleRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,
  )
  const alreadyPublic = permissionsData.permissions?.some(
    (permission) => permission.type === 'anyone' && permission.role === 'reader',
  )

  if (!alreadyPublic) {
    await googleRequest(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&fields=id,type,role,allowFileDiscovery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'anyone', role: 'reader', allowFileDiscovery: false }),
      },
    )
  }
}

async function handleFinalize(body) {
  const file = await getVerifiedTargetFile(body.fileId)
  await ensurePublicPermission(file.id)

  return {
    file: {
      ...file,
      publicUrl: `https://drive.google.com/uc?export=view&id=${file.id}`,
    },
  }
}

async function handleTrash(body) {
  const file = await getVerifiedTargetFile(body.fileId)
  await googleRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?supportsAllDrives=true&fields=id,name,trashed`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    },
  )
  return { fileId: file.id }
}

async function handleDrivePocRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { success: false, error: 'Méthode non autorisée.' })
    return
  }

  try {
    const user = await requireSuperAdmin(request)
    const body = await readJsonBody(request)
    let result

    switch (body.action) {
      case 'health':
        result = await handleHealth()
        break
      case 'resolve-folder':
        result = await handleResolveFolder(body)
        break
      case 'create-session':
        result = await handleCreateSession(body, request, user)
        break
      case 'finalize':
        result = await handleFinalize(body)
        break
      case 'trash':
        result = await handleTrash(body)
        break
      default: {
        const error = new Error('Action inconnue.')
        error.statusCode = 400
        throw error
      }
    }

    sendJson(response, 200, { success: true, ...result })
  } catch (error) {
    console.error('[drive-poc]', error.message)
    sendJson(response, error.statusCode || 500, {
      success: false,
      error: error.message || 'Erreur inattendue pendant le test Drive.',
    })
  }
}

module.exports = { handleDrivePocRequest }
