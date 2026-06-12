import { useState, useRef, useEffect } from 'react'
import { Mic, FolderOpen, Diff, CheckCircle, AlertCircle, Loader2, ChevronDown, TriangleAlert, Construction, HelpCircle, X, Sparkles } from 'lucide-react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_VOICE_INVENTORY

// Taille maximum acceptée pour un fichier audio uploadé (25 Mo).
// Garde-fou anti-régression : empêche l'envoi d'une vraie vidéo MP4 lourde qui
// ferait exploser Make et Gemini en aval. Les notes vocales (même au format MP4
// audio-only) ne pèsent que quelques Mo, on est donc très large.
const MAX_AUDIO_SIZE_MB = 25
const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024

// Formats proposés au sélecteur de fichier.
// `audio/*` couvre les audios "purs" (MP3, M4A, WAV...). On ajoute explicitement
// `.mp4` / `video/mp4` car les notes vocales WhatsApp iPhone sont encapsulées dans
// un conteneur MP4 audio-only que Windows classe en `video/mp4` : sans cet ajout,
// le dialog navigateur les masque. `.m4a` est ajouté par sécurité (MIME variable
// selon l'OS).
const AUDIO_ACCEPT = 'audio/*,video/mp4,.mp4,.m4a'

// Défini hors du composant pour éviter un nouveau type à chaque render (anti-pattern React)
function CounterInput({ label, value, onCounterClick }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <label className="text-sm text-gray-700 flex-1">
        {label}
      </label>
      <div className="flex items-center gap-2 ml-4">
        <button
          type="button"
          onClick={(e) => onCounterClick(-1, e)}
          className="w-8 h-8 rounded-full bg-gray-500 hover:bg-gray-600 text-white flex items-center justify-center text-lg font-semibold"
          style={{ touchAction: 'manipulation' }}
        >
          −
        </button>
        <span className="w-12 text-center font-semibold text-lg">
          {value || 0}
        </span>
        <button
          type="button"
          onClick={(e) => onCounterClick(1, e)}
          className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-lg font-semibold"
          style={{ touchAction: 'manipulation' }}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function FicheCuisine2() {
  const {
    next,
    back,
    currentStep,
    totalSteps,
    formData: allFormData,
    getField,
    updateField,
    handleSave,
    saveStatus
  } = useForm()

  // Lecture directe depuis le state React du contexte (pas via getField) pour une réactivité garantie
  const formData = allFormData?.section_cuisine_2 || {}

  const handleInputChange = (field, value) => {
    updateField(`section_cuisine_2.${field}`, value)
  }

  const handleRadioChange = (field, value) => {
    updateField(`section_cuisine_2.${field}`, value === 'true' ? true : (value === 'false' ? false : null))
  }

  const handleCounterClick = (increment, e, fieldPath) => {
    e.preventDefault()
    e.stopPropagation()

    const currentValue = getField(fieldPath) || 0
    const newValue = Math.max(0, currentValue + increment)
    updateField(fieldPath, newValue)
  }

  // Listes des ustensiles par catégorie
  const vaisselle = [
    { key: 'vaisselle_assiettes_plates', label: 'Assiettes plates' },
    { key: 'vaisselle_assiettes_dessert', label: 'Assiettes à dessert' },
    { key: 'vaisselle_assiettes_creuses', label: 'Assiettes creuses' },
    { key: 'vaisselle_bols', label: 'Bols' }
  ]

  const couverts = [
    { key: 'couverts_verres_eau', label: 'Verres à eau' },
    { key: 'couverts_verres_vin', label: 'Verres à vin' },
    { key: 'couverts_tasses', label: 'Tasses' },
    { key: 'couverts_flutes_champagne', label: 'Flûtes à champagne' },
    { key: 'couverts_mugs', label: 'Mugs' },
    { key: 'couverts_couteaux_table', label: 'Couteaux de table' },
    { key: 'couverts_fourchettes', label: 'Fourchettes' },
    { key: 'couverts_couteaux_steak', label: 'Couteaux à steak' },
    { key: 'couverts_cuilleres_soupe', label: 'Cuillères à soupe' },
    { key: 'couverts_cuilleres_cafe', label: 'Cuillères à café' },
    { key: 'couverts_cuilleres_dessert', label: 'Cuillères à dessert' }
  ]

  // 🟢 USTENSILES OBLIGATOIRES (selon demande Victoria)
  const ustensilesObligatoires = [
    { key: 'ustensiles_poeles_differentes_tailles', label: 'Poêles de différentes tailles' },
    { key: 'ustensiles_casseroles_differentes_tailles', label: 'Casseroles de différentes tailles' },
    { key: 'ustensiles_couvercle_anti_eclaboussures', label: 'Couvercle anti-éclaboussures' },
    { key: 'ustensiles_couteaux_cuisine', label: 'Couteaux de cuisine' },
    { key: 'ustensiles_ecumoire', label: 'Écumoire' },
    { key: 'ustensiles_spatules', label: 'Spatules' },
    { key: 'ustensiles_ouvre_boite', label: 'Ouvre-boîte' },
    { key: 'ustensiles_tire_bouchon', label: 'Tire-bouchon' },
    { key: 'ustensiles_econome', label: 'Économe' },
    { key: 'ustensiles_passoire', label: 'Passoire' },
    { key: 'ustensiles_planche_decouper', label: 'Planche à découper' }
  ]

  // 🔵 USTENSILES FACULTATIFS (tous les autres)
  const ustensilesFacultatifs = [
    { key: 'ustensiles_faitouts', label: 'Faitouts' },
    { key: 'ustensiles_wok', label: 'Wok' },
    { key: 'ustensiles_cocotte_minute', label: 'Cocotte-minute' },
    { key: 'ustensiles_robot_cuisine', label: 'Robot de cuisine' },
    { key: 'ustensiles_batteur_electrique', label: 'Batteur électrique' },
    { key: 'ustensiles_rape', label: 'Râpe' },
    { key: 'ustensiles_rouleau_patisserie', label: 'Rouleau à pâtisserie' },
    { key: 'ustensiles_ciseaux_cuisine', label: 'Ciseaux de cuisine' },
    { key: 'ustensiles_balance_cuisine', label: 'Balance de cuisine' },
    { key: 'ustensiles_bac_glacon', label: 'Bac à glaçon' },
    { key: 'ustensiles_pince_cuisine', label: 'Pince de cuisine' },
    { key: 'ustensiles_couteau_huitre', label: 'Couteau à huître' },
    { key: 'ustensiles_verre_mesureur', label: 'Verre mesureur' },
    { key: 'ustensiles_presse_agrume_manuel', label: 'Presse-agrume manuel' },
    { key: 'ustensiles_pichet', label: 'Pichet' }
  ]

  const platsRecipients = [
    { key: 'plats_dessous_plat', label: 'Dessous de plat' },
    { key: 'plats_plateau', label: 'Plateau' },
    { key: 'plats_saladiers', label: 'Saladiers' },
    { key: 'plats_a_four', label: 'Plats à four' },
    { key: 'plats_carafes', label: 'Carafes' },
    { key: 'plats_moules', label: 'Moules' },
    { key: 'plats_theiere', label: 'Théière' },
    { key: 'plats_cafetiere_piston_filtre', label: 'Cafetière (piston ou filtre)' },
    { key: 'plats_ustensiles_barbecue', label: 'Ustensiles de barbecue' },
    { key: 'plats_gants_cuisine', label: 'Gants de cuisine' },
    { key: 'plats_maniques', label: 'Maniques' }
  ]

  // --- Mode state ---
  // Saisie manuelle ouverte par défaut : accès direct aux compteurs sans clic supplémentaire
  const [manualExpanded, setManualExpanded] = useState(true)
  // Aide "Comment utiliser la saisie vocale" — repliée par défaut
  const [howItWorksExpanded, setHowItWorksExpanded] = useState(false)

  // --- Vocal mode state ---
  const [vocalSubMode, setVocalSubMode] = useState('micro') // 'micro' | 'upload'
  const [isRecording, setIsRecording] = useState(false)
  const [vocalStatus, setVocalStatus] = useState(null) // 'processing' | 'success' | 'error'
  const [vocalError, setVocalError] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  // Auto-dismiss du message d'erreur vocal après 6 s + fermeture manuelle via la croix.
  // Le timer est mémorisé pour pouvoir être annulé (nouvelle erreur, clic croix, démontage) — évite les timers orphelins.
  const vocalErrorTimerRef = useRef(null)

  const showVocalError = (message) => {
    // Annule un éventuel timer en cours avant d'en armer un nouveau (cas : deux erreurs rapprochées).
    if (vocalErrorTimerRef.current) {
      clearTimeout(vocalErrorTimerRef.current)
    }
    setVocalError(message)
    setVocalStatus('error')
    vocalErrorTimerRef.current = setTimeout(() => {
      setVocalStatus(null)
      setVocalError(null)
      vocalErrorTimerRef.current = null
    }, 6000)
  }

  const dismissVocalError = () => {
    if (vocalErrorTimerRef.current) {
      clearTimeout(vocalErrorTimerRef.current)
      vocalErrorTimerRef.current = null
    }
    setVocalStatus(null)
    setVocalError(null)
  }

  // Nettoyage au démontage du composant pour éviter un setState sur composant démonté si l'utilisateur quitte la page pendant le délai.
  useEffect(() => {
    return () => {
      if (vocalErrorTimerRef.current) {
        clearTimeout(vocalErrorTimerRef.current)
      }
    }
  }, [])

  const [uploadFile, setUploadFile] = useState(null)

  // --- Mic handlers ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await sendAudio(blob, 'recording.webm')
      }

      mediaRecorder.start()
      setIsRecording(true)
      // Annule proprement un éventuel timer d'erreur encore actif avant l'enregistrement
      // (même cas que côté upload : éviter qu'il se réveille pendant le 'processing'
      // déclenché au relâchement et masque le spinner).
      dismissVocalError()
    } catch (err) {
      setVocalError('Impossible d\'accéder au microphone : ' + err.message)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setVocalStatus('processing')
    }
  }

  // --- Upload handlers ---
  const handleFileChange = (e) => {
    const file = e.target.files[0] || null

    // Garde-fou taille : rejet dès la sélection du fichier (feedback immédiat +
    // protection du pipeline aval contre une vraie vidéo MP4 lourde).
    if (file && file.size > MAX_AUDIO_SIZE_BYTES) {
      const sizeMo = (file.size / (1024 * 1024)).toFixed(1).replace('.', ',')
      setUploadFile(null)
      e.target.value = '' // permet de re-sélectionner le même fichier après correction
      showVocalError(`Fichier trop volumineux (${sizeMo} Mo). Taille maximum acceptée : ${MAX_AUDIO_SIZE_MB} Mo.`)
      return
    }

    // Nouvelle sélection valide : on réinitialise l'état vocal
    setUploadFile(file)
    dismissVocalError()
  }

  const handleUploadSend = async () => {
    if (!uploadFile) return
    // Annule proprement un éventuel timer d'erreur encore actif AVANT de passer en
    // 'processing' : sinon il pourrait se réveiller pendant l'envoi et masquer le
    // spinner (cas : erreur affichée, puis nouvel envoi valide dans les 6 s).
    dismissVocalError()
    setVocalStatus('processing')
    await sendAudio(uploadFile, uploadFile.name)
  }

  // --- Shared send + field update ---
  const sendAudio = async (blob, filename) => {
    const formPayload = new FormData()
    formPayload.append('audio', blob, filename)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: formPayload,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const contentType = response.headers.get('content-type') || ''
      const rawBody = await response.text()
      console.log('[FicheCuisine2/vocal] status:', response.status, '| content-type:', contentType, '| body brut:', rawBody)

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`)
      }

      // Tenter le parsing JSON quelle que soit le content-type
      // (Make.com renvoie souvent text/plain même pour un body JSON)
      let parsed = null
      try { parsed = JSON.parse(rawBody) } catch { /* not JSON */ }

      if (parsed && typeof parsed === 'object') {
        if (Object.keys(parsed).length === 0) {
          showVocalError('Aucun ustensile détecté, veuillez vérifier votre micro.')
          return
        }
        // Appliquer chaque clé dans section_cuisine_2
        Object.entries(parsed).forEach(([key, value]) => {
          if (key === 'autres_ustensiles_vocal') {
            const current = getField('section_cuisine_2.autres_ustensiles') || ''
            const updated = current.trim() ? current + ', ' + value : String(value)
            updateField('section_cuisine_2.autres_ustensiles', updated)
          } else {
            updateField(`section_cuisine_2.${key}`, value)
          }
        })
        console.log('[vocal] JSON reçu:', parsed)
        // Ouvrir le mode manuel pour que l'utilisateur voie les compteurs mis à jour
        setManualExpanded(true)
      }

      setVocalStatus('success')
    } catch (err) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        showVocalError('Timeout : pas de réponse après 30 secondes.')
      } else {
        showVocalError(err.message || 'Erreur inconnue.')
      }
    }
  }

  const webhookMissing = !WEBHOOK_URL

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />

      <div className="flex-1 flex flex-col">
        <ProgressBar />

        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Cuisine - Ustensiles</h1>

          <div className="bg-white p-6 rounded-lg shadow space-y-8">

            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Inventaire cuisine</h2>
              <p className="text-gray-600 mb-6">
                Quels ustensiles et équipements de cuisine sont disponibles dans le logement ?
              </p>
            </div>

            {/* ===================== MODE VOCAL ===================== */}
            <div className="border border-blue-200 rounded-xl overflow-hidden">
              <div className="bg-blue-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-blue-700 flex-shrink-0" />
                  <span className="text-base font-semibold text-blue-800">Saisie vocale</span>
                </div>
                <span className="mt-1.5 text-xs font-medium text-green-800 bg-green-100 border border-green-300 px-2 py-0.5 rounded inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 flex-shrink-0" />
                  Nouvelle fonctionnalité
                </span>
              </div>

              <div className="p-4 space-y-4">
                {/* Note DEV discrète */}
                <p className="text-xs text-gray-500">
                  La saisie vocale peut encore avoir de petits bugs. En cas de souci, vous pouvez utiliser la saisie manuelle ci-dessous à tout moment.{' '}
                  <a
                    href="/aide-micro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline hover:text-blue-900"
                  >
                    Besoin d'aide avec le micro&nbsp;?
                  </a>
                </p>

                {/* Aide "Comment ça marche" — repliable */}
                <div className="border border-blue-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setHowItWorksExpanded((prev) => !prev)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 transition-colors"
                    aria-expanded={howItWorksExpanded}
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-700" />
                      <span className="text-sm font-semibold text-blue-800">Comment utiliser la saisie vocale</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-blue-700 transition-transform ${howItWorksExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {howItWorksExpanded && (
                    <div className="px-4 py-3 bg-white space-y-3">
                      <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                        <li>
                          <strong>Autorisez l'accès au micro</strong> quand votre navigateur le demande.{' '}
                          <a
                            href="/aide-micro"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 underline hover:text-blue-900"
                          >
                            Besoin d'aide&nbsp;?
                          </a>
                        </li>
                        <li>Appuyez et <strong>maintenez le bouton enfoncé</strong> pour parler. Relâchez pour envoyer.</li>
                        <li>Vous pouvez faire l'inventaire <strong>en plusieurs fois</strong>. À chaque enregistrement, les ustensiles détectés s'ajoutent à ceux déjà saisis.</li>
                        <li>Énumérez naturellement, ex : « j'ai 4 assiettes plates, 2 bols, une cocotte-minute, un économe... ».</li>
                        <li>Vous pouvez aussi <strong>uploader un fichier audio</strong> au lieu d'enregistrer en direct.</li>
                        <li>Les ustensiles se mettent à jour automatiquement ci-dessous.</li>
                        <li>La saisie manuelle ci-dessous reste disponible pour ajuster les quantités après coup.</li>
                      </ul>
                      <p className="text-sm text-purple-800 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                        Cette fonctionnalité est en <strong>version bêta</strong>. Testez-la sans hésiter, vos retours nous sont précieux pour l'améliorer.
                      </p>
                    </div>
                  )}
                </div>

                {webhookMissing ? (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Webhook non configuré — ajoutez <code>VITE_WEBHOOK_VOICE_INVENTORY</code> dans votre fichier <code>.env</code>.</span>
                  </div>
                ) : (
                  <>
                    {/* Sub-mode toggle */}
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 w-fit">
                      <button
                        type="button"
                        onClick={() => setVocalSubMode('micro')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${vocalSubMode === 'micro'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        <Mic className="w-4 h-4 shrink-0" /> Micro
                      </button>
                      <button
                        type="button"
                        onClick={() => setVocalSubMode('upload')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${vocalSubMode === 'upload'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        <FolderOpen className="w-4 h-4 shrink-0" /> Fichier
                      </button>
                    </div>

                    {/* Micro panel */}
                    {vocalSubMode === 'micro' && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-500">
                          Appuyez pour démarrer l'enregistrement, relâchez pour envoyer.
                        </p>
                        <button
                          type="button"
                          onMouseDown={startRecording}
                          onMouseUp={stopRecording}
                          onTouchStart={(e) => { e.preventDefault(); startRecording() }}
                          onTouchEnd={(e) => { e.preventDefault(); stopRecording() }}
                          disabled={vocalStatus === 'processing'}
                          className={`flex items-center justify-center gap-3 w-full py-4 rounded-lg font-medium text-white transition-colors select-none ${isRecording
                            ? 'bg-red-500 hover:bg-red-600'
                            : vocalStatus === 'processing'
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                            }`}
                        >
                          {isRecording && (
                            <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                          )}
                          {isRecording
                            ? 'Enregistrement en cours… (relâchez pour envoyer)'
                            : vocalStatus === 'processing'
                              ? 'Envoi en cours…'
                              : 'Appuyer pour parler'}
                        </button>
                      </div>
                    )}

                    {/* Upload panel */}
                    {vocalSubMode === 'upload' && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-500">
                          Sélectionnez un fichier audio puis cliquez sur Envoyer.
                          <br />
                          <span className="text-xs">
                            Formats acceptés : audio classiques (MP3, M4A, WAV…) et notes vocales WhatsApp iPhone (MP4 audio). Taille maximum : {MAX_AUDIO_SIZE_MB} Mo.
                          </span>
                        </p>
                        <input
                          type="file"
                          accept={AUDIO_ACCEPT}
                          onChange={handleFileChange}
                          className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <button
                          type="button"
                          onClick={handleUploadSend}
                          disabled={!uploadFile || vocalStatus === 'processing'}
                          className="w-full py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          {vocalStatus === 'processing' ? 'Envoi en cours…' : 'Envoyer'}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Status feedback */}
                {vocalStatus === 'processing' && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Loader2 className="animate-spin h-4 w-4" />
                    Traitement en cours…
                  </div>
                )}
                {vocalStatus === 'error' && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {/* `flex-1 min-w-0` : le texte prend toute la largeur dispo et peut wrap sans pousser la croix hors du bloc */}
                    <span className="flex-1 min-w-0">{vocalError}</span>
                    {/* `shrink-0` : la croix garde sa taille, `p-1 -m-1` : zone cliquable confortable au doigt sans casser l'alignement visuel */}
                    <button
                      type="button"
                      onClick={dismissVocalError}
                      className="shrink-0 -mt-1 -mr-1 p-1 rounded text-red-700 hover:bg-red-100 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-300"
                      aria-label="Fermer le message d'erreur"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {vocalStatus === 'success' && (
                  <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Champs mis à jour
                  </div>
                )}
              </div>
            </div>

            {/* ===================== MODE MANUEL ===================== */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setManualExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Diff className="w-4 h-4 text-gray-500" />
                  <span className="text-base font-semibold text-gray-700">Saisie manuelle</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${manualExpanded ? 'rotate-180' : ''}`} />
              </button>

              {manualExpanded && (
                <div className="p-4 space-y-8">

                  {/* VAISSELLE */}
                  <div>
                    <h2 className="text-lg font-semibold mb-4 text-blue-800">Vaisselle :</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {vaisselle.map(({ key, label }) => (
                        <CounterInput
                          key={key}
                          label={label}
                          value={formData[key]}
                          onCounterClick={(increment, e) => handleCounterClick(increment, e, `section_cuisine_2.${key}`)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* COUVERTS */}
                  <div>
                    <h2 className="text-lg font-semibold mb-4 text-blue-800">Couverts :</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {couverts.map(({ key, label }) => (
                        <CounterInput
                          key={key}
                          label={label}
                          value={formData[key]}
                          onCounterClick={(increment, e) => handleCounterClick(increment, e, `section_cuisine_2.${key}`)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 🟢 USTENSILES DE CUISINE OBLIGATOIRES */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-lg font-semibold text-green-700">🟢 Ustensiles de cuisine obligatoires :</h2>
                      <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                        Indispensables
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                      {ustensilesObligatoires.map(({ key, label }) => (
                        <CounterInput
                          key={key}
                          label={label}
                          value={formData[key]}
                          onCounterClick={(increment, e) => handleCounterClick(increment, e, `section_cuisine_2.${key}`)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 🔵 USTENSILES DE CUISINE FACULTATIFS */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-lg font-semibold text-blue-700">🔵 Ustensiles de cuisine facultatifs :</h2>
                      <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Optionnels
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      {ustensilesFacultatifs.map(({ key, label }) => (
                        <CounterInput
                          key={key}
                          label={label}
                          value={formData[key]}
                          onCounterClick={(increment, e) => handleCounterClick(increment, e, `section_cuisine_2.${key}`)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* PLATS ET RÉCIPIENTS */}
                  <div>
                    <h2 className="text-lg font-semibold mb-4 text-blue-800">Plats et récipients :</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {platsRecipients.map(({ key, label }) => (
                        <CounterInput
                          key={key}
                          label={label}
                          value={formData[key]}
                          onCounterClick={(increment, e) => handleCounterClick(increment, e, `section_cuisine_2.${key}`)}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* CHAMPS COMPLÉMENTAIRES */}
            <div className="space-y-6">

              {/* Autres ustensiles */}
              <div>
                <label className="block font-semibold mb-2">
                  Ustensiles Cuisine - Autres ?
                </label>
                <textarea
                  placeholder="Précisez les autres ustensiles ou équipements disponibles dans votre cuisine."
                  className="w-full p-3 border rounded h-24"
                  value={formData.autres_ustensiles || ''}
                  onChange={(e) => handleInputChange('autres_ustensiles', e.target.value)}
                />
              </div>

              {/* Quantité suffisante */}
              <div>
                <label className="block font-semibold mb-3">
                  La quantité d'ustensiles est-elle suffisante ?
                </label>
                <div className="flex gap-6">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="quantite_suffisante"
                      value="true"
                      checked={formData.quantite_suffisante === true}
                      onChange={(e) => handleRadioChange('quantite_suffisante', e.target.value)}
                      className="form-radio text-blue-600"
                    />
                    <span className="text-sm">Oui</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="quantite_suffisante"
                      value="false"
                      checked={formData.quantite_suffisante === false}
                      onChange={(e) => handleRadioChange('quantite_suffisante', e.target.value)}
                      className="form-radio text-blue-600"
                    />
                    <span className="text-sm">Non</span>
                  </label>
                </div>
              </div>

              {/* Champ conditionnel si quantité insuffisante */}
              {formData.quantite_suffisante === false && (
                <div className="border-l-4 border-red-400 pl-6 space-y-4">
                  <div>
                    <label className="block font-semibold mb-2 text-red-700">
                      Quels ustensiles manquent-ils ?
                    </label>
                    <textarea
                      placeholder="Détaillez les ustensiles manquants et les quantités nécessaires."
                      className="w-full p-3 border rounded h-24"
                      value={formData.quantite_insuffisante_details || ''}
                      onChange={(e) => handleInputChange('quantite_insuffisante_details', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Casseroles et poêles testées */}
              <div>
                <label className="block font-semibold mb-3">
                  Avez-vous testé les casseroles et poêles (revêtement, compatibilité plaque de cuisson) ?
                </label>
                <div className="flex gap-6">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="casseroles_poeles_testees"
                      value="true"
                      checked={formData.casseroles_poeles_testees === true}
                      onChange={(e) => handleRadioChange('casseroles_poeles_testees', e.target.value)}
                      className="form-radio text-blue-600"
                    />
                    <span className="text-sm">Oui</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="casseroles_poeles_testees"
                      value="false"
                      checked={formData.casseroles_poeles_testees === false}
                      onChange={(e) => handleRadioChange('casseroles_poeles_testees', e.target.value)}
                      className="form-radio text-blue-600"
                    />
                    <span className="text-sm">Non</span>
                  </label>
                </div>
              </div>

              {/* Photos tiroirs et placards */}
              <div className="border-t pt-6">
                <PhotoUpload
                  fieldPath="section_cuisine_2.photos_tiroirs_placards"
                  label="Photos des tiroirs et placards de cuisine (ustensiles, vaisselle, rangement)"
                  multiple={true}
                  maxFiles={30}
                />
              </div>

            </div>
          </div>

          {/* Messages de sauvegarde */}
          {saveStatus.saving && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              ⏳ Sauvegarde en cours...
            </div>
          )}
          {saveStatus.saved && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              ✅ Sauvegardé avec succès !
            </div>
          )}
          {saveStatus.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              ❌ {saveStatus.error}
            </div>
          )}

          {/* Boutons de navigation */}
          <div className="mt-6 flex justify-between">
            <Button
              variant="ghost"
              onClick={back}
              disabled={currentStep === 0}
            >
              Retour
            </Button>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleSave}
                disabled={saveStatus.saving}
              >
                {saveStatus.saving ? 'Sauvegarde...' : 'Enregistrer'}
              </Button>
              <Button
                variant="primary"
                onClick={next}
                disabled={currentStep === totalSteps - 1}
              >
                Suivant
              </Button>
            </div>
          </div>
        </div>
        <div className="h-20"></div>
      </div>
    </div>
  )
}
