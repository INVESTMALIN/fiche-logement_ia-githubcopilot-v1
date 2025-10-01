// src/lib/PdfFormatter.js
import { cleanFormData, extractSummary, validateDataConsistency } from './DataProcessor'

/**
 * Formate les données de fiche pour génération PDF
 * RESPECTE EXACTEMENT les 23 sections du formulaire
 */
export const formatForPdf = (formData) => {
  const cleanedData = cleanFormData(formData)
  const summary = extractSummary(formData)
  const validation = validateDataConsistency(formData)
  
  return {
    metadata: {
      titre_document: generatePdfTitle(formData),
      date_generation: new Date().toISOString(),
      statut_fiche: cleanedData.statut || 'Brouillon',
      completion_pourcentage: summary.stats.pourcentage_completion,
      sections_completees: summary.stats.sections_remplies,
      total_sections: summary.stats.total_sections,
      hash_donnees: generateDataHash(cleanedData),
      version_formatter: '1.0'
    },

    sections: {
      section_proprietaire: enrichSection(cleanedData.section_proprietaire, 'proprietaire'),
      section_logement: enrichSection(cleanedData.section_logement, 'logement'),
      section_avis: enrichSection(cleanedData.section_avis, 'avis'),
      section_clefs: enrichSection(cleanedData.section_clefs, 'clefs'),
      section_airbnb: enrichSection(cleanedData.section_airbnb, 'airbnb'),
      section_booking: enrichSection(cleanedData.section_booking, 'booking'),
      section_reglementation: enrichSection(cleanedData.section_reglementation, 'reglementation'),
      section_exigences: enrichSection(cleanedData.section_exigences, 'exigences'),
      section_gestion_linge: enrichSection(cleanedData.section_gestion_linge, 'linge'),
      section_equipements: enrichSection(cleanedData.section_equipements, 'equipements'),
      section_consommables: enrichSection(cleanedData.section_consommables, 'consommables'),
      section_visite: enrichSection(cleanedData.section_visite, 'visite'),
      section_chambres: enrichSection(cleanedData.section_chambres, 'chambres'),
      section_salle_de_bains: enrichSection(cleanedData.section_salle_de_bains, 'sdb'),
      section_cuisine_1: enrichSection(cleanedData.section_cuisine_1, 'cuisine1'),
      section_cuisine_2: enrichSection(cleanedData.section_cuisine_2, 'cuisine2'),
      section_salon_sam: enrichSection(cleanedData.section_salon_sam, 'salon'),
      section_equip_spe_exterieur: enrichSection(cleanedData.section_equip_spe_exterieur, 'exterieur'),
      section_communs: enrichSection(cleanedData.section_communs, 'communs'),
      section_teletravail: enrichSection(cleanedData.section_teletravail, 'teletravail'),
      section_bebe: enrichSection(cleanedData.section_bebe, 'bebe'),
      section_guide_acces: enrichSection(cleanedData.section_guide_acces, 'guide'),
      section_securite: enrichSection(cleanedData.section_securite, 'securite')
    },

    analytics: {
      resume_logement: generateResumeLogement(cleanedData),
      points_forts: extractPointsForts(cleanedData),
      alertes_validation: validation.issues,
      recommandations: generateRecommandations(cleanedData),
      statistiques: summary.stats
    }
  }
}

const enrichSection = (sectionData, sectionType) => {
  if (!sectionData || typeof sectionData !== 'object') {
    return {
      donnees: {},
      meta_section: {
        vide: true,
        type: sectionType,
        derniere_modification: null
      }
    }
  }

  return {
    donnees: { ...sectionData },
    meta_section: {
      vide: Object.keys(sectionData).length === 0,
      type: sectionType,
      nombre_champs_remplis: countFilledFields(sectionData),
      derniere_modification: sectionData.updated_at || null,
      taille_donnees: JSON.stringify(sectionData).length
    }
  }
}

