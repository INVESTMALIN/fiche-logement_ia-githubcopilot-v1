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

  // 📋 CONFIGURATION : Toutes les 23 sections avec labels et emojis
  const sectionsConfig = [
    { key: 'section_proprietaire', label: '👤 Propriétaire', emoji: '👤' },
    { key: 'section_logement', label: '🏠 Logement', emoji: '🏠' },
    { key: 'section_avis', label: '⭐ Avis', emoji: '⭐' },
    { key: 'section_clefs', label: '🔑 Clefs', emoji: '🔑' },
    { key: 'section_airbnb', label: '🏠 Airbnb', emoji: '🏠' },
    { key: 'section_booking', label: '📅 Booking', emoji: '📅' },
    { key: 'section_reglementation', label: '📋 Réglementation', emoji: '📋' },
    { key: 'section_exigences', label: '⚠️ Exigences', emoji: '⚠️' },
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

  // 🎯 DICTIONNAIRE DE TRADUCTION valeurs techniques → humaines
  const translateValue = (value) => {
    const translations = {
      // 🎬 ÉVALUATION ENVIRONNEMENT
      'true': 'Oui',
      'false': 'Non',

      // 🏘️ ÉVALUATION QUARTIER - Types
      'quartier_neuf': 'Quartier neuf (récemment développé, moderne)',
      'quartier_ancien': 'Quartier ancien (historique, caractère authentique)',
      'quartier_populaire': 'Quartier populaire (vivant, mais parfois moins soigné)',
      'quartier_residentiel': 'Quartier résidentiel (principalement des logements)',
      'quartier_excentre': 'Quartier excentré (loin des points d\'intérêt principaux)',
      'quartier_central': 'Quartier central (proche du centre-ville, bien desservi)',
      'quartier_chic': 'Quartier chic (haut de gamme, commerçants et services de luxe)',
      'quartier_intermediaire': 'Quartier intermédiaire (familial, moyen de gamme)',
      'quartier_defavorise': 'Quartier défavorisé (secteur avec des conditions de vie moins favorables)',

      // 🏘️ ÉVALUATION QUARTIER - Sécurité
      'securise': 'Sécurisé (quartier calme)',
      'modere': 'Quartier modéré (risques modérés de délinquance)',
      'zone_risques': 'Zone à risques (pas de sentiment de sécurité, délinquance)',

      // 🏘️ ÉVALUATION QUARTIER - Perturbations
      'aucune': 'Pas d\'élément perturbateur',
      'element_perturbateur': 'Élément perturbateur à proximité',

      // 🏢 ÉVALUATION IMMEUBLE - État général
      'bon_etat': 'Bon état (entretien régulier, bâtiment bien conservé)',
      'etat_correct': 'État correct (bien entretenu, améliorations mineures nécessaires)',
      'mauvais_etat': 'Mauvais état (bâtiment vétuste, rénovations nécessaires)',

      // 🏢 ÉVALUATION IMMEUBLE - Propreté
      'propre': 'Propre (espaces communs bien entretenus)',
      'sale': 'Sale (espaces communs mal nettoyés, débris visibles)',

      // 🏢 ÉVALUATION IMMEUBLE - Accessibilité
      'tres_accessible': 'Très accessible (ascenseur fonctionnel, rampes)',
      'moderement_accessible': 'Modérément accessible (accès possible avec limitations)',
      'inaccessible': 'Inaccessible (pas d\'ascenseur, escalier raide)',

      // 🏢 ÉVALUATION IMMEUBLE - Niveau sonore
      'tres_calme': 'Très calme (absence de bruit, excellente isolation)',
      'relativement_calme': 'Relativement calme (bruit modéré)',
      'tres_bruyant': 'Très bruyant (nuisances sonores importantes)',

      // 🏠 ÉVALUATION LOGEMENT - État général
      'excellent_etat': 'Excellent état (récent ou rénové, tout fonctionnel)',
      'etat_moyen': 'État moyen (éléments nécessitant réparations mineures)',
      'etat_degrade': 'État dégradé (meubles détériorés, travaux nécessaires)',
      'tres_mauvais_etat': 'Très mauvais état (vétusté générale)',

      // 🏠 ÉVALUATION LOGEMENT - Propreté
      'correct': 'Correct (légères traces d\'usure, entretien basique)',

      // 🏠 ÉVALUATION LOGEMENT - Ambiance (choix multiples)
      'logement_epure': 'Logement épuré (décor minimaliste)',
      'logement_charge': 'Logement chargé (beaucoup de décorations)',
      'decoration_moderne': 'Décoration moderne (meubles récents)',
      'decoration_traditionnelle': 'Décoration traditionnelle (meubles anciens)',
      'decoration_specifique': 'Décoration spécifique (logement à thème)',
      'absence_decoration': 'Absence de décoration',
      'decoration_personnalisee': 'Décoration très personnalisée (éléments familiaux)',

      // 🏠 ÉVALUATION LOGEMENT - Vis-à-vis
      'vue_degagee': 'Vue dégagée sur pièce principale et jardin',
      'vis_a_vis_partielle': 'Vis-à-vis partielle (arbres, clôture)',
      'vis_a_vis_direct': 'Vis-à-vis direct sur pièce principale et jardin',

      // 📶 ÉQUIPEMENTS - WiFi
      'oui': 'Oui',
      'en_cours': 'En cours d\'installation',
      'non': 'Non'
    }

    return translations[value] || value
  }

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
    }*/

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
        return translateValue(v)
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

    return translateValue(String(value))
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
          {photos.slice(0, 4).map((photo, index) => (
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

          {photos.length > 4 && (
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
              +{photos.length - 4} autres photos disponibles
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

  // 🎯 GÉNÉRATION DES SECTIONS COMPLÈTES
  const generateSections = () => {
    const sections = []

    // 🛏️ Agrégation des lits pour injection dans section Logement
    const bedsDetail = aggregateBeds(formData)
    const bedsText = Object.entries(bedsDetail)
      .map(([type, count]) => `${count}× ${type}`)
      .join(', ')

    sectionsConfig.forEach(config => {
      const sectionData = formData[config.key]

      if (!sectionData || typeof sectionData !== 'object') return

      // Extraire les photos de cette section
      const photos = extractAllPhotos(sectionData, config.key)

      // Extraire les champs non-photos
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
            // Ajouter le détail des lits juste après
            fields.push({
              key: 'detail_lits',
              label: 'Détail des lits',
              value: bedsText
            })
          }
          // Fin du traitement pour nombre_lits, on skip le reste
        } else {
          // Traitement normal pour tous les autres champs
          // 🚫 FILTRE SPÉCIAL : Exclure WiFi et Parking de section_equipements
          if (config.key === 'section_equipements') {
            const excludedFields = [
              'wifi_statut', 'wifi_nom_reseau', 'wifi_mot_de_passe', 'wifi_details', 'wifi_routeur_photo', 'wifi_disponible',
              'parking_type', 'parking_rue_details', 'parking_sur_place_types', 'parking_sur_place_details',
              'parking_payant_type', 'parking_payant_details', 'parking_equipement', 'parking_photos', 'parking_videos'
            ]
            if (excludedFields.includes(fieldKey)) return
          }

          const formattedValue = formatValue(fieldValue, fieldKey)
          if (formattedValue !== null) {
            fields.push({
              key: fieldKey,
              label: formatFieldName(fieldKey),
              value: formattedValue
            })
          }
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

  // 🏠 FONCTION SPÉCIALE : Rendu groupé pour Équipements
  const renderEquipementsGrouped = (sectionData) => {
    const equipements = [
      // Équipements avec conditionnels complets
      { key: 'tv', label: 'TV', emoji: '📺', hasConditionals: true },
      { key: 'climatisation', label: 'Climatisation', emoji: '❄️', hasConditionals: true },
      { key: 'chauffage', label: 'Chauffage', emoji: '🔥', hasConditionals: true },
      { key: 'lave_linge', label: 'Lave-linge', emoji: '🧺', hasConditionals: true },
      { key: 'seche_linge', label: 'Sèche-linge', emoji: '🌀', hasConditionals: true },
      { key: 'piano', label: 'Piano', emoji: '🎹', hasConditionals: true },
      { key: 'accessible_mobilite_reduite', label: 'Accessible aux personnes à mobilité réduite', emoji: '♿', hasConditionals: true },

      // Équipements simples (checkbox only)
      { key: 'fer_repasser', label: 'Fer à repasser', emoji: '🧹', hasConditionals: false },
      { key: 'etendoir', label: 'Étendoir', emoji: '🪜', hasConditionals: false },
      { key: 'tourne_disque', label: 'Tourne disque', emoji: '🎵', hasConditionals: false },
      { key: 'coffre_fort', label: 'Coffre fort', emoji: '🔒', hasConditionals: false },
      { key: 'ascenseur', label: 'Ascenseur', emoji: '🛗', hasConditionals: false },
      { key: 'cinema', label: 'Cinéma', emoji: '🎬', hasConditionals: false },
      { key: 'compacteur_dechets', label: 'Compacteur de déchets', emoji: '🗑️', hasConditionals: false },
      { key: 'fetes_autorisees', label: 'Fêtes autorisées', emoji: '🎉', hasConditionals: false },
      { key: 'fumeurs_acceptes', label: 'Fumeurs acceptés', emoji: '🚬', hasConditionals: false }
    ]

    const groupedEquipements = []

    equipements.forEach(equip => {
      // Vérifier si l'équipement est coché
      if (sectionData[equip.key] === true) {
        const details = {}
        const photos = []

        if (equip.hasConditionals) {
          // Récupérer tous les champs liés à cet équipement
          Object.entries(sectionData).forEach(([fieldKey, fieldValue]) => {
            if (fieldKey.startsWith(equip.key + '_') && !isEmpty(fieldValue)) {
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
        }

        // ⚡ CAS SPÉCIAL TV : Gérer les sous-services et Console
        if (equip.key === 'tv' && sectionData.tv_services && Array.isArray(sectionData.tv_services)) {
          // Stocker les services TV séparément
          details['tv_services'] = sectionData.tv_services

          // Détecter si Console est cochée dans les services
          if (sectionData.tv_services.includes('Console')) {
            // Récupérer les consoles disponibles
            if (sectionData.tv_consoles && Array.isArray(sectionData.tv_consoles) && sectionData.tv_consoles.length > 0) {
              details['tv_consoles'] = sectionData.tv_consoles
            }

            // Récupérer la vidéo console
            if (sectionData.tv_console_video && !isEmpty(sectionData.tv_console_video)) {
              const urls = parsePhotoValue(sectionData.tv_console_video)
              urls.forEach(url => photos.push({
                url: cleanUrl(url),
                label: 'Vidéo Console',
                fieldKey: 'tv_console_video',
                isValid: isImageUrl(cleanUrl(url))
              }))
            }
          }
        }

        // Ajouter l'équipement (même sans détails pour les équipements simples)
        groupedEquipements.push({
          ...equip,
          details,
          photos: photos.filter(p => p.isValid)
        })
      }
    })

    return groupedEquipements
  }

  // 📶 FONCTION SPÉCIALE : Rendu groupé pour WiFi
  const renderWifiGrouped = (sectionData) => {
    if (!sectionData.wifi_statut) return null

    const wifiData = {
      statut: sectionData.wifi_statut,
      details: {},
      photos: []
    }

    // Selon le statut, récupérer les champs pertinents
    if (sectionData.wifi_statut === 'oui') {
      if (sectionData.wifi_nom_reseau) wifiData.details.wifi_nom_reseau = sectionData.wifi_nom_reseau
      if (sectionData.wifi_mot_de_passe) wifiData.details.wifi_mot_de_passe = sectionData.wifi_mot_de_passe

      // Photos routeur
      if (sectionData.wifi_routeur_photo && !isEmpty(sectionData.wifi_routeur_photo)) {
        const urls = parsePhotoValue(sectionData.wifi_routeur_photo)
        urls.forEach(url => wifiData.photos.push({
          url: cleanUrl(url),
          label: 'Photo du routeur',
          isValid: isImageUrl(cleanUrl(url))
        }))
      }
    } else if (sectionData.wifi_statut === 'en_cours') {
      if (sectionData.wifi_details) wifiData.details.wifi_details = sectionData.wifi_details
    }

    return wifiData
  }

  // 🅿️ FONCTION SPÉCIALE : Rendu groupé pour Parking
  const renderParkingGrouped = (sectionData) => {
    if (!sectionData.parking_type) return null

    const parkingData = {
      type: sectionData.parking_type,
      details: {},
      photos: []
    }

    // Selon le type, récupérer les champs pertinents
    if (sectionData.parking_type === 'rue') {
      if (sectionData.parking_rue_details) parkingData.details.parking_rue_details = sectionData.parking_rue_details
    } else if (sectionData.parking_type === 'sur_place') {
      if (sectionData.parking_sur_place_types && Array.isArray(sectionData.parking_sur_place_types)) {
        parkingData.details.parking_sur_place_types = sectionData.parking_sur_place_types
      }
      if (sectionData.parking_sur_place_details) parkingData.details.parking_sur_place_details = sectionData.parking_sur_place_details
    } else if (sectionData.parking_type === 'payant') {
      if (sectionData.parking_payant_type) parkingData.details.parking_payant_type = sectionData.parking_payant_type
      if (sectionData.parking_payant_details) parkingData.details.parking_payant_details = sectionData.parking_payant_details
    }

    // Photos/vidéos parking (si équipement parking coché)
    if (sectionData.parking_equipement === true) {
      if (sectionData.parking_photos && !isEmpty(sectionData.parking_photos)) {
        const urls = parsePhotoValue(sectionData.parking_photos)
        urls.forEach(url => parkingData.photos.push({
          url: cleanUrl(url),
          label: 'Photo parking',
          isValid: isImageUrl(cleanUrl(url))
        }))
      }
      if (sectionData.parking_videos && !isEmpty(sectionData.parking_videos)) {
        const urls = parsePhotoValue(sectionData.parking_videos)
        urls.forEach(url => parkingData.photos.push({
          url: cleanUrl(url),
          label: 'Vidéo parking',
          isValid: isImageUrl(cleanUrl(url))
        }))
      }
    }

    return parkingData
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
        borderBottom: '2px solid #dbae61',
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
            alt="Logo Letahost"
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
          Fiche Logement • {formData.nom || 'Sans nom'}
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


          {/*Dossier photos*/}
          <div style={{
            padding: '8px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            pageBreakInside: 'avoid'
          }}>
            <div style={{ fontWeight: '600', color: '#4a5568', marginBottom: '4px' }}>
              Dossier photos
            </div>
            <div style={{ color: '#2563eb', fontFamily: 'monospace', fontSize: '9pt' }}>
              {generatePhotosFolder()}
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

                {/* 🧴 CAS SPÉCIAL : Consommables - Liste des consommables obligatoires et Cuisine1 regroupé*/}
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
                              <PhotosDisplay photos={equip.photos} sectionTitle={equip.label} />
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
                ) : section.key === 'section_equipements' ? (
                  (() => {
                    const equipementsData = renderEquipementsGrouped(formData.section_equipements || {})
                    const wifiData = renderWifiGrouped(formData.section_equipements || {})
                    const parkingData = renderParkingGrouped(formData.section_equipements || {})

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* PARTIE 1 : ÉQUIPEMENTS ET COMMODITÉS */}
                        {equipementsData.length > 0 && (
                          <div>
                            <h4 style={{
                              margin: '0 0 12px 0',
                              fontSize: '11pt',
                              fontWeight: '700',
                              color: '#1e40af',
                              borderBottom: '2px solid #dbeafe',
                              paddingBottom: '6px'
                            }}>
                              🏠 Équipements et commodités
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {equipementsData.map((equip, idx) => (
                                <div key={idx} style={{
                                  padding: '12px',
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  pageBreakInside: 'avoid'
                                }}>
                                  {/* Titre équipement */}
                                  <h5 style={{
                                    margin: '0 0 8px 0',
                                    fontSize: '10pt',
                                    fontWeight: '600',
                                    color: '#2d3748',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}>
                                    <span>{equip.emoji}</span>
                                    <span>{equip.label}</span>
                                  </h5>

                                  {/* Détails équipement */}
                                  {Object.keys(equip.details).length > 0 && (
                                    <div style={{ marginBottom: equip.photos.length > 0 ? '8px' : '0' }}>
                                      {Object.entries(equip.details).map(([key, value], detailIdx) => {
                                        // CAS SPÉCIAL : TV Services (array de checkboxes)
                                        if (key === 'tv_services' && Array.isArray(value)) {
                                          return (
                                            <div key={detailIdx} style={{ marginBottom: '8px' }}>
                                              <div style={{ fontWeight: '600', fontSize: '9pt', color: '#4a5568', marginBottom: '4px' }}>
                                                Services disponibles :
                                              </div>
                                              <div style={{ fontSize: '9pt', color: '#2d3748', paddingLeft: '12px' }}>
                                                {value.filter(s => s !== 'Console').join(', ')}
                                              </div>
                                            </div>
                                          )
                                        }

                                        // CAS SPÉCIAL : Console (sous-groupe dans TV)
                                        if (key === 'tv_consoles' && Array.isArray(value)) {
                                          return (
                                            <div key={detailIdx} style={{
                                              marginTop: '8px',
                                              marginLeft: '12px',
                                              paddingLeft: '12px',
                                              borderLeft: '3px solid #3b82f6',
                                              backgroundColor: '#eff6ff',
                                              padding: '8px',
                                              borderRadius: '4px'
                                            }}>
                                              <div style={{ fontWeight: '600', fontSize: '9pt', color: '#1e40af', marginBottom: '4px' }}>
                                                🎮 Consoles disponibles :
                                              </div>
                                              <div style={{ fontSize: '9pt', color: '#2d3748' }}>
                                                {value.join(', ')}
                                              </div>
                                            </div>
                                          )
                                        }

                                        // RENDU NORMAL pour autres champs
                                        return (
                                          <div key={detailIdx} style={{
                                            marginBottom: detailIdx < Object.entries(equip.details).length - 1 ? '6px' : '0',
                                            fontSize: '9pt',
                                            color: '#4a5568'
                                          }}>
                                            <span style={{ fontWeight: '600' }}>
                                              {formatFieldName(key.replace(equip.key + '_', ''))}:
                                            </span>{' '}
                                            <span style={{ color: '#2d3748' }}>{formatValue(value, key)}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}

                                  {/* Photos/vidéos équipement */}
                                  {equip.photos.length > 0 && (
                                    <PhotosDisplay photos={equip.photos} sectionTitle={equip.label} />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* PARTIE 2 : CONFIGURATION WIFI */}
                        {wifiData && (
                          <div>
                            <h4 style={{
                              margin: '0 0 12px 0',
                              fontSize: '11pt',
                              fontWeight: '700',
                              color: '#1e40af',
                              borderBottom: '2px solid #dbeafe',
                              paddingBottom: '6px'
                            }}>
                              📶 Configuration Wi-Fi
                            </h4>
                            <div style={{
                              padding: '12px',
                              backgroundColor: wifiData.statut === 'oui' ? '#f0fdf4' : wifiData.statut === 'en_cours' ? '#fef3c7' : '#fef2f2',
                              border: `1px solid ${wifiData.statut === 'oui' ? '#86efac' : wifiData.statut === 'en_cours' ? '#fcd34d' : '#fca5a5'}`,
                              borderRadius: '6px',
                              pageBreakInside: 'avoid'
                            }}>
                              <div style={{ marginBottom: '8px' }}>
                                <span style={{ fontWeight: '600', fontSize: '9pt', color: '#4a5568' }}>Statut : </span>
                                <span style={{ fontSize: '9pt', color: '#2d3748', fontWeight: '600' }}>
                                  {wifiData.statut === 'oui' ? '✅ WiFi disponible et fonctionnel' :
                                    wifiData.statut === 'en_cours' ? '⏳ En cours d\'installation' :
                                      '❌ Pas de WiFi disponible'}
                                </span>
                              </div>

                              {Object.keys(wifiData.details).length > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                  {Object.entries(wifiData.details).map(([key, value], idx) => (
                                    <div key={idx} style={{ marginBottom: '6px', fontSize: '9pt', color: '#4a5568' }}>
                                      <span style={{ fontWeight: '600' }}>{formatFieldName(key.replace('wifi_', ''))}:</span>{' '}
                                      <span style={{ color: '#2d3748' }}>{value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {wifiData.photos.length > 0 && (
                                <div style={{ marginTop: '8px' }}>
                                  <PhotosDisplay photos={wifiData.photos} sectionTitle="WiFi" />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* PARTIE 3 : PARKING */}
                        {parkingData && (
                          <div>
                            <h4 style={{
                              margin: '0 0 12px 0',
                              fontSize: '11pt',
                              fontWeight: '700',
                              color: '#1e40af',
                              borderBottom: '2px solid #dbeafe',
                              paddingBottom: '6px'
                            }}>
                              🅿️ Parking
                            </h4>
                            <div style={{
                              padding: '12px',
                              backgroundColor: '#fefce8',
                              border: '1px solid #fde047',
                              borderRadius: '6px',
                              pageBreakInside: 'avoid'
                            }}>
                              <div style={{ marginBottom: '8px' }}>
                                <span style={{ fontWeight: '600', fontSize: '9pt', color: '#4a5568' }}>Type : </span>
                                <span style={{ fontSize: '9pt', color: '#2d3748', fontWeight: '600' }}>
                                  {parkingData.type === 'rue' ? 'Parking gratuit dans la rue' :
                                    parkingData.type === 'sur_place' ? 'Parking gratuit sur place' :
                                      'Stationnement payant à l\'extérieur'}
                                </span>
                              </div>

                              {Object.keys(parkingData.details).length > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                  {Object.entries(parkingData.details).map(([key, value], idx) => {
                                    // CAS SPÉCIAL : Types parking sur place (array)
                                    if (key === 'parking_sur_place_types' && Array.isArray(value)) {
                                      return (
                                        <div key={idx} style={{ marginBottom: '6px', fontSize: '9pt', color: '#4a5568' }}>
                                          <span style={{ fontWeight: '600' }}>Types disponibles :</span>{' '}
                                          <span style={{ color: '#2d3748' }}>{value.join(', ')}</span>
                                        </div>
                                      )
                                    }

                                    return (
                                      <div key={idx} style={{ marginBottom: '6px', fontSize: '9pt', color: '#4a5568' }}>
                                        <span style={{ fontWeight: '600' }}>{formatFieldName(key.replace('parking_', ''))}:</span>{' '}
                                        <span style={{ color: '#2d3748' }}>{value}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {parkingData.photos.length > 0 && (
                                <div style={{ marginTop: '8px' }}>
                                  <PhotosDisplay photos={parkingData.photos} sectionTitle="Parking" />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Message si aucune donnée */}
                        {equipementsData.length === 0 && !wifiData && !parkingData && (
                          <div style={{ fontSize: '9pt', color: '#6b7280', fontStyle: 'italic' }}>
                            Aucun équipement configuré
                          </div>
                        )}
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