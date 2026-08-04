// src/components/FichePreviewModal.jsx
import { X, Edit3 } from 'lucide-react'
import { mapSupabaseToFormData } from '../lib/supabaseHelpers'

export default function FichePreviewModal({ fiche, isOpen, onClose, onEdit }) {
  if (!isOpen || !fiche) return null

  // 🎯 CONVERSION : Données Supabase brutes → Structure FormContext
  const formData = mapSupabaseToFormData(fiche)

  // 📋 CONFIGURATION : Toutes les 23 sections avec labels et emojis
  // ⚠️ Une section absente de cette liste disparaît silencieusement de l'aperçu.
  const sectionsConfig = [
    { key: 'section_proprietaire', label: '👤 Propriétaire', emoji: '👤' },
    { key: 'section_logement', label: '🏠 Logement', emoji: '🏠' },
    { key: 'section_clefs', label: '🔑 Clefs', emoji: '🔑' },
    { key: 'section_airbnb', label: '🏠 Airbnb', emoji: '🏠' },
    { key: 'section_booking', label: '📅 Booking', emoji: '📅' },
    { key: 'section_reglementation', label: '📋 Réglementation', emoji: '📋' },
    { key: 'section_exigences', label: '⚠️ Exigences', emoji: '⚠️' },
    { key: 'section_avis', label: '⭐ Avis', emoji: '⭐' },
    { key: 'section_gestion_linge', label: '🧺 Gestion Linge', emoji: '🧺' },
    { key: 'section_consommables', label: '🧴 Consommables', emoji: '🧴' },
    { key: 'section_instructions_menage', label: '🧹 Instructions Ménage', emoji: '🧹' },
    { key: 'section_equipements', label: '⚙️ Équipements', emoji: '⚙️' },
    { key: 'section_visite', label: '🎥 Visite', emoji: '🎥' },
    { key: 'section_chambres', label: '🛏️ Chambres', emoji: '🛏️' },
    { key: 'section_salle_de_bains', label: '🚿 Salle de Bains', emoji: '🚿' },
    { key: 'section_cuisine_1', label: '🍳 Cuisine 1', emoji: '🍳' },
    { key: 'section_cuisine_2', label: '🍽️ Cuisine 2', emoji: '🍽️' },
    { key: 'section_salon_sam', label: '🛋️ Salon / SAM', emoji: '🛋️' },
    { key: 'section_equip_spe_exterieur', label: '🏗️ Équip. Spé. / Extérieur', emoji: '🏗️' },
    { key: 'section_communs', label: '🏢 Communs', emoji: '🏢' },
    { key: 'section_teletravail', label: '💻 Télétravail', emoji: '💻' },
    { key: 'section_bebe', label: '👶 Bébé', emoji: '👶' },
    { key: 'section_securite', label: '🔒 Sécurité', emoji: '🔒' }
  ]

  // Helper pour vérifier si une valeur est "vide" ou non significative
  const isEmpty = (value) => {
    if (value === null || value === undefined || value === '') return true
    if (typeof value === 'boolean' && value === false) return true
    if (typeof value === 'number' && value === 0) return true  // ✅ Filtrer les zéros
    if (value === '0') return true  // ✅ Filtrer les zéros en string aussi
    if (Array.isArray(value)) {
      // Array vide ou contenant seulement des false/null/undefined/""
      return value.length === 0 || value.every(v => v === false || v === null || v === undefined || v === '' || v === 0 || v === '0')
    }
    if (typeof value === 'object') {
      // Objet sans valeurs significatives
      return Object.values(value).every(v => isEmpty(v))
    }
    return false
  }

  // 🆕 NOUVEAU : Helper pour vérifier si une URL est une image
  const isImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false
    return /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i.test(url)
  }

  // Helper pour afficher une valeur de façon lisible (MODIFIÉ pour gérer les photos)
  const formatValue = (value) => {
    if (isEmpty(value)) return '—'
    
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
    
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return 'Oui'
      if (value.toLowerCase() === 'false') return 'Non'
      
      // 🆕 NOUVEAU : Si c'est une URL d'image, afficher un message au lieu de l'URL
      if (isImageUrl(value)) {
        return '📸 1 photo disponible'
      }
      
      return value
    }
    
    if (Array.isArray(value)) {
      // Pour les arrays, garder seulement les valeurs "vraies"
      const validValues = value.filter(v => !isEmpty(v))
      if (validValues.length === 0) return '—'
      
      // 🆕 NOUVEAU : Séparer les images des autres valeurs
      const imageUrls = validValues.filter(v => isImageUrl(v))
      const otherValues = validValues.filter(v => !isImageUrl(v))
      
      // Si on a des images, les compter
      if (imageUrls.length > 0) {
        // Si on a que des images, afficher le compteur
        if (otherValues.length === 0) {
          return `📸 ${imageUrls.length} photo${imageUrls.length > 1 ? 's' : ''} disponible${imageUrls.length > 1 ? 's' : ''}`
        }
        
        // Si on a des images ET d'autres valeurs, afficher les deux
        const formattedOthers = otherValues.map(v => {
          if (v === true) return 'Oui'
          if (v === false) return 'Non'
          if (typeof v === 'string' && v.toLowerCase() === 'true') return 'Oui'
          if (typeof v === 'string' && v.toLowerCase() === 'false') return 'Non'
          return v
        })
        
        const othersText = formattedOthers.length === 1 ? formattedOthers[0] : formattedOthers.join(', ')
        const photosText = `📸 ${imageUrls.length} photo${imageUrls.length > 1 ? 's' : ''}`
        
        return `${othersText} • ${photosText}`
      }
      
      // Pas d'images, traitement normal
      // Si c'est un array de booléens true, on peut supposer que ce sont des checkboxes
      if (validValues.every(v => v === true)) {
        return `${validValues.length} élément(s) sélectionné(s)`
      }
      
      return validValues.join(', ')
    }
    
    if (typeof value === 'object') {
      // Pour les objets imbriqués (comme adresses)
      const validEntries = Object.entries(value)
        .filter(([key, val]) => !isEmpty(val))
        .map(([key, val]) => `${formatFieldName(key)}: ${val}`)
      
      return validEntries.length > 0 ? validEntries.join(', ') : '—'
    }
    
    return String(value)
  }

  // Helper pour nettoyer les noms de champs (enlever prefixes, capitaliser)
  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1') // Ajouter espaces avant majuscules
      .replace(/_/g, ' ') // Remplacer _ par espaces
      .replace(/\b\w/g, l => l.toUpperCase()) // Capitaliser chaque mot
      .trim()
  }

  // 🎯 GÉNÉRATION : Extraire les sections avec données
  const generateSections = () => {
    const sections = []

    sectionsConfig.forEach(config => {
      const sectionData = formData[config.key]
      
      if (!sectionData || typeof sectionData !== 'object') return

      const fields = []

      // Parcourir tous les champs de la section
      Object.entries(sectionData).forEach(([fieldKey, fieldValue]) => {
        // Contacts de maintenance : tableau d'objets JSONB, non rendable par
        // formatValue (sortirait en "[object Object]"). Consultables dans la
        // section Instructions Ménage du formulaire.
        if (config.key === 'section_instructions_menage'
          && (fieldKey === 'a_contacts_maintenance' || fieldKey === 'contacts_maintenance')) {
          return
        }

        // Utiliser la fonction isEmpty pour filtrer
        if (isEmpty(fieldValue)) {
          return
        }

        fields.push({
          key: fieldKey,
          label: formatFieldName(fieldKey),
          value: fieldValue
        })
      })

      // Ajouter la section seulement si elle a des champs
      if (fields.length > 0) {
        sections.push({
          ...config,
          fields
        })
      }
    })

    return sections
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
                <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">{section.emoji}</span>
                    <span>{section.label.replace(section.emoji + ' ', '')}</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {section.fields.map(field => (
                      <div key={field.key} className="flex justify-between items-start">
                        <span className="text-sm text-gray-500 font-medium min-w-0 flex-1 pr-4">
                          {field.label}:
                        </span>
                        <span className="text-sm text-gray-900 text-right max-w-xs min-w-0 flex-1 break-words">
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