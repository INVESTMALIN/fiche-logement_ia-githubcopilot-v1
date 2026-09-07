const crypto = require('node:crypto')
const { sendJson, readJsonBody, requireRole } = require('./_apiCore.cjs')
const {
  getGoogleAccessToken,
  googleRequest,
  normalizePropertyNumber,
  matchesPropertyFolder,
  listPropertyFolders,
} = require('./_googleDriveCore.cjs')

// Dossier de TEST « 2. Dossiers propriétaires (tests) ». Le POC n'écrit jamais
// ailleurs. Le vrai dossier des propriétaires n'est lu qu'en lecture seule, par
// `_dossierBienCore.cjs`.
const DEFAULT_FOLDER_ID = '1XY1JgojvBJhHjIq6yHrAQ9p4ek2IzKBn'
const MAX_FILE_SIZE = 25 * 1024 * 1024

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

async function resolvePropertyFolder(propertyNumberInput) {
  const propertyNumber = normalizePropertyNumber(propertyNumberInput)
  const matches = await listPropertyFolders({
    parentFolderId: getTargetFolderId(),
    propertyNumber,
  })

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
    const user = await requireRole(request, ['super_admin'], {
      message: 'Cette page de test est réservée au super-administrateur.',
    })
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
