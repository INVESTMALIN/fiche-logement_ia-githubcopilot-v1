const fs = require('node:fs')
const crypto = require('node:crypto')
const { createClient } = require('@supabase/supabase-js')

const DEFAULT_FOLDER_ID = '1XY1JgojvBJhHjIq6yHrAQ9p4ek2IzKBn'
const MAX_FILE_SIZE = 25 * 1024 * 1024
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive'
const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
const DUPLICATION_BATCH_SIZE = 20
const DUPLICATION_CONCURRENCY = 4

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

function normalizeTestDestinationNumber(value) {
  const propertyNumber = normalizePropertyNumber(value)
  if (!propertyNumber.toUpperCase().includes('TEST')) {
    const error = new Error('Le numéro cible du POC doit contenir « TEST » pour éviter de créer un vrai dossier par erreur.')
    error.statusCode = 400
    throw error
  }
  return propertyNumber
}

async function findPropertyFolders(propertyNumberInput) {
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

  return { propertyNumber, matches }
}

async function resolvePropertyFolder(propertyNumberInput) {
  const { propertyNumber, matches } = await findPropertyFolders(propertyNumberInput)

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

async function listDriveChildren(folderId) {
  const files = []
  let nextPageToken = null
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    spaces: 'drive',
    pageSize: '1000',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
    fields: 'nextPageToken,files(id,name,mimeType,parents,size,trashed,capabilities(canCopy,canAddChildren))',
  })

  do {
    if (nextPageToken) params.set('pageToken', nextPageToken)
    else params.delete('pageToken')
    const { data } = await googleRequest(`https://www.googleapis.com/drive/v3/files?${params}`)
    files.push(...(data.files || []))
    nextPageToken = data.nextPageToken || null
  } while (nextPageToken)

  return files
}

async function inventoryDriveFolder(rootFolder) {
  const folders = []
  const files = []
  const queue = [{
    id: rootFolder.id,
    name: rootFolder.name,
    path: rootFolder.name,
    depth: 0,
    topLevelName: '(racine)',
  }]

  while (queue.length > 0) {
    const currentFolder = queue.shift()
    const children = await listDriveChildren(currentFolder.id)

    for (const child of children) {
      const path = `${currentFolder.path}/${child.name}`
      const depth = currentFolder.depth + 1
      const topLevelName = currentFolder.depth === 0 ? child.name : currentFolder.topLevelName
      const item = {
        ...child,
        parentId: currentFolder.id,
        path,
        depth,
        topLevelName,
      }

      if (child.mimeType === DRIVE_FOLDER_MIME_TYPE) {
        folders.push(item)
        queue.push(item)
      } else {
        files.push(item)
      }
    }
  }

  return { folders, files }
}

function summarizeDriveInventory(inventory) {
  const topLevelMap = new Map()
  let totalBytes = 0
  let unknownSize = 0
  let maxDepth = 0

  for (const item of [...inventory.folders, ...inventory.files]) {
    maxDepth = Math.max(maxDepth, item.depth)
    if (!topLevelMap.has(item.topLevelName)) {
      topLevelMap.set(item.topLevelName, { folders: 0, files: 0, bytes: 0 })
    }
    const summary = topLevelMap.get(item.topLevelName)
    if (item.mimeType === DRIVE_FOLDER_MIME_TYPE) {
      summary.folders += 1
    } else {
      summary.files += 1
      if (item.size == null) unknownSize += 1
      else {
        const size = Number(item.size)
        totalBytes += size
        summary.bytes += size
      }
    }
  }

  const blockedFiles = inventory.files.filter((file) => file.capabilities?.canCopy === false)
  return {
    folders: inventory.folders.length,
    files: inventory.files.length,
    totalBytes,
    totalMiB: Number((totalBytes / 1024 / 1024).toFixed(2)),
    maxDepth,
    unknownSize,
    blockedFiles: blockedFiles.map((file) => file.path),
    estimatedWriteCalls: 1 + inventory.folders.length + inventory.files.length,
    topLevel: [...topLevelMap.entries()].map(([name, summary]) => ({
      name,
      folders: summary.folders,
      files: summary.files,
      totalMiB: Number((summary.bytes / 1024 / 1024).toFixed(2)),
    })),
  }
}

