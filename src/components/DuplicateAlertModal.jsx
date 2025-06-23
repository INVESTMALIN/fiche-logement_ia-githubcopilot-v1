// src/components/DuplicateAlertModal.jsx
import React from 'react'
import { useForm } from './FormContext'

export default function DuplicateAlertModal() {
  const { 
    duplicateAlert, 
    handleOpenExisting, 
    handleCreateNew, 
    handleCancelDuplicate 
  } = useForm()

  if (!duplicateAlert) return null

  const { existingFiche } = duplicateAlert

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          Fiche déjà existante
        </h3>
        
        <p className="text-gray-600 mb-6">
          La fiche <strong>"{existingFiche.nom}"</strong> existe déjà pour ce bien.
          <br />
          Que souhaitez-vous faire ?
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={handleOpenExisting}
            className="flex-1 px-4 py-2 rounded text-white font-medium"
            style={{ backgroundColor: '#dbae61' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#c49952'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#dbae61'}
          >
            Ouvrir existante
          </button>
          <button
            onClick={handleCreateNew}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Créer nouvelle
          </button>
        </div>
        
        <button
          onClick={handleCancelDuplicate}
          className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}