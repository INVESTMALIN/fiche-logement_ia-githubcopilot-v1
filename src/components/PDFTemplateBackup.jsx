// src/components/PDFTemplate.jsx - VERSION 2 CLEAN & COMPLETE
import React from 'react'

const PDFTemplate = ({ formData }) => {
  // Vérification des données
  if (!formData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h2>Erreur</h2>
        <p>Aucune donnée de fiche disponible pour générer le PDF.</p>
      </div>
    )
  }

  // 📋 CONFIGURATION : Toutes les 22 sections avec labels et emojis
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

  // Helper pour vérifier si c'est une URL d'image valide
  const isImageUrl = (url) => {
    if (typeof url !== 'string' || url.trim() === '') return false
    return url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i) !== null || 
           url.includes('supabase') || 
           url.includes('storage')
  }

  // 🧹 Helper pour nettoyer les URLs malformées
  const cleanUrl = (url) => {
    if (typeof url !== 'string') return url
    
    return url
      .trim() // Enlever espaces
      .replace(/^["'\[]/, '') // Enlever [, ", ' au début
      .replace(/["'\]]$/, '') // Enlever ], ", ' à la fin
      .replace(/\\"/g, '"') // Remplacer \" par "
      .replace(/%22/g, '') // Enlever %22 (caractères d'échappement)
      .replace(/^\[/, '') // Sécurité : enlever [ restant
      .replace(/\]$/, '') // Sécurité : enlever ] restant
  }

  // 🔧 Helper pour parser les strings JSON malformées + nettoyage URLs
  const parsePhotoValue = (value) => {
    if (Array.isArray(value)) {
      const urls = value.filter(url => isImageUrl(url)).map(url => cleanUrl(url))
      return urls
    }
    
    if (typeof value === 'string') {
      // Si c'est une URL directe, la retourner
      if (isImageUrl(value)) {
        return [cleanUrl(value)]
      }
      
      // Si c'est un JSON string, essayer de le parser
      if (value.startsWith('[') || value.startsWith('"[')) {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) {
            return parsed.filter(isImageUrl).map(url => cleanUrl(url))
          }
        } catch (e) {
          console.warn('🔧 Erreur parsing JSON:', value, e)
          return []
        }
      }
    }
    
    return []
  }

  // 🔍 FONCTION PRINCIPALE : Détection intelligente de TOUTES les photos
  const extractAllPhotos = (sectionData, sectionKey) => {
    const photos = []
    
    if (!sectionData || typeof sectionData !== 'object') {
      return photos
    }

    // Helper pour créer un objet photo standardisé
    const createPhotoObject = (url, label, fieldKey) => {
      const cleanedUrl = cleanUrl(url)
      return {
        url: cleanedUrl,
        label: label,
        fieldKey: fieldKey,
        isValid: isImageUrl(cleanedUrl)
      }
    }

    // 🎯 PATTERN 1: Arrays directs + Strings JSON (ex: photos_salle_de_bain, emplacementPhoto)
    Object.entries(sectionData).forEach(([fieldKey, fieldValue]) => {
      const urls = parsePhotoValue(fieldValue)
      if (urls.length > 0) {
        const label = formatFieldName(fieldKey)
        urls.forEach((url, index) => {
          photos.push(createPhotoObject(url, urls.length > 1 ? `${label} ${index + 1}` : label, fieldKey))
        })
      }
    })

    // 🎯 PATTERN 2: Objects imbriqués (ex: clefs.photos, chambre_1.photos)
    Object.entries(sectionData).forEach(([fieldKey, fieldValue]) => {
      if (typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue)) {
        // Chercher récursivement dans l'objet
        Object.entries(fieldValue).forEach(([subKey, subValue]) => {
          const urls = parsePhotoValue(subValue)
          if (urls.length > 0) {
            const label = `${formatFieldName(fieldKey)} - ${formatFieldName(subKey)}`
            urls.forEach((url, index) => {
              photos.push(createPhotoObject(url, urls.length > 1 ? `${label} ${index + 1}` : label, `${fieldKey}.${subKey}`))
            })
          }
        })
      }
    })

    return photos.filter(photo => photo.isValid)
  }

  // 🔍 Helper pour formater les noms de champs
  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/photo/gi, 'Photo')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim()
  }

  // 🔍 Helper pour vérifier si une valeur est vide
  const isEmpty = (value) => {
    if (value === null || value === undefined || value === '') return true
    if (typeof value === 'number' && value === 0) return true
    if (value === '0') return true
    
    // 🔧 Amélioration : Arrays vides ou avec que des valeurs vides
    if (Array.isArray(value)) {
      return value.length === 0 || value.every(v => 
        v === null || v === undefined || v === '' || v === 0 || v === '0'
      )
    }
    
    // 🔧 Amélioration : Strings d'arrays vides
    if (typeof value === 'string') {
      if (value === '[]' || value === '[null]' || value === '[undefined]' || value === '[""]') return true
    }
    
    if (typeof value === 'object') {
      return Object.values(value).every(v => isEmpty(v))
    }
    return false
  }

  // 🔄 Helper pour formater les valeurs (booléens, arrays, etc.)
  const formatValue = (value, fieldKey = '') => {
    if (isEmpty(value)) return null // null = pas affiché
    
    // 🚫 EXCLURE LES CHAMPS PHOTOS - ils sont gérés séparément
    if (fieldKey.toLowerCase().includes('photo') || 
        fieldKey.toLowerCase().includes('photos') || 
        fieldKey === 'photos' || 
        fieldKey.endsWith('_photos') ||
        fieldKey.endsWith('Photo')) {
      return null
    }
    
    // Booléens
    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non'
    }
    
    // Strings boolean-like  
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return 'Oui'
      if (value.toLowerCase() === 'false') return 'Non'
      
      // 🚫 Filtrer les URLs d'images qui apparaissent comme string
      if (isImageUrl(value)) return null
      
      // 🚫 Filtrer les arrays JSON vides comme "[]"
      if (value === '[]' || value === '[null]' || value === '[undefined]') return null
    }
    
    // Arrays (mais pas photos)
    if (Array.isArray(value)) {
      const nonPhotoValues = value.filter(v => !isEmpty(v) && !isImageUrl(v))
      if (nonPhotoValues.length === 0) return null
      
      return nonPhotoValues.map(v => {
        if (v === true) return 'Oui'
        if (v === false) return 'Non'
        return v
      }).join(', ')
    }
    
    // Objects (sauf objets photos complexes)
    if (typeof value === 'object') {
      // 🚫 Filtrer les objets qui ne contiennent que des photos
      const nonPhotoEntries = Object.entries(value)
        .filter(([key, val]) => {
          if (isEmpty(val)) return false
          // Exclure les clés photos
          if (key.toLowerCase().includes('photo') || key === 'photos') return false
          return true
        })
      
      if (nonPhotoEntries.length === 0) return null
      
      const validEntries = nonPhotoEntries.map(([key, val]) => {
        let formattedVal = val
        if (val === true) formattedVal = 'Oui'
        else if (val === false) formattedVal = 'Non'
        
        return `${formatFieldName(key)}: ${formattedVal}`
      })
      
      if (validEntries.length === 0) return null
      
      // 🎯 RETOURNER UN OBJET SPÉCIAL pour bullet list au lieu d'une string
      return {
        type: 'bullet-list',
        items: validEntries
      }
    }
    
    return String(value)
  }

  // 🎯 COMPOSANT: Rendu moderne des photos
  const PhotosDisplay = ({ photos, sectionTitle }) => {
    if (!photos || photos.length === 0) return null
  
    return (
      <div style={{
        marginTop: '16px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        pageBreakInside: 'avoid'
      }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '11pt',
          fontWeight: '600',
          color: '#4a5568',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          📸 Photos {sectionTitle} ({photos.length})
        </h4>
        
        {/* 🔧 SOLUTION: Flexbox au lieu de Grid rigide */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'flex-start', // Aligne à gauche
          alignItems: 'flex-start'
        }}>
          {photos.slice(0, 6).map((photo, index) => (
            <div key={index} style={{
              // 🔧 CONTENEUR qui s'adapte au contenu
              display: 'inline-block',
              textAlign: 'center',
              pageBreakInside: 'avoid',
              // Pas de width fixe, laisse l'image définir la taille
            }}>
              <a 
                href={photo.url} 
                target="_blank"
                style={{ 
                  display: 'block', 
                  textDecoration: 'none',
                  border: '2px solid #3182ce',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  // 🔧 Le lien s'adapte à l'image
                  width: 'fit-content'
                }}
              >
                <img 
                  src={photo.url}
                  alt={photo.label}
                  style={{
                    display: 'block',
                    // 🔧 TAILLE RESPONSIVE basée sur le nombre de photos
                    maxWidth: photos.length === 1 ? '150px' : 
         photos.length === 2 ? '120px' : 
         photos.length <= 4 ? '100px' : '80px',
maxHeight: photos.length === 1 ? '120px' : 
          photos.length === 2 ? '100px' : '70px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    backgroundColor: '#f7fafc'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </a>
              <div style={{
                fontSize: '8pt',
                color: '#6b7280',
                marginTop: '4px',
                lineHeight: '1.2',
                maxWidth: '100px', // Limite la largeur du texte
                wordWrap: 'break-word'
              }}>
                {photo.label}
              </div>
            </div>
          ))}
          
          {photos.length > 6 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9pt',
              color: '#6b7280',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '20px',
              border: '1px dashed #cbd5e0',
              borderRadius: '6px',
              minWidth: '100px'
            }}>
              +{photos.length - 6} autres photos disponibles
            </div>
          )}
        </div>
      </div>
    )
  }

  // 🎯 GÉNÉRATION DES SECTIONS COMPLÈTES
  const generateSections = () => {
    const sections = []

    sectionsConfig.forEach(config => {
      const sectionData = formData[config.key]
      
      if (!sectionData || typeof sectionData !== 'object') return

      // Extraire les photos de cette section
      const photos = extractAllPhotos(sectionData, config.key)

      // Extraire les champs non-photos
      const fields = []
      Object.entries(sectionData).forEach(([fieldKey, fieldValue]) => {
        const formattedValue = formatValue(fieldValue, fieldKey)
        if (formattedValue !== null) {
          fields.push({
            key: fieldKey,
            label: formatFieldName(fieldKey),
            value: formattedValue
          })
        }
      })

      // Ajouter la section seulement si elle a du contenu (champs OU photos)
      if (fields.length > 0 || photos.length > 0) {
        sections.push({
          ...config,
          fields,
          photos
        })
      }
    })

    return sections
  }

  const sections = generateSections()

  return (
    <div className="pdf-container" style={{
      fontFamily: 'Arial, sans-serif',
      fontSize: '10pt',
      lineHeight: '1.4',
      color: '#2d3748',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#ffffff'
    }}>
      {/* Header moderne et propre */}
      <div className="header" style={{
        textAlign: 'center',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '2px solid #3182ce',
        pageBreakInside: 'avoid'
      }}>
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '22pt',
          fontWeight: 'bold',
          color: '#1a365d'
        }}>
          🏠 Fiche Logement • {formData.nom || 'Sans nom'} • Letahost
        </h1>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
          marginTop: '15px',
          fontSize: '10pt'
        }}>
          <div style={{
            padding: '8px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            pageBreakInside: 'avoid'
          }}>
            <div style={{ fontWeight: '600', color: '#4a5568', marginBottom: '4px' }}>
              Généré le
            </div>
            <div style={{ color: '#1a202c' }}>
              {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          
          <div style={{
            padding: '8px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            pageBreakInside: 'avoid'
          }}>
            <div style={{ fontWeight: '600', color: '#4a5568', marginBottom: '4px' }}>
              Type de propriété
            </div>
            <div style={{ color: '#1a202c' }}>
              {formData.section_logement?.type_propriete || 'Non spécifié'}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENU PRINCIPAL : TOUTES LES SECTIONS */}
      {sections.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280',
          fontStyle: 'italic'
        }}>
          Aucune donnée disponible pour cette fiche
        </div>
      ) : (
        sections.map((section, index) => (
          <div key={section.key} className="section" style={{
            marginBottom: '32px',
            pageBreakInside: 'avoid'
          }}>
            {/* Header section */}
            <h3 style={{
              fontSize: '14pt',
              fontWeight: 'bold',
              color: '#2d3748',
              marginBottom: '16px',
              borderLeft: '4px solid #3182ce',
              paddingLeft: '12px'
            }}>
              {section.label}
            </h3>

            {/* Champs de la section */}
            {section.fields.length > 0 && (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '16px',
                marginBottom: section.photos.length > 0 ? '16px' : '0'
              }}>
                {section.fields.map((field, fieldIndex) => (
                  <div key={field.key} style={{
                    marginBottom: fieldIndex < section.fields.length - 1 ? '12px' : '0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{
                      fontSize: '9pt',
                      fontWeight: '600',
                      color: '#4a5568',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {field.label}
                    </span>
                    <span style={{
                      fontSize: '10pt',
                      color: '#2d3748',
                      lineHeight: '1.4'
                    }}>
                      {/* 🎯 GESTION BULLET LIST pour les objects */}
                      {typeof field.value === 'object' && field.value.type === 'bullet-list' ? (
                        <div style={{ marginTop: '4px' }}>
                          {field.value.items.map((item, itemIndex) => (
                            <div key={itemIndex} style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '6px',
                              marginBottom: itemIndex < field.value.items.length - 1 ? '3px' : '0'
                            }}>
                              <span style={{ 
                                color: '#3182ce', 
                                fontSize: '8pt',
                                marginTop: '1px'
                              }}>•</span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        field.value
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Photos de la section */}
            {section.photos.length > 0 && (
              <PhotosDisplay photos={section.photos} sectionTitle={section.label} />
            )}
          </div>
        ))
      )}
    </div>
  )
}

export default PDFTemplate