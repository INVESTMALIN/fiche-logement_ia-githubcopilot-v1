import { useNavigate } from 'react-router-dom'
import SidebarMenu from '../components/SidebarMenu'
import Button from '../components/Button'

export default function FicheForm() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <SidebarMenu currentSection="Propriétaire" />

      {/* Main content */}
      <div className="flex-1 p-6 bg-gray-100">
        <h1 className="text-2xl font-bold mb-6">Fiche propriétaire</h1>

        {/* Nom */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">Nom *</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input type="text" placeholder="Prénom" />
            </div>
            <div>
              <input type="text" placeholder="Nom de famille" />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">Email *</label>
          <input type="email" placeholder="exemple@exemple.com" />
        </div>

        {/* Adresse */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">Adresse *</label>
          <input type="text" placeholder="Numéro et rue" className="mb-2" />
          <input type="text" placeholder="Complément d’adresse" className="mb-2" />
          <input type="text" placeholder="Ville" className="mb-2" />
          <input type="text" placeholder="Code Postal" />
        </div>

        {/* Boutons */}
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="ghost" onClick={() => console.log('Enregistrement local')}>
            Enregistrer
          </Button>
          <Button variant="primary" onClick={() => navigate('/fiche/logement')}>
            Suivant
          </Button>
        </div>
      </div>
    </div>
  )
}
