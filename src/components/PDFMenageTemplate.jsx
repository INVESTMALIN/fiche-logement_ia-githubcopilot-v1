// src/components/PDFMenageTemplate.jsx - VERSION 2 CLEAN & PHOTOS GRANDES
import React from 'react'

const PDFMenageTemplate = ({ formData }) => {

  // Vérification des données
  if (!formData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h2>Erreur</h2>
        <p>Aucune donnée de fiche disponible pour générer le PDF ménage.</p>
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

  // Helper pour vérifier si c'est une URL d'image valide
  const isImageUrl = (url) => {
    if (typeof url !== 'string' || url.trim() === '') return false

    // Extraire l'extension sans les query params
    const urlWithoutParams = url.split('?')[0]

    // Vérifier que c'est bien une image, PAS une vidéo
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(urlWithoutParams)
    const isVideo = /\.(mp4|webm|ogg|mov|avi|m4v|mkv|qt)$/i.test(urlWithoutParams)

    return isImage && !isVideo
  }

  // 🧹 Helper pour nettoyer les URLs malformées
  const cleanUrl = (url) => {
    if (typeof url !== 'string') return url

    return url
      .trim()
      .replace(/^["'\[]/, '')
      .replace(/["'\]]$/, '')
      .replace(/\\"/g, '"')
      .replace(/%22/g, '')
      .replace(/^\[/, '')
      .replace(/\]$/, '')
  }

  // 🔧 Helper pour optimiser les URLs Supabase via transformations d'images
  // Utilise resize=contain pour préserver le ratio sans crop (évite le portrait étroit)
  const optimizeImageUrl = (url) => {
    if (typeof url !== 'string') return url
    if (!url.includes('supabase.co/storage')) return url
    if (url.includes('/assets/')) return url
    const renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    const separator = renderUrl.includes('?') ? '&' : '?'
    return `${renderUrl}${separator}width=800&quality=65&resize=contain`
  }

  // 🔧 Helper pour parser les strings JSON malformées + nettoyage URLs
  const parsePhotoValue = (value) => {
    if (Array.isArray(value)) {
      const urls = value.filter(url => isImageUrl(url)).map(url => cleanUrl(url))
      return urls
    }

    if (typeof value === 'string') {
      if (isImageUrl(value)) {
        return [cleanUrl(value)]
      }

      if (value.startsWith('[') || value.startsWith('"[')) {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) {
            return parsed.filter(isImageUrl).map(url => cleanUrl(url))
          }
        } catch (e) {
          return []
        }
      }
    }

    return []
  }

  // 🛏️ Helper pour agréger tous les types de lits du logement
  const aggregateBeds = (formData) => {
    const chambres = formData.section_chambres || {}
    const salon = formData.section_salon_sam || {}

    const bedsCount = {}

    // Types de lits à compter (SANS les canapés-lits, on les traite séparément)
    const bedTypes = [
      { key: 'lit_simple_90_190', label: 'Lit simple (90×190)' },
      { key: 'lit_double_140_190', label: 'Lit double (140×190)' },
      { key: 'lit_queen_160_200', label: 'Queen size (160×200)' },
      { key: 'lit_king_180_200', label: 'King size (180×200)' },
      { key: 'lits_superposes_90_190', label: 'Lits superposés' },
      { key: 'lit_gigogne', label: 'Lit gigogne' }
    ]

    // Parcourir les 6 chambres possibles
    for (let i = 1; i <= 6; i++) {
      const chambre = chambres[`chambre_${i}`]
      if (!chambre) continue

      // Lits normaux
      bedTypes.forEach(bedType => {
        const count = chambre[bedType.key] || 0
        if (count > 0) {
          if (!bedsCount[bedType.label]) {
            bedsCount[bedType.label] = 0
          }
          bedsCount[bedType.label] += count
        }
      })

      // 🛋️ Canapés-lits CHAMBRES (séparés simple/double)
      const canapeLitSimple = chambre.canape_lit_simple || 0
      const canapeLitDouble = chambre.canape_lit_double || 0

      if (canapeLitSimple > 0) {
        const label = 'Canapé-lit simple'
        if (!bedsCount[label]) bedsCount[label] = 0
        bedsCount[label] += canapeLitSimple
      }

      if (canapeLitDouble > 0) {
        const label = 'Canapé-lit double'
        if (!bedsCount[label]) bedsCount[label] = 0
        bedsCount[label] += canapeLitDouble
      }
    }

    // 🛋️ Canapé-lit SALON
    /*if (salon.equipements_canape_lit === true) {
      const label = 'Canapé-lit (salon)'
      bedsCount[label] = 1
    }  */

    return bedsCount
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
      const optimizedUrl = optimizeImageUrl(cleanedUrl)
      return {
        url: optimizedUrl,
        label: label,
        fieldKey: fieldKey,
        isValid: isImageUrl(cleanedUrl)
      }
    }

    // PATTERN 1: Arrays directs + Strings JSON
    Object.entries(sectionData).forEach(([fieldKey, fieldValue]) => {
      const urls = parsePhotoValue(fieldValue)
      if (urls.length > 0) {
        const label = formatFieldName(fieldKey)
        urls.forEach((url, index) => {
          photos.push(createPhotoObject(url, urls.length > 1 ? `${label} ${index + 1}` : label, fieldKey))
        })
      }
    })

    // PATTERN 2: Objects imbriqués
    Object.entries(sectionData).forEach(([fieldKey, fieldValue]) => {
      if (typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue)) {
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

    const validPhotos = photos.filter(photo => photo.isValid)
    const seen = new Set()
    return validPhotos.filter(p => {
      if (seen.has(p.url)) return false
      seen.add(p.url)
      return true
    })
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

    if (Array.isArray(value)) {
      return value.length === 0 || value.every(v =>
        v === null || v === undefined || v === '' || v === 0 || v === '0'
      )
    }

    if (typeof value === 'string') {
      if (value === '[]' || value === '[null]' || value === '[undefined]' || value === '[""]') return true
    }

    if (typeof value === 'object') {
      return Object.values(value).every(v => isEmpty(v))
    }
    return false
  }

  // 🔒 Helper pour masquer les codes confidentiels dans le PDF ménage
  const maskSecretCodes = (value, fieldKey) => {
    // 🔒 TTLock : masquer masterpinConciergerie et codeProprietaire
    if (fieldKey.includes('masterpinConciergerie') || fieldKey.includes('codeProprietaire')) {
      return '*****'
    }

    // 🔒 Igloohome : masquer codeVoyageur aussi
    if (fieldKey.includes('codeVoyageur')) {
      return '*****'
    }

    // ✅ Garder visible : codeMenage et masterlock.code
    return value
  }

  // 🔄 Helper pour formater les valeurs (booléens, arrays, etc.)
  const formatValue = (value, fieldKey = '') => {
    if (isEmpty(value)) return null

    // 🚫 EXCLURE LES CHAMPS PHOTOS ET VIDÉOS
    if (
      fieldKey.toLowerCase().includes('photo') ||
      fieldKey.toLowerCase().includes('photos') ||
      fieldKey.toLowerCase().includes('video') ||
      fieldKey.toLowerCase().includes('videos') ||
      fieldKey === 'photos' ||
      fieldKey.endsWith('_photos') ||
      fieldKey.endsWith('_videos') ||
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

      if (isImageUrl(value)) return null
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
      const nonPhotoEntries = Object.entries(value)
        .filter(([key, val]) => {
          if (isEmpty(val)) return false
          if (key.toLowerCase().includes('photo') || key === 'photos') return false
          return true
        })

      if (nonPhotoEntries.length === 0) return null

      const validEntries = nonPhotoEntries.map(([key, val]) => {
        let formattedVal = maskSecretCodes(val, key)
        if (val === true) formattedVal = 'Oui'
        else if (val === false) formattedVal = 'Non'

        return `${formatFieldName(key)}: ${formattedVal}`
      })

      if (validEntries.length === 0) return null

      // 🎯 RETOURNER UN OBJET SPÉCIAL pour bullet list
      return {
        type: 'bullet-list',
        items: validEntries
      }
    }
    // 🔒 MASQUAGE CODES CONFIDENTIELS pour PDF ménage
    const maskedValue = maskSecretCodes(value, fieldKey)
    if (maskedValue !== value) {
      return maskedValue
    }
    return String(value)
  }

  // 🎯 COMPOSANT: Rendu GRAND des photos pour ménage - VERSION CORRIGÉE
  const PhotosDisplayMenage = ({ photos, sectionTitle }) => {
    if (!photos || photos.length === 0) return null

    return (
      <div style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        pageBreakInside: 'avoid'
      }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '12pt',
          fontWeight: '600',
          color: '#4a5568',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📸 Photos {sectionTitle} ({photos.length})
        </h4>

        {/* 🔧 SOLUTION: Flexbox responsive pour photos GRANDES */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'flex-start', // Aligne à gauche
          alignItems: 'flex-start'
        }}>
          {photos.slice(0, 5).map((photo, index) => (
            <div key={index} style={{
              // 🔧 CONTENEUR adaptatif pour grandes photos
              display: 'inline-block',
              textAlign: 'center',
              pageBreakInside: 'avoid',
              // Pas de width fixe
            }}>
              <a
                href={photo.url}
                target="_blank"
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  border: '3px solid #dbae61',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  width: 'fit-content'
                }}
              >
                <img
                  src={photo.url}
                  alt={photo.label}
                  style={{
                    display: 'block',
                    // 🔧 TAILLES ORIGINALES MÉNAGE (plus grandes)
                    maxWidth: photos.length === 1 ? '350px' :
                      photos.length === 2 ? '280px' :
                        photos.length <= 3 ? '220px' : '170px',
                    maxHeight: photos.length === 1 ? '250px' :
                      photos.length === 2 ? '200px' :
                        photos.length <= 3 ? '170px' : '140px',
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
                fontSize: '9pt',
                color: '#4a5568',
                marginTop: '8px',
                lineHeight: '1.3',
                fontWeight: '500',
                maxWidth: '150px', // Limite plus large pour les grandes photos
                wordWrap: 'break-word'
              }}>
                {photo.label}
              </div>
            </div>
          ))}
          {photos.length > 5 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10pt',
              color: '#6b7280',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '24px',
              border: '2px dashed #cbd5e0',
              borderRadius: '8px',
              minWidth: '160px'
            }}>
              +{photos.length - 5} autres photos disponibles
            </div>
          )}

        </div>
      </div>
    )
  }

  // 🎯 Fonction pour générer le nom du dossier photos
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

  // 🍳 FONCTION SPÉCIALE : Rendu groupé pour Cuisine 1
  const renderCuisine1Grouped = (sectionData) => {
    const equipements = [
      { key: 'refrigerateur', label: 'Réfrigérateur', emoji: '🧊' },
      { key: 'congelateur', label: 'Congélateur', emoji: '❄️' },
      { key: 'mini_refrigerateur', label: 'Mini réfrigérateur', emoji: '🧊' },
      { key: 'cuisiniere', label: 'Cuisinière', emoji: '🔥' },
      { key: 'plaque_cuisson', label: 'Plaque de cuisson', emoji: '🔥' },
      { key: 'four', label: 'Four', emoji: '🔥' },
      { key: 'micro_ondes', label: 'Four à micro-ondes', emoji: '📡' },
      { key: 'lave_vaisselle', label: 'Lave-vaisselle', emoji: '🧽' },
      { key: 'cafetiere', label: 'Cafetière', emoji: '☕' },
      { key: 'bouilloire', label: 'Bouilloire électrique', emoji: '💧' },
      { key: 'grille_pain', label: 'Grille-pain', emoji: '🍞' },
      { key: 'blender', label: 'Blender', emoji: '🥤' },
      { key: 'cuiseur_riz', label: 'Cuiseur à riz', emoji: '🍚' },
      { key: 'machine_pain', label: 'Machine à pain', emoji: '🥖' },
      { key: 'lave_linge', label: 'Lave-linge', emoji: '🧺' }
    ]

    const groupedEquipements = []

    equipements.forEach(equip => {
      // Vérifier si l'équipement est coché
      if (sectionData[`equipements_${equip.key}`] === true) {
        const details = {}
        const photos = []

        // Récupérer tous les champs liés à cet équipement
        Object.entries(sectionData).forEach(([fieldKey, fieldValue]) => {
          if (fieldKey.startsWith(equip.key) && !isEmpty(fieldValue)) {
            if (fieldKey.includes('photo') || fieldKey.includes('video')) {
              // Extraire les photos/vidéos
              const urls = parsePhotoValue(fieldValue)
              urls.forEach(url => photos.push({
                url: cleanUrl(url),
                label: formatFieldName(fieldKey),
                fieldKey: fieldKey,
                isValid: isImageUrl(cleanUrl(url))
              }))
            } else {
              // Ajouter les détails texte
              details[fieldKey] = fieldValue
            }
          }
        })

        // Ajouter l'équipement groupé seulement s'il a des détails ou photos
        if (Object.keys(details).length > 0 || photos.length > 0) {
          groupedEquipements.push({
            ...equip,
            details,
            photos: photos.filter(p => p.isValid)
          })
        }
      }
    })

    return groupedEquipements
  }

  // 🎯 GÉNÉRATION DES SECTIONS MÉNAGE COMPLÈTES
  const generateMenageSections = () => {
    const sections = []

    // 🛏️ Agrégation des lits pour injection dans section Logement
    const bedsDetail = aggregateBeds(formData)
    const bedsText = Object.entries(bedsDetail)
      .map(([type, count]) => `${count}× ${type}`)
      .join(', ')

    menageSectionsConfig.forEach(config => {
      const sectionData = formData[config.key]

      if (!sectionData || typeof sectionData !== 'object') return

      // Extraire les photos de cette section
      const photos = extractAllPhotos(sectionData, config.key)

      // Extraire les champs non-photos avec filtrage spécial équipements
      const fields = []
      Object.entries(sectionData).forEach(([fieldKey, fieldValue]) => {
        // 🛏️ INJECTION SPÉCIALE : Détail des lits dans section Logement
        if (config.key === 'section_logement' && fieldKey === 'nombre_lits' && bedsText) {
          const formattedValue = formatValue(fieldValue, fieldKey)
          if (formattedValue !== null) {
            fields.push({
              key: fieldKey,
              label: formatFieldName(fieldKey),
              value: formattedValue
            })
            fields.push({
              key: 'detail_lits',
              label: 'Détail des lits',
              value: bedsText
            })
          }
          return // Skip traitement normal
        }

        // 🎯 FILTRAGE SPÉCIAL ÉQUIPEMENTS pour ménage
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

  const sections = generateMenageSections()

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
      {/* Header moderne spécifique ménage */}
      <div className="header" style={{
        textAlign: 'center',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '2px solid #16a085',
        pageBreakInside: 'avoid'
      }}>
        <h1 style={{
          margin: '0 0 20px 0',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
          color: '#dbae61',
          padding: '10px',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          border: '2px solid #dbae61',
          display: 'block',
          minHeight: '80px',
          letterSpacing: '1px'
        }}>
          <img
            src="https://qwjgkqxemnpvlhwxexht.supabase.co/storage/v1/object/public/fiche-pdfs/assets/letahost-transparent.png"
            style={{
              height: '100px',
              width: 'auto',
              maxWidth: '400px',
              objectFit: 'contain',
              margin: '0 auto',
              display: 'block'
            }}
          />
        </h1>
        <h2 style={{
          margin: '10px 0 0 0',
          fontSize: '18pt',
          fontWeight: 'bold',
          color: '#000000',
          textAlign: 'center'
        }}>
          Fiche Ménage • {formData.nom || 'Sans nom'}
        </h2>
        {/*Généré le*/}
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

          {/*Type de propriété*/}
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

      {/* CONTENU PRINCIPAL : SECTIONS MÉNAGE */}
      {sections.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280',
          fontStyle: 'italic',
          border: '2px dashed #ddd',
          borderRadius: '8px'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Aucune donnée ménage disponible</p>
          <p>Cette fiche ne contient pas encore d'informations relatives au ménage.</p>
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
              borderLeft: '4px solid #dbae61',
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
                {/* 🍳 CAS SPÉCIAL : Cuisine 1 - Rendu groupé */}
                {/* 🧴 CAS SPÉCIAL : Consommables - Liste des consommables obligatoires */}
                {section.key === 'section_consommables' && formData.section_consommables?.fournis_par_prestataire === true ? (
                  <div style={{ marginBottom: '16px' }}>
                    {/* Liste rouge des consommables obligatoires */}
                    <div style={{
                      backgroundColor: '#fef2f2',
                      border: '2px solid #dc2626',
                      borderRadius: '6px',
                      padding: '16px',
                      marginBottom: '16px',
                      pageBreakInside: 'avoid'
                    }}>
                      <h4 style={{
                        margin: '0 0 12px 0',
                        fontSize: '10pt',
                        fontWeight: '700',
                        color: '#991b1b'
                      }}>
                        Les consommables ci-dessous devront OBLIGATOIREMENT être fournis par le prestataire de ménage :
                      </h4>
                      <ul style={{
                        margin: '0',
                        paddingLeft: '20px',
                        fontSize: '9pt',
                        color: '#7f1d1d',
                        lineHeight: '1.6'
                      }}>
                        <li>2 rouleaux de papier toilette par toilette</li>
                        <li>1 savon pour les mains disponible par lavabo</li>
                        <li>1 produit vaisselle par cuisine</li>
                        <li>1 éponge par cuisine (en bon état)</li>
                        <li>Sel, poivre, sucre (en quantité adéquate)</li>
                        <li>Café et thé (1 sachet par personne)</li>
                        <li>Essuie-tout/Sopalin</li>
                        <li>Sac poubelle</li>
                        <li>Produit vitres</li>
                        <li>Produit sol</li>
                        <li>Produit salle de bain/multi-surfaces ou vinaigre ménager</li>
                        <li>Produit WC / Javel</li>
                      </ul>
                    </div>

                    {/* Autres champs de la section (sur demande, café, etc.) */}
                    {section.fields.length > 0 && (
                      <div>
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
                              color: '#2d3748'
                            }}>
                              {formatValue(field.value, field.key)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : section.key === 'section_cuisine_1' ? (
                  (() => {
                    const groupedEquipements = renderCuisine1Grouped(formData.section_cuisine_1 || {})

                    return groupedEquipements.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {groupedEquipements.map((equip, idx) => (
                          <div key={idx} style={{
                            padding: '12px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            pageBreakInside: 'avoid'
                          }}>
                            {/* Titre équipement */}
                            <h4 style={{
                              margin: '0 0 8px 0',
                              fontSize: '11pt',
                              fontWeight: '600',
                              color: '#2d3748',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>{equip.emoji}</span>
                              <span>{equip.label}</span>
                            </h4>

                            {/* Détails équipement */}
                            {Object.keys(equip.details).length > 0 && (
                              <div style={{ marginBottom: equip.photos.length > 0 ? '8px' : '0' }}>
                                {Object.entries(equip.details).map(([key, value], detailIdx) => (
                                  <div key={detailIdx} style={{
                                    marginBottom: detailIdx < Object.entries(equip.details).length - 1 ? '6px' : '0',
                                    fontSize: '9pt',
                                    color: '#4a5568'
                                  }}>
                                    <span style={{ fontWeight: '600' }}>{formatFieldName(key.replace(equip.key + '_', ''))}:</span>{' '}
                                    <span style={{ color: '#2d3748' }}>{formatValue(value, key)}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Photos/vidéos équipement */}
                            {equip.photos.length > 0 && (
                              <PhotosDisplayMenage photos={equip.photos} sectionTitle={equip.label} />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '9pt', color: '#6b7280', fontStyle: 'italic' }}>
                        Aucun équipement configuré
                      </div>
                    )
                  })()
                ) : (
                  /* RENDU NORMAL pour les autres sections */
                  section.fields.map((field, fieldIndex) => (
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
                  ))
                )}
              </div>
            )}

            {/* Photos de la section - GRANDES pour ménage */}
            {section.photos.length > 0 && (
              <PhotosDisplayMenage photos={section.photos} sectionTitle={section.label} />
            )}
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
        <p style={{ marginBottom: '8px' }}>
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