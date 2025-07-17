import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import Button from '../components/Button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { signIn, loading, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // 💾 Capture params Monday s'ils sont dans l'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const hasMondayParams = ['fullName', 'nom', 'email'].some(param => urlParams.get(param))

    if (hasMondayParams) {
      console.log('🔍 Login: Détection params Monday dans URL:', window.location.search)
      localStorage.setItem('pendingMondayParams', window.location.search)
    }
  }, [])

  // ✅ Redirection conditionnelle post-login
  useEffect(() => {
    if (isAuthenticated) {
      const pendingMondayParams = localStorage.getItem('pendingMondayParams')
      
      if (pendingMondayParams) {
        console.log('✅ Login: Récupération params Monday depuis localStorage:', pendingMondayParams)
        // ⚠️ NE PAS supprimer localStorage ici - laisser FormContext s'en occuper
        navigate(`/fiche${pendingMondayParams}`, { replace: true }) // ← LIGNE CRITIQUE !
      } else {
        console.log('✅ Login: Connexion normale, redirection Dashboard')
        navigate('/', { replace: true })
      }
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Veuillez remplir tous les champs')
      return
    }

    const { error: signInError } = await signIn(email, password)
    
    if (signInError) {
      setError(signInError)
    }
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
              Conciergerie innovante
            </p>
          </div>

          {/* Box de connexion */}
          <div className="bg-gray-50 p-8 rounded-2xl shadow-2xl border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
              Connexion
            </h2>

            {/* ✅ Message si params Monday en attente */}
            {typeof window !== 'undefined' && localStorage.getItem('pendingMondayParams') && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700 text-sm text-center">
                  📋 Formulaire Monday en attente – Connectez-vous pour continuer
                </p>
              </div>
            )}

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
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"
                  disabled={loading}
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
              {/* Lien mot de passe oublié */}
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/reset-password')}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </form>

            {/* Accès test */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 font-medium mb-2">Accès test :</p>
              <p className="text-xs text-blue-600">
                📧 coordinateur1@test.com | 🔑 Test1234
              </p>
              <p className="text-xs text-blue-600">
                📧 coordinateur2@test.com | 🔑 Test1234
              </p>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                Letahost • Invest Malin • Conciergerie Premium
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}