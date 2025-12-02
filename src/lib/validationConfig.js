/**
 * Configuration des champs obligatoires pour la validation du formulaire Fiche Logement
 * Utilisé lors de la finalisation pour vérifier que tous les champs requis sont remplis
 */

// ========================================
// CHAMPS OBLIGATOIRES SIMPLES (toujours requis)
// ========================================

export const REQUIRED_FIELDS = {
    proprietaire: [
        {
            field: 'nom',
            message: 'Le nom du propriétaire est obligatoire'
        },
        {
            field: 'section_proprietaire.prenom',
            message: 'Le prénom du propriétaire est obligatoire'
        },
        {
            field: 'section_proprietaire.nom',
            message: 'Le nom de famille du propriétaire est obligatoire'
        },
        {
            field: 'section_proprietaire.email',
            message: 'L\'email du propriétaire est obligatoire'
        },
        {
            field: 'section_proprietaire.adresse.rue',
            message: 'L\'adresse (rue) du propriétaire est obligatoire'
        },
        {
            field: 'section_proprietaire.adresse.ville',
            message: 'La ville du propriétaire est obligatoire'
        },
        {
            field: 'section_proprietaire.adresse.codePostal',
            message: 'Le code postal du propriétaire est obligatoire'
        }
    ],

    logement: [
        {
            field: 'section_logement.type_propriete',
            message: 'Le type de propriété est obligatoire'
        },
        {
            field: 'section_logement.surface',
            message: 'La surface du logement est obligatoire'
        },
        {
            field: 'section_logement.numero_bien',
            message: 'Le numéro du bien est obligatoire'
        },
        {
            field: 'section_logement.typologie',
            message: 'La typologie du logement est obligatoire'
        },
        {
            field: 'section_logement.nombre_personnes_max',
            message: 'Le nombre de personnes maximum est obligatoire'
        },
        {
            field: 'section_logement.nombre_lits',
            message: 'Le nombre de lits est obligatoire'
        }
    ],

    clefs: [
        {
            field: 'section_clefs.boiteType',
            message: 'Le type de boîte à clés est obligatoire'
        },
        {
            field: 'section_clefs.emplacementBoite',
            message: 'L\'emplacement de la boîte à clés est obligatoire'
        },
        {
            field: 'section_clefs.interphone',
            message: 'Vous devez indiquer si le logement dispose d\'un interphone'
        },
        {
            field: 'section_clefs.tempoGache',
            message: 'Vous devez indiquer si le logement dispose d\'une tempo-gâche'
        },
        {
            field: 'section_clefs.digicode',
            message: 'Vous devez indiquer si le logement dispose d\'un digicode'
        }
    ],

    airbnb: [
        {
            field: 'section_airbnb.annonce_active',
            message: 'Vous devez indiquer si l\'annonce Airbnb est active'
        }
    ],

    booking: [
        {
            field: 'section_booking.annonce_active',
            message: 'Vous devez indiquer si l\'annonce Booking est active'
        }
    ],

    reglementation: [
        {
            field: 'section_reglementation.ville_changement_usage',
            message: 'Vous devez sélectionner une ville pour le changement d\'usage'
        },
        {
            field: 'section_reglementation.details_reglementation',
            message: 'Le champ "Détails réglementation" est obligatoire'
        }
    ],

    exigences: [], // Pas de champs obligatoires

    avis: [], // Pas de champs obligatoires

    linge: [
        {
            field: 'section_gestion_linge.dispose_de_linge',
            message: 'Vous devez indiquer si le logement dispose de linge'
        }
    ],

    equipements: [
        {
            field: 'section_equipements.poubelle_emplacement',
            message: 'L\'emplacement des poubelles est obligatoire'
        },
        {
            field: 'section_equipements.poubelle_ramassage',
            message: 'Les informations sur le ramassage des poubelles sont obligatoires'
        },
        {
            field: 'section_equipements.disjoncteur_emplacement',
            message: 'L\'emplacement du disjoncteur est obligatoire'
        },
        {
            field: 'section_equipements.vanne_eau_emplacement',
            message: 'L\'emplacement de la vanne d\'eau est obligatoire'
        },
        {
            field: 'section_equipements.systeme_chauffage_eau',
            message: 'Le système de chauffage de l\'eau est obligatoire'
        },
        {
            field: 'section_equipements.chauffage_eau_emplacement',
            message: 'L\'emplacement du chauffage de l\'eau est obligatoire'
        },
        {
            field: 'section_equipements.parking_type',
            message: 'Le type de parking est obligatoire'
        }
    ],

    consommables: [
        {
            field: 'section_consommables.fournis_par_prestataire',
            message: 'Vous devez indiquer si les consommables sont fournis par un prestataire'
        }
    ],

    visite: [], // Validation spéciale - voir SPECIAL_VALIDATIONS

    chambres: [], // Validation spéciale - voir SPECIAL_VALIDATIONS

    salle_de_bains: [], // Validation spéciale - voir SPECIAL_VALIDATIONS

    cuisine_1: [], // Validation spéciale - voir SPECIAL_VALIDATIONS

    cuisine_2: [], // Pas de champs obligatoires

    salon_sam: [
        {
            field: 'section_salon_sam.description_generale',
            message: 'La description générale du salon est obligatoire'
        },
        {
            field: 'section_salon_sam.nombre_places_table',
            message: 'Le nombre de places à table est obligatoire'
        }
    ],

    equipements_exterieurs: [
        {
            field: 'section_equip_spe_exterieur.dispose_exterieur',
            message: 'Vous devez indiquer si le logement dispose d\'un espace extérieur'
        },
        {
            field: 'section_equip_spe_exterieur.dispose_piscine',
            message: 'Vous devez indiquer si le logement dispose d\'une piscine'
        },
        {
            field: 'section_equip_spe_exterieur.dispose_jacuzzi',
            message: 'Vous devez indiquer si le logement dispose d\'un jacuzzi'
        },
        {
            field: 'section_equip_spe_exterieur.dispose_cuisine_exterieure',
            message: 'Vous devez indiquer si le logement dispose d\'une cuisine extérieure'
        }
    ],

    communs: [
        {
            field: 'section_communs.dispose_espaces_communs',
            message: 'Vous devez indiquer si le logement dispose d\'espaces communs'
        }
    ],

    teletravail: [], // Pas de champs obligatoires

    bebe: [], // Pas de champs obligatoires

    securite: [] // Pas de champs obligatoires
}

