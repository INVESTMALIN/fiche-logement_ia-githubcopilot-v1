import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import Button from '../components/Button'

export default function Dashboard() {
  const navigate = useNavigate()
  const { signOut, userEmail } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")

  // Données mock des fiches
  const fiches = [
    { id: 1, nom: "Appartement République", statut: "Brouillon" },
    { id: 2, nom: "Villa Sud", statut: "Complété" },
    { id: 3, nom: "Studio Montmartre", statut: "En cours" }
  ]

  const filteredFiches = fiches.filter(fiche =>
    fiche.nom.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleLogout = async () => {
    await signOut()
    // La redirection vers /login se fait automatiquement via AuthContext
  }

  return (
    <div className="p-4 max-w-screen-md mx-auto relative">
      {/* Header avec déconnexion responsive */}
      <div className="mb-6">
        {/* Titre et email */}
        <div className="mb-4 lg:mb-0">
          <h1 className="text-xl font-semibold">Mes fiches logement</h1>
          {userEmail && (
            <p className="text-sm text-gray-600 mt-1">Connecté en tant que {userEmail}</p>
          )}
        </div>
        
        {/* Boutons - Stack sur mobile, inline sur desktop */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end lg:absolute lg:top-4 lg:right-4">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate("/fiche")}
            className="w-full sm:w-auto"
          >
            + Nouvelle fiche
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={handleLogout}
            className="border border-gray-300 w-full sm:w-auto"
          >
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Barre de recherche */}
      <input
        type="text"
        placeholder="Rechercher un logement..."
        className="w-full mb-4 px-3 py-2 border rounded text-sm"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Liste des fiches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredFiches.map((fiche) => (
          <div
            key={fiche.id}
            className="bg-white p-4 rounded-lg shadow-sm flex flex-col justify-between border hover:shadow-md transition-shadow"
          >
            <div className="mb-2">
              <h2 className="text-base font-semibold">{fiche.nom}</h2>
              <p className="text-xs text-gray-500">{fiche.statut}</p>
            </div>
            <button
              className="text-primary text-sm mt-auto self-start hover:text-yellow-500 transition-colors"
              onClick={() => navigate(`/fiche/${fiche.id}`)}
            >
              Modifier
            </button>
          </div>
        ))}

        {filteredFiches.length === 0 && (
          <p className="text-sm text-gray-500 col-span-full text-center py-8">
            Aucune fiche trouvée.
          </p>
        )}
      </div>
    </div>
  )
}