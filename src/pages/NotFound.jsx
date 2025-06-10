import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 text-center px-4">
      <div>
        <h1 className="text-4xl font-bold mb-4">404 - La page est introuvable</h1>
        <p className="mb-6 text-gray-600">Oups, la page que vous cherchez n’existe pas.</p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Retour à l’accueil
        </Button>
      </div>
    </div>
  )
}
