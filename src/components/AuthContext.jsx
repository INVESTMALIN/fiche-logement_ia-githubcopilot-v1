import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null) // 🔥 NOUVEAU : juste le rôle

  // 🔥 SIMPLE : récupérer le rôle quand l'utilisateur change
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
            console.log("Mise à jour userRole avec:", data.role) // ✅ AJOUTER ÇA
            setUserRole(data.role)
          } else {
            console.log("Pas de rôle trouvé, fallback coordinateur")
            setUserRole('coordinateur') // Fallback seulement si pas de rôle en base
          }
        } catch (e) {
          console.log("Erreur rôle, fallback coordinateur:", e.message)
          setUserRole('coordinateur') // Fallback seulement en cas d'erreur
        }
      }
      
      fetchRole()
    } else {
      setUserRole(null) // Pas d'utilisateur = pas de rôle
    }
  }, [user])

  useEffect(() => {
    // Récupérer la session actuelle
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Connexion
  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
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

  // Déconnexion
  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // Inscription (si besoin plus tard)
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
    // Helpers originaux
    isAuthenticated: !!user,
    userEmail: user?.email || null,
    // 🔥 NOUVEAUX helpers rôles (simples)
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