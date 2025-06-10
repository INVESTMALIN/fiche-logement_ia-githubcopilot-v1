import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import Button from '../components/Button'

export default function Dashboard() {
  const navigate = useNavigate()
  const { signOut, userEmail } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState("Tous")

  // Données mock des fiches avec plus de variété
  const fiches = [
    { id: 1, nom: "Appartement République", statut: "Brouillon" },
    { id: 2, nom: "Villa Sud", statut: "Complété" },
    { id: 3, nom: "Studio Montmartre", statut: "En cours" },
    { id: 4, nom: "Loft Marais", statut: "Complété" },
    { id: 5, nom: "Maison Vincennes", statut: "En cours" },
    { id: 6, nom: "Duplex Bastille", statut: "Brouillon" }
  ]

  // Filtres de statut
  const statusFilters = ["Tous", "Complété", "En cours", "Brouillon"]
  
  // Filtrage par statut et recherche
  const filteredFiches = fiches.filter(fiche => {
    const matchesSearch = fiche.nom.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = activeFilter === "Tous" || fiche.statut === activeFilter
    return matchesSearch && matchesStatus
  })

  // Couleurs pour les statuts
  const getStatusColor = (statut) => {
    switch (statut) {
      case "Complété": return "bg-green-100 text-green-800"
      case "En cours": return "bg-blue-100 text-blue-800"
      case "Brouillon": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec gradient Letahost */}
      <div className="bg-gradient-to-r from-accent to-teal-500 text-white">
        <div className="max-w-screen-lg mx-auto p-6">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-2xl font-bold mb-2">Mes fiches logement</h1>
            {userEmail && (
              <p className="text-white text-opacity-90">Connecté en tant que {userEmail}</p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end lg:absolute lg:top-6 lg:right-6">
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
              className="border border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-20 w-full sm:w-auto"
            >
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-screen-lg mx-auto p-6">
        {/* Onglets de filtrage ET recherche sur la même ligne */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Onglets de filtrage */}
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeFilter === filter
                      ? 'bg-accent text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {filter}
                  {filter !== "Tous" && (
                    <span className="ml-2 bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                      {fiches.filter(f => f.statut === filter).length}
                    </span>
                  )}
                  {filter === "Tous" && (
                    <span className="ml-2 bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                      {fiches.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Barre de recherche */}
            <div className="sm:w-64">
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Liste des fiches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFiches.map((fiche) => (
            <div
              key={fiche.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                    {fiche.nom}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(fiche.statut)}`}>
                    {fiche.statut}
                  </span>
                </div>
                
                <button
                  className="w-full mt-4 text-accent font-medium hover:text-teal-600 transition-colors text-left"
                  onClick={() => navigate(`/fiche/${fiche.id}`)}
                >
                  Modifier la fiche →
                </button>
              </div>
            </div>
          ))}

          {filteredFiches.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">Aucune fiche trouvée</p>
              <p className="text-sm text-gray-400 mt-1">Essayez de modifier vos filtres</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}