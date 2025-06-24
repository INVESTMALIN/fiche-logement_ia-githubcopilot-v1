// src/components/ReassignModal.jsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function ReassignModal({ fiche, users, isOpen, onClose, onSuccess }) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !fiche) return null

  // Filtrer seulement les coordinateurs actifs
  const coordinateurs = users.filter(user => user.role === 'coordinateur')

  const handleReassign = async () => {
    if (!selectedUserId) {
      setError('Veuillez sélectionner un coordinateur')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Mettre à jour la fiche dans Supabase
      const { error: updateError } = await supabase
        .from('fiches')
        .update({ 
          user_id: selectedUserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', fiche.id)

      if (updateError) throw updateError

      // Succès - fermer modal et rafraîchir
      onSuccess()
      onClose()
      
    } catch (err) {
      console.error('Erreur réaffectation:', err)
      setError('Erreur lors de la réaffectation')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedUserId('')
    setError('')
    onClose()
  }

  // Trouver le coordinateur actuellement assigné
  const currentOwner = users.find(user => user.id === fiche.user_id)
  const newOwner = users.find(user => user.id === selectedUserId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Réaffecter la fiche
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4">
          {/* Info fiche */}
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Fiche à réaffecter :</p>
            <p className="font-medium">{fiche.nom}</p>
            <p className="text-sm text-gray-500">
              Actuellement assignée à : {currentOwner ? 
                `${currentOwner.prenom} ${currentOwner.nom}`.trim() || currentOwner.email :
                'Utilisateur supprimé'
              }
            </p>
          </div>

          {/* Sélection nouveau coordinateur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Réaffecter à :
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              disabled={loading}
            >
              <option value="">-- Sélectionner un coordinateur --</option>
              {coordinateurs.map(coordinateur => (
                <option key={coordinateur.id} value={coordinateur.id}>
                  {`${coordinateur.prenom} ${coordinateur.nom}`.trim() || coordinateur.email}
                </option>
              ))}
            </select>
          </div>

          {/* Preview du changement */}
          {selectedUserId && newOwner && (
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>Changement :</strong><br/>
                De : {currentOwner ? `${currentOwner.prenom} ${currentOwner.nom}`.trim() || currentOwner.email : 'Inconnu'}<br/>
                Vers : {`${newOwner.prenom} ${newOwner.nom}`.trim() || newOwner.email}
              </p>
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={handleReassign}
            disabled={loading || !selectedUserId}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {loading ? 'Réaffectation...' : 'Réaffecter'}
          </button>
        </div>
      </div>
    </div>
  )
}