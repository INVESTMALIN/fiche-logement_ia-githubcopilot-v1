// src/pages/AdminConsole.jsx - Version complète avec menu contextuel
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Edit, Archive, Trash2, RotateCcw } from 'lucide-react'
import FichePreviewModal from '../components/FichePreviewModal'
import ReassignModal from '../components/ReassignModal'
import DropdownMenu from '../components/DropdownMenu'
import { useAuth } from '../components/AuthContext'

export default function AdminConsole() {
  const navigate = useNavigate()
  const { userRole } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [fiches, setFiches] = useState([])
  const [loading, setLoading] = useState(true)
  
  // State pour le modal de prévisualisation
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    fiche: null
  })

  // State pour le modal de réaffectation
  const [reassignModal, setReassignModal] = useState({
    isOpen: false,
    fiche: null
  })

  // State pour le modal de suppression
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Charger les données utilisateurs et fiches
  const loadData = async () => {
    try {
      setLoading(true)

      // Charger tous les utilisateurs (profiles)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Charger toutes les fiches avec JOIN manuel côté client
      const { data: fichesData, error: fichesError } = await supabase
        .from('fiches')
        .select('*')
        .order('updated_at', { ascending: false })

      if (fichesError) throw fichesError

      // JOIN manuel : ajouter les infos créateur à chaque fiche
      const fichesWithCreator = fichesData.map(fiche => ({
        ...fiche,
        creator: profilesData.find(profile => profile.id === fiche.user_id)
      }))

      setUsers(profilesData || [])
      setFiches(fichesWithCreator || [])
    } catch (error) {
      console.error('Erreur chargement données console admin:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fonctions pour gérer le modal de prévisualisation
  const handlePreviewFiche = (fiche) => {
    setPreviewModal({
      isOpen: true,
      fiche: fiche
    })
  }

  const handleClosePreview = () => {
    setPreviewModal({
      isOpen: false,
      fiche: null
    })
  }

  const handleEditFromPreview = (fiche) => {
    handleClosePreview()
    navigate(`/fiche?id=${fiche.id}`)
  }

  // Fonctions pour gérer le modal de réaffectation
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
    loadData()
  }

  // Fonctions pour gérer les actions sur les fiches
  const handleMenuAction = async (action, fiche) => {
    switch (action.id) {
      case 'edit':
        navigate(`/fiche?id=${fiche.id}`)
        break
        
      case 'archive':
        const archiveResult = await archiveFiche(fiche.id)
        if (archiveResult.success) {
          console.log('Fiche archivée avec succès')
          loadData()
        } else {
          console.error('Erreur archivage:', archiveResult.error)
        }
        break
        
      case 'unarchive':
        const unarchiveResult = await unarchiveFiche(fiche.id)
        if (unarchiveResult.success) {
          console.log('Fiche restaurée avec succès')
          loadData()
        } else {
          console.error('Erreur restauration:', unarchiveResult.error)
        }
        break
        
      case 'delete':
        setDeleteConfirm(fiche)
        break
        
      default:
        console.warn('Action inconnue:', action.id)
    }
  }

  // Générer les items du menu selon le statut de la fiche
  const getMenuItems = (fiche) => {
    const baseItems = [
      {
        id: 'edit',
        label: 'Modifier',
        icon: <Edit size={16} />,
        className: 'text-blue-600 hover:bg-blue-50'
      }
    ]
  
    if (fiche.statut === 'Archivé') {
      const archivedItems = [
        {
          id: 'unarchive',
          label: 'Désarchiver',
          icon: <RotateCcw size={16} />,
          className: 'text-green-600 hover:bg-green-50'
        }
      ]
  
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

  // Fonctions de gestion de la suppression
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return

    const result = await deleteFiche(deleteConfirm.id)
    
    if (result.success) {
      console.log('Fiche supprimée avec succès')
      loadData()
    } else {
      console.error('Erreur suppression:', result.error)
    }
    
    setDeleteConfirm(null)
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm(null)
  }

  // Fonctions d'archivage et suppression Supabase
  const archiveFiche = async (ficheId) => {
    try {
      const { error } = await supabase
        .from('fiches')
        .update({ statut: 'Archivé', updated_at: new Date().toISOString() })
        .eq('id', ficheId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const unarchiveFiche = async (ficheId) => {
    try {
      const { error } = await supabase
        .from('fiches')
        .update({ statut: 'Brouillon', updated_at: new Date().toISOString() })
        .eq('id', ficheId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const deleteFiche = async (ficheId) => {
    try {
      const { error } = await supabase
        .from('fiches')
        .delete()
        .eq('id', ficheId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Calculer les compteurs pour les onglets
  const tabs = [
    { 
      id: 'users', 
      label: 'Gestion Utilisateurs', 
      count: users.length 
    },
    { 
      id: 'fiches', 
      label: 'Toutes les Fiches', 
      count: fiches.length 
    },
    { 
      id: 'stats', 
      label: 'Statistiques', 
      count: null 
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement console admin...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Console Admin avec fond rouge */}
      <div className="bg-red-600 text-white py-8 px-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Console Administration</h1>
              <p className="text-lg opacity-90">Gestion globale - Accès Super Admin</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-2.5 rounded-xl font-medium transition-all duration-200"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white border-b">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu des onglets */}
      <div className="max-w-screen-xl mx-auto p-6">
        {activeTab === 'users' && (
          <UsersTab users={users} onRefresh={loadData} />
        )}
        
        {activeTab === 'fiches' && (
          <FichesTab 
            fiches={fiches} 
            users={users} 
            onRefresh={loadData} 
            onPreviewFiche={handlePreviewFiche}
            onReassignFiche={handleReassignFiche}
            onMenuAction={handleMenuAction}
            getMenuItems={getMenuItems}
          />
        )}
        
        {activeTab === 'stats' && (
          <StatsTab users={users} fiches={fiches} />
        )}
      </div>

      {/* Modal de prévisualisation des fiches */}
      <FichePreviewModal
        fiche={previewModal.fiche}
        isOpen={previewModal.isOpen}
        onClose={handleClosePreview}
        onEdit={handleEditFromPreview}
      />

      {/* Modal de réaffectation */}
      <ReassignModal
        fiche={reassignModal.fiche}
        users={users}
        isOpen={reassignModal.isOpen}
        onClose={handleCloseReassign}
        onSuccess={handleReassignSuccess}
      />

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

// Composant Gestion Utilisateurs
function UsersTab({ users, onRefresh }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Gestion des Utilisateurs</h2>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            + Nouveau coordinateur
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full relative">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilisateur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rôle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Créé le
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.prenom || user.nom ? 
                        `${user.prenom} ${user.nom}`.trim() : 'Non renseigné'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role === 'super_admin' ? 'Super Admin' :
                     user.role === 'admin' ? 'Admin' : 'Coordinateur'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-red-600 hover:text-red-900 mr-3">Modifier</button>
                  <button className="text-gray-600 hover:text-gray-900">Désactiver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Composant Toutes les Fiches avec split button
function FichesTab({ fiches, users, onRefresh, onPreviewFiche, onReassignFiche, onMenuAction, getMenuItems }) {
  
  // Générer les items du dropdown (sans "Voir")
  const getDropdownItems = (fiche) => {
    const items = [
      {
        id: 'reassign',
        label: 'Réaffecter',
        icon: <Edit size={16} />,
        className: 'text-red-600 hover:bg-red-50'
      },
      {
        id: 'edit',
        label: 'Modifier',
        icon: <Edit size={16} />,
        className: 'text-blue-600 hover:bg-blue-50'
      }
    ]

    // Ajouter Archiver/Désarchiver selon le statut
    if (fiche.statut === 'Archivé') {
      items.push({
        id: 'unarchive',
        label: 'Désarchiver',
        icon: <RotateCcw size={16} />,
        className: 'text-green-600 hover:bg-green-50'
      })
    } else {
      items.push({
        id: 'archive',
        label: 'Archiver',
        icon: <Archive size={16} />,
        className: 'text-orange-600 hover:bg-orange-50'
      })
    }

    // Ajouter Supprimer pour super-admin uniquement
    if (users.find(u => u.role === 'super_admin')) { // Quick check
      items.push({
        id: 'delete',
        label: 'Supprimer',
        icon: <Trash2 size={16} />,
        danger: true
      })
    }

    return items
  }

  const handleDropdownAction = (action, fiche) => {
    if (action.id === 'reassign') {
      onReassignFiche(fiche)
    } else {
      onMenuAction(action, fiche)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">Toutes les Fiches Logement</h2>
        <p className="text-gray-600 mt-1">Vue globale et gestion complète</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom de la fiche
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Créé par
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Modifié le
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fiches.map(fiche => (
              <tr key={fiche.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{fiche.nom}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {fiche.creator ? 
                    `${fiche.creator.prenom} ${fiche.creator.nom}`.trim() || fiche.creator.email :
                    'Utilisateur supprimé'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    fiche.statut === 'Complété' ? 'bg-green-100 text-green-800' :
                    fiche.statut === 'Archivé' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {fiche.statut}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(fiche.updated_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {/* ✅ NOUVEAU - Split button : [Voir] [▼] */}
                  <div className="flex items-center">
                    <button 
                      onClick={() => onPreviewFiche(fiche)}
                      className="px-3 py-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-l border border-gray-300 transition-colors"
                    >
                      Voir
                    </button>
                    <DropdownMenu
                      items={getDropdownItems(fiche)}
                      onSelect={(action) => handleDropdownAction(action, fiche)}
                      triggerClassName="px-2 py-1 border-l-0 border border-gray-300 rounded-r hover:bg-gray-50 transition-colors focus:outline-none focus:ring-0"
                      menuClassName="right-0 z-50"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Composant Statistiques
function StatsTab({ users, fiches }) {
  const coordCount = users.filter(u => u.role === 'coordinateur').length
  const adminCount = users.filter(u => u.role === 'admin').length
  const superAdminCount = users.filter(u => u.role === 'super_admin').length
  
  const brouillonCount = fiches.filter(f => f.statut === 'Brouillon').length
  const completeCount = fiches.filter(f => f.statut === 'Complété').length
  const archiveCount = fiches.filter(f => f.statut === 'Archivé').length

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Stats Utilisateurs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">👥 Utilisateurs</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Coordinateurs</span>
            <span className="font-semibold text-green-600">{coordCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Admins</span>
            <span className="font-semibold text-blue-600">{adminCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Super Admins</span>
            <span className="font-semibold text-red-600">{superAdminCount}</span>
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-gray-900">{users.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Fiches */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Fiches Logement</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Brouillons</span>
            <span className="font-semibold text-yellow-600">{brouillonCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Complétées</span>
            <span className="font-semibold text-green-600">{completeCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Archivées</span>
            <span className="font-semibold text-gray-600">{archiveCount}</span>
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-gray-900">{fiches.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}