// ========================================
// CHAMPS CONDITIONNELS (requis selon d'autres réponses)
// ========================================

export const CONDITIONAL_REQUIRED_FIELDS = {
    logement: [
        {
            field: 'section_logement.type_autre_precision',
            condition: (formData) => formData.section_logement?.type_propriete === 'Autre',
            message: 'Le champ "Type - Autres (Veuillez préciser)" est obligatoire quand vous sélectionnez "Autre"'
        }
    ],

    clefs: [
        // TTlock
        {
            field: 'section_clefs.ttlock.masterpinConciergerie',
            condition: (formData) => formData.section_clefs?.boiteType === 'TTlock',
            message: 'Le code Masterpin conciergerie TTlock est obligatoire'
        },
        {
            field: 'section_clefs.ttlock.codeProprietaire',
            condition: (formData) => formData.section_clefs?.boiteType === 'TTlock',
            message: 'Le code Propriétaire TTlock est obligatoire'
        },
        {
            field: 'section_clefs.ttlock.codeMenage',
            condition: (formData) => formData.section_clefs?.boiteType === 'TTlock',
            message: 'Le code Ménage TTlock est obligatoire'
        },
        // Igloohome
        {
            field: 'section_clefs.igloohome.masterpinConciergerie',
            condition: (formData) => formData.section_clefs?.boiteType === 'Igloohome',
            message: 'Le Masterpin conciergerie Igloohome est obligatoire'
        },
        {
            field: 'section_clefs.igloohome.codeVoyageur',
            condition: (formData) => formData.section_clefs?.boiteType === 'Igloohome',
            message: 'Le code Voyageur Igloohome est obligatoire'
        },
        {
            field: 'section_clefs.igloohome.codeProprietaire',
            condition: (formData) => formData.section_clefs?.boiteType === 'Igloohome',
            message: 'Le code Propriétaire Igloohome est obligatoire'
        },
        {
            field: 'section_clefs.igloohome.codeMenage',
            condition: (formData) => formData.section_clefs?.boiteType === 'Igloohome',
            message: 'Le code Ménage Igloohome est obligatoire'
        },
        // Masterlock
        {
            field: 'section_clefs.masterlock.code',
            condition: (formData) => formData.section_clefs?.boiteType === 'Masterlock',
            message: 'Le code de la boîte Masterlock est obligatoire'
        }
    ],

    airbnb: [
        {
            field: 'section_airbnb.email_compte',
            condition: (formData) => formData.section_airbnb?.identifiants_obtenus === true,
            message: 'L\'email du compte Airbnb est obligatoire'
        },
        {
            field: 'section_airbnb.mot_passe',
            condition: (formData) => formData.section_airbnb?.identifiants_obtenus === true,
            message: 'Le mot de passe du compte Airbnb est obligatoire'
        },
        {
            field: 'section_airbnb.explication_refus',
            condition: (formData) => formData.section_airbnb?.identifiants_obtenus === false,
            message: 'L\'explication du refus des identifiants Airbnb est obligatoire'
        }
    ],

    booking: [
        {
            field: 'section_booking.email_compte',
            condition: (formData) => formData.section_booking?.identifiants_obtenus === true,
            message: 'L\'email du compte Booking est obligatoire'
        },
        {
            field: 'section_booking.mot_passe',
            condition: (formData) => formData.section_booking?.identifiants_obtenus === true,
            message: 'Le mot de passe du compte Booking est obligatoire'
        },
        {
            field: 'section_booking.explication_refus',
            condition: (formData) => formData.section_booking?.identifiants_obtenus === false,
            message: 'L\'explication du refus des identifiants Booking est obligatoire'
        }
    ],

    reglementation: [
        {
            field: 'section_reglementation.ville_declaration_simple',
            condition: (formData) => formData.section_reglementation?.ville_changement_usage === 'NON !',
            message: 'Le champ "Déclaration simple" est obligatoire quand aucun changement d\'usage n\'est requis'
        }
    ],

    linge: [
        {
            field: 'section_gestion_linge.emplacement_code_cadenas',
            condition: (formData) => formData.section_gestion_linge?.dispose_de_linge === true,
            message: 'L\'emplacement et le code du cadenas pour le linge sont obligatoires'
        }
    ],

    equipements: [
        // Parking rue
        {
            field: 'section_equipements.parking_rue_details',
            condition: (formData) => formData.section_equipements?.parking_type === 'rue',
            message: 'Les détails du parking dans la rue sont obligatoires'
        },
        // Parking sur place
        {
            field: 'section_equipements.parking_sur_place_types',
            condition: (formData) => formData.section_equipements?.parking_type === 'sur_place',
            message: 'Le type de parking sur place est obligatoire',
            customValidation: (formData) => {
                const types = formData.section_equipements?.parking_sur_place_types
                return Array.isArray(types) && types.length > 0
            }
        },
        {
            field: 'section_equipements.parking_sur_place_details',
            condition: (formData) => formData.section_equipements?.parking_type === 'sur_place',
            message: 'Les détails du parking sur place sont obligatoires'
        },
        // Parking payant
        {
            field: 'section_equipements.parking_payant_type',
            condition: (formData) => formData.section_equipements?.parking_type === 'payant',
            message: 'Le type de parking payant est obligatoire'
        },
        {
            field: 'section_equipements.parking_payant_details',
            condition: (formData) => formData.section_equipements?.parking_type === 'payant',
            message: 'Les détails du parking payant sont obligatoires'
        },
        // WiFi
        {
            field: 'section_equipements.wifi_nom_reseau',
            condition: (formData) => formData.section_equipements?.wifi_statut === 'oui',
            message: 'Le nom du réseau WiFi est obligatoire'
        },
        {
            field: 'section_equipements.wifi_mot_de_passe',
            condition: (formData) => formData.section_equipements?.wifi_statut === 'oui',
            message: 'Le mot de passe WiFi est obligatoire'
        }
    ],

    visite: [
        {
            field: 'section_visite.nombre_chambres',
            condition: (formData) => formData.section_visite?.pieces_chambre === true,
            message: 'Le nombre de chambres est obligatoire'
        },
        {
            field: 'section_visite.nombre_salles_bains',
            condition: (formData) => formData.section_visite?.pieces_salle_bains === true,
            message: 'Le nombre de salles de bains est obligatoire'
        }
    ],

    communs: [
        {
            field: 'section_communs.description_generale',
            condition: (formData) => formData.section_communs?.dispose_espaces_communs === true,
            message: 'La description des espaces communs est obligatoire'
        },
        {
            field: 'section_communs.entretien_prestataire',
            condition: (formData) => formData.section_communs?.dispose_espaces_communs === true,
            message: 'Vous devez indiquer si un prestataire entretient les espaces communs'
        },
        {
            field: 'section_communs.entretien_frequence',
            condition: (formData) => {
                const communs = formData.section_communs
                return communs?.dispose_espaces_communs === true && communs?.entretien_prestataire === true
            },
            message: 'La fréquence d\'entretien est obligatoire'
        },
        {
            field: 'section_communs.entretien_qui',
            condition: (formData) => {
                const communs = formData.section_communs
                return communs?.dispose_espaces_communs === true && communs?.entretien_prestataire === false
            },
            message: 'Vous devez préciser qui entretient les espaces communs'
        }
    ],

    cuisine_1: [
        // Marques conditionnelles (si équipement sélectionné)
        {
            field: 'section_cuisine_1.refrigerateur_marque',
            condition: (formData) => formData.section_cuisine_1?.equipements_refrigerateur === true,
            message: 'La marque du réfrigérateur est obligatoire'
        },
        {
            field: 'section_cuisine_1.cuisiniere_marque',
            condition: (formData) => formData.section_cuisine_1?.equipements_cuisiniere === true,
            message: 'La marque de la cuisinière est obligatoire'
        },
        {
            field: 'section_cuisine_1.plaque_cuisson_marque',
            condition: (formData) => formData.section_cuisine_1?.equipements_plaque_cuisson === true,
            message: 'La marque de la plaque de cuisson est obligatoire'
        },
        {
            field: 'section_cuisine_1.four_marque',
            condition: (formData) => formData.section_cuisine_1?.equipements_four === true,
            message: 'La marque du four est obligatoire'
        },
        {
            field: 'section_cuisine_1.cafetiere_marque',
            condition: (formData) => formData.section_cuisine_1?.equipements_cafetiere === true,
            message: 'La marque de la cafetière est obligatoire'
        }
    ]
}

