// src/components/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)

  // 🔥 HELPER : Cleanup complet de la session
  const cleanupSession = () => {
    console.log('🧹 Cleanup session complet')
    setUser(null)
    setUserRole(null)
    // Cleanup localStorage si besoin
    try {
      localStorage.removeItem('supabase.auth.token')
      // Ajouter d'autres clés si nécessaire
    } catch (error) {
      console.warn('Erreur cleanup localStorage:', error)
    }
  }

  // Récupération du rôle utilisateur
  useEffect(() => {
    if (user) {
      const fetchRole = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          
          if (data?.role) {
            console.log("Rôle récupéré:", data.role)
            setUserRole(data.role)
          } else {
            console.log("Pas de rôle trouvé, fallback coordinateur")
            setUserRole('coordinateur')
          }
        } catch (e) {
          console.log("Erreur rôle, fallback coordinateur:", e.message)
          setUserRole('coordinateur')
        }
      }
      
      fetchRole()
    } else {
      setUserRole(null)
    }
  }, [user])

  useEffect(() => {
    // Récupérer la session actuelle
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Erreur récupération session:', error)
          cleanupSession()
        } else {
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Erreur getSession:', error)
        cleanupSession()
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email || 'no user')
        
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
          cleanupSession()
        } else {
          setUser(session?.user ?? null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // 🔥 CONNEXION avec vérification du statut active
  const signIn = async (email, password) => {
    try {
      setLoading(true)
      
      // 1. Connexion normale Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      // 2. Vérifier si l'utilisateur est actif
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('active')
        .eq('id', data.user.id)
        .single()
      
      if (profileError) {
        console.error('Erreur lors de la vérification du profil:', profileError)
        return { data, error: null }
      }
      
      // 3. Si le compte est désactivé → déconnexion immédiate
      if (profile.active === false) {
        await supabase.auth.signOut()
        cleanupSession()
        return { 
          data: null, 
          error: 'Votre compte a été désactivé par un administrateur. Contactez le support.'
        }
      }
      
      return { data, error: null }
      
    } catch (error) {
      return { data: null, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // 🔥 DÉCONNEXION ROBUSTE
  const signOut = async () => {
    try {
      setLoading(true)
      console.log('🚪 Tentative de déconnexion...')
      
      // Tentative de signOut Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.warn('⚠️ Erreur Supabase signOut (session probablement expirée):', error.message)
        // On continue quand même le cleanup
      }
      
      // 🔥 TOUJOURS faire le cleanup, même en cas d'erreur
      cleanupSession()
      console.log('✅ Déconnexion terminée')
      
    } catch (error) {
      console.error('❌ Erreur critique signOut:', error.message)
      // 🔥 En cas d'erreur critique, on force le cleanup
      cleanupSession()
    } finally {
      setLoading(false)
    }
  }

  // Inscription
  const signUp = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signOut,
    signUp,
    cleanupSession, // 🔥 Exposer pour usage externe si besoin
    // Helpers
    isAuthenticated: !!user,
    userEmail: user?.email || null,
    userRole,
    isCoordinateur: userRole === 'coordinateur',
    isAdmin: userRole === 'admin',
    isSuperAdmin: userRole === 'super_admin',
    canEditAllFiches: userRole === 'super_admin',
    canViewAllFiches: userRole === 'admin' || userRole === 'super_admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}