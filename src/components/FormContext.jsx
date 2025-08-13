// src/components/FormContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { saveFiche, loadFiche } from '../lib/supabaseHelpers'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabaseClient'

const FormContext = createContext()

const initialFormData = {
  id: null,
  user_id: null,
  created_at: null,
  updated_at: null,
  nom: "Nouvelle fiche",
  statut: "Brouillon",
  
  section_proprietaire: {
    prenom: "",
    nom: "",
    email: "",
    adresse: {
      rue: "",
      complement: "",
      ville: "",
      codePostal: ""
    }
  },
  section_logement: {
    // Nouveaux champs Monday
    type_propriete: "",           // Dropdown principal (Appartement, Maison, etc.)
    surface: "",                  // m² direct depuis Monday
    numero_bien: "",              // numeroDu depuis Monday
    typologie: "",                // T2, T3, T4, etc.
    nombre_personnes_max: "",     // nombreDe depuis Monday
    nombre_lits: "",              // lits depuis Monday (valeur brute)
    type_autre_precision: "",     // Si type = "Autre"
    
    // Structure appartement conditionnelle
    appartement: {
      nom_residence: "",
      batiment: "",
      acces: "",                  // RDC, Escalier, Ascenseur
      etage: "",
      numero_porte: ""
    },
    
    // Legacy - à garder pour compatibilité existante
    type: "",
    adresse: {
      rue: "",
      complement: "",
      ville: "",
      codePostal: "",
      batiment: "",
      etage: "",
      numeroPorte: ""
    },
    caracteristiques: {
      nombrePieces: "",
      nombreChambres: "",
      surface: ""
    },
    acces: ""
  },
  section_clefs: {
    // Type de boîte + emplacement
    boiteType: "",                    // TEXT
    emplacementBoite: "",             // TEXT
    emplacementPhoto: [],             // ARRAY
    
    // TTlock (conditionnel)
    ttlock: {
      masterpinConciergerie: "",      // TEXT
      codeProprietaire: "",           // TEXT
      codeMenage: ""                  // TEXT
    },
    
    // Igloohome (conditionnel)  
    igloohome: {
      masterpinConciergerie: "",      // TEXT
      codeVoyageur: "",               // TEXT
      codeProprietaire: "",           // TEXT
      codeMenage: ""                  // TEXT
    },
    
    // Masterlock (conditionnel)
    masterlock: {
      code: ""                        // TEXT
    },
    
    // Interphone
    interphone: null,                 // BOOLEAN
    interphoneDetails: "",            // TEXT
    interphonePhoto: [],              // ARRAY
    
    // Tempo-gâche  
    tempoGache: null,                 // BOOLEAN
    tempoGacheDetails: "",            // TEXT
    tempoGachePhoto: [],              // ARRAY
    
    // Digicode
    digicode: null,                   // BOOLEAN
    digicodeDetails: "",              // TEXT
    digicodePhoto: [],                // ARRAY
    
    // Clefs (existant)
    clefs: {
      photos: [],                     // ARRAY
      precision: "",                  // TEXT
      prestataire: null,              // BOOLEAN
      details: ""                     // TEXT
    }
  },
  section_airbnb: {
    preparation_guide: {
      video_complete: false,
      photos_etapes: false
    },
    annonce_active: null,
    url_annonce: "",
    identifiants_obtenus: null,
    email_compte: "",
    mot_passe: "",
    explication_refus: ""
  },
  section_booking: {
    annonce_active: null,
    url_annonce: "",
    identifiants_obtenus: null,
    email_compte: "",
    mot_passe: "",
    explication_refus: ""
  },

  section_reglementation: {
  ville_changement_usage: "",
  date_expiration_changement: "",
  numero_declaration: "",
  ville_declaration_simple: "",
  details_reglementation: "",
  documents: {
    carte_identite: false,
    rib: false,
    cerfa: false,
    assurance_pno: false,
    rcp: false,
    acte_propriete: false
  }
},

  section_exigences: {
    nombre_nuits_minimum: "",
    tarif_minimum_nuit: "",
    dates_bloquees: "",
    precisions_exigences: ""
  },

  section_avis: {    
      // 🎬 1. ÉVALUATION ENVIRONNEMENT
  video_globale_validation: null,              // Radio: true/false/null
  video_globale_videos: [],                    // Array pour les vidéos uploadées
  
  // 🏘️ 2. ÉVALUATION QUARTIER  
  quartier_types: [],                          // Array checkboxes (choix multiples)
  quartier_securite: null,                     // Radio: "Sécurisé"/"Quartier modéré"/"Zone à risques"/null
  quartier_perturbations: null,                // Radio: "Pas d'élément"/"Élément perturbateur"/null
  quartier_perturbations_details: "",          // Textarea conditionnel (si perturbations = "Élément perturbateur")
  
  // 🏢 3. ÉVALUATION IMMEUBLE
  immeuble_etat_general: null,                 // Radio: "Bon état"/"État correct"/"Mauvais état"/null
  immeuble_proprete: null,                     // Radio: "Propre"/"Sale"/null
  immeuble_accessibilite: null,                // Radio: "Très accessible"/"Modérément accessible"/"Inaccessible"/null
  immeuble_niveau_sonore: null,                // Radio: "Très calme"/"Relativement calme"/"Très bruyant"/null
  
  // 🏠 4. ÉVALUATION LOGEMENT
  logement_etat_general: null,                 // Radio: "Excellent"/"Bon"/"Moyen"/"Dégradé"/"Très mauvais"/null
  logement_etat_details: "",                   // Textarea conditionnel (si état = "Dégradé" ou "Très mauvais")
  logement_proprete: null,                     // Radio: "Propre"/"Correct"/"Sale"/null
  logement_proprete_details: "",               // Textarea conditionnel (si propreté = "Sale")
  logement_ambiance: [],                       // Array checkboxes (choix multiples)
  logement_absence_decoration_details: "",     // Textarea conditionnel (si ambiance contient "Absence de décoration")
  logement_decoration_personnalisee_details: "", // Textarea conditionnel (si ambiance contient "Décoration très personnalisée")
  logement_vis_a_vis: null,                    // Radio: "Vue dégagée"/"Vis-à-vis partielle"/"Vis-à-vis direct"/null
  logement_vis_a_vis_photos: [],               // Array photos

    atouts_logement: {
      lumineux: null,
      central: null,
      authentique: null,
      design_moderne: null,
      terrasse_balcon: null,
      piscine: null,
      // NOUVELLES OPTIONS :
      rustique: null,
      convivial: null,
      douillet: null,
      proche_transports: null,
      jacuzzi: null,
      cheminee: null,
      charmant: null,
      elegant: null,
      atypique: null,
      renove: null,
      familial: null,
      cosy_confortable: null,
      decoration_traditionnelle: null,
      jardin: null,
      proche_commerces: null,
      sauna_spa: null,
      video_projecteur: null,
      station_recharge_electrique: null,
      romantique: null,
      paisible: null,
      chic: null,
      accueillant: null,
      tranquille: null,
      spacieux: null,
      vue_panoramique: null,
      parking_prive: null,
      equipements_haut_gamme: null,
      billard: null,
      jeux_arcade: null,
      table_ping_pong: null,
      autres_atouts: null
    },
    
    atouts_logement_autre: "",
    autres_caracteristiques: "",
    types_voyageurs: {
      duo_amoureux: null,
      nomades_numeriques: null,
      aventuriers_independants: null,
      tribus_familiales: null,
      bandes_amis: null,
      voyageurs_experience: null,
      autres_voyageurs: null
    },
    types_voyageurs_autre: "",
    explication_adaptation: "",
  },
  
  section_gestion_linge: {
    // Question principale
    dispose_de_linge: null,
    
    // Inventaire 90x200 (lit simple)
    inventaire_90x200: {
      couettes: "",
      oreillers: "",
      draps_housses: "",
      housses_couette: "",
      protections_matelas: "",
      taies_oreillers: "",
      draps_bain: "",
      petites_serviettes: "",
      tapis_bain: "",
      torchons: "",
      plaids: "",
      oreillers_decoratifs: ""
    },
    
    // Inventaire 140x200 (lit standard)
    inventaire_140x200: {
      couettes: "",
      oreillers: "",
      draps_housses: "",
      housses_couette: "",
      protections_matelas: "",
      taies_oreillers: "",
      draps_bain: "",
      petites_serviettes: "",
      tapis_bain: "",
      torchons: "",
      plaids: "",
      oreillers_decoratifs: ""
    },
    
    // Inventaire 160x200 (lit queen size)
    inventaire_160x200: {
      couettes: "",
      oreillers: "",
      draps_housses: "",
      housses_couette: "",
      protections_matelas: "",
      taies_oreillers: "",
      draps_bain: "",
      petites_serviettes: "",
      tapis_bain: "",
      torchons: "",
      plaids: "",
      oreillers_decoratifs: ""
    },
    
    // Inventaire 180x200 (lit king size)
    inventaire_180x200: {
      couettes: "",
      oreillers: "",
      draps_housses: "",
      housses_couette: "",
      protections_matelas: "",
      taies_oreillers: "",
      draps_bain: "",
      petites_serviettes: "",
      tapis_bain: "",
      torchons: "",
      plaids: "",
      oreillers_decoratifs: ""
    },
    
    // Inventaire Autres/hors catégorie
    inventaire_autres: {
      couettes: "",
      oreillers: "",
      draps_housses: "",
      housses_couette: "",
      protections_matelas: "",
      taies_oreillers: "",
      draps_bain: "",
      petites_serviettes: "",
      tapis_bain: "",
      torchons: "",
      plaids: "",
      oreillers_decoratifs: ""
    },
    
    // État du linge (checkboxes)
    etat_neuf: null,
    etat_usage: null,
    etat_propre: null,
    etat_sale: null,
    etat_tache: null,
    etat_informations: "",
    
    // Photos et emplacement
    photos_linge: [],
    emplacement_description: "",
    emplacement_photos: [],
    emplacement_code_cadenas: ""
  },
  section_equipements: {
    // Équipements techniques essentiels
    video_acces_poubelle: [],
    poubelle_emplacement: "",
    poubelle_ramassage: "",
    poubelle_photos: [],
    disjoncteur_emplacement: "",
    disjoncteur_photos: [],
    vanne_eau_emplacement: "",
    vanne_eau_photos: [],
    systeme_chauffage_eau: "",
    chauffage_eau_emplacement: "",
    chauffage_eau_photos: [],
    video_systeme_chauffage: [],
    
    // Équipements et Commodités - Checklist
    wifi: null,
    tv: null,
    climatisation: null,
    chauffage: null,
    lave_linge: null,
    seche_linge: null,
    fer_repasser: null,
    etendoir: null,
    parking_equipement: null,
    tourne_disque: null,
    piano: null,
    cinema: null,
    coffre_fort: null,
    ascenseur: null,
    compacteur_dechets: null,
    accessible_mobilite_reduite: null,
    animaux_acceptes: null,
    fetes_autorisees: null,
    fumeurs_acceptes: null,

    wifi_statut: null,        // "oui", "en_cours", "non"
    wifi_details: "",         // Détails si "en_cours"
    
    // Parking principal et champs conditionnels
    parking_type: "",
    parking_rue_details: "",
    parking_sur_place_types: [],
    parking_sur_place_details: "",
    parking_payant_type: "",
    parking_payant_details: ""
  },
  section_consommables: {
    // Question principale
    fournis_par_prestataire: null,
    
    gel_douche: null,               
    shampoing: null,                
    apres_shampoing: null,          
    pastilles_lave_vaisselle: null, 
    autre_consommable: null,        
    autre_consommable_details: "", 
    
    cafe_nespresso: null,      
    cafe_tassimo: null,        
    cafe_moulu: null,  
    cafe_senseo: null,  
    cafe_soluble: null,    
    cafe_grain: null,              
    cafe_autre: null, 
    cafe_autre_details: ""          
  },

  section_visite: {
    // Types de pièces (14 checkboxes + Autre)
    pieces_chambre: null,
    pieces_salon: null,
    pieces_salle_bains: null,
    pieces_salon_prive: null,
    pieces_kitchenette: null,
    pieces_cuisine: null,
    pieces_salle_manger: null,
    pieces_bureau: null,
    pieces_salle_jeux: null,
    pieces_salle_sport: null,
    pieces_buanderie: null,
    pieces_terrasse: null,
    pieces_balcon: null,
    pieces_jardin: null,
    pieces_autre: null,
    pieces_autre_details: "",
    
    // Conditionnel chambre
    nombre_chambres: "",        // "1", "2", "3", "4", "5", "6"
    nombre_salles_bains: "",        // "1", "2", "3", "4", "5", "6"
    
    // Vidéo visite
    video_visite: [],
  },
  section_chambres: {
    chambre_1: {
      nom_description: "",
      
      // Compteurs lits (8 types)
      lit_simple_90_190: 0,
      lit_double_140_190: 0,
      lit_queen_160_200: 0,
      lit_king_180_200: 0,
      canape_lit_simple: 0,
      canape_lit_double: 0,
      lits_superposes_90_190: 0,
      lit_gigogne: 0,
      
      autre_type_lit: "",
      
      // Équipements (15 checkboxes + autre avec détails)
      equipements_draps_fournis: null,
      equipements_climatisation: null,
      equipements_ventilateur_plafond: null,
      equipements_espace_rangement: null,
      equipements_lit_bebe_60_120: null,
      equipements_stores: null,
      equipements_television: null,
      equipements_oreillers_couvertures_sup: null,
      equipements_chauffage: null,
      equipements_cintres: null,
      equipements_moustiquaire: null,
      equipements_lit_parapluie_60_120: null,
      equipements_systeme_audio: null,
      equipements_coffre_fort: null,
      equipements_autre: null,
      equipements_autre_details: "",    
      photos_chambre: [],
      // 🆕 ÉLÉMENTS ABÎMÉS
      elements_abimes: null,            // Boolean: true/false/null
      elements_abimes_photos: []        // Array: URLs photos
    },
    
    chambre_2: {
      nom_description: "",
      lit_simple_90_190: 0,
      lit_double_140_190: 0,
      lit_queen_160_200: 0,
      lit_king_180_200: 0,
      canape_lit_simple: 0,
      canape_lit_double: 0,
      lits_superposes_90_190: 0,
      lit_gigogne: 0,
      autre_type_lit: "",
      equipements_draps_fournis: null,
      equipements_climatisation: null,
      equipements_ventilateur_plafond: null,
      equipements_espace_rangement: null,
      equipements_lit_bebe_60_120: null,
      equipements_stores: null,
      equipements_television: null,
      equipements_oreillers_couvertures_sup: null,
      equipements_chauffage: null,
      equipements_cintres: null,
      equipements_moustiquaire: null,
      equipements_lit_parapluie_60_120: null,
      equipements_systeme_audio: null,
      equipements_coffre_fort: null,
      equipements_autre: null,
      equipements_autre_details: "",
      photos_chambre: [],
      // 🆕 ÉLÉMENTS ABÎMÉS
      elements_abimes: null,            // Boolean: true/false/null
      elements_abimes_photos: []        // Array: URLs photos
    },
    
    chambre_3: {
      nom_description: "",
      lit_simple_90_190: 0,
      lit_double_140_190: 0,
      lit_queen_160_200: 0,
      lit_king_180_200: 0,
      canape_lit_simple: 0,
      canape_lit_double: 0,
      lits_superposes_90_190: 0,
      lit_gigogne: 0,
      autre_type_lit: "",
      equipements_draps_fournis: null,
      equipements_climatisation: null,
      equipements_ventilateur_plafond: null,
      equipements_espace_rangement: null,
      equipements_lit_bebe_60_120: null,
      equipements_stores: null,
      equipements_television: null,
      equipements_oreillers_couvertures_sup: null,
      equipements_chauffage: null,
      equipements_cintres: null,
      equipements_moustiquaire: null,
      equipements_lit_parapluie_60_120: null,
      equipements_systeme_audio: null,
      equipements_coffre_fort: null,
      equipements_autre: null,
      equipements_autre_details: "",
      photos_chambre: [],
      // 🆕 ÉLÉMENTS ABÎMÉS
      elements_abimes: null,            // Boolean: true/false/null
      elements_abimes_photos: []        // Array: URLs photos
    },
    
    chambre_4: {
      nom_description: "",
      lit_simple_90_190: 0,
      lit_double_140_190: 0,
      lit_queen_160_200: 0,
      lit_king_180_200: 0,
      canape_lit_simple: 0,
      canape_lit_double: 0,
      lits_superposes_90_190: 0,
      lit_gigogne: 0,
      autre_type_lit: "",
      equipements_draps_fournis: null,
      equipements_climatisation: null,
      equipements_ventilateur_plafond: null,
      equipements_espace_rangement: null,
      equipements_lit_bebe_60_120: null,
      equipements_stores: null,
      equipements_television: null,
      equipements_oreillers_couvertures_sup: null,
      equipements_chauffage: null,
      equipements_cintres: null,
      equipements_moustiquaire: null,
      equipements_lit_parapluie_60_120: null,
      equipements_systeme_audio: null,
      equipements_coffre_fort: null,
      equipements_autre: null,
      equipements_autre_details: "",
      photos_chambre: [],
      // 🆕 ÉLÉMENTS ABÎMÉS
      elements_abimes: null,            // Boolean: true/false/null
      elements_abimes_photos: []        // Array: URLs photos
    },
    
    chambre_5: {
      nom_description: "",
      lit_simple_90_190: 0,
      lit_double_140_190: 0,
      lit_queen_160_200: 0,
      lit_king_180_200: 0,
      canape_lit_simple: 0,
      canape_lit_double: 0,
      lits_superposes_90_190: 0,
      lit_gigogne: 0,
      autre_type_lit: "",
      equipements_draps_fournis: null,
      equipements_climatisation: null,
      equipements_ventilateur_plafond: null,
      equipements_espace_rangement: null,
      equipements_lit_bebe_60_120: null,
      equipements_stores: null,
      equipements_television: null,
      equipements_oreillers_couvertures_sup: null,
      equipements_chauffage: null,
      equipements_cintres: null,
      equipements_moustiquaire: null,
      equipements_lit_parapluie_60_120: null,
      equipements_systeme_audio: null,
      equipements_coffre_fort: null,
      equipements_autre: null,
      equipements_autre_details: "",
      photos_chambre: [],
      // 🆕 ÉLÉMENTS ABÎMÉS
      elements_abimes: null,            // Boolean: true/false/null
      elements_abimes_photos: []        // Array: URLs photos
    },
    
    chambre_6: {
      nom_description: "",
      lit_simple_90_190: 0,
      lit_double_140_190: 0,
      lit_queen_160_200: 0,
      lit_king_180_200: 0,
      canape_lit_simple: 0,
      canape_lit_double: 0,
      lits_superposes_90_190: 0,
      lit_gigogne: 0,
      autre_type_lit: "",
      equipements_draps_fournis: null,
      equipements_climatisation: null,
      equipements_ventilateur_plafond: null,
      equipements_espace_rangement: null,
      equipements_lit_bebe_60_120: null,
      equipements_stores: null,
      equipements_television: null,
      equipements_oreillers_couvertures_sup: null,
      equipements_chauffage: null,
      equipements_cintres: null,
      equipements_moustiquaire: null,
      equipements_lit_parapluie_60_120: null,
      equipements_systeme_audio: null,
      equipements_coffre_fort: null,
      equipements_autre: null,
      equipements_autre_details: "",
      photos_chambre: [],
      // 🆕 ÉLÉMENTS ABÎMÉS
      elements_abimes: null,            // Boolean: true/false/null
      elements_abimes_photos: []        // Array: URLs photos
    }
  },

  section_salle_de_bains: {
    salle_de_bain_1: {
      nom_description: "",
      
      // Équipements (11 checkboxes + autre avec détails)
      equipements_douche: null,
      equipements_baignoire: null,
      equipements_douche_baignoire_combinees: null,
      equipements_double_vasque: null,
      equipements_wc: null,
      equipements_bidet: null,
      equipements_chauffage: null,
      equipements_lave_linge: null,
      equipements_seche_serviette: null,
      equipements_seche_cheveux: null,
      equipements_autre: null,
      equipements_autre_details: "",
      // WC séparé (conditionnel si equipements_wc = true)
      wc_separe: null,      
      // Accès (obligatoire)
      acces: "",      
      photos_salle_de_bain: [],
      // 🆕 ÉLÉMENTS ABÎMÉS
      elements_abimes: null,            // Boolean: true/false/null
      elements_abimes_photos: []        // Array: URLs photos
    },
    
    salle_de_bain_2: {
      nom_description: "",
      equipements_douche: null,
      equipements_baignoire: null,
      equipements_douche_baignoire_combinees: null,
      equipements_double_vasque: null,
      equipements_wc: null,
      equipements_bidet: null,
      equipements_chauffage: null,
      equipements_lave_linge: null,
      equipements_seche_serviette: null,
      equipements_seche_cheveux: null,
      equipements_autre: null,
      equipements_autre_details: "",
      wc_separe: null,
      acces: "",
      photos_salle_de_bain: [],
      // 🆕 ÉLÉMENTS ABÎMÉS
      elements_abimes: null,            // Boolean: true/false/null
      elements_abimes_photos: []        // Array: URLs photos
    },
    
    salle_de_bain_3: {
      nom_description: "",
      equipements_douche: null,
      equipements_baignoire: null,
      equipements_douche_baignoire_combinees: null,
      equipements_double_vasque: null,
      equipements_wc: null,
      equipements_bidet: null,
      equipements_chauffage: null,
      equipements_lave_linge: null,
      equipements_seche_serviette: null,
      equipements_seche_cheveux: null,
      equipements_autre: null,
      equipements_autre_details: "",
      wc_separe: null,
      acces: "",
      photos_salle_de_bain: [],
      // 🆕 ÉLÉMENTS ABÎMÉS
      elements_abimes: null,            // Boolean: true/false/null
      elements_abimes_photos: []        // Array: URLs photos
    },
    
    salle_de_bain_4: {
      nom_description: "",
      equipements_douche: null,
      equipements_baignoire: null,
      equipements_douche_baignoire_combinees: null,
      equipements_double_vasque: null,
      equipements_wc: null,
      equipements_bidet: null,
      equipements_chauffage: null,
      equipements_lave_linge: null,
      equipements_seche_serviette: null,
      equipements_seche_cheveux: null,
      equipements_autre: null,
      equipements_autre_details: "",
      wc_separe: null,
      acces: "",
      photos_salle_de_bain: [],
      // 🆕 ÉLÉMENTS ABÎMÉS
      elements_abimes: null,            // Boolean: true/false/null
      elements_abimes_photos: []        // Array: URLs photos
    },
    
    salle_de_bain_5: {
      nom_description: "",
      equipements_douche: null,
      equipements_baignoire: null,
      equipements_douche_baignoire_combinees: null,
      equipements_double_vasque: null,
      equipements_wc: null,
      equipements_bidet: null,
      equipements_chauffage: null,
      equipements_lave_linge: null,
      equipements_seche_serviette: null,
      equipements_seche_cheveux: null,
      equipements_autre: null,
      equipements_autre_details: "",
      wc_separe: null,
      acces: "",
      photos_salle_de_bain: [],
      // 🆕 ÉLÉMENTS ABÎMÉS
      elements_abimes: null,            // Boolean: true/false/null
      elements_abimes_photos: []        // Array: URLs photos
    },
    
    salle_de_bain_6: {
      nom_description: "",
      equipements_douche: null,
      equipements_baignoire: null,
      equipements_douche_baignoire_combinees: null,
      equipements_double_vasque: null,
      equipements_wc: null,
      equipements_bidet: null,
      equipements_chauffage: null,
      equipements_lave_linge: null,
      equipements_seche_serviette: null,
      equipements_seche_cheveux: null,
      equipements_autre: null,
      equipements_autre_details: "",
      wc_separe: null,
      acces: "",
      photos_salle_de_bain: [],
      // 🆕 ÉLÉMENTS ABÎMÉS
      elements_abimes: null,            // Boolean: true/false/null
      elements_abimes_photos: []        // Array: URLs photos
    }
  },
  section_cuisine_1: {
    // Checkboxes principales (16 équipements)
    equipements_refrigerateur: null,
    equipements_congelateur: null,
    equipements_mini_refrigerateur: null,
    equipements_cuisiniere: null,
    equipements_plaque_cuisson: null,
    equipements_four: null,
    equipements_micro_ondes: null,
    equipements_lave_vaisselle: null,
    equipements_cafetiere: null,
    equipements_bouilloire: null,
    equipements_grille_pain: null,
    equipements_blender: null,
    equipements_cuiseur_riz: null,
    equipements_machine_pain: null,
    equipements_lave_linge: null,
    equipements_autre: null,
    equipements_autre_details: "",
  
    // RÉFRIGÉRATEUR - Champs conditionnels
    refrigerateur_marque: "",                    // OBLIGATOIRE *
    refrigerateur_instructions: "",
    refrigerateur_video: [],
  
    // CONGÉLATEUR - Champs conditionnels
    congelateur_instructions: "",
    congelateur_video: [],
  
    // MINI RÉFRIGÉRATEUR - Champs conditionnels
    mini_refrigerateur_instructions: "",
    mini_refrigerateur_video: [],
  
    // CUISINIÈRE - Champs conditionnels
    cuisiniere_marque: "",                      // OBLIGATOIRE *
    cuisiniere_type: "",                        // Select: Électrique/Gaz/Induction/À bois
    cuisiniere_nombre_feux: "",                 // Number input
    cuisiniere_instructions: "",
    cuisiniere_photo: [],                       // Array photos
    cuisiniere_video: [],
  
    // PLAQUE DE CUISSON - Champs conditionnels
    plaque_cuisson_marque: "",                  // OBLIGATOIRE *
    plaque_cuisson_type: "",                    // Select: Électrique/Gaz/Induction
    plaque_cuisson_nombre_feux: "",             // Number input
    plaque_cuisson_instructions: "",
    plaque_cuisson_photo: [],                   // Array photos
    plaque_cuisson_video: [],
  
    // FOUR - Champs conditionnels
    four_marque: "",                            // OBLIGATOIRE *
    four_type: "",                              // Select: Simple/Double
    four_instructions: "",
    four_photo: [],                             // Array photos
    four_video: [],
  
    // FOUR À MICRO-ONDES - Champs conditionnels
    micro_ondes_instructions: "",
    micro_ondes_photo: [],                      // Array photos
    micro_ondes_video: [],
  
    // LAVE-VAISSELLE - Champs conditionnels
    lave_vaisselle_instructions: "",
    lave_vaisselle_photo: [],                   // Array photos
    lave_vaisselle_video: [],
  
    // CAFETIÈRE - Champs conditionnels
    cafetiere_marque: "",                       // OBLIGATOIRE *
    // Types de cafetière (checkboxes multiples)
    cafetiere_type_filtre: null,
    cafetiere_type_expresso: null,
    cafetiere_type_piston: null,
    cafetiere_type_keurig: null,
    cafetiere_type_nespresso: null,
    cafetiere_type_manuelle: null,
    cafetiere_type_bar_grain: null,
    cafetiere_type_bar_moulu: null,
    cafetiere_instructions: "",
    cafetiere_photo: [],                        // Array photos
    cafetiere_video: [],
    cafetiere_cafe_fourni: "",                  // Radio: Non/Oui par le propriétaire/Oui par la fée du logis
    cafetiere_marque_cafe: "",
  
    // BOUILLOIRE ÉLECTRIQUE - Champs conditionnels
    bouilloire_instructions: "",
    bouilloire_video: [],
  
    // GRILLE-PAIN - Champs conditionnels
    grille_pain_instructions: "",
    grille_pain_video: [],
  
    // BLENDER - Champs conditionnels
    blender_instructions: "",
    blender_video: [],
  
    // CUISEUR À RIZ - Champs conditionnels
    cuiseur_riz_instructions: "",
    cuiseur_riz_video: [],
  
    // MACHINE À PAIN - Champs conditionnels
    machine_pain_instructions: "",
    machine_pain_video: [],

    // 🆕 ÉLÉMENTS ABÎMÉS
    elements_abimes: null,              // Boolean: true/false/null
    elements_abimes_photos: []          // Array: URLs photos 
  },

  
  // 🍽 SECTION CUISINE 2 - À ajouter dans FormContext.jsx
// Remplacer la ligne : section_cuisine_2: {},

section_cuisine_2: {
  // VAISSELLE (4 compteurs)
  vaisselle_assiettes_plates: 0,
  vaisselle_assiettes_dessert: 0,
  vaisselle_assiettes_creuses: 0,
  vaisselle_bols: 0,
  
  // COUVERTS (11 compteurs)
  couverts_verres_eau: 0,
  couverts_verres_vin: 0,
  couverts_tasses: 0,
  couverts_flutes_champagne: 0,
  couverts_mugs: 0,
  couverts_couteaux_table: 0,
  couverts_fourchettes: 0,
  couverts_couteaux_steak: 0,
  couverts_cuilleres_soupe: 0,
  couverts_cuilleres_cafe: 0,
  couverts_cuilleres_dessert: 0,
  
  // USTENSILES DE CUISINE (26 compteurs)
  ustensiles_poeles_differentes_tailles: 0,
  ustensiles_casseroles_differentes_tailles: 0,
  ustensiles_faitouts: 0,
  ustensiles_wok: 0,
  ustensiles_cocotte_minute: 0,
  ustensiles_couvercle_anti_eclaboussures: 0,
  ustensiles_robot_cuisine: 0,
  ustensiles_batteur_electrique: 0,
  ustensiles_couteaux_cuisine: 0,
  ustensiles_spatules: 0,
  ustensiles_ecumoire: 0,
  ustensiles_ouvre_boite: 0,
  ustensiles_rape: 0,
  ustensiles_tire_bouchon: 0,
  ustensiles_econome: 0,
  ustensiles_passoire: 0,
  ustensiles_planche_decouper: 0,
  ustensiles_rouleau_patisserie: 0,
  ustensiles_ciseaux_cuisine: 0,
  ustensiles_balance_cuisine: 0,
  ustensiles_bac_glacon: 0,
  ustensiles_pince_cuisine: 0,
  ustensiles_couteau_huitre: 0,
  ustensiles_verre_mesureur: 0,
  ustensiles_presse_agrume_manuel: 0,
  ustensiles_pichet: 0,
  
  // PLATS ET RÉCIPIENTS (11 compteurs)
  plats_dessous_plat: 0,
  plats_plateau: 0,
  plats_saladiers: 0,
  plats_a_four: 0,
  plats_carafes: 0,
  plats_moules: 0,
  plats_theiere: 0,
  plats_cafetiere_piston_filtre: 0,
  plats_ustensiles_barbecue: 0,
  plats_gants_cuisine: 0,
  plats_maniques: 0,
  
  // CHAMPS COMPLÉMENTAIRES
  autres_ustensiles: "",                              // Texte libre
  quantite_suffisante: null,                          // Radio: true/false/null  
  quantite_insuffisante_details: "",                  // Conditionnel si quantite_suffisante = false
  casseroles_poeles_testees: null,                    // Radio: true/false/null
  photos_tiroirs_placards: []                         // Array photos
},

  // 🛋️ SECTION SALON / SAM - À ajouter dans FormContext.jsx
// Remplacer la ligne : section_salon_sam: {},

section_salon_sam: {
  // Description générale (obligatoire)
  description_generale: "",
  
  // Équipements (13 checkboxes + autre)
  equipements_table_manger: null,
  equipements_chaises: null,
  equipements_canape: null,
  equipements_canape_lit: null,
  equipements_fauteuils: null,
  equipements_table_basse: null,
  equipements_television: null,
  equipements_cheminee: null,
  equipements_jeux_societe: null,
  equipements_livres_magazines: null,
  equipements_livres_jouets_enfants: null,
  equipements_climatisation: null,
  equipements_chauffage: null,
  equipements_autre: null,
  equipements_autre_details: "",
  
  // Cheminée type (conditionnel si cheminee cochée)
  cheminee_type: "",                    // Radio: Électrique/Éthanol/Gaz/Poêle à granulés/Bois/Décorative
  
  // Autres équipements (obligatoire)
  autres_equipements_details: "",
  
  // Photos
  photos_salon_sam: [],
  
  // Nombre places table (obligatoire)
  nombre_places_table: "",               // Number input
  // 🆕 ÉLÉMENTS ABÎMÉS - SALON
  salon_elements_abimes: null,        // Boolean: true/false/null
  salon_elements_abimes_photos: [],   // Array: URLs photos
  
  // 🆕 ÉLÉMENTS ABÎMÉS - SALLE À MANGER
  salle_manger_elements_abimes: null,        // Boolean: true/false/null  
  salle_manger_elements_abimes_photos: []    // Array: URLs photos
},

  // 🏗️ ÉTAPE 3 - Mise à jour FormContext.jsx
// Remplacer la ligne : section_equip_spe_exterieur: {},

section_equip_spe_exterieur: {
  // CHAMPS RACINES (toujours visibles)
  dispose_exterieur: null,                    // Radio: true/false/null
  dispose_piscine: null,                      // Radio: true/false/null  
  dispose_jacuzzi: null,                      // Radio: true/false/null
  dispose_cuisine_exterieure: null,          // Radio: true/false/null
  
  // BRANCHE EXTÉRIEUR (si dispose_exterieur = true)
  exterieur_type_espace: [],                 // Array checkboxes: ["Balcon", "Terrasse", "Jardin", "Patio", "Aucun"]
  exterieur_description_generale: "",        // Textarea
  exterieur_entretien_prestataire: null,     // Radio: true/false/null
  exterieur_entretien_frequence: "",         // Text (conditionnel si entretien = true)
  exterieur_entretien_type_prestation: "",   // Text (conditionnel si entretien = true)
  exterieur_entretien_qui: "",               // Text (conditionnel si entretien = false)
  exterieur_equipements: [],                 // Array 14 checkboxes + autre
  exterieur_equipements_autre_details: "",   // Text (conditionnel si "Autre" coché)
  exterieur_nombre_chaises_longues: null,    // Number (conditionnel si "Chaises longues" coché)
  exterieur_nombre_parasols: null,           // Number (conditionnel si "Parasol" coché)
  exterieur_photos: [],                      // Array photos
  exterieur_acces: "",                       // Textarea
  exterieur_type_acces: "",                  // Radio: Privé/Partagé logements/Partagé voisinage/Autre
  exterieur_type_acces_autre_details: "",    // Text (conditionnel si "Autre")
  
  // SOUS-BRANCHE BARBECUE (si "Barbecue" dans exterieur_equipements)
  barbecue_instructions: "",                 // Textarea
  barbecue_type: "",                         // Text
  barbecue_combustible_fourni: null,         // Radio: true/false/null
  barbecue_ustensiles_fournis: null,         // Radio: true/false/null
  barbecue_photos: [],                       // Array photos
  
  // BRANCHE PISCINE (si dispose_piscine = true)
  piscine_type: "",                          // Radio: Privée/Publique
  piscine_acces: "",                         // Radio: Intérieur/Extérieur
  piscine_dimensions: "",                    // Text
  piscine_disponibilite: "",                 // Radio: Toute l'année/Certaines périodes
  piscine_periode_disponibilite: "",         // Text (conditionnel)
  piscine_heures: "",                        // Radio: 24h/24 ou spécifiques
  piscine_horaires_ouverture: "",            // Text (conditionnel)
  piscine_caracteristiques: [],              // Array checkboxes (9 options)
  piscine_periode_chauffage: "",             // Text (conditionnel si "Chauffée")
  piscine_entretien_prestataire: null,       // Radio: true/false/null
  piscine_entretien_frequence: "",           // Text (conditionnel)
  piscine_entretien_type_prestation: "",     // Text (conditionnel)
  piscine_entretien_qui: "",                 // Text (conditionnel)
  piscine_regles_utilisation: "",            // Textarea
  piscine_video: [],                         // Array vidéos
  
  // BRANCHE JACUZZI (si dispose_jacuzzi = true)
  jacuzzi_acces: "",                         // Radio: Intérieur/Extérieur
  jacuzzi_entretien_prestataire: null,       // Radio: true/false/null
  jacuzzi_entretien_frequence: "",           // Text (conditionnel)
  jacuzzi_entretien_type_prestation: "",     // Text (conditionnel)
  jacuzzi_entretien_qui: "",                 // Text (conditionnel)
  jacuzzi_taille: "",                        // Text
  jacuzzi_instructions: "",                  // Textarea
  jacuzzi_heures_utilisation: "",            // Text
  jacuzzi_photos: [],                        // Array photos
  
  // BRANCHE CUISINE EXTÉRIEURE (si dispose_cuisine_exterieure = true)
  cuisine_ext_entretien_prestataire: null,   // Radio: true/false/null
  cuisine_ext_entretien_frequence: "",       // Text (conditionnel)
  cuisine_ext_entretien_type_prestation: "", // Text (conditionnel)
  cuisine_ext_entretien_qui: "",             // Text (conditionnel)
  cuisine_ext_superficie: "",               // Text
  cuisine_ext_type: "",                     // Radio: Privée/Publique
  cuisine_ext_caracteristiques: [],         // Array checkboxes: ["Four", "Évier"]
  
  // 🆕 ÉLÉMENTS ABÎMÉS - GARAGE
  garage_elements_abimes: null,       // Boolean: true/false/null
  garage_elements_abimes_photos: [],  // Array: URLs photos
  
  // 🆕 ÉLÉMENTS ABÎMÉS - BUANDERIE
  buanderie_elements_abimes: null,       // Boolean: true/false/null
  buanderie_elements_abimes_photos: [],  // Array: URLs photos
  
  // 🆕 ÉLÉMENTS ABÎMÉS - AUTRES PIÈCES
  autres_pieces_elements_abimes: null,       // Boolean: true/false/null
  autres_pieces_elements_abimes_photos: []  // Array: URLs photos
},

section_communs: {
  dispose_espaces_communs: null,           // Radio: true/false/null
  description_generale: "",                // Textarea
  entretien_prestataire: null,            // Radio: true/false/null  
  entretien_frequence: "",                // Text (conditionnel si entretien = true)
  entretien_qui: "",                      // Text (conditionnel si entretien = false)
  photos_espaces_communs: []              // Array photos
},

section_teletravail: {
  equipements: [],
  equipements_autre_details: ""
},

section_bebe: {
  equipements: [],
  lit_bebe_type: "",
  lit_parapluie_disponibilite: "",
  lit_stores_occultants: null,
  chaise_haute_type: "",
  chaise_haute_disponibilite: "",
  chaise_haute_caracteristiques: [],
  chaise_haute_prix: "",
  jouets_tranches_age: [],
  equipements_autre_details: "",
  photos_equipements_bebe: []
},

section_guide_acces: {
  photos_etapes: [],
  video_acces: []
},

section_securite: {
  equipements: [],
  alarme_desarmement: "",
  photos_equipements_securite: []
}
}