function buildDuplicateFolderName(sourceFolderName, sourcePropertyNumber, targetPropertyNumber) {
  const escapedNumber = sourcePropertyNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return String(sourceFolderName).replace(new RegExp(`^${escapedNumber}`, 'i'), targetPropertyNumber)
}

async function prepareDuplication(body) {
  const sourcePropertyNumber = normalizePropertyNumber(body.sourcePropertyNumber)
  const targetPropertyNumber = normalizeTestDestinationNumber(body.targetPropertyNumber)
  if (sourcePropertyNumber.toLowerCase() === targetPropertyNumber.toLowerCase()) {
    const error = new Error('Le numéro cible doit être différent du numéro source.')
    error.statusCode = 400
    throw error
  }

  const sourceFolder = await resolvePropertyFolder(sourcePropertyNumber)
  const { matches: existingTargets } = await findPropertyFolders(targetPropertyNumber)
  if (existingTargets.length > 0) {
    const error = new Error(`Le dossier cible existe déjà : ${existingTargets.map((folder) => folder.name).join(', ')}.`)
    error.statusCode = 409
    throw error
  }

  const inventory = await inventoryDriveFolder(sourceFolder)
  return {
    sourcePropertyNumber,
    targetPropertyNumber,
    sourceFolder,
    destinationName: buildDuplicateFolderName(sourceFolder.name, sourcePropertyNumber, targetPropertyNumber),
    inventory,
    summary: summarizeDriveInventory(inventory),
  }
}

async function runWithConcurrency(items, concurrency, worker) {
  let cursor = 0
  const results = []
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

async function createDriveFolder({ name, parentId, appProperties }) {
  const { data } = await googleRequest(
    'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,mimeType,parents,driveId,appProperties',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mimeType: DRIVE_FOLDER_MIME_TYPE,
        parents: [parentId],
        appProperties,
      }),
    },
  )
  return data
}

async function getDuplicationJobRoot(body) {
  const destinationRootId = String(body.destinationRootId || '')
  const jobId = String(body.jobId || '')
  const sourcePropertyNumber = normalizePropertyNumber(body.sourcePropertyNumber)
  const targetPropertyNumber = normalizeTestDestinationNumber(body.targetPropertyNumber)
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(destinationRootId) || !/^[a-f0-9-]{36}$/i.test(jobId)) {
    const error = new Error('Identifiants de duplication invalides.')
    error.statusCode = 400
    throw error
  }

  const fields = 'id,name,mimeType,parents,driveId,trashed,appProperties,capabilities(canAddChildren)'
  const { data } = await googleRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(destinationRootId)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,
  )
  const properties = data.appProperties || {}
  if (
    data.trashed
    || data.mimeType !== DRIVE_FOLDER_MIME_TYPE
    || !data.parents?.includes(getTargetFolderId())
    || !data.capabilities?.canAddChildren
    || properties.duplicationJobId !== jobId
    || properties.sourcePropertyNumber !== sourcePropertyNumber
    || properties.targetPropertyNumber !== targetPropertyNumber
    || !properties.sourceRootId
  ) {
    const error = new Error('Le dossier de duplication ne correspond pas au travail demandé.')
    error.statusCode = 403
    throw error
  }

  return { folder: data, sourcePropertyNumber, targetPropertyNumber }
}

async function listDuplicationJobItems(jobId, driveId) {
  const files = []
  let nextPageToken = null
  const params = new URLSearchParams({
    q: `trashed = false and appProperties has { key='duplicationJobId' and value='${jobId}' }`,
    corpora: 'drive',
    driveId,
    spaces: 'drive',
    pageSize: '1000',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
    fields: 'nextPageToken,files(id,name,mimeType,parents,appProperties)',
  })

  do {
    if (nextPageToken) params.set('pageToken', nextPageToken)
    else params.delete('pageToken')
    const { data } = await googleRequest(`https://www.googleapis.com/drive/v3/files?${params}`)
    files.push(...(data.files || []))
    nextPageToken = data.nextPageToken || null
  } while (nextPageToken)

  return files
}

