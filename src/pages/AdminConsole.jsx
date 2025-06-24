// src/pages/AdminConsole.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function AdminConsole() {
  const navigate = useNavigate()
  const { user, userEmail, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [fiches, setFiches] = useState([])
  const [loading, setLoading] = useState(true)

  // Chargement initial des données
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Charger tous les users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
  
      if (usersError) throw usersError
      setUsers(usersData || [])
  
      // 2. Charger toutes les fiches (sans JOIN)
      const { data: fichesData, error: fichesError } = await supabase
        .from('fiches')
        .select('id, nom, statut, created_at, updated_at, user_id')
        .order('updated_at', { ascending: false })
  
      if (fichesError) throw fichesError
  
      // 3. ✅ JOIN manuel côté client
      const fichesWithCreators = fichesData?.map(fiche => {
        const creator = usersData?.find(user => user.id === fiche.user_id)
        return {
          ...fiche,
          creator: creator || null // Ajouter les infos du créateur
        }
      }) || []
  
      setFiches(fichesWithCreators)
  
    } catch (error) {
      console.error('Erreur chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement console admin...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Admin */}
      <div className="bg-red-600 text-white py-6 px-6 shadow-lg">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">🔧 Console Admin</h1>
              <p className="text-lg opacity-90">
                Super Admin : <span className="font-medium">{userEmail}</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/')}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-2.5 rounded-xl font-medium transition-all duration-200"
              >
                ← Retour Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="border border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-20 px-6 py-2.5 rounded-xl font-medium transition-all duration-200"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex space-x-8">
            {[
              { id: 'users', label: 'Gestion Utilisateurs', count: users.length },
              { id: 'fiches', label: 'Toutes les Fiches', count: fiches.length },
              { id: 'stats', label: 'Statistiques', count: null }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
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
          <FichesTab fiches={fiches} users={users} onRefresh={loadData} navigate={navigate} />
        )}
        
        {activeTab === 'stats' && (
          <StatsTab users={users} fiches={fiches} />
        )}
      </div>
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
      
      <div className="overflow-x-auto">
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
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.prenom || user.nom ? `${user.prenom} ${user.nom}`.trim() : 'Non renseigné'}
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

// Composant Toutes les Fiches  
function FichesTab({ fiches, users, onRefresh, navigate }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">Toutes les Fiches Logement</h2>
        <p className="text-gray-600 mt-1">Vue globale et réaffectation</p>
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
                <button 
                  onClick={() => navigate(`/fiche?id=${fiche.id}`)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Voir
                </button>
                  <button className="text-red-600 hover:text-red-900">Réaffecter</button>
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
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span>{users.length}</span>
          </div>
        </div>
      </div>

      {/* Stats Fiches */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Fiches</h3>
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
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span>{fiches.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}