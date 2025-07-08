// src/components/PDFMenageTemplate.jsx - VERSION AVEC PHOTOS INTÉGRÉES
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

  // 📸 NOUVEAU : Composant pour afficher les photos
  const PhotoDisplay = ({ photos, label }) => {
    if (!photos || photos.length === 0) return null
  
    const validPhotos = Array.isArray(photos) ? photos.filter(isImageUrl) : (isImageUrl(photos) ? [photos] : [])
    if (validPhotos.length === 0) return null
  
    // 🎯 OPTION B : Limiter à 2 photos max par section
    const maxPhotosPerSection = 2
    const displayPhotos = validPhotos.slice(0, maxPhotosPerSection)
    const remainingPhotos = validPhotos.length - maxPhotosPerSection
  
    return (
      <div style={{ 
        marginTop: '10px',
        padding: '12px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        backgroundColor: '#f8fafc',
        pageBreakInside: 'avoid'
      }}>
        <div style={{ 
          fontSize: '10pt', 
          fontWeight: '600', 
          color: '#4a5568',
          marginBottom: '8px'
        }}>
          📸 {label} ({validPhotos.length} photo{validPhotos.length > 1 ? 's' : ''})
          {remainingPhotos > 0 && (
            <span style={{ fontSize: '9pt', color: '#6b7280', fontWeight: 'normal' }}>
              {" "}(2 affichées)
            </span>
          )}
        </div>
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: displayPhotos.length === 1 ? '1fr' : 'repeat(2, 1fr)',
          gap: '8px',
          alignItems: 'start'
        }}>
          {displayPhotos.map((photoUrl, index) => (
            <div key={index} style={{ 
              textAlign: 'center',
              pageBreakInside: 'avoid'
            }}>
                
                <a 
  href={photoUrl} 
  target="_blank"
  style={{ display: 'block', textDecoration: 'none' }}
>
  <img 
    src={photoUrl}
    alt={`${label} ${index + 1}`}
    style={{
        display: 'block',
      maxWidth: '100%',
      maxHeight: displayPhotos.length === 1 ? '150px' : '100px',
      width: 'auto',
      height: 'auto',
      objectFit: 'contain',
      border: '2px solid #3182ce', // 🔗 Bordure bleue pour indiquer cliquable
      borderRadius: '4px',
      backgroundColor: '#ffffff',
      cursor: 'pointer' // 🔗 Indication cliquable
    }}
    onError={(e) => {
      e.target.style.display = 'none'
    }}
  />
</a>
              
              {displayPhotos.length > 1 && (
                <div style={{ 
                  fontSize: '8pt', 
                  color: '#6b7280', 
                  marginTop: '2px' 
                }}>
                  Photo {index + 1}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {remainingPhotos > 0 && (
          <div style={{ 
            fontSize: '9pt', 
            color: '#6b7280', 
            textAlign: 'center',
            marginTop: '6px',
            fontStyle: 'italic'
          }}>
            ... et {remainingPhotos} photo{remainingPhotos > 1 ? 's' : ''} supplémentaire{remainingPhotos > 1 ? 's' : ''} disponible{remainingPhotos > 1 ? 's' : ''} dans la fiche complète
          </div>
        )}
      </div>
    )
  }

  // Helper pour formater les valeurs d'affichage SANS photos (les photos sont gérées séparément)
  const formatValue = (value, fieldKey = '') => {
    if (isEmpty(value)) return '—'
    
    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non'
    }
    
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return 'Oui'
      if (value.toLowerCase() === 'false') return 'Non'
      
      // Si c'est une URL d'image, on ne l'affiche pas ici (sera gérée par PhotoDisplay)
      if (isImageUrl(value)) {
        return null // On retourne null pour ne pas afficher dans la liste normale
      }
      
      return value
    }
    
    if (Array.isArray(value)) {
      const validValues = value.filter(v => !isEmpty(v))
      if (validValues.length === 0) return '—'
      
      // Séparer les images des autres valeurs
      const imageUrls = validValues.filter(v => isImageUrl(v))
      const otherValues = validValues.filter(v => !isImageUrl(v))
      
      // On ne retourne que les valeurs non-images (les images seront gérées par PhotoDisplay)
      if (otherValues.length === 0) {
        return null // Que des images, pas de texte à afficher
      }
      
      const formattedValues = otherValues.map(v => {
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
          else if (isImageUrl(val)) return null // Skip images dans objects
          
          return `${formatFieldName(key)}: ${formattedVal}`
        })
        .filter(entry => entry !== null)
      
      if (validEntries.length === 0) return null
      
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

  // 🔧 NOUVELLE FONCTION : Extraire toutes les photos d'une valeur
  const extractPhotos = (value, fieldKey) => {
    const photos = []
    
    if (typeof value === 'string' && isImageUrl(value)) {
      photos.push(value)
    } else if (Array.isArray(value)) {
      photos.push(...value.filter(v => isImageUrl(v)))
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([key, val]) => {
        if (typeof val === 'string' && isImageUrl(val)) {
          photos.push(val)
        } else if (Array.isArray(val)) {
          photos.push(...val.filter(v => isImageUrl(v)))
        }
      })
    }
    
    return photos
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
          padding: 20px;
          max-width: 800px;      
          background: white;
        }

        /* 🎯 PAGINATION INTELLIGENTE */
        .header {
          page-break-inside: avoid;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid #3182ce;
        }

        .section {
          page-break-inside: avoid;
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .pdf-container h1 { 
          font-size: 18pt; 
          margin-bottom: 20px; 
          color: #1a365d;
          border-bottom: 3px solid #3182ce;
          padding-bottom: 10px;
          page-break-after: avoid;
        }
        
        .pdf-container h2 { 
          font-size: 14pt; 
          margin: 20px 0 10px 0; 
          color: #2d3748;
          background-color: #f7fafc;
          padding: 8px 12px;
          border-left: 4px solid #3182ce;
          page-break-after: avoid;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .info-item {
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          page-break-inside: avoid;
        }
        
        .info-label {
          font-weight: 600;
          color: #4a5568;
          font-size: 10pt;
        }
        
        .info-value {
          color: #1a202c;
          margin-top: 2px;
        }
        
        .field-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 6px 0;
          border-bottom: 1px dotted #e2e8f0;
          page-break-inside: avoid;
        }
        
        .field-label {
          font-weight: 500;
          color: #4a5568;
          font-size: 10pt;
          flex: 1;
          padding-right: 15px;
        }
        
        .field-value {
          color: #1a202c;
          font-size: 10pt;
          flex: 1;
          text-align: right;
          word-break: break-word;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        /* 📸 STYLES SPÉCIFIQUES PHOTOS */
        .photo-container {
          page-break-inside: avoid;
        }

        .force-new-page {
          page-break-before: always;
        }

        .keep-together {
          page-break-inside: avoid;
        }
        
        /* STYLES SPÉCIFIQUES PRINT */
        @media print, (max-width: 0) {
          .pdf-container {
            max-width: none;
            margin: 0;
            padding: 15mm;
          }
          
          .section {
            orphans: 3;
            widows: 3;
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

      {/* Toutes les sections ménage avec données ET PHOTOS */}
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
            <h2>{section.emoji} {section.label.replace(section.emoji + ' ', '')}</h2>
            
            {/* 📝 CHAMPS TEXTE */}
            {section.fields.map((field, fieldIndex) => {
              const textValue = formatValue(field.value, field.key)
              if (textValue === null) return null // Skip si que des photos
              
              return (
                <div key={field.key} className="field-row">
                  <div className="field-label">{field.label}</div>
                  <div className="field-value">{textValue}</div>
                </div>
              )
            }).filter(Boolean)}

            {/* 📸 PHOTOS DE LA SECTION */}
            {section.fields.map((field, fieldIndex) => {
              const photos = extractPhotos(field.value, field.key)
              if (photos.length === 0) return null
              
              return (
                <PhotoDisplay 
                  key={`photos-${field.key}`}
                  photos={photos}
                  label={field.label}
                />
              )
            }).filter(Boolean)}
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