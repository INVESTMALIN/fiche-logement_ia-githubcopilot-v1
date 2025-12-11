// src/pages/AdminConsole.jsx - Version complète fonctionnelle
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { deleteFiche } from '../lib/supabaseHelpers'
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
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe temporaire</label>
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start">
              <span className="text-blue-600 mr-2">📧</span>
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">Rappel :</p>
                <p>1. L'utilisateur va recevoir un e-mail de confirmation.</p>
                <p>2. Fournissez-lui le mot de passe temporaire.</p>
                <p>3. Connexion possible après confirmation email.</p>
              </div>
            </div>
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
      label: 'Utilisateurs',
      count: users.length
    },
    {
      id: 'fiches',
      label: 'Fiches',
      count: fiches.length
    },
    {
      id: 'stats',
      label: 'Statistiques',
      count: null
    },
    {
      id: 'historique',
      label: 'Historique',
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
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
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

        {activeTab === 'historique' && (
          <HistoriqueTab />
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
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${deleting
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
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'super_admin' ? 'bg-red-100 text-red-800' :
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
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${user.active === false
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

  // 📄 PAGINATION
  const [currentPage, setCurrentPage] = useState(1)
  const fichesPerPage = 50

  // ✅ NOUVEAU : Filtrer les fiches selon la recherche
  const filteredFiches = fiches.filter(fiche =>
    fiche.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (fiche.creator?.prenom && `${fiche.creator.prenom} ${fiche.creator.nom}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (fiche.creator?.email && fiche.creator.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // 📄 PAGINATION: Calcul des fiches à afficher
  const indexOfLast = currentPage * fichesPerPage
  const indexOfFirst = indexOfLast - fichesPerPage
  const currentFiches = filteredFiches.slice(indexOfFirst, indexOfLast)
  const totalPages = Math.ceil(filteredFiches.length / fichesPerPage)

  // 📄 PAGINATION: Reset à page 1 quand recherche change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // 📄 PAGINATION: Scroll to top sur changement de page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

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
            {currentFiches.map(fiche => (
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
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${fiche.statut === 'Complété' ? 'bg-green-100 text-green-800' :
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

      {/* 📄 PAGINATION: Contrôles de navigation */}
      {filteredFiches.length > 0 && (
        <div className="p-6 border-t space-y-4">
          {/* Compteur de fiches */}
          <div className="text-center text-sm text-gray-600">
            Affichage de {indexOfFirst + 1}–{Math.min(indexOfLast, filteredFiches.length)} sur {filteredFiches.length} fiches
          </div>

          {/* Boutons de navigation */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Précédent
              </button>

              <span className="px-4 py-2 text-gray-700 font-medium">
                Page {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Composant graphique d'activité avec périodes multiples
function ActivityChart({ fiches, period }) {
  let data = []
  let maxCount = 1

  if (period === '7days') {
    // Vue par jour (7 derniers jours)
    data = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return {
        label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        date: date.toISOString().split('T')[0],
        count: 0
      }
    })

    fiches.forEach(fiche => {
      if (fiche.created_at) {
        const ficheDate = new Date(fiche.created_at).toISOString().split('T')[0]
        const dayEntry = data.find(d => d.date === ficheDate)
        if (dayEntry) dayEntry.count++
      }
    })
  }
  else if (period === '30days') {
    // Vue par semaine (4 dernières semaines)
    data = Array.from({ length: 4 }, (_, i) => {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() - (i * 7))
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 6)

      return {
        label: `S${4 - i}`,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        count: 0
      }
    }).reverse()

    fiches.forEach(fiche => {
      if (fiche.created_at) {
        const ficheDate = new Date(fiche.created_at).toISOString().split('T')[0]
        data.forEach(week => {
          if (ficheDate >= week.startDate && ficheDate <= week.endDate) {
            week.count++
          }
        })
      }
    })
  }
  else if (period === '3months') {
    // Vue par mois (3 derniers mois)
    data = Array.from({ length: 3 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (2 - i))
      return {
        label: date.toLocaleDateString('fr-FR', { month: 'short' }),
        month: date.getMonth(),
        year: date.getFullYear(),
        count: 0
      }
    })

    fiches.forEach(fiche => {
      if (fiche.created_at) {
        const ficheDate = new Date(fiche.created_at)
        const monthEntry = data.find(d =>
          d.month === ficheDate.getMonth() && d.year === ficheDate.getFullYear()
        )
        if (monthEntry) monthEntry.count++
      }
    })
  }

  maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-16">{item.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300 flex items-center justify-end pr-2"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            >
              {item.count > 0 && (
                <span className="text-xs text-white font-semibold">{item.count}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Composant Statistiques amélioré
function StatsTab({ users, fiches }) {
  const [activityPeriod, setActivityPeriod] = useState('7days')
  // Stats utilisateurs
  const coordCount = users.filter(u => u.role === 'coordinateur').length
  const adminCount = users.filter(u => u.role === 'admin').length
  const superAdminCount = users.filter(u => u.role === 'super_admin').length

  // Stats fiches par statut
  const brouillonCount = fiches.filter(f => f.statut === 'Brouillon').length
  const completeCount = fiches.filter(f => f.statut === 'Complété').length
  const archiveCount = fiches.filter(f => f.statut === 'Archivé').length

  // Taux de completion
  const totalNonArchived = brouillonCount + completeCount
  const completionRate = totalNonArchived > 0 ? Math.round((completeCount / totalNonArchived) * 100) : 0

  // Fiches par coordinateur (top 5)
  const fichesByCoord = {}
  fiches.forEach(fiche => {
    if (fiche.creator) {
      const key = fiche.creator.id
      if (!fichesByCoord[key]) {
        fichesByCoord[key] = {
          name: fiche.creator.prenom && fiche.creator.nom
            ? `${fiche.creator.prenom} ${fiche.creator.nom}`
            : fiche.creator.email,
          count: 0,
          completed: 0,
          draft: 0
        }
      }
      fichesByCoord[key].count++
      if (fiche.statut === 'Complété') fichesByCoord[key].completed++
      if (fiche.statut === 'Brouillon') fichesByCoord[key].draft++
    }
  })

  const topCoordinators = Object.values(fichesByCoord)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Activité récente (7 derniers jours)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return {
      date: date.toISOString().split('T')[0],
      label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      count: 0
    }
  })

  fiches.forEach(fiche => {
    if (fiche.created_at) {
      const ficheDate = new Date(fiche.created_at).toISOString().split('T')[0]
      const dayEntry = last7Days.find(d => d.date === ficheDate)
      if (dayEntry) dayEntry.count++
    }
  })

  const maxDayCount = Math.max(...last7Days.map(d => d.count), 1)

  // Fiches archivées anciennes (potentiellement oubliées)
  const oldArchivedFiches = fiches
    .filter(f => f.statut === 'Archivé' && f.updated_at)
    .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Ligne 1 : Vue d'ensemble */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total fiches */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Fiches</p>
              <p className="text-3xl font-bold mt-1">{fiches.length}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Brouillons */}
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Brouillons</p>
              <p className="text-3xl font-bold mt-1">{brouillonCount}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Complétées */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Complétées</p>
              <p className="text-3xl font-bold mt-1">{completeCount}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Taux de complétion */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Taux de complétion</p>
              <p className="text-3xl font-bold mt-1">{completionRate}%</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Ligne 2 : Graphiques et détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


        {/* Activité avec sélecteur de période */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span>📊</span>
              Créations de fiches
            </h3>

            {/* Sélecteur de période */}
            <div className="flex gap-2">
              <button
                onClick={() => setActivityPeriod('7days')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${activityPeriod === '7days'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                7j
              </button>
              <button
                onClick={() => setActivityPeriod('30days')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${activityPeriod === '30days'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                30j
              </button>
              <button
                onClick={() => setActivityPeriod('3months')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${activityPeriod === '3months'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                3m
              </button>
            </div>
          </div>

          <ActivityChart fiches={fiches} period={activityPeriod} />
        </div>

        {/* Top coordinateurs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>👥</span>
            Top coordinateurs
          </h3>
          {topCoordinators.length > 0 ? (
            <div className="space-y-3">
              {topCoordinators.map((coord, index) => (
                <div key={index} className="border-l-4 border-red-500 pl-3 py-2 bg-gray-50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{coord.name}</span>
                    <span className="text-lg font-bold text-gray-900">{coord.count}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {coord.completed} complétées
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      {coord.draft} brouillons
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune fiche créée</p>
          )}
        </div>
      </div>

      {/* Ligne 3 : Détails supplémentaires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilisateurs par rôle */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🔐</span>
            Répartition utilisateurs
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-gray-700">Coordinateurs</span>
              <span className="font-bold text-green-600 text-xl">{coordCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-700">Admins</span>
              <span className="font-bold text-blue-600 text-xl">{adminCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-gray-700">Super Admins</span>
              <span className="font-bold text-red-600 text-xl">{superAdminCount}</span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900 text-xl">{users.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fiches archivées anciennes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📦</span>
            Fiches archivées anciennes
          </h3>
          {oldArchivedFiches.length > 0 ? (
            <div className="space-y-2">
              {oldArchivedFiches.map((fiche, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <span className="text-gray-900 font-medium truncate flex-1">{fiche.nom}</span>
                  <span className="text-gray-500 text-xs ml-2">
                    {new Date(fiche.updated_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune fiche archivée</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Composant Historique avec recherche par numéro de bien
function HistoriqueTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [history, setHistory] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Charger les profils au montage du composant
  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email')

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error('Erreur chargement profils:', error)
    }
  }

  // Helper pour trouver le nom d'un user
  const getUserName = (userId) => {
    if (!userId) return 'Système'
    const profile = profiles.find(p => p.id === userId)
    if (!profile) return 'Inconnu'
    return profile.prenom && profile.nom
      ? `${profile.prenom} ${profile.nom}`
      : profile.email
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setLoading(true)
    setSearched(true)

    try {
      const { data, error } = await supabase
        .from('fiches_history')
        .select('*')
        .eq('numero_bien', searchTerm.trim())
        .order('changed_at', { ascending: false })

      if (error) throw error
      setHistory(data || [])
    } catch (error) {
      console.error('Erreur recherche historique:', error)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold mb-4">Historique des fiches</h2>
        <p className="text-gray-600 mb-4">
          Recherchez l'historique complet d'une fiche par son <span className="font-semibold">Numéro de bien</span>
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            ℹ️ Système actif depuis le 27 novembre 2025. Les événements antérieurs ne sont pas affichés.
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="flex gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Numéro de bien (ex: 1410)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !searchTerm.trim()}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
      </div>

      {/* Résultats */}
      <div className="p-6">
        {!searched && (
          <p className="text-gray-500 text-center py-8">
            Entrez un numéro de bien pour voir son historique
          </p>
        )}

        {searched && history.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            Aucun historique trouvé pour ce numéro de bien
          </p>
        )}

        {history.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              {history.length} événement{history.length > 1 ? 's' : ''} trouvé{history.length > 1 ? 's' : ''}
            </p>

            {/* Timeline verticale (ordre inversé : plus récent en haut) */}
            <div className="relative pl-8">
              {/* Ligne verticale */}
              <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-200"></div>

              {history.map((event, index) => {
                // Déterminer la couleur selon l'action
                let color = 'bg-gray-400'
                let icon = '●'

                if (event.action === 'created') {
                  color = 'bg-green-500'
                  icon = '✨'
                } else if (event.action === 'deleted') {
                  color = 'bg-red-500'
                  icon = '🗑️'
                } else if (event.action === 'user_changed') {
                  color = 'bg-purple-500'
                  icon = '👤'
                } else if (event.action === 'status_changed') {
                  color = 'bg-blue-500'
                  icon = '📋'
                } else if (event.action === 'nom_changed') {
                  color = 'bg-yellow-500'
                  icon = '✏️'
                } else if (event.action === 'numero_bien_changed') {
                  color = 'bg-orange-500'
                  icon = '⚠️'
                }

                return (
                  <div key={event.id} className="relative pb-8 last:pb-0">
                    {/* Point plus petit sur la timeline */}
                    <div className={`absolute left-[-19px] w-4 h-4 ${color} rounded-full shadow-md z-10 border-2 border-white`}></div>

                    {/* Contenu de l'événement */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ml-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{event.fiche_nom}</span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {event.numero_bien}
                            </span>
                          </div>

                          <div className="text-sm text-gray-700 mb-2">
                            {event.action === 'created' && `${icon} Création de la fiche`}
                            {event.action === 'deleted' && `${icon} Suppression de la fiche`}
                            {event.action === 'user_changed' && `${icon} Réassignation`}
                            {event.action === 'status_changed' && `${icon} Changement de statut: ${event.old_value} → ${event.new_value}`}
                            {event.action === 'nom_changed' && `${icon} Renommage: ${event.old_value} → ${event.new_value}`}
                            {event.action === 'numero_bien_changed' && `${icon} Numéro modifié: ${event.old_value} → ${event.new_value}`}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {getUserName(event.changed_by)}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {new Date(event.changed_at).toLocaleDateString('fr-FR')} à {new Date(event.changed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
