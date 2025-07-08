// src/components/PhotoUpload.jsx
import React, { useState } from 'react'
import { useForm } from './FormContext'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabaseClient'

const PhotoUpload = ({ 
  fieldPath,           // ex: "section_equipements.poubelle_photos"
  label,               // ex: "Photos du local poubelle"
  multiple = true,     // Plusieurs photos ou une seule
  maxFiles = 10,       // Limite nombre de fichiers
  capture = true,      // Activer capture mobile
  acceptVideo = false  // Autoriser les vidéos (optionnel)
}) => {
  const { getField, updateField, handleSave } = useForm()
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
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
    
    // Récupérer le numéro de bien depuis section_logement
    const numeroBien = getField('section_logement.numero_bien') || `temp-${timestamp}`
  
    return `user-${user.id}/fiche-${numeroBien}/${section}/${field}/${timestamp}_${randomId}_${fileName}`
  }

  // Upload vers Supabase Storage
  const uploadToSupabase = async (files) => {
    const uploadedUrls = []
    
    try {
      for (const file of files) {
        // Validation type de fichier
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')
        
        if (!isImage && !(acceptVideo && isVideo)) {
          throw new Error(`${file.name} n'est pas un format valide`)
        }

        // Validation taille (max 50MB pour images, 200MB pour vidéos)
        const maxSize = isVideo ? 200 * 1024 * 1024 : 50 * 1024 * 1024
        if (file.size > maxSize) {
          const maxSizeMB = isVideo ? '200MB' : '50MB'
          throw new Error(`${file.name} est trop volumineux (max ${maxSizeMB})`)
        }

        // Génération du path de stockage
        const ficheId = getField('id')
        const storagePath = generateStoragePath(file.name, ficheId)
        
        // Upload vers Supabase
        const { data, error } = await supabase.storage
          .from('fiche-photos')
          .upload(storagePath, file, {
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
            disabled={uploading}
            className="hidden"
            id={`upload-${fieldPath}`}
          />
          
          <label 
            htmlFor={`upload-${fieldPath}`}
            className={`cursor-pointer ${uploading ? 'opacity-50' : ''}`}
          >
            {uploading ? (
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
                  Max {maxFiles} fichiers, {acceptVideo ? '50MB/photo, 200MB/vidéo' : '50MB par fichier'}
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
          {currentPhotos.map((photoUrl, index) => (
            <div key={index} className="relative group">
              <img
                src={photoUrl}
                alt={`Photo ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border shadow-sm"
                loading="lazy"
              />
              
              {/* Bouton suppression */}
              <button
                onClick={() => handleDeletePhoto(photoUrl, index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Supprimer cette photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PhotoUpload