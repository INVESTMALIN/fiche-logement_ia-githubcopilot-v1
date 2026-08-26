import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, CheckCircle2, Copy, ExternalLink, FolderSearch, Images, Loader2, RefreshCw, Trash2, XCircle } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabaseClient'

const MAX_SOURCE_SIZE = 30 * 1024 * 1024
const CONCURRENCY = 3

function formatFileSize(bytes) {
  const value = Number(bytes || 0)
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)} Go`
  return `${(value / 1024 ** 2).toFixed(1)} Mo`
}

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
  const [duplicationSourceNumber, setDuplicationSourceNumber] = useState('2155')
  const [duplicationTargetNumber, setDuplicationTargetNumber] = useState('2155-TEST-COPIE')
  const [duplicationState, setDuplicationState] = useState({
    status: 'idle',
    analysis: null,
    job: null,
    error: '',
  })

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

  const resetDuplication = () => {
    setDuplicationState({ status: 'idle', analysis: null, job: null, error: '' })
  }

  const analyzeDuplication = async () => {
    setDuplicationState({ status: 'analyzing', analysis: null, job: null, error: '' })
    try {
      const data = await apiRequest({
        action: 'analyze-duplication',
        sourcePropertyNumber: duplicationSourceNumber.trim(),
        targetPropertyNumber: duplicationTargetNumber.trim(),
      })
      setDuplicationState({ status: 'ready', analysis: data.analysis, job: null, error: '' })
    } catch (error) {
      setDuplicationState({ status: 'error', analysis: null, job: null, error: error.message })
    }
  }

  const copyDuplicationBatches = async (initialJob, analysis) => {
    let currentJob = { ...initialJob, pendingFileIds: initialJob.pendingFileIds || [] }
    setDuplicationState({ status: 'copying', analysis, job: currentJob, error: '' })

    while (currentJob.pendingFileIds.length > 0) {
      const sourceFileIds = currentJob.pendingFileIds.slice(0, 20)
      const data = await apiRequest({
        action: 'copy-duplication-batch',
        jobId: currentJob.id,
        destinationRootId: currentJob.destinationRootId,
        sourcePropertyNumber: currentJob.sourcePropertyNumber,
        targetPropertyNumber: currentJob.targetPropertyNumber,
        sourceFileIds,
      })
      const processedSourceFileIds = new Set(data.job.processedSourceFileIds || [])
      currentJob = {
        ...data.job,
        pendingFileIds: currentJob.pendingFileIds.filter((fileId) => !processedSourceFileIds.has(fileId)),
      }
      setDuplicationState({
        status: currentJob.pendingFileIds.length === 0 && currentJob.done ? 'done' : 'copying',
        analysis,
        job: currentJob,
        error: '',
      })
      if (currentJob.failures?.length > 0) {
        throw new Error(`${currentJob.failures.length} fichier(s) n’ont pas pu être copiés. Vous pouvez reprendre sans créer de doublons.`)
      }
    }

    if (currentJob.done) {
      setDuplicationState({ status: 'done', analysis, job: currentJob, error: '' })
    }
  }

  const startDuplication = async () => {
    const analysis = duplicationState.analysis
    if (!analysis) return
    const confirmed = window.confirm(
      `Créer « ${analysis.destinationName} » et y copier ${analysis.summary.files} fichiers ?`,
    )
    if (!confirmed) return

    setDuplicationState((current) => ({ ...current, status: 'starting', error: '' }))
    try {
      const data = await apiRequest({
        action: 'start-duplication',
        sourcePropertyNumber: duplicationSourceNumber.trim(),
        targetPropertyNumber: duplicationTargetNumber.trim(),
      })
      await copyDuplicationBatches(data.job, analysis)
    } catch (error) {
      setDuplicationState((current) => ({ ...current, status: 'error', error: error.message }))
    }
  }

  const resumeDuplication = async () => {
    if (!duplicationState.job || !duplicationState.analysis) return
    try {
      await copyDuplicationBatches(duplicationState.job, duplicationState.analysis)
    } catch (error) {
      setDuplicationState((current) => ({ ...current, status: 'error', error: error.message }))
    }
  }

  const duplicationBusy = ['analyzing', 'starting', 'copying'].includes(duplicationState.status)
  const duplicationProgress = duplicationState.job?.totalFiles
    ? Math.round((duplicationState.job.copiedFiles / duplicationState.job.totalFiles) * 100)
    : 0

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

            <section className="space-y-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <Copy className="mt-0.5 flex-none text-indigo-700" size={24} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">POC duplication Drive</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Recopier un dossier propriétaire complet</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    L’analyse ne modifie rien. La copie crée ensuite un dossier de test et reproduit son arborescence par petits lots.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">Numéro source existant</span>
                  <input
                    value={duplicationSourceNumber}
                    onChange={(event) => {
                      setDuplicationSourceNumber(event.target.value)
                      resetDuplication()
                    }}
                    inputMode="numeric"
                    disabled={duplicationBusy || Boolean(duplicationState.job)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100"
                    placeholder="Ex. 2155"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">Numéro du dossier de test</span>
                  <input
                    value={duplicationTargetNumber}
                    onChange={(event) => {
                      setDuplicationTargetNumber(event.target.value)
                      resetDuplication()
                    }}
                    disabled={duplicationBusy || Boolean(duplicationState.job)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100"
                    placeholder="Ex. 2155-TEST-COPIE"
                  />
                  <span className="mt-1 block text-xs text-slate-500">La cible doit contenir TEST. Un dossier existant ne sera jamais remplacé.</span>
                </label>
              </div>

              {!duplicationState.analysis && !duplicationState.job && (
                <button
                  type="button"
                  onClick={analyzeDuplication}
                  disabled={duplicationBusy || !duplicationSourceNumber.trim() || !duplicationTargetNumber.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {duplicationState.status === 'analyzing' ? <Loader2 className="animate-spin" size={18} /> : <FolderSearch size={18} />}
                  {duplicationState.status === 'analyzing' ? 'Analyse en cours…' : 'Analyser la duplication'}
                </button>
              )}

              {duplicationState.analysis && (
                <div className="space-y-4 rounded-xl border border-indigo-200 bg-white p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Analyse terminée, aucune écriture effectuée</p>
                      <p className="mt-1 font-semibold text-slate-950">{duplicationState.analysis.sourceFolder.name}</p>
                      <p className="mt-1 text-sm text-slate-600">Future copie : {duplicationState.analysis.destinationName}</p>
                    </div>
                    <a
                      href={duplicationState.analysis.sourceFolderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                    >
                      Ouvrir la source <ExternalLink size={14} />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Dossiers</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{duplicationState.analysis.summary.folders}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Fichiers</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{duplicationState.analysis.summary.files}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Volume</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{formatFileSize(duplicationState.analysis.summary.totalBytes)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Éléments à créer</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{duplicationState.analysis.summary.estimatedWriteCalls}</p>
                    </div>
                  </div>

                  {duplicationState.analysis.summary.blockedFiles.length > 0 ? (
                    <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
                      {duplicationState.analysis.summary.blockedFiles.length} fichier(s) ne peuvent pas être copiés. Le lancement restera bloqué.
                    </p>
                  ) : (
                    <p className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                      Tous les fichiers sont copiables par le compte technique.
                    </p>
                  )}

                  {!duplicationState.job && duplicationState.status !== 'done' && (
                    <button
                      type="button"
                      onClick={startDuplication}
                      disabled={duplicationBusy || duplicationState.analysis.summary.blockedFiles.length > 0}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {duplicationState.status === 'starting' ? <Loader2 className="animate-spin" size={18} /> : <Copy size={18} />}
                      {duplicationState.status === 'starting' ? 'Création de l’arborescence…' : 'Lancer la copie réelle'}
                    </button>
                  )}
                </div>
              )}

              {duplicationState.job && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">
                      {duplicationState.status === 'done' ? 'Duplication terminée' : 'Copie des fichiers'}
                    </p>
                    <p className="text-sm font-semibold text-slate-600">{duplicationState.job.copiedFiles} / {duplicationState.job.totalFiles}</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${duplicationProgress}%` }} />
                  </div>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <p className="text-sm text-slate-600">
                      {duplicationState.status === 'done' ? 'Tous les dossiers et fichiers ont été recopiés.' : `${duplicationProgress} %, vous pouvez laisser cette page ouverte.`}
                    </p>
                    <a href={duplicationState.job.destinationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                      Ouvrir la copie <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              )}

              {duplicationState.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="flex items-start gap-2 text-sm font-medium text-red-700"><XCircle className="mt-0.5 flex-none" size={17} /> {duplicationState.error}</p>
                  {duplicationState.job ? (
                    <button type="button" onClick={resumeDuplication} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
                      <RefreshCw size={16} /> Reprendre sans doublons
                    </button>
                  ) : (
                    <button type="button" onClick={analyzeDuplication} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-900">
                      <RefreshCw size={16} /> Réessayer l’analyse
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
