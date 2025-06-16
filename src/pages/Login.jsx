import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import Button from '../components/Button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { signIn, loading, isAuthenticated } = useAuth()

  // Redirection si déjà connecté
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

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
    // Si pas d'erreur, la redirection se fait automatiquement via AuthContext
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Pattern hexagonal tech moderne */}
      <div className="absolute inset-0">
        {/* Grille d'hexagones dorés ultra fins */}
        <div className="absolute inset-0 opacity-15"
             style={{
               backgroundImage: `
                 radial-gradient(circle at 50% 50%, transparent 60%, rgba(219, 174, 97, 0.3) 60%, rgba(219, 174, 97, 0.3) 65%, transparent 65%),
                 radial-gradient(circle at 25% 25%, transparent 30%, rgba(219, 174, 97, 0.2) 30%, rgba(219, 174, 97, 0.2) 35%, transparent 35%),
                 radial-gradient(circle at 75% 75%, transparent 40%, rgba(219, 174, 97, 0.2) 40%, rgba(219, 174, 97, 0.2) 45%, transparent 45%)
               `,
               backgroundSize: '120px 120px, 80px 80px, 100px 100px',
               backgroundPosition: '0 0, 40px 40px, 60px 20px'
             }}>
        </div>
        
        {/* Lignes de connexion hexagonales */}
        <div className="absolute inset-0 opacity-10"
             style={{
               backgroundImage: `
                 linear-gradient(60deg, transparent 45%, rgba(219, 174, 97, 0.4) 45%, rgba(219, 174, 97, 0.4) 55%, transparent 55%),
                 linear-gradient(-60deg, transparent 45%, rgba(219, 174, 97, 0.4) 45%, rgba(219, 174, 97, 0.4) 55%, transparent 55%),
                 linear-gradient(0deg, transparent 48%, rgba(219, 174, 97, 0.3) 48%, rgba(219, 174, 97, 0.3) 52%, transparent 52%)
               `,
               backgroundSize: '60px 104px, 60px 104px, 120px 60px'
             }}>
        </div>
        
        {/* Effet de circuit doré subtil */}
        <div className="absolute inset-0 opacity-8"
             style={{
               backgroundImage: `
                 repeating-linear-gradient(90deg, transparent, transparent 180px, rgba(219, 174, 97, 0.1) 180px, rgba(219, 174, 97, 0.1) 182px),
                 repeating-linear-gradient(0deg, transparent, transparent 180px, rgba(219, 174, 97, 0.1) 180px, rgba(219, 174, 97, 0.1) 182px)
               `
             }}>
        </div>
        
        {/* Particules dorées animées plus visibles sur noir pur */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full opacity-70 animate-pulse" style={{backgroundColor: '#dbae61'}}></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 rounded-full opacity-50 animate-pulse delay-1000" style={{backgroundColor: '#dbae61'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-3 h-3 rounded-full opacity-40 animate-pulse delay-2000" style={{backgroundColor: '#dbae61'}}></div>
        <div className="absolute top-2/3 right-1/4 w-1 h-1 rounded-full opacity-60 animate-pulse delay-3000" style={{backgroundColor: '#dbae61'}}></div>
        <div className="absolute top-1/2 left-1/6 w-1 h-1 rounded-full opacity-30 animate-pulse delay-4000" style={{backgroundColor: '#dbae61'}}></div>
        
        {/* Effet de halo doré discret aux coins */}
        <div className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-20 blur-3xl" style={{backgroundColor: '#dbae61'}}></div>
        <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full opacity-15 blur-2xl" style={{backgroundColor: '#dbae61'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Marque */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-lg" style={{background: `linear-gradient(to right, #dbae61, #c19b4f)`}}>
            <span className="text-2xl font-bold text-gray-900">L</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Fiche Logement
          </h1>
          <p className="text-gray-300 text-sm">
            Plateforme interne • Letahost
          </p>
        </div>

        {/* Card de connexion */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Connexion
            </h2>
            <p className="text-gray-600 text-sm">
              Accédez à votre espace coordinateur
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                placeholder="votre@email.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200"
                style={{'--tw-ring-color': '#dbae61'}}
                onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px #dbae61`}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200"
                style={{'--tw-ring-color': '#dbae61'}}
                onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px #dbae61`}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Options */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 bg-gray-100 border-gray-300 rounded focus:ring-2"
                  style={{'--tw-ring-color': '#dbae61', accentColor: '#dbae61'}}
                />
                <span className="ml-2 text-sm text-gray-600">Se souvenir</span>
              </label>
              <button
                type="button"
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{color: '#dbae61'}}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #dbae61, #c19b4f)`,
                '--tw-ring-color': '#dbae61'
              }}
              onMouseEnter={(e) => e.target.style.background = `linear-gradient(to right, #c19b4f, #aa8943)`}
              onMouseLeave={(e) => e.target.style.background = `linear-gradient(to right, #dbae61, #c19b4f)`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Connexion en cours...
                </div>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Séparateur */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-600">
              Besoin d'aide ? 
              <button className="ml-1 font-medium hover:opacity-80 transition-colors" style={{color: '#dbae61'}}>
                Contactez l'équipe
              </button>
            </p>
          </div>

          {/* Informations de test (à supprimer en production) */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
            <div className="font-semibold text-blue-800 mb-1">Accès de test :</div>
            <div className="text-blue-700">
              Email: <code className="bg-blue-100 px-1 rounded">test6@exemple.com</code><br/>
              Mot de passe: <code className="bg-blue-100 px-1 rounded">Test1234</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-xs">
            © 2025 Letahost. Plateforme sécurisée pour coordinateurs.
          </p>
        </div>
      </div>
    </div>
  )
}