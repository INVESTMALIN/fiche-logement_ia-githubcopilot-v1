// src/components/AdminRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

// Composant Loading réutilisable
function LoadingScreen({ text }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-gray-600">{text}</p>
      </div>
    </div>
  )
}

export default function AdminRoute({ children }) {
  const { user, loading, isSuperAdmin, userRole } = useAuth()

  console.log('AdminRoute - user:', !!user)
  console.log('AdminRoute - loading:', loading)
  console.log('AdminRoute - userRole:', userRole)
  console.log('AdminRoute - isSuperAdmin:', isSuperAdmin)

  // 1. Chargement authentification initial
  if (loading) {
    return <LoadingScreen text="Vérification des permissions..." />
  }

  // 2. Redirection vers login si pas connecté
  if (!user) {
    console.log('AdminRoute - Pas d\'utilisateur, redirection login')
    return <Navigate to="/login" replace />
  }

  // 3. ✅ ATTENDRE que le rôle soit chargé depuis Supabase
  // userRole === null signifie "encore en cours de chargement"
  if (userRole === null) {
    console.log('AdminRoute - Rôle en cours de chargement...')
    return <LoadingScreen text="Chargement du rôle utilisateur..." />
  }

  // 4. ✅ Maintenant on peut vérifier le rôle en toute sécurité
  if (!isSuperAdmin) {
    console.log('AdminRoute - ACCÈS REFUSÉ (rôle:', userRole, '), redirection vers /')
    return <Navigate to="/" replace />
  }

  // 5. ✅ Autorisation accordée !
  console.log('AdminRoute - AUTORISATION ACCORDÉE pour super_admin')
  return children
}