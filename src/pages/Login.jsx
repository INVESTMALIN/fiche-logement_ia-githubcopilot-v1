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
    <div className="min-h-screen bg-accent flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Connexion
          </h1>
          <p className="text-white text-opacity-90">
            Accédez à votre espace Letahost
          </p>
        </div>

        {/* Form */}
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg border">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                placeholder="votre@email.com"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
              </label>
              <a href="#" className="text-sm text-primary hover:text-yellow-500 transition-colors">
                Mot de passe oublié ?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connexion...
                </div>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <a href="#" className="text-primary hover:text-yellow-500 font-medium transition-colors">
                Contactez l'administrateur
              </a>
            </p>
          </div>

          {/* Aide pour les tests */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
            <strong>Accès test :</strong> test6@exemple.com / Test1234
          </div>
        </div>

        {/* Brand */}
        <div className="text-center">
          <p className="text-xs text-white text-opacity-75">
            © 2025 Letahost. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  )
}