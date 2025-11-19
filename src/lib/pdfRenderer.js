// src/lib/pdfRenderer.js
// Moteur de rendu PDF avec jsPDF - Travaille avec PdfFormatter
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

// PALETTE LETAHOST
export const COLORS = {
  primary: '#dbae61',      // Doré Letahost
  primaryDark: '#c19b4f',  // Doré foncé
  dark: '#1a202c',         // Texte principal
  gray: '#4a5568',         // Texte secondaire
  lightGray: '#e2e8f0',    // Bordures
  blue: '#2563eb',         // Liens/accents
  background: '#f8fafc'    // Fond léger
}

// CONSTANTES LAYOUT
export const LAYOUT = {
  marginLeft: 15,
  marginRight: 15,
  marginTop: 20,
  marginBottom: 20,
  pageWidth: 210,  // A4 width en mm
  pageHeight: 297, // A4 height en mm
  contentWidth: 180, // pageWidth - margins
  lineHeight: 5,
  sectionSpacing: 8,
  fieldSpacing: 4
}

// HELPER : Formater nom de champ (kebab-case → Title Case)
export const formatFieldName = (fieldName) => {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim()
}

// HELPER : Vérifier si besoin de page break
export const checkPageBreak = (doc, yPos, spaceNeeded = 20) => {
  const maxY = LAYOUT.pageHeight - LAYOUT.marginBottom
  
  if (yPos + spaceNeeded > maxY) {
    doc.addPage()
    return LAYOUT.marginTop
  }
  
  return yPos
}

// HELPER : Wrapper texte multiligne
export const wrapText = (doc, text, maxWidth) => {
  if (!text || text === '') return []
  
  const lines = doc.splitTextToSize(String(text), maxWidth)
  return lines
}

// HELPER : Formater valeur (booléens, arrays, objects)
export const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return null
  
  // Booléens
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non'
  }
  
  // Strings boolean-like
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return 'Oui'
    if (value.toLowerCase() === 'false') return 'Non'
  }
  
  // Arrays
  if (Array.isArray(value)) {
    const nonEmpty = value.filter(v => v !== null && v !== undefined && v !== '')
    if (nonEmpty.length === 0) return null
    return nonEmpty.join(', ')
  }
  
  // Objects
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([k, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${formatFieldName(k)}: ${formatValue(v)}`)
      .filter(Boolean)
    
    return entries.length > 0 ? entries.join(' | ') : null
  }
  
  return String(value)
}

// RENDER : Header du PDF (utilise metadata de PdfFormatter)
export const renderHeader = (doc, metadata, pdfData, mode = 'logement') => {
  let yPos = LAYOUT.marginTop
  
  // Titre principal
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.primaryDark)
  
  const title = mode === 'logement' ? 'Fiche Logement' : 'Fiche Menage'
  doc.text(title, LAYOUT.marginLeft, yPos, { maxWidth: LAYOUT.contentWidth })
  yPos += 8
  
  // Sous-titre Letahost
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.gray)
  doc.text('Letahost - Conciergerie de luxe', LAYOUT.marginLeft, yPos)
  yPos += 6
  
  // Ligne de séparation
  doc.setDrawColor(193, 155, 79) // RGB de COLORS.primary
  doc.setLineWidth(0.5)
  doc.line(LAYOUT.marginLeft, yPos, LAYOUT.pageWidth - LAYOUT.marginRight, yPos)
  yPos += 8
  
  // INFO LOGEMENT (ligne principale)
  const logement = pdfData.sections.section_logement?.donnees || {}
  const numeroBien = logement.numero_bien || 'N/A'
  const typeLogement = logement.type_propriete || 'Non specifie'
  const surface = logement.surface ? `${logement.surface}m2` : null
  const capacite = logement.nombre_personnes_max ? `${logement.nombre_personnes_max} pers.` : null
  const chambres = logement.typologie || null
  
  // Construire la ligne d'info
  const infosParts = [typeLogement, surface, capacite, chambres].filter(Boolean)
  const infosLine = infosParts.join(' - ')
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.dark)
  doc.text(`Bien #${numeroBien}`, LAYOUT.marginLeft, yPos)
  yPos += 5
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.gray)
  doc.text(infosLine, LAYOUT.marginLeft, yPos, { maxWidth: LAYOUT.contentWidth })
  yPos += 8
  
  // Info box (2 colonnes) - Date et Statut
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gray)
  
  // Colonne 1 : Date génération
  doc.text('Genere le', LAYOUT.marginLeft, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.dark)
  const dateStr = new Date(metadata.date_generation).toLocaleDateString('fr-FR') + ' a ' + 
                  new Date(metadata.date_generation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  doc.text(dateStr, LAYOUT.marginLeft, yPos + 4)
  
  // Colonne 2 : Statut
  const col2X = LAYOUT.marginLeft + 90
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gray)
  doc.text('Statut', col2X, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.dark)
  doc.text(metadata.statut_fiche || 'Brouillon', col2X, yPos + 4)
  
  yPos += 10
  
  return yPos
}

