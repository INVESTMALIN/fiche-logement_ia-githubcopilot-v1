// src/lib/DataProcessor.js

/**
 * Nettoie et normalise les données brutes du formulaire
 * Supprime les valeurs null/undefined/vides et normalise les formats
 */
export const cleanFormData = (formData) => {
  if (!formData || typeof formData !== 'object') {
    return {}
  }

  const cleaned = {}

  const cleanValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return undefined
    }
    
    if (Array.isArray(value)) {
      const cleanedArray = value.filter(item => item !== null && item !== undefined && item !== '')
      return cleanedArray.length > 0 ? cleanedArray : undefined
    }
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      const cleanedObj = cleanObject(value)
      return Object.keys(cleanedObj).length > 0 ? cleanedObj : undefined
    }
    
    return value
  }

  const cleanObject = (obj) => {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanValue(value)
      if (cleanedValue !== undefined) {
        result[key] = cleanedValue
      }
    }
    return result
  }

  for (const [key, value] of Object.entries(formData)) {
    const cleanedValue = cleanValue(value)
    if (cleanedValue !== undefined) {
      cleaned[key] = cleanedValue
    }
  }

  return cleaned
}

/**
 * Extrait un résumé des informations clés transversales
 */
export const extractSummary = (formData) => {
  const logement = formData.section_logement || {}
  const avis = formData.section_avis || {}
  const proprietaire = formData.section_proprietaire || {}
  const equipements = formData.section_equipements || {}
  const securite = formData.section_securite || {}

  const atouts = Object.entries(avis.atouts_logement || {})
    .filter(([_, isSelected]) => isSelected)
    .map(([atout, _]) => formatAtoutName(atout))

  const equipementsPrincipaux = [
    ...(equipements.wifi_statut === 'oui' ? ['WiFi'] : []),
    ...(equipements.parking_type ? [`Parking ${equipements.parking_type}`] : []),
    ...(equipements.piscine ? ['Piscine'] : []),
    ...(equipements.jacuzzi ? ['Jacuzzi'] : [])
  ]

  const equipementsSecurite = (securite.equipements || []).slice(0, 3)

  return {
    nom: formData.nom || 'Fiche sans nom',
    statut: formData.statut || 'Brouillon',
    
    proprietaire: {
      nom_complet: `${proprietaire.prenom || ''} ${proprietaire.nom || ''}`.trim(),
      email: proprietaire.email
    },
    
    logement: {
      type: logement.type_propriete,
      surface: logement.surface ? `${logement.surface}m²` : null,
      typologie: logement.typologie,
      capacite: logement.nombre_personnes_max ? `${logement.nombre_personnes_max} personnes` : null,
      nombre_lits: logement.nombre_lits
    },
    
    atouts_principaux: atouts.slice(0, 5),
    equipements_cles: equipementsPrincipaux,
    securite_equipements: equipementsSecurite,
    
    stats: {
      sections_remplies: countFilledSections(formData),
      total_sections: 23,
      pourcentage_completion: Math.round((countFilledSections(formData) / 23) * 100)
    }
  }
}

const countFilledSections = (formData) => {
  const sections = [
    'section_proprietaire', 'section_logement', 'section_avis', 'section_clefs',
    'section_airbnb', 'section_booking', 'section_reglementation', 'section_exigences',
    'section_gestion_linge', 'section_equipements', 'section_consommables', 'section_visite',
    'section_chambres', 'section_salle_de_bains', 'section_cuisine_1', 'section_cuisine_2',
    'section_salon_sam', 'section_equip_spe_exterieur', 'section_communs', 'section_teletravail',
    'section_bebe', 'section_guide_acces', 'section_securite'
  ]
  
  return sections.filter(section => {
    const sectionData = formData[section]
    return sectionData && typeof sectionData === 'object' && Object.keys(sectionData).length > 0
  }).length
}

const formatAtoutName = (atout) => {
  const mapping = {
    'lumineux': 'Très lumineux',
    'proche_transports': 'Proche transports',
    'piscine': 'Piscine',
    'jacuzzi': 'Jacuzzi',
    'parking_prive': 'Parking privé',
    'cheminee': 'Cheminée',
    'vue_panoramique': 'Vue panoramique',
    'terrasse_balcon': 'Terrasse/Balcon',
    'jardin': 'Jardin',
    'design_moderne': 'Design moderne',
    'authentique': 'Authentique',
    'charmant': 'Charmant',
    'spacieux': 'Spacieux',
    'central': 'Central',
    'tranquille': 'Tranquille'
  }
  
  return mapping[atout] || atout.replace(/_/g, ' ')
}

/**
 * Valide la cohérence des données
 */
export const validateDataConsistency = (formData) => {
  const issues = []
  const logement = formData.section_logement || {}
  
  if (logement.nombre_personnes_max && logement.nombre_lits) {
    const personnes = parseInt(logement.nombre_personnes_max)
    const lits = parseInt(logement.nombre_lits)
    if (personnes > lits * 2) {
      issues.push(`Capacité (${personnes}) élevée par rapport au nombre de lits (${lits})`)
    }
  }
  
  if (logement.surface) {
    const surface = parseInt(logement.surface)
    if (surface < 20 && logement.nombre_personnes_max > 2) {
      issues.push(`Surface petite (${surface}m²) pour ${logement.nombre_personnes_max} personnes`)
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Génère un hash simple pour détecter les changements
 */
export const generateDataHash = (formData) => {
  const cleanedData = cleanFormData(formData)
  const dataString = JSON.stringify(cleanedData, Object.keys(cleanedData).sort())
  
  let hash = 0
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return hash.toString(36)
}