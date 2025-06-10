import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

export default function Dashboard() {
  const navigate = useNavigate()
  const allFiches = [
    { id: 1, nom: 'Apt. République', statut: 'Brouillon' },
    { id: 2, nom: 'Villa Sud', statut: 'Complété' },
    { id: 3, nom: 'Studio Montmartre', statut: 'En cours' },
  ]

  const [search, setSearch] = useState('')

  const filteredFiches = allFiches.filter(fiche =>
    fiche.nom.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 max-w-screen-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Mes fiches logement</h1>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/fiche/nouvelle')}
        >
          + Nouvelle fiche
        </Button>
      </div>

      <input
        type="text"
        placeholder="Rechercher un logement..."
        className="w-full mb-4 px-3 py-2 border rounded text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {filteredFiches.map((fiche) => (
        <div
          key={fiche.id}
          className="bg-white p-4 rounded-lg shadow-sm flex flex-col justify-between"
        >
          <div className="mb-2">
            <h2 className="text-base font-semibold">{fiche.nom}</h2>
            <p className="text-xs text-gray-500">{fiche.statut}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/fiche/${fiche.id}`)}
          >
            Modifier
          </Button>
        </div>
      ))}

        {filteredFiches.length === 0 && (
          <p className="text-sm text-gray-500 col-span-full">Aucune fiche trouvée.</p>
        )}
      </div>
    </div>
  )
}
