import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, CheckCircle2, ExternalLink, Images, Loader2, Trash2, XCircle } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabaseClient'

const MAX_SOURCE_SIZE = 30 * 1024 * 1024
const CONCURRENCY = 3

function updateItem(items, id, patch) {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

function putFile(sessionUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', sessionUrl)
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    })
    request.addEventListener('load', () => {
      let data = null
      try {
        data = request.responseText ? JSON.parse(request.responseText) : null
      } catch {
        data = null
      }
      if (request.status >= 200 && request.status < 300 && data?.id) resolve(data)
      else reject(new Error(`Google a refusé l'upload (${request.status || 'réseau'}).`))
    })
    request.addEventListener('error', () => reject(new Error("La connexion à Google a été interrompue.")))
    request.send(file)
  })
}

export default function DriveUploadTest() {
  const navigate = useNavigate()
  const galleryInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const itemsRef = useRef([])
  const [items, setItems] = useState([])
  const [propertyNumber, setPropertyNumber] = useState('7755')
  const [filePrefix, setFilePrefix] = useState('Four')
  const [folderStatus, setFolderStatus] = useState({ loading: true, error: '', folder: null, folderUrl: '' })

  const apiRequest = async (payload) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    if (!accessToken) throw new Error('Votre session a expiré. Reconnectez-vous.')

    const response = await fetch('/api/drive-poc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || `Erreur serveur (${response.status}).`)
    }
    return data
  }

  useEffect(() => {
    let active = true
    const normalizedNumber = propertyNumber.trim()
    if (!normalizedNumber) {
      setFolderStatus({ loading: false, error: 'Saisissez un numéro de bien.', folder: null, folderUrl: '' })
      return () => { active = false }
    }

    setFolderStatus({ loading: true, error: '', folder: null, folderUrl: '' })
    const timeoutId = setTimeout(() => apiRequest({ action: 'resolve-folder', propertyNumber: normalizedNumber })
      .then((data) => {
        if (active) setFolderStatus({ loading: false, error: '', folder: data.folder, folderUrl: data.folderUrl })
      })
      .catch((error) => {
        if (active) setFolderStatus({ loading: false, error: error.message, folder: null, folderUrl: '' })
      }), 350)
    return () => {
      active = false
      clearTimeout(timeoutId)
    }
  }, [propertyNumber])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => () => {
    itemsRef.current.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    })
  }, [])

  const addFiles = (fileList) => {
    const selected = Array.from(fileList || [])
    const accepted = []

    selected.forEach((file) => {
      const id = `${Date.now()}-${crypto.randomUUID()}`
      if (!file.type.startsWith('image/')) {
        accepted.push({ id, file, previewUrl: '', status: 'error', progress: 0, error: 'Ce fichier n’est pas une image.' })
      } else if (file.size > MAX_SOURCE_SIZE) {
        accepted.push({ id, file, previewUrl: URL.createObjectURL(file), status: 'error', progress: 0, error: 'Photo supérieure à 30 Mo.' })
      } else {
        accepted.push({ id, file, previewUrl: URL.createObjectURL(file), status: 'ready', progress: 0, error: '', result: null })
      }
    })

    setItems((current) => [...current, ...accepted])
    if (galleryInputRef.current) galleryInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''

    const uploadable = accepted.filter((item) => item.status === 'ready')
    if (uploadable.length === 0) return
    if (!folderStatus.folder?.id) {
      setItems((current) => current.map((item) => (
        uploadable.some((candidate) => candidate.id === item.id)
          ? { ...item, status: 'error', error: folderStatus.error || 'Le dossier du bien n’est pas encore prêt.' }
          : item
      )))
      return
    }

    const uploadContext = {
      folderId: folderStatus.folder.id,
      propertyNumber: propertyNumber.trim(),
      prefix: filePrefix.trim() || 'Photo-test',
    }
    let cursor = 0
    const workers = Array.from({ length: Math.min(CONCURRENCY, uploadable.length) }, async () => {
      while (cursor < uploadable.length) {
        const item = uploadable[cursor]
        cursor += 1
        await uploadOne(item, uploadContext)
      }
    })
    void Promise.all(workers)
  }

  const removePendingItem = (id) => {
    setItems((current) => {
      const item = current.find((candidate) => candidate.id === id)
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
      return current.filter((candidate) => candidate.id !== id)
    })
  }

  const uploadOne = async (item, uploadContext) => {
    try {
      if (item.uploadedFileId) {
        setItems((current) => updateItem(current, item.id, { status: 'finalizing', progress: 100, error: '' }))
        const finalized = await apiRequest({ action: 'finalize', fileId: item.uploadedFileId })
        setItems((current) => updateItem(current, item.id, {
          status: 'done',
          progress: 100,
          result: finalized.file,
        }))
        return
      }

      setItems((current) => updateItem(current, item.id, { status: 'optimizing', progress: 0, error: '' }))
      const optimized = await imageCompression(item.file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      }).catch(() => item.file)

      setItems((current) => updateItem(current, item.id, { status: 'preparing', optimizedSize: optimized.size }))
      const session = await apiRequest({
        action: 'create-session',
        name: optimized.name || item.file.name,
        mimeType: optimized.type || item.file.type,
        size: optimized.size,
        folderId: uploadContext.folderId,
        propertyNumber: uploadContext.propertyNumber,
        prefix: uploadContext.prefix,
      })

      setItems((current) => updateItem(current, item.id, { status: 'uploading', progress: 0 }))
      const driveFile = await putFile(session.sessionUrl, optimized, (progress) => {
        setItems((current) => updateItem(current, item.id, { progress }))
      })

      setItems((current) => updateItem(current, item.id, {
        status: 'finalizing',
        progress: 100,
        uploadedFileId: driveFile.id,
      }))
      const finalized = await apiRequest({ action: 'finalize', fileId: driveFile.id })
      setItems((current) => updateItem(current, item.id, {
        status: 'done',
        progress: 100,
        result: finalized.file,
      }))
    } catch (error) {
      setItems((current) => updateItem(current, item.id, { status: 'error', error: error.message }))
    }
  }

  const trashFile = async (item) => {
    if (!item.result?.id) return
    setItems((current) => updateItem(current, item.id, { status: 'deleting', error: '' }))
    try {
      await apiRequest({ action: 'trash', fileId: item.result.id })
      setItems((current) => {
        const deletedItem = current.find((candidate) => candidate.id === item.id)
        if (deletedItem?.previewUrl) URL.revokeObjectURL(deletedItem.previewUrl)
        return current.filter((candidate) => candidate.id !== item.id)
      })
    } catch (error) {
      setItems((current) => updateItem(current, item.id, { status: 'done', error: error.message }))
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={18} /> Retour au tableau de bord
        </button>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 bg-slate-950 px-6 py-7 text-white sm:px-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">POC interne</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">Upload direct des photos vers Google Drive</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Cette page n’utilise ni Supabase Storage, ni Make. Les photos partent directement du navigateur vers le dossier Drive de test.
            </p>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Numéro de bien</span>
                <input
                  value={propertyNumber}
                  onChange={(event) => setPropertyNumber(event.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  placeholder="Ex. 7755"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Nom descriptif des photos</span>
                <input
                  value={filePrefix}
                  onChange={(event) => setFilePrefix(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  placeholder="Ex. Four"
                />
                <span className="mt-1 block text-xs text-slate-500">En production, ce préfixe viendra automatiquement du champ photo.</span>
              </label>
            </div>

            <div className={`rounded-xl border p-4 ${folderStatus.loading ? 'border-slate-200 bg-slate-50' : folderStatus.error ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex items-start gap-3">
                {folderStatus.loading ? (
                  <Loader2 className="mt-0.5 animate-spin text-slate-500" size={20} />
                ) : folderStatus.error ? (
                  <XCircle className="mt-0.5 text-red-600" size={20} />
                ) : (
                  <CheckCircle2 className="mt-0.5 text-emerald-600" size={20} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {folderStatus.loading ? 'Recherche du dossier du bien…' : folderStatus.error ? 'Dossier du bien introuvable' : 'Dossier du bien trouvé'}
                  </p>
                  {folderStatus.error ? (
                    <p className="mt-1 text-sm text-red-700">{folderStatus.error}</p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-600">
                      {folderStatus.loading ? `Recherche de ${propertyNumber || '…'} dans 2. Dossiers propriétaires (tests)` : folderStatus.folder?.name}
                    </p>
                  )}
                  {folderStatus.folderUrl && (
                    <a href={folderStatus.folderUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 underline underline-offset-2">
                      Ouvrir ce dossier <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div
              className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-amber-500 hover:bg-amber-50/40"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                addFiles(event.dataTransfer.files)
              }}
            >
              <input
                ref={cameraInputRef}
                id="drive-test-camera"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={folderStatus.loading || Boolean(folderStatus.error)}
                onChange={(event) => addFiles(event.target.files)}
              />
              <input
                ref={galleryInputRef}
                id="drive-test-gallery"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={folderStatus.loading || Boolean(folderStatus.error)}
                onChange={(event) => addFiles(event.target.files)}
              />
              <Images className="mx-auto text-slate-500" size={42} />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Ajouter des photos</h2>
              <p className="mt-1 text-sm text-slate-500">L’envoi commence automatiquement après la prise ou la sélection.</p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <label
                  htmlFor="drive-test-camera"
                  className={`inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-amber-700 ${folderStatus.loading || folderStatus.error ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
                >
                  <Camera size={19} /> Prendre une photo
                </label>
                <label
                  htmlFor="drive-test-gallery"
                  className={`inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white shadow-sm hover:bg-slate-800 ${folderStatus.loading || folderStatus.error ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
                >
                  <Images size={19} /> Choisir dans l’appareil
                </label>
              </div>
            </div>

            {items.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Photos</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  {items.map((item) => (
                    <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="flex gap-4 p-4">
                        <div className="h-24 w-24 flex-none overflow-hidden rounded-lg bg-slate-100">
                          {item.previewUrl ? <img src={item.previewUrl} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900" title={item.result?.name || item.file.name}>
                            {item.result?.name || item.file.name}
                          </p>
                          <p className={`mt-2 flex items-center gap-2 text-sm font-medium ${item.status === 'error' ? 'text-red-700' : item.status === 'done' ? 'text-emerald-700' : 'text-slate-600'}`}>
                            {item.status !== 'done' && item.status !== 'error' && <Loader2 className="animate-spin" size={15} />}
                            {item.status === 'done' && <CheckCircle2 size={16} />}
                            {item.status === 'ready' && 'Préparation…'}
                            {['optimizing', 'preparing', 'uploading', 'finalizing'].includes(item.status) && 'Envoi en cours…'}
                            {item.status === 'done' && 'Photo envoyée'}
                            {item.status === 'deleting' && 'Suppression…'}
                            {item.status === 'error' && item.error}
                          </p>
                        </div>
                      </div>

                      <div className="flex min-h-12 items-center justify-end gap-3 border-t border-slate-100 px-4 py-3">
                        {item.status === 'done' && (
                          <>
                            <a href={item.result.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900">
                              Tester l’URL publique <ExternalLink size={14} />
                            </a>
                            <button type="button" onClick={() => trashFile(item)} className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-800">
                              <Trash2 size={15} /> Supprimer du Drive
                            </button>
                          </>
                        )}
                        {(item.status === 'ready' || item.status === 'error') && (
                          <button type="button" onClick={() => removePendingItem(item.id)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
                            Fermer
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
