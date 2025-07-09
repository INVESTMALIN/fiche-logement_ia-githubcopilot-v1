// src/lib/supabaseHelpers.js
import { supabase, safeSupabaseQuery } from './supabaseClient'

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
    //logement_type: formData.section_logement?.type || null,
    //logement_nombre_pieces: formData.section_logement?.caracteristiques?.nombrePieces ? parseInt(formData.section_logement.caracteristiques.nombrePieces) : null,
    //logement_nombre_chambres: formData.section_logement?.caracteristiques?.nombreChambres ? parseInt(formData.section_logement.caracteristiques.nombreChambres) : null,
    //logement_adresse_rue: formData.section_logement?.adresse?.rue || null,
    //logement_adresse_ville: formData.section_logement?.adresse?.ville || null,
    //logement_adresse_code_postal: formData.section_logement?.adresse?.codePostal || null,
    //logement_etage: formData.section_logement?.adresse?.etage || null,
    //logement_acces: formData.section_logement?.acces || null,

    // Section Clefs
    clefs_boite_type: formData.section_clefs?.boiteType || null,
    clefs_emplacement_boite: formData.section_clefs?.emplacementBoite || null,
    clefs_emplacement_photo: formData.section_clefs?.emplacementPhoto || null,
    clefs_ttlock_masterpin_conciergerie: formData.section_clefs?.ttlock?.masterpinConciergerie || null,
    clefs_ttlock_code_proprietaire: formData.section_clefs?.ttlock?.codeProprietaire || null,
    clefs_ttlock_code_menage: formData.section_clefs?.ttlock?.codeMenage || null,
    clefs_igloohome_masterpin_conciergerie: formData.section_clefs?.igloohome?.masterpinConciergerie || null,
    clefs_igloohome_code_voyageur: formData.section_clefs?.igloohome?.codeVoyageur || null,
    clefs_igloohome_code_proprietaire: formData.section_clefs?.igloohome?.codeProprietaire || null,
    clefs_igloohome_code_menage: formData.section_clefs?.igloohome?.codeMenage || null,
    clefs_masterlock_code: formData.section_clefs?.masterlock?.code || null,
    clefs_interphone: formData.section_clefs?.interphone ?? null,
    clefs_interphone_details: formData.section_clefs?.interphoneDetails || null,
    clefs_interphone_photo: formData.section_clefs?.interphonePhoto || null,
    clefs_tempo_gache: formData.section_clefs?.tempoGache ?? null,
    clefs_tempo_gache_details: formData.section_clefs?.tempoGacheDetails || null,
    clefs_tempo_gache_photo: formData.section_clefs?.tempoGachePhoto || null,
    clefs_digicode: formData.section_clefs?.digicode ?? null,
    clefs_digicode_details: formData.section_clefs?.digicodeDetails || null,
    clefs_digicode_photo: formData.section_clefs?.digicodePhoto || null,
    clefs_photos: formData.section_clefs?.clefs?.photos || [],
    clefs_precision: formData.section_clefs?.clefs?.precision || null,
    clefs_prestataire: formData.section_clefs?.clefs?.prestataire ?? null,
    clefs_details: formData.section_clefs?.clefs?.details || null,
    
    // Section Airbnb
    airbnb_preparation_video_complete: formData.section_airbnb?.preparation_guide?.video_complete ?? null,
    airbnb_preparation_photos_etapes: formData.section_airbnb?.preparation_guide?.photos_etapes ?? null,
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
    exigences_dates_bloquees: formData.section_exigences?.dates_bloquees || null,
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

    avis_atouts_lumineux: formData.section_avis?.atouts_logement?.lumineux ?? null,
    avis_atouts_central: formData.section_avis?.atouts_logement?.central ?? null,
    avis_atouts_authentique: formData.section_avis?.atouts_logement?.authentique ?? null,
    avis_atouts_design_moderne: formData.section_avis?.atouts_logement?.design_moderne ?? null,
    avis_atouts_terrasse_balcon: formData.section_avis?.atouts_logement?.terrasse_balcon ?? null,
    avis_atouts_piscine: formData.section_avis?.atouts_logement?.piscine ?? null,
    avis_atouts_rustique: formData.section_avis?.atouts_logement?.rustique ?? null,
    avis_atouts_convivial: formData.section_avis?.atouts_logement?.convivial ?? null,
    avis_atouts_douillet: formData.section_avis?.atouts_logement?.douillet ?? null,
    avis_atouts_proche_transports: formData.section_avis?.atouts_logement?.proche_transports ?? null,
    avis_atouts_jacuzzi: formData.section_avis?.atouts_logement?.jacuzzi ?? null,
    avis_atouts_cheminee: formData.section_avis?.atouts_logement?.cheminee ?? null,
    avis_atouts_charmant: formData.section_avis?.atouts_logement?.charmant ?? null,
    avis_atouts_elegant: formData.section_avis?.atouts_logement?.elegant ?? null,
    avis_atouts_atypique: formData.section_avis?.atouts_logement?.atypique ?? null,
    avis_atouts_renove: formData.section_avis?.atouts_logement?.renove ?? null,
    avis_atouts_familial: formData.section_avis?.atouts_logement?.familial ?? null,
    avis_atouts_cosy_confortable: formData.section_avis?.atouts_logement?.cosy_confortable ?? null,
    avis_atouts_decoration_traditionnelle: formData.section_avis?.atouts_logement?.decoration_traditionnelle ?? null,
    avis_atouts_jardin: formData.section_avis?.atouts_logement?.jardin ?? null,
    avis_atouts_proche_commerces: formData.section_avis?.atouts_logement?.proche_commerces ?? null,
    avis_atouts_sauna_spa: formData.section_avis?.atouts_logement?.sauna_spa ?? null,
    avis_atouts_video_projecteur: formData.section_avis?.atouts_logement?.video_projecteur ?? null,
    avis_atouts_station_recharge_electrique: formData.section_avis?.atouts_logement?.station_recharge_electrique ?? null,
    avis_atouts_romantique: formData.section_avis?.atouts_logement?.romantique ?? null,
    avis_atouts_paisible: formData.section_avis?.atouts_logement?.paisible ?? null,
    avis_atouts_chic: formData.section_avis?.atouts_logement?.chic ?? null,
    avis_atouts_accueillant: formData.section_avis?.atouts_logement?.accueillant ?? null,
    avis_atouts_tranquille: formData.section_avis?.atouts_logement?.tranquille ?? null,
    avis_atouts_spacieux: formData.section_avis?.atouts_logement?.spacieux ?? null,
    avis_atouts_vue_panoramique: formData.section_avis?.atouts_logement?.vue_panoramique ?? null,
    avis_atouts_parking_prive: formData.section_avis?.atouts_logement?.parking_prive ?? null,
    avis_atouts_equipements_haut_gamme: formData.section_avis?.atouts_logement?.equipements_haut_gamme ?? null,
    avis_atouts_billard: formData.section_avis?.atouts_logement?.billard ?? null,
    avis_atouts_jeux_arcade: formData.section_avis?.atouts_logement?.jeux_arcade ?? null,
    avis_atouts_table_ping_pong: formData.section_avis?.atouts_logement?.table_ping_pong ?? null,
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
    avis_notation_vetuste: formData.section_avis?.notation?.vetuste || null,
    avis_notation_equipements: formData.section_avis?.notation?.equipements || null,

    // Section Gestion Linge
    linge_dispose_de_linge: formData.section_gestion_linge?.dispose_de_linge ?? null,

    // Inventaire 90x200
    linge_90x200_couettes: formData.section_gestion_linge?.inventaire_90x200?.couettes ? parseInt(formData.section_gestion_linge.inventaire_90x200.couettes) : null,
    linge_90x200_oreillers: formData.section_gestion_linge?.inventaire_90x200?.oreillers ? parseInt(formData.section_gestion_linge.inventaire_90x200.oreillers) : null,
    linge_90x200_draps_housses: formData.section_gestion_linge?.inventaire_90x200?.draps_housses ? parseInt(formData.section_gestion_linge.inventaire_90x200.draps_housses) : null,
    linge_90x200_housses_couette: formData.section_gestion_linge?.inventaire_90x200?.housses_couette ? parseInt(formData.section_gestion_linge.inventaire_90x200.housses_couette) : null,
    linge_90x200_protections_matelas: formData.section_gestion_linge?.inventaire_90x200?.protections_matelas ? parseInt(formData.section_gestion_linge.inventaire_90x200.protections_matelas) : null,
    linge_90x200_taies_oreillers: formData.section_gestion_linge?.inventaire_90x200?.taies_oreillers ? parseInt(formData.section_gestion_linge.inventaire_90x200.taies_oreillers) : null,
    linge_90x200_draps_bain: formData.section_gestion_linge?.inventaire_90x200?.draps_bain ? parseInt(formData.section_gestion_linge.inventaire_90x200.draps_bain) : null,
    linge_90x200_petites_serviettes: formData.section_gestion_linge?.inventaire_90x200?.petites_serviettes ? parseInt(formData.section_gestion_linge.inventaire_90x200.petites_serviettes) : null,
    linge_90x200_tapis_bain: formData.section_gestion_linge?.inventaire_90x200?.tapis_bain ? parseInt(formData.section_gestion_linge.inventaire_90x200.tapis_bain) : null,
    linge_90x200_torchons: formData.section_gestion_linge?.inventaire_90x200?.torchons ? parseInt(formData.section_gestion_linge.inventaire_90x200.torchons) : null,
    linge_90x200_plaids: formData.section_gestion_linge?.inventaire_90x200?.plaids ? parseInt(formData.section_gestion_linge.inventaire_90x200.plaids) : null,
    linge_90x200_oreillers_decoratifs: formData.section_gestion_linge?.inventaire_90x200?.oreillers_decoratifs ? parseInt(formData.section_gestion_linge.inventaire_90x200.oreillers_decoratifs) : null,

    // Inventaire 140x200 
    linge_140x200_couettes: formData.section_gestion_linge?.inventaire_140x200?.couettes ? parseInt(formData.section_gestion_linge.inventaire_140x200.couettes) : null,
    linge_140x200_oreillers: formData.section_gestion_linge?.inventaire_140x200?.oreillers ? parseInt(formData.section_gestion_linge.inventaire_140x200.oreillers) : null,
    linge_140x200_draps_housses: formData.section_gestion_linge?.inventaire_140x200?.draps_housses ? parseInt(formData.section_gestion_linge.inventaire_140x200.draps_housses) : null,
    linge_140x200_housses_couette: formData.section_gestion_linge?.inventaire_140x200?.housses_couette ? parseInt(formData.section_gestion_linge.inventaire_140x200.housses_couette) : null,
    linge_140x200_protections_matelas: formData.section_gestion_linge?.inventaire_140x200?.protections_matelas ? parseInt(formData.section_gestion_linge.inventaire_140x200.protections_matelas) : null,
    linge_140x200_taies_oreillers: formData.section_gestion_linge?.inventaire_140x200?.taies_oreillers ? parseInt(formData.section_gestion_linge.inventaire_140x200.taies_oreillers) : null,
    linge_140x200_draps_bain: formData.section_gestion_linge?.inventaire_140x200?.draps_bain ? parseInt(formData.section_gestion_linge.inventaire_140x200.draps_bain) : null,
    linge_140x200_petites_serviettes: formData.section_gestion_linge?.inventaire_140x200?.petites_serviettes ? parseInt(formData.section_gestion_linge.inventaire_140x200.petites_serviettes) : null,
    linge_140x200_tapis_bain: formData.section_gestion_linge?.inventaire_140x200?.tapis_bain ? parseInt(formData.section_gestion_linge.inventaire_140x200.tapis_bain) : null,
    linge_140x200_torchons: formData.section_gestion_linge?.inventaire_140x200?.torchons ? parseInt(formData.section_gestion_linge.inventaire_140x200.torchons) : null,
    linge_140x200_plaids: formData.section_gestion_linge?.inventaire_140x200?.plaids ? parseInt(formData.section_gestion_linge.inventaire_140x200.plaids) : null,
    linge_140x200_oreillers_decoratifs: formData.section_gestion_linge?.inventaire_140x200?.oreillers_decoratifs ? parseInt(formData.section_gestion_linge.inventaire_140x200.oreillers_decoratifs) : null,

    // Inventaire 160x200
    linge_160x200_couettes: formData.section_gestion_linge?.inventaire_160x200?.couettes ? parseInt(formData.section_gestion_linge.inventaire_160x200.couettes) : null,
    linge_160x200_oreillers: formData.section_gestion_linge?.inventaire_160x200?.oreillers ? parseInt(formData.section_gestion_linge.inventaire_160x200.oreillers) : null,
    linge_160x200_draps_housses: formData.section_gestion_linge?.inventaire_160x200?.draps_housses ? parseInt(formData.section_gestion_linge.inventaire_160x200.draps_housses) : null,
    linge_160x200_housses_couette: formData.section_gestion_linge?.inventaire_160x200?.housses_couette ? parseInt(formData.section_gestion_linge.inventaire_160x200.housses_couette) : null,
    linge_160x200_protections_matelas: formData.section_gestion_linge?.inventaire_160x200?.protections_matelas ? parseInt(formData.section_gestion_linge.inventaire_160x200.protections_matelas) : null,
    linge_160x200_taies_oreillers: formData.section_gestion_linge?.inventaire_160x200?.taies_oreillers ? parseInt(formData.section_gestion_linge.inventaire_160x200.taies_oreillers) : null,
    linge_160x200_draps_bain: formData.section_gestion_linge?.inventaire_160x200?.draps_bain ? parseInt(formData.section_gestion_linge.inventaire_160x200.draps_bain) : null,
    linge_160x200_petites_serviettes: formData.section_gestion_linge?.inventaire_160x200?.petites_serviettes ? parseInt(formData.section_gestion_linge.inventaire_160x200.petites_serviettes) : null,
    linge_160x200_tapis_bain: formData.section_gestion_linge?.inventaire_160x200?.tapis_bain ? parseInt(formData.section_gestion_linge.inventaire_160x200.tapis_bain) : null,
    linge_160x200_torchons: formData.section_gestion_linge?.inventaire_160x200?.torchons ? parseInt(formData.section_gestion_linge.inventaire_160x200.torchons) : null,
    linge_160x200_plaids: formData.section_gestion_linge?.inventaire_160x200?.plaids ? parseInt(formData.section_gestion_linge.inventaire_160x200.plaids) : null,
    linge_160x200_oreillers_decoratifs: formData.section_gestion_linge?.inventaire_160x200?.oreillers_decoratifs ? parseInt(formData.section_gestion_linge.inventaire_160x200.oreillers_decoratifs) : null,

    // Inventaire 180x200
    linge_180x200_couettes: formData.section_gestion_linge?.inventaire_180x200?.couettes ? parseInt(formData.section_gestion_linge.inventaire_180x200.couettes) : null,
    linge_180x200_oreillers: formData.section_gestion_linge?.inventaire_180x200?.oreillers ? parseInt(formData.section_gestion_linge.inventaire_180x200.oreillers) : null,
    linge_180x200_draps_housses: formData.section_gestion_linge?.inventaire_180x200?.draps_housses ? parseInt(formData.section_gestion_linge.inventaire_180x200.draps_housses) : null,
    linge_180x200_housses_couette: formData.section_gestion_linge?.inventaire_180x200?.housses_couette ? parseInt(formData.section_gestion_linge.inventaire_180x200.housses_couette) : null,
    linge_180x200_protections_matelas: formData.section_gestion_linge?.inventaire_180x200?.protections_matelas ? parseInt(formData.section_gestion_linge.inventaire_180x200.protections_matelas) : null,
    linge_180x200_taies_oreillers: formData.section_gestion_linge?.inventaire_180x200?.taies_oreillers ? parseInt(formData.section_gestion_linge.inventaire_180x200.taies_oreillers) : null,
    linge_180x200_draps_bain: formData.section_gestion_linge?.inventaire_180x200?.draps_bain ? parseInt(formData.section_gestion_linge.inventaire_180x200.draps_bain) : null,
    linge_180x200_petites_serviettes: formData.section_gestion_linge?.inventaire_180x200?.petites_serviettes ? parseInt(formData.section_gestion_linge.inventaire_180x200.petites_serviettes) : null,
    linge_180x200_tapis_bain: formData.section_gestion_linge?.inventaire_180x200?.tapis_bain ? parseInt(formData.section_gestion_linge.inventaire_180x200.tapis_bain) : null,
    linge_180x200_torchons: formData.section_gestion_linge?.inventaire_180x200?.torchons ? parseInt(formData.section_gestion_linge.inventaire_180x200.torchons) : null,
    linge_180x200_plaids: formData.section_gestion_linge?.inventaire_180x200?.plaids ? parseInt(formData.section_gestion_linge.inventaire_180x200.plaids) : null,
    linge_180x200_oreillers_decoratifs: formData.section_gestion_linge?.inventaire_180x200?.oreillers_decoratifs ? parseInt(formData.section_gestion_linge.inventaire_180x200.oreillers_decoratifs) : null,

    // Inventaire Autres
    linge_autres_couettes: formData.section_gestion_linge?.inventaire_autres?.couettes ? parseInt(formData.section_gestion_linge.inventaire_autres.couettes) : null,
    linge_autres_oreillers: formData.section_gestion_linge?.inventaire_autres?.oreillers ? parseInt(formData.section_gestion_linge.inventaire_autres.oreillers) : null,
    linge_autres_draps_housses: formData.section_gestion_linge?.inventaire_autres?.draps_housses ? parseInt(formData.section_gestion_linge.inventaire_autres.draps_housses) : null,
    linge_autres_housses_couette: formData.section_gestion_linge?.inventaire_autres?.housses_couette ? parseInt(formData.section_gestion_linge.inventaire_autres.housses_couette) : null,
    linge_autres_protections_matelas: formData.section_gestion_linge?.inventaire_autres?.protections_matelas ? parseInt(formData.section_gestion_linge.inventaire_autres.protections_matelas) : null,
    linge_autres_taies_oreillers: formData.section_gestion_linge?.inventaire_autres?.taies_oreillers ? parseInt(formData.section_gestion_linge.inventaire_autres.taies_oreillers) : null,
    linge_autres_draps_bain: formData.section_gestion_linge?.inventaire_autres?.draps_bain ? parseInt(formData.section_gestion_linge.inventaire_autres.draps_bain) : null,
    linge_autres_petites_serviettes: formData.section_gestion_linge?.inventaire_autres?.petites_serviettes ? parseInt(formData.section_gestion_linge.inventaire_autres.petites_serviettes) : null,
    linge_autres_tapis_bain: formData.section_gestion_linge?.inventaire_autres?.tapis_bain ? parseInt(formData.section_gestion_linge.inventaire_autres.tapis_bain) : null,
    linge_autres_torchons: formData.section_gestion_linge?.inventaire_autres?.torchons ? parseInt(formData.section_gestion_linge.inventaire_autres.torchons) : null,
    linge_autres_plaids: formData.section_gestion_linge?.inventaire_autres?.plaids ? parseInt(formData.section_gestion_linge.inventaire_autres.plaids) : null,
    linge_autres_oreillers_decoratifs: formData.section_gestion_linge?.inventaire_autres?.oreillers_decoratifs ? parseInt(formData.section_gestion_linge.inventaire_autres.oreillers_decoratifs) : null,

    // État du linge
    linge_etat_neuf: formData.section_gestion_linge?.etat_neuf ?? null,
    linge_etat_usage: formData.section_gestion_linge?.etat_usage ?? null,
    linge_etat_propre: formData.section_gestion_linge?.etat_propre ?? null,
    linge_etat_sale: formData.section_gestion_linge?.etat_sale ?? null,
    linge_etat_tache: formData.section_gestion_linge?.etat_tache ?? null,
    linge_etat_informations: formData.section_gestion_linge?.etat_informations || null,

    // Photos et emplacement
    linge_photos_linge: formData.section_gestion_linge?.photos_linge || [],
    linge_emplacement_description: formData.section_gestion_linge?.emplacement_description || null,
    linge_emplacement_photos: formData.section_gestion_linge?.emplacement_photos || [],
    linge_emplacement_code_cadenas: formData.section_gestion_linge?.emplacement_code_cadenas || null,

    // Section Équipements
    equipements_video_acces_poubelle: formData.section_equipements?.video_acces_poubelle ?? null,
    equipements_poubelle_emplacement: formData.section_equipements?.poubelle_emplacement || null,
    equipements_poubelle_ramassage: formData.section_equipements?.poubelle_ramassage || null,
    equipements_poubelle_photos: formData.section_equipements?.poubelle_photos || [],
    equipements_disjoncteur_emplacement: formData.section_equipements?.disjoncteur_emplacement || null,
    equipements_disjoncteur_photos: formData.section_equipements?.disjoncteur_photos || [],
    equipements_vanne_eau_emplacement: formData.section_equipements?.vanne_eau_emplacement || null,
    equipements_vanne_eau_photos: formData.section_equipements?.vanne_eau_photos || [],
    equipements_systeme_chauffage_eau: formData.section_equipements?.systeme_chauffage_eau || null,
    equipements_chauffage_eau_emplacement: formData.section_equipements?.chauffage_eau_emplacement || null,
    equipements_chauffage_eau_photos: formData.section_equipements?.chauffage_eau_photos || [],
    equipements_video_systeme_chauffage: formData.section_equipements?.video_systeme_chauffage ?? null,

    // Équipements checklist
    equipements_wifi: formData.section_equipements?.wifi ?? null,
    equipements_tv: formData.section_equipements?.tv ?? null,
    equipements_climatisation: formData.section_equipements?.climatisation ?? null,
    equipements_chauffage: formData.section_equipements?.chauffage ?? null,
    equipements_lave_linge: formData.section_equipements?.lave_linge ?? null,
    equipements_seche_linge: formData.section_equipements?.seche_linge ?? null,
    equipements_fer_repasser: formData.section_equipements?.fer_repasser ?? null,
    equipements_etendoir: formData.section_equipements?.etendoir ?? null,
    equipements_parking_equipement: formData.section_equipements?.parking_equipement ?? null,
    equipements_tourne_disque: formData.section_equipements?.tourne_disque ?? null,
    equipements_piano: formData.section_equipements?.piano ?? null,
    equipements_cinema: formData.section_equipements?.cinema ?? null,
    equipements_coffre_fort: formData.section_equipements?.coffre_fort ?? null,
    equipements_ascenseur: formData.section_equipements?.ascenseur ?? null,
    equipements_compacteur_dechets: formData.section_equipements?.compacteur_dechets ?? null,
    equipements_accessible_mobilite_reduite: formData.section_equipements?.accessible_mobilite_reduite ?? null,
    equipements_animaux_acceptes: formData.section_equipements?.animaux_acceptes ?? null,
    equipements_fetes_autorisees: formData.section_equipements?.fetes_autorisees ?? null,
    equipements_fumeurs_acceptes: formData.section_equipements?.fumeurs_acceptes ?? null,

    // Parking
    equipements_parking_type: formData.section_equipements?.parking_type || null,
    equipements_parking_rue_details: formData.section_equipements?.parking_rue_details || null,
    equipements_parking_sur_place_types: formData.section_equipements?.parking_sur_place_types || [],
    equipements_parking_sur_place_details: formData.section_equipements?.parking_sur_place_details || null,
    equipements_parking_payant_type: formData.section_equipements?.parking_payant_type || null,
    equipements_parking_payant_details: formData.section_equipements?.parking_payant_details || null,

    // Section Consommables
    consommables_fournis_par_prestataire: formData.section_consommables?.fournis_par_prestataire ?? null,
    consommables_gel_douche: formData.section_consommables?.gel_douche ?? null,
    consommables_shampoing: formData.section_consommables?.shampoing ?? null,
    consommables_apres_shampoing: formData.section_consommables?.apres_shampoing ?? null,
    consommables_pastilles_lave_vaisselle: formData.section_consommables?.pastilles_lave_vaisselle ?? null,
    consommables_autre_consommable: formData.section_consommables?.autre_consommable ?? null,
    consommables_autre_consommable_details: formData.section_consommables?.autre_consommable_details || null,
    consommables_cafe_nespresso: formData.section_consommables?.cafe_nespresso ?? null,
    consommables_cafe_tassimo: formData.section_consommables?.cafe_tassimo ?? null,
    consommables_cafe_moulu: formData.section_consommables?.cafe_moulu ?? null,
    consommables_cafe_senseo: formData.section_consommables?.cafe_senseo ?? null,
    consommables_cafe_soluble: formData.section_consommables?.cafe_soluble ?? null,
    consommables_cafe_grain: formData.section_consommables?.cafe_grain ?? null,
    consommables_cafe_autre: formData.section_consommables?.cafe_autre ?? null,
    consommables_cafe_autre_details: formData.section_consommables?.cafe_autre_details || null,

    // À AJOUTER dans mapFormDataToSupabase() après la section Consommables :

    // Section Visite
    // Types de pièces (14 checkboxes)
    visite_pieces_chambre: formData.section_visite?.pieces_chambre ?? null,
    visite_pieces_salon: formData.section_visite?.pieces_salon ?? null,
    visite_pieces_salle_bains: formData.section_visite?.pieces_salle_bains ?? null,
    visite_pieces_salon_prive: formData.section_visite?.pieces_salon_prive ?? null,
    visite_pieces_kitchenette: formData.section_visite?.pieces_kitchenette ?? null,
    visite_pieces_cuisine: formData.section_visite?.pieces_cuisine ?? null,
    visite_pieces_salle_manger: formData.section_visite?.pieces_salle_manger ?? null,
    visite_pieces_bureau: formData.section_visite?.pieces_bureau ?? null,
    visite_pieces_salle_jeux: formData.section_visite?.pieces_salle_jeux ?? null,
    visite_pieces_salle_sport: formData.section_visite?.pieces_salle_sport ?? null,
    visite_pieces_buanderie: formData.section_visite?.pieces_buanderie ?? null,
    visite_pieces_terrasse: formData.section_visite?.pieces_terrasse ?? null,
    visite_pieces_balcon: formData.section_visite?.pieces_balcon ?? null,
    visite_pieces_jardin: formData.section_visite?.pieces_jardin ?? null,
    visite_pieces_autre: formData.section_visite?.pieces_autre ?? null,
    visite_pieces_autre_details: formData.section_visite?.pieces_autre_details || null,
    visite_nombre_chambres: formData.section_visite?.nombre_chambres || null,
    visite_nombre_salles_bains: formData.section_visite?.nombre_salles_bains || null,
    visite_video_visite: formData.section_visite?.video_visite ?? null,

    // Section Chambres (162 champs)
    // CHAMBRE 1
    chambres_chambre_1_nom_description: formData.section_chambres?.chambre_1?.nom_description || null,
    chambres_chambre_1_lit_simple_90_190: formData.section_chambres?.chambre_1?.lit_simple_90_190 || 0,
    chambres_chambre_1_lit_double_140_190: formData.section_chambres?.chambre_1?.lit_double_140_190 || 0,
    chambres_chambre_1_lit_queen_160_200: formData.section_chambres?.chambre_1?.lit_queen_160_200 || 0,
    chambres_chambre_1_lit_king_180_200: formData.section_chambres?.chambre_1?.lit_king_180_200 || 0,
    chambres_chambre_1_canape_lit_simple: formData.section_chambres?.chambre_1?.canape_lit_simple || 0,
    chambres_chambre_1_canape_lit_double: formData.section_chambres?.chambre_1?.canape_lit_double || 0,
    chambres_chambre_1_lits_superposes_90_190: formData.section_chambres?.chambre_1?.lits_superposes_90_190 || 0,
    chambres_chambre_1_lit_gigogne: formData.section_chambres?.chambre_1?.lit_gigogne || 0,
    chambres_chambre_1_autre_type_lit: formData.section_chambres?.chambre_1?.autre_type_lit || null,
    chambres_chambre_1_equipements_draps_fournis: formData.section_chambres?.chambre_1?.equipements_draps_fournis ?? null,
    chambres_chambre_1_equipements_climatisation: formData.section_chambres?.chambre_1?.equipements_climatisation ?? null,
    chambres_chambre_1_equipements_ventilateur_plafond: formData.section_chambres?.chambre_1?.equipements_ventilateur_plafond ?? null,
    chambres_chambre_1_equipements_espace_rangement: formData.section_chambres?.chambre_1?.equipements_espace_rangement ?? null,
    chambres_chambre_1_equipements_lit_bebe_60_120: formData.section_chambres?.chambre_1?.equipements_lit_bebe_60_120 ?? null,
    chambres_chambre_1_equipements_stores: formData.section_chambres?.chambre_1?.equipements_stores ?? null,
    chambres_chambre_1_equipements_television: formData.section_chambres?.chambre_1?.equipements_television ?? null,
    chambres_chambre_1_equipements_oreillers_couvertures_sup: formData.section_chambres?.chambre_1?.equipements_oreillers_couvertures_sup ?? null,
    chambres_chambre_1_equipements_chauffage: formData.section_chambres?.chambre_1?.equipements_chauffage ?? null,
    chambres_chambre_1_equipements_cintres: formData.section_chambres?.chambre_1?.equipements_cintres ?? null,
    chambres_chambre_1_equipements_moustiquaire: formData.section_chambres?.chambre_1?.equipements_moustiquaire ?? null,
    chambres_chambre_1_equipements_lit_parapluie_60_120: formData.section_chambres?.chambre_1?.equipements_lit_parapluie_60_120 ?? null,
    chambres_chambre_1_equipements_systeme_audio: formData.section_chambres?.chambre_1?.equipements_systeme_audio ?? null,
    chambres_chambre_1_equipements_coffre_fort: formData.section_chambres?.chambre_1?.equipements_coffre_fort ?? null,
    chambres_chambre_1_equipements_autre: formData.section_chambres?.chambre_1?.equipements_autre ?? null,
    chambres_chambre_1_equipements_autre_details: formData.section_chambres?.chambre_1?.equipements_autre_details || null,
    chambres_chambre_1_photos_chambre: formData.section_chambres?.chambre_1?.photos_chambre || [],

    // CHAMBRE 2
    chambres_chambre_2_nom_description: formData.section_chambres?.chambre_2?.nom_description || null,
    chambres_chambre_2_lit_simple_90_190: formData.section_chambres?.chambre_2?.lit_simple_90_190 || 0,
    chambres_chambre_2_lit_double_140_190: formData.section_chambres?.chambre_2?.lit_double_140_190 || 0,
    chambres_chambre_2_lit_queen_160_200: formData.section_chambres?.chambre_2?.lit_queen_160_200 || 0,
    chambres_chambre_2_lit_king_180_200: formData.section_chambres?.chambre_2?.lit_king_180_200 || 0,
    chambres_chambre_2_canape_lit_simple: formData.section_chambres?.chambre_2?.canape_lit_simple || 0,
    chambres_chambre_2_canape_lit_double: formData.section_chambres?.chambre_2?.canape_lit_double || 0,
    chambres_chambre_2_lits_superposes_90_190: formData.section_chambres?.chambre_2?.lits_superposes_90_190 || 0,
    chambres_chambre_2_lit_gigogne: formData.section_chambres?.chambre_2?.lit_gigogne || 0,
    chambres_chambre_2_autre_type_lit: formData.section_chambres?.chambre_2?.autre_type_lit || null,
    chambres_chambre_2_equipements_draps_fournis: formData.section_chambres?.chambre_2?.equipements_draps_fournis ?? null,
    chambres_chambre_2_equipements_climatisation: formData.section_chambres?.chambre_2?.equipements_climatisation ?? null,
    chambres_chambre_2_equipements_ventilateur_plafond: formData.section_chambres?.chambre_2?.equipements_ventilateur_plafond ?? null,
    chambres_chambre_2_equipements_espace_rangement: formData.section_chambres?.chambre_2?.equipements_espace_rangement ?? null,
    chambres_chambre_2_equipements_lit_bebe_60_120: formData.section_chambres?.chambre_2?.equipements_lit_bebe_60_120 ?? null,
    chambres_chambre_2_equipements_stores: formData.section_chambres?.chambre_2?.equipements_stores ?? null,
    chambres_chambre_2_equipements_television: formData.section_chambres?.chambre_2?.equipements_television ?? null,
    chambres_chambre_2_equipements_oreillers_couvertures_sup: formData.section_chambres?.chambre_2?.equipements_oreillers_couvertures_sup ?? null,
    chambres_chambre_2_equipements_chauffage: formData.section_chambres?.chambre_2?.equipements_chauffage ?? null,
    chambres_chambre_2_equipements_cintres: formData.section_chambres?.chambre_2?.equipements_cintres ?? null,
    chambres_chambre_2_equipements_moustiquaire: formData.section_chambres?.chambre_2?.equipements_moustiquaire ?? null,
    chambres_chambre_2_equipements_lit_parapluie_60_120: formData.section_chambres?.chambre_2?.equipements_lit_parapluie_60_120 ?? null,
    chambres_chambre_2_equipements_systeme_audio: formData.section_chambres?.chambre_2?.equipements_systeme_audio ?? null,
    chambres_chambre_2_equipements_coffre_fort: formData.section_chambres?.chambre_2?.equipements_coffre_fort ?? null,
    chambres_chambre_2_equipements_autre: formData.section_chambres?.chambre_2?.equipements_autre ?? null,
    chambres_chambre_2_equipements_autre_details: formData.section_chambres?.chambre_2?.equipements_autre_details || null,
    chambres_chambre_2_photos_chambre: formData.section_chambres?.chambre_2?.photos_chambre || [],

    // CHAMBRE 3
    chambres_chambre_3_nom_description: formData.section_chambres?.chambre_3?.nom_description || null,
    chambres_chambre_3_lit_simple_90_190: formData.section_chambres?.chambre_3?.lit_simple_90_190 || 0,
    chambres_chambre_3_lit_double_140_190: formData.section_chambres?.chambre_3?.lit_double_140_190 || 0,
    chambres_chambre_3_lit_queen_160_200: formData.section_chambres?.chambre_3?.lit_queen_160_200 || 0,
    chambres_chambre_3_lit_king_180_200: formData.section_chambres?.chambre_3?.lit_king_180_200 || 0,
    chambres_chambre_3_canape_lit_simple: formData.section_chambres?.chambre_3?.canape_lit_simple || 0,
    chambres_chambre_3_canape_lit_double: formData.section_chambres?.chambre_3?.canape_lit_double || 0,
    chambres_chambre_3_lits_superposes_90_190: formData.section_chambres?.chambre_3?.lits_superposes_90_190 || 0,
    chambres_chambre_3_lit_gigogne: formData.section_chambres?.chambre_3?.lit_gigogne || 0,
    chambres_chambre_3_autre_type_lit: formData.section_chambres?.chambre_3?.autre_type_lit || null,
    chambres_chambre_3_equipements_draps_fournis: formData.section_chambres?.chambre_3?.equipements_draps_fournis ?? null,
    chambres_chambre_3_equipements_climatisation: formData.section_chambres?.chambre_3?.equipements_climatisation ?? null,
    chambres_chambre_3_equipements_ventilateur_plafond: formData.section_chambres?.chambre_3?.equipements_ventilateur_plafond ?? null,
    chambres_chambre_3_equipements_espace_rangement: formData.section_chambres?.chambre_3?.equipements_espace_rangement ?? null,
    chambres_chambre_3_equipements_lit_bebe_60_120: formData.section_chambres?.chambre_3?.equipements_lit_bebe_60_120 ?? null,
    chambres_chambre_3_equipements_stores: formData.section_chambres?.chambre_3?.equipements_stores ?? null,
    chambres_chambre_3_equipements_television: formData.section_chambres?.chambre_3?.equipements_television ?? null,
    chambres_chambre_3_equipements_oreillers_couvertures_sup: formData.section_chambres?.chambre_3?.equipements_oreillers_couvertures_sup ?? null,
    chambres_chambre_3_equipements_chauffage: formData.section_chambres?.chambre_3?.equipements_chauffage ?? null,
    chambres_chambre_3_equipements_cintres: formData.section_chambres?.chambre_3?.equipements_cintres ?? null,
    chambres_chambre_3_equipements_moustiquaire: formData.section_chambres?.chambre_3?.equipements_moustiquaire ?? null,
    chambres_chambre_3_equipements_lit_parapluie_60_120: formData.section_chambres?.chambre_3?.equipements_lit_parapluie_60_120 ?? null,
    chambres_chambre_3_equipements_systeme_audio: formData.section_chambres?.chambre_3?.equipements_systeme_audio ?? null,
    chambres_chambre_3_equipements_coffre_fort: formData.section_chambres?.chambre_3?.equipements_coffre_fort ?? null,
    chambres_chambre_3_equipements_autre: formData.section_chambres?.chambre_3?.equipements_autre ?? null,
    chambres_chambre_3_equipements_autre_details: formData.section_chambres?.chambre_3?.equipements_autre_details || null,
    chambres_chambre_3_photos_chambre: formData.section_chambres?.chambre_3?.photos_chambre || [],

    // CHAMBRE 4
    chambres_chambre_4_nom_description: formData.section_chambres?.chambre_4?.nom_description || null,
    chambres_chambre_4_lit_simple_90_190: formData.section_chambres?.chambre_4?.lit_simple_90_190 || 0,
    chambres_chambre_4_lit_double_140_190: formData.section_chambres?.chambre_4?.lit_double_140_190 || 0,
    chambres_chambre_4_lit_queen_160_200: formData.section_chambres?.chambre_4?.lit_queen_160_200 || 0,
    chambres_chambre_4_lit_king_180_200: formData.section_chambres?.chambre_4?.lit_king_180_200 || 0,
    chambres_chambre_4_canape_lit_simple: formData.section_chambres?.chambre_4?.canape_lit_simple || 0,
    chambres_chambre_4_canape_lit_double: formData.section_chambres?.chambre_4?.canape_lit_double || 0,
    chambres_chambre_4_lits_superposes_90_190: formData.section_chambres?.chambre_4?.lits_superposes_90_190 || 0,
    chambres_chambre_4_lit_gigogne: formData.section_chambres?.chambre_4?.lit_gigogne || 0,
    chambres_chambre_4_autre_type_lit: formData.section_chambres?.chambre_4?.autre_type_lit || null,
    chambres_chambre_4_equipements_draps_fournis: formData.section_chambres?.chambre_4?.equipements_draps_fournis ?? null,
    chambres_chambre_4_equipements_climatisation: formData.section_chambres?.chambre_4?.equipements_climatisation ?? null,
    chambres_chambre_4_equipements_ventilateur_plafond: formData.section_chambres?.chambre_4?.equipements_ventilateur_plafond ?? null,
    chambres_chambre_4_equipements_espace_rangement: formData.section_chambres?.chambre_4?.equipements_espace_rangement ?? null,
    chambres_chambre_4_equipements_lit_bebe_60_120: formData.section_chambres?.chambre_4?.equipements_lit_bebe_60_120 ?? null,
    chambres_chambre_4_equipements_stores: formData.section_chambres?.chambre_4?.equipements_stores ?? null,
    chambres_chambre_4_equipements_television: formData.section_chambres?.chambre_4?.equipements_television ?? null,
    chambres_chambre_4_equipements_oreillers_couvertures_sup: formData.section_chambres?.chambre_4?.equipements_oreillers_couvertures_sup ?? null,
    chambres_chambre_4_equipements_chauffage: formData.section_chambres?.chambre_4?.equipements_chauffage ?? null,
    chambres_chambre_4_equipements_cintres: formData.section_chambres?.chambre_4?.equipements_cintres ?? null,
    chambres_chambre_4_equipements_moustiquaire: formData.section_chambres?.chambre_4?.equipements_moustiquaire ?? null,
    chambres_chambre_4_equipements_lit_parapluie_60_120: formData.section_chambres?.chambre_4?.equipements_lit_parapluie_60_120 ?? null,
    chambres_chambre_4_equipements_systeme_audio: formData.section_chambres?.chambre_4?.equipements_systeme_audio ?? null,
    chambres_chambre_4_equipements_coffre_fort: formData.section_chambres?.chambre_4?.equipements_coffre_fort ?? null,
    chambres_chambre_4_equipements_autre: formData.section_chambres?.chambre_4?.equipements_autre ?? null,
    chambres_chambre_4_equipements_autre_details: formData.section_chambres?.chambre_4?.equipements_autre_details || null,
    chambres_chambre_4_photos_chambre: formData.section_chambres?.chambre_4?.photos_chambre || [],

    // CHAMBRE 5
    chambres_chambre_5_nom_description: formData.section_chambres?.chambre_5?.nom_description || null,
    chambres_chambre_5_lit_simple_90_190: formData.section_chambres?.chambre_5?.lit_simple_90_190 || 0,
    chambres_chambre_5_lit_double_140_190: formData.section_chambres?.chambre_5?.lit_double_140_190 || 0,
    chambres_chambre_5_lit_queen_160_200: formData.section_chambres?.chambre_5?.lit_queen_160_200 || 0,
    chambres_chambre_5_lit_king_180_200: formData.section_chambres?.chambre_5?.lit_king_180_200 || 0,
    chambres_chambre_5_canape_lit_simple: formData.section_chambres?.chambre_5?.canape_lit_simple || 0,
    chambres_chambre_5_canape_lit_double: formData.section_chambres?.chambre_5?.canape_lit_double || 0,
    chambres_chambre_5_lits_superposes_90_190: formData.section_chambres?.chambre_5?.lits_superposes_90_190 || 0,
    chambres_chambre_5_lit_gigogne: formData.section_chambres?.chambre_5?.lit_gigogne || 0,
    chambres_chambre_5_autre_type_lit: formData.section_chambres?.chambre_5?.autre_type_lit || null,
    chambres_chambre_5_equipements_draps_fournis: formData.section_chambres?.chambre_5?.equipements_draps_fournis ?? null,
    chambres_chambre_5_equipements_climatisation: formData.section_chambres?.chambre_5?.equipements_climatisation ?? null,
    chambres_chambre_5_equipements_ventilateur_plafond: formData.section_chambres?.chambre_5?.equipements_ventilateur_plafond ?? null,
    chambres_chambre_5_equipements_espace_rangement: formData.section_chambres?.chambre_5?.equipements_espace_rangement ?? null,
    chambres_chambre_5_equipements_lit_bebe_60_120: formData.section_chambres?.chambre_5?.equipements_lit_bebe_60_120 ?? null,
    chambres_chambre_5_equipements_stores: formData.section_chambres?.chambre_5?.equipements_stores ?? null,
    chambres_chambre_5_equipements_television: formData.section_chambres?.chambre_5?.equipements_television ?? null,
    chambres_chambre_5_equipements_oreillers_couvertures_sup: formData.section_chambres?.chambre_5?.equipements_oreillers_couvertures_sup ?? null,
    chambres_chambre_5_equipements_chauffage: formData.section_chambres?.chambre_5?.equipements_chauffage ?? null,
    chambres_chambre_5_equipements_cintres: formData.section_chambres?.chambre_5?.equipements_cintres ?? null,
    chambres_chambre_5_equipements_moustiquaire: formData.section_chambres?.chambre_5?.equipements_moustiquaire ?? null,
    chambres_chambre_5_equipements_lit_parapluie_60_120: formData.section_chambres?.chambre_5?.equipements_lit_parapluie_60_120 ?? null,
    chambres_chambre_5_equipements_systeme_audio: formData.section_chambres?.chambre_5?.equipements_systeme_audio ?? null,
    chambres_chambre_5_equipements_coffre_fort: formData.section_chambres?.chambre_5?.equipements_coffre_fort ?? null,
    chambres_chambre_5_equipements_autre: formData.section_chambres?.chambre_5?.equipements_autre ?? null,
    chambres_chambre_5_equipements_autre_details: formData.section_chambres?.chambre_5?.equipements_autre_details || null,
    chambres_chambre_5_photos_chambre: formData.section_chambres?.chambre_5?.photos_chambre || [],

    // CHAMBRE 6
    chambres_chambre_6_nom_description: formData.section_chambres?.chambre_6?.nom_description || null,
    chambres_chambre_6_lit_simple_90_190: formData.section_chambres?.chambre_6?.lit_simple_90_190 || 0,
    chambres_chambre_6_lit_double_140_190: formData.section_chambres?.chambre_6?.lit_double_140_190 || 0,
    chambres_chambre_6_lit_queen_160_200: formData.section_chambres?.chambre_6?.lit_queen_160_200 || 0,
    chambres_chambre_6_lit_king_180_200: formData.section_chambres?.chambre_6?.lit_king_180_200 || 0,
    chambres_chambre_6_canape_lit_simple: formData.section_chambres?.chambre_6?.canape_lit_simple || 0,
    chambres_chambre_6_canape_lit_double: formData.section_chambres?.chambre_6?.canape_lit_double || 0,
    chambres_chambre_6_lits_superposes_90_190: formData.section_chambres?.chambre_6?.lits_superposes_90_190 || 0,
    chambres_chambre_6_lit_gigogne: formData.section_chambres?.chambre_6?.lit_gigogne || 0,
    chambres_chambre_6_autre_type_lit: formData.section_chambres?.chambre_6?.autre_type_lit || null,
    chambres_chambre_6_equipements_draps_fournis: formData.section_chambres?.chambre_6?.equipements_draps_fournis ?? null,
    chambres_chambre_6_equipements_climatisation: formData.section_chambres?.chambre_6?.equipements_climatisation ?? null,
    chambres_chambre_6_equipements_ventilateur_plafond: formData.section_chambres?.chambre_6?.equipements_ventilateur_plafond ?? null,
    chambres_chambre_6_equipements_espace_rangement: formData.section_chambres?.chambre_6?.equipements_espace_rangement ?? null,
    chambres_chambre_6_equipements_lit_bebe_60_120: formData.section_chambres?.chambre_6?.equipements_lit_bebe_60_120 ?? null,
    chambres_chambre_6_equipements_stores: formData.section_chambres?.chambre_6?.equipements_stores ?? null,
    chambres_chambre_6_equipements_television: formData.section_chambres?.chambre_6?.equipements_television ?? null,
    chambres_chambre_6_equipements_oreillers_couvertures_sup: formData.section_chambres?.chambre_6?.equipements_oreillers_couvertures_sup ?? null,
    chambres_chambre_6_equipements_chauffage: formData.section_chambres?.chambre_6?.equipements_chauffage ?? null,
    chambres_chambre_6_equipements_cintres: formData.section_chambres?.chambre_6?.equipements_cintres ?? null,
    chambres_chambre_6_equipements_moustiquaire: formData.section_chambres?.chambre_6?.equipements_moustiquaire ?? null,
    chambres_chambre_6_equipements_lit_parapluie_60_120: formData.section_chambres?.chambre_6?.equipements_lit_parapluie_60_120 ?? null,
    chambres_chambre_6_equipements_systeme_audio: formData.section_chambres?.chambre_6?.equipements_systeme_audio ?? null,
    chambres_chambre_6_equipements_coffre_fort: formData.section_chambres?.chambre_6?.equipements_coffre_fort ?? null,
    chambres_chambre_6_equipements_autre: formData.section_chambres?.chambre_6?.equipements_autre ?? null,
    chambres_chambre_6_equipements_autre_details: formData.section_chambres?.chambre_6?.equipements_autre_details || null,
    chambres_chambre_6_photos_chambre: formData.section_chambres?.chambre_6?.photos_chambre || [],

