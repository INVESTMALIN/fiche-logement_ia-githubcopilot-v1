// src/pages/UpdatePassword.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/Button'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validSession, setValidSession] = useState(false)
  const navigate = useNavigate()

  // Vérifier que l'utilisateur a une session valide (vient du lien email)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setValidSession(true)
      } else {
        // Pas de session valide, redirection vers reset password
        navigate('/reset-password')
      }
    }

    checkSession()
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validations
    if (!password || !confirmPassword) {
      setError('Veuillez remplir tous les champs')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      // Succès - redirection vers dashboard
      navigate('/', { 
        state: { 
          message: 'Votre mot de passe a été mis à jour avec succès !' 
        }
      })

    } catch (error) {
      setError(error.message || 'Erreur lors de la mise à jour du mot de passe')
    } finally {
      setLoading(false)
    }
  }

  // Affichage de chargement pendant vérification session
  if (!validSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white">Vérification en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      {/* Points scintillants dorés - identique aux autres pages auth */}
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

          {/* Box de mise à jour */}
          <div className="bg-gray-50 p-8 rounded-2xl shadow-2xl border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
              Nouveau mot de passe
            </h2>

            <p className="text-gray-600 text-center mb-6 text-sm">
              Choisissez un nouveau mot de passe sécurisé pour votre compte.
            </p>

            {/* Message d'erreur */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  placeholder="Au moins 6 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  placeholder="Saisissez à nouveau le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"
                  disabled={loading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </Button>
            </form>

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