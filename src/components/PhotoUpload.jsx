// src/components/PhotoUpload.jsx
import React, { useState } from 'react'
import { useForm } from './FormContext'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabaseClient'

const sanitizeFileName = (fileName) => {
  return fileName
    .normalize('NFD')                    // Décompose les accents (é → e + ´)
    .replace(/[\u0300-\u036f]/g, '')     // Supprime les accents
    .replace(/\s+/g, '_')                // Remplace espaces par underscore
    .replace(/[^a-zA-Z0-9._-]/g, '_')    // Remplace caractères spéciaux par underscore
    .replace(/_+/g, '_')                 // Évite les underscores multiples
    .replace(/^_|_$/g, '')               // Enlève underscores en début/fin
}

const PhotoUpload = ({ 
  fieldPath,           // ex: "section_equipements.poubelle_photos"
  label,               // ex: "Photos du local poubelle"
  multiple = true,     // Plusieurs photos ou une seule
  maxFiles = 10,       // Limite nombre de fichiers
  capture = false,      // Activer capture mobile
  acceptVideo = false  // Autoriser les vidéos (optionnel)
}) => {
  const { getField, updateField, handleSave } = useForm()
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState(null)

  // Récupérer les photos actuelles
  const fieldValue = getField(fieldPath)
let rawPhotos = fieldValue || []

// Parse les strings JSON malformées
if (typeof rawPhotos === 'string') {
  if (rawPhotos === '[]' || rawPhotos === '') {
    rawPhotos = []
  } else if (rawPhotos.startsWith('[')) {
    try { rawPhotos = JSON.parse(rawPhotos) } catch { rawPhotos = [] }
  } else {
    rawPhotos = [rawPhotos] // Single URL
  }
}

const currentPhotos = Array.isArray(rawPhotos) ? rawPhotos : []
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

   // 🔧 FONCTION COMPRESSION AUTOMATIQUE - Ajout pour anciens Android
  const compressImage = async (file) => {
    return new Promise((resolve) => {
      // Si c'est une vidéo, on ne compresse pas
      if (file.type.startsWith('video/')) {
        resolve(file)
        return
      }

      // Si l'image fait moins de 1MB, on ne compresse pas
      if (file.size < 1024 * 1024) {
        resolve(file)
        return
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // 🎯 CALCUL TAILLE OPTIMALE
        let { width, height } = img
        
        // Limiter les dimensions max (crucial pour anciens Android)
        const maxDimension = 1920 // Max 1920px sur le côté le plus grand
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width
            width = maxDimension
          } else {
            width = (width * maxDimension) / height
            height = maxDimension
          }
        }

        canvas.width = width
        canvas.height = height

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height)

        // 🎯 COMPRESSION JPEG avec qualité adaptative
        const quality = file.size > 5 * 1024 * 1024 ? 0.6 : 0.8 // Plus aggressif pour grosses images

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Créer un nouveau File avec le nom original
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              
              console.log(`📷 Compression: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`)
              resolve(compressedFile)
            } else {
              resolve(file) // Fallback si compression échoue
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => {
        resolve(file) // Fallback si erreur de chargement
      }

      img.src = URL.createObjectURL(file)
    })
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
    
  // Upload vers Supabase Storage
  const uploadToSupabase = async (files) => {
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
          fileToUpload = await compressImage(file)
        } else if (isVideo) {
          console.log(`📹 Vérification compression vidéo ${file.name}...`)
          fileToUpload = await compressVideo(file)
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
  
        uploadedUrls.push(urlData.publicUrl)
      }
  
      return { success: true, urls: uploadedUrls }
    } catch (error) {
      return { success: false, error: error.message }
    }
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

    setUploading(true)
    setError(null)

    try {
      const result = await uploadToSupabase(files)
      
      if (result.success) {
        // Mise à jour du FormContext avec les nouvelles URLs
        const newUrls = result.urls
        
        if (multiple) {
          // Mode multiple : ajouter aux photos existantes
          const updatedPhotos = [...currentPhotos, ...newUrls]
          updateField(fieldPath, updatedPhotos)
        } else {
          // Mode single : remplacer par la première URL
          updateField(fieldPath, newUrls[0])
        }      
       
        // Reset du input
        event.target.value = ''
      } else {
        setError(result.error)
      }

    } catch (err) {
      setError('Erreur lors de l\'upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }


// Suppression d'une photo - VERSION FINALE
// Remplacement de la fonction handleDeletePhoto dans PhotoUpload.jsx

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
            disabled={uploading || compressing}
            className="hidden"
            id={`upload-${fieldPath}`}
          />
          
          <label 
            htmlFor={`upload-${fieldPath}`}
            className={`cursor-pointer ${(uploading || compressing) ? 'opacity-50' : ''}`}
          >
            {compressing ? (
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
              <strong>Photos conservées 30 jours</strong> dans l'application. 
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
                <img
                  src={photoUrl}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border shadow-sm"
                  loading="lazy"
                />
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