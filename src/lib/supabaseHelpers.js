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
    
    // Section Logement - CORRIGÉ POUR LES NOUVEAUX CHAMPS
    // ✅ NOUVEAUX champs Monday (priorité)
    logement_type_propriete: formData.section_logement?.type_propriete || null,
    logement_surface: formData.section_logement?.surface ? parseInt(formData.section_logement.surface) : null,
    logement_numero_bien: formData.section_logement?.numero_bien || null,
    logement_typologie: formData.section_logement?.typologie || null,
    logement_nombre_personnes_max: formData.section_logement?.nombre_personnes_max || null,
    logement_nombre_lits: formData.section_logement?.nombre_lits || null,
    logement_type_autre_precision: formData.section_logement?.type_autre_precision || null,

    // Section appartement
    logement_appartement_nom_residence: formData.section_logement?.appartement?.nom_residence || null,
    logement_appartement_batiment: formData.section_logement?.appartement?.batiment || null,
    logement_appartement_acces: formData.section_logement?.appartement?.acces || null,
    logement_appartement_etage: formData.section_logement?.appartement?.etage || null,
    logement_appartement_numero_porte: formData.section_logement?.appartement?.numero_porte || null,

    // ✅ LEGACY (garde compatibilité)
    logement_type: formData.section_logement?.type || null,
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
    
    // 🎯 Section Réglementation
    reglementation_ville_changement_usage: formData.section_reglementation?.ville_changement_usage || null,
    reglementation_date_expiration_changement: formData.section_reglementation?.date_expiration_changement || null,
    reglementation_numero_declaration: formData.section_reglementation?.numero_declaration || null,
    reglementation_ville_declaration_simple: formData.section_reglementation?.ville_declaration_simple || null,
    reglementation_details: formData.section_reglementation?.details_reglementation || null,
    
    // Documents checklist
    reglementation_documents_carte_identite: formData.section_reglementation?.documents?.carte_identite ?? null,
    reglementation_documents_rib: formData.section_reglementation?.documents?.rib ?? null,
    reglementation_documents_cerfa: formData.section_reglementation?.documents?.cerfa ?? null,
    reglementation_documents_assurance_pno: formData.section_reglementation?.documents?.assurance_pno ?? null,
    reglementation_documents_rcp: formData.section_reglementation?.documents?.rcp ?? null,
    reglementation_documents_acte_propriete: formData.section_reglementation?.documents?.acte_propriete ?? null,

    // Section Exigences
    exigences_nombre_nuits_minimum: formData.section_exigences?.nombre_nuits_minimum ? parseInt(formData.section_exigences.nombre_nuits_minimum) : null,
    exigences_tarif_minimum_nuit: formData.section_exigences?.tarif_minimum_nuit ? parseFloat(formData.section_exigences.tarif_minimum_nuit) : null,
    exigences_dates_bloquees: formData.section_exigences?.dates_bloquees || [],
    exigences_precisions_exigences: formData.section_exigences?.precisions_exigences || null,
    
    // Section Avis
    avis_description_tres_bien_situe: formData.section_avis?.description_emplacement?.tres_bien_situe ?? null,
    avis_description_quartier_calme: formData.section_avis?.description_emplacement?.quartier_calme ?? null,
    avis_description_environnement_rural: formData.section_avis?.description_emplacement?.environnement_rural ?? null,
    avis_description_bord_mer: formData.section_avis?.description_emplacement?.bord_mer ?? null,
    avis_description_montagne: formData.section_avis?.description_emplacement?.montagne ?? null,
    avis_description_autres_emplacement: formData.section_avis?.description_emplacement?.autres_emplacement ?? null,
    avis_description_emplacement_autre: formData.section_avis?.description_emplacement_autre || null,

    avis_precisions_emplacement: formData.section_avis?.precisions_emplacement || null,

    avis_atouts_luxueux: formData.section_avis?.atouts_logement?.luxueux ?? null,
    avis_atouts_lumineux: formData.section_avis?.atouts_logement?.lumineux ?? null,
    avis_atouts_central: formData.section_avis?.atouts_logement?.central ?? null,
    avis_atouts_spacieux: formData.section_avis?.atouts_logement?.spacieux ?? null,
    avis_atouts_authentique: formData.section_avis?.atouts_logement?.authentique ?? null,
    avis_atouts_design_moderne: formData.section_avis?.atouts_logement?.design_moderne ?? null,
    avis_atouts_terrasse_balcon: formData.section_avis?.atouts_logement?.terrasse_balcon ?? null,
    avis_atouts_piscine: formData.section_avis?.atouts_logement?.piscine ?? null,
    avis_atouts_autres_atouts: formData.section_avis?.atouts_logement?.autres_atouts ?? null,
    avis_atouts_logement_autre: formData.section_avis?.atouts_logement_autre || null,
    avis_autres_caracteristiques: formData.section_avis?.autres_caracteristiques || null,

    avis_voyageurs_duo_amoureux: formData.section_avis?.types_voyageurs?.duo_amoureux ?? null,
    avis_voyageurs_nomades_numeriques: formData.section_avis?.types_voyageurs?.nomades_numeriques ?? null,
    avis_voyageurs_aventuriers_independants: formData.section_avis?.types_voyageurs?.aventuriers_independants ?? null,
    avis_voyageurs_tribus_familiales: formData.section_avis?.types_voyageurs?.tribus_familiales ?? null,
    avis_voyageurs_bandes_amis: formData.section_avis?.types_voyageurs?.bandes_amis ?? null,
    avis_voyageurs_voyageurs_experience: formData.section_avis?.types_voyageurs?.voyageurs_experience ?? null,
    avis_voyageurs_autres_voyageurs: formData.section_avis?.types_voyageurs?.autres_voyageurs ?? null,
    avis_voyageurs_autre: formData.section_avis?.types_voyageurs_autre || null,

    avis_explication_adaptation: formData.section_avis?.explication_adaptation || null,

    avis_notation_emplacement: formData.section_avis?.notation?.emplacement || null,
    avis_notation_confort: formData.section_avis?.notation?.confort || null,
    avis_notation_valeurs: formData.section_avis?.notation?.valeurs || null,
    avis_notation_equipements: formData.section_avis?.notation?.equipements || null,
    
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
      // Nouveaux champs Monday (direct dans section_logement)
      type_propriete: supabaseData.logement_type_propriete || "",
      surface: supabaseData.logement_surface?.toString() || "",
      numero_bien: supabaseData.logement_numero_bien || "",
      typologie: supabaseData.logement_typologie || "",
      nombre_personnes_max: supabaseData.logement_nombre_personnes_max || "",
      nombre_lits: supabaseData.logement_nombre_lits || "",
      type_autre_precision: supabaseData.logement_type_autre_precision || "",
      
      // Section appartement conditionnelle
      appartement: {
        nom_residence: supabaseData.logement_appartement_nom_residence || "",
        batiment: supabaseData.logement_appartement_batiment || "",
        acces: supabaseData.logement_appartement_acces || "",
        etage: supabaseData.logement_appartement_etage || "",
        numero_porte: supabaseData.logement_appartement_numero_porte || ""
      },
      
      // Anciens champs (garde compatibilité)
      type: supabaseData.logement_type || "",
      adresse: {
        rue: supabaseData.logement_adresse_rue || "",
        complement: "",
        ville: supabaseData.logement_adresse_ville || "",
        codePostal: supabaseData.logement_adresse_code_postal || "",
        batiment: "",
        etage: supabaseData.logement_etage || "",
        numeroPorte: ""
      },
      caracteristiques: {
        nombrePieces: supabaseData.logement_nombre_pieces?.toString() || "",
        nombreChambres: supabaseData.logement_nombre_chambres?.toString() || "",
        surface: supabaseData.logement_surface?.toString() || ""
      },
      acces: supabaseData.logement_acces || ""
    },
    
     section_clefs: {
      interphone: supabaseData.interphone ?? null,
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
      }
    },
    
    section_airbnb: {
      preparation_guide: {
        video_complete: supabaseData.airbnb_preparation_video_complete ?? false,
        photos_etapes: supabaseData.airbnb_preparation_photos_etapes ?? false
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
    
    // 🎯 Section Réglementation
    section_reglementation: {
      ville_changement_usage: supabaseData.reglementation_ville_changement_usage || "",
      date_expiration_changement: supabaseData.reglementation_date_expiration_changement || "",
      numero_declaration: supabaseData.reglementation_numero_declaration || "",
      ville_declaration_simple: supabaseData.reglementation_ville_declaration_simple || "",
      details_reglementation: supabaseData.reglementation_details || "",
      
      // Documents checklist
      documents: {
        carte_identite: supabaseData.reglementation_documents_carte_identite ?? false,
        rib: supabaseData.reglementation_documents_rib ?? false,
        cerfa: supabaseData.reglementation_documents_cerfa ?? false,
        assurance_pno: supabaseData.reglementation_documents_assurance_pno ?? false,
        rcp: supabaseData.reglementation_documents_rcp ?? false,
        acte_propriete: supabaseData.reglementation_documents_acte_propriete ?? false
      }
    },
    
    // Sections vides pour l'instant
    section_exigences: {
      nombre_nuits_minimum: supabaseData.exigences_nombre_nuits_minimum?.toString() || "",
      tarif_minimum_nuit: supabaseData.exigences_tarif_minimum_nuit?.toString() || "",
      dates_bloquees: supabaseData.exigences_dates_bloquees || [],
      precisions_exigences: supabaseData.exigences_precisions_exigences || ""
    },

    section_avis: {
      description_emplacement: {
        tres_bien_situe: supabaseData.avis_description_tres_bien_situe ?? false,
        quartier_calme: supabaseData.avis_description_quartier_calme ?? false,
        environnement_rural: supabaseData.avis_description_environnement_rural ?? false,
        bord_mer: supabaseData.avis_description_bord_mer ?? false,
        montagne: supabaseData.avis_description_montagne ?? false,
        autres_emplacement: supabaseData.avis_description_autres_emplacement ?? false
      },
      description_emplacement_autre: supabaseData.avis_description_emplacement_autre || "",
      
      precisions_emplacement: supabaseData.avis_precisions_emplacement || "",
      
      atouts_logement: {
        luxueux: supabaseData.avis_atouts_luxueux ?? false,
        lumineux: supabaseData.avis_atouts_lumineux ?? false,
        central: supabaseData.avis_atouts_central ?? false,
        spacieux: supabaseData.avis_atouts_spacieux ?? false,
        authentique: supabaseData.avis_atouts_authentique ?? false,
        design_moderne: supabaseData.avis_atouts_design_moderne ?? false,
        terrasse_balcon: supabaseData.avis_atouts_terrasse_balcon ?? false,
        piscine: supabaseData.avis_atouts_piscine ?? false,
        autres_atouts: supabaseData.avis_atouts_autres_atouts ?? false
      },
      atouts_logement_autre: supabaseData.avis_atouts_logement_autre || "",
      autres_caracteristiques: supabaseData.avis_autres_caracteristiques || "",
      types_voyageurs: {
        duo_amoureux: supabaseData.avis_voyageurs_duo_amoureux ?? false,
        nomades_numeriques: supabaseData.avis_voyageurs_nomades_numeriques ?? false,
        aventuriers_independants: supabaseData.avis_voyageurs_aventuriers_independants ?? false,
        tribus_familiales: supabaseData.avis_voyageurs_tribus_familiales ?? false,
        bandes_amis: supabaseData.avis_voyageurs_bandes_amis ?? false,
        voyageurs_experience: supabaseData.avis_voyageurs_voyageurs_experience ?? false,
        autres_voyageurs: supabaseData.avis_voyageurs_autres_voyageurs ?? false
      },
      types_voyageurs_autre: supabaseData.avis_voyageurs_autre || "",
      
      explication_adaptation: supabaseData.avis_explication_adaptation || "",
      
      notation: {
        emplacement: supabaseData.avis_notation_emplacement || null,
        confort: supabaseData.avis_notation_confort || null,
        valeurs: supabaseData.avis_notation_valeurs || null,
        equipements: supabaseData.avis_notation_equipements || null
      }
    },

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



// 🔥 NOUVELLE FONCTION : Récupérer TOUTES les fiches (pour admin/super admin)
// 🔥 VERSION CORRIGÉE : Récupérer TOUTES les fiches sans JOIN complexe
export const getAllFiches = async (includeArchived = false) => {
  try {
    let query = supabase
      .from('fiches')
      .select('id, nom, statut, created_at, updated_at, user_id') // Sans le JOIN profiles
    
    // Filtrer les fiches archivées si demandé
    if (!includeArchived) {
      query = query.neq('statut', 'Archivé')
    }
    
    // Ordonner par date de mise à jour décroissante
    query = query.order('updated_at', { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      throw error
    }
    
    // Pour l'instant, on retourne les fiches sans info créateur
    // On ajoutera ça plus tard quand on aura configuré les foreign keys
    return {
      success: true,
      data: data || [],
      message: 'Toutes les fiches récupérées avec succès'
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de toutes les fiches:', error)
    return {
      success: false,
      error: error.message,
      message: 'Erreur lors de la récupération des fiches'
    }
  }
}



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

// Fonction pour mettre à jour le statut d'une fiche
export const updateFicheStatut = async (ficheId, newStatut) => {
  try {
    console.log(`Mise à jour statut fiche ${ficheId} vers "${newStatut}"`)
    
    const { data, error } = await supabase
      .from('fiches')
      .update({ 
        statut: newStatut,
        updated_at: new Date().toISOString()
      })
      .eq('id', ficheId)
      .select('id, nom, statut, updated_at')
      .single()

    if (error) {
      console.error('Erreur Supabase updateFicheStatut:', error)
      return { 
        success: false, 
        error: error.message,
        message: `Impossible de ${newStatut === 'Archivé' ? 'archiver' : 'modifier'} la fiche`
      }
    }

    const action = newStatut === 'Archivé' ? 'archivée' : 
                   newStatut === 'Complété' ? 'finalisée' : 
                   newStatut === 'Brouillon' ? 'restaurée' : 'mise à jour'

    return { 
      success: true, 
      data,
      message: `Fiche ${action} avec succès`
    }
  } catch (e) {
    console.error('Erreur updateFicheStatut:', e.message)
    return { 
      success: false, 
      error: e.message,
      message: 'Erreur de connexion'
    }
  }
}