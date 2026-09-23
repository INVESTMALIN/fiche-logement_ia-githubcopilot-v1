// src/components/PhotoUpload.jsx
import React, { useState } from 'react'
import { useForm } from './FormContext'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabaseClient'
import { normalizePhotoField } from '../lib/photoHelpers'
import {
  VIDEO_GUIDE_ACCES_DELAI_COMPRESSION_MS,
  VIDEO_GUIDE_ACCES_POLL_MS,
  AVERTISSEMENT_VIDEO_GUIDE,
  doitCompresserVideoGuide,
  lireEtatJobCompression,
  choisirVideoGuide,
  estMemeFiche
} from '../lib/videoGuideAcces'
import imageCompression from 'browser-image-compression'

const COMPRESS_VIDEO_URL = 'https://video-compressor-production.up.railway.app/compress-video'
// Mode cible : compression asynchrone (job + polling), voir videoGuideAcces.js
const COMPRESS_VIDEO_JOBS_URL = `${COMPRESS_VIDEO_URL}/jobs`

const attendre = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
  const t = setTimeout(resolve, ms)
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
})

const sanitizeFileName = (fileName) => {
  return fileName
    .normalize('NFD')                    // Décompose les accents (é → e + ´)
    .replace(/[\u0300-\u036f]/g, '')     // Supprime les accents
    .replace(/\s+/g, '_')                // Remplace espaces par underscore
    .replace(/[^a-zA-Z0-9._-]/g, '_')    // Remplace caractères spéciaux par underscore
    .replace(/_+/g, '_')                 // Évite les underscores multiples
    .replace(/^_|_$/g, '')               // Enlève underscores en début/fin
}