async function copyDriveFile({ sourceFile, destinationParentId, jobId }) {
  const { data } = await googleRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(sourceFile.id)}/copy?supportsAllDrives=true&fields=id,name,mimeType,parents,size,appProperties`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sourceFile.name,
        parents: [destinationParentId],
        appProperties: {
          duplicationJobId: jobId,
          sourceItemId: sourceFile.id,
        },
      }),
    },
  )
  return data
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

async function handleAnalyzeDuplication(body) {
  const prepared = await prepareDuplication(body)
  return {
    analysis: {
      sourceFolder: prepared.sourceFolder,
      sourceFolderUrl: `https://drive.google.com/drive/folders/${prepared.sourceFolder.id}`,
      sourcePropertyNumber: prepared.sourcePropertyNumber,
      targetPropertyNumber: prepared.targetPropertyNumber,
      destinationName: prepared.destinationName,
      summary: prepared.summary,
    },
  }
}

async function handleStartDuplication(body) {
  const prepared = await prepareDuplication(body)
  if (prepared.summary.blockedFiles.length > 0) {
    const error = new Error(`${prepared.summary.blockedFiles.length} fichier(s) ne peuvent pas être copiés. La duplication est bloquée.`)
    error.statusCode = 409
    throw error
  }

  const jobId = crypto.randomUUID()
  const commonProperties = {
    duplicationJobId: jobId,
    sourceRootId: prepared.sourceFolder.id,
    sourcePropertyNumber: prepared.sourcePropertyNumber,
    targetPropertyNumber: prepared.targetPropertyNumber,
    totalFolders: String(prepared.summary.folders),
    totalFiles: String(prepared.summary.files),
  }
  const destinationRoot = await createDriveFolder({
    name: prepared.destinationName,
    parentId: getTargetFolderId(),
    appProperties: {
      ...commonProperties,
      sourceItemId: prepared.sourceFolder.id,
    },
  })
  const destinationBySourceId = new Map([[prepared.sourceFolder.id, destinationRoot.id]])
  const maxDepth = prepared.inventory.folders.reduce((maximum, folder) => Math.max(maximum, folder.depth), 0)

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const foldersAtDepth = prepared.inventory.folders.filter((folder) => folder.depth === depth)
    await runWithConcurrency(foldersAtDepth, DUPLICATION_CONCURRENCY, async (sourceFolder) => {
      const destinationParentId = destinationBySourceId.get(sourceFolder.parentId)
      if (!destinationParentId) throw new Error(`Parent de destination introuvable pour ${sourceFolder.path}.`)
      const createdFolder = await createDriveFolder({
        name: sourceFolder.name,
        parentId: destinationParentId,
        appProperties: {
          ...commonProperties,
          sourceItemId: sourceFolder.id,
        },
      })
      destinationBySourceId.set(sourceFolder.id, createdFolder.id)
    })
  }

  return {
    job: {
      id: jobId,
      sourceFolderId: prepared.sourceFolder.id,
      sourcePropertyNumber: prepared.sourcePropertyNumber,
      targetPropertyNumber: prepared.targetPropertyNumber,
      destinationRootId: destinationRoot.id,
      destinationName: destinationRoot.name,
      destinationUrl: `https://drive.google.com/drive/folders/${destinationRoot.id}`,
      totalFolders: prepared.summary.folders,
      totalFiles: prepared.summary.files,
      copiedFiles: 0,
      remainingFiles: prepared.summary.files,
      pendingFileIds: prepared.inventory.files.map((file) => file.id),
      done: prepared.summary.files === 0,
    },
  }
}