// RENDER : Titre de section
export const renderSectionTitle = (doc, title, yPos) => {
  // Check page break
  yPos = checkPageBreak(doc, yPos, 15)
  
  // Ligne accent gauche
  doc.setFillColor(219, 174, 97) // RGB de COLORS.primary
  doc.rect(LAYOUT.marginLeft, yPos - 3, 3, 8, 'F')
  
  // Titre (sans emoji)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.dark)
  doc.text(title, LAYOUT.marginLeft + 6, yPos + 2, { maxWidth: LAYOUT.contentWidth - 6 })
  
  yPos += 10
  
  return yPos
}

// RENDER : Champ clé-valeur
export const renderField = (doc, label, value, yPos, indent = 0) => {
  const formatted = formatValue(value)
  if (formatted === null) return yPos
  
  // Check page break
  yPos = checkPageBreak(doc, yPos, 10)
  
  const xPos = LAYOUT.marginLeft + indent
  const maxWidth = LAYOUT.contentWidth - indent
  
  // Label (uppercase, gray, bold)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gray)
  doc.text(label.toUpperCase(), xPos, yPos, { maxWidth })
  yPos += 4
  
  // Valeur (normal, dark, multiligne avec wrap automatique)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.dark)
  
  const lines = wrapText(doc, formatted, maxWidth)
  lines.forEach(line => {
    yPos = checkPageBreak(doc, yPos, 5)
    doc.text(line, xPos, yPos, { maxWidth })
    yPos += LAYOUT.lineHeight
  })
  
  yPos += LAYOUT.fieldSpacing
  
  return yPos
}

// RENDER : Liens photos cliquables (rapide, pas de téléchargement d'images)
export const renderPhotoLinks = (doc, images, yPos, label = 'PHOTOS') => {
  if (!images || !Array.isArray(images) || images.length === 0) return yPos
  
  // Filtre pour ne garder que les URLs valides
  const validImages = images.filter(img => 
    img && typeof img === 'string' && img.startsWith('http')
  )
  
  if (validImages.length === 0) return yPos
  
  // Check page break
  yPos = checkPageBreak(doc, yPos, 10)
  
  const xPos = LAYOUT.marginLeft
  const maxWidth = LAYOUT.contentWidth
  
  // Label avec nombre de photos
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gray)
  doc.text(`${label.toUpperCase()} (${validImages.length})`, xPos, yPos)
  yPos += 4
  
  // Créer les liens cliquables "Photo 1, Photo 2, Photo 3..."
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.blue)
  
  let currentX = xPos
  
  validImages.forEach((imageUrl, index) => {
    const linkText = `Photo ${index + 1}`
    const textWidth = doc.getTextWidth(linkText)
    const separator = index < validImages.length - 1 ? ', ' : ''
    const separatorWidth = doc.getTextWidth(separator)
    
    // Check si on doit passer à la ligne
    if (currentX + textWidth + separatorWidth > xPos + maxWidth) {
      yPos += LAYOUT.lineHeight
      yPos = checkPageBreak(doc, yPos, 5)
      currentX = xPos
    }
    
    // Afficher le lien
    doc.textWithLink(linkText, currentX, yPos, { url: imageUrl })
    currentX += textWidth
    
    // Afficher le séparateur (pas cliquable)
    if (separator) {
      doc.setTextColor(COLORS.dark)
      doc.text(separator, currentX, yPos)
      doc.setTextColor(COLORS.blue)
      currentX += separatorWidth
    }
  })
  
  yPos += LAYOUT.fieldSpacing + 2
  
  return yPos
}