export function FormProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate() // Ajout navigation
  const { user, loading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(initialFormData)
  const [saveStatus, setSaveStatus] = useState({ 
    saving: false, 
    saved: false, 
    error: null 
  })
  const [hasManuallyNamedFiche, setHasManuallyNamedFiche] = useState(false)

  const [duplicateAlert, setDuplicateAlert] = useState(null)

  const sections = [
    "Propriétaire", "Logement", "Avis", "Clefs", "Airbnb", "Booking", "Réglementation",
    "Exigences", "Gestion linge", "Équipements", "Consommables", "Visite",
    "Chambres", "Salle de bains", "Cuisine 1", "Cuisine 2", "Salon / SAM", "Équip. spé. / Extérieur",
    "Communs", "Télétravail", "Bébé", "Guide d'accès", "Sécurité"
  ]

  const totalSteps = sections.length

  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const generateFicheName = (data) => {
    // Simple : utiliser le numéro de bien qui vient de Monday
    const numeroBien = data.section_logement?.numero_bien;
    
    if (numeroBien) return `Bien ${numeroBien}`;
    return "Nouvelle fiche";
  };

  // 🎯 FONCTION: Parser les paramètres Monday
  const parseMondayParams = useCallback((queryParams) => {
    const mondayData = {}
    
    // 👤 Section Propriétaire
    const fullName = queryParams.get('fullName') || queryParams.get('nom')
    const email = queryParams.get('email')
    const adresseRue = queryParams.get('adresse[addr_line1]')
    const adresseVille = queryParams.get('adresse[city]')
    const adressePostal = queryParams.get('adresse[postal]')
    
    if (fullName || email || adresseRue || adresseVille || adressePostal) {
      mondayData.section_proprietaire = {}
      
      if (fullName) mondayData.section_proprietaire.nom = decodeURIComponent(fullName)
      if (email) mondayData.section_proprietaire.email = decodeURIComponent(email)
      
      if (adresseRue || adresseVille || adressePostal) {
        mondayData.section_proprietaire.adresse = {}
        if (adresseRue) mondayData.section_proprietaire.adresse.rue = decodeURIComponent(adresseRue)
        if (adresseVille) mondayData.section_proprietaire.adresse.ville = decodeURIComponent(adresseVille)
        if (adressePostal) mondayData.section_proprietaire.adresse.codePostal = decodeURIComponent(adressePostal)
      }
    }
    
    // 🏠 Section Logement
    const numeroDu = queryParams.get('numeroDu')
    const nombreDe = queryParams.get('nombreDe')
    const m2 = queryParams.get('m2')
    const lits = queryParams.get('lits')
    
    if (numeroDu || nombreDe || m2 || lits) {
      mondayData.section_logement = {}
      
      if (numeroDu) mondayData.section_logement.numero_bien = decodeURIComponent(numeroDu)
      if (nombreDe) mondayData.section_logement.nombre_personnes_max = decodeURIComponent(nombreDe)
      if (m2) mondayData.section_logement.surface = decodeURIComponent(m2)
      if (lits) mondayData.section_logement.nombre_lits = decodeURIComponent(lits)
    }
    
    return mondayData
  }, [])

  // 🎯 FONCTION: Appliquer données Monday au formData
  const applyMondayData = useCallback((currentFormData, mondayData) => {
    const newFormData = { ...currentFormData }
    
    // Merge sections en préservant les données existantes
    Object.entries(mondayData).forEach(([sectionName, sectionData]) => {
      if (sectionName === 'section_proprietaire' && sectionData.adresse) {
        // Merge spécial pour adresse propriétaire
        newFormData[sectionName] = {
          ...(newFormData[sectionName] || {}),
          ...sectionData,
          adresse: {
            ...(newFormData[sectionName]?.adresse || {}),
            ...sectionData.adresse
          }
        }
      } else {
        // Merge standard pour les autres sections
        newFormData[sectionName] = {
          ...(newFormData[sectionName] || {}),
          ...sectionData
        }
      }
    })
    
    // Mettre à jour timestamp
    newFormData.updated_at = new Date().toISOString()
    
    return newFormData
  }, [])

  // 🎯 FONCTION: Appliquer données Monday depuis URL
  const applyMondayDataFromURL = useCallback((searchParams) => {
    const params = new URLSearchParams(searchParams)
    const mondayData = parseMondayParams(params)
    
    if (Object.keys(mondayData).length > 0) {
      console.log('🎯 Application données Monday depuis URL:', mondayData)
      
      const newFormData = applyMondayData(formData, mondayData)
      setFormData(newFormData)
      
      // Smart naming avec nouvelles données
      const generatedName = generateFicheName(newFormData)
      if (generatedName !== "Nouvelle fiche") {
        setFormData(prev => ({ ...prev, nom: generatedName }))
      }
      
      console.log('✅ Pré-population Monday terminée')
    }
  }, [formData, parseMondayParams, applyMondayData])

  // 🎯 FONCTION: Détection params Monday robuste
  const hasMondayParams = useCallback((searchParams) => {
    const params = new URLSearchParams(searchParams)
    const mondayParamKeys = ['fullName', 'nom', 'email', 'adresse[addr_line1]', 'adresse[city]', 'adresse[postal]', 'numeroDu', 'nombreDe', 'm2', 'lits']
    return mondayParamKeys.some(param => params.get(param))
  }, [])

  // DÉPLACER resetForm AVANT useEffect
  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setCurrentStep(0)
    setHasManuallyNamedFiche(false)
    setSaveStatus({ saving: false, saved: false, error: null })
  }, [])

  // handleLoad function
  const handleLoad = useCallback(async (ficheId) => {
    setSaveStatus({ saving: true, saved: false, error: null });
    try {
      const result = await loadFiche(ficheId)
      
      if (result.success) {
        setFormData(result.data)
        setCurrentStep(0)
        setSaveStatus({ saving: false, saved: true, error: null });
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, saved: false }))
        }, 3000)
        return { success: true, data: result.data }
      } else {
        setSaveStatus({ saving: false, saved: false, error: result.message });
        return { success: false, error: result.message }
      }
    } catch (error) {
      setSaveStatus({ saving: false, saved: false, error: error.message || 'Erreur de connexion' });
      return { success: false, error: 'Erreur de connexion' }
    }
  }, []);

  // 🎯 useEffect RÉORGANISÉ - PRIORITÉS selon Gemini
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ficheId = params.get('id');
    const mondayParamsPresentInURL = hasMondayParams(location.search);
    const pendingMondayParamsInStorage = localStorage.getItem('pendingMondayParams');

    // 🐛 DEBUG LOGS (commentés pour éviter spam)
    // console.log("--- FormContext useEffect ---");
    // console.log("location.search:", location.search);
    // console.log("ficheId:", ficheId);
    // console.log("mondayParamsPresentInURL:", mondayParamsPresentInURL);
    // console.log("pendingMondayParamsInStorage:", pendingMondayParamsInStorage);
    // console.log("authLoading:", authLoading);
    // console.log("user:", user);
    // console.log("formData.id:", formData.id);
    // console.log("formData.nom:", formData.nom);
    // console.log("---------------------------");

    // 🎯 PRIORITÉ 1: Traiter params Monday en attente APRÈS LOGIN
    if (user && pendingMondayParamsInStorage) {
        console.log('✅ Utilisateur connecté ET Monday params en attente. Application des données.');
        localStorage.removeItem('pendingMondayParams');
        const mondayData = parseMondayParams(new URLSearchParams(pendingMondayParamsInStorage));
        const newFormDataAfterMonday = applyMondayData(formData, mondayData);
        // 🎯 AJOUTER CETTE LIGNE ICI :
        newFormDataAfterMonday.user_id = user.id;
        
        setFormData(newFormDataAfterMonday);

        // Smart naming
        const generatedName = generateFicheName(newFormDataAfterMonday);
        if (generatedName !== "Nouvelle fiche") {
            setHasManuallyNamedFiche(false);
            setFormData(prev => ({ ...prev, nom: generatedName }));
        }
        return; // STOP - Données appliquées
    }

    // 🎯 PRIORITÉ 2: Redirection login si params Monday + pas connecté
    if (mondayParamsPresentInURL && !ficheId && !authLoading && !user) {
        console.log('🔐 Utilisateur non connecté, sauvegarde params Monday pour après login.');
        localStorage.setItem('pendingMondayParams', location.search);
        navigate('/login', { replace: true });
        return; // STOP - Redirection en cours
    }

    // 🎯 PRIORITÉ 3: Application directe si connecté + params Monday
    if (user && mondayParamsPresentInURL && !ficheId && formData.id === null) {
      console.log('✅ Utilisateur déjà connecté, application directe des données Monday.');
      const mondayData = parseMondayParams(params);
      const newFormDataAfterMonday = applyMondayData(formData, mondayData);
      newFormDataAfterMonday.user_id = user.id;

      const generatedName = generateFicheName(newFormDataAfterMonday);
      if (generatedName !== "Nouvelle fiche") {
          // 🆕 VÉRIFICATION DUPLICATE
          checkForDuplicate(generatedName).then(isDuplicate => {
              if (!isDuplicate) {
                  // Pas de duplicate, application normale
                  setFormData(newFormDataAfterMonday);
                  setHasManuallyNamedFiche(false);
                  setFormData(prev => ({ ...prev, nom: generatedName }));
              }
              // Si duplicate, le modal s'affiche automatiquement via setDuplicateAlert
          });
      } else {
          // Pas de nom généré, application directe
          setFormData(newFormDataAfterMonday);
      }
      return; // STOP - Données appliquées ou en cours de vérification
    }

    // 🎯 PRIORITÉ 4: Chargement fiche existante par ID
    if (ficheId && formData.id !== ficheId && !saveStatus.saving) {
      console.log('📂 Chargement de la fiche existante par ID:', ficheId);
      handleLoad(ficheId).then(result => {
        if (result.success) {
          if (result.data.nom === "Nouvelle fiche" || generateFicheName(result.data) === result.data.nom) {
            setHasManuallyNamedFiche(false);
          } else {
            setHasManuallyNamedFiche(true);
          }
        }
      });
      return; // STOP - Chargement en cours
    } 
    
    // 🎯 PRIORITÉ 5: Reset pour nouvelle fiche vide
    if (!ficheId && !mondayParamsPresentInURL && formData.id !== null) {
        console.log('🔄 Réinitialisation du formulaire pour une nouvelle fiche vide.');
        resetForm();
    }

  }, [
    location.search,
    authLoading,
    user,
    navigate
    // 🚨 SUPPRIMÉ les dépendances problématiques qui causent la boucle :
    // - formData.id, saveStatus.saving, handleLoad, 
    // - hasMondayParams, parseMondayParams, applyMondayData, generateFicheName, resetForm
  ]);

  const next = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const back = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goTo = (step) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step)
    }
  }

  const getCurrentSection = () => sections[currentStep]

  const updateSection = (sectionName, newData) => {
    setFormData(prev => {
      const updatedData = {
        ...prev,
        [sectionName]: {
          ...(prev[sectionName] || {}),
          ...newData
        },
        updated_at: new Date().toISOString()
      };

      if (!hasManuallyNamedFiche && sectionName === 'section_logement') {
        const generatedName = generateFicheName(updatedData);
        if (generatedName !== "Nouvelle fiche") {
          updatedData.nom = generatedName;
        }
      }
      return updatedData;
    });
  }

  const updateField = (fieldPath, value) => {
    setFormData(prev => {
      const newData = { ...prev }
      const keys = fieldPath.split('.')
      let current = newData
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || current[keys[i]] === null) {
          current[keys[i]] = {}
        } else if (typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {}
        } else {
          current[keys[i]] = { ...current[keys[i]] }
        }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      
      if (fieldPath === 'nom') {
        setHasManuallyNamedFiche(value !== "Nouvelle fiche");
      } else if (!hasManuallyNamedFiche) {
        const generatedName = generateFicheName(newData);
        if (generatedName !== "Nouvelle fiche") {
          newData.nom = generatedName;
        }
      }

      newData.updated_at = new Date().toISOString()
      
      return newData
    })
  }

  const getSection = (sectionName) => {
    return formData[sectionName] || {}
  }

  const getField = (fieldPath) => {
    const keys = fieldPath.split('.')
    let current = formData
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return ""
      }
    }
    
    return current !== null && current !== undefined ? current : ""
  }

  const handleSave = async (customData = {}) => {
    if (!user?.id) {
      setSaveStatus({ saving: false, saved: false, error: 'Utilisateur non connecté' });
      return { success: false, error: 'Utilisateur non connecté' };
    }
  
    // 🚨 VALIDATION CRITIQUE - Numéro de bien obligatoire
    const numeroBien = formData.section_logement?.numero_bien
    if (!numeroBien || numeroBien.trim() === '') {
      setSaveStatus({
        saving: false,
        saved: false,
        error: 'Impossible de sauvegarder : le numéro de bien est obligatoire. Remplissez ce champ dans la section "Logement".'
      })
      return { success: false, error: 'Numéro de bien obligatoire' }
    }
  
    setSaveStatus({ saving: true, saved: false, error: null });
    
    try {
      const dataToSave = {
        ...formData,
        ...customData,
        user_id: user.id,  // FORCE TOUJOURS
        updated_at: new Date().toISOString()
      };
  
      // DEBUG
      console.log('🔍 AVANT SAVE - user_id:', dataToSave.user_id);
      console.log('🔍 AVANT SAVE - user email:', user?.email);
  
      const result = await saveFiche(dataToSave, user.id);
      
      if (result.success) {
        setFormData(result.data);
        setSaveStatus({ saving: false, saved: true, error: null });
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, saved: false }))
        }, 3000)
        return { success: true, data: result.data };
      } else {
        setSaveStatus({ saving: false, saved: false, error: result.message });
        return { success: false, error: result.message };
      }
    } catch (error) {
      const errorMessage = error.message || 'Erreur de connexion';
      setSaveStatus({ saving: false, saved: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const updateStatut = async (newStatut) => {
    if (!formData.id) {
      setSaveStatus({ saving: false, saved: false, error: 'Aucune fiche à mettre à jour' });
      return { success: false, error: 'Aucune fiche à mettre à jour' };
    }

    try {
      const updatedData = { ...formData, statut: newStatut };
      const result = await saveFiche(updatedData);
      
      if (result.success) {
        setFormData(result.data);
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.message };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Erreur de connexion' };
    }
  };
  
  const finaliserFiche = () => updateStatut('Complété');
  const archiverFiche = () => updateStatut('Archivé');

  const triggerPdfWebhook = async (pdfLogementUrl, pdfMenageUrl) => {
    if (!formData.id) {
      console.error('❌ Impossible de déclencher webhook PDF : pas d\'ID fiche')
      return { success: false, error: 'Pas d\'ID fiche disponible' }
    }
  
    try {
      console.log('🔄 Déclenchement webhook PDF...', {
        fiche: formData.id,
        logementUrl: pdfLogementUrl,
        menageUrl: pdfMenageUrl
      })
  
      // UPDATE des colonnes PDF en base → déclenche automatiquement le trigger
      const { data, error } = await supabase
        .from('fiches')
        .update({
          pdf_logement_url: pdfLogementUrl,
          pdf_menage_url: pdfMenageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id)
        .select()
  
      if (error) {
        console.error('❌ Erreur UPDATE PDF:', error)
        return { success: false, error: error.message }
      }
  
      if (!data || data.length === 0) {
        console.error('❌ Aucune fiche mise à jour')
        return { success: false, error: 'Fiche non trouvée' }
      }
  
      console.log('✅ Webhook PDF déclenché avec succès!')
      return { success: true, data: data[0] }
  
    } catch (error) {
      console.error('❌ Erreur triggerPdfWebhook:', error)
      return { success: false, error: error.message || 'Erreur inconnue' }
    }
  }  

  const getFormDataPreview = () => {
    return {
      currentSection: getCurrentSection(),
      completedSections: Object.keys(formData).filter(key => 
        key.startsWith('section_') && 
        Object.values(formData[key]).some(val => val !== "" && val !== null)
      ),
      formData
    }
  }


  // 🐛 DEBUG HELPER (optionnel)
  const getMondayDebugInfo = () => {
    const params = new URLSearchParams(location.search)
    return {
      queryParams: Object.fromEntries(params.entries()),
      mondayParsed: parseMondayParams(params),
      formDataCurrent: formData,
      hasMondayParams: hasMondayParams(location.search)
    }
  }

  // Dans FormContext.jsx - Ajouter APRÈS handleCancelDuplicate et AVANT getMondayDebugInfo

  const checkForDuplicate = useCallback(async (generatedName) => {
    if (!user?.id || !generatedName || generatedName === "Nouvelle fiche") {
      return false
    }

    try {
      // Check en base si une fiche avec ce nom existe déjà pour cet utilisateur
      const { data, error } = await supabase
        .from('fiches')
        .select('id, nom, statut')
        .eq('user_id', user.id)
        .eq('nom', generatedName)
        .limit(1)

      if (error) {
        console.error('Erreur lors de la vérification de duplicate:', error)
        return false
      }

      if (data && data.length > 0) {
        console.log('🚨 Fiche duplicate détectée:', data[0])
        setDuplicateAlert({
          existingFiche: data[0]
        })
        return true
      }

      return false
    } catch (error) {
      console.error('Erreur checkForDuplicate:', error)
      return false
    }
  }, [user?.id])


  const handleOpenExisting = useCallback(() => {
    if (duplicateAlert?.existingFiche) {
      navigate(`/fiche?id=${duplicateAlert.existingFiche.id}`)
    }
    setDuplicateAlert(null)
  }, [duplicateAlert, navigate])
  
  const handleCreateNew = useCallback(() => {
    setDuplicateAlert(null)
    // Continue avec la nouvelle fiche (ne fait rien d'autre)
  }, [])
  
  const handleCancelDuplicate = useCallback(() => {
    setDuplicateAlert(null)
    navigate('/')
  }, [navigate])

  return (
    <FormContext.Provider value={{ 
      currentStep, 
      totalSteps, 
      sections,
      next, 
      back, 
      goTo, 
      getCurrentSection,
      
      formData,
      updateSection,
      updateField,
      getSection,
      getField,
      resetForm,
      
      handleSave,
      handleLoad,
      saveStatus,
      updateStatut,
      finaliserFiche,
      archiverFiche,
      triggerPdfWebhook,
      
      getFormDataPreview,
      getMondayDebugInfo,
      
      // 🆕 AJOUT FONCTIONS DUPLICATE
      duplicateAlert,
      handleOpenExisting,
      handleCreateNew,
      handleCancelDuplicate,
      checkForDuplicate
    }}>
      {children}
    </FormContext.Provider>
  )
}

export function useForm() {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('useForm must be used within a FormProvider')
  }
  return context
}