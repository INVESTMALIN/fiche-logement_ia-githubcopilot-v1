// src/lib/googleAppsScriptProvider.js - VERSION CORRIGÉE
export class GoogleAppsScriptProvider {
    constructor() {
      // NOUVELLE URL
      this.uploadEndpoint = 'https://script.google.com/macros/s/AKfycbwYpUUEhrvbLT-A-0Edt6ueMRwqcmEYkOWo1hYI-Yd5sMsU5DOS46ZwTq1FFInuDLztRg/exec'
    }
  
    // 📤 Upload d'un fichier vers Google Drive via Apps Script
    async uploadPhoto(file, path, metadata = {}) {
      try {
        console.log('Uploading to Google Drive:', { fileName: file.name, path })
  
        // Convertir le fichier en base64
        const base64Data = await this.fileToBase64(file)
        
        // Préparer les données pour le script (JSON au lieu de FormData)
        const payload = {
          file: base64Data,
          path: path,
          filename: file.name,
          metadata: metadata
        }
  
        // Faire l'upload vers Google Apps Script
        const response = await fetch(this.uploadEndpoint, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
  
        const result = await response.json()
  
        if (!result.success) {
          throw new Error(result.error || 'Upload failed')
        }
  
        console.log('Upload réussi:', result)
  
        return {
          success: true,
          data: {
            url: result.url,
            path: path,
            name: file.name,
            size: file.size,
            fileId: result.fileId,
            metadata: {
              ...metadata,
              uploadedAt: new Date().toISOString(),
              googleDriveId: result.fileId
            }
          },
          error: null
        }
  
      } catch (error) {
        console.error('Google Apps Script upload error:', error)
        return {
          success: false,
          data: null,
          error: error.message
        }
      }
    }
  
    // 🗑️ Supprimer un fichier (à implémenter si nécessaire)
    async deletePhoto(photoUrl) {
      try {
        // Pour l'instant, on ne peut pas supprimer depuis Apps Script facilement
        // On pourrait étendre le script pour gérer la suppression
        console.warn('Delete not implemented for Google Apps Script provider')
        
        return {
          success: true,
          error: null
        }
  
      } catch (error) {
        console.error('Google Apps Script delete error:', error)
        return {
          success: false,
          error: error.message
        }
      }
    }
  
    // 🔧 Convertir un fichier en base64
    async fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result)
        reader.onerror = error => reject(error)
      })
    }
  
    // 🔗 Obtenir l'URL publique (déjà fournie par l'upload)
    async getPublicUrl(path) {
      return path
    }
  
    // 📁 Créer un dossier (géré automatiquement par le script)
    async createFolder(folderPath) {
      // Le script crée automatiquement les dossiers
      return folderPath
    }
  }
  
  export default GoogleAppsScriptProvider