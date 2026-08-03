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

  // Deux situations très différentes pour le coordinateur :
  // sa propre fiche (il la rouvre et continue) ou celle d'un collègue
  // (il ne peut pas l'ouvrir, il doit se rapprocher de cette personne).
  const estAutreCoordinateur = existingFiche.est_proprietaire === false
  const coordinateur = [existingFiche.coordinateur_prenom, existingFiche.coordinateur_nom]
    .filter(Boolean)
    .join(' ')
    .trim()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`bg-white rounded-lg p-6 max-w-md w-full mx-4 ${
          estAutreCoordinateur ? 'border-2 border-amber-500' : ''
        }`}
      >
        {estAutreCoordinateur ? (
          <>
            <h3 className="text-lg font-semibold mb-4 text-amber-700 flex items-center gap-2">
              <span aria-hidden="true">⚠️</span>
              Ce bien est déjà suivi par un autre coordinateur
            </h3>

            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded">
              <p className="text-amber-900 text-sm">
                La fiche <strong>"{existingFiche.nom}"</strong> existe déjà pour ce bien
                {coordinateur && (
                  <>
                    {' '}et appartient à <strong>{coordinateur}</strong>
                  </>
                )}
                .
              </p>
              <p className="text-amber-900 text-sm mt-2">
                Rapprochez-vous de {coordinateur || 'ce coordinateur'} avant de créer une
                deuxième fiche : les deux partageraient le même dossier photos et le même
                dossier Drive.
              </p>
            </div>

            <div className="flex gap-3">
              {/* L'ouverture n'est proposée que si l'appelant a réellement les droits
                  de lecture sur cette fiche (admin / super admin). */}
              {existingFiche.peut_ouvrir && existingFiche.id && (
                <button
                  onClick={handleOpenExisting}
                  className="flex-1 px-4 py-2 rounded text-white font-medium"
                  style={{ backgroundColor: '#dbae61' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#c49952'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dbae61'}
                >
                  Ouvrir existante
                </button>
              )}
              <button
                onClick={handleCreateNew}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Créer nouvelle
              </button>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

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