// RENDER : Section Équipements (regroupement intelligent)
export const renderEquipementsSection = (doc, sectionData, yPos) => {
  if (!sectionData || !sectionData.donnees) return yPos
  
  const donnees = sectionData.donnees
  
  // Titre section
  yPos = renderSectionTitle(doc, 'Équipements', yPos)
  
  // Définition des groupes d'équipements avec leurs champs conditionnels
  const equipementGroups = [
    {
      name: 'TV',
      checkField: 'tv',
      relatedFields: ['tv_type', 'tv_taille', 'tv_type_autre_details', 'tv_video', 'tv_services', 'tv_consoles', 'tv_console_video']
    },
    {
      name: 'Climatisation',
      checkField: 'climatisation',
      relatedFields: ['climatisation_type', 'climatisation_instructions', 'climatisation_video']
    },
    {
      name: 'Chauffage',
      checkField: 'chauffage',
      relatedFields: ['chauffage_type', 'chauffage_instructions', 'chauffage_video']
    },
    {
      name: 'Lave-linge',
      checkField: 'lave_linge',
      relatedFields: ['lave_linge_prix', 'lave_linge_emplacement', 'lave_linge_instructions', 'lave_linge_video']
    },
    {
      name: 'Sèche-linge',
      checkField: 'seche_linge',
      relatedFields: ['seche_linge_prix', 'seche_linge_emplacement', 'seche_linge_instructions', 'seche_linge_video']
    },
    {
      name: 'Parking',
      checkField: 'parking_equipement',
      relatedFields: ['parking_type', 'parking_rue_details', 'parking_sur_place_types', 'parking_sur_place_details', 'parking_payant_type', 'parking_payant_details', 'parking_photo', 'parking_video']
    },
    {
      name: 'Piano',
      checkField: 'piano',
      relatedFields: ['piano_marque', 'piano_type']
    },
    {
      name: 'Accessible PMR',
      checkField: 'accessible_mobilite_reduite',
      relatedFields: ['pmr_details']
    }
  ]
  
  // Équipements simples (juste une checkbox, pas de champs conditionnels)
  const simpleEquipements = [
    'wifi_statut',
    'ascenseur',
    'fetes_autorisees',
    'fer_repasser',
    'etendoir',
    'cinema',
    'compacteur_dechets',
    'fumeurs_acceptes',
    'tourne_disque',
    'coffre_fort'
  ]
  
  // 1. Afficher les équipements regroupés
  equipementGroups.forEach(group => {
    const isChecked = donnees[group.checkField]
    
    if (isChecked === true || isChecked === 'true' || isChecked === 'oui') {
      // Afficher le nom de l'équipement
      yPos = checkPageBreak(doc, yPos, 15)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(COLORS.primary)
      doc.text(`• ${group.name}`, LAYOUT.marginLeft, yPos)
      yPos += 6
      
      // Afficher les champs conditionnels associés
      group.relatedFields.forEach(fieldKey => {
        const value = donnees[fieldKey]
        const formatted = formatValue(value)
        
        if (formatted !== null) {
          // Si c'est un champ photo/vidéo
          if (fieldKey.toLowerCase().includes('photo') || fieldKey.toLowerCase().includes('video')) {
            if (Array.isArray(value) && value.length > 0) {
              yPos = renderPhotoLinks(doc, value, yPos, formatFieldName(fieldKey))
            }
          } else {
            // Champ texte normal avec indentation
            yPos = renderField(doc, formatFieldName(fieldKey), value, yPos, 4)
          }
        }
      })
      
      yPos += 3 // Espacement entre équipements
    }
  })
  
  // 2. Afficher les équipements simples (sans regroupement)
  const simpleEquipementsData = simpleEquipements
    .map(fieldKey => ({
      key: fieldKey,
      value: donnees[fieldKey],
      label: formatFieldName(fieldKey)
    }))
    .filter(item => {
      const formatted = formatValue(item.value)
      return formatted !== null && formatted !== 'Non'
    })
  
  if (simpleEquipementsData.length > 0) {
    yPos = checkPageBreak(doc, yPos, 15)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.primary)
    doc.text('• Autres équipements', LAYOUT.marginLeft, yPos)
    yPos += 6
    
    simpleEquipementsData.forEach(item => {
      yPos = renderField(doc, item.label, item.value, yPos, 4)
    })
  }
  
  // 3. Afficher les champs techniques (WiFi, parking général, poubelles, etc.)
  const technicalFields = [
    'wifi_statut', 'wifi_details', 'wifi_nom_reseau', 'wifi_mot_de_passe', 'wifi_routeur_photo',
    'video_acces_poubelle', 'poubelle_emplacement', 'poubelle_ramassage', 'poubelle_photos',
    'disjoncteur_emplacement', 'disjoncteur_photos',
    'vanne_eau_emplacement', 'vanne_arret_photos',
    'systeme_chauffage_eau', 'chauffage_eau_emplacement', 'chauffage_eau_photos', 'video_systeme_chauffage'
  ]
  
  const technicalData = technicalFields
    .map(fieldKey => ({
      key: fieldKey,
      value: donnees[fieldKey],
      label: formatFieldName(fieldKey)
    }))
    .filter(item => formatValue(item.value) !== null)
  
  if (technicalData.length > 0) {
    yPos = checkPageBreak(doc, yPos, 15)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.primary)
    doc.text('• Informations techniques', LAYOUT.marginLeft, yPos)
    yPos += 6
    
    technicalData.forEach(item => {
      if (item.key.toLowerCase().includes('photo') || item.key.toLowerCase().includes('video')) {
        if (Array.isArray(item.value) && item.value.length > 0) {
          yPos = renderPhotoLinks(doc, item.value, yPos, item.label)
        }
      } else {
        yPos = renderField(doc, item.label, item.value, yPos, 4)
      }
    })
  }
  
  yPos += LAYOUT.sectionSpacing
  
  return yPos
}

