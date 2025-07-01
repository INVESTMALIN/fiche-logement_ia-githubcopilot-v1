// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 🔥 INTERCEPTEUR D'ERREURS 401 - Auto logout si session expirée
let authNavigateCallback = null

// Fonction pour définir le callback de navigation (appelée depuis App.jsx)
export const setAuthNavigateCallback = (callback) => {
  authNavigateCallback = callback
}

// 🔥 WRAPPER pour toutes les requêtes Supabase
const createInterceptor = (originalMethod) => {
  return async function(...args) {
    try {
      const result = await originalMethod.apply(this, args)
      
      // 🔥 Vérifier les erreurs 401/403 dans la réponse
      if (result.error) {
        const errorMessage = result.error.message || ''
        
        // Erreurs de session expirée
        if (
          errorMessage.includes('Invalid Refresh Token') ||
          errorMessage.includes('refresh_token_not_found') ||
          errorMessage.includes('Auth session missing') ||
          result.error.status === 401 ||
          result.error.status === 403
        ) {
          console.warn('🚨 Session expirée détectée:', errorMessage)
          
          // Cleanup automatique + redirection
          await handleSessionExpired()
        }
      }
      
      return result
    } catch (error) {
      console.error('🔥 Erreur interceptée:', error)
      return { data: null, error }
    }
  }
}

// 🔥 FONCTION DE GESTION D'EXPIRATION
const handleSessionExpired = async () => {
  try {
    console.log('🧹 Session expirée - cleanup automatique')
    
    // 1. Signout silencieux (sans erreur)
    await supabase.auth.signOut()
    
    // 2. Cleanup localStorage
    try {
      localStorage.removeItem('supabase.auth.token')
    } catch (e) {
      console.warn('Erreur cleanup localStorage:', e)
    }
    
    // 3. Redirection vers login si callback défini
    if (authNavigateCallback) {
      authNavigateCallback('/login')
    } else {
      // Fallback - recharger la page
      window.location.href = '/login'
    }
    
  } catch (error) {
    console.error('Erreur handleSessionExpired:', error)
    // En cas d'erreur, forcer le rechargement
    window.location.href = '/login'
  }
}

// 🔥 APPLIQUER L'INTERCEPTEUR aux méthodes critiques
// Note: On ne peut pas intercepter directement les méthodes Supabase,
// donc on crée des helpers wrapper

// Helper pour les requêtes database
export const safeSupabaseQuery = async (queryBuilder) => {
  try {
    const result = await queryBuilder
    
    // Vérifier les erreurs 401
    if (result.error) {
      const errorMessage = result.error.message || ''
      
      if (
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('refresh_token_not_found') ||
        errorMessage.includes('Auth session missing') ||
        result.error.status === 401
      ) {
        console.warn('🚨 Session expirée lors de la requête:', errorMessage)
        await handleSessionExpired()
        return { data: null, error: { message: 'Session expirée, redirection en cours...' } }
      }
    }
    
    return result
  } catch (error) {
    console.error('🔥 Erreur safeSupabaseQuery:', error)
    return { data: null, error }
  }
}

// Helper pour les opérations auth
export const safeAuthOperation = async (authOperation) => {
  try {
    const result = await authOperation
    
    if (result.error) {
      const errorMessage = result.error.message || ''
      
      if (
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('refresh_token_not_found')
      ) {
        console.warn('🚨 Token invalide lors opération auth:', errorMessage)
        await handleSessionExpired()
      }
    }
    
    return result
  } catch (error) {
    console.error('🔥 Erreur safeAuthOperation:', error)
    return { data: null, error }
  }
}