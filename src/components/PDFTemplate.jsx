// src/components/PDFTemplate.jsx
import React from 'react'

const PDFTemplate = ({ formData }) => {
  // Vérification des données
  if (!formData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h2>Erreur</h2>
        <p>Aucune donnée de fiche disponible pour générer le PDF.</p>
        <p style={{ fontSize: '14px', color: '#666' }}>Retournez à la fiche et essayez à nouveau.</p>
      </div>
    )
  }

  // 📋 CONFIGURATION : Toutes les 22 sections avec labels et emojis (copiée de FichePreviewModal)
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
    { key: 'section_equipements', label: '⚙️ Équipements', emoji: '⚙️' },
    { key: 'section_consommables', label: '🧴 Consommables', emoji: '🧴' },
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

  // Helper pour vérifier si une valeur est "vide" ou non significative (copié de FichePreviewModal)
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

  // Composant pour afficher les photos
  const PhotoPreview = ({ photos }) => {
    if (!Array.isArray(photos) || photos.length === 0) return <span>—</span>
    
    const imageUrls = photos.filter(isImageUrl)
    if (imageUrls.length === 0) return <span>—</span>
    
    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {imageUrls.slice(0, 4).map((url, index) => (
          <div key={index} style={{ position: 'relative' }}>
            <img 
              src={url}
              alt={`Photo ${index + 1}`}
              style={{ 
                width: '40px', 
                height: '40px', 
                objectFit: 'cover', 
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer'
              }}
              onClick={() => window.open(url, '_blank')}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </div>
        ))}
        {imageUrls.length > 4 && (
          <span style={{ fontSize: '10pt', color: '#666' }}>
            +{imageUrls.length - 4} autres
          </span>
        )}
        <span style={{ fontSize: '9pt', color: '#888', marginLeft: '8px' }}>
          ({imageUrls.length} photo{imageUrls.length > 1 ? 's' : ''})
        </span>
      </div>
    )
  }

