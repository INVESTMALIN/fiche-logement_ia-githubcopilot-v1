// src/pages/Login.jsx (modifié)
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import Button from '../components/Button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { signIn, loading, isAuthenticated, userRole } = useAuth() // ✅ Ajout userRole
  const navigate = useNavigate()

  // ✅ MODIFIÉ: Redirection conditionnelle selon le rôle
  useEffect(() => {
    if (isAuthenticated && userRole !== null) { // ✅ Attendre que le rôle soit chargé
      const pendingMondayParams = localStorage.getItem('pendingMondayParams')
      
      if (pendingMondayParams) {
        console.log('✅ Login: Récupération params Monday depuis localStorage:', pendingMondayParams)
        // Monday params = toujours vers /fiche (même pour super-admin)
        navigate(`/fiche${pendingMondayParams}`, { replace: true })
      } else {
        // ✅ NOUVELLE LOGIQUE: Redirection selon le rôle
        if (userRole === 'super_admin') {
          console.log('✅ Login: Super Admin → Console Admin')
          navigate('/admin', { replace: true })
        } else {
          console.log('✅ Login: Coordinateur/Admin → Dashboard')
          navigate('/', { replace: true })
        }
      }
    }
  }, [isAuthenticated, userRole, navigate]) // ✅ Ajout userRole dans les dépendances

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

          {/* ✅ Message si params Monday en attente */}
          {typeof window !== 'undefined' && localStorage.getItem('pendingMondayParams') && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm text-center">
                📋 Formulaire Monday en attente - Connectez-vous pour continuer
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
  )
}