const PhotoWithFallback = ({ photoUrl, index }) => {
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div className="w-full h-24 rounded-lg border bg-gray-50 flex flex-col items-center justify-center gap-1">
        <span className="text-lg">📁</span>
        <span className="text-xs text-gray-400">Archivée sur Drive</span>
      </div>
    )
  }

  return (
    <img
      src={photoUrl}
      alt={`Photo ${index + 1}`}
      className="w-full h-24 object-cover rounded-lg border shadow-sm"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

const PhotoUpload = ({
  fieldPath,           // ex: "section_equipements.poubelle_photos"
  label,               // ex: "Photos du local poubelle"
  multiple = true,     // Plusieurs photos ou une seule
  maxFiles = 10,       // Limite nombre de fichiers
  capture = false,      // Activer capture mobile
  acceptVideo = false,  // Autoriser les vidéos (optionnel)
  // 🎯 OPT-IN « cible livret » (Guide d'accès uniquement). Les deux props
  // vont ensemble. Sans elles, les vidéos suivent le chemin historique
  // (seuil 95 Mo, aucun avertissement) — c'est le cas des 33 autres champs.
  videoTargetSizeBytes = null,   // Cible de taille en octets : au-dessus, Railway est appelé avec targetSizeBytes
  videoWarningFieldPath = null   // Champ FormContext où persister l'avertissement (null = rien à signaler)
}) => {
  const { getField, getFieldLive, updateField, handleSave, declarerMediaEnVol, terminerMediaEnVol } = useForm()
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [backendCompressing, setBackendCompressing] = useState(false)
  const [error, setError] = useState(null)

  // Récupérer les photos actuelles (normalise les cas string JSON / URL unique)
  const currentPhotos = normalizePhotoField(getField(fieldPath))
  // Génération du path pour Supabase Storage
  const generateStoragePath = (fileName) => {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substr(2, 6)
    const [section, field] = fieldPath.split('.')

    const numeroBien = getField('section_logement.numero_bien') || `temp-${timestamp}`

    // 🧹 NETTOYER LE NOM DE FICHIER
    const cleanFileName = sanitizeFileName(fileName)

    return `user-${user.id}/fiche-${numeroBien}/${section}/${field}/${timestamp}_${randomId}_${cleanFileName}`
  }



  // 🔧 FONCTION COMPRESSION VIDÉO AVEC AUDIO - Version corrigée

  const compressVideo = async (file) => {
    return new Promise((resolve, reject) => {
      // Si la vidéo fait moins de 100MB (95MB par sécurité), on ne compresse pas
      const seuil95MB = 95 * 1024 * 1024
      if (file.size <= seuil95MB) {
        console.log(`📹 Vidéo ${file.name} sous seuil 95MB, pas de compression`)
        resolve(file)
        return
      }

      console.log(`📹 Compression vidéo ${file.name}: ${(file.size / 1024 / 1024).toFixed(1)}MB`)

      // 🚨 ACTIVER LE FEEDBACK COMPRESSION
      setCompressing(true)

      // Créer les éléments nécessaires
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      video.crossOrigin = 'anonymous'
      video.muted = false // ← IMPORTANT: ne pas muter pour garder l'audio
      video.playsInline = true

      video.onloadedmetadata = async () => {
        try {
          // Calculer les nouvelles dimensions (moins agressif)
          let { videoWidth, videoHeight } = video
          const maxDimension = 1600 // Moins agressif: 1600px au lieu de 1280px

          if (videoWidth > maxDimension || videoHeight > maxDimension) {
            const aspectRatio = videoWidth / videoHeight
            if (videoWidth > videoHeight) {
              videoWidth = maxDimension
              videoHeight = Math.round(maxDimension / aspectRatio)
            } else {
              videoHeight = maxDimension
              videoWidth = Math.round(maxDimension * aspectRatio)
            }
          }

          canvas.width = videoWidth
          canvas.height = videoHeight

          // 🎵 RÉCUPÉRER L'AUDIO du fichier original
          const audioContext = new AudioContext()
          const arrayBuffer = await file.arrayBuffer()
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

          // Créer un stream audio depuis le buffer
          const audioStream = new MediaStream()
          const source = audioContext.createBufferSource()
          source.buffer = audioBuffer

          const destination = audioContext.createMediaStreamDestination()
          source.connect(destination)

          // Ajouter les tracks audio au stream
          destination.stream.getAudioTracks().forEach(track => {
            audioStream.addTrack(track)
          })

          // 📹 RÉCUPÉRER LA VIDÉO compressée du canvas
          const videoStream = canvas.captureStream(30) // 30 FPS pour meilleure qualité

          // 🎬 COMBINER audio + vidéo
          const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks()
          ])

          // Configurer MediaRecorder avec paramètres moins agressifs
          const mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp8,opus', // ← VP8 video + Opus audio
            videoBitsPerSecond: 4000000, // 4 Mbps au lieu de 2 Mbps
            audioBitsPerSecond: 128000   // 128 kbps pour l'audio
          })

          const chunks = []
          let currentTime = 0
          const frameRate = 1 / 30 // 30 FPS

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data)
            }
          }

          mediaRecorder.onstop = () => {
            const compressedBlob = new Blob(chunks, { type: 'video/webm' })

            // Créer un nouveau File
            const compressedFile = new File([compressedBlob],
              file.name.replace(/\.[^/.]+$/, '.webm'), {
              type: 'video/webm',
              lastModified: Date.now()
            })

            const reduction = ((file.size - compressedFile.size) / file.size * 100).toFixed(1)
            console.log(`📹 Compression terminée: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB (-${reduction}%)`)

            // 🚨 DÉSACTIVER LE FEEDBACK COMPRESSION
            setCompressing(false)

            // Nettoyer
            audioContext.close()
            resolve(compressedFile)
          }

          // Démarrer l'audio ET l'enregistrement
          source.start(0)
          mediaRecorder.start()

          // Fonction pour dessiner une frame et avancer
          const drawFrame = () => {
            video.currentTime = currentTime

            video.onseeked = () => {
              ctx.drawImage(video, 0, 0, videoWidth, videoHeight)

              currentTime += frameRate

              if (currentTime < video.duration) {
                // Frame suivante
                setTimeout(drawFrame, 33) // ~30 FPS (1000/30 = 33ms)
              } else {
                // Terminé
                mediaRecorder.stop()
                source.stop()
              }
            }
          }

          // Commencer le traitement
          video.currentTime = 0
          drawFrame()

        } catch (error) {
          console.error('❌ Erreur compression vidéo:', error)
          // 🚨 DÉSACTIVER LE FEEDBACK EN CAS D'ERREUR
          setCompressing(false)
          resolve(file) // Fallback vers fichier original
        }
      }

      video.onerror = () => {
        console.error('❌ Erreur chargement vidéo')
        // 🚨 DÉSACTIVER LE FEEDBACK EN CAS D'ERREUR
        setCompressing(false)
        resolve(file) // Fallback vers fichier original
      }

      // Charger la vidéo
      video.src = URL.createObjectURL(file)
    })
  }

  // 🎯 Compression « cible livret » (mode opt-in, Guide d'accès uniquement).
  // L'original est DÉJÀ sur Supabase : quoi qu'il arrive ici, l'upload est
  // acquis. On demande à Railway de viser la cible (job asynchrone interrogé
  // toutes les VIDEO_GUIDE_ACCES_POLL_MS : une requête synchrone est coupée à
  // 300 s côté service), on contrôle la taille réellement obtenue, et on tranche
  // avec `choisirVideoGuide` :
  //   - sous la cible                → compressée, pas d'avertissement
  //   - encore au-dessus             → la plus légère des deux + « trop lourde »
  //   - échec / délai / réponse KO   → originale + « compression échouée »
  const compresserPourLivret = async (file, originalUrl) => {
    console.log(`🎯 Vidéo ${(file.size / 1024 / 1024).toFixed(1)} Mio > cible ${(videoTargetSizeBytes / 1024 / 1024).toFixed(1)} Mio, compression Railway avec cible...`)
    setBackendCompressing(true)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), VIDEO_GUIDE_ACCES_DELAI_COMPRESSION_MS)
    let compressee = null

    try {
      // 1. Création du job (réponse immédiate)
      const creation = await fetch(COMPRESS_VIDEO_JOBS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: originalUrl, targetSizeBytes: videoTargetSizeBytes }),
        signal: controller.signal
      })
      if (!creation.ok) {
        throw new Error(`Erreur création du job de compression (HTTP ${creation.status})`)
      }
      const { jobId } = await creation.json()
      if (typeof jobId !== 'string' || !jobId) {
        throw new Error('Réponse du service de compression invalide (jobId absent)')
      }
      console.log(`🧾 Job de compression ${jobId} créé, attente...`)

      // 2. Polling jusqu'à done / failed, borné par le délai global (abort)
      for (;;) {
        await attendre(VIDEO_GUIDE_ACCES_POLL_MS, controller.signal)
        const etatResponse = await fetch(`${COMPRESS_VIDEO_JOBS_URL}/${encodeURIComponent(jobId)}`, { signal: controller.signal })
        if (!etatResponse.ok) {
          // 404 = job perdu (service redémarré, ou purgé) : on ne saura jamais
          throw new Error(`Erreur suivi du job de compression (HTTP ${etatResponse.status})`)
        }
        const etat = lireEtatJobCompression(await etatResponse.json())
        if (etat.etat === 'running') continue
        if (etat.etat === 'failed') throw new Error(etat.erreur)
        compressee = etat.compressee
        break
      }
      console.log(`✅ Compression cible terminée: ${(compressee.taille / 1024 / 1024).toFixed(1)} Mio`)
    } catch (compressionError) {
      console.error('❌ Compression cible échouée, vidéo originale conservée:', compressionError)
      compressee = null
    } finally {
      clearTimeout(timer)
      setBackendCompressing(false)
    }

    return choisirVideoGuide({
      originale: { url: originalUrl, taille: file.size },
      compressee,
      cible: videoTargetSizeBytes
    })
  }

  // Upload vers Supabase Storage
  // `ficheDepart` (mode cible) : identité de la fiche AU MOMENT DU CHOIX DU
  // FICHIER, capturée avant le moindre await. L'upload Supabase dure déjà
  // plusieurs minutes sur une grosse vidéo : la relire après coup désignerait
  // la fiche ouverte entre-temps, et on écrirait l'URL de A dans B.
  const uploadToSupabase = async (files, ficheDepart) => {
    // 🚨 VALIDATION CRITIQUE - Numéro de bien obligatoire
    const numeroBien = getField('section_logement.numero_bien')
    if (!numeroBien || numeroBien.trim() === '') {
      throw new Error('Impossible d\'uploader : le numéro de bien est obligatoire. Remplissez ce champ dans la section "Logement" avant d\'ajouter des photos.')
    }

    const uploadedUrls = []

    try {
      for (const file of files) {
        // Validation type de fichier
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')

        if (!isImage && !(acceptVideo && isVideo)) {
          throw new Error(`${file.name} n'est pas un format valide`)
        }

        // 🆕 COMPRESSION AUTOMATIQUE pour images ET vidéos
        let fileToUpload = file
        if (isImage) {
          console.log(`📷 Compression de ${file.name}...`)
          // Compression avec browser-image-compression (cible: 2 MB max)
          const options = {
            maxSizeMB: 2,
            maxWidthOrHeight: 1200,
            useWebWorker: true
          }
          try {
            fileToUpload = await imageCompression(file, options)
            console.log(`📷 Compression: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(1)}MB`)
          } catch (error) {
            console.error('Erreur compression:', error)
            fileToUpload = file // Fallback vers fichier original
          }
        } else if (isVideo && videoTargetSizeBytes) {
          // 🎯 Mode cible : jamais de compression navigateur, l'original part
          // tel quel sur Supabase ; Railway est sollicité après l'upload
          fileToUpload = file
        } else if (isVideo) {
          // Si vidéo > 95 MB, on SKIP la compression navigateur (backend gérera)
          if (file.size > 95 * 1024 * 1024) {
            console.log(`📹 Vidéo > 95MB, compression backend uniquement`)
            fileToUpload = file // Pas de compression navigateur
          } else {
            console.log(`📹 Compression navigateur pour vidéo < 95MB`)
            fileToUpload = await compressVideo(file)
          }
        }

        // Validation taille APRÈS compression (modifiée)
        const maxSize = isVideo ? 350 * 1024 * 1024 : 20 * 1024 * 1024 // 20MB max pour images
        if (fileToUpload.size > maxSize) {
          const maxSizeMB = isVideo ? '350MB' : '20MB'
          throw new Error(`${file.name} est encore trop volumineux après compression (max ${maxSizeMB})`)
        }

        // Génération du path de stockage
        const storagePath = generateStoragePath(fileToUpload.name)

        // Upload vers Supabase
        const { data, error } = await supabase.storage
          .from('fiche-photos')
          .upload(storagePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) throw error

        // Récupération de l'URL publique
        const { data: urlData } = supabase.storage
          .from('fiche-photos')
          .getPublicUrl(storagePath)

        // 🎯 MODE CIBLE (Guide d'accès) : la cible décide, pas le seuil de 95 MB.
        // L'original est publié dans la fiche DÈS qu'il est sur Supabase (et
        // donc sauvegardé par l'autosave) : si la compression dure, si l'onglet
        // se ferme ou si le coordinateur finalise entre-temps, la vidéo n'est
        // jamais perdue. Pendant le job, l'avertissement provisoire
        // « compression en cours » est lui aussi persisté : s'il survit à un
        // rechargement, la session a été interrompue et le coordinateur le voit.
        // La compressée remplace l'original à la fin, si le champ la contient
        // encore et si c'est toujours la même fiche qui est chargée.
        if (isVideo && videoTargetSizeBytes) {
          const aCompresser = doitCompresserVideoGuide(file.size, videoTargetSizeBytes)
          const publiee = publierVideoGuide(
            urlData.publicUrl,
            aCompresser ? AVERTISSEMENT_VIDEO_GUIDE.COMPRESSION_EN_COURS : null,
            ficheDepart
          )
          if (!publiee) {
            // Une autre fiche est ouverte depuis le choix du fichier : publier
            // ici écrirait la vidéo dans la MAUVAISE fiche. On ne touche à rien
            // et on le dit, plutôt que d'échouer en silence.
            throw new Error('Une autre fiche a été ouverte pendant l\'envoi : la vidéo n\'a pas été ajoutée. Rouvrez la fiche d\'origine et réimportez-la.')
          }
          if (aCompresser) {
            const decision = await compresserPourLivret(file, urlData.publicUrl)
            remplacerVideoGuide(urlData.publicUrl, decision, ficheDepart)
          } else {
            console.log('🎯 Vidéo sous la cible, conservée telle quelle')
          }
          // Rien à retourner : le champ est déjà à jour

        // 🎬 COMPRESSION BACKEND si vidéo > 95 MB
        } else if (isVideo && file.size > 95 * 1024 * 1024) {
          console.log('🎬 Vidéo > 95MB, compression backend en cours...')
          setBackendCompressing(true)

          try {
            const response = await fetch(COMPRESS_VIDEO_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoUrl: urlData.publicUrl })
            })

            if (!response.ok) {
              throw new Error('Erreur compression backend')
            }

            const result = await response.json()
            console.log('✅ Compression backend terminée:', result.compressedUrl)

            // Stocker l'URL compressée au lieu de l'originale
            uploadedUrls.push(result.compressedUrl)

          } catch (compressionError) {
            console.error('❌ Erreur compression backend:', compressionError)
            // Fallback : garder l'URL originale si compression échoue
            uploadedUrls.push(urlData.publicUrl)
            setError('Compression échouée, vidéo originale conservée')
          } finally {
            setBackendCompressing(false)
          }
        } else {
          // Image ou vidéo < 95MB : URL normale
          uploadedUrls.push(urlData.publicUrl)
        }
      }

      return { success: true, urls: uploadedUrls }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // 🎯 Mode cible : identité de la fiche chargée MAINTENANT dans le provider
  // (qui survit aux changements de route), lue hors de toute fermeture figée.
  const identiteFicheLive = () => ({
    id: getFieldLive('id') || null,
    numeroBien: getFieldLive('section_logement.numero_bien') || null
  })

  // 🎯 Mode cible : ajoute l'original au champ et pose l'avertissement de
  // départ (provisoire « en cours » si un job part, sinon rien : un nouvel
  // upload repart de zéro). N'écrit QUE si la fiche chargée est toujours celle
  // d'où l'upload est parti. Retourne false sinon, sans rien toucher.
  const publierVideoGuide = (originalUrl, avertissementDepart, ficheDepart) => {
    if (!estMemeFiche(ficheDepart, identiteFicheLive())) {
      console.log('🎯 Une autre fiche est chargée depuis le début de l\'envoi, vidéo non publiée')
      return false
    }
    const actuelles = normalizePhotoField(getFieldLive(fieldPath))
    updateField(fieldPath, multiple ? [...actuelles, originalUrl] : originalUrl)
    if (videoWarningFieldPath) updateField(videoWarningFieldPath, avertissementDepart)
    return true
  }

  // 🎯 Mode cible : à la fin de la compression, remplace l'original par la
  // vidéo retenue et pose l'avertissement final — sauf si une AUTRE fiche a
  // été chargée entre-temps, ou si le coordinateur a supprimé la vidéo (le
  // résultat n'a alors plus d'objet : on n'écrit rien).
  const remplacerVideoGuide = (originalUrl, decision, ficheDepart) => {
    if (!estMemeFiche(ficheDepart, identiteFicheLive())) {
      console.log('🎯 Une autre fiche est chargée depuis le départ de la compression, résultat ignoré')
      return
    }
    const actuelles = normalizePhotoField(getFieldLive(fieldPath))
    if (!actuelles.includes(originalUrl)) {
      console.log('🎯 Vidéo supprimée pendant la compression, résultat ignoré')
      return
    }
    if (decision.url !== originalUrl) {
      updateField(fieldPath, multiple
        ? actuelles.map(u => (u === originalUrl ? decision.url : u))
        : decision.url)
    }
    if (videoWarningFieldPath) updateField(videoWarningFieldPath, decision.avertissement)
  }

  // Gestion du changement de fichier
  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files)

    if (files.length === 0) return

    // Vérification limite nombre de fichiers
    if (currentPhotos.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} photos autorisées`)
      return
    }

    // 🎯 Mode cible : identité de la fiche AVANT tout traitement asynchrone.
    // Tout ce qui suit (compression navigateur, upload Supabase, job Railway)
    // peut durer pendant que le coordinateur ouvre une autre fiche.
    const ficheDepart = identiteFicheLive()

    // 🎯 Mode cible : signaler au provider qu'un média est en vol, AVANT le
    // premier await. Entre ici et la publication de l'URL, la fiche ne
    // référence encore rien : sans ce signal, une finalisation lancée dans
    // cette fenêtre partirait sans la vidéo (automatisation à un seul coup).
    // Seule la finalisation le consulte.
    const cleMediaEnVol = videoTargetSizeBytes ? `${fieldPath}#${Date.now()}` : null
    if (cleMediaEnVol) declarerMediaEnVol(cleMediaEnVol, ficheDepart)

    setUploading(true)
    setError(null)

    try {
      const result = await uploadToSupabase(files, ficheDepart)

      if (result.success) {
        // FORCER currentPhotos à être un array
        const safeCurrentPhotos = Array.isArray(currentPhotos) ? currentPhotos : []

        const newUrls = result.urls

        // 🎯 Mode cible : le champ a déjà été mis à jour pendant l'upload
        // (publierVideoGuide / remplacerVideoGuide), newUrls est vide — ne pas
        // réécrire le champ avec une valeur d'avant l'upload.
        if (newUrls.length > 0) {
          if (multiple) {
            const updatedPhotos = [...safeCurrentPhotos, ...newUrls]
            updateField(fieldPath, updatedPhotos)
          } else {
            updateField(fieldPath, newUrls[0])
          }
        }

        // Reset du input
        event.target.value = ''
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Erreur lors de l\'upload: ' + err.message)
    } finally {
      // Succès, échec ou abandon : le média n'est plus en vol. Sans ce
      // `finally`, une erreur d'envoi bloquerait la finalisation pour de bon.
      if (cleMediaEnVol) terminerMediaEnVol(cleMediaEnVol)
      setUploading(false)
    }
  }

  // 🎯 Mode cible : l'avertissement n'a plus d'objet sans la vidéo qui l'a causé
  const effacerAvertissementVideo = () => {
    if (videoWarningFieldPath) updateField(videoWarningFieldPath, null)
  }

  // Suppression d'une photo - VERSION FINALE

  const handleDeletePhoto = async (photoUrl, index) => {
    try {
      // Extraire le path depuis l'URL Supabase
      const urlParts = photoUrl.split('/')
      const bucketIndex = urlParts.findIndex(part => part === 'fiche-photos')
      let storagePath = urlParts.slice(bucketIndex + 1).join('/')

      // DÉCODAGE CRUCIAL pour les caractères spéciaux (%20 → espaces, etc.)
      storagePath = decodeURIComponent(storagePath)

      // Tentative de suppression du storage Supabase
      const { error } = await supabase.storage
        .from('fiche-photos')
        .remove([storagePath])

      // ⚠️ IMPORTANT : On continue même si erreur Storage (fichier déjà supprimé)
      if (error) {
        console.warn('Fichier déjà supprimé du Storage ou erreur:', error)
        // On ne return pas, on continue pour nettoyer le FormContext
      }

      // Mise à jour du FormContext (TOUJOURS faire ça)
      if (multiple) {
        const updatedPhotos = currentPhotos.filter((_, i) => i !== index)
        updateField(fieldPath, updatedPhotos)
      } else {
        updateField(fieldPath, null)
      }
      effacerAvertissementVideo()

      console.log('✅ Photo supprimée du FormContext')

    } catch (err) {
      console.error('Erreur suppression photo:', err)

      // Même si erreur, essayer de nettoyer le FormContext
      if (multiple) {
        const updatedPhotos = currentPhotos.filter((_, i) => i !== index)
        updateField(fieldPath, updatedPhotos)
      } else {
        updateField(fieldPath, null)
      }
      effacerAvertissementVideo()

      setError('Photo supprimée (erreur Storage ignorée)')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-semibold mb-2">{label}</label>

        {/* Input upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            accept={acceptVideo ? "image/*,video/*" : "image/*"}
            multiple={multiple}
            capture={capture ? "environment" : undefined}
            onChange={handleFileChange}
            disabled={uploading || compressing || backendCompressing}
            className="hidden"
            id={`upload-${fieldPath}`}
          />

          <label
            htmlFor={`upload-${fieldPath}`}
            className={`cursor-pointer ${(uploading || compressing || backendCompressing) ? 'opacity-50' : ''}`}
          >
            {backendCompressing ? (
              <div className="text-purple-600">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full mb-2"></div>
                <p className="text-lg font-semibold">Compression en cours...</p>
                <p className="text-sm mt-2">⏳ Votre vidéo est compressée, cela peut prendre quelques minutes.</p>
              </div>
            ) : compressing ? (
              <div className="text-orange-600">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full mb-2"></div>
                <p className="text-lg font-semibold">Compression en cours...</p>
                <p className="text-sm">⏳ Merci de patienter, ne fermez pas cette page</p>
              </div>
            ) : uploading ? (
              <div className="text-blue-600">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
                <p>Upload en cours...</p>
              </div>
            ) : (
              <div className="text-gray-600">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-lg font-medium">
                  Ajouter des {acceptVideo ? 'photos/vidéos' : 'photos'}
                </p>
                <p className="text-xs mt-1">
                  Max {maxFiles} fichiers, {acceptVideo ? '50MB/photo, 350MB/vidéo' : '20MB par fichier'}
                </p>
                {acceptVideo && (
                  <p className="text-xs mt-2 text-orange-600">
                    💡 <strong>Astuce :</strong> Filmez en 720p pour réduire la taille.
                    Les vidéos &gt;300MB prennent 4-5 min à optimiser.
                  </p>
                )}
              </div>
            )}
          </label>
        </div>

        {/* Affichage erreurs */}
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Message info compression */}
        {compressing && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-pulse w-3 h-3 bg-orange-500 rounded-full"></div>
              <div>
                <p className="text-sm text-orange-600">
                  Les vidéos volumineuses sont automatiquement compressées pour optimiser le transfert.
                  Cette opération peut prendre quelques minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Compteur */}
        {currentPhotos.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            {currentPhotos.length} / {maxFiles} photos
          </p>
        )}
        {/* Note conservation des photos */}
        {currentPhotos.length > 0 && (
          <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 p-2 rounded mt-2 flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>Photos conservées 90 jours</strong> dans l'application.
              Elles seront ensuite disponibles uniquement dans Google Drive.
            </span>
          </div>
        )}
      </div>

      {/* Galerie photos existantes */}
      {currentPhotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {currentPhotos.map((photoUrl, index) => {
            // Détecter si c'est une vidéo par l'extension
            const isVideo = /\.(mp4|webm|ogg|mov|avi)$/i.test(photoUrl)

            return (
              <div key={index} className="relative group">
                {isVideo ? (
                  // Affichage icône vidéo
                  <div className="w-full h-24 bg-gray-800 rounded-lg border shadow-sm flex flex-col items-center justify-center text-white">
                    <svg className="w-8 h-8 mb-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                    <span className="text-xs">Vidéo</span>
                  </div>
                ) : (
                  // Affichage image normal
                  <PhotoWithFallback photoUrl={photoUrl} index={index} />
                )}

                {/* Bouton suppression */}
                <button
                  onClick={() => handleDeletePhoto(photoUrl, index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer cette photo"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

export default PhotoUpload