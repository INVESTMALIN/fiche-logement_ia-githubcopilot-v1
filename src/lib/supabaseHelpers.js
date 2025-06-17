// src/lib/supabaseHelpers.js
import { supabase } from '../lib/supabaseClient'

// 🔄 Mapping FormContext → Colonnes Supabase
export const mapFormDataToSupabase = (formData) => {
  return {
    nom: formData.nom || 'Nouvelle fiche',
    statut: formData.statut || 'Brouillon',
    
    // Section Propriétaire
    proprietaire_prenom: formData.section_proprietaire?.prenom || null,
    proprietaire_nom: formData.section_proprietaire?.nom || null,
    proprietaire_email: formData.section_proprietaire?.email || null,
    proprietaire_adresse_rue: formData.section_proprietaire?.adresse?.rue || null,
    proprietaire_adresse_complement: formData.section_proprietaire?.adresse?.complement || null,
    proprietaire_adresse_ville: formData.section_proprietaire?.adresse?.ville || null,
    proprietaire_adresse_code_postal: formData.section_proprietaire?.adresse?.codePostal || null,
    
    // Section Logement
    logement_type: formData.section_logement?.type || null,
    logement_surface: formData.section_logement?.caracteristiques?.surface ? parseInt(formData.section_logement.caracteristiques.surface) : null,
    logement_nombre_pieces: formData.section_logement?.caracteristiques?.nombrePieces ? parseInt(formData.section_logement.caracteristiques.nombrePieces) : null,
    logement_nombre_chambres: formData.section_logement?.caracteristiques?.nombreChambres ? parseInt(formData.section_logement.caracteristiques.nombreChambres) : null,
    logement_adresse_rue: formData.section_logement?.adresse?.rue || null,
    logement_adresse_ville: formData.section_logement?.adresse?.ville || null,
    logement_adresse_code_postal: formData.section_logement?.adresse?.codePostal || null,
    logement_etage: formData.section_logement?.adresse?.etage || null,
    logement_acces: formData.section_logement?.acces || null,
    
    // Section Airbnb
    airbnb_annonce_active: formData.section_airbnb?.annonce_active,
    airbnb_url: formData.section_airbnb?.url_annonce || null,
    airbnb_identifiants_obtenus: formData.section_airbnb?.identifiants_obtenus,
    airbnb_email: formData.section_airbnb?.email_compte || null,
    airbnb_mot_passe: formData.section_airbnb?.mot_passe || null,
    airbnb_explication_refus: formData.section_airbnb?.explication_refus || null,
    
    // Section Booking
    booking_annonce_active: formData.section_booking?.annonce_active,
    booking_url: formData.section_booking?.url_annonce || null,
    booking_identifiants_obtenus: formData.section_booking?.identifiants_obtenus,
    booking_email: formData.section_booking?.email_compte || null,
    booking_mot_passe: formData.section_booking?.mot_passe || null,
    booking_explication_refus: formData.section_booking?.explication_refus || null,
    
    updated_at: new Date().toISOString()
  }
}

