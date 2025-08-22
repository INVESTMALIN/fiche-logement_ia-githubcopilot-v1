// src/pages/ConfirmSignup.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/Button'

export default function ConfirmSignup() {
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        // Récupérer les paramètres de l'URL
        const token = searchParams.get('token')
        const type = searchParams.get('type')

        if (!token || type !== 'signup') {
          throw new Error('Lien de confirmation invalide')
        }

        // Vérifier la session actuelle pour voir si la confirmation a fonctionné
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw sessionError
        }

        if (session?.user?.email_confirmed_at) {
          // User déjà confirmé et connecté
          setConfirmed(true)
        } else {
          // Tenter de confirmer via l'API (optionnel, Supabase gère automatiquement)
          const { data, error: confirmError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          })

          if (confirmError) {
            throw confirmError
          }

          setConfirmed(true)
        }

      } catch (error) {
        console.error('Erreur confirmation:', error)
        setError(error.message || 'Erreur lors de la confirmation du compte')
      } finally {
        setLoading(false)
      }
    }

    handleConfirmation()
  }, [searchParams])

  // Écran de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white">Confirmation de votre compte en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      {/* Points scintillants dorés */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.8 + 0.2
            }}
          />
        ))}
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Logo/Titre */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Fiche Logement
            </h1>
            <p className="text-gray-300">
              Letahost • Conciergerie Premium
            </p>
          </div>

          {/* Box de confirmation */}
          <div className="bg-gray-50 p-8 rounded-2xl shadow-2xl border border-gray-200">
            
            {/* Cas de succès */}
            {confirmed && !error && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎊</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Compte confirmé !
                  </h2>
                  <p className="text-gray-600 text-sm mb-6">
                    Votre adresse email a été confirmée avec succès. 
                    Vous pouvez maintenant vous connecter à l'application Fiches logement.
                  </p>
                </div>

                <Button
                  onClick={async () => {
                    // DÉCONNECTER d'abord pour nettoyer toute session
                    await supabase.auth.signOut()
                    // Puis rediriger vers login avec des champs vides
                    navigate('/login')
                  }}
                  className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200"
                >
                  Me connecter
                </Button>
              </div>
            )}

            {/* Cas d'erreur */}
            {error && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">❌</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Erreur de confirmation
                  </h2>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                  <p className="text-gray-600 text-sm mb-6">
                    Le lien de confirmation est peut-être expiré ou invalide.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => navigate('/login')}
                    className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200"
                  >
                    Aller à la connexion
                  </Button>
                  
                  <button
                    onClick={() => navigate('/reset-password')}
                    className="w-full py-2 text-blue-600 hover:text-blue-700 underline text-sm"
                  >
                    Renvoyer un email de confirmation
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                Letahost • Conciergerie Premium
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}