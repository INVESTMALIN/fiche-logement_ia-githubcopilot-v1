// src/pages/AdminConsole.jsx - Version complète fonctionnelle
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Edit, Archive, Trash2, RotateCcw, Eye, MoreHorizontal, Search, UserPen } from 'lucide-react'
import FichePreviewModal from '../components/FichePreviewModal'
import ReassignModal from '../components/ReassignModal'
import { useAuth } from '../components/AuthContext'

// ✅ Dropdown moderne avec portal
function ModernDropdown({ items, onSelect, fiche }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const toggleDropdown = (e) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  const handleItemClick = (action, e) => {
    e.stopPropagation()
    setIsOpen(false)
    onSelect(action, fiche)
  }

  // Fermeture au clic extérieur - Simple et efficace
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={toggleDropdown}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <MoreHorizontal size={18} className="text-gray-500" />
      </button>

      {/* Menu dropdown avec position intelligente */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 min-w-48 py-2 z-[999]"
          style={{
            // Si on est dans les 200px du bas, ouvrir vers le haut
            ...(window.innerHeight - dropdownRef.current?.getBoundingClientRect().bottom < 200 
              ? { bottom: '100%', marginBottom: '4px', marginTop: '0' }
              : { top: '100%', marginTop: '4px' }
            ),
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
        >
          {items.map((item, index) => (
            <button
              key={item.id || index}
              onClick={(e) => handleItemClick(item, e)}
              className={`
                w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors
                flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg
                ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
              `}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span className="flex-1 font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ✅ Modal pour modifier un utilisateur
function EditUserModal({ user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    prenom: user.prenom || '',
    nom: user.nom || '',
    email: user.email || '',
    role: user.role || 'coordinateur'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          prenom: formData.prenom,
          nom: formData.nom,
          role: formData.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
      
      console.log('Utilisateur modifié avec succès')
      onSuccess()
    } catch (error) {
      console.error('Erreur lors de la modification:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Modifier l'utilisateur
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
            <input
              type="text"
              value={formData.prenom}
              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="coordinateur">Coordinateur</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
          <button
              onClick={() => setDeleteConfirm(null)}
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
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Modification...' : 'Modifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ✅ Modal pour créer un nouvel utilisateur
function NewUserModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    password: '',
    role: 'coordinateur'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      })

      if (authError) throw authError

      // 2. Créer le profil dans la table profiles
      // 2. Créer le profil dans la table profiles (avec upsert)
const { error: profileError } = await supabase
.from('profiles')
.upsert({
  id: authData.user.id,
  email: formData.email,
  prenom: formData.prenom,
  nom: formData.nom,
  role: formData.role,
  active: true
})

if (profileError) throw profileError

      if (profileError) throw profileError
      
      console.log('Nouvel utilisateur créé avec succès')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erreur lors de la création:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Nouvel utilisateur
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
            <input
              type="text"
              value={formData.prenom}
              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="coordinateur">Coordinateur</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
  const [deleting, setDeleting] = useState(false)

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

  // Fonctions pour archiver/désarchiver une fiche
  const archiveFiche = async (ficheId) => {
    try {
      const { error } = await supabase
        .from('fiches')
        .update({ statut: 'Archivé' })
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
        .update({ statut: 'Brouillon' })
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
      <div className="bg-red-600 text-white py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Console Administration</h1>
              <p className="text-base sm:text-lg opacity-90">Gestion globale - Accès Super Admin</p>
            </div>
            
            {/* Boutons empilés sur mobile, côte à côte sur desktop */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/')}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-2.5 rounded-xl font-medium transition-all duration-200 w-full sm:w-auto text-center"
              >
                Dashboard
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  navigate('/login')
                }}
                className="border border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-20 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 w-full sm:w-auto text-center"
              >
                Déconnexion
              </button>
            </div>
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
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  setDeleting(true) // 🆕 Début du loading
                  try {
                    const result = await deleteFiche(deleteConfirm.id)
                    if (result.success) {
                      console.log('Fiche supprimée avec succès')
                      loadData()
                    } else {
                      console.error('Erreur suppression:', result.error)
                    }
                  } catch (error) {
                    console.error('Erreur inattendue:', error)
                  } finally {
                    setDeleting(false) // 🆕 Fin du loading
                    setDeleteConfirm(null)
                  }
                }}
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
    </div>
  )
}

// Composant Gestion Utilisateurs
function UsersTab({ users, onRefresh }) {
  const [editModal, setEditModal] = useState({ isOpen: false, user: null })
  const [newUserModal, setNewUserModal] = useState(false)

  // Fonction pour modifier un utilisateur
  const handleEditUser = (user) => {
    setEditModal({ isOpen: true, user })
  }

  // Fonction pour désactiver/activer un utilisateur
  const handleToggleUser = async (user) => {
    try {
      const newStatus = user.active === false ? true : false
      const { error } = await supabase
        .from('profiles')
        .update({ active: newStatus })
        .eq('id', user.id)

      if (error) throw error
      
      console.log(`Utilisateur ${newStatus ? 'activé' : 'désactivé'} avec succès`)
      onRefresh()
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error)
    }
  }

  // Fonction pour créer un nouvel utilisateur
  const handleNewUser = () => {
    setNewUserModal(true)
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Gestion utilisateurs</h2>
            <p className="text-gray-600 mt-1">Administration des comptes</p>
          </div>
          <button 
            onClick={handleNewUser}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            + Nouvel utilisateur
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full">
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
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user.prenom ? user.prenom.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.prenom && user.nom ? 
                          `${user.prenom} ${user.nom}`.trim() : 'Non renseigné'}
                      </div>
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
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleEditUser(user)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors font-medium"
                    >
                      Modifier
                    </button>
                    <button 
                      onClick={() => handleToggleUser(user)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        user.active === false 
                          ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
                          : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      }`}
                    >
                      {user.active === false ? 'Activer' : 'Désactiver'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Modifier Utilisateur */}
      {editModal.isOpen && (
        <EditUserModal 
          user={editModal.user}
          onClose={() => setEditModal({ isOpen: false, user: null })}
          onSuccess={() => {
            onRefresh()
            setEditModal({ isOpen: false, user: null })
          }}
        />
      )}

      {/* Modal Nouvel Utilisateur */}
      {newUserModal && (
        <NewUserModal 
          onClose={() => setNewUserModal(false)}
          onSuccess={() => {
            onRefresh()
            setNewUserModal(false)
          }}
        />
      )}
    </div>
  )
}

// Composant Toutes les Fiches avec design moderne
function FichesTab({ fiches, users, onRefresh, onPreviewFiche, onReassignFiche, onMenuAction }) {
  const [searchTerm, setSearchTerm] = useState("") // ✅ NOUVEAU
  
  // ✅ NOUVEAU : Filtrer les fiches selon la recherche
  const filteredFiches = fiches.filter(fiche => 
    fiche.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (fiche.creator?.prenom && `${fiche.creator.prenom} ${fiche.creator.nom}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (fiche.creator?.email && fiche.creator.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  // Générer les items du dropdown
  const getDropdownItems = (fiche) => {
    const items = [
      {
        id: 'reassign',
        label: 'Réaffecter',
        icon: <UserPen size={16} />,
      },
      {
        id: 'edit',
        label: 'Modifier',
        icon: <Edit size={16} />,
      }
    ]

    // Ajouter Archiver/Désarchiver selon le statut
    if (fiche.statut === 'Archivé') {
      items.push({
        id: 'unarchive',
        label: 'Désarchiver',
        icon: <RotateCcw size={16} />,
      })
    } else {
      items.push({
        id: 'archive',
        label: 'Archiver',
        icon: <Archive size={16} />,
      })
    }

    // Ajouter Supprimer pour super-admin uniquement
    if (users.find(u => u.role === 'super_admin')) {
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
      <div>
  <h2 className="text-xl font-semibold">Fiches logement</h2>
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
    <p className="text-gray-600">{filteredFiches.length} fiche(s) {searchTerm && `sur ${fiches.length}`}</p>
    
    <div className="relative">
      <input
        type="text"
        placeholder="Rechercher..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full sm:w-64 px-3 py-2 pl-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
    </div>
  </div>
</div>
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
            {filteredFiches.map(fiche => (
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
                  <div className="flex items-center gap-2">
                    {/* Bouton Voir moderne */}
                    <button 
                      onClick={() => onPreviewFiche(fiche)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <Eye size={16} />
                      <span className="font-medium">Voir</span>
                    </button>
                    
                    {/* Dropdown moderne */}
                    <ModernDropdown
                      items={getDropdownItems(fiche)}
                      onSelect={handleDropdownAction}
                      fiche={fiche}
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