const countFilledFields = (sectionData) => {
  if (!sectionData || typeof sectionData !== 'object') return 0
  
  return Object.values(sectionData).filter(value => {
    if (value === null || value === undefined || value === '') return false
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    return true
  }).length
}

const generateResumeLogement = (cleanedData) => {
  const logement = cleanedData.section_logement || {}
  const avis = cleanedData.section_avis || {}
  const proprietaire = cleanedData.section_proprietaire || {}
  
  return {
    titre_principal: cleanedData.nom || 'Logement sans nom',
    proprietaire: `${proprietaire.prenom || ''} ${proprietaire.nom || ''}`.trim() || 'Non renseigné',
    localisation: formatAdresse(proprietaire.adresse),
    caracteristiques_cles: {
      type: logement.type_propriete,
      surface: logement.surface ? `${logement.surface} m²` : null,
      capacite: logement.nombre_personnes_max,
      nombre_lits: logement.nombre_lits
    }
  }
}

const extractPointsForts = (cleanedData) => {
  const avis = cleanedData.section_avis || {}
  const airbnb = cleanedData.section_airbnb || {}
  const booking = cleanedData.section_booking || {}
  
  const atouts = Object.entries(avis.atouts_logement || {})
    .filter(([_, isSelected]) => isSelected)
    .map(([atout, _]) => atout)
  
  return {
    atouts_declares: atouts,
    plateformes_actives: [
      airbnb.annonce_active ? 'Airbnb' : null,
      booking.annonce_active ? 'Booking' : null
    ].filter(Boolean)
  }
}

const generateRecommandations = (cleanedData) => {
  const recommendations = []
  const logement = cleanedData.section_logement || {}
  const avis = cleanedData.section_avis || {}
  const equipements = cleanedData.section_equipements || {}
  
  if (!avis.atouts_logement || Object.values(avis.atouts_logement).filter(Boolean).length < 3) {
    recommendations.push({
      type: 'marketing',
      priorite: 'moyenne',
      message: 'Ajouter plus d\'atouts pour améliorer l\'attractivité'
    })
  }
  
  if (equipements.wifi_statut !== 'oui') {
    recommendations.push({
      type: 'equipement',
      priorite: 'haute',
      message: 'Le WiFi est essentiel pour la plupart des voyageurs'
    })
  }
  
  return recommendations
}

const formatAdresse = (adresse) => {
  if (!adresse) return 'Non renseignée'
  if (typeof adresse === 'string') return adresse
  
  const parts = []
  if (adresse.rue) parts.push(adresse.rue)
  if (adresse.codePostal && adresse.ville) {
    parts.push(`${adresse.codePostal} ${adresse.ville}`)
  }
  
  return parts.join(', ') || 'Adresse incomplète'
}

const generateDataHash = (cleanedData) => {
  const dataString = JSON.stringify(cleanedData, Object.keys(cleanedData).sort())
  let hash = 0
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

export const generatePdfTitle = (formData) => {
  const proprietaire = formData.section_proprietaire || {}
  const logement = formData.section_logement || {}
  
  const nomLogement = (formData.nom || 'Logement').replace(/[^a-zA-Z0-9\s]/g, '')
  const nomProprietaire = `${proprietaire.prenom || ''} ${proprietaire.nom || ''}`.trim().replace(/[^a-zA-Z0-9\s]/g, '')
  const timestamp = new Date().toISOString().split('T')[0]
  
  return `Fiche_${nomLogement.replace(/\s+/g, '_')}_${nomProprietaire.replace(/\s+/g, '_')}_${timestamp}`
}

/**
 * Prépare les données pour l'envoi au webhook n8n
 */
export const prepareForN8nWebhook = (formData) => {
  const pdfData = formatForPdf(formData)
  
  return {
    type: 'generate_pdf',
    timestamp: new Date().toISOString(),
    metadata: pdfData.metadata,
    fiche_data: pdfData.sections,
    analytics: pdfData.analytics,
    pdf_config: {
      format: 'A4',
      orientation: 'portrait',
      langue: 'fr',
      template_version: '1.0'
    }
  }
}