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
    salle_de_bains_salle_de_bain_1_equipements_douche_baignoire_combinees: formData.section_salle_de_bains?.salle_de_bain_1?.equipements_douche_baignoire_combinees ?? null,
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
    salle_de_bains_salle_de_bain_2_equipements_douche_baignoire_combinees: formData.section_salle_de_bains?.salle_de_bain_2?.equipements_douche_baignoire_combinees ?? null,
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
    salle_de_bains_salle_de_bain_3_equipements_douche_baignoire_combinees: formData.section_salle_de_bains?.salle_de_bain_3?.equipements_douche_baignoire_combinees ?? null,
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
    salle_de_bains_salle_de_bain_4_equipements_douche_baignoire_combinees: formData.section_salle_de_bains?.salle_de_bain_4?.equipements_douche_baignoire_combinees ?? null,
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
    salle_de_bains_salle_de_bain_5_equipements_douche_baignoire_combinees: formData.section_salle_de_bains?.salle_de_bain_5?.equipements_douche_baignoire_combinees ?? null,
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
    salle_de_bains_salle_de_bain_6_equipements_douche_baignoire_combinees: formData.section_salle_de_bains?.salle_de_bain_6?.equipements_douche_baignoire_combinees ?? null,
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
      parking_payant_type: supabaseData.equipements_parking_payant_type || "",
      parking_payant_details: supabaseData.equipements_parking_payant_details || ""
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
        equipements_douche_baignoire_combinees: supabaseData.salle_de_bains_salle_de_bain_1_equipements_douche_baignoire_combinees ?? null,
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
        equipements_douche_baignoire_combinees: supabaseData.salle_de_bains_salle_de_bain_2_equipements_douche_baignoire_combinees ?? null,
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
        equipements_douche_baignoire_combinees: supabaseData.salle_de_bains_salle_de_bain_3_equipements_douche_baignoire_combinees ?? null,
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
        equipements_douche_baignoire_combinees: supabaseData.salle_de_bains_salle_de_bain_4_equipements_douche_baignoire_combinees ?? null,
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
        equipements_douche_baignoire_combinees: supabaseData.salle_de_bains_salle_de_bain_5_equipements_douche_baignoire_combinees ?? null,
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
        equipements_douche_baignoire_combinees: supabaseData.salle_de_bains_salle_de_bain_6_equipements_douche_baignoire_combinees ?? null,
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