// Helper pour afficher une valeur de façon lisible (modifié pour gérer les photos ET objets multilignes)
const formatValue = (value, fieldKey) => {
    if (isEmpty(value)) return '—'
    
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
    
    // 🎯 FIX : Gérer les strings "true"/"false" (case insensitive)
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return 'Oui'
      if (value.toLowerCase() === 'false') return 'Non'
    }
    
    // Gérer les champs photos (string unique OU array)
    if (fieldKey && (
      fieldKey.toLowerCase().includes('photo') || 
      fieldKey.toLowerCase().includes('image') || 
      fieldKey.toLowerCase().includes('photos')
    )) {
      // Si c'est une string unique, la convertir en array
      if (typeof value === 'string' && isImageUrl(value)) {
        return <PhotoPreview photos={[value]} />
      }
      // Si c'est déjà un array
      if (Array.isArray(value)) {
        return <PhotoPreview photos={value} />
      }
    }
    
    if (Array.isArray(value)) {
      const validValues = value.filter(v => !isEmpty(v))
      if (validValues.length === 0) return '—'
      
      if (validValues.every(v => v === true)) {
        return `${validValues.length} élément(s) sélectionné(s)`
      }
      
      // 🎯 FIX : Transformer les éléments true/false en Oui/Non dans les arrays aussi
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
          // 🎯 FIX : Transformer les valeurs true/false dans les objets aussi
          let formattedVal = val
          if (val === true) formattedVal = 'Oui'
          else if (val === false) formattedVal = 'Non'
          else if (typeof val === 'string' && val.toLowerCase() === 'true') formattedVal = 'Oui'
          else if (typeof val === 'string' && val.toLowerCase() === 'false') formattedVal = 'Non'
          
          return `${formatFieldName(key)}: ${formattedVal}`
        })
      
      if (validEntries.length === 0) return '—'
      
      // 🆕 OPTION 1 : Affichage multilignes avec puces pour les objets
      if (validEntries.length === 1) {
        // Si un seul élément, pas besoin de puces
        return validEntries[0]
      } else {
        // Plusieurs éléments : format multiligne avec puces
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

  // Helper pour nettoyer les noms de champs (copié de FichePreviewModal)
  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim()
  }

  // Fonction pour générer le nom du dossier photos :
    const generatePhotosFolder = () => {
    const numeroBien = formData.section_logement?.numero_bien || 'XXX'
    const prenom = formData.section_proprietaire?.prenom || ''
    const nom = formData.section_proprietaire?.nom || ''
    const ville = formData.section_proprietaire?.adresse?.ville || ''
    
    // Format : "numero-de-bien. prenom nom - ville"
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

  // 🎯 GÉNÉRATION : Extraire les sections avec données (copié de FichePreviewModal)
  const generateSections = () => {
    const sections = []

    sectionsConfig.forEach(config => {
      const sectionData = formData[config.key]
      
      if (!sectionData || typeof sectionData !== 'object') return

      const fields = []

      Object.entries(sectionData).forEach(([fieldKey, fieldValue]) => {
        if (isEmpty(fieldValue)) {
          return
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

  const sections = generateSections()

  return (
    <div className="pdf-container">
      <style>{`
        /* STYLES POUR IMPRESSION ET ÉCRAN */
        /* CSS OPTIMISÉ POUR HTML2PDF - À ajouter dans le <style> de tes templates */

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
          page-break-inside: avoid; /* Ne jamais couper le header */
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid #3182ce;
        }

        .section {
          page-break-inside: avoid; /* Évite de couper une section */
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        /* 🔧 SECTIONS LONGUES : Force page break si nécessaire */
        .section.long-section {
          page-break-before: always; /* Force nouvelle page pour sections longues */
        }

        /* 🎨 TITRES ET CONTENUS */
        .pdf-container h1 { 
          font-size: 18pt; 
          margin-bottom: 20px; 
          color: #1a365d;
          border-bottom: 3px solid #3182ce;
          padding-bottom: 10px;
          page-break-after: avoid; /* Évite page break après titre */
        }

        .pdf-container h2 { 
          font-size: 14pt; 
          margin: 20px 0 10px 0; 
          color: #2d3748;
          background-color: #f7fafc;
          padding: 8px 12px;
          border-left: 4px solid #3182ce;
          page-break-after: avoid; /* Évite page break après sous-titre */
        }

        /* 📊 GRILLES ET DONNÉES */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
          page-break-inside: avoid; /* Ne coupe pas la grille */
        }

        .field-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 6px 0;
          border-bottom: 1px dotted #e2e8f0;
          page-break-inside: avoid; /* Ne coupe pas un champ */
        }

        /* 🔗 RÈGLES DE GROUPEMENT */
        .field-group {
          page-break-inside: avoid; /* Garde les groupes de champs ensemble */
          margin-bottom: 15px;
        }

        /* 📄 CONTRÔLE AVANCÉ DES PAGES */
        .force-new-page {
          page-break-before: always; /* Force nouvelle page */
        }

        .keep-together {
          page-break-inside: avoid; /* Garde ensemble */
        }

        .allow-break {
          page-break-inside: auto; /* Autorise les coupures */
        }

        /* 🎯 RÈGLES SPÉCIALES POUR HTML2PDF */
        @media print, (max-width: 0) {
          /* Ces règles s'appliquent lors de la génération PDF */
          
          .pdf-container {
            max-width: none;
            margin: 0;
            padding: 15mm;
          }
          
          /* Évite les veuves et orphelines */
          .section {
            orphans: 3; /* Min 3 lignes en bas de page */
            widows: 3;  /* Min 3 lignes en haut de nouvelle page */
          }
          
          /* Force les sauts intelligents */
          .section:nth-child(3n) {
            page-break-after: avoid; /* Évite coupure toutes les 3 sections */
          }
        }

        /* 🎨 AMÉLIORATIONS VISUELLES */
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
        }
      `}</style>

      {/* En-tête */}
      <div className="header">
        <h1>📝 Fiche Logement • {formData.nom || 'Sans nom'} • Letahost</h1>
        
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

      {/* Toutes les sections avec données */}
      {sections.length === 0 ? (
        <div className="section">
          <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
            Aucune donnée renseignée dans cette fiche
          </p>
        </div>
      ) : (
        <div>
          {sections.map((section, index) => (
            <div key={index} className="section">
              <h2>
                {section.emoji} {section.label.replace(section.emoji + ' ', '')}
              </h2>
              
              <div>
                {section.fields.map(field => (
                  <div key={field.key} className="field-row">
                    <div className="field-label">{field.label} :</div>
                    <div className="field-value">{formatValue(field.value, field.key)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ 
        marginTop: '40px', 
        paddingTop: '20px', 
        borderTop: '1px solid #e2e8f0', 
        fontSize: '10pt', 
        color: '#666',
        textAlign: 'center'
      }}>
        <p>Fiche générée le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
        <p>Letahost - Conciergerie de luxe</p>
      </div>
    </div>
  )
}

export default PDFTemplate