// Section Salle de Bains (96 champs)
    // SALLE DE BAIN 1
    salle_de_bains_salle_de_bain_1_nom_description: formData.section_salle_de_bains?.salle_de_bain_1?.nom_description || null,
    salle_de_bains_salle_de_bain_1_equipements_douche: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_douche ?? null,
    salle_de_bains_salle_de_bain_1_equipements_baignoire: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_baignoire ?? null,
    salle_de_bains_salle_de_bain_1_equipements_douche_baignoire_com: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_douche_baignoire_combinees ?? null,
    salle_de_bains_salle_de_bain_1_equipements_double_vasque: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_double_vasque ?? null,
    salle_de_bains_salle_de_bain_1_equipements_wc: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_wc ?? null,
    salle_de_bains_salle_de_bain_1_equipements_bidet: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_bidet ?? null,
    salle_de_bains_salle_de_bain_1_equipements_chauffage: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_chauffage ?? null,
    salle_de_bains_salle_de_bain_1_equipements_lave_linge: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_lave_linge ?? null,
    salle_de_bains_salle_de_bain_1_equipements_seche_serviette: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_seche_serviette ?? null,
    salle_de_bains_salle_de_bain_1_equipements_seche_cheveux: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_seche_cheveux ?? null,
    salle_de_bains_salle_de_bain_1_equipements_autre: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_autre ?? null,
    salle_de_bains_salle_de_bain_1_equipements_autre_details: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_autre_details || null,
    salle_de_bains_salle_de_bain_1_wc_separe: formData.section_salle_de_bains?.salle_de_bain_1?.wc_separe ?? null,
    salle_de_bains_salle_de_bain_1_acces: formData.section_salle_de_bains?.salle_de_bain_1?.acces || null,
    salle_de_bains_salle_de_bain_1_photos_salle_de_bain: formData.section_salle_de_bains?.salle_de_bain_1?.photos_salle_de_bain || [],

    // SALLE DE BAIN 2
    salle_de_bains_salle_de_bain_2_nom_description: formData.section_salle_de_bains?.salle_de_bain_2?.nom_description || null,
    salle_de_bains_salle_de_bain_2_equipements_douche: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_douche ?? null,
    salle_de_bains_salle_de_bain_2_equipements_baignoire: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_baignoire ?? null,
    salle_de_bains_salle_de_bain_2_equipements_douche_baignoire_com: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_douche_baignoire_combinees ?? null,
    salle_de_bains_salle_de_bain_2_equipements_double_vasque: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_double_vasque ?? null,
    salle_de_bains_salle_de_bain_2_equipements_wc: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_wc ?? null,
    salle_de_bains_salle_de_bain_2_equipements_bidet: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_bidet ?? null,
    salle_de_bains_salle_de_bain_2_equipements_chauffage: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_chauffage ?? null,
    salle_de_bains_salle_de_bain_2_equipements_lave_linge: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_lave_linge ?? null,
    salle_de_bains_salle_de_bain_2_equipements_seche_serviette: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_seche_serviette ?? null,
    salle_de_bains_salle_de_bain_2_equipements_seche_cheveux: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_seche_cheveux ?? null,
    salle_de_bains_salle_de_bain_2_equipements_autre: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_autre ?? null,
    salle_de_bains_salle_de_bain_2_equipements_autre_details: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_autre_details || null,
    salle_de_bains_salle_de_bain_2_wc_separe: formData.section_salle_de_bains?.salle_de_bain_2?.wc_separe ?? null,
    salle_de_bains_salle_de_bain_2_acces: formData.section_salle_de_bains?.salle_de_bain_2?.acces || null,
    salle_de_bains_salle_de_bain_2_photos_salle_de_bain: formData.section_salle_de_bains?.salle_de_bain_2?.photos_salle_de_bain || [],

    // SALLE DE BAIN 3
    salle_de_bains_salle_de_bain_3_nom_description: formData.section_salle_de_bains?.salle_de_bain_3?.nom_description || null,
    salle_de_bains_salle_de_bain_3_equipements_douche: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_douche ?? null,
    salle_de_bains_salle_de_bain_3_equipements_baignoire: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_baignoire ?? null,
    salle_de_bains_salle_de_bain_3_equipements_douche_baignoire_com: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_douche_baignoire_combinees ?? null,
    salle_de_bains_salle_de_bain_3_equipements_double_vasque: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_double_vasque ?? null,
    salle_de_bains_salle_de_bain_3_equipements_wc: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_wc ?? null,
    salle_de_bains_salle_de_bain_3_equipements_bidet: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_bidet ?? null,
    salle_de_bains_salle_de_bain_3_equipements_chauffage: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_chauffage ?? null,
    salle_de_bains_salle_de_bain_3_equipements_lave_linge: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_lave_linge ?? null,
    salle_de_bains_salle_de_bain_3_equipements_seche_serviette: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_seche_serviette ?? null,
    salle_de_bains_salle_de_bain_3_equipements_seche_cheveux: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_seche_cheveux ?? null,
    salle_de_bains_salle_de_bain_3_equipements_autre: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_autre ?? null,
    salle_de_bains_salle_de_bain_3_equipements_autre_details: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_autre_details || null,
    salle_de_bains_salle_de_bain_3_wc_separe: formData.section_salle_de_bains?.salle_de_bain_3?.wc_separe ?? null,
    salle_de_bains_salle_de_bain_3_acces: formData.section_salle_de_bains?.salle_de_bain_3?.acces || null,
    salle_de_bains_salle_de_bain_3_photos_salle_de_bain: formData.section_salle_de_bains?.salle_de_bain_3?.photos_salle_de_bain || [],

    // SALLE DE BAIN 4
    salle_de_bains_salle_de_bain_4_nom_description: formData.section_salle_de_bains?.salle_de_bain_4?.nom_description || null,
    salle_de_bains_salle_de_bain_4_equipements_douche: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_douche ?? null,
    salle_de_bains_salle_de_bain_4_equipements_baignoire: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_baignoire ?? null,
    salle_de_bains_salle_de_bain_4_equipements_douche_baignoire_com: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_douche_baignoire_combinees ?? null,
    salle_de_bains_salle_de_bain_4_equipements_double_vasque: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_double_vasque ?? null,
    salle_de_bains_salle_de_bain_4_equipements_wc: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_wc ?? null,
    salle_de_bains_salle_de_bain_4_equipements_bidet: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_bidet ?? null,
    salle_de_bains_salle_de_bain_4_equipements_chauffage: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_chauffage ?? null,
    salle_de_bains_salle_de_bain_4_equipements_lave_linge: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_lave_linge ?? null,
    salle_de_bains_salle_de_bain_4_equipements_seche_serviette: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_seche_serviette ?? null,
    salle_de_bains_salle_de_bain_4_equipements_seche_cheveux: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_seche_cheveux ?? null,
    salle_de_bains_salle_de_bain_4_equipements_autre: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_autre ?? null,
    salle_de_bains_salle_de_bain_4_equipements_autre_details: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_autre_details || null,
    salle_de_bains_salle_de_bain_4_wc_separe: formData.section_salle_de_bains?.salle_de_bain_4?.wc_separe ?? null,
    salle_de_bains_salle_de_bain_4_acces: formData.section_salle_de_bains?.salle_de_bain_4?.acces || null,
    salle_de_bains_salle_de_bain_4_photos_salle_de_bain: formData.section_salle_de_bains?.salle_de_bain_4?.photos_salle_de_bain || [],

    // SALLE DE BAIN 5
    salle_de_bains_salle_de_bain_5_nom_description: formData.section_salle_de_bains?.salle_de_bain_5?.nom_description || null,
    salle_de_bains_salle_de_bain_5_equipements_douche: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_douche ?? null,
    salle_de_bains_salle_de_bain_5_equipements_baignoire: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_baignoire ?? null,
    salle_de_bains_salle_de_bain_5_equipements_douche_baignoire_com: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_douche_baignoire_combinees ?? null,
    salle_de_bains_salle_de_bain_5_equipements_double_vasque: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_double_vasque ?? null,
    salle_de_bains_salle_de_bain_5_equipements_wc: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_wc ?? null,
    salle_de_bains_salle_de_bain_5_equipements_bidet: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_bidet ?? null,
    salle_de_bains_salle_de_bain_5_equipements_chauffage: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_chauffage ?? null,
    salle_de_bains_salle_de_bain_5_equipements_lave_linge: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_lave_linge ?? null,
    salle_de_bains_salle_de_bain_5_equipements_seche_serviette: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_seche_serviette ?? null,
    salle_de_bains_salle_de_bain_5_equipements_seche_cheveux: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_seche_cheveux ?? null,
    salle_de_bains_salle_de_bain_5_equipements_autre: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_autre ?? null,
    salle_de_bains_salle_de_bain_5_equipements_autre_details: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_autre_details || null,
    salle_de_bains_salle_de_bain_5_wc_separe: formData.section_salle_de_bains?.salle_de_bain_5?.wc_separe ?? null,
    salle_de_bains_salle_de_bain_5_acces: formData.section_salle_de_bains?.salle_de_bain_5?.acces || null,
    salle_de_bains_salle_de_bain_5_photos_salle_de_bain: formData.section_salle_de_bains?.salle_de_bain_5?.photos_salle_de_bain || [],

    // SALLE DE BAIN 6
    salle_de_bains_salle_de_bain_6_nom_description: formData.section_salle_de_bains?.salle_de_bain_6?.nom_description || null,
    salle_de_bains_salle_de_bain_6_equipements_douche: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_douche ?? null,
    salle_de_bains_salle_de_bain_6_equipements_baignoire: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_baignoire ?? null,
    salle_de_bains_salle_de_bain_6_equipements_douche_baignoire_com: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_douche_baignoire_combinees ?? null,
    salle_de_bains_salle_de_bain_6_equipements_double_vasque: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_double_vasque ?? null,
    salle_de_bains_salle_de_bain_6_equipements_wc: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_wc ?? null,
    salle_de_bains_salle_de_bain_6_equipements_bidet: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_bidet ?? null,
    salle_de_bains_salle_de_bain_6_equipements_chauffage: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_chauffage ?? null,
    salle_de_bains_salle_de_bain_6_equipements_lave_linge: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_lave_linge ?? null,
    salle_de_bains_salle_de_bain_6_equipements_seche_serviette: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_seche_serviette ?? null,
    salle_de_bains_salle_de_bain_6_equipements_seche_cheveux: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_seche_cheveux ?? null,
    salle_de_bains_salle_de_bain_6_equipements_autre: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_autre ?? null,
    salle_de_bains_salle_de_bain_6_equipements_autre_details: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_autre_details || null,
    salle_de_bains_salle_de_bain_6_wc_separe: formData.section_salle_de_bains?.salle_de_bain_6?.wc_separe ?? null,
    salle_de_bains_salle_de_bain_6_acces: formData.section_salle_de_bains?.salle_de_bain_6?.acces || null,
    salle_de_bains_salle_de_bain_6_photos_salle_de_bain: formData.section_salle_de_bains?.salle_de_bain_6?.photos_salle_de_bain || [],

    // Section Cuisine 1
    cuisine_1_equipements_refrigerateur: formData.section_cuisine_1?.equipements_refrigerateur ?? null,
    cuisine_1_equipements_congelateur: formData.section_cuisine_1?.equipements_congelateur ?? null,
    cuisine_1_equipements_mini_refrigerateur: formData.section_cuisine_1?.equipements_mini_refrigerateur ?? null,
    cuisine_1_equipements_cuisiniere: formData.section_cuisine_1?.equipements_cuisiniere ?? null,
    cuisine_1_equipements_plaque_cuisson: formData.section_cuisine_1?.equipements_plaque_cuisson ?? null,
    cuisine_1_equipements_four: formData.section_cuisine_1?.equipements_four ?? null,
    cuisine_1_equipements_micro_ondes: formData.section_cuisine_1?.equipements_micro_ondes ?? null,
    cuisine_1_equipements_lave_vaisselle: formData.section_cuisine_1?.equipements_lave_vaisselle ?? null,
    cuisine_1_equipements_cafetiere: formData.section_cuisine_1?.equipements_cafetiere ?? null,
    cuisine_1_equipements_bouilloire: formData.section_cuisine_1?.equipements_bouilloire ?? null,
    cuisine_1_equipements_grille_pain: formData.section_cuisine_1?.equipements_grille_pain ?? null,
    cuisine_1_equipements_blender: formData.section_cuisine_1?.equipements_blender ?? null,
    cuisine_1_equipements_cuiseur_riz: formData.section_cuisine_1?.equipements_cuiseur_riz ?? null,
    cuisine_1_equipements_machine_pain: formData.section_cuisine_1?.equipements_machine_pain ?? null,
    cuisine_1_equipements_lave_linge: formData.section_cuisine_1?.equipements_lave_linge ?? null,
    cuisine_1_equipements_autre: formData.section_cuisine_1?.equipements_autre ?? null,
    cuisine_1_equipements_autre_details: formData.section_cuisine_1?.equipements_autre_details || null,

    // RÉFRIGÉRATEUR - Champs conditionnels
    cuisine_1_refrigerateur_marque: formData.section_cuisine_1?.refrigerateur_marque || null,
    cuisine_1_refrigerateur_instructions: formData.section_cuisine_1?.refrigerateur_instructions || null,
    cuisine_1_refrigerateur_video: formData.section_cuisine_1?.refrigerateur_video ?? null,

    // CONGÉLATEUR - Champs conditionnels
    cuisine_1_congelateur_instructions: formData.section_cuisine_1?.congelateur_instructions || null,
    cuisine_1_congelateur_video: formData.section_cuisine_1?.congelateur_video ?? null,

    // MINI RÉFRIGÉRATEUR - Champs conditionnels
    cuisine_1_mini_refrigerateur_instructions: formData.section_cuisine_1?.mini_refrigerateur_instructions || null,
    cuisine_1_mini_refrigerateur_video: formData.section_cuisine_1?.mini_refrigerateur_video ?? null,

    // CUISINIÈRE - Champs conditionnels
    cuisine_1_cuisiniere_marque: formData.section_cuisine_1?.cuisiniere_marque || null,
    cuisine_1_cuisiniere_type: formData.section_cuisine_1?.cuisiniere_type || null,
    cuisine_1_cuisiniere_nombre_feux: formData.section_cuisine_1?.cuisiniere_nombre_feux ? parseInt(formData.section_cuisine_1.cuisiniere_nombre_feux) : null,
    cuisine_1_cuisiniere_instructions: formData.section_cuisine_1?.cuisiniere_instructions || null,
    cuisine_1_cuisiniere_photo: formData.section_cuisine_1?.cuisiniere_photo || [],
    cuisine_1_cuisiniere_video: formData.section_cuisine_1?.cuisiniere_video ?? null,

    // PLAQUE DE CUISSON - Champs conditionnels
    cuisine_1_plaque_cuisson_marque: formData.section_cuisine_1?.plaque_cuisson_marque || null,
    cuisine_1_plaque_cuisson_type: formData.section_cuisine_1?.plaque_cuisson_type || null,
    cuisine_1_plaque_cuisson_nombre_feux: formData.section_cuisine_1?.plaque_cuisson_nombre_feux ? parseInt(formData.section_cuisine_1.plaque_cuisson_nombre_feux) : null,
    cuisine_1_plaque_cuisson_instructions: formData.section_cuisine_1?.plaque_cuisson_instructions || null,
    cuisine_1_plaque_cuisson_photo: formData.section_cuisine_1?.plaque_cuisson_photo || [],
    cuisine_1_plaque_cuisson_video: formData.section_cuisine_1?.plaque_cuisson_video ?? null,

    // FOUR - Champs conditionnels
    cuisine_1_four_marque: formData.section_cuisine_1?.four_marque || null,
    cuisine_1_four_type: formData.section_cuisine_1?.four_type || null,
    cuisine_1_four_instructions: formData.section_cuisine_1?.four_instructions || null,
    cuisine_1_four_photo: formData.section_cuisine_1?.four_photo || [],
    cuisine_1_four_video: formData.section_cuisine_1?.four_video ?? null,

    // FOUR À MICRO-ONDES - Champs conditionnels
    cuisine_1_micro_ondes_instructions: formData.section_cuisine_1?.micro_ondes_instructions || null,
    cuisine_1_micro_ondes_photo: formData.section_cuisine_1?.micro_ondes_photo || [],
    cuisine_1_micro_ondes_video: formData.section_cuisine_1?.micro_ondes_video ?? null,

    // LAVE-VAISSELLE - Champs conditionnels
    cuisine_1_lave_vaisselle_instructions: formData.section_cuisine_1?.lave_vaisselle_instructions || null,
    cuisine_1_lave_vaisselle_photo: formData.section_cuisine_1?.lave_vaisselle_photo || [],
    cuisine_1_lave_vaisselle_video: formData.section_cuisine_1?.lave_vaisselle_video ?? null,

    // CAFETIÈRE - Champs conditionnels
    cuisine_1_cafetiere_marque: formData.section_cuisine_1?.cafetiere_marque || null,
    cuisine_1_cafetiere_type_filtre: formData.section_cuisine_1?.cafetiere_type_filtre ?? null,
    cuisine_1_cafetiere_type_expresso: formData.section_cuisine_1?.cafetiere_type_expresso ?? null,
    cuisine_1_cafetiere_type_piston: formData.section_cuisine_1?.cafetiere_type_piston ?? null,
    cuisine_1_cafetiere_type_keurig: formData.section_cuisine_1?.cafetiere_type_keurig ?? null,
    cuisine_1_cafetiere_type_nespresso: formData.section_cuisine_1?.cafetiere_type_nespresso ?? null,
    cuisine_1_cafetiere_type_manuelle: formData.section_cuisine_1?.cafetiere_type_manuelle ?? null,
    cuisine_1_cafetiere_type_bar_grain: formData.section_cuisine_1?.cafetiere_type_bar_grain ?? null,
    cuisine_1_cafetiere_type_bar_moulu: formData.section_cuisine_1?.cafetiere_type_bar_moulu ?? null,
    cuisine_1_cafetiere_instructions: formData.section_cuisine_1?.cafetiere_instructions || null,
    cuisine_1_cafetiere_photo: formData.section_cuisine_1?.cafetiere_photo || [],
    cuisine_1_cafetiere_video: formData.section_cuisine_1?.cafetiere_video ?? null,
    cuisine_1_cafetiere_cafe_fourni: formData.section_cuisine_1?.cafetiere_cafe_fourni || null,
    cuisine_1_cafetiere_marque_cafe: formData.section_cuisine_1?.cafetiere_marque_cafe || null,

    // BOUILLOIRE ÉLECTRIQUE - Champs conditionnels
    cuisine_1_bouilloire_instructions: formData.section_cuisine_1?.bouilloire_instructions || null,
    cuisine_1_bouilloire_video: formData.section_cuisine_1?.bouilloire_video ?? null,

    // GRILLE-PAIN - Champs conditionnels
    cuisine_1_grille_pain_instructions: formData.section_cuisine_1?.grille_pain_instructions || null,
    cuisine_1_grille_pain_video: formData.section_cuisine_1?.grille_pain_video ?? null,

    // BLENDER - Champs conditionnels
    cuisine_1_blender_instructions: formData.section_cuisine_1?.blender_instructions || null,
    cuisine_1_blender_video: formData.section_cuisine_1?.blender_video ?? null,

    // CUISEUR À RIZ - Champs conditionnels
    cuisine_1_cuiseur_riz_instructions: formData.section_cuisine_1?.cuiseur_riz_instructions || null,
    cuisine_1_cuiseur_riz_video: formData.section_cuisine_1?.cuiseur_riz_video ?? null,

    // MACHINE À PAIN - Champs conditionnels
    cuisine_1_machine_pain_instructions: formData.section_cuisine_1?.machine_pain_instructions || null,
    cuisine_1_machine_pain_video: formData.section_cuisine_1?.machine_pain_video ?? null,

    // Section Cuisine 2 - Ustensiles
    // VAISSELLE (4 compteurs)
    cuisine_2_vaisselle_assiettes_plates: formData.section_cuisine_2?.vaisselle_assiettes_plates ? parseInt(formData.section_cuisine_2.vaisselle_assiettes_plates) : 0,
    cuisine_2_vaisselle_assiettes_dessert: formData.section_cuisine_2?.vaisselle_assiettes_dessert ? parseInt(formData.section_cuisine_2.vaisselle_assiettes_dessert) : 0,
    cuisine_2_vaisselle_assiettes_creuses: formData.section_cuisine_2?.vaisselle_assiettes_creuses ? parseInt(formData.section_cuisine_2.vaisselle_assiettes_creuses) : 0,
    cuisine_2_vaisselle_bols: formData.section_cuisine_2?.vaisselle_bols ? parseInt(formData.section_cuisine_2.vaisselle_bols) : 0,

    // COUVERTS (11 compteurs)
    cuisine_2_couverts_verres_eau: formData.section_cuisine_2?.couverts_verres_eau ? parseInt(formData.section_cuisine_2.couverts_verres_eau) : 0,
    cuisine_2_couverts_verres_vin: formData.section_cuisine_2?.couverts_verres_vin ? parseInt(formData.section_cuisine_2.couverts_verres_vin) : 0,
    cuisine_2_couverts_tasses: formData.section_cuisine_2?.couverts_tasses ? parseInt(formData.section_cuisine_2.couverts_tasses) : 0,
    cuisine_2_couverts_flutes_champagne: formData.section_cuisine_2?.couverts_flutes_champagne ? parseInt(formData.section_cuisine_2.couverts_flutes_champagne) : 0,
    cuisine_2_couverts_mugs: formData.section_cuisine_2?.couverts_mugs ? parseInt(formData.section_cuisine_2.couverts_mugs) : 0,
    cuisine_2_couverts_couteaux_table: formData.section_cuisine_2?.couverts_couteaux_table ? parseInt(formData.section_cuisine_2.couverts_couteaux_table) : 0,
    cuisine_2_couverts_fourchettes: formData.section_cuisine_2?.couverts_fourchettes ? parseInt(formData.section_cuisine_2.couverts_fourchettes) : 0,
    cuisine_2_couverts_couteaux_steak: formData.section_cuisine_2?.couverts_couteaux_steak ? parseInt(formData.section_cuisine_2.couverts_couteaux_steak) : 0,
    cuisine_2_couverts_cuilleres_soupe: formData.section_cuisine_2?.couverts_cuilleres_soupe ? parseInt(formData.section_cuisine_2.couverts_cuilleres_soupe) : 0,
    cuisine_2_couverts_cuilleres_cafe: formData.section_cuisine_2?.couverts_cuilleres_cafe ? parseInt(formData.section_cuisine_2.couverts_cuilleres_cafe) : 0,
    cuisine_2_couverts_cuilleres_dessert: formData.section_cuisine_2?.couverts_cuilleres_dessert ? parseInt(formData.section_cuisine_2.couverts_cuilleres_dessert) : 0,

    // USTENSILES DE CUISINE (26 compteurs)
    cuisine_2_ustensiles_poeles_differentes_tailles: formData.section_cuisine_2?.ustensiles_poeles_differentes_tailles ? parseInt(formData.section_cuisine_2.ustensiles_poeles_differentes_tailles) : 0,
    cuisine_2_ustensiles_casseroles_differentes_tailles: formData.section_cuisine_2?.ustensiles_casseroles_differentes_tailles ? parseInt(formData.section_cuisine_2.ustensiles_casseroles_differentes_tailles) : 0,
    cuisine_2_ustensiles_faitouts: formData.section_cuisine_2?.ustensiles_faitouts ? parseInt(formData.section_cuisine_2.ustensiles_faitouts) : 0,
    cuisine_2_ustensiles_wok: formData.section_cuisine_2?.ustensiles_wok ? parseInt(formData.section_cuisine_2.ustensiles_wok) : 0,
    cuisine_2_ustensiles_cocotte_minute: formData.section_cuisine_2?.ustensiles_cocotte_minute ? parseInt(formData.section_cuisine_2.ustensiles_cocotte_minute) : 0,
    cuisine_2_ustensiles_couvercle_anti_eclaboussures: formData.section_cuisine_2?.ustensiles_couvercle_anti_eclaboussures ? parseInt(formData.section_cuisine_2.ustensiles_couvercle_anti_eclaboussures) : 0,
    cuisine_2_ustensiles_robot_cuisine: formData.section_cuisine_2?.ustensiles_robot_cuisine ? parseInt(formData.section_cuisine_2.ustensiles_robot_cuisine) : 0,
    cuisine_2_ustensiles_batteur_electrique: formData.section_cuisine_2?.ustensiles_batteur_electrique ? parseInt(formData.section_cuisine_2.ustensiles_batteur_electrique) : 0,
    cuisine_2_ustensiles_couteaux_cuisine: formData.section_cuisine_2?.ustensiles_couteaux_cuisine ? parseInt(formData.section_cuisine_2.ustensiles_couteaux_cuisine) : 0,
    cuisine_2_ustensiles_spatules: formData.section_cuisine_2?.ustensiles_spatules ? parseInt(formData.section_cuisine_2.ustensiles_spatules) : 0,
    cuisine_2_ustensiles_ecumoire: formData.section_cuisine_2?.ustensiles_ecumoire ? parseInt(formData.section_cuisine_2.ustensiles_ecumoire) : 0,
    cuisine_2_ustensiles_ouvre_boite: formData.section_cuisine_2?.ustensiles_ouvre_boite ? parseInt(formData.section_cuisine_2.ustensiles_ouvre_boite) : 0,
    cuisine_2_ustensiles_rape: formData.section_cuisine_2?.ustensiles_rape ? parseInt(formData.section_cuisine_2.ustensiles_rape) : 0,
    cuisine_2_ustensiles_tire_bouchon: formData.section_cuisine_2?.ustensiles_tire_bouchon ? parseInt(formData.section_cuisine_2.ustensiles_tire_bouchon) : 0,
    cuisine_2_ustensiles_econome: formData.section_cuisine_2?.ustensiles_econome ? parseInt(formData.section_cuisine_2.ustensiles_econome) : 0,
    cuisine_2_ustensiles_passoire: formData.section_cuisine_2?.ustensiles_passoire ? parseInt(formData.section_cuisine_2.ustensiles_passoire) : 0,
    cuisine_2_ustensiles_planche_decouper: formData.section_cuisine_2?.ustensiles_planche_decouper ? parseInt(formData.section_cuisine_2.ustensiles_planche_decouper) : 0,
    cuisine_2_ustensiles_rouleau_patisserie: formData.section_cuisine_2?.ustensiles_rouleau_patisserie ? parseInt(formData.section_cuisine_2.ustensiles_rouleau_patisserie) : 0,
    cuisine_2_ustensiles_ciseaux_cuisine: formData.section_cuisine_2?.ustensiles_ciseaux_cuisine ? parseInt(formData.section_cuisine_2.ustensiles_ciseaux_cuisine) : 0,
    cuisine_2_ustensiles_balance_cuisine: formData.section_cuisine_2?.ustensiles_balance_cuisine ? parseInt(formData.section_cuisine_2.ustensiles_balance_cuisine) : 0,
    cuisine_2_ustensiles_bac_glacon: formData.section_cuisine_2?.ustensiles_bac_glacon ? parseInt(formData.section_cuisine_2.ustensiles_bac_glacon) : 0,
    cuisine_2_ustensiles_pince_cuisine: formData.section_cuisine_2?.ustensiles_pince_cuisine ? parseInt(formData.section_cuisine_2.ustensiles_pince_cuisine) : 0,
    cuisine_2_ustensiles_couteau_huitre: formData.section_cuisine_2?.ustensiles_couteau_huitre ? parseInt(formData.section_cuisine_2.ustensiles_couteau_huitre) : 0,
    cuisine_2_ustensiles_verre_mesureur: formData.section_cuisine_2?.ustensiles_verre_mesureur ? parseInt(formData.section_cuisine_2.ustensiles_verre_mesureur) : 0,
    cuisine_2_ustensiles_presse_agrume_manuel: formData.section_cuisine_2?.ustensiles_presse_agrume_manuel ? parseInt(formData.section_cuisine_2.ustensiles_presse_agrume_manuel) : 0,
    cuisine_2_ustensiles_pichet: formData.section_cuisine_2?.ustensiles_pichet ? parseInt(formData.section_cuisine_2.ustensiles_pichet) : 0,

    // PLATS ET RÉCIPIENTS (11 compteurs)
    cuisine_2_plats_dessous_plat: formData.section_cuisine_2?.plats_dessous_plat ? parseInt(formData.section_cuisine_2.plats_dessous_plat) : 0,
    cuisine_2_plats_plateau: formData.section_cuisine_2?.plats_plateau ? parseInt(formData.section_cuisine_2.plats_plateau) : 0,
    cuisine_2_plats_saladiers: formData.section_cuisine_2?.plats_saladiers ? parseInt(formData.section_cuisine_2.plats_saladiers) : 0,
    cuisine_2_plats_a_four: formData.section_cuisine_2?.plats_a_four ? parseInt(formData.section_cuisine_2.plats_a_four) : 0,
    cuisine_2_plats_carafes: formData.section_cuisine_2?.plats_carafes ? parseInt(formData.section_cuisine_2.plats_carafes) : 0,
    cuisine_2_plats_moules: formData.section_cuisine_2?.plats_moules ? parseInt(formData.section_cuisine_2.plats_moules) : 0,
    cuisine_2_plats_theiere: formData.section_cuisine_2?.plats_theiere ? parseInt(formData.section_cuisine_2.plats_theiere) : 0,
    cuisine_2_plats_cafetiere_piston_filtre: formData.section_cuisine_2?.plats_cafetiere_piston_filtre ? parseInt(formData.section_cuisine_2.plats_cafetiere_piston_filtre) : 0,
    cuisine_2_plats_ustensiles_barbecue: formData.section_cuisine_2?.plats_ustensiles_barbecue ? parseInt(formData.section_cuisine_2.plats_ustensiles_barbecue) : 0,
    cuisine_2_plats_gants_cuisine: formData.section_cuisine_2?.plats_gants_cuisine ? parseInt(formData.section_cuisine_2.plats_gants_cuisine) : 0,
    cuisine_2_plats_maniques: formData.section_cuisine_2?.plats_maniques ? parseInt(formData.section_cuisine_2.plats_maniques) : 0,

    // CHAMPS COMPLÉMENTAIRES
    cuisine_2_autres_ustensiles: formData.section_cuisine_2?.autres_ustensiles || null,
    cuisine_2_quantite_suffisante: formData.section_cuisine_2?.quantite_suffisante ?? null,
    cuisine_2_quantite_insuffisante_details: formData.section_cuisine_2?.quantite_insuffisante_details || null,
    cuisine_2_casseroles_poeles_testees: formData.section_cuisine_2?.casseroles_poeles_testees ?? null,
    cuisine_2_photos_tiroirs_placards: formData.section_cuisine_2?.photos_tiroirs_placards || [],

    // Section Salon / SAM
    // Description générale (obligatoire)
    salon_sam_description_generale: formData.section_salon_sam?.description_generale || null,

    // Équipements (13 checkboxes + autre)
    salon_sam_equipements_table_manger: formData.section_salon_sam?.equipements_table_manger ?? null,
    salon_sam_equipements_chaises: formData.section_salon_sam?.equipements_chaises ?? null,
    salon_sam_equipements_canape: formData.section_salon_sam?.equipements_canape ?? null,
    salon_sam_equipements_canape_lit: formData.section_salon_sam?.equipements_canape_lit ?? null,
    salon_sam_equipements_fauteuils: formData.section_salon_sam?.equipements_fauteuils ?? null,
    salon_sam_equipements_table_basse: formData.section_salon_sam?.equipements_table_basse ?? null,
    salon_sam_equipements_television: formData.section_salon_sam?.equipements_television ?? null,
    salon_sam_equipements_cheminee: formData.section_salon_sam?.equipements_cheminee ?? null,
    salon_sam_equipements_jeux_societe: formData.section_salon_sam?.equipements_jeux_societe ?? null,
    salon_sam_equipements_livres_magazines: formData.section_salon_sam?.equipements_livres_magazines ?? null,
    salon_sam_equipements_livres_jouets_enfants: formData.section_salon_sam?.equipements_livres_jouets_enfants ?? null,
    salon_sam_equipements_climatisation: formData.section_salon_sam?.equipements_climatisation ?? null,
    salon_sam_equipements_chauffage: formData.section_salon_sam?.equipements_chauffage ?? null,
    salon_sam_equipements_autre: formData.section_salon_sam?.equipements_autre ?? null,
    salon_sam_equipements_autre_details: formData.section_salon_sam?.equipements_autre_details || null,

    // Cheminée type (conditionnel)
    salon_sam_cheminee_type: formData.section_salon_sam?.cheminee_type || null,

    // Autres équipements détails (obligatoire)
    salon_sam_autres_equipements_details: formData.section_salon_sam?.autres_equipements_details || null,

    // Photos
    salon_sam_photos_salon_sam: formData.section_salon_sam?.photos_salon_sam || [],

    // Nombre places table (obligatoire)
    salon_sam_nombre_places_table: formData.section_salon_sam?.nombre_places_table ? parseInt(formData.section_salon_sam.nombre_places_table) : null,

    // Section Équipements Spécifiques et Extérieurs
    // CHAMPS RACINES
    equip_spe_ext_dispose_exterieur: formData.section_equip_spe_exterieur?.dispose_exterieur ?? null,
    equip_spe_ext_dispose_piscine: formData.section_equip_spe_exterieur?.dispose_piscine ?? null,
    equip_spe_ext_dispose_jacuzzi: formData.section_equip_spe_exterieur?.dispose_jacuzzi ?? null,
    equip_spe_ext_dispose_cuisine_exterieure: formData.section_equip_spe_exterieur?.dispose_cuisine_exterieure ?? null,

    // BRANCHE EXTÉRIEUR
    equip_spe_ext_exterieur_type_espace: formData.section_equip_spe_exterieur?.exterieur_type_espace || [],
    equip_spe_ext_exterieur_description_generale: formData.section_equip_spe_exterieur?.exterieur_description_generale || null,
    equip_spe_ext_exterieur_entretien_prestataire: formData.section_equip_spe_exterieur?.exterieur_entretien_prestataire ?? null,
    equip_spe_ext_exterieur_entretien_frequence: formData.section_equip_spe_exterieur?.exterieur_entretien_frequence || null,
    equip_spe_ext_exterieur_entretien_type_prestation: formData.section_equip_spe_exterieur?.exterieur_entretien_type_prestation || null,
    equip_spe_ext_exterieur_entretien_qui: formData.section_equip_spe_exterieur?.exterieur_entretien_qui || null,
    equip_spe_ext_exterieur_equipements: formData.section_equip_spe_exterieur?.exterieur_equipements || [],
    equip_spe_ext_exterieur_equipements_autre_details: formData.section_equip_spe_exterieur?.exterieur_equipements_autre_details || null,
    equip_spe_ext_exterieur_nombre_chaises_longues: formData.section_equip_spe_exterieur?.exterieur_nombre_chaises_longues ? parseInt(formData.section_equip_spe_exterieur.exterieur_nombre_chaises_longues) : null,
    equip_spe_ext_exterieur_nombre_parasols: formData.section_equip_spe_exterieur?.exterieur_nombre_parasols ? parseInt(formData.section_equip_spe_exterieur.exterieur_nombre_parasols) : null,
    equip_spe_ext_exterieur_photos: formData.section_equip_spe_exterieur?.exterieur_photos || [],
    equip_spe_ext_exterieur_acces: formData.section_equip_spe_exterieur?.exterieur_acces || null,
    equip_spe_ext_exterieur_type_acces: formData.section_equip_spe_exterieur?.exterieur_type_acces || null,
    equip_spe_ext_exterieur_type_acces_autre_details: formData.section_equip_spe_exterieur?.exterieur_type_acces_autre_details || null,

    // SOUS-BRANCHE BARBECUE
    equip_spe_ext_barbecue_instructions: formData.section_equip_spe_exterieur?.barbecue_instructions || null,
    equip_spe_ext_barbecue_type: formData.section_equip_spe_exterieur?.barbecue_type || null,
    equip_spe_ext_barbecue_combustible_fourni: formData.section_equip_spe_exterieur?.barbecue_combustible_fourni ?? null,
    equip_spe_ext_barbecue_ustensiles_fournis: formData.section_equip_spe_exterieur?.barbecue_ustensiles_fournis ?? null,
    equip_spe_ext_barbecue_photos: formData.section_equip_spe_exterieur?.barbecue_photos || [],

    // BRANCHE PISCINE
    equip_spe_ext_piscine_type: formData.section_equip_spe_exterieur?.piscine_type || null,
    equip_spe_ext_piscine_acces: formData.section_equip_spe_exterieur?.piscine_acces || null,
    equip_spe_ext_piscine_dimensions: formData.section_equip_spe_exterieur?.piscine_dimensions || null,
    equip_spe_ext_piscine_disponibilite: formData.section_equip_spe_exterieur?.piscine_disponibilite || null,
    equip_spe_ext_piscine_periode_disponibilite: formData.section_equip_spe_exterieur?.piscine_periode_disponibilite || null,
    equip_spe_ext_piscine_heures: formData.section_equip_spe_exterieur?.piscine_heures || null,
    equip_spe_ext_piscine_horaires_ouverture: formData.section_equip_spe_exterieur?.piscine_horaires_ouverture || null,
    equip_spe_ext_piscine_caracteristiques: formData.section_equip_spe_exterieur?.piscine_caracteristiques || [],
    equip_spe_ext_piscine_periode_chauffage: formData.section_equip_spe_exterieur?.piscine_periode_chauffage || null,
    equip_spe_ext_piscine_entretien_prestataire: formData.section_equip_spe_exterieur?.piscine_entretien_prestataire ?? null,
    equip_spe_ext_piscine_entretien_frequence: formData.section_equip_spe_exterieur?.piscine_entretien_frequence || null,
    equip_spe_ext_piscine_entretien_type_prestation: formData.section_equip_spe_exterieur?.piscine_entretien_type_prestation || null,
    equip_spe_ext_piscine_entretien_qui: formData.section_equip_spe_exterieur?.piscine_entretien_qui || null,
    equip_spe_ext_piscine_regles_utilisation: formData.section_equip_spe_exterieur?.piscine_regles_utilisation || null,
    equip_spe_ext_piscine_video: formData.section_equip_spe_exterieur?.piscine_video ?? null,

    // BRANCHE JACUZZI
    equip_spe_ext_jacuzzi_acces: formData.section_equip_spe_exterieur?.jacuzzi_acces || null,
    equip_spe_ext_jacuzzi_entretien_prestataire: formData.section_equip_spe_exterieur?.jacuzzi_entretien_prestataire ?? null,
    equip_spe_ext_jacuzzi_entretien_frequence: formData.section_equip_spe_exterieur?.jacuzzi_entretien_frequence || null,
    equip_spe_ext_jacuzzi_entretien_type_prestation: formData.section_equip_spe_exterieur?.jacuzzi_entretien_type_prestation || null,
    equip_spe_ext_jacuzzi_entretien_qui: formData.section_equip_spe_exterieur?.jacuzzi_entretien_qui || null,
    equip_spe_ext_jacuzzi_taille: formData.section_equip_spe_exterieur?.jacuzzi_taille || null,
    equip_spe_ext_jacuzzi_instructions: formData.section_equip_spe_exterieur?.jacuzzi_instructions || null,
    equip_spe_ext_jacuzzi_heures_utilisation: formData.section_equip_spe_exterieur?.jacuzzi_heures_utilisation || null,
    equip_spe_ext_jacuzzi_photos: formData.section_equip_spe_exterieur?.jacuzzi_photos || [],

    // BRANCHE CUISINE EXTÉRIEURE
    equip_spe_ext_cuisine_ext_entretien_prestataire: formData.section_equip_spe_exterieur?.cuisine_ext_entretien_prestataire ?? null,
    equip_spe_ext_cuisine_ext_entretien_frequence: formData.section_equip_spe_exterieur?.cuisine_ext_entretien_frequence || null,
    equip_spe_ext_cuisine_ext_entretien_type_prestation: formData.section_equip_spe_exterieur?.cuisine_ext_entretien_type_prestation || null,
    equip_spe_ext_cuisine_ext_entretien_qui: formData.section_equip_spe_exterieur?.cuisine_ext_entretien_qui || null,
    equip_spe_ext_cuisine_ext_superficie: formData.section_equip_spe_exterieur?.cuisine_ext_superficie || null,
    equip_spe_ext_cuisine_ext_type: formData.section_equip_spe_exterieur?.cuisine_ext_type || null,
    equip_spe_ext_cuisine_ext_caracteristiques: formData.section_equip_spe_exterieur?.cuisine_ext_caracteristiques || [],

    // Section Communs
    communs_dispose_espaces_communs: formData.section_communs?.dispose_espaces_communs ?? null,
    communs_description_generale: formData.section_communs?.description_generale || null,
    communs_entretien_prestataire: formData.section_communs?.entretien_prestataire ?? null,
    communs_entretien_frequence: formData.section_communs?.entretien_frequence || null,
    communs_entretien_qui: formData.section_communs?.entretien_qui || null,
    communs_photos_espaces_communs: formData.section_communs?.photos_espaces_communs || [],

    // Section Télétravail
    teletravail_equipements: formData.section_teletravail?.equipements || [],
    teletravail_equipements_autre_details: formData.section_teletravail?.equipements_autre_details || null,

    // Section Bébé
    bebe_equipements: formData.section_bebe?.equipements || [],
    bebe_lit_bebe_type: formData.section_bebe?.lit_bebe_type || null,
    bebe_lit_parapluie_disponibilite: formData.section_bebe?.lit_parapluie_disponibilite || null,
    bebe_lit_stores_occultants: formData.section_bebe?.lit_stores_occultants ?? null,
    bebe_chaise_haute_type: formData.section_bebe?.chaise_haute_type || null,
    bebe_chaise_haute_disponibilite: formData.section_bebe?.chaise_haute_disponibilite || null,
    bebe_chaise_haute_caracteristiques: formData.section_bebe?.chaise_haute_caracteristiques || [],
    bebe_chaise_haute_prix: formData.section_bebe?.chaise_haute_prix || null,
    bebe_jouets_tranches_age: formData.section_bebe?.jouets_tranches_age || [],
    bebe_equipements_autre_details: formData.section_bebe?.equipements_autre_details || null,
    bebe_photos_equipements_bebe: formData.section_bebe?.photos_equipements_bebe || [],

    // Section Sécurité
    securite_equipements: formData.section_securite?.equipements || [],
    securite_alarme_desarmement: formData.section_securite?.alarme_desarmement || null,
    securite_photos_equipements_securite: formData.section_securite?.photos_equipements_securite || [],
    // PDF URLs - AJOUT POUR MAKE
    pdf_logement_url: formData.pdf_logement_url || null,
    pdf_menage_url: formData.pdf_menage_url || null,

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
      boiteType: supabaseData.clefs_boite_type || "",
      emplacementBoite: supabaseData.clefs_emplacement_boite || "",
      emplacementPhoto: supabaseData.clefs_emplacement_photo || null,
      ttlock: {
        masterpinConciergerie: supabaseData.clefs_ttlock_masterpin_conciergerie || "",
        codeProprietaire: supabaseData.clefs_ttlock_code_proprietaire || "",
        codeMenage: supabaseData.clefs_ttlock_code_menage || ""
      },
      igloohome: {
        masterpinConciergerie: supabaseData.clefs_igloohome_masterpin_conciergerie || "",
        codeVoyageur: supabaseData.clefs_igloohome_code_voyageur || "",
        codeProprietaire: supabaseData.clefs_igloohome_code_proprietaire || "",
        codeMenage: supabaseData.clefs_igloohome_code_menage || ""
      },
      masterlock: {
        code: supabaseData.clefs_masterlock_code || ""
      },
      interphone: supabaseData.clefs_interphone ?? null,
      interphoneDetails: supabaseData.clefs_interphone_details || "",
      interphonePhoto: supabaseData.clefs_interphone_photo || null,
      tempoGache: supabaseData.clefs_tempo_gache ?? null,
      tempoGacheDetails: supabaseData.clefs_tempo_gache_details || "",
      tempoGachePhoto: supabaseData.clefs_tempo_gache_photo || null,
      digicode: supabaseData.clefs_digicode ?? null,
      digicodeDetails: supabaseData.clefs_digicode_details || "",
      digicodePhoto: supabaseData.clefs_digicode_photo || null,
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
      dates_bloquees: supabaseData.exigences_dates_bloquees || "",
      precisions_exigences: supabaseData.exigences_precisions_exigences || ""
    },

    section_avis: {
      description_emplacement: {
        tres_bien_situe: supabaseData.avis_description_tres_bien_situe ?? null,
        quartier_calme: supabaseData.avis_description_quartier_calme ?? null,
        environnement_rural: supabaseData.avis_description_environnement_rural ?? null,
        bord_mer: supabaseData.avis_description_bord_mer ?? null,
        montagne: supabaseData.avis_description_montagne ?? null,
        autres_emplacement: supabaseData.avis_description_autres_emplacement ?? null
      },
      description_emplacement_autre: supabaseData.avis_description_emplacement_autre || "",
      precisions_emplacement: supabaseData.avis_precisions_emplacement || "",
      
      // ✅ ATOUTS COMPLETS - TOUS LES NOUVEAUX ATOUTS AJOUTÉS
      atouts_logement: {
        // Anciens atouts (déjà mappés)
        lumineux: supabaseData.avis_atouts_lumineux ?? null,
        central: supabaseData.avis_atouts_central ?? null,
        authentique: supabaseData.avis_atouts_authentique ?? null,
        design_moderne: supabaseData.avis_atouts_design_moderne ?? null,
        terrasse_balcon: supabaseData.avis_atouts_terrasse_balcon ?? null,
        piscine: supabaseData.avis_atouts_piscine ?? null,
        
        // ✅ NOUVEAUX ATOUTS - À AJOUTER
        rustique: supabaseData.avis_atouts_rustique ?? null,
        convivial: supabaseData.avis_atouts_convivial ?? null,
        douillet: supabaseData.avis_atouts_douillet ?? null,
        proche_transports: supabaseData.avis_atouts_proche_transports ?? null,
        jacuzzi: supabaseData.avis_atouts_jacuzzi ?? null,
        cheminee: supabaseData.avis_atouts_cheminee ?? null,
        charmant: supabaseData.avis_atouts_charmant ?? null,
        elegant: supabaseData.avis_atouts_elegant ?? null,
        atypique: supabaseData.avis_atouts_atypique ?? null,
        renove: supabaseData.avis_atouts_renove ?? null,
        familial: supabaseData.avis_atouts_familial ?? null,
        cosy_confortable: supabaseData.avis_atouts_cosy_confortable ?? null,
        decoration_traditionnelle: supabaseData.avis_atouts_decoration_traditionnelle ?? null,
        jardin: supabaseData.avis_atouts_jardin ?? null,
        proche_commerces: supabaseData.avis_atouts_proche_commerces ?? null,
        sauna_spa: supabaseData.avis_atouts_sauna_spa ?? null,
        video_projecteur: supabaseData.avis_atouts_video_projecteur ?? null,
        station_recharge_electrique: supabaseData.avis_atouts_station_recharge_electrique ?? null,
        romantique: supabaseData.avis_atouts_romantique ?? null,
        paisible: supabaseData.avis_atouts_paisible ?? null,
        chic: supabaseData.avis_atouts_chic ?? null,
        accueillant: supabaseData.avis_atouts_accueillant ?? null,
        tranquille: supabaseData.avis_atouts_tranquille ?? null,
        spacieux: supabaseData.avis_atouts_spacieux ?? null,
        vue_panoramique: supabaseData.avis_atouts_vue_panoramique ?? null,
        parking_prive: supabaseData.avis_atouts_parking_prive ?? null,
        equipements_haut_gamme: supabaseData.avis_atouts_equipements_haut_gamme ?? null,
        billard: supabaseData.avis_atouts_billard ?? null,
        jeux_arcade: supabaseData.avis_atouts_jeux_arcade ?? null,
        table_ping_pong: supabaseData.avis_atouts_table_ping_pong ?? null,
        autres_atouts: supabaseData.avis_atouts_autres_atouts ?? null
      },
      
      atouts_logement_autre: supabaseData.avis_atouts_logement_autre || "",
      autres_caracteristiques: supabaseData.avis_autres_caracteristiques || "",
      
      types_voyageurs: {
        duo_amoureux: supabaseData.avis_voyageurs_duo_amoureux ?? null,
        nomades_numeriques: supabaseData.avis_voyageurs_nomades_numeriques ?? null,
        aventuriers_independants: supabaseData.avis_voyageurs_aventuriers_independants ?? null,
        tribus_familiales: supabaseData.avis_voyageurs_tribus_familiales ?? null,
        bandes_amis: supabaseData.avis_voyageurs_bandes_amis ?? null,
        voyageurs_experience: supabaseData.avis_voyageurs_voyageurs_experience ?? null,
        autres_voyageurs: supabaseData.avis_voyageurs_autres_voyageurs ?? null
      },
      types_voyageurs_autre: supabaseData.avis_voyageurs_autre || "",
      explication_adaptation: supabaseData.avis_explication_adaptation || "",
      
      notation: {
        emplacement: supabaseData.avis_notation_emplacement || null,
        confort: supabaseData.avis_notation_confort || null,
        vetuste: supabaseData.avis_notation_vetuste || null,
        equipements: supabaseData.avis_notation_equipements || null
      }
    },

    section_gestion_linge: {
      // Question principale
      dispose_de_linge: supabaseData.linge_dispose_de_linge ?? null,
      
      // Inventaire 90x200
      inventaire_90x200: {
        couettes: supabaseData.linge_90x200_couettes?.toString() || "",
        oreillers: supabaseData.linge_90x200_oreillers?.toString() || "",
        draps_housses: supabaseData.linge_90x200_draps_housses?.toString() || "",
        housses_couette: supabaseData.linge_90x200_housses_couette?.toString() || "",
        protections_matelas: supabaseData.linge_90x200_protections_matelas?.toString() || "",
        taies_oreillers: supabaseData.linge_90x200_taies_oreillers?.toString() || "",
        draps_bain: supabaseData.linge_90x200_draps_bain?.toString() || "",
        petites_serviettes: supabaseData.linge_90x200_petites_serviettes?.toString() || "",
        tapis_bain: supabaseData.linge_90x200_tapis_bain?.toString() || "",
        torchons: supabaseData.linge_90x200_torchons?.toString() || "",
        plaids: supabaseData.linge_90x200_plaids?.toString() || "",
        oreillers_decoratifs: supabaseData.linge_90x200_oreillers_decoratifs?.toString() || ""
      },
      
      // Inventaire 140x200
      inventaire_140x200: {
        couettes: supabaseData.linge_140x200_couettes?.toString() || "",
        oreillers: supabaseData.linge_140x200_oreillers?.toString() || "",
        draps_housses: supabaseData.linge_140x200_draps_housses?.toString() || "",
        housses_couette: supabaseData.linge_140x200_housses_couette?.toString() || "",
        protections_matelas: supabaseData.linge_140x200_protections_matelas?.toString() || "",
        taies_oreillers: supabaseData.linge_140x200_taies_oreillers?.toString() || "",
        draps_bain: supabaseData.linge_140x200_draps_bain?.toString() || "",
        petites_serviettes: supabaseData.linge_140x200_petites_serviettes?.toString() || "",
        tapis_bain: supabaseData.linge_140x200_tapis_bain?.toString() || "",
        torchons: supabaseData.linge_140x200_torchons?.toString() || "",
        plaids: supabaseData.linge_140x200_plaids?.toString() || "",
        oreillers_decoratifs: supabaseData.linge_140x200_oreillers_decoratifs?.toString() || ""
      },
      
      // Inventaire 160x200
      inventaire_160x200: {
        couettes: supabaseData.linge_160x200_couettes?.toString() || "",
        oreillers: supabaseData.linge_160x200_oreillers?.toString() || "",
        draps_housses: supabaseData.linge_160x200_draps_housses?.toString() || "",
        housses_couette: supabaseData.linge_160x200_housses_couette?.toString() || "",
        protections_matelas: supabaseData.linge_160x200_protections_matelas?.toString() || "",
        taies_oreillers: supabaseData.linge_160x200_taies_oreillers?.toString() || "",
        draps_bain: supabaseData.linge_160x200_draps_bain?.toString() || "",
        petites_serviettes: supabaseData.linge_160x200_petites_serviettes?.toString() || "",
        tapis_bain: supabaseData.linge_160x200_tapis_bain?.toString() || "",
        torchons: supabaseData.linge_160x200_torchons?.toString() || "",
        plaids: supabaseData.linge_160x200_plaids?.toString() || "",
        oreillers_decoratifs: supabaseData.linge_160x200_oreillers_decoratifs?.toString() || ""
      },
      
      // Inventaire 180x200
      inventaire_180x200: {
        couettes: supabaseData.linge_180x200_couettes?.toString() || "",
        oreillers: supabaseData.linge_180x200_oreillers?.toString() || "",
        draps_housses: supabaseData.linge_180x200_draps_housses?.toString() || "",
        housses_couette: supabaseData.linge_180x200_housses_couette?.toString() || "",
        protections_matelas: supabaseData.linge_180x200_protections_matelas?.toString() || "",
        taies_oreillers: supabaseData.linge_180x200_taies_oreillers?.toString() || "",
        draps_bain: supabaseData.linge_180x200_draps_bain?.toString() || "",
        petites_serviettes: supabaseData.linge_180x200_petites_serviettes?.toString() || "",
        tapis_bain: supabaseData.linge_180x200_tapis_bain?.toString() || "",
        torchons: supabaseData.linge_180x200_torchons?.toString() || "",
        plaids: supabaseData.linge_180x200_plaids?.toString() || "",
        oreillers_decoratifs: supabaseData.linge_180x200_oreillers_decoratifs?.toString() || ""
      },
      
      // Inventaire Autres
      inventaire_autres: {
        couettes: supabaseData.linge_autres_couettes?.toString() || "",
        oreillers: supabaseData.linge_autres_oreillers?.toString() || "",
        draps_housses: supabaseData.linge_autres_draps_housses?.toString() || "",
        housses_couette: supabaseData.linge_autres_housses_couette?.toString() || "",
        protections_matelas: supabaseData.linge_autres_protections_matelas?.toString() || "",
        taies_oreillers: supabaseData.linge_autres_taies_oreillers?.toString() || "",
        draps_bain: supabaseData.linge_autres_draps_bain?.toString() || "",
        petites_serviettes: supabaseData.linge_autres_petites_serviettes?.toString() || "",
        tapis_bain: supabaseData.linge_autres_tapis_bain?.toString() || "",
        torchons: supabaseData.linge_autres_torchons?.toString() || "",
        plaids: supabaseData.linge_autres_plaids?.toString() || "",
        oreillers_decoratifs: supabaseData.linge_autres_oreillers_decoratifs?.toString() || ""
      },
      
      // État du linge
      etat_neuf: supabaseData.linge_etat_neuf ?? null,
      etat_usage: supabaseData.linge_etat_usage ?? null,
      etat_propre: supabaseData.linge_etat_propre ?? null,
      etat_sale: supabaseData.linge_etat_sale ?? null,
      etat_tache: supabaseData.linge_etat_tache ?? null,
      etat_informations: supabaseData.linge_etat_informations || "",
      
      // Photos et emplacement
      photos_linge: supabaseData.linge_photos_linge || [],
      emplacement_description: supabaseData.linge_emplacement_description || "",
      emplacement_photos: supabaseData.linge_emplacement_photos || [],
      emplacement_code_cadenas: supabaseData.linge_emplacement_code_cadenas || ""
    },

    section_equipements: {
      // Équipements techniques essentiels
      video_acces_poubelle: supabaseData.equipements_video_acces_poubelle ?? null,
      poubelle_emplacement: supabaseData.equipements_poubelle_emplacement || "",
      poubelle_ramassage: supabaseData.equipements_poubelle_ramassage || "",
      poubelle_photos: supabaseData.equipements_poubelle_photos || [],
      disjoncteur_emplacement: supabaseData.equipements_disjoncteur_emplacement || "",
      disjoncteur_photos: supabaseData.equipements_disjoncteur_photos || [],
      vanne_eau_emplacement: supabaseData.equipements_vanne_eau_emplacement || "",
      vanne_eau_photos: supabaseData.equipements_vanne_eau_photos || [],
      systeme_chauffage_eau: supabaseData.equipements_systeme_chauffage_eau || "",
      chauffage_eau_emplacement: supabaseData.equipements_chauffage_eau_emplacement || "",
      chauffage_eau_photos: supabaseData.equipements_chauffage_eau_photos || [],
      video_systeme_chauffage: supabaseData.equipements_video_systeme_chauffage ?? null,
      
      // Équipements checklist
      wifi: supabaseData.equipements_wifi ?? null,
      tv: supabaseData.equipements_tv ?? null,
      climatisation: supabaseData.equipements_climatisation ?? null,
      chauffage: supabaseData.equipements_chauffage ?? null,
      lave_linge: supabaseData.equipements_lave_linge ?? null,
      seche_linge: supabaseData.equipements_seche_linge ?? null,
      fer_repasser: supabaseData.equipements_fer_repasser ?? null,
      etendoir: supabaseData.equipements_etendoir ?? null,
      parking_equipement: supabaseData.equipements_parking_equipement ?? null,
      tourne_disque: supabaseData.equipements_tourne_disque ?? null,
      piano: supabaseData.equipements_piano ?? null,
      cinema: supabaseData.equipements_cinema ?? null,
      coffre_fort: supabaseData.equipements_coffre_fort ?? null,
      ascenseur: supabaseData.equipements_ascenseur ?? null,
      compacteur_dechets: supabaseData.equipements_compacteur_dechets ?? null,
      accessible_mobilite_reduite: supabaseData.equipements_accessible_mobilite_reduite ?? null,
      animaux_acceptes: supabaseData.equipements_animaux_acceptes ?? null,
      fetes_autorisees: supabaseData.equipements_fetes_autorisees ?? null,
      fumeurs_acceptes: supabaseData.equipements_fumeurs_acceptes ?? null,
      
      // Parking
      parking_type: supabaseData.equipements_parking_type || "",
      parking_rue_details: supabaseData.equipements_parking_rue_details || "",
      parking_sur_place_types: supabaseData.equipements_parking_sur_place_types || [],
      parking_sur_place_details: supabaseData.equipements_parking_sur_place_details || "",
      parking_payant_type: supabaseData.equipements_parking_payant_type || "",      parking_payant_details: supabaseData.equipements_parking_payant_details || ""
    },

    section_consommables: {
      // Question principale
      fournis_par_prestataire: supabaseData.consommables_fournis_par_prestataire ?? null,
      
      // Consommables optionnels "sur demande"
      gel_douche: supabaseData.consommables_gel_douche ?? null,
      shampoing: supabaseData.consommables_shampoing ?? null,
      apres_shampoing: supabaseData.consommables_apres_shampoing ?? null,
      pastilles_lave_vaisselle: supabaseData.consommables_pastilles_lave_vaisselle ?? null,
      autre_consommable: supabaseData.consommables_autre_consommable ?? null,
      autre_consommable_details: supabaseData.consommables_autre_consommable_details || "",
      
      // Type café/cafetière
      cafe_nespresso: supabaseData.consommables_cafe_nespresso ?? null,
      cafe_tassimo: supabaseData.consommables_cafe_tassimo ?? null,
      cafe_moulu: supabaseData.consommables_cafe_moulu ?? null,
      cafe_senseo: supabaseData.consommables_cafe_senseo ?? null,
      cafe_soluble: supabaseData.consommables_cafe_soluble ?? null,
      cafe_grain: supabaseData.consommables_cafe_grain ?? null,
      cafe_autre: supabaseData.consommables_cafe_autre ?? null,
      cafe_autre_details: supabaseData.consommables_cafe_autre_details || ""
    },
    // À REMPLACER dans mapSupabaseToFormData() : 
