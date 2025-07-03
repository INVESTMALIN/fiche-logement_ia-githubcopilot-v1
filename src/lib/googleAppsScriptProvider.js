// src/lib/googleAppsScriptProvider.js - VERSION FORMDATA
export class GoogleAppsScriptProvider {
    constructor() {
     this.uploadEndpoint = 'https://script.google.com/macros/s/AKfycbwpKpMwK9TBszHeG76IHo5Iesg3fMDcB5BBlFrvNyfTIF4D8j1hGyT3e1XcVgb8g-cJ8Q/exec'
    }
  
    // 📤 Upload d'un fichier vers Google Drive via Apps Script
    async uploadPhoto(file, path, metadata = {}) {
      try {
        console.log('Uploading to Google Drive:', { fileName: file.name, path })
  
        // Convertir le fichier en base64
        const base64Data = await this.fileToBase64(file)
        
        // Préparer les données pour le script (FormData)
        const formData = new FormData()
        formData.append('file', base64Data)
        formData.append('path', path)
        formData.append('filename', file.name)
  
        // Faire l'upload vers Google Apps Script
        const response = await fetch(this.uploadEndpoint, {
          method: 'POST',
          body: formData
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
      return folderPath
    }
  }
  
  export default GoogleAppsScriptProvider