// 🔄 Mapping Colonnes Supabase → FormContext
export const mapSupabaseToFormData = (supabaseData) => {
  return {
    id: supabaseData.id,
    user_id: supabaseData.user_id,
    nom: supabaseData.nom,
    statut: supabaseData.statut,
    created_at: supabaseData.created_at,
    updated_at: supabaseData.updated_at,
    
    section_proprietaire: {
      prenom: supabaseData.proprietaire_prenom || "",
      nom: supabaseData.proprietaire_nom || "",
      email: supabaseData.proprietaire_email || "",
      adresse: {
        rue: supabaseData.proprietaire_adresse_rue || "",
        complement: supabaseData.proprietaire_adresse_complement || "",
        ville: supabaseData.proprietaire_adresse_ville || "",
        codePostal: supabaseData.proprietaire_adresse_code_postal || ""
      }
    },
    
    section_logement: {
      type: supabaseData.logement_type || "",
      adresse: {
        rue: supabaseData.logement_adresse_rue || "",
        complement: "", // Non mappé dans supabaseData
        ville: supabaseData.logement_adresse_ville || "",
        codePostal: supabaseData.logement_adresse_code_postal || "",
        batiment: "", // Non mappé dans supabaseData
        etage: supabaseData.logement_etage || "",
        numeroPorte: "" // Non mappé dans supabaseData
      },
      caracteristiques: {
        nombrePieces: supabaseData.logement_nombre_pieces?.toString() || "",
        nombreChambres: supabaseData.logement_nombre_chambres?.toString() || "",
        surface: supabaseData.logement_surface?.toString() || ""
      },
      acces: supabaseData.logement_acces || ""
    },
    
    section_clefs: {
      interphone: supabaseData.interphone ?? null, // Utilise ?? pour les booléens
      interphoneDetails: supabaseData.interphoneDetails || "",
      interphonePhoto: supabaseData.interphonePhoto || null,
      tempoGache: supabaseData.tempoGache ?? null,
      tempoGacheDetails: supabaseData.tempoGacheDetails || "",
      tempoGachePhoto: supabaseData.tempoGachePhoto || null,
      digicode: supabaseData.digicode ?? null,
      digicodeDetails: supabaseData.digicodeDetails || "",
      digicodePhoto: supabaseData.digicodePhoto || null,
      clefs: {
        photos: supabaseData.clefs_photos || [],
        precision: supabaseData.clefs_precision || "",
        prestataire: supabaseData.clefs_prestataire ?? null,
        details: supabaseData.clefs_details || ""
      },
      boiteType: supabaseData.boiteType || null,
      emplacementBoite: supabaseData.emplacementBoite || "",
      ttlock: {
        masterpinConciergerie: supabaseData.ttlock_masterpinConciergerie || "",
        codeProprietaire: supabaseData.ttlock_codeProprietaire || "",
        codeMenage: supabaseData.ttlock_codeMenage || ""
      },
      igloohome: {
        masterpinConciergerie: supabaseData.igloohome_masterpinConciergerie || "",
        codeVoyageur: supabaseData.igloohome_codeVoyageur || "",
        codeProprietaire: supabaseData.igloohome_codeProprietaire || "",
        codeMenage: supabaseData.igloohome_codeMenage || ""
      },
      masterlock: {
        code: supabaseData.masterlock_code || ""
      }
    },
    
    section_airbnb: {
      preparation_guide: {
        video_complete: supabaseData.airbnb_preparation_guide?.video_complete || false,
        photos_etapes: supabaseData.airbnb_preparation_guide?.photos_etapes || false
      },
      annonce_active: supabaseData.airbnb_annonce_active ?? null,
      url_annonce: supabaseData.airbnb_url || "",
      identifiants_obtenus: supabaseData.airbnb_identifiants_obtenus ?? null,
      email_compte: supabaseData.airbnb_email || "",
      mot_passe: supabaseData.airbnb_mot_passe || "",
      explication_refus: supabaseData.airbnb_explication_refus || ""
    },
    
    section_booking: {
      annonce_active: supabaseData.booking_annonce_active ?? null,
      url_annonce: supabaseData.booking_url || "",
      identifiants_obtenus: supabaseData.booking_identifiants_obtenus ?? null,
      email_compte: supabaseData.booking_email || "",
      mot_passe: supabaseData.booking_mot_passe || "",
      explication_refus: supabaseData.booking_explication_refus || ""
    },
    
    // Sections vides pour l'instant
    section_reglementation: {},
    section_exigences: {},
    section_avis: {},
    section_gestion_linge: {},
    section_equipements: {},
    section_consommables: {},
    section_visite: {},
    section_chambres: {},
    section_salle_de_bains: {},
    section_cuisine_1: {},
    section_cuisine_2: {},
    section_salon_sam: {},
    section_equip_spe_exterieur: {},
    section_communs: {},
    section_teletravail: {},
    section_bebe: {},
    section_securite: {}
  }
}

// 💾 Sauvegarder une fiche
export const saveFiche = async (formData, userId) => {
  try {
    const supabaseData = mapFormDataToSupabase(formData)
    supabaseData.user_id = userId
    
    let result
    
    if (formData.id) {
      // Mise à jour d'une fiche existante
      result = await supabase
        .from('fiches')
        .update(supabaseData)
        .eq('id', formData.id)
        .select()
        .single()
    } else {
      // Création d'une nouvelle fiche
      result = await supabase
        .from('fiches')
        .insert(supabaseData)
        .select()
        .single()
    }
    
    if (result.error) {
      throw result.error
    }
    
    return {
      success: true,
      data: mapSupabaseToFormData(result.data),
      message: 'Fiche sauvegardée avec succès'
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    return {
      success: false,
      error: error.message,
      message: 'Erreur lors de la sauvegarde'
    }
  }
}

// 📖 Charger une fiche
export const loadFiche = async (ficheId) => {
  try {
    const { data, error } = await supabase
      .from('fiches')
      .select('*')
      .eq('id', ficheId)
      .single()
    
    if (error) {
      throw error
    }
    
    return {
      success: true,
      data: mapSupabaseToFormData(data),
      message: 'Fiche chargée avec succès'
    }
  } catch (error) {
    console.error('Erreur lors du chargement:', error)
    return {
      success: false,
      error: error.message,
      message: 'Erreur lors du chargement'
    }
  }
}

// 📋 Récupérer toutes les fiches d'un utilisateur
export const getUserFiches = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('fiches')
      .select('id, nom, statut, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return {
      success: true,
      data: data || [],
      message: 'Fiches récupérées avec succès'
    }
  } catch (error) {
    console.error('Erreur lors de la récupération:', error)
    return {
      success: false,
      error: error.message,
      message: 'Erreur lors de la récupération'
    }
  }
}

// ❌ Nouvelle fonction: Supprimer une fiche
// 🗑️ Supprimer une fiche
export const deleteFiche = async (ficheId) => {
  try {
    const { error } = await supabase
      .from('fiches')
      .delete()
      .eq('id', ficheId)
    
    if (error) {
      throw error
    }
    
    return {
      success: true,
      message: 'Fiche supprimée avec succès'
    }
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    return {
      success: false,
      error: error.message,
      message: 'Erreur lors de la suppression'
    }
  }
}