// Remplace `section_visite: {},` par :

    section_visite: {
      // Types de pièces (14 checkboxes)
      pieces_chambre: supabaseData.visite_pieces_chambre ?? null,
      pieces_salon: supabaseData.visite_pieces_salon ?? null,
      pieces_salle_bains: supabaseData.visite_pieces_salle_bains ?? null,
      pieces_salon_prive: supabaseData.visite_pieces_salon_prive ?? null,
      pieces_kitchenette: supabaseData.visite_pieces_kitchenette ?? null,
      pieces_cuisine: supabaseData.visite_pieces_cuisine ?? null,
      pieces_salle_manger: supabaseData.visite_pieces_salle_manger ?? null,
      pieces_bureau: supabaseData.visite_pieces_bureau ?? null,
      pieces_salle_jeux: supabaseData.visite_pieces_salle_jeux ?? null,
      pieces_salle_sport: supabaseData.visite_pieces_salle_sport ?? null,
      pieces_buanderie: supabaseData.visite_pieces_buanderie ?? null,
      pieces_terrasse: supabaseData.visite_pieces_terrasse ?? null,
      pieces_balcon: supabaseData.visite_pieces_balcon ?? null,
      pieces_jardin: supabaseData.visite_pieces_jardin ?? null,
      pieces_autre: supabaseData.visite_pieces_autre ?? null,
      pieces_autre_details: supabaseData.visite_pieces_autre_details || "",
      nombre_chambres: supabaseData.visite_nombre_chambres || "",
      nombre_salles_bains: supabaseData.visite_nombre_salles_bains || "",
      video_visite: supabaseData.visite_video_visite ?? null
    },

    section_chambres: {
      chambre_1: {
        nom_description: supabaseData.chambres_chambre_1_nom_description || "",
        lit_simple_90_190: supabaseData.chambres_chambre_1_lit_simple_90_190 || 0,
        lit_double_140_190: supabaseData.chambres_chambre_1_lit_double_140_190 || 0,
        lit_queen_160_200: supabaseData.chambres_chambre_1_lit_queen_160_200 || 0,
        lit_king_180_200: supabaseData.chambres_chambre_1_lit_king_180_200 || 0,
        canape_lit_simple: supabaseData.chambres_chambre_1_canape_lit_simple || 0,
        canape_lit_double: supabaseData.chambres_chambre_1_canape_lit_double || 0,
        lits_superposes_90_190: supabaseData.chambres_chambre_1_lits_superposes_90_190 || 0,
        lit_gigogne: supabaseData.chambres_chambre_1_lit_gigogne || 0,
        autre_type_lit: supabaseData.chambres_chambre_1_autre_type_lit || "",
        equipements_draps_fournis: supabaseData.chambres_chambre_1_equipements_draps_fournis ?? null,
        equipements_climatisation: supabaseData.chambres_chambre_1_equipements_climatisation ?? null,
        equipements_ventilateur_plafond: supabaseData.chambres_chambre_1_equipements_ventilateur_plafond ?? null,
        equipements_espace_rangement: supabaseData.chambres_chambre_1_equipements_espace_rangement ?? null,
        equipements_lit_bebe_60_120: supabaseData.chambres_chambre_1_equipements_lit_bebe_60_120 ?? null,
        equipements_stores: supabaseData.chambres_chambre_1_equipements_stores ?? null,
        equipements_television: supabaseData.chambres_chambre_1_equipements_television ?? null,
        equipements_oreillers_couvertures_sup: supabaseData.chambres_chambre_1_equipements_oreillers_couvertures_sup ?? null,
        equipements_chauffage: supabaseData.chambres_chambre_1_equipements_chauffage ?? null,
        equipements_cintres: supabaseData.chambres_chambre_1_equipements_cintres ?? null,
        equipements_moustiquaire: supabaseData.chambres_chambre_1_equipements_moustiquaire ?? null,
        equipements_lit_parapluie_60_120: supabaseData.chambres_chambre_1_equipements_lit_parapluie_60_120 ?? null,
        equipements_systeme_audio: supabaseData.chambres_chambre_1_equipements_systeme_audio ?? null,
        equipements_coffre_fort: supabaseData.chambres_chambre_1_equipements_coffre_fort ?? null,
        equipements_autre: supabaseData.chambres_chambre_1_equipements_autre ?? null,
        equipements_autre_details: supabaseData.chambres_chambre_1_equipements_autre_details || "",
        photos_chambre: supabaseData.chambres_chambre_1_photos_chambre || []
      },
      
      chambre_2: {
        nom_description: supabaseData.chambres_chambre_2_nom_description || "",
        lit_simple_90_190: supabaseData.chambres_chambre_2_lit_simple_90_190 || 0,
        lit_double_140_190: supabaseData.chambres_chambre_2_lit_double_140_190 || 0,
        lit_queen_160_200: supabaseData.chambres_chambre_2_lit_queen_160_200 || 0,
        lit_king_180_200: supabaseData.chambres_chambre_2_lit_king_180_200 || 0,
        canape_lit_simple: supabaseData.chambres_chambre_2_canape_lit_simple || 0,
        canape_lit_double: supabaseData.chambres_chambre_2_canape_lit_double || 0,
        lits_superposes_90_190: supabaseData.chambres_chambre_2_lits_superposes_90_190 || 0,
        lit_gigogne: supabaseData.chambres_chambre_2_lit_gigogne || 0,
        autre_type_lit: supabaseData.chambres_chambre_2_autre_type_lit || "",
        equipements_draps_fournis: supabaseData.chambres_chambre_2_equipements_draps_fournis ?? null,
        equipements_climatisation: supabaseData.chambres_chambre_2_equipements_climatisation ?? null,
        equipements_ventilateur_plafond: supabaseData.chambres_chambre_2_equipements_ventilateur_plafond ?? null,
        equipements_espace_rangement: supabaseData.chambres_chambre_2_equipements_espace_rangement ?? null,
        equipements_lit_bebe_60_120: supabaseData.chambres_chambre_2_equipements_lit_bebe_60_120 ?? null,
        equipements_stores: supabaseData.chambres_chambre_2_equipements_stores ?? null,
        equipements_television: supabaseData.chambres_chambre_2_equipements_television ?? null,
        equipements_oreillers_couvertures_sup: supabaseData.chambres_chambre_2_equipements_oreillers_couvertures_sup ?? null,
        equipements_chauffage: supabaseData.chambres_chambre_2_equipements_chauffage ?? null,
        equipements_cintres: supabaseData.chambres_chambre_2_equipements_cintres ?? null,
        equipements_moustiquaire: supabaseData.chambres_chambre_2_equipements_moustiquaire ?? null,
        equipements_lit_parapluie_60_120: supabaseData.chambres_chambre_2_equipements_lit_parapluie_60_120 ?? null,
        equipements_systeme_audio: supabaseData.chambres_chambre_2_equipements_systeme_audio ?? null,
        equipements_coffre_fort: supabaseData.chambres_chambre_2_equipements_coffre_fort ?? null,
        equipements_autre: supabaseData.chambres_chambre_2_equipements_autre ?? null,
        equipements_autre_details: supabaseData.chambres_chambre_2_equipements_autre_details || "",
        photos_chambre: supabaseData.chambres_chambre_2_photos_chambre || []
      },
      
      chambre_3: {
        nom_description: supabaseData.chambres_chambre_3_nom_description || "",
        lit_simple_90_190: supabaseData.chambres_chambre_3_lit_simple_90_190 || 0,
        lit_double_140_190: supabaseData.chambres_chambre_3_lit_double_140_190 || 0,
        lit_queen_160_200: supabaseData.chambres_chambre_3_lit_queen_160_200 || 0,
        lit_king_180_200: supabaseData.chambres_chambre_3_lit_king_180_200 || 0,
        canape_lit_simple: supabaseData.chambres_chambre_3_canape_lit_simple || 0,
        canape_lit_double: supabaseData.chambres_chambre_3_canape_lit_double || 0,
        lits_superposes_90_190: supabaseData.chambres_chambre_3_lits_superposes_90_190 || 0,
        lit_gigogne: supabaseData.chambres_chambre_3_lit_gigogne || 0,
        autre_type_lit: supabaseData.chambres_chambre_3_autre_type_lit || "",
        equipements_draps_fournis: supabaseData.chambres_chambre_3_equipements_draps_fournis ?? null,
        equipements_climatisation: supabaseData.chambres_chambre_3_equipements_climatisation ?? null,
        equipements_ventilateur_plafond: supabaseData.chambres_chambre_3_equipements_ventilateur_plafond ?? null,
        equipements_espace_rangement: supabaseData.chambres_chambre_3_equipements_espace_rangement ?? null,
        equipements_lit_bebe_60_120: supabaseData.chambres_chambre_3_equipements_lit_bebe_60_120 ?? null,
        equipements_stores: supabaseData.chambres_chambre_3_equipements_stores ?? null,
        equipements_television: supabaseData.chambres_chambre_3_equipements_television ?? null,
        equipements_oreillers_couvertures_sup: supabaseData.chambres_chambre_3_equipements_oreillers_couvertures_sup ?? null,
        equipements_chauffage: supabaseData.chambres_chambre_3_equipements_chauffage ?? null,
        equipements_cintres: supabaseData.chambres_chambre_3_equipements_cintres ?? null,
        equipements_moustiquaire: supabaseData.chambres_chambre_3_equipements_moustiquaire ?? null,
        equipements_lit_parapluie_60_120: supabaseData.chambres_chambre_3_equipements_lit_parapluie_60_120 ?? null,
        equipements_systeme_audio: supabaseData.chambres_chambre_3_equipements_systeme_audio ?? null,
        equipements_coffre_fort: supabaseData.chambres_chambre_3_equipements_coffre_fort ?? null,
        equipements_autre: supabaseData.chambres_chambre_3_equipements_autre ?? null,
        equipements_autre_details: supabaseData.chambres_chambre_3_equipements_autre_details || "",
        photos_chambre: supabaseData.chambres_chambre_3_photos_chambre || []
      },
      
      chambre_4: {
        nom_description: supabaseData.chambres_chambre_4_nom_description || "",
        lit_simple_90_190: supabaseData.chambres_chambre_4_lit_simple_90_190 || 0,
        lit_double_140_190: supabaseData.chambres_chambre_4_lit_double_140_190 || 0,
        lit_queen_160_200: supabaseData.chambres_chambre_4_lit_queen_160_200 || 0,
        lit_king_180_200: supabaseData.chambres_chambre_4_lit_king_180_200 || 0,
        canape_lit_simple: supabaseData.chambres_chambre_4_canape_lit_simple || 0,
        canape_lit_double: supabaseData.chambres_chambre_4_canape_lit_double || 0,
        lits_superposes_90_190: supabaseData.chambres_chambre_4_lits_superposes_90_190 || 0,
        lit_gigogne: supabaseData.chambres_chambre_4_lit_gigogne || 0,
        autre_type_lit: supabaseData.chambres_chambre_4_autre_type_lit || "",
        equipements_draps_fournis: supabaseData.chambres_chambre_4_equipements_draps_fournis ?? null,
        equipements_climatisation: supabaseData.chambres_chambre_4_equipements_climatisation ?? null,
        equipements_ventilateur_plafond: supabaseData.chambres_chambre_4_equipements_ventilateur_plafond ?? null,
        equipements_espace_rangement: supabaseData.chambres_chambre_4_equipements_espace_rangement ?? null,
        equipements_lit_bebe_60_120: supabaseData.chambres_chambre_4_equipements_lit_bebe_60_120 ?? null,
        equipements_stores: supabaseData.chambres_chambre_4_equipements_stores ?? null,
        equipements_television: supabaseData.chambres_chambre_4_equipements_television ?? null,
        equipements_oreillers_couvertures_sup: supabaseData.chambres_chambre_4_equipements_oreillers_couvertures_sup ?? null,
        equipements_chauffage: supabaseData.chambres_chambre_4_equipements_chauffage ?? null,
        equipements_cintres: supabaseData.chambres_chambre_4_equipements_cintres ?? null,
        equipements_moustiquaire: supabaseData.chambres_chambre_4_equipements_moustiquaire ?? null,
        equipements_lit_parapluie_60_120: supabaseData.chambres_chambre_4_equipements_lit_parapluie_60_120 ?? null,
        equipements_systeme_audio: supabaseData.chambres_chambre_4_equipements_systeme_audio ?? null,
        equipements_coffre_fort: supabaseData.chambres_chambre_4_equipements_coffre_fort ?? null,
        equipements_autre: supabaseData.chambres_chambre_4_equipements_autre ?? null,
        equipements_autre_details: supabaseData.chambres_chambre_4_equipements_autre_details || "",
        photos_chambre: supabaseData.chambres_chambre_4_photos_chambre || []
      },
      
      chambre_5: {
        nom_description: supabaseData.chambres_chambre_5_nom_description || "",
        lit_simple_90_190: supabaseData.chambres_chambre_5_lit_simple_90_190 || 0,
        lit_double_140_190: supabaseData.chambres_chambre_5_lit_double_140_190 || 0,
        lit_queen_160_200: supabaseData.chambres_chambre_5_lit_queen_160_200 || 0,
        lit_king_180_200: supabaseData.chambres_chambre_5_lit_king_180_200 || 0,
        canape_lit_simple: supabaseData.chambres_chambre_5_canape_lit_simple || 0,
        canape_lit_double: supabaseData.chambres_chambre_5_canape_lit_double || 0,
        lits_superposes_90_190: supabaseData.chambres_chambre_5_lits_superposes_90_190 || 0,
        lit_gigogne: supabaseData.chambres_chambre_5_lit_gigogne || 0,
        autre_type_lit: supabaseData.chambres_chambre_5_autre_type_lit || "",
        equipements_draps_fournis: supabaseData.chambres_chambre_5_equipements_draps_fournis ?? null,
        equipements_climatisation: supabaseData.chambres_chambre_5_equipements_climatisation ?? null,
        equipements_ventilateur_plafond: supabaseData.chambres_chambre_5_equipements_ventilateur_plafond ?? null,
        equipements_espace_rangement: supabaseData.chambres_chambre_5_equipements_espace_rangement ?? null,
        equipements_lit_bebe_60_120: supabaseData.chambres_chambre_5_equipements_lit_bebe_60_120 ?? null,
        equipements_stores: supabaseData.chambres_chambre_5_equipements_stores ?? null,
        equipements_television: supabaseData.chambres_chambre_5_equipements_television ?? null,
        equipements_oreillers_couvertures_sup: supabaseData.chambres_chambre_5_equipements_oreillers_couvertures_sup ?? null,
        equipements_chauffage: supabaseData.chambres_chambre_5_equipements_chauffage ?? null,
        equipements_cintres: supabaseData.chambres_chambre_5_equipements_cintres ?? null,
        equipements_moustiquaire: supabaseData.chambres_chambre_5_equipements_moustiquaire ?? null,
        equipements_lit_parapluie_60_120: supabaseData.chambres_chambre_5_equipements_lit_parapluie_60_120 ?? null,
        equipements_systeme_audio: supabaseData.chambres_chambre_5_equipements_systeme_audio ?? null,
        equipements_coffre_fort: supabaseData.chambres_chambre_5_equipements_coffre_fort ?? null,
        equipements_autre: supabaseData.chambres_chambre_5_equipements_autre ?? null,
        equipements_autre_details: supabaseData.chambres_chambre_5_equipements_autre_details || "",
        photos_chambre: supabaseData.chambres_chambre_5_photos_chambre || []
      },
      
      chambre_6: {
        nom_description: supabaseData.chambres_chambre_6_nom_description || "",
        lit_simple_90_190: supabaseData.chambres_chambre_6_lit_simple_90_190 || 0,
        lit_double_140_190: supabaseData.chambres_chambre_6_lit_double_140_190 || 0,
        lit_queen_160_200: supabaseData.chambres_chambre_6_lit_queen_160_200 || 0,
        lit_king_180_200: supabaseData.chambres_chambre_6_lit_king_180_200 || 0,
        canape_lit_simple: supabaseData.chambres_chambre_6_canape_lit_simple || 0,
        canape_lit_double: supabaseData.chambres_chambre_6_canape_lit_double || 0,
        lits_superposes_90_190: supabaseData.chambres_chambre_6_lits_superposes_90_190 || 0,
        lit_gigogne: supabaseData.chambres_chambre_6_lit_gigogne || 0,
        autre_type_lit: supabaseData.chambres_chambre_6_autre_type_lit || "",
        equipements_draps_fournis: supabaseData.chambres_chambre_6_equipements_draps_fournis ?? null,
        equipements_climatisation: supabaseData.chambres_chambre_6_equipements_climatisation ?? null,
        equipements_ventilateur_plafond: supabaseData.chambres_chambre_6_equipements_ventilateur_plafond ?? null,
        equipements_espace_rangement: supabaseData.chambres_chambre_6_equipements_espace_rangement ?? null,
        equipements_lit_bebe_60_120: supabaseData.chambres_chambre_6_equipements_lit_bebe_60_120 ?? null,
        equipements_stores: supabaseData.chambres_chambre_6_equipements_stores ?? null,
        equipements_television: supabaseData.chambres_chambre_6_equipements_television ?? null,
        equipements_oreillers_couvertures_sup: supabaseData.chambres_chambre_6_equipements_oreillers_couvertures_sup ?? null,
        equipements_chauffage: supabaseData.chambres_chambre_6_equipements_chauffage ?? null,
        equipements_cintres: supabaseData.chambres_chambre_6_equipements_cintres ?? null,
        equipements_moustiquaire: supabaseData.chambres_chambre_6_equipements_moustiquaire ?? null,
        equipements_lit_parapluie_60_120: supabaseData.chambres_chambre_6_equipements_lit_parapluie_60_120 ?? null,
        equipements_systeme_audio: supabaseData.chambres_chambre_6_equipements_systeme_audio ?? null,
        equipements_coffre_fort: supabaseData.chambres_chambre_6_equipements_coffre_fort ?? null,
        equipements_autre: supabaseData.chambres_chambre_6_equipements_autre ?? null,
        equipements_autre_details: supabaseData.chambres_chambre_6_equipements_autre_details || "",
        photos_chambre: supabaseData.chambres_chambre_6_photos_chambre || []
      }
    },
    section_salle_de_bains: {
      salle_de_bain_1: {
        nom_description: supabaseData.salle_de_bains_salle_de_bain_1_nom_description || "",
        equipements_douche: supabaseData.salle_de_bains_salle_de_bain_1_equipements_douche ?? null,
        equipements_baignoire: supabaseData.salle_de_bains_salle_de_bain_1_equipements_baignoire ?? null,
        equipements_douche_baignoire_combinees: supabaseData.salle_de_bains_salle_de_bain_1_equipements_douche_baignoire_com ?? null,
        equipements_double_vasque: supabaseData.salle_de_bains_salle_de_bain_1_equipements_double_vasque ?? null,
        equipements_wc: supabaseData.salle_de_bains_salle_de_bain_1_equipements_wc ?? null,
        equipements_bidet: supabaseData.salle_de_bains_salle_de_bain_1_equipements_bidet ?? null,
        equipements_chauffage: supabaseData.salle_de_bains_salle_de_bain_1_equipements_chauffage ?? null,
        equipements_lave_linge: supabaseData.salle_de_bains_salle_de_bain_1_equipements_lave_linge ?? null,
        equipements_seche_serviette: supabaseData.salle_de_bains_salle_de_bain_1_equipements_seche_serviette ?? null,
        equipements_seche_cheveux: supabaseData.salle_de_bains_salle_de_bain_1_equipements_seche_cheveux ?? null,
        equipements_autre: supabaseData.salle_de_bains_salle_de_bain_1_equipements_autre ?? null,
        equipements_autre_details: supabaseData.salle_de_bains_salle_de_bain_1_equipements_autre_details || "",
        wc_separe: supabaseData.salle_de_bains_salle_de_bain_1_wc_separe ?? null,
        acces: supabaseData.salle_de_bains_salle_de_bain_1_acces || "",
        photos_salle_de_bain: supabaseData.salle_de_bains_salle_de_bain_1_photos_salle_de_bain || []
      },
      
      salle_de_bain_2: {
        nom_description: supabaseData.salle_de_bains_salle_de_bain_2_nom_description || "",
        equipements_douche: supabaseData.salle_de_bains_salle_de_bain_2_equipements_douche ?? null,
        equipements_baignoire: supabaseData.salle_de_bains_salle_de_bain_2_equipements_baignoire ?? null,
        equipements_douche_baignoire_combinees: supabaseData.salle_de_bains_salle_de_bain_2_equipements_douche_baignoire_com ?? null,
        equipements_double_vasque: supabaseData.salle_de_bains_salle_de_bain_2_equipements_double_vasque ?? null,
        equipements_wc: supabaseData.salle_de_bains_salle_de_bain_2_equipements_wc ?? null,
        equipements_bidet: supabaseData.salle_de_bains_salle_de_bain_2_equipements_bidet ?? null,
        equipements_chauffage: supabaseData.salle_de_bains_salle_de_bain_2_equipements_chauffage ?? null,
        equipements_lave_linge: supabaseData.salle_de_bains_salle_de_bain_2_equipements_lave_linge ?? null,
        equipements_seche_serviette: supabaseData.salle_de_bains_salle_de_bain_2_equipements_seche_serviette ?? null,
        equipements_seche_cheveux: supabaseData.salle_de_bains_salle_de_bain_2_equipements_seche_cheveux ?? null,
        equipements_autre: supabaseData.salle_de_bains_salle_de_bain_2_equipements_autre ?? null,
        equipements_autre_details: supabaseData.salle_de_bains_salle_de_bain_2_equipements_autre_details || "",
        wc_separe: supabaseData.salle_de_bains_salle_de_bain_2_wc_separe ?? null,
        acces: supabaseData.salle_de_bains_salle_de_bain_2_acces || "",
        photos_salle_de_bain: supabaseData.salle_de_bains_salle_de_bain_2_photos_salle_de_bain || []
      },
      
      salle_de_bain_3: {
        nom_description: supabaseData.salle_de_bains_salle_de_bain_3_nom_description || "",
        equipements_douche: supabaseData.salle_de_bains_salle_de_bain_3_equipements_douche ?? null,
        equipements_baignoire: supabaseData.salle_de_bains_salle_de_bain_3_equipements_baignoire ?? null,
        equipements_douche_baignoire_combinees: supabaseData.salle_de_bains_salle_de_bain_3_equipements_douche_baignoire_com ?? null,
        equipements_double_vasque: supabaseData.salle_de_bains_salle_de_bain_3_equipements_double_vasque ?? null,
        equipements_wc: supabaseData.salle_de_bains_salle_de_bain_3_equipements_wc ?? null,
        equipements_bidet: supabaseData.salle_de_bains_salle_de_bain_3_equipements_bidet ?? null,
        equipements_chauffage: supabaseData.salle_de_bains_salle_de_bain_3_equipements_chauffage ?? null,
        equipements_lave_linge: supabaseData.salle_de_bains_salle_de_bain_3_equipements_lave_linge ?? null,
        equipements_seche_serviette: supabaseData.salle_de_bains_salle_de_bain_3_equipements_seche_serviette ?? null,
        equipements_seche_cheveux: supabaseData.salle_de_bains_salle_de_bain_3_equipements_seche_cheveux ?? null,
        equipements_autre: supabaseData.salle_de_bains_salle_de_bain_3_equipements_autre ?? null,
        equipements_autre_details: supabaseData.salle_de_bains_salle_de_bain_3_equipements_autre_details || "",
        wc_separe: supabaseData.salle_de_bains_salle_de_bain_3_wc_separe ?? null,
        acces: supabaseData.salle_de_bains_salle_de_bain_3_acces || "",
        photos_salle_de_bain: supabaseData.salle_de_bains_salle_de_bain_3_photos_salle_de_bain || []
      },
      
      salle_de_bain_4: {
        nom_description: supabaseData.salle_de_bains_salle_de_bain_4_nom_description || "",
        equipements_douche: supabaseData.salle_de_bains_salle_de_bain_4_equipements_douche ?? null,
        equipements_baignoire: supabaseData.salle_de_bains_salle_de_bain_4_equipements_baignoire ?? null,
        equipements_douche_baignoire_combinees: supabaseData.salle_de_bains_salle_de_bain_4_equipements_douche_baignoire_com ?? null,
        equipements_double_vasque: supabaseData.salle_de_bains_salle_de_bain_4_equipements_double_vasque ?? null,
        equipements_wc: supabaseData.salle_de_bains_salle_de_bain_4_equipements_wc ?? null,
        equipements_bidet: supabaseData.salle_de_bains_salle_de_bain_4_equipements_bidet ?? null,
        equipements_chauffage: supabaseData.salle_de_bains_salle_de_bain_4_equipements_chauffage ?? null,
        equipements_lave_linge: supabaseData.salle_de_bains_salle_de_bain_4_equipements_lave_linge ?? null,
        equipements_seche_serviette: supabaseData.salle_de_bains_salle_de_bain_4_equipements_seche_serviette ?? null,
        equipements_seche_cheveux: supabaseData.salle_de_bains_salle_de_bain_4_equipements_seche_cheveux ?? null,
        equipements_autre: supabaseData.salle_de_bains_salle_de_bain_4_equipements_autre ?? null,
        equipements_autre_details: supabaseData.salle_de_bains_salle_de_bain_4_equipements_autre_details || "",
        wc_separe: supabaseData.salle_de_bains_salle_de_bain_4_wc_separe ?? null,
        acces: supabaseData.salle_de_bains_salle_de_bain_4_acces || "",
        photos_salle_de_bain: supabaseData.salle_de_bains_salle_de_bain_4_photos_salle_de_bain || []
      },
      
      salle_de_bain_5: {
        nom_description: supabaseData.salle_de_bains_salle_de_bain_5_nom_description || "",
        equipements_douche: supabaseData.salle_de_bains_salle_de_bain_5_equipements_douche ?? null,
        equipements_baignoire: supabaseData.salle_de_bains_salle_de_bain_5_equipements_baignoire ?? null,
        equipements_douche_baignoire_combinees: supabaseData.salle_de_bains_salle_de_bain_5_equipements_douche_baignoire_com ?? null,
        equipements_double_vasque: supabaseData.salle_de_bains_salle_de_bain_5_equipements_double_vasque ?? null,
        equipements_wc: supabaseData.salle_de_bains_salle_de_bain_5_equipements_wc ?? null,
        equipements_bidet: supabaseData.salle_de_bains_salle_de_bain_5_equipements_bidet ?? null,
        equipements_chauffage: supabaseData.salle_de_bains_salle_de_bain_5_equipements_chauffage ?? null,
        equipements_lave_linge: supabaseData.salle_de_bains_salle_de_bain_5_equipements_lave_linge ?? null,
        equipements_seche_serviette: supabaseData.salle_de_bains_salle_de_bain_5_equipements_seche_serviette ?? null,
        equipements_seche_cheveux: supabaseData.salle_de_bains_salle_de_bain_5_equipements_seche_cheveux ?? null,
        equipements_autre: supabaseData.salle_de_bains_salle_de_bain_5_equipements_autre ?? null,
        equipements_autre_details: supabaseData.salle_de_bains_salle_de_bain_5_equipements_autre_details || "",
        wc_separe: supabaseData.salle_de_bains_salle_de_bain_5_wc_separe ?? null,
        acces: supabaseData.salle_de_bains_salle_de_bain_5_acces || "",
        photos_salle_de_bain: supabaseData.salle_de_bains_salle_de_bain_5_photos_salle_de_bain || []
      },
      
      salle_de_bain_6: {
        nom_description: supabaseData.salle_de_bains_salle_de_bain_6_nom_description || "",
        equipements_douche: supabaseData.salle_de_bains_salle_de_bain_6_equipements_douche ?? null,
        equipements_baignoire: supabaseData.salle_de_bains_salle_de_bain_6_equipements_baignoire ?? null,
        equipements_douche_baignoire_combinees: supabaseData.salle_de_bains_salle_de_bain_6_equipements_douche_baignoire_com ?? null,
        equipements_double_vasque: supabaseData.salle_de_bains_salle_de_bain_6_equipements_double_vasque ?? null,
        equipements_wc: supabaseData.salle_de_bains_salle_de_bain_6_equipements_wc ?? null,
        equipements_bidet: supabaseData.salle_de_bains_salle_de_bain_6_equipements_bidet ?? null,
        equipements_chauffage: supabaseData.salle_de_bains_salle_de_bain_6_equipements_chauffage ?? null,
        equipements_lave_linge: supabaseData.salle_de_bains_salle_de_bain_6_equipements_lave_linge ?? null,
        equipements_seche_serviette: supabaseData.salle_de_bains_salle_de_bain_6_equipements_seche_serviette ?? null,
        equipements_seche_cheveux: supabaseData.salle_de_bains_salle_de_bain_6_equipements_seche_cheveux ?? null,
        equipements_autre: supabaseData.salle_de_bains_salle_de_bain_6_equipements_autre ?? null,
        equipements_autre_details: supabaseData.salle_de_bains_salle_de_bain_6_equipements_autre_details || "",
        wc_separe: supabaseData.salle_de_bains_salle_de_bain_6_wc_separe ?? null,
        acces: supabaseData.salle_de_bains_salle_de_bain_6_acces || "",
        photos_salle_de_bain: supabaseData.salle_de_bains_salle_de_bain_6_photos_salle_de_bain || []
      }
    },
    section_cuisine_1: {
      // Checkboxes principales (16 équipements)
      equipements_refrigerateur: supabaseData.cuisine_1_equipements_refrigerateur ?? null,
      equipements_congelateur: supabaseData.cuisine_1_equipements_congelateur ?? null,
      equipements_mini_refrigerateur: supabaseData.cuisine_1_equipements_mini_refrigerateur ?? null,
      equipements_cuisiniere: supabaseData.cuisine_1_equipements_cuisiniere ?? null,
      equipements_plaque_cuisson: supabaseData.cuisine_1_equipements_plaque_cuisson ?? null,
      equipements_four: supabaseData.cuisine_1_equipements_four ?? null,
      equipements_micro_ondes: supabaseData.cuisine_1_equipements_micro_ondes ?? null,
      equipements_lave_vaisselle: supabaseData.cuisine_1_equipements_lave_vaisselle ?? null,
      equipements_cafetiere: supabaseData.cuisine_1_equipements_cafetiere ?? null,
      equipements_bouilloire: supabaseData.cuisine_1_equipements_bouilloire ?? null,
      equipements_grille_pain: supabaseData.cuisine_1_equipements_grille_pain ?? null,
      equipements_blender: supabaseData.cuisine_1_equipements_blender ?? null,
      equipements_cuiseur_riz: supabaseData.cuisine_1_equipements_cuiseur_riz ?? null,
      equipements_machine_pain: supabaseData.cuisine_1_equipements_machine_pain ?? null,
      equipements_lave_linge: supabaseData.cuisine_1_equipements_lave_linge ?? null,
      equipements_autre: supabaseData.cuisine_1_equipements_autre ?? null,
      equipements_autre_details: supabaseData.cuisine_1_equipements_autre_details || "",
    
      // RÉFRIGÉRATEUR - Champs conditionnels
      refrigerateur_marque: supabaseData.cuisine_1_refrigerateur_marque || "",
      refrigerateur_instructions: supabaseData.cuisine_1_refrigerateur_instructions || "",
      refrigerateur_video: supabaseData.cuisine_1_refrigerateur_video ?? null,
    
      // CONGÉLATEUR - Champs conditionnels
      congelateur_instructions: supabaseData.cuisine_1_congelateur_instructions || "",
      congelateur_video: supabaseData.cuisine_1_congelateur_video ?? null,
    
      // MINI RÉFRIGÉRATEUR - Champs conditionnels
      mini_refrigerateur_instructions: supabaseData.cuisine_1_mini_refrigerateur_instructions || "",
      mini_refrigerateur_video: supabaseData.cuisine_1_mini_refrigerateur_video ?? null,
    
      // CUISINIÈRE - Champs conditionnels
      cuisiniere_marque: supabaseData.cuisine_1_cuisiniere_marque || "",
      cuisiniere_type: supabaseData.cuisine_1_cuisiniere_type || "",
      cuisiniere_nombre_feux: supabaseData.cuisine_1_cuisiniere_nombre_feux?.toString() || "",
      cuisiniere_instructions: supabaseData.cuisine_1_cuisiniere_instructions || "",
      cuisiniere_photo: supabaseData.cuisine_1_cuisiniere_photo || [],
      cuisiniere_video: supabaseData.cuisine_1_cuisiniere_video ?? null,
    
      // PLAQUE DE CUISSON - Champs conditionnels
      plaque_cuisson_marque: supabaseData.cuisine_1_plaque_cuisson_marque || "",
      plaque_cuisson_type: supabaseData.cuisine_1_plaque_cuisson_type || "",
      plaque_cuisson_nombre_feux: supabaseData.cuisine_1_plaque_cuisson_nombre_feux?.toString() || "",
      plaque_cuisson_instructions: supabaseData.cuisine_1_plaque_cuisson_instructions || "",
      plaque_cuisson_photo: supabaseData.cuisine_1_plaque_cuisson_photo || [],
      plaque_cuisson_video: supabaseData.cuisine_1_plaque_cuisson_video ?? null,
    
      // FOUR - Champs conditionnels
      four_marque: supabaseData.cuisine_1_four_marque || "",
      four_type: supabaseData.cuisine_1_four_type || "",
      four_instructions: supabaseData.cuisine_1_four_instructions || "",
      four_photo: supabaseData.cuisine_1_four_photo || [],
      four_video: supabaseData.cuisine_1_four_video ?? null,
    
      // FOUR À MICRO-ONDES - Champs conditionnels
      micro_ondes_instructions: supabaseData.cuisine_1_micro_ondes_instructions || "",
      micro_ondes_photo: supabaseData.cuisine_1_micro_ondes_photo || [],
      micro_ondes_video: supabaseData.cuisine_1_micro_ondes_video ?? null,
    
      // LAVE-VAISSELLE - Champs conditionnels
      lave_vaisselle_instructions: supabaseData.cuisine_1_lave_vaisselle_instructions || "",
      lave_vaisselle_photo: supabaseData.cuisine_1_lave_vaisselle_photo || [],
      lave_vaisselle_video: supabaseData.cuisine_1_lave_vaisselle_video ?? null,
    
      // CAFETIÈRE - Champs conditionnels
      cafetiere_marque: supabaseData.cuisine_1_cafetiere_marque || "",
      cafetiere_type_filtre: supabaseData.cuisine_1_cafetiere_type_filtre ?? null,
      cafetiere_type_expresso: supabaseData.cuisine_1_cafetiere_type_expresso ?? null,
      cafetiere_type_piston: supabaseData.cuisine_1_cafetiere_type_piston ?? null,
      cafetiere_type_keurig: supabaseData.cuisine_1_cafetiere_type_keurig ?? null,
      cafetiere_type_nespresso: supabaseData.cuisine_1_cafetiere_type_nespresso ?? null,
      cafetiere_type_manuelle: supabaseData.cuisine_1_cafetiere_type_manuelle ?? null,
      cafetiere_type_bar_grain: supabaseData.cuisine_1_cafetiere_type_bar_grain ?? null,
      cafetiere_type_bar_moulu: supabaseData.cuisine_1_cafetiere_type_bar_moulu ?? null,
      cafetiere_instructions: supabaseData.cuisine_1_cafetiere_instructions || "",
      cafetiere_photo: supabaseData.cuisine_1_cafetiere_photo || [],
      cafetiere_video: supabaseData.cuisine_1_cafetiere_video ?? null,
      cafetiere_cafe_fourni: supabaseData.cuisine_1_cafetiere_cafe_fourni || "",
      cafetiere_marque_cafe: supabaseData.cuisine_1_cafetiere_marque_cafe || "",
    
      // BOUILLOIRE ÉLECTRIQUE - Champs conditionnels
      bouilloire_instructions: supabaseData.cuisine_1_bouilloire_instructions || "",
      bouilloire_video: supabaseData.cuisine_1_bouilloire_video ?? null,
    
      // GRILLE-PAIN - Champs conditionnels
      grille_pain_instructions: supabaseData.cuisine_1_grille_pain_instructions || "",
      grille_pain_video: supabaseData.cuisine_1_grille_pain_video ?? null,
    
      // BLENDER - Champs conditionnels
      blender_instructions: supabaseData.cuisine_1_blender_instructions || "",
      blender_video: supabaseData.cuisine_1_blender_video ?? null,
    
      // CUISEUR À RIZ - Champs conditionnels
      cuiseur_riz_instructions: supabaseData.cuisine_1_cuiseur_riz_instructions || "",
      cuiseur_riz_video: supabaseData.cuisine_1_cuiseur_riz_video ?? null,
    
      // MACHINE À PAIN - Champs conditionnels
      machine_pain_instructions: supabaseData.cuisine_1_machine_pain_instructions || "",
      machine_pain_video: supabaseData.cuisine_1_machine_pain_video ?? null
    },

    section_cuisine_2: {
      // VAISSELLE (4 compteurs)
      vaisselle_assiettes_plates: supabaseData.cuisine_2_vaisselle_assiettes_plates || 0,
      vaisselle_assiettes_dessert: supabaseData.cuisine_2_vaisselle_assiettes_dessert || 0,
      vaisselle_assiettes_creuses: supabaseData.cuisine_2_vaisselle_assiettes_creuses || 0,
      vaisselle_bols: supabaseData.cuisine_2_vaisselle_bols || 0,
      
      // COUVERTS (11 compteurs)
      couverts_verres_eau: supabaseData.cuisine_2_couverts_verres_eau || 0,
      couverts_verres_vin: supabaseData.cuisine_2_couverts_verres_vin || 0,
      couverts_tasses: supabaseData.cuisine_2_couverts_tasses || 0,
      couverts_flutes_champagne: supabaseData.cuisine_2_couverts_flutes_champagne || 0,
      couverts_mugs: supabaseData.cuisine_2_couverts_mugs || 0,
      couverts_couteaux_table: supabaseData.cuisine_2_couverts_couteaux_table || 0,
      couverts_fourchettes: supabaseData.cuisine_2_couverts_fourchettes || 0,
      couverts_couteaux_steak: supabaseData.cuisine_2_couverts_couteaux_steak || 0,
      couverts_cuilleres_soupe: supabaseData.cuisine_2_couverts_cuilleres_soupe || 0,
      couverts_cuilleres_cafe: supabaseData.cuisine_2_couverts_cuilleres_cafe || 0,
      couverts_cuilleres_dessert: supabaseData.cuisine_2_couverts_cuilleres_dessert || 0,
      
      // USTENSILES DE CUISINE (26 compteurs)
      ustensiles_poeles_differentes_tailles: supabaseData.cuisine_2_ustensiles_poeles_differentes_tailles || 0,
      ustensiles_casseroles_differentes_tailles: supabaseData.cuisine_2_ustensiles_casseroles_differentes_tailles || 0,
      ustensiles_faitouts: supabaseData.cuisine_2_ustensiles_faitouts || 0,
      ustensiles_wok: supabaseData.cuisine_2_ustensiles_wok || 0,
      ustensiles_cocotte_minute: supabaseData.cuisine_2_ustensiles_cocotte_minute || 0,
      ustensiles_couvercle_anti_eclaboussures: supabaseData.cuisine_2_ustensiles_couvercle_anti_eclaboussures || 0,
      ustensiles_robot_cuisine: supabaseData.cuisine_2_ustensiles_robot_cuisine || 0,
      ustensiles_batteur_electrique: supabaseData.cuisine_2_ustensiles_batteur_electrique || 0,
      ustensiles_couteaux_cuisine: supabaseData.cuisine_2_ustensiles_couteaux_cuisine || 0,
      ustensiles_spatules: supabaseData.cuisine_2_ustensiles_spatules || 0,
      ustensiles_ecumoire: supabaseData.cuisine_2_ustensiles_ecumoire || 0,
      ustensiles_ouvre_boite: supabaseData.cuisine_2_ustensiles_ouvre_boite || 0,
      ustensiles_rape: supabaseData.cuisine_2_ustensiles_rape || 0,
      ustensiles_tire_bouchon: supabaseData.cuisine_2_ustensiles_tire_bouchon || 0,
      ustensiles_econome: supabaseData.cuisine_2_ustensiles_econome || 0,
      ustensiles_passoire: supabaseData.cuisine_2_ustensiles_passoire || 0,
      ustensiles_planche_decouper: supabaseData.cuisine_2_ustensiles_planche_decouper || 0,
      ustensiles_rouleau_patisserie: supabaseData.cuisine_2_ustensiles_rouleau_patisserie || 0,
      ustensiles_ciseaux_cuisine: supabaseData.cuisine_2_ustensiles_ciseaux_cuisine || 0,
      ustensiles_balance_cuisine: supabaseData.cuisine_2_ustensiles_balance_cuisine || 0,
      ustensiles_bac_glacon: supabaseData.cuisine_2_ustensiles_bac_glacon || 0,
      ustensiles_pince_cuisine: supabaseData.cuisine_2_ustensiles_pince_cuisine || 0,
      ustensiles_couteau_huitre: supabaseData.cuisine_2_ustensiles_couteau_huitre || 0,
      ustensiles_verre_mesureur: supabaseData.cuisine_2_ustensiles_verre_mesureur || 0,
      ustensiles_presse_agrume_manuel: supabaseData.cuisine_2_ustensiles_presse_agrume_manuel || 0,
      ustensiles_pichet: supabaseData.cuisine_2_ustensiles_pichet || 0,
      
      // PLATS ET RÉCIPIENTS (11 compteurs)
      plats_dessous_plat: supabaseData.cuisine_2_plats_dessous_plat || 0,
      plats_plateau: supabaseData.cuisine_2_plats_plateau || 0,
      plats_saladiers: supabaseData.cuisine_2_plats_saladiers || 0,
      plats_a_four: supabaseData.cuisine_2_plats_a_four || 0,
      plats_carafes: supabaseData.cuisine_2_plats_carafes || 0,
      plats_moules: supabaseData.cuisine_2_plats_moules || 0,
      plats_theiere: supabaseData.cuisine_2_plats_theiere || 0,
      plats_cafetiere_piston_filtre: supabaseData.cuisine_2_plats_cafetiere_piston_filtre || 0,
      plats_ustensiles_barbecue: supabaseData.cuisine_2_plats_ustensiles_barbecue || 0,
      plats_gants_cuisine: supabaseData.cuisine_2_plats_gants_cuisine || 0,
      plats_maniques: supabaseData.cuisine_2_plats_maniques || 0,
      
      // CHAMPS COMPLÉMENTAIRES
      autres_ustensiles: supabaseData.cuisine_2_autres_ustensiles || "",
      quantite_suffisante: supabaseData.cuisine_2_quantite_suffisante ?? null,
      quantite_insuffisante_details: supabaseData.cuisine_2_quantite_insuffisante_details || "",
      casseroles_poeles_testees: supabaseData.cuisine_2_casseroles_poeles_testees ?? null,
      photos_tiroirs_placards: supabaseData.cuisine_2_photos_tiroirs_placards || []
    },

    section_salon_sam: {
      // Description générale (obligatoire)
      description_generale: supabaseData.salon_sam_description_generale || "",
      
      // Équipements (13 checkboxes + autre)
      equipements_table_manger: supabaseData.salon_sam_equipements_table_manger ?? null,
      equipements_chaises: supabaseData.salon_sam_equipements_chaises ?? null,
      equipements_canape: supabaseData.salon_sam_equipements_canape ?? null,
      equipements_canape_lit: supabaseData.salon_sam_equipements_canape_lit ?? null,
      equipements_fauteuils: supabaseData.salon_sam_equipements_fauteuils ?? null,
      equipements_table_basse: supabaseData.salon_sam_equipements_table_basse ?? null,
      equipements_television: supabaseData.salon_sam_equipements_television ?? null,
      equipements_cheminee: supabaseData.salon_sam_equipements_cheminee ?? null,
      equipements_jeux_societe: supabaseData.salon_sam_equipements_jeux_societe ?? null,
      equipements_livres_magazines: supabaseData.salon_sam_equipements_livres_magazines ?? null,
      equipements_livres_jouets_enfants: supabaseData.salon_sam_equipements_livres_jouets_enfants ?? null,
      equipements_climatisation: supabaseData.salon_sam_equipements_climatisation ?? null,
      equipements_chauffage: supabaseData.salon_sam_equipements_chauffage ?? null,
      equipements_autre: supabaseData.salon_sam_equipements_autre ?? null,
      equipements_autre_details: supabaseData.salon_sam_equipements_autre_details || "",
      
      // Cheminée type (conditionnel)
      cheminee_type: supabaseData.salon_sam_cheminee_type || "",
      
      // Autres équipements détails (obligatoire)
      autres_equipements_details: supabaseData.salon_sam_autres_equipements_details || "",
      
      // Photos
      photos_salon_sam: supabaseData.salon_sam_photos_salon_sam || [],
      
      // Nombre places table (obligatoire)
      nombre_places_table: supabaseData.salon_sam_nombre_places_table?.toString() || ""
    },

    section_equip_spe_exterieur: {
      // CHAMPS RACINES
      dispose_exterieur: supabaseData.equip_spe_ext_dispose_exterieur ?? null,
      dispose_piscine: supabaseData.equip_spe_ext_dispose_piscine ?? null,
      dispose_jacuzzi: supabaseData.equip_spe_ext_dispose_jacuzzi ?? null,
      dispose_cuisine_exterieure: supabaseData.equip_spe_ext_dispose_cuisine_exterieure ?? null,
      
      // BRANCHE EXTÉRIEUR
      exterieur_type_espace: supabaseData.equip_spe_ext_exterieur_type_espace || [],
      exterieur_description_generale: supabaseData.equip_spe_ext_exterieur_description_generale || "",
      exterieur_entretien_prestataire: supabaseData.equip_spe_ext_exterieur_entretien_prestataire ?? null,
      exterieur_entretien_frequence: supabaseData.equip_spe_ext_exterieur_entretien_frequence || "",
      exterieur_entretien_type_prestation: supabaseData.equip_spe_ext_exterieur_entretien_type_prestation || "",
      exterieur_entretien_qui: supabaseData.equip_spe_ext_exterieur_entretien_qui || "",
      exterieur_equipements: supabaseData.equip_spe_ext_exterieur_equipements || [],
      exterieur_equipements_autre_details: supabaseData.equip_spe_ext_exterieur_equipements_autre_details || "",
      exterieur_nombre_chaises_longues: supabaseData.equip_spe_ext_exterieur_nombre_chaises_longues,
      exterieur_nombre_parasols: supabaseData.equip_spe_ext_exterieur_nombre_parasols,
      exterieur_photos: supabaseData.equip_spe_ext_exterieur_photos || [],
      exterieur_acces: supabaseData.equip_spe_ext_exterieur_acces || "",
      exterieur_type_acces: supabaseData.equip_spe_ext_exterieur_type_acces || "",
      exterieur_type_acces_autre_details: supabaseData.equip_spe_ext_exterieur_type_acces_autre_details || "",
      
      // SOUS-BRANCHE BARBECUE
      barbecue_instructions: supabaseData.equip_spe_ext_barbecue_instructions || "",
      barbecue_type: supabaseData.equip_spe_ext_barbecue_type || "",
      barbecue_combustible_fourni: supabaseData.equip_spe_ext_barbecue_combustible_fourni ?? null,
      barbecue_ustensiles_fournis: supabaseData.equip_spe_ext_barbecue_ustensiles_fournis ?? null,
      barbecue_photos: supabaseData.equip_spe_ext_barbecue_photos || [],
      
      // BRANCHE PISCINE
      piscine_type: supabaseData.equip_spe_ext_piscine_type || "",
      piscine_acces: supabaseData.equip_spe_ext_piscine_acces || "",
      piscine_dimensions: supabaseData.equip_spe_ext_piscine_dimensions || "",
      piscine_disponibilite: supabaseData.equip_spe_ext_piscine_disponibilite || "",
      piscine_periode_disponibilite: supabaseData.equip_spe_ext_piscine_periode_disponibilite || "",
      piscine_heures: supabaseData.equip_spe_ext_piscine_heures || "",
      piscine_horaires_ouverture: supabaseData.equip_spe_ext_piscine_horaires_ouverture || "",
      piscine_caracteristiques: supabaseData.equip_spe_ext_piscine_caracteristiques || [],
      piscine_periode_chauffage: supabaseData.equip_spe_ext_piscine_periode_chauffage || "",
      piscine_entretien_prestataire: supabaseData.equip_spe_ext_piscine_entretien_prestataire ?? null,
      piscine_entretien_frequence: supabaseData.equip_spe_ext_piscine_entretien_frequence || "",
      piscine_entretien_type_prestation: supabaseData.equip_spe_ext_piscine_entretien_type_prestation || "",
      piscine_entretien_qui: supabaseData.equip_spe_ext_piscine_entretien_qui || "",
      piscine_regles_utilisation: supabaseData.equip_spe_ext_piscine_regles_utilisation || "",
      piscine_video: supabaseData.equip_spe_ext_piscine_video ?? null,
      
      // BRANCHE JACUZZI
      jacuzzi_acces: supabaseData.equip_spe_ext_jacuzzi_acces || "",
      jacuzzi_entretien_prestataire: supabaseData.equip_spe_ext_jacuzzi_entretien_prestataire ?? null,
      jacuzzi_entretien_frequence: supabaseData.equip_spe_ext_jacuzzi_entretien_frequence || "",
      jacuzzi_entretien_type_prestation: supabaseData.equip_spe_ext_jacuzzi_entretien_type_prestation || "",
      jacuzzi_entretien_qui: supabaseData.equip_spe_ext_jacuzzi_entretien_qui || "",
      jacuzzi_taille: supabaseData.equip_spe_ext_jacuzzi_taille || "",
      jacuzzi_instructions: supabaseData.equip_spe_ext_jacuzzi_instructions || "",
      jacuzzi_heures_utilisation: supabaseData.equip_spe_ext_jacuzzi_heures_utilisation || "",
      jacuzzi_photos: supabaseData.equip_spe_ext_jacuzzi_photos || [],
      
      // BRANCHE CUISINE EXTÉRIEURE
      cuisine_ext_entretien_prestataire: supabaseData.equip_spe_ext_cuisine_ext_entretien_prestataire ?? null,
      cuisine_ext_entretien_frequence: supabaseData.equip_spe_ext_cuisine_ext_entretien_frequence || "",
      cuisine_ext_entretien_type_prestation: supabaseData.equip_spe_ext_cuisine_ext_entretien_type_prestation || "",
      cuisine_ext_entretien_qui: supabaseData.equip_spe_ext_cuisine_ext_entretien_qui || "",
      cuisine_ext_superficie: supabaseData.equip_spe_ext_cuisine_ext_superficie || "",
      cuisine_ext_type: supabaseData.equip_spe_ext_cuisine_ext_type || "",
      cuisine_ext_caracteristiques: supabaseData.equip_spe_ext_cuisine_ext_caracteristiques || []
    },


    section_communs: {
      dispose_espaces_communs: supabaseData.communs_dispose_espaces_communs ?? null,
      description_generale: supabaseData.communs_description_generale || "",
      entretien_prestataire: supabaseData.communs_entretien_prestataire ?? null,
      entretien_frequence: supabaseData.communs_entretien_frequence || "",
      entretien_qui: supabaseData.communs_entretien_qui || "",
      photos_espaces_communs: supabaseData.communs_photos_espaces_communs || []
    },

    section_teletravail: {
      equipements: supabaseData.teletravail_equipements || [],
      equipements_autre_details: supabaseData.teletravail_equipements_autre_details || ""
    },

    section_bebe: {
      equipements: supabaseData.bebe_equipements || [],
      lit_bebe_type: supabaseData.bebe_lit_bebe_type || "",
      lit_parapluie_disponibilite: supabaseData.bebe_lit_parapluie_disponibilite || "",
      lit_stores_occultants: supabaseData.bebe_lit_stores_occultants ?? null,
      chaise_haute_type: supabaseData.bebe_chaise_haute_type || "",
      chaise_haute_disponibilite: supabaseData.bebe_chaise_haute_disponibilite || "",
      chaise_haute_caracteristiques: supabaseData.bebe_chaise_haute_caracteristiques || [],
      chaise_haute_prix: supabaseData.bebe_chaise_haute_prix || "",
      jouets_tranches_age: supabaseData.bebe_jouets_tranches_age || [],
      equipements_autre_details: supabaseData.bebe_equipements_autre_details || "",
      photos_equipements_bebe: supabaseData.bebe_photos_equipements_bebe || []
    },

    section_securite: {
      equipements: supabaseData.securite_equipements || [],
      alarme_desarmement: supabaseData.securite_alarme_desarmement || "",
      photos_equipements_securite: supabaseData.securite_photos_equipements_securite || []
    },
    pdf_logement_url: supabaseData.pdf_logement_url || null,
    pdf_menage_url: supabaseData.pdf_menage_url || null
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
      result = await safeSupabaseQuery(
        supabase
          .from('fiches')
          .update(supabaseData)
          .eq('id', formData.id)
          .select()
          .single()
      )
    } else {
      // Création d'une nouvelle fiche
      result = await safeSupabaseQuery(
        supabase
          .from('fiches')
          .insert(supabaseData)
          .select()
          .single()
      )
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
    const result = await safeSupabaseQuery(
      supabase
        .from('fiches')
        .select('*')
        .eq('id', ficheId)
        .single()
    )
    
    if (result.error) {
      throw result.error
    }
    
    return {
      success: true,
      data: mapSupabaseToFormData(result.data),
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
    const result = await safeSupabaseQuery(
      supabase
        .from('fiches')
        .select('id, nom, statut, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
    )
    
    if (result.error) {
      throw result.error
    }
    
    return {
      success: true,
      data: result.data || [],
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


// 🗑️ Supprimer une fiche + cleanup storage (VERSION RÉCURSIVE)
export const deleteFiche = async (ficheId) => {
  try {
    // 1. D'abord récupérer la fiche pour accéder à user_id et numero_bien
    const { data: ficheData, error: fetchError } = await supabase
      .from('fiches')
      .select('user_id, logement_numero_bien')
      .eq('id', ficheId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    // 2. Supprimer le dossier photos complet du storage (RÉCURSIF)
    if (ficheData.user_id && ficheData.logement_numero_bien) {
      const basePath = `user-${ficheData.user_id}/fiche-${ficheData.logement_numero_bien}`
      
      console.log(`🗑️ Suppression récursive dossier: ${basePath}`)
      
      // Fonction récursive pour lister tous les fichiers
      const getAllFilesRecursive = async (path = basePath, allFiles = []) => {
        const { data: items, error } = await supabase.storage
          .from('fiche-photos')
          .list(path, { limit: 1000 })

        if (error) {
          console.warn(`Erreur listage ${path}:`, error)
          return allFiles
        }

        for (const item of items || []) {
          const fullPath = `${path}/${item.name}`
          
          if (item.metadata === null) {
            // C'est un dossier, lister récursivement
            await getAllFilesRecursive(fullPath, allFiles)
          } else {
            // C'est un fichier, l'ajouter à la liste
            allFiles.push(fullPath)
          }
        }
        
        return allFiles
      }

      // Récupérer tous les fichiers récursivement
      const allFiles = await getAllFilesRecursive()
      
      if (allFiles.length > 0) {
        console.log(`📁 ${allFiles.length} fichiers trouvés:`, allFiles)
        
        // Supprimer tous les fichiers
        const { error: deleteError } = await supabase.storage
          .from('fiche-photos')
          .remove(allFiles)

        if (deleteError) {
          console.warn('Erreur suppression photos:', deleteError)
          // Continue quand même
        } else {
          console.log(`✅ ${allFiles.length} fichiers supprimés du storage`)
        }
      } else {
        console.log('📁 Aucun fichier trouvé dans le dossier')
      }
    }

    // 3. Supprimer la fiche de la base de données
    const { error } = await supabase
      .from('fiches')
      .delete()
      .eq('id', ficheId)
    
    if (error) {
      throw error
    }
    
    return {
      success: true,
      message: 'Fiche et photos supprimées avec succès'
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

// À AJOUTER à la fin du fichier src/lib/supabaseHelpers.js
// APRÈS toutes les autres fonctions existantes (getAllFiches, updateFicheStatut, etc.)

// 🔍 Vérifier si une fiche existe déjà pour ce numéro de bien
export const checkExistingFiche = async (numeroBien, userId) => {
  try {
    const { data, error } = await supabase
      .from('fiches')
      .select('id, nom, updated_at')
      .eq('logement_numero_bien', numeroBien)
      .eq('user_id', userId)
      .neq('statut', 'Archivé')  // Ignorer les fiches archivées
      .order('updated_at', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('Erreur check doublon:', error)
      return { exists: false }
    }
    
    if (data && data.length > 0) {
      return { 
        exists: true, 
        fiche: data[0] 
      }
    }
    
    return { exists: false }
  } catch (error) {
    console.error('Erreur check doublon:', error)
    return { exists: false }
  }
}