async function handleCopyDuplicationBatch(body) {
  const verifiedJob = await getDuplicationJobRoot(body)
  const sourceFileIds = [...new Set(Array.isArray(body.sourceFileIds) ? body.sourceFileIds.map(String) : [])]
  if (sourceFileIds.length === 0 || sourceFileIds.length > DUPLICATION_BATCH_SIZE) {
    const error = new Error(`Un lot doit contenir entre 1 et ${DUPLICATION_BATCH_SIZE} fichiers.`)
    error.statusCode = 400
    throw error
  }
  if (sourceFileIds.some((fileId) => !/^[a-zA-Z0-9_-]{10,}$/.test(fileId))) {
    const error = new Error('Un identifiant de fichier source est invalide.')
    error.statusCode = 400
    throw error
  }

  const jobItems = await listDuplicationJobItems(body.jobId, verifiedJob.folder.driveId)
  const destinationFolderBySourceId = new Map(
    jobItems
      .filter((item) => item.mimeType === DRIVE_FOLDER_MIME_TYPE && item.appProperties?.sourceItemId)
      .map((item) => [item.appProperties.sourceItemId, item.id]),
  )
  const copiedSourceIds = new Set(
    jobItems
      .filter((item) => item.mimeType !== DRIVE_FOLDER_MIME_TYPE && item.appProperties?.sourceItemId)
      .map((item) => item.appProperties.sourceItemId),
  )
  const alreadyCopiedIds = sourceFileIds.filter((fileId) => copiedSourceIds.has(fileId))
  const pendingSourceIds = sourceFileIds.filter((fileId) => !copiedSourceIds.has(fileId))
  const failures = []
  const successfulSourceIds = []

  await runWithConcurrency(pendingSourceIds, DUPLICATION_CONCURRENCY, async (sourceFileId) => {
    try {
      const fields = 'id,name,mimeType,parents,trashed,capabilities(canCopy)'
      const { data: sourceFile } = await googleRequest(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(sourceFileId)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,
      )
      const destinationParentId = sourceFile.parents?.length === 1
        ? destinationFolderBySourceId.get(sourceFile.parents[0])
        : null
      if (
        sourceFile.trashed
        || sourceFile.mimeType === DRIVE_FOLDER_MIME_TYPE
        || sourceFile.capabilities?.canCopy === false
        || !destinationParentId
      ) {
        const error = new Error('Le fichier source ne se trouve pas dans l’arborescence autorisée ou ne peut pas être copié.')
        error.statusCode = 403
        throw error
      }
      await copyDriveFile({ sourceFile, destinationParentId, jobId: body.jobId })
      successfulSourceIds.push(sourceFile.id)
      return sourceFile.id
    } catch (error) {
      failures.push({ sourceFileId, error: error.message })
      return null
    }
  })

  const processedSourceFileIds = [...alreadyCopiedIds, ...successfulSourceIds]
  const totalFiles = Number(verifiedJob.folder.appProperties.totalFiles || 0)
  const totalFolders = Number(verifiedJob.folder.appProperties.totalFolders || 0)
  const copiedFiles = Math.min(totalFiles, copiedSourceIds.size + successfulSourceIds.length)
  const remainingAfterBatch = Math.max(0, totalFiles - copiedFiles)
  return {
    job: {
      id: body.jobId,
      sourceFolderId: verifiedJob.folder.appProperties.sourceRootId,
      sourcePropertyNumber: verifiedJob.sourcePropertyNumber,
      targetPropertyNumber: verifiedJob.targetPropertyNumber,
      destinationRootId: verifiedJob.folder.id,
      destinationName: verifiedJob.folder.name,
      destinationUrl: `https://drive.google.com/drive/folders/${verifiedJob.folder.id}`,
      totalFolders,
      totalFiles,
      copiedFiles,
      remainingFiles: remainingAfterBatch,
      done: remainingAfterBatch === 0 && failures.length === 0,
      failures,
      processedSourceFileIds,
    },
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
      case 'analyze-duplication':
        result = await handleAnalyzeDuplication(body)
        break
      case 'start-duplication':
        result = await handleStartDuplication(body)
        break
      case 'copy-duplication-batch':
        result = await handleCopyDuplicationBatch(body)
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
