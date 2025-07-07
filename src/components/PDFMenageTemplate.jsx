// src/components/PDFMenageTemplate.jsx
import React from 'react'

const PDFMenageTemplate = ({ formData }) => {
  // Vérification des données
  if (!formData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h2>Erreur</h2>
        <p>Aucune donnée de fiche disponible pour générer le PDF ménage.</p>
        <p style={{ fontSize: '14px', color: '#666' }}>Retournez à la fiche et essayez à nouveau.</p>
      </div>
    )
  }

  // 📋 CONFIGURATION : Sections spécifiques à la fiche ménage
  const menageSectionsConfig = [
    { key: 'section_proprietaire', label: '👤 Propriétaire', emoji: '👤' },
    { key: 'section_logement', label: '🏠 Logement', emoji: '🏠' },
    { key: 'section_clefs', label: '🔑 Clefs', emoji: '🔑' },
    { key: 'section_gestion_linge', label: '🧺 Gestion Linge', emoji: '🧺' },
    { key: 'section_equipements', label: '⚙️ Équipements', emoji: '⚙️' },
    { key: 'section_consommables', label: '🧴 Consommables', emoji: '🧴' },
    { key: 'section_visite', label: '🎥 Visite', emoji: '🎥' },
    { key: 'section_chambres', label: '🛏️ Chambres', emoji: '🛏️' },
    { key: 'section_salle_de_bains', label: '🚿 Salle de Bains', emoji: '🚿' },
    { key: 'section_cuisine_1', label: '🍳 Cuisine 1', emoji: '🍳' },
    { key: 'section_cuisine_2', label: '🍽️ Cuisine 2', emoji: '🍽️' },
    { key: 'section_salon_sam', label: '🛋️ Salon / SAM', emoji: '🛋️' },
    { key: 'section_equip_spe_exterieur', label: '🏗️ Équip. Spé. / Extérieur', emoji: '🏗️' },
    { key: 'section_securite', label: '🔒 Sécurité', emoji: '🔒' }
  ]

  // Helper pour vérifier si une valeur est "vide" ou non significative
  const isEmpty = (value) => {
    if (value === null || value === undefined || value === '') return true
    if (typeof value === 'boolean' && value === false) return true
    if (typeof value === 'number' && value === 0) return true
    if (value === '0') return true
    if (Array.isArray(value)) {
      return value.length === 0 || value.every(v => v === false || v === null || v === undefined || v === '' || v === 0 || v === '0')
    }
    if (typeof value === 'object') {
      return Object.values(value).every(v => isEmpty(v))
    }
    return false
  }

  // Helper pour détecter si c'est une URL d'image
  const isImageUrl = (url) => {
    if (typeof url !== 'string') return false
    return url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i) !== null
  }

  // Helper pour formater les valeurs d'affichage
  const formatValue = (value) => {
    if (isEmpty(value)) return '—'
    
    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non'
    }
    
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return 'Oui'
      if (value.toLowerCase() === 'false') return 'Non'
      
      // Si c'est une URL d'image, afficher "Photo disponible"
      if (isImageUrl(value)) {
        return 'Photo disponible'
      }
      
      return value
    }
    
    if (Array.isArray(value)) {
      const validValues = value.filter(v => !isEmpty(v))
      if (validValues.length === 0) return '—'
      
      // Traiter les URLs d'images dans les arrays
      const hasImages = validValues.some(v => isImageUrl(v))
      if (hasImages) {
        const imageCount = validValues.filter(v => isImageUrl(v)).length
        const otherValues = validValues.filter(v => !isImageUrl(v))
        
        let result = []
        if (imageCount > 0) {
          result.push(`${imageCount} photo${imageCount > 1 ? 's' : ''}`)
        }
        if (otherValues.length > 0) {
          result.push(...otherValues.map(v => {
            if (v === true) return 'Oui'
            if (v === false) return 'Non'
            if (typeof v === 'string' && v.toLowerCase() === 'true') return 'Oui'
            if (typeof v === 'string' && v.toLowerCase() === 'false') return 'Non'
            return v
          }))
        }
        return result.join(', ')
      }
      
      const formattedValues = validValues.map(v => {
        if (v === true) return 'Oui'
        if (v === false) return 'Non'
        if (typeof v === 'string' && v.toLowerCase() === 'true') return 'Oui'
        if (typeof v === 'string' && v.toLowerCase() === 'false') return 'Non'
        return v
      })
      
      return formattedValues.join(', ')
    }
    
    if (typeof value === 'object') {
      const validEntries = Object.entries(value)
        .filter(([key, val]) => !isEmpty(val))
        .map(([key, val]) => {
          let formattedVal = val
          if (val === true) formattedVal = 'Oui'
          else if (val === false) formattedVal = 'Non'
          else if (typeof val === 'string' && val.toLowerCase() === 'true') formattedVal = 'Oui'
          else if (typeof val === 'string' && val.toLowerCase() === 'false') formattedVal = 'Non'
          
          return `${formatFieldName(key)}: ${formattedVal}`
        })
      
      if (validEntries.length === 0) return '—'
      
      if (validEntries.length === 1) {
        return validEntries[0]
      } else {
        return (
          <div style={{ lineHeight: '1.6' }}>
            {validEntries.map((entry, index) => (
              <div key={index} style={{ marginBottom: '2px' }}>
                • {entry}
              </div>
            ))}
          </div>
        )
      }
    }
    
    return String(value)
  }

  // Helper pour nettoyer les noms de champs
  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim()
  }

  // Fonction pour générer le nom du dossier photos
  const generatePhotosFolder = () => {
    const numeroBien = formData.section_logement?.numero_bien || 'XXX'
    const prenom = formData.section_proprietaire?.prenom || ''
    const nom = formData.section_proprietaire?.nom || ''
    const ville = formData.section_proprietaire?.adresse?.ville || ''
    
    const prenomNom = [prenom, nom].filter(Boolean).join(' ')
    const parts = [numeroBien, prenomNom, ville].filter(Boolean)
    
    if (parts.length === 3) {
      return `${parts[0]}. ${parts[1]} - ${parts[2]}`
    } else if (parts.length === 2) {
      return `${parts[0]}. ${parts[1]}`
    } else {
      return parts[0] || 'Dossier non défini'
    }
  }

  // 🎯 GÉNÉRATION : Extraire les sections avec données (filtrées pour ménage)
  const generateMenageSections = () => {
    const sections = []

    menageSectionsConfig.forEach(config => {
      const sectionData = formData[config.key]
      
      if (!sectionData || typeof sectionData !== 'object') return

      const fields = []

      // Filtrage spécial pour certaines sections
      Object.entries(sectionData).forEach(([fieldKey, fieldValue]) => {
        if (isEmpty(fieldValue)) {
          return
        }

        // Filtrage spécifique pour section_equipements (seulement local poubelle + parking)
        if (config.key === 'section_equipements') {
          const menageEquipementsFields = [
            'poubelle_emplacement',
            'poubelle_programmation',
            'poubelle_photos',
            'parking_stationnement_payant',
            'parking_details'
          ]
          if (!menageEquipementsFields.some(field => fieldKey.includes(field.split('_').pop()))) {
            return
          }
        }

        fields.push({
          key: fieldKey,
          label: formatFieldName(fieldKey),
          value: fieldValue
        })
      })

      if (fields.length > 0) {
        sections.push({
          ...config,
          fields
        })
      }
    })

    return sections
  }

  const sections = generateMenageSections()

  return (
    <div className="pdf-container">
      <style>{`
        /* STYLES POUR IMPRESSION ET ÉCRAN */
        .pdf-container {
  font-family: Arial, sans-serif; 
  font-size: 11pt; 
  line-height: 1.4; 
  color: #333;
  margin: 0 auto;       
  padding: 30px 20px 20px 20px;
  max-width: 800px;      
  background: white;
  border: 1px solid #ddd;
  box-shadow: 0 0 10px rgba(0,0,0,0.1); 
}
        
        .pdf-container h1 { 
          font-size: 18pt; 
          margin-bottom: 20px; 
          color: #1a365d;
          border-bottom: 3px solid #3182ce;
          padding-bottom: 10px;
        }
        
        .pdf-container h2 { 
          font-size: 14pt; 
          margin: 20px 0 10px 0; 
          color: #2d3748;
          background-color: #f7fafc;
          padding: 8px 12px;
          border-left: 4px solid #3182ce;
        }
        
        .pdf-container .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .pdf-container .info-item {
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }
        
        .pdf-container .info-label {
          font-weight: 600;
          color: #4a5568;
          font-size: 10pt;
        }
        
        .pdf-container .info-value {
          color: #1a202c;
          margin-top: 2px;
        }
        
        .pdf-container .field-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 6px 0;
          border-bottom: 1px dotted #e2e8f0;
        }
        
        .pdf-container .field-label {
          font-weight: 500;
          color: #4a5568;
          font-size: 10pt;
          flex: 1;
          padding-right: 15px;
        }
        
        .pdf-container .field-value {
          color: #1a202c;
          font-size: 10pt;
          flex: 1;
          text-align: right;
          word-break: break-word;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
        
        .pdf-container .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        
        /* STYLES SPÉCIFIQUES PRINT */
        @media print {
          body { 
            font-family: Arial, sans-serif; 
            font-size: 11pt; 
            line-height: 1.4; 
            color: #333;
            margin: 0;
            padding: 0;
          }
          
          .pdf-container {
            max-width: none;
            margin: 0;
            padding: 30px 20px 20px 20px;
          }
          
          .page-break { 
            page-break-before: always; 
          }
        }
      `}</style>

      {/* En-tête */}
      <div className="header">
        <h1>🧹 Fiche Ménage • {formData.nom || 'Sans nom'} • Letahost</h1>
        
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">Date de création</div>
            <div className="info-value">
              {formData.created_at ? new Date(formData.created_at).toLocaleDateString('fr-FR') : 'N/A'}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">Dernière modification</div>
            <div className="info-value">
              {formData.updated_at ? new Date(formData.updated_at).toLocaleDateString('fr-FR') : 'N/A'}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">Type de propriété</div>
            <div className="info-value">{formData.section_logement?.type_propriete || 'Non spécifié'}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Dossier photos</div>
            <div className="info-value" style={{ fontFamily: 'monospace', fontSize: '9pt', color: '#2563eb' }}>
              {generatePhotosFolder()}
            </div>
          </div>
        </div>
      </div>

      {/* Toutes les sections ménage avec données */}
      {sections.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#666',
          fontSize: '12pt',
          border: '2px dashed #ddd',
          borderRadius: '8px'
        }}>
          <p><strong>Aucune donnée ménage disponible</strong></p>
          <p>Cette fiche ne contient pas encore d'informations relatives au ménage.</p>
        </div>
      ) : (
        sections.map((section, sectionIndex) => (
          <div key={section.key} className="section">
            <h2>{section.emoji} {section.label}</h2>
            
            {section.fields.map((field, fieldIndex) => (
              <div key={field.key} className="field-row">
                <div className="field-label">{field.label}</div>
                <div className="field-value">{formatValue(field.value)}</div>
              </div>
            ))}
          </div>
        ))
      )}

      {/* Pied de page */}
      <div style={{ 
        marginTop: '40px', 
        paddingTop: '20px', 
        borderTop: '2px solid #e2e8f0',
        fontSize: '10pt',
        color: '#666',
        textAlign: 'center'
      }}>
        <p>
          <strong>Fiche Ménage Letahost</strong> • Générée le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
        </p>
        <p style={{ marginTop: '5px' }}>
          Numéro de bien: <strong>{formData.section_logement?.numero_bien || 'Non défini'}</strong>
        </p>
      </div>
    </div>
  )
}

export default PDFMenageTemplate