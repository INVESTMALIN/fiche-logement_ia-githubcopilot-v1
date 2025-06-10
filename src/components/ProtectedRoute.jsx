import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Affichage pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de la connexion...</p>
        </div>
      </div>
    )
  }

  // Redirection vers login si pas connecté
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Affichage du contenu si connecté
  return children
}