// ========================================
// VALIDATIONS SPÉCIALES (logique complexe)
// ========================================

export const SPECIAL_VALIDATIONS = {

    // Validation visite : au moins UNE pièce cochée
    validateVisite: (formData) => {
        const errors = []
        const visite = formData.section_visite

        if (!visite) return errors

        const pieceFields = [
            'pieces_chambre', 'pieces_salon', 'pieces_salle_bains',
            'pieces_salon_prive', 'pieces_kitchenette', 'pieces_cuisine',
            'pieces_salle_manger', 'pieces_bureau', 'pieces_salle_jeux',
            'pieces_salle_sport', 'pieces_buanderie', 'pieces_terrasse',
            'pieces_balcon', 'pieces_jardin', 'pieces_autre'
        ]

        const hasAtLeastOne = pieceFields.some(field => visite[field] === true)

        if (!hasAtLeastOne) {
            errors.push({
                section: 'visite',
                field: 'section_visite.pieces',
                message: 'Vous devez répondre à la première question sur les types de pièces'
            })
        }

        return errors
    },

    // Validation des chambres : au moins UN type de lit > 0 par chambre affichée
    validateChambres: (formData) => {
        const errors = []
        const visite = formData.section_visite
        const chambres = formData.section_chambres

        if (!visite || !chambres) return errors

        const nombreChambres = parseInt(visite.nombre_chambres) || 0
        const isStudio = formData.section_logement?.typologie === 'Studio' ||
            formData.section_logement?.typologie === 'T1'

        // Types de lits à vérifier
        const typesLits = [
            'lit_simple_90_190',
            'lit_double_140_190',
            'lit_queen_160_200',
            'lit_king_180_200',
            'canape_lit_simple',
            'canape_lit_double',
            'lits_superposes_90_190',
            'lit_gigogne'
        ]

        // Pour un Studio/T1, vérifier l'espace nuit
        if (isStudio && nombreChambres === 0) {
            const espaceNuit = chambres.chambre_1
            if (espaceNuit) {
                const hasLits = typesLits.some(type => (espaceNuit[type] || 0) > 0)
                if (!hasLits) {
                    errors.push({
                        section: 'chambres',
                        field: 'section_chambres.chambre_1',
                        message: 'L\'espace nuit doit avoir au moins un type de lit renseigné'
                    })
                }
            }
        } else {
            // Pour les logements normaux, vérifier chaque chambre
            for (let i = 1; i <= nombreChambres; i++) {
                const chambreKey = `chambre_${i}`
                const chambreData = chambres[chambreKey]

                if (chambreData) {
                    const hasLits = typesLits.some(type => (chambreData[type] || 0) > 0)
                    if (!hasLits) {
                        errors.push({
                            section: 'chambres',
                            field: `section_chambres.${chambreKey}`,
                            message: `La chambre ${i} doit avoir au moins un type de lit renseigné`
                        })
                    }
                }
            }
        }

        return errors
    },

    // Validation salle de bains : au moins UN équipement coché par salle
    validateSallesDeBains: (formData) => {
        const errors = []
        const visite = formData.section_visite
        const sallesDeBains = formData.section_salle_de_bains

        if (!visite || !sallesDeBains) return errors

        const nombreSalles = parseInt(visite.nombre_salles_bains) || 0

        // Équipements à vérifier
        const equipements = [
            'equipements_douche',
            'equipements_baignoire',
            'equipements_douche_baignoire_combinees',
            'equipements_double_vasque',
            'equipements_wc',
            'equipements_bidet',
            'equipements_chauffage',
            'equipements_lave_linge',
            'equipements_seche_serviette',
            'equipements_seche_cheveux',
            'equipements_autre'
        ]

        for (let i = 1; i <= nombreSalles; i++) {
            const salleKey = `salle_de_bain_${i}`
            const salleData = sallesDeBains[salleKey]

            if (salleData) {
                // Vérifier qu'au moins un équipement est coché
                const hasEquipement = equipements.some(equip => salleData[equip] === true)
                if (!hasEquipement) {
                    errors.push({
                        section: 'salle_de_bains',
                        field: `section_salle_de_bains.${salleKey}.equipements`,
                        message: `La salle de bain ${i} doit avoir au moins un équipement sélectionné`
                    })
                }

                // Vérifier "WC séparé ?" si equipements_wc === true
                if (salleData.equipements_wc === true && salleData.wc_separe === null) {
                    errors.push({
                        section: 'salle_de_bains',
                        field: `section_salle_de_bains.${salleKey}.wc_separe`,
                        message: `La salle de bain ${i} : vous devez indiquer si le WC est séparé`
                    })
                }

                // Vérifier "Accès" obligatoire
                if (!salleData.acces || salleData.acces === '') {
                    errors.push({
                        section: 'salle_de_bains',
                        field: `section_salle_de_bains.${salleKey}.acces`,
                        message: `La salle de bain ${i} : le champ "Accès" est obligatoire`
                    })
                }
            }
        }

        return errors
    },

    // Validation cuisine : au moins UN équipement coché
    validateCuisine: (formData) => {
        const errors = []
        const cuisine = formData.section_cuisine_1

        if (!cuisine) return errors

        const equipements = [
            'equipements_refrigerateur',
            'equipements_congelateur',
            'equipements_mini_refrigerateur',
            'equipements_cuisiniere',
            'equipements_plaque_cuisson',
            'equipements_four',
            'equipements_micro_ondes',
            'equipements_lave_vaisselle',
            'equipements_cafetiere',
            'equipements_bouilloire',
            'equipements_grille_pain',
            'equipements_hotte',
            'equipements_blender',
            'equipements_cuiseur_riz',
            'equipements_machine_pain',
            'equipements_lave_linge',
            'equipements_autre'
        ]

        const hasEquipement = equipements.some(equip => cuisine[equip] === true)

        if (!hasEquipement) {
            errors.push({
                section: 'cuisine_1',
                field: 'section_cuisine_1.equipements',
                message: 'Vous devez indiquer les équipements de la cuisine'
            })
        }

        return errors
    },

    // Validation salon : au moins UN équipement coché
    validateSalon: (formData) => {
        const errors = []
        const salon = formData.section_salon_sam

        if (!salon) return errors

        const equipements = [
            'equipements_table_manger',
            'equipements_chaises',
            'equipements_canape',
            'equipements_canape_lit',
            'equipements_fauteuils',
            'equipements_table_basse',
            'equipements_television',
            'equipements_cheminee',
            'equipements_jeux_societe',
            'equipements_livres_magazines',
            'equipements_livres_jouets_enfants',
            'equipements_climatisation',
            'equipements_chauffage',
            'equipements_stores_manuels',
            'equipements_volets',
            'equipements_stores_electriques',
            'equipements_autre'
        ]

        const hasEquipement = equipements.some(equip => salon[equip] === true)

        if (!hasEquipement) {
            errors.push({
                section: 'salon_sam',
                field: 'section_salon_sam.equipements',
                message: 'Vous devez sélectionner au moins un équipement dans le salon'
            })
        }

        return errors
    }
}

// ========================================
// HELPER : Récupérer la valeur d'un champ avec notation pointée
// ========================================

const getFieldValue = (formData, fieldPath) => {
    const keys = fieldPath.split('.')
    let current = formData

    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key]
        } else {
            return undefined
        }
    }

    return current
}

// ========================================
// FONCTION PRINCIPALE DE VALIDATION
// ========================================

export const validateRequiredFields = (formData) => {
    const errors = {}

    // 1. VALIDATION DES CHAMPS SIMPLES
    Object.entries(REQUIRED_FIELDS).forEach(([section, fields]) => {
        fields.forEach(fieldConfig => {
            // Support des deux formats : string ou { field, message }
            const fieldPath = typeof fieldConfig === 'string' ? fieldConfig : fieldConfig.field
            const customMessage = typeof fieldConfig === 'object' ? fieldConfig.message : null

            const value = getFieldValue(formData, fieldPath)

            // Vérifier si le champ est vide
            if (value === null || value === undefined || value === '' ||
                (typeof value === 'number' && isNaN(value))) {
                if (!errors[section]) errors[section] = []
                errors[section].push({
                    field: fieldPath,
                    message: customMessage || `Le champ "${fieldPath}" est obligatoire`
                })
            }
        })
    })

    // 2. VALIDATION DES CHAMPS CONDITIONNELS
    Object.entries(CONDITIONAL_REQUIRED_FIELDS).forEach(([section, conditionals]) => {
        conditionals.forEach(({ field, condition, message, customValidation }) => {
            // Vérifier si la condition est remplie
            if (condition(formData)) {
                // Si validation custom fournie, l'utiliser
                if (customValidation) {
                    if (!customValidation(formData)) {
                        if (!errors[section]) errors[section] = []
                        errors[section].push({ field, message })
                    }
                } else {
                    // Sinon, vérification standard
                    const value = getFieldValue(formData, field)
                    if (value === null || value === undefined || value === '') {
                        if (!errors[section]) errors[section] = []
                        errors[section].push({ field, message })
                    }
                }
            }
        })
    })

    // 3. VALIDATIONS SPÉCIALES
    const visiteErrors = SPECIAL_VALIDATIONS.validateVisite(formData)
    const chambreErrors = SPECIAL_VALIDATIONS.validateChambres(formData)
    const salleErrors = SPECIAL_VALIDATIONS.validateSallesDeBains(formData)
    const cuisineErrors = SPECIAL_VALIDATIONS.validateCuisine(formData)
    const salonErrors = SPECIAL_VALIDATIONS.validateSalon(formData)
        // Fusionner les erreurs spéciales
        ;[...visiteErrors, ...chambreErrors, ...salleErrors, ...cuisineErrors, ...salonErrors].forEach(error => {
            if (!errors[error.section]) errors[error.section] = []
            errors[error.section].push({
                field: error.field,
                message: error.message
            })
        })

    return errors
}