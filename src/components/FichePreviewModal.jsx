// src/components/FichePreviewModal.jsx
import { X, Edit3 } from 'lucide-react'

export default function FichePreviewModal({ fiche, isOpen, onClose, onEdit }) {
  if (!isOpen || !fiche) return null

  // Helper pour afficher une valeur de façon lisible
  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
    return String(value)
  }

  // Helper pour nettoyer les noms de champs
  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/^(proprietaire|logement|airbnb|booking|reglementation|exigences|avis|clefs)_/, '') // Retirer le préfixe
      .replace(/_/g, ' ') // Remplacer _ par espaces
      .replace(/\b\w/g, l => l.toUpperCase()) // Capitaliser chaque mot
  }

  // Colonnes à ignorer (techniques)
  const ignoredColumns = [
    'id', 'user_id', 'created_at', 'updated_at', 'nom', 'statut'
  ]

  // Auto-génération des sections à partir des colonnes
  const generateSections = () => {
    const sections = {}
    
    // Parcourir toutes les colonnes de la fiche
    Object.keys(fiche).forEach(columnName => {
      // Ignorer les colonnes techniques
      if (ignoredColumns.includes(columnName)) return
      
      // Détecter le préfixe de section
      const prefixes = [
        'proprietaire', 'logement', 'airbnb', 'booking', 
        'reglementation', 'exigences', 'avis', 'clefs'
      ]
      
      let sectionKey = 'autres' // Section par défaut
      let sectionLabel = '📋 Autres'
      
      for (const prefix of prefixes) {
        if (columnName.startsWith(prefix + '_')) {
          sectionKey = prefix
          // Emojis pour chaque section
          const emojis = {
            proprietaire: '👤',
            logement: '🏠', 
            airbnb: '🏠',
            booking: '📅',
            reglementation: '📋',
            exigences: '⚠️',
            avis: '⭐',
            clefs: '🔑'
          }
          sectionLabel = `${emojis[prefix] || '📋'} ${prefix.charAt(0).toUpperCase() + prefix.slice(1)}`
          break
        }
      }
      
      // Créer la section si elle n'existe pas
      if (!sections[sectionKey]) {
        sections[sectionKey] = {
          label: sectionLabel,
          fields: []
        }
      }
      
      // Ajouter le champ à la section
      const value = fiche[columnName]
      if (value !== null && value !== undefined && value !== '') {
        sections[sectionKey].fields.push({
          key: columnName,
          label: formatFieldName(columnName),
          value: value
        })
      }
    })
    
    return Object.values(sections).filter(section => section.fields.length > 0)
  }

  const sections = generateSections()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{fiche.nom}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Créé par {fiche.creator ? `${fiche.creator.prenom} ${fiche.creator.nom}`.trim() || fiche.creator.email : 'Utilisateur supprimé'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Bouton Modifier discret */}
            <button
              onClick={() => onEdit(fiche)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Modifier la fiche"
            >
              <Edit3 size={18} />
            </button>
            {/* Bouton Fermer */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {sections.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucune donnée renseignée dans cette fiche</p>
          ) : (
            <div className="space-y-6">
              {sections.map((section, index) => (
                <div key={index} className="border-b border-gray-100 pb-4">
                  <h3 className="font-medium text-gray-900 mb-3">{section.label}</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {section.fields.map(field => (
                      <div key={field.key} className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          {field.label}:
                        </span>
                        <span className="text-sm text-gray-900 text-right max-w-xs">
                          {formatValue(field.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer avec infos de dates */}
        <div className="border-t p-4 bg-gray-50 text-xs text-gray-500 flex justify-between">
          <span>Créé le {new Date(fiche.created_at).toLocaleDateString('fr-FR')}</span>
          <span>Modifié le {new Date(fiche.updated_at).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
    </div>
  )
}