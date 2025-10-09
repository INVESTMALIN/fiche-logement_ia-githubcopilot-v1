// src/pages/ResetPassword.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/Button'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email) {
      setError('Veuillez saisir votre adresse email')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`
      })

      if (error) throw error

      setSuccess(true)
    } catch (error) {
      setError(error.message || 'Erreur lors de l\'envoi de l\'email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      {/* Points scintillants dorés - identique à Login */}
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

          {/* Box de réinitialisation */}
          <div className="bg-gray-50 p-8 rounded-2xl shadow-2xl border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
              Mot de passe oublié
            </h2>

            {success ? (
              /* Message de succès */
              <div className="text-center">
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm">
                    📧 Un email de réinitialisation a été envoyé à <strong>{email}</strong>
                  </p>
                  <p className="text-green-600 text-xs mt-2">
                    Vérifiez votre boîte de réception et suivez les instructions. Si vous ne voyez pas l'e-mail de réinitialisation, attendez 2-3 minutes, pensez à vérifier votre dossier spam.
                  </p>
                </div>
                
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:text-blue-700 underline text-sm"
                >
                  ← Retour à la connexion
                </button>
              </div>
            ) : (
              /* Formulaire de demande */
              <>
                <p className="text-gray-600 text-center mb-6 text-sm">
                  Saisissez votre adresse email pour recevoir un lien de réinitialisation de mot de passe.
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
                    <input
                      type="email"
                      placeholder="Votre adresse email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
                  </Button>
                </form>

                {/* Lien retour */}
                <div className="text-center mt-6">
                  <button
                    onClick={() => navigate('/login')}
                    className="text-blue-600 hover:text-blue-700 underline text-sm"
                  >
                    ← Retour à la connexion
                  </button>
                </div>
              </>
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