// RENDER : Section complète (utilise sections.donnees de PdfFormatter)
export const renderSection = (doc, title, sectionData, yPos) => {
  // Si la section est vide, skip
  if (!sectionData || !sectionData.donnees || Object.keys(sectionData.donnees).length === 0) {
    return yPos
  }
  
  const donnees = sectionData.donnees
  
  // Titre section
  yPos = renderSectionTitle(doc, title, yPos)
  
  // Render tous les champs
  Object.entries(donnees).forEach(([key, value]) => {
    // Détecter si c'est un champ photo ou video
    const isPhotoField = key.toLowerCase().includes('photo')
    const isVideoField = key.toLowerCase().includes('video')
    
    if (isPhotoField && Array.isArray(value) && value.length > 0) {
      // Afficher les photos en liens cliquables
      const label = formatFieldName(key)
      yPos = renderPhotoLinks(doc, value, yPos, label)
    } else if (isVideoField && Array.isArray(value) && value.length > 0) {
      // Afficher les vidéos en liens cliquables aussi
      const label = formatFieldName(key)
      yPos = renderPhotoLinks(doc, value, yPos, label)
    } else {
      // Afficher en champ texte normal
      yPos = renderField(doc, formatFieldName(key), value, yPos, 0)
    }
  })
  
  // Espacement après la section
  yPos += LAYOUT.sectionSpacing
  
  return yPos
}

export default {
  renderHeader,
  renderSectionTitle,
  renderField,
  renderPhotoLinks,
  renderSection,
  renderEquipementsSection,
  formatFieldName,
  formatValue,
  checkPageBreak,
  wrapText,
  COLORS,
  LAYOUT
}