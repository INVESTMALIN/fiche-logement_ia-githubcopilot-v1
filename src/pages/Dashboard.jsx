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
      {/* Header avec pattern hexagonal tech */}
      <div className="bg-black text-white relative overflow-hidden">
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
        </div>
        
        <div className="max-w-screen-lg mx-auto p-6 relative z-10">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold mb-2">Mes fiches logement</h1>
            {userEmail && (
              <p className="text-white text-opacity-90">Connecté en tant que {userEmail}</p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end lg:absolute lg:top-6 lg:right-6">
            <button
              onClick={() => navigate("/fiche")}
              className="px-6 py-2.5 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 w-full sm:w-auto"
              style={{
                background: `linear-gradient(to right, #dbae61, #c19b4f)`,
              }}
              onMouseEnter={(e) => e.target.style.background = `linear-gradient(to right, #c19b4f, #aa8943)`}
              onMouseLeave={(e) => e.target.style.background = `linear-gradient(to right, #dbae61, #c19b4f)`}
            >
              + Nouvelle fiche
            </button>
            <button
              onClick={handleLogout}
              className="border border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-20 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 w-full sm:w-auto"
            >
              Déconnexion
            </button>
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
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeFilter === filter
                      ? 'text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                  style={activeFilter === filter ? {
                    background: `linear-gradient(to right, #dbae61, #c19b4f)`
                  } : {}}
                >
                  {filter}
                  {filter !== "Tous" && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      activeFilter === filter ? 'bg-white bg-opacity-20' : 'bg-gray-100'
                    }`}>
                      {fiches.filter(f => f.statut === filter).length}
                    </span>
                  )}
                  {filter === "Tous" && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      activeFilter === filter ? 'bg-white bg-opacity-20' : 'bg-gray-100'
                    }`}>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all duration-200"
                style={{'--tw-ring-color': '#dbae61'}}
                onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px #dbae61`}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
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
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 leading-tight group-hover:text-gray-700 transition-colors">
                    {fiche.nom}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(fiche.statut)}`}>
                    {fiche.statut}
                  </span>
                </div>
                
                <button
                  className="w-full mt-4 font-medium transition-all duration-200 text-left px-4 py-2 rounded-lg border border-transparent hover:border-gray-200"
                  style={{color: '#dbae61'}}
                  onClick={() => navigate(`/fiche/${fiche.id}`)}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#dbae61'
                    e.target.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent'
                    e.target.style.color = '#dbae61'
                  }}
                >
                  Modifier la fiche →
                </button>
              </div>
            </div>
          ))}

          {filteredFiches.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg font-medium">Aucune fiche trouvée</p>
              <p className="text-sm text-gray-400 mt-2">Essayez de modifier vos filtres ou votre recherche</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}