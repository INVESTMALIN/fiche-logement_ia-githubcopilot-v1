// src/pages/Login.jsx
import { useState, useEffect } from 'react' // Ajout useEffect
import { useNavigate } from 'react-router-dom' // Ajout useNavigate
import { useAuth } from '../components/AuthContext'
import Button from '../components/Button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { signIn, loading, isAuthenticated } = useAuth()
  const navigate = useNavigate() // Utilise useNavigate

  // 🎯 MODIFIÉ: Redirection si déjà connecté OU récupération params Monday  
  useEffect(() => {
    if (isAuthenticated) {
      const pendingMondayParams = localStorage.getItem('pendingMondayParams')
      
      if (pendingMondayParams) {
        console.log('✅ Login: Récupération params Monday depuis localStorage:', pendingMondayParams)
        // ⚠️ NE PAS supprimer localStorage ici - laisser FormContext s'en occuper
        navigate(`/fiche${pendingMondayParams}`, { replace: true }) // Redirige avec params
      } else {
        console.log('✅ Login: Connexion normale, redirection Dashboard')
        navigate('/', { replace: true }) // Dashboard par défaut
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
      setError('Email ou mot de passe incorrect')
    }
    // Si pas d'erreur, la redirection se fait automatiquement via useEffect ci-dessus
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Points scintillants */}
      <div className="absolute inset-0">
        {/* Points dorés animés */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-yellow-300 rounded-full opacity-80 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/4 left-2/3 w-1.5 h-1.5 bg-yellow-500 rounded-full opacity-50 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-yellow-400 rounded-full opacity-70 animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-yellow-300 rounded-full opacity-40 animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/6 right-2/3 w-1 h-1 bg-yellow-500 rounded-full opacity-90 animate-pulse" style={{animationDelay: '2.5s'}}></div>
      </div>

      {/* Card de connexion */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 shadow-2xl">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-black">L</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Connexion</h1>
            <p className="text-gray-600">Accédez à votre espace coordinateur</p>
          </div>

          {/* 🎯 NOUVEAU: Message si params Monday en attente */}
          {typeof window !== 'undefined' && localStorage.getItem('pendingMondayParams') && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm text-center">
                📋 Formulaire Monday en attente - Connectez-vous pour continuer
              </p>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent mr-2"></div>
                  Se connecter...
                </div>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 mb-4">
              Letahost • Conciergerie de luxe
            </p>
            
            {/* Accès de test */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-800 mb-1">Accès de test :</p>
              <p className="text-xs text-blue-700">Email: coordinateur@test.com</p>
              <p className="text-xs text-blue-700">Mot de passe: Test1234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}