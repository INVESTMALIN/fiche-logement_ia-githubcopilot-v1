import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { useFiches } from '../hooks/useFiches'
import Button from '../components/Button'
import { Trash2 } from 'lucide-react'; // <-- NOUVEL IMPORT pour l'icône poubelle

export default function Dashboard() {
  const navigate = useNavigate()
  const { signOut, userEmail } = useAuth()
  const { fiches, loading, error, refetch, deleteFiche } = useFiches() // Assure-toi que deleteFiche est bien destructuré
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState("Tous")
  const [deleteConfirm, setDeleteConfirm] = useState(null) // Pour la confirmation de suppression

  // Déconnexion
  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  // Gestion de la suppression avec confirmation
  const handleDeleteClick = (fiche) => {
    setDeleteConfirm(fiche)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return

    const result = await deleteFiche(deleteConfirm.id)
    
    if (result.success) {
      console.log('Fiche supprimée avec succès')
      // refetch() // Pas besoin de refetch car useFiches fait déjà un optimistic update
    } else {
      console.error('Erreur suppression:', result.error)
      // TODO: Afficher une notification d'erreur plus visible
    }
    
    setDeleteConfirm(null)
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm(null)
  }

  // Filtres de statut - on garde "Tous" mais on adapte les statuts à notre spec
  const statusFilters = ["Tous", "Complété", "Brouillon", "Archivé"]
  
  // Filtrage par statut et recherche
  const filteredFiches = fiches.filter(fiche => {
    const matchesSearch = fiche.nom.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = activeFilter === "Tous" || fiche.statut === activeFilter
    return matchesSearch && matchesStatus
  })

  // Couleurs pour les statuts - on adapte à notre spec
  const getStatusColor = (statut) => {
    switch (statut) {
      case "Complété": return "bg-green-100 text-green-800"
      case "Brouillon": return "bg-gray-100 text-gray-800"
      case "Archivé": return "bg-blue-100 text-blue-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  // Affichage pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des fiches...</p>
        </div>
      </div>
    )
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium mb-2">Erreur de chargement</p>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header avec le même style qu'avant */}
      <div className="bg-gray-900 text-white py-8 px-6">
        <div className="max-w-screen-lg mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Mes fiches logement</h1>
              <p className="text-lg opacity-90">
                Connecté en tant que <span className="font-medium">{userEmail}</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/fiche')}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg transition-all duration-200 w-full sm:w-auto"
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
      </div>

      {/* Contenu principal - même style qu'avant */}
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

        {/* Liste des fiches - même style qu'avant */}
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
                
                {/* Nouveau: Boutons Modifier et Supprimer */}
                <div className="flex justify-between items-center mt-4">
                    <button
                        className="font-medium transition-all duration-200 text-left px-4 py-2 rounded-lg border border-transparent hover:border-gray-200"
                        style={{color: '#dbae61'}}
                        onClick={() => navigate(`/fiche?id=${fiche.id}`)}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#dbae61';
                            e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#dbae61';
                        }}
                    >
                        Modifier la fiche →
                    </button>
                    <button
                        onClick={() => handleDeleteClick(fiche)} // <-- Appel du handler de suppression
                        className="text-red-500 hover:text-red-700 p-2 rounded-full transition-colors"
                        title="Supprimer la fiche"
                    >
                        <Trash2 size={20} /> {/* <-- Icône poubelle */}
                    </button>
                </div>
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

      {/* Modal de confirmation de suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Supprimer la fiche ?
            </h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer la fiche "<strong>{deleteConfirm.nom}</strong>" ? 
              Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}