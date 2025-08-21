import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { useFiches } from '../hooks/useFiches'
import { Edit, Archive, Trash2, RotateCcw, Grid3X3, List, UserPen, Share } from 'lucide-react'
import DropdownMenu from '../components/DropdownMenu'
import UserRoleBadge from '../components/UserRoleBadge'
import ReassignModal from '../components/ReassignModal'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const navigate = useNavigate()
  const { signOut, userEmail, userRole, isSuperAdmin } = useAuth()
  const { 
    fiches, 
    loading, 
    error, 
    refetch, 
    deleteFiche, 
    archiveFiche, 
    unarchiveFiche 
  } = useFiches()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState("Tous")
  const [viewMode, setViewMode] = useState('grid') // 'grid' ou 'list'
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [shareModal, setShareModal] = useState({
    isOpen: false,
    fiche: null
  })

  // 🆕 AJOUTS RÉAFFECTATION
  const [reassignModal, setReassignModal] = useState({
    isOpen: false,
    fiche: null
  })
  const [users, setUsers] = useState([])

  // 🆕 AJOUT FONCTION CHARGER USERS
  const loadUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'coordinateur')
        .eq('active', true)
        .order('prenom', { ascending: true })

      if (profilesError) throw profilesError
      setUsers(profilesData || [])
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error)
    }
  }

  // 🆕 AJOUT USEEFFECT
  useEffect(() => {
    loadUsers()
  }, [])

  // 🆕 AJOUT FONCTIONS RÉAFFECTATION
  const handleReassignFiche = (fiche) => {
    setReassignModal({
      isOpen: true,
      fiche: fiche
    })
  }

  const handleCloseReassign = () => {
    setReassignModal({
      isOpen: false,
      fiche: null
    })
  }

  const handleReassignSuccess = () => {
    refetch()
    setReassignModal({
      isOpen: false,
      fiche: null
    })
  }

  const handleShareFiche = (fiche) => {
    setShareModal({
      isOpen: true,
      fiche: fiche
    })
  }
  
  const handleCloseShare = () => {
    setShareModal({
      isOpen: false,
      fiche: null
    })
  }

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
  
    setDeleting(true) // 🆕 Début du loading
    
    try {
      const result = await deleteFiche(deleteConfirm.id)
      
      if (result.success) {
        console.log('Fiche supprimée avec succès')
      } else {
        console.error('Erreur suppression:', result.error)
      }
    } catch (error) {
      console.error('Erreur inattendue:', error)
    } finally {
      setDeleting(false) // 🆕 Fin du loading
      setDeleteConfirm(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm(null)
  }

  // NOUVELLE fonction pour gérer les actions du menu
  const handleMenuAction = async (action, fiche) => {
    switch (action.id) {
      case 'edit':
        navigate(`/fiche?id=${fiche.id}`)
        break
        
      case 'archive':
        const archiveResult = await archiveFiche(fiche.id)
        if (archiveResult.success) {
          console.log('Fiche archivée avec succès')
        } else {
          console.error('Erreur archivage:', archiveResult.error)
        }
        break
        
      case 'unarchive':
        const unarchiveResult = await unarchiveFiche(fiche.id)
        if (unarchiveResult.success) {
          console.log('Fiche restaurée avec succès')
        } else {
          console.error('Erreur restauration:', unarchiveResult.error)
        }
        break
        
      case 'delete':
        setDeleteConfirm(fiche)
        break

      // 🆕 AJOUT CASE RÉAFFECTER
      case 'reassign':
        handleReassignFiche(fiche)
        break

      case 'share':
          handleShareFiche(fiche)
          break
        
      default:
        console.warn('Action inconnue:', action.id)
    }
  }

  // Fonction pour générer les items du menu selon le statut
  const getMenuItems = (fiche) => {
    const baseItems = [
      {
        id: 'edit',
        label: 'Modifier',
        icon: <Edit size={16} />,
        className: 'text-blue-600 hover:bg-blue-50'
      },
            // 🆕 NOUVEAU : Bouton partage conditionnel
      ...(fiche.statut === 'Complété' ? [{
        id: 'share',
        label: 'Partager...',
        icon: <Share size={16} />,
        className: 'text-green-600 hover:bg-green-50'
      }] : []),
      // 🆕 AJOUT RÉAFFECTER
      {
        id: 'reassign',
        label: 'Réaffecter',
        icon: <UserPen size={16} />,
        className: 'text-purple-600 hover:bg-purple-50'
      }
    ]
  
    if (fiche.statut === 'Archivé') {
      const archivedItems = [
        ...baseItems,
        {
          id: 'unarchive',
          label: 'Désarchiver',
          icon: <RotateCcw size={16} />,
          className: 'text-green-600 hover:bg-green-50'
        }
      ]
  
      // 🔐 NOUVEAU : Ajouter "Supprimer" SEULEMENT pour super_admin
      if (userRole === 'super_admin') {
        archivedItems.push({
          id: 'delete',
          label: 'Supprimer',
          icon: <Trash2 size={16} />,
          danger: true
        })
      }
  
      return archivedItems
    } else {
      const activeItems = [
        ...baseItems,
        {
          id: 'archive',
          label: 'Archiver',
          icon: <Archive size={16} />,
          className: 'text-orange-600 hover:bg-orange-50'
        }
      ]
  
      // 🔐 NOUVEAU : Ajouter "Supprimer" SEULEMENT pour super_admin
      if (userRole === 'super_admin') {
        activeItems.push({
          id: 'delete',
          label: 'Supprimer',
          icon: <Trash2 size={16} />,
          danger: true
        })
      }
  
      return activeItems
    }
  }

  // Filtres de statut
  const statusFilters = ["Tous", "Complété", "Brouillon", "Archivé"]
  
  // Filtrage par statut et recherche
  const filteredFiches = fiches.filter(fiche => {
    const matchesSearch = fiche.nom.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = activeFilter === "Tous" 
      ? fiche.statut !== "Archivé"
      : fiche.statut === activeFilter
    return matchesSearch && matchesStatus
  })

  // Couleurs pour les statuts
  const getStatusColor = (statut) => {
    switch (statut) {
      case "Complété": return "bg-green-100 text-green-800"
      case "Brouillon": return "bg-gray-100 text-gray-800"
      case "Archivé": return "bg-blue-100 text-blue-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  // Helper pour compter les fiches par filtre
  const getFilterCount = (filter) => {
    return filter === "Tous" 
      ? fiches.filter(f => f.statut !== 'Archivé').length
      : fiches.filter(f => f.statut === filter).length
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
      {/* Header */}
      <div className="bg-gray-900 text-white py-8 px-6">
        <div className="max-w-screen-lg mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Mes fiches logement</h1>
              <p className="text-lg opacity-90">
              Accès <UserRoleBadge /> : <span className="font-medium">{userEmail}</span>
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
              {/* ✅ NOUVEAU BOUTON - Console Admin (visible uniquement pour super_admin) */}
              {isSuperAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="border border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-20 px-3 py-2.5 rounded-xl transition-all duration-200"
                  title="Console Admin"
                >
                  Console
                </button>
              )}          
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-screen-lg mx-auto p-6 pb-24">
        {/* Onglets de filtrage, recherche ET toggle vue */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeFilter === filter ? 'bg-white bg-opacity-20' : 'bg-gray-100'
                  }`}>
                    {getFilterCount(filter)}
                  </span>
                </button>
              ))}
            </div>

            {/* Recherche + Toggle vues */}
            <div className="flex gap-3 items-center">
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

              {/* Toggle Grid/List */}
              <div className="flex bg-white rounded-lg border border-gray-300 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Vue grille"
                >
                  <Grid3X3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Vue liste"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vue Grid */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiches.map((fiche) => (
              <div
                key={fiche.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-visible group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight group-hover:text-gray-700 transition-colors truncate mb-2">
                        {fiche.nom}
                      </h3>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(fiche.statut)}`}>
                        {fiche.statut}
                      </span>
                    </div>
                    
                    {/* Menu contextuel */}
                    <DropdownMenu
                      items={getMenuItems(fiche)}
                      onSelect={(action) => handleMenuAction(action, fiche)}
                      triggerClassName="flex-shrink-0"
                    />
                  </div>
                  
                  {/* Informations supplémentaires */}
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Créée le {new Date(fiche.created_at).toLocaleDateString('fr-FR')}</p>
                    {fiche.updated_at !== fiche.created_at && (
                      <p>Modifiée le {new Date(fiche.updated_at).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vue List */}
        {viewMode === 'list' && (
          <div className="space-y-2">
            {filteredFiches.map((fiche) => (
              <div
                key={fiche.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-visible"
              >
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Nom de la fiche */}
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {fiche.nom}
                      </h3>
                      
                      {/* Statut */}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(fiche.statut)}`}>
                        {fiche.statut}
                      </span>
                      
                      {/* Dates */}
                      <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
                        <span>Créée le {new Date(fiche.created_at).toLocaleDateString('fr-FR')}</span>
                        {fiche.updated_at !== fiche.created_at && (
                          <span>Modifiée le {new Date(fiche.updated_at).toLocaleDateString('fr-FR')}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Menu contextuel */}
                    <DropdownMenu
                      items={getMenuItems(fiche)}
                      onSelect={(action) => handleMenuAction(action, fiche)}
                      triggerClassName="flex-shrink-0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Message si aucune fiche */}
        {filteredFiches.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg font-medium">Aucune fiche dans cette section</p>
          </div>
        )}
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
                disabled={deleting}
                className={`px-4 py-2 transition-colors ${
                  deleting 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  deleting
                    ? 'bg-red-400 cursor-not-allowed text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {deleting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 AJOUT MODAL RÉAFFECTATION */}
      <ReassignModal
        fiche={reassignModal.fiche}
        users={users}
        isOpen={reassignModal.isOpen}
        onClose={handleCloseReassign}
        onSuccess={handleReassignSuccess}
      />

{/* 🆕 MODAL DE PARTAGE */}
{shareModal.isOpen && shareModal.fiche && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl p-6 max-w-lg w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        🔗 Partager la fiche "{shareModal.fiche.nom}"
      </h3>
      
      <div className="space-y-4">
        {/* PDF Logement */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900">📄 PDF Logement</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={`${window.location.origin}/print-pdf?fiche=${shareModal.fiche.id}`}
              className="flex-1 px-3 py-2 bg-white border rounded text-sm"
            />
            <button
              onClick={() => {
                const url = `${window.location.origin}/print-pdf?fiche=${shareModal.fiche.id}`
                navigator.clipboard.writeText(url)
                // TODO: Ajouter feedback "Copié !"
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Copier
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/print-pdf?fiche=${shareModal.fiche.id}`
                const message = `Voici le PDF Logement de la fiche "${shareModal.fiche.nom}" : ${url}`
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
                window.open(whatsappUrl, '_blank')
              }}
              className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              WhatsApp
            </button>
          </div>
        </div>

        {/* PDF Ménage */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900">🧹 PDF Ménage</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={`${window.location.origin}/print-pdf-menage?fiche=${shareModal.fiche.id}`}
              className="flex-1 px-3 py-2 bg-white border rounded text-sm"
            />
            <button
              onClick={() => {
                const url = `${window.location.origin}/print-pdf-menage?fiche=${shareModal.fiche.id}`
                navigator.clipboard.writeText(url)
                // TODO: Ajouter feedback "Copié !"
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Copier
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/print-pdf-menage?fiche=${shareModal.fiche.id}`
                const message = `Voici le PDF Ménage de la fiche "${shareModal.fiche.nom}" : ${url}`
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
                window.open(whatsappUrl, '_blank')
              }}
              className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={handleCloseShare}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  )
}