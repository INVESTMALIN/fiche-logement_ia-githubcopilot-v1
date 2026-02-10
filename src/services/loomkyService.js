// ============================================
// LOOMKY SERVICE
// Service centralisé pour l'intégration Loomky
// ============================================

/**
 * Configuration Loomky
 */
const LOOMKY_CONFIG = {
    DEV: {
        BASE_URL: 'https://dev.loomky.com'
        // ⚠️ Pas de TOKEN ici - toujours injecté par l'appelant
    },
    PROD: {
        BASE_URL: null // ⏳ En attente credentials prod
        // ⚠️ Pas de TOKEN ici - toujours injecté par l'appelant
    }
}

// Utiliser DEV pour l'instant
const CURRENT_ENV = 'DEV'
const BASE_URL = LOOMKY_CONFIG[CURRENT_ENV].BASE_URL

// ⚠️ IMPORTANT: Le token n'est JAMAIS hardcodé
// Il doit être injecté par l'appelant (FicheFinalisation, SimulationLoomky, etc.)
// Pas de valeur par défaut = sécurité + testabilité

/**
 * Normalise formData (nested UI) → fiche flat (comme Supabase)
 * Pour que buildPropertyPayload() reçoive la structure attendue
 */
export function normalizeFormDataToFiche(formData) {
    return {
        // IDs et metadata
        id: formData.id,
        user_id: formData.user_id,
        nom: formData.nom,
        statut: formData.statut,
        created_at: formData.created_at,
        updated_at: formData.updated_at,

        // Propriétaire (section_proprietaire → flat)
        proprietaire_nom: formData.section_proprietaire?.nom || '',
        proprietaire_prenom: formData.section_proprietaire?.prenom || '',
        proprietaire_email: formData.section_proprietaire?.email || '',
        proprietaire_adresse_rue: formData.section_proprietaire?.adresse?.rue || '',
        proprietaire_adresse_complement: formData.section_proprietaire?.adresse?.complement || '',
        proprietaire_adresse_ville: formData.section_proprietaire?.adresse?.ville || '',
        proprietaire_adresse_code_postal: formData.section_proprietaire?.adresse?.codePostal || '',

        // Logement (section_logement → flat)
        logement_numero_bien: formData.section_logement?.numero_bien || '',
        logement_type_propriete: formData.section_logement?.type_propriete || '',
        logement_typologie: formData.section_logement?.typologie || '',
        logement_surface: formData.section_logement?.surface || formData.section_logement?.caracteristiques?.surface || null,
        logement_nombre_personnes_max: formData.section_logement?.nombre_personnes_max || '',
        logement_nombre_lits: formData.section_logement?.nombre_lits || '',

        // Visite (pour numberOfRooms et numberOfBathrooms)
        visite_nombre_chambres: formData.section_visite?.nombre_chambres || formData.section_logement?.caracteristiques?.nombreChambres || '',
        visite_nombre_salles_bains: formData.section_visite?.nombre_salles_bains || '',

        // Chambres (pour calculateBedCounts - 6 chambres possibles)
        ...generateChambresFlat(formData),

        // Loomky sync fields
        loomky_property_id: formData.loomky_property_id,
        loomky_checklist_ids: formData.loomky_checklist_ids,
        loomky_sync_status: formData.loomky_sync_status,
        loomky_synced_at: formData.loomky_synced_at,
        loomky_snapshot: formData.loomky_snapshot
    }
}

// Helper pour mapper les 6 chambres
export function generateChambresFlat(formData) {
    const chambresFlat = {}

    for (let i = 1; i <= 6; i++) {
        const chambre = formData[`section_chambres_${i}`] || formData.section_chambres?.[`chambre_${i}`] || {}

        chambresFlat[`chambres_chambre_${i}_lit_simple_90_190`] = chambre.lit_simple_90_190 || 0
        chambresFlat[`chambres_chambre_${i}_canape_lit_simple`] = chambre.canape_lit_simple || 0
        chambresFlat[`chambres_chambre_${i}_lits_superposes_90_190`] = chambre.lits_superposes_90_190 || 0
        chambresFlat[`chambres_chambre_${i}_lit_gigogne`] = chambre.lit_gigogne || 0
        chambresFlat[`chambres_chambre_${i}_lit_double_140_190`] = chambre.lit_double_140_190 || 0
        chambresFlat[`chambres_chambre_${i}_lit_queen_160_200`] = chambre.lit_queen_160_200 || 0
        chambresFlat[`chambres_chambre_${i}_lit_king_180_200`] = chambre.lit_king_180_200 || 0
        chambresFlat[`chambres_chambre_${i}_canape_lit_double`] = chambre.canape_lit_double || 0
    }

    return chambresFlat
}

// ============================================
// SECTION 1: EXTRACTION & SNAPSHOT
// ============================================

/**
 * Extrait le snapshot OPÉRATIONNEL des données Loomky
 * 
 * ⚠️ APPROCHE OPÉRATIONNELLE (pas conceptuelle) :
 * Le snapshot contient EXACTEMENT ce qui sera envoyé à Loomky.
 * Cela garantit qu'aucune divergence n'est possible entre :
 * - ce qui déclenche un changement (dirty detection)
 * - ce qui est réellement envoyé à l'API
 * 
 * Le snapshot = buildPropertyPayload() + buildResolvedChecklists()
 * → Aucune logique dupliquée
 * → Refactoring safe
 * → Source de vérité unique
 * 
 * ⚠️ IMPORTANT: Les checklists sont triées par 'name' pour garantir
 * une comparaison JSON.stringify() stable (évite faux positifs)
 * 
 * @param {Object} fiche - Fiche complète depuis Supabase
 * @returns {Object} - { property: {...}, checklists: {...} }
 */
export function extractLoomkyFields(fiche) {
    const property = buildPropertyPayload(fiche)
    const checklists = buildResolvedChecklists(fiche)

    // Tri ultra-stable des checklists par name avec fallback JSON
    // (cas edge: deux checklists avec même name → tri sur contenu complet)
    if (checklists.checklists && Array.isArray(checklists.checklists)) {
        checklists.checklists.sort((a, b) => {
            if (a.name !== b.name) return a.name.localeCompare(b.name)
            return JSON.stringify(a).localeCompare(JSON.stringify(b))
        })

        // Tri ultra-stable des tasks dans chaque checklist
        checklists.checklists.forEach(checklist => {
            if (checklist.tasks && Array.isArray(checklist.tasks)) {
                checklist.tasks.sort((a, b) => {
                    if (a.name !== b.name) return a.name.localeCompare(b.name)
                    return JSON.stringify(a).localeCompare(JSON.stringify(b))
                })
            }
        })
    }

    return {
        property,
        checklists
    }
}

/**
 * Compare le snapshot opérationnel actuel avec le snapshot sauvegardé
 * Retourne true si des changements sont détectés
 * 
 * Le snapshot étant opérationnel (= payloads réels Loomky),
 * cette fonction détecte TOUT changement qui impacterait l'API,
 * même les modifications internes de logique métier.
 * 
 * @param {Object} fiche - Fiche avec loomky_snapshot
 * @returns {boolean} - true si modifications détectées
 */
/**
 * Fonction utilitaire : comparaison profonde d'objets
 */
function deepEqual(a, b) {
    if (a === b) return true
    if (typeof a !== typeof b) return false
    if (typeof a !== 'object' || a === null || b === null) return false
    if (Array.isArray(a) !== Array.isArray(b)) return false

    if (Array.isArray(a)) {
        if (a.length !== b.length) return false
        return a.every((item, index) => deepEqual(item, b[index]))
    }

    const keysA = Object.keys(a).sort()
    const keysB = Object.keys(b).sort()

    if (keysA.length !== keysB.length) return false
    if (keysA.join(',') !== keysB.join(',')) return false

    return keysA.every(key => deepEqual(a[key], b[key]))
}

/**
 * Compare le snapshot opérationnel actuel avec le snapshot sauvegardé
 * Retourne true si des changements sont détectés
 */
export function hasLoomkyChanges(fiche) {
    if (!fiche.loomky_snapshot) return false

    const currentSnapshot = extractLoomkyFields(fiche)
    const savedSnapshot = fiche.loomky_snapshot

    return !deepEqual(currentSnapshot, savedSnapshot)
}

/**
 * Compare uniquement les checklists entre snapshot et état actuel
 * Retourne true si les checklists ont changé
 */
export function hasChecklistsChanges(fiche) {
    if (!fiche.loomky_snapshot?.checklists) return true

    const currentChecklists = buildResolvedChecklists(fiche)
    const savedChecklists = fiche.loomky_snapshot.checklists

    // Fonction pour normaliser : trier checklists ET tasks
    const normalize = (obj) => {
        const sortByName = (a, b) => a.name.localeCompare(b.name)

        return {
            checklists: [...obj.checklists]
                .sort(sortByName)
                .map(checklist => ({
                    ...checklist,
                    tasks: [...checklist.tasks].sort(sortByName) // Trier les tasks aussi
                }))
        }
    }

    const currentNormalized = normalize(currentChecklists)
    const savedNormalized = normalize(savedChecklists)

    const hasChanges = !deepEqual(currentNormalized, savedNormalized)
    console.log('🔍 Checklists changed?', hasChanges)

    return hasChanges
}

// ============================================
// SECTION 2: CONSTRUCTION PAYLOADS
// ============================================

/**
 * Construit le payload property pour Loomky
 * Logique EXACTE extraite de SimulationLoomky.generatePayloads()
 * avec corrections pour robustesse et cohérence API
 * 
 * @param {Object} fiche - Fiche complète depuis Supabase
 * @returns {Object} - Payload property formaté pour API Loomky
 */
export function buildPropertyPayload(fiche) {
    return {
        name: `${fiche.logement_type_propriete || ''} ${fiche.nom || fiche.logement_numero_bien || ''}`.trim() || "Hébergement sans nom",
        type: 'apartment', // TODO PROD: mapPropertyType(fiche.logement_type_propriete),
        address: {
            street: fiche.proprietaire_adresse_rue || 'Non renseignée',
            city: fiche.proprietaire_adresse_ville || 'Non renseignée',
            postalCode: fiche.proprietaire_adresse_code_postal || '00000',
            country: 'FR'
        },
        description: `${fiche.logement_type_propriete || ''} - ${fiche.logement_typologie || ''} à ${fiche.proprietaire_adresse_ville || ''}`.trim() || 'Logement de vacances',
        status: "active",
        checkin: {
            from: "15:00",
            to: "18:00"
        },
        checkout: {
            from: "10:00",
            to: "11:00"
        },
        surfaceArea: fiche.logement_surface ? parseInt(fiche.logement_surface) : 10,
        defaultOccupancy: fiche.logement_nombre_personnes_max ? parseInt(fiche.logement_nombre_personnes_max) : 1,
        maxOccupancy: fiche.logement_nombre_personnes_max ? parseInt(fiche.logement_nombre_personnes_max) : 1,
        numberOfRooms: fiche.logement_type_propriete === "Studio" ? 1 : (parseInt(fiche.visite_nombre_chambres) || 1),
        numberOfBathrooms: fiche.visite_nombre_salles_bains ? parseInt(fiche.visite_nombre_salles_bains) : 1,
        defaultRate: 100,
        timezone: "Europe/Paris",
        ...calculateBedCounts(fiche),
        coordinates: {
            latitude: 0,
            longitude: 0
        }
    }
}

/**
 * Construit les checklists avec logique conditionnelle
 * 
 * ⚠️ CRITIQUE: Cette fonction dépend DIRECTEMENT du schéma Supabase de la table `fiches`.
 * Toute modification du schéma (renommage colonne, ajout équipement, etc.) 
 * DOIT être répercutée ici sous peine de bugs silencieux.
 * 
 * Cette fonction encode ~120 règles métier conditionnelles basées sur les équipements.
 * Elle est la SOURCE DE VÉRITÉ pour les checklists Loomky.
 * 
 * @param {Object} fiche - Fiche complète depuis Supabase
 * @returns {Object} - { checklists: [...] }
 */
export function buildResolvedChecklists(fiche) {
    const checklists = []

    // === SECTIONS STANDARD (toujours présentes) ===

    // Entrée
    checklists.push({
        name: "Entrée",
        tasks: [
            { name: "Vue d'ensemble de l'entrée (murs et sols)", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" },
            { name: "Porte d'entrée", description: "Porte propre, poignée et interrupteurs désinfectés" }
        ],
        isRequired: true,
        beforePhotosRequired: true,
        afterPhotosRequired: true
    })


    // Salon
    const salonTasks = [
        { name: "Vue d'ensemble (murs et sols)", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" }
    ]

    // Task conditionnelle : Table basse
    if (fiche.salon_sam_equipements_table_basse === true) {
        salonTasks.push({ name: "Table basse", description: "Surface essuyée et rangée" })
    }

    // Task conditionnelle : Canapé
    if (fiche.salon_sam_equipements_canape === true) {
        salonTasks.push({ name: "Canapé", description: "Canapé propre, aspiré, dépoussiéré et détaché" })
    }

    // Task conditionnelle : Fauteuils
    if (fiche.salon_sam_equipements_fauteuils === true) {
        salonTasks.push({ name: "Fauteuils", description: "Fauteuils propre, aspiré, dépoussiéré et détaché" })
    }

    // Task conditionnelle : Climatisation
    if (fiche.salon_sam_equipements_climatisation === true) {
        salonTasks.push({ name: "Climatisation", description: "Réglage à 18° à partir du 1er novembre et éteint à partir du 1er avril. Etat fonctionnel" })
    }

    // Task conditionnelle : Chauffages
    if (fiche.salon_sam_equipements_chauffage === true) {
        salonTasks.push({ name: "Chauffages", description: "Propres et dépoussiérés. Etat fonctionnel" })
    }

    // Task conditionnelle : Télévision
    if (fiche.salon_sam_equipements_television === true) {
        salonTasks.push({ name: "Télévision et télécommande", description: "Dépoussiérées et fonctionnelles : vérification nécessaire" })
    }

    // Task conditionnelle : Canapé-lit
    if (fiche.salon_sam_equipements_canape_lit === true) {
        salonTasks.push({ name: "Linge propre à disposition pour le canapé lit", description: "Vérifier présence et propreté : couette et housse de couette + Oreillers et taies d'oreillers + Drap housse + Serviettes (1 grande et 1 petite par personne)" })
    }

    /* (OLD)
    // Vérifier si au moins une chambre a un canapé-lit avec draps fournis
    let hasCanapeLitWithDraps = false
    for (let i = 1; i <= 6; i++) {
      const hasCanapeLit = (fiche[`chambres_chambre_${i}_canape_lit_simple`] > 0) ||
        (fiche[`chambres_chambre_${i}_canape_lit_double`] > 0)
      const hasDraps = fiche[`chambres_chambre_${i}_equipements_draps_fournis`] === true

      if (hasCanapeLit && hasDraps) {
        hasCanapeLitWithDraps = true
        break
      }
    }

    // Task conditionnelle : Linge canapé-lit
    if (hasCanapeLitWithDraps) {
      salonTasks.push({
        name: "Linge propre à disposition pour le canapé lit",
        description: "Vérifier présence et propreté : Couette et housse de couette + Oreillers et taies d'oreillers + Drap housse + Serviettes (1 grande et 1 petite par personne)"
      })
    }
    */

    checklists.push({
        name: "Salon",
        tasks: salonTasks,
        isRequired: true,
        beforePhotosRequired: true,
        afterPhotosRequired: true
    })


    // Salle à manger
    const salleAMangerTasks = [
        { name: "Vue d'ensemble (murs et sols)", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" }
    ]

    // Task conditionnelle : Table à manger
    if (fiche.salon_sam_equipements_table_manger === true) {
        salleAMangerTasks.push({ name: "Table à manger", description: "Surfaces propres et alignées. Pas de miettes sous la table, sur la table ni sur les chaises" })
    }

    // Task conditionnelle : Chaises
    if (fiche.salon_sam_equipements_chaises === true) {
        salleAMangerTasks.push({ name: "Chaises", description: "Surfaces propres et alignées. Pas de miettes sous les chaises. Les chaises ont été aspirées" })
    }

    // Task conditionnelle : Climatisation
    if (fiche.salon_sam_equipements_climatisation === true) {
        salleAMangerTasks.push({ name: "Climatisation", description: "Réglage à 18° à partir du 1er novembre et éteint à partir du 1er avril. Etat fonctionnel" })
    }

    // Task conditionnelle : Chauffage
    if (fiche.salon_sam_equipements_chauffage === true) {
        salleAMangerTasks.push({ name: "Chauffage", description: "Propres et dépoussiérés. Etat fonctionnel" })
    }

    checklists.push({
        name: "Salle à manger",
        tasks: salleAMangerTasks,
        isRequired: true,
        beforePhotosRequired: true,
        afterPhotosRequired: true
    })

    // Cuisine
    const cuisineTasks = [
        { name: "Vue d'ensemble de la cuisine (murs et sols)", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et équipements rangés" },
        { name: "Plan de travail", description: "Essuyé et désinfecté" },
        { name: "Plaque de cuisson", description: "Propre et fonctionnelle" },
        { name: "Évier", description: "Nettoyé et sans traces de calcaire. Vérifier que l'écoulement se fait correctement" },
        { name: "Poubelle avec sac propre", description: "Vidée et remplacée. Propre et désinfectée" },
        { name: "Torchon", description: "Propre et plié" },
        { name: "Éponge, liquide vaisselle, savon pour les mains", description: "Disponibles, en bon état et en quantité suffisante" },
        { name: "Essuie-tout, sel, sucre, poivre", description: "Disponibles, en bon état et en quantité suffisante" },
        { name: "Café, thé", description: "Disponibles, au bon format et en quantité suffisante (1 café et 1 thé par personne)" },
        { name: "Autres produits si demandés par le propriétaire (pastille lave-vaisselle, bouteille d'eau, gâteaux etc.)", description: "Disponibles, en bon état et en quantité suffisante" },
        { name: "Emplacement produits ménagers", description: "Ordonné et accessible" }
    ]

    if (fiche.cuisine_1_equipements_hotte === true) {
        cuisineTasks.push({ name: "Hotte", description: "Dépoussiérée et propre. Les filtres de la hotte sont propres. La hotte est fonctionnelle" })
    }

    if (fiche.cuisine_1_equipements_refrigerateur === true) {
        cuisineTasks.push({ name: "Réfrigérateur", description: "Propre, désinfecté et fonctionnel. Aucune nourriture à l'intérieur. Le frigo est laissé sur 2 ou 3 maximum et ne présente pas de givre" })
    }

    if (fiche.cuisine_1_equipements_congelateur === true) {
        cuisineTasks.push({ name: "Congélateur", description: "Propre, désinfecté et fonctionnel. Aucune nourriture à l'intérieur. Le congélateur est décongelé (pas de bloc de glace)" })
    }

    if (fiche.cuisine_1_equipements_mini_refrigerateur === true) {
        cuisineTasks.push({ name: "Mini-réfrigérateur", description: "Propre, désinfecté et fonctionnel. Aucune nourriture à l'intérieur. Le congélateur est décongelé (pas de bloc de glace)" })
    }

    if (fiche.cuisine_1_equipements_cuisiniere === true) {
        cuisineTasks.push({ name: "Cuisinière", description: "Propre, désinfecté et fonctionnel. Aucune nourriture à l'intérieur. Le congélateur est décongelé (pas de bloc de glace)" })
    }

    if (fiche.cuisine_1_equipements_cafetiere === true || fiche.cuisine_1_equipements_machine_cafe === true) {
        cuisineTasks.push({ name: "Cafetière", description: "Propre, désinfectée et fonctionnelle. Aucune capsule ou café à l'intérieur. L'eau a été vidée. Elle ne présente pas de traces de calcaire" })
    }

    if (fiche.cuisine_1_equipements_bouilloire === true) {
        cuisineTasks.push({ name: "Bouilloire", description: "Intérieur propre et désinfecté. Bouilloire fonctionnelle. L'eau a été vidée. Elle ne présente pas de traces de calcaire" })
    }

    if (fiche.cuisine_1_equipements_lave_vaisselle === true) {
        cuisineTasks.push({ name: "Lave-vaisselle", description: "Intérieur propre et désinfecté. Lave-vaisselle fonctionnel. Aucune vaisselle n'a été laissée à l'intérieur. Le filtre a été nettoyé. L'intérieur ne présente pas de traces de calcaire" })
    }

    if (fiche.cuisine_1_equipements_grille_pain === true) {
        cuisineTasks.push({ name: "Grille pain", description: "Propre, désinfecté et fonctionnel. Sans taches et sans miettes " })
    }

    if (fiche.cuisine_1_equipements_blender === true) {
        cuisineTasks.push({ name: "Blender", description: "Propre, désinfecté et fonctionnel" })
    }

    if (fiche.cuisine_1_equipements_cuiseur_riz === true) {
        cuisineTasks.push({ name: "Cuiseur à riz", description: "Propre, désinfecté et fonctionnel" })
    }

    if (fiche.cuisine_1_equipements_machine_pain === true) {
        cuisineTasks.push({ name: "Machine à pain", description: "Propre, désinfectée et fonctionnelle" })
    }

    if (fiche.cuisine_1_equipements_lave_linge === true) {
        cuisineTasks.push({ name: "Lave linge", description: "Propre, désinfecté et fonctionnel. Aucune linge n'a été laissée à l'intérieur. Le filtre a été nettoyé. L'intérieur ne présente pas de traces de calcaire" })
    }

    if (fiche.cuisine_1_equipements_four === true) {
        cuisineTasks.push({ name: "Four", description: "Intérieur propre et désinfecté. Four fonctionnel. Aucune nourriture n'a été laissée à l'intérieur. L'intérieur ne présente pas de traces de brûlure. Les grilles et les plaques ont été nettoyées. Astuce : Pour un nettoyage plus facile, vous pouvez mettre du papier de cuisson propre sur les plaques afin que les voyageurs les utilisent et ne tachent pas les grilles et les plaques" })
    }

    if (fiche.cuisine_1_equipements_micro_ondes === true) {
        cuisineTasks.push({ name: "Micro-ondes", description: "Intérieur propre et désinfecté. Micro-ondes fonctionnel. Aucune nourriture n'a été laissée à l'intérieur" })
    }

    if (fiche.cuisine_1_equipements_autre === true && fiche.cuisine_1_equipements_autre_details) {
        cuisineTasks.push({
            name: fiche.cuisine_1_equipements_autre_details,
            description: "Intérieur propre et désinfecté. Appareil fonctionnel"
        })
    }

    checklists.push({
        name: "Cuisine",
        tasks: cuisineTasks,
        isRequired: true,
        beforePhotosRequired: true,
        afterPhotosRequired: true
    })

    // === CHAMBRES / ESPACE NUIT ===
    const isStudio = fiche.logement_type_propriete === "Studio"
    const nombreChambres = fiche.visite_nombre_chambres ? parseInt(fiche.visite_nombre_chambres) : 0

    if (isStudio) {
        // Studio → Espace nuit avec tasks adaptées
        checklists.push({
            name: "Espace nuit",
            tasks: [
                { name: "Vue d'ensemble (murs et sols)", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" },
                { name: "Couchage", description: "Propre et rangé" },
                { name: "Dessous du couchage", description: "Dépoussiérés et nettoyés. Sans éléments oubliés" }
            ],
            required: true,
            isRequired: true,
            beforePhotosRequired: true,
            afterPhotosRequired: true
        })
    } else {
        // Chambres classiques (1 à 6)
        for (let i = 1; i <= Math.min(nombreChambres, 6); i++) {
            const chambreTasks = [
                { name: "Vue d'ensemble (murs et sols)", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" },
                { name: "Lits", description: "Faits avec serviettes roulées sur les lits (1 grande et 1 petite par personne)" },
                { name: "Dessous de lits", description: "Dépoussiérés et nettoyés. Sans éléments oubliés" }
            ]

            // Task conditionnelle : Placards/commodes
            if (fiche[`chambres_chambre_${i}_equipements_espace_rangement`] === true) {
                chambreTasks.push({ name: "Intérieur des placards et commodes", description: "Rangé et propre. Sans éléments oubliés" })
            }

            // Task standard : Tables de chevet
            chambreTasks.push({ name: "Tiroirs des tables de chevet ouvert", description: "Rangé et propre. Sans éléments oubliés" })

            // Task conditionnelle : Climatisation
            if (fiche[`chambres_chambre_${i}_equipements_climatisation`] === true) {
                chambreTasks.push({ name: "Climatisation", description: "Réglage à 18° à partir du 1er Novembre et éteint à partir du 1er Avril. Etat fonctionnel" })
            }

            // Task conditionnelle : Chauffage
            if (fiche[`chambres_chambre_${i}_equipements_chauffage`] === true) {
                chambreTasks.push({ name: "Chauffage", description: "Propres et dépoussiérés. Etat fonctionnel" })
            }

            checklists.push({
                name: `Chambre ${i}`,
                tasks: chambreTasks,
                required: true,
                isRequired: true,
                beforePhotosRequired: true,
                afterPhotosRequired: true
            })
        }
    }

    // === SALLES DE BAIN ===
    const nombreSDB = fiche.visite_nombre_salles_bains ? parseInt(fiche.visite_nombre_salles_bains) : 1

    for (let i = 1; i <= Math.min(nombreSDB, 6); i++) {
        const sdbTasks = [
            { name: "Vue d'ensemble (murs et sols)", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" }
        ]

        // Tasks conditionnelles : Douche / Baignoire / Combo
        const hasDouche = fiche[`salle_de_bains_salle_de_bain_${i}_equipements_douche`] === true
        const hasBaignoire = fiche[`salle_de_bains_salle_de_bain_${i}_equipements_baignoire`] === true
        const hasCombo = fiche[`salle_de_bains_salle_de_bain_${i}_equipements_douche_baignoire_com`] === true

        if (hasCombo) {
            sdbTasks.push({ name: "Douche-baignoire", description: "Propre et sans traces de calcaire. Avec bonde ouverte et nettoyée. Évacuation et eau chaude fonctionnelle" })
        } else {
            if (hasDouche) {
                sdbTasks.push({ name: "Douche", description: "Propre et sans traces de calcaire. Avec bonde ouverte et nettoyée. Évacuation et eau chaude fonctionnelle" })
            }
            if (hasBaignoire) {
                sdbTasks.push({ name: "Baignoire", description: "Propre et sans traces de calcaire. Avec bonde ouverte et nettoyée. Évacuation et eau chaude fonctionnelle" })
            }
        }

        // Joints et parois (conditionnels selon douche)
        if (hasDouche || hasCombo) {
            sdbTasks.push({ name: "Joints et baguettes des portes de douche", description: "Propre et sans traces ou décoloration" })
            sdbTasks.push({ name: "Parois ou rideau de douche", description: "Propres et essuyés. Sans traces de calcaire ou de décoloration" })
        }

        // Rideau baignoire (conditionnel)
        if (hasBaignoire && !hasCombo) {
            sdbTasks.push({ name: "Rideau de baignoire (si présent)", description: "Propres et essuyés. Sans traces de calcaire ou de décoloration" })
        }

        // Tasks standard
        sdbTasks.push({ name: "Lavabo", description: "Propre et sans traces de calcaire. Avec bonde ouverte et nettoyée. Évacuation fonctionnelle et eau chaude fonctionnelle" })
        sdbTasks.push({ name: "Intérieurs des tiroirs/placards", description: "Rangé, sans éléments oubliés et vue sèche-cheveux accessible" })
        sdbTasks.push({ name: "Tapis de bain", description: "Propre et placé : roulé sur le lavabo ou plié sur sèche serviette ou plié sur rebord de baignoire" })
        sdbTasks.push({ name: "Intérieur poubelle avec sac poubelle", description: "Vidée et remplacée. Propre et désinfectée" })

        // Task conditionnelle : Sèche-serviettes
        if (fiche[`salle_de_bains_salle_de_bain_${i}_equipements_seche_serviette`] === true) {
            sdbTasks.push({ name: "Sèche serviettes", description: "Propre, dépoussiéré et fonctionnel. Laissé éteint" })
        }

        // Task conditionnelle : Bidet
        if (fiche[`salle_de_bains_salle_de_bain_${i}_equipements_bidet`] === true) {
            sdbTasks.push({ name: "Bidet", description: "Propre et sans traces de calcaire. Avec bonde ouverte et nettoyée. Évacuation fonctionnelle et eau chaude fonctionnelle" })
        }

        // Task conditionnelle : Chauffage
        if (fiche[`salle_de_bains_salle_de_bain_${i}_equipements_chauffage`] === true) {
            sdbTasks.push({ name: "Chauffage", description: "Réglage à 18° à partir du 1er Novembre et éteint à partir du 1er Avril. Etat fonctionnel" })
        }

        // Task conditionnelle : Autre équipement
        if (fiche[`salle_de_bains_salle_de_bain_${i}_equipements_autre`] === true && fiche[`salle_de_bains_salle_de_bain_${i}_equipements_autre_details`]) {
            sdbTasks.push({
                name: fiche[`salle_de_bains_salle_de_bain_${i}_equipements_autre_details`],
                description: "Propre, désinfecté et fonctionnel"
            })
        }

        // Consommables en dernier
        sdbTasks.push({ name: "Consommables : 1 savon pour les mains", description: "Disponible, en bon état et en quantité suffisante" })

        checklists.push({
            name: `Salle de bain ${i}`,
            tasks: sdbTasks,
            required: true,
            isRequired: true,
            beforePhotosRequired: true,
            afterPhotosRequired: true
        })
    }

    // WC
    checklists.push({
        name: "WC",
        tasks: [
            { name: "Vue d'ensemble des WC (murs et sols)", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" },
            { name: "Abattant", description: "Propre et désinfecté" },
            { name: "Lunette de WC", description: "Propre et désinfectée" },
            { name: "Cuvette de WC", description: "Propre et désinfectée. Sans trace de calcaire" },
            { name: "Base de WC (arrondi en bas)", description: "Propre et désinfectée" },
            { name: "Brosse de WC", description: "Propre et désinfectée" },
            { name: "Poubelle de WC", description: "Vider et mettre sac neuf. Intérieur poubelle avec sac poubelle" },
            { name: "Consommables", description: "2 rouleaux papier toilette. Disponible, en bon état et en quantité suffisante" }
        ],
        isRequired: true,
        beforePhotosRequired: true,
        afterPhotosRequired: true
    })


    // === SECTIONS CONDITIONNELLES ===


    // === BUANDERIE (conditionnelle globale) ===
    if (fiche.visite_pieces_buanderie === true) {
        const buanderieTasks = [
            { name: "Vue d'ensemble de la pièce", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" }
        ]

        // Task conditionnelle : Machine à laver
        if (fiche.equipements_lave_linge === true) {
            buanderieTasks.push({ name: "Machine à laver", description: "Propre et fonctionnelle. Sans linge à l'intérieur" })
        }

        // Task conditionnelle : Sèche-linge
        if (fiche.equipements_seche_linge === true) {
            buanderieTasks.push({ name: "Sèche linge", description: "Propre et fonctionnel. Sans linge à l'intérieur" })
        }

        // Task conditionnelle : Lit bébé (avec type dynamique)
        if ((fiche.bebe_equipements || []).includes('Lit bébé')) {
            const typeLit = fiche.bebe_lit_bebe_type || "Lit bébé"
            buanderieTasks.push({
                name: "Lit bébé",
                description: `${typeLit} propre et rangé. Sans linge à l'intérieur`
            })
        }

        // Task conditionnelle : Étendoir
        if (fiche.equipements_etendoir === true) {
            buanderieTasks.push({ name: "Etendoir à linge", description: "Propre et rangé. Sans linge étendu" })
        }

        // Task standard : Espace de stockage (toujours présent)
        buanderieTasks.push({ name: "Espace de stockage (linge et consommables)", description: "Linge et consommables ordonnés" })

        checklists.push({
            name: "Buanderie / Stockage",
            tasks: buanderieTasks,
            isRequired: true,
            beforePhotosRequired: true,
            afterPhotosRequired: true
        })
    }

    // === AUTRES PIÈCES OU MATÉRIEL (conditionnelles individuelles) ===
    const autresPiecesTasks = []

    // Salle de cinéma
    if (fiche.equip_spe_ext_dispose_salle_cinema === true) {
        autresPiecesTasks.push({
            name: "Vue d'ensemble de la salle de cinéma",
            description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, matériel rangé et fonctionnel. Matériel au complet"
        })
    }

    // Salle de sport
    if (fiche.equip_spe_ext_dispose_salle_sport === true) {
        autresPiecesTasks.push({
            name: "Vue d'ensemble de la salle de sport",
            description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, matériel rangé et fonctionnel. Matériel au complet"
        })
    }

    // Salle de jeux (si cochée, on ajoute les équipements)
    if (fiche.equip_spe_ext_dispose_salle_jeux === true) {
        const equipementsSalleJeux = fiche.equip_spe_ext_salle_jeux_equipements || []

        if (equipementsSalleJeux.includes('Billard')) {
            autresPiecesTasks.push({
                name: "Vue d'ensemble du billard",
                description: "Surfaces dépoussiérées et propres, matériel rangé et fonctionnel. Matériel au complet et tapis de table non abîmé"
            })
        }

        if (equipementsSalleJeux.includes('Baby Foot')) {
            autresPiecesTasks.push({
                name: "Vue d'ensemble du baby-foot",
                description: "Surfaces dépoussiérées et propres, matériel rangé et fonctionnel. Matériel au complet, avec balle et joueurs"
            })
        }

        if (equipementsSalleJeux.includes('Ping Pong')) {
            autresPiecesTasks.push({
                name: "Vue d'ensemble de la table de ping-pong avec raquettes et balles",
                description: "Surfaces dépoussiérées et propres, matériel rangé et fonctionnel. Matériel au complet, avec balle et raquettes"
            })
        }
    }

    // Jacuzzi intérieur
    if (fiche.equip_spe_ext_dispose_jacuzzi === true) {
        autresPiecesTasks.push({
            name: "Vue d'ensemble du jacuzzi (intérieur)",
            description: "Intérieur propre (parois et rebords), eau avec PH adapté, pastilles/produits ajoutés (ou changement d'eau effectué). Jacuzzi fonctionnel. Matériel au complet"
        })
    }

    // Sauna
    if (fiche.equip_spe_ext_dispose_sauna === true) {
        autresPiecesTasks.push({
            name: "Vue d'ensemble du sauna",
            description: "Sol aspiré et nettoyé, surfaces désinfectées et propres, matériel fonctionnel. Matériel au complet"
        })
    }

    // Hammam
    if (fiche.equip_spe_ext_dispose_hammam === true) {
        autresPiecesTasks.push({
            name: "Vue d'ensemble du hammam",
            description: "Sol aspiré et nettoyé, surfaces désinfectées et propres, matériel fonctionnel. Matériel au complet"
        })
    }

    // Autre pièce (champ libre)
    if (fiche.visite_pieces_autre === true && fiche.visite_pieces_autre_details) {
        autresPiecesTasks.push({
            name: `Vue d'ensemble de ${fiche.visite_pieces_autre_details}`,
            description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, matériel rangé et fonctionnel. Matériel au complet"
        })
    }

    // Ajouter la checklist si au moins une task existe
    if (autresPiecesTasks.length > 0) {
        checklists.push({
            name: "Autres pièces ou matériel",
            tasks: autresPiecesTasks,
            isRequired: true,
            beforePhotosRequired: true,
            afterPhotosRequired: true
        })
    }

    // === EXTÉRIEURS (si applicable) ===
    if (fiche.equip_spe_ext_dispose_exterieur === true) {
        const exterieurTasks = [
            { name: "Vue d'ensemble de l'extérieur", description: "Ensemble propre, rangé, pas d'élément laissé au sol" }
        ]

        const typeEspaces = fiche.equip_spe_ext_exterieur_type_espace || []
        const equipementsExt = fiche.equip_spe_ext_exterieur_equipements || []

        // Types d'espaces (breakdown en 4 tasks)
        if (typeEspaces.includes('Balcon')) {
            exterieurTasks.push({ name: "Balcon", description: "Sol balayé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" })
        }

        if (typeEspaces.includes('Terrasse')) {
            exterieurTasks.push({ name: "Terrasse", description: "Sol balayé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" })
        }

        if (typeEspaces.includes('Jardin')) {
            exterieurTasks.push({ name: "Jardin", description: "Sol balayé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" })
        }

        if (typeEspaces.includes('Patio')) {
            exterieurTasks.push({ name: "Patio", description: "Sol balayé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" })
        }

        // Équipements conditionnels
        if (equipementsExt.includes('Barbecue')) {
            exterieurTasks.push({ name: "Barbecue", description: "Nettoyé et prêt à l'usage" })
        }

        if (equipementsExt.includes('Plancha')) {
            exterieurTasks.push({ name: "Plancha", description: "Nettoyé et prêt à l'usage" })
        }

        if (equipementsExt.includes('Brasero')) {
            exterieurTasks.push({ name: "Brasero", description: "Nettoyé et prêt à l'usage" })
        }

        // Cendrier (toujours affiché si extérieur présent)
        exterieurTasks.push({ name: "Cendrier", description: "Vidé et propre" })

        // Table extérieure
        if (equipementsExt.includes('Table extérieure')) {
            exterieurTasks.push({ name: "Table et chaises d'extérieur", description: "Nettoyées, rangées et alignées" })
        }

        // Jeux pour enfants
        if (equipementsExt.includes('Jeux pour enfants')) {
            exterieurTasks.push({ name: "Jeux pour enfants", description: "Nettoyé et rangé" })
        }

        // Produits pour la plage
        if (equipementsExt.includes('Produits pour la plage')) {
            exterieurTasks.push({ name: "Produits pour la plage", description: "Nettoyé et rangé" })
        }

        // Autre équipement (champ libre)
        if (equipementsExt.includes('Autre') && fiche.equip_spe_ext_exterieur_equipements_autre_details) {
            exterieurTasks.push({
                name: fiche.equip_spe_ext_exterieur_equipements_autre_details,
                description: "Nettoyé et rangé"
            })
        }

        checklists.push({
            name: "Extérieurs",
            tasks: exterieurTasks,
            isRequired: true,
            beforePhotosRequired: true,
            afterPhotosRequired: true
        })
    }

    // Piscine (si disponible ET privée uniquement)
    if (fiche.equip_spe_ext_dispose_piscine === true && fiche.equip_spe_ext_piscine_type === 'Privée') {
        checklists.push({
            name: "Piscine",
            tasks: [
                { name: "Vue d'ensemble de la piscine", description: "Intérieur propre (parois et rebords), eau claire (non trouble ou verte) avec PH adapté, pastilles/produits ajoutés (ou changement d'eau effectué). Pas de feuilles ou débris à la surface. Piscine fonctionnelle. Matériel au complet" }
            ],
            isRequired: true,
            beforePhotosRequired: true,
            afterPhotosRequired: true
        })
    }

    return { checklists }
}

// ============================================
// SECTION 3: APPELS API
// ============================================

/**
 * Crée une property dans Loomky
 * 
 * @param {Object} payload - Payload property
 * @param {string} token - Token d'authentification (OBLIGATOIRE)
 * @returns {Promise<Object>} - { success, propertyId, data, error }
 */
export async function createProperty(payload, token) {
    if (!token) {
        return { success: false, error: 'Token d\'authentification requis' }
    }

    try {
        const response = await fetch(`${BASE_URL}/v1/properties`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })

        const text = await response.text()
        let data = {}

        try {
            data = text ? JSON.parse(text) : {}
        } catch (e) {
            return {
                success: false,
                error: `Erreur parsing réponse: ${text.substring(0, 100)}`
            }
        }

        if (!response.ok) {
            const errorMsg = data?.message || response.statusText || 'Erreur inconnue'
            return {
                success: false,
                error: `Erreur ${response.status}: ${errorMsg}`
            }
        }

        // Extraction propertyId (peut être dans property._id ou directement _id)
        const propertyId = data.property?._id || data._id

        if (!propertyId) {
            return {
                success: false,
                error: 'PropertyId non trouvé dans la réponse'
            }
        }

        return {
            success: true,
            propertyId,
            data
        }

    } catch (error) {
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Crée les checklists de ménage pour une property
 * 
 * @param {string} propertyId - ID de la property Loomky
 * @param {Object} checklists - Payload checklists (résultat de buildResolvedChecklists)
 * @param {string} token - Token d'authentification (OBLIGATOIRE)
 * @returns {Promise<Object>} - { success, checklistIds, data, error }
 */
export async function createChecklists(propertyId, checklists, token) {
    if (!token) {
        return { success: false, error: 'Token d\'authentification requis' }
    }

    if (!propertyId) {
        return { success: false, error: 'PropertyId requis' }
    }

    try {
        const response = await fetch(`${BASE_URL}/v1/properties/${propertyId}/cleaning-checklists`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(checklists)
        })

        // ⚠️ API retourne 204 No Content (pas de body)
        if (response.status === 204) {
            console.log('⚠️ API retourne 204, fallback GET pour récupérer IDs')

            const getResult = await getProperty(propertyId, token)
            console.log('🔍 GET Result:', getResult)

            if (getResult.success && getResult.data?.property?.cleaningChecklists) {
                const checklists = getResult.data.property.cleaningChecklists
                return {
                    success: true,
                    checklistIds: checklists.map(c => ({ name: c.name, id: c._id })),
                    data: getResult.data
                }
            }

            console.log('❌ GET fallback échoué ou pas de checklists')
            return {
                success: true,
                checklistIds: null,
                warning: 'Checklists créées mais IDs non récupérés'
            }
        }

        if (!response.ok) {
            const text = await response.text()
            let errorData = {}
            try {
                errorData = text ? JSON.parse(text) : {}
            } catch (e) {
                return { success: false, error: `Erreur ${response.status}: ${text.substring(0, 100)}` }
            }

            const errorMsg = errorData?.message || response.statusText || 'Erreur inconnue'
            return { success: false, error: `Erreur ${response.status}: ${errorMsg}` }
        }

        // Si 200 avec body (cas idéal)
        const text = await response.text()
        const data = text ? JSON.parse(text) : {}

        return {
            success: true,
            checklistIds: data.checklists?.map(c => ({ name: c.name, id: c._id })) || null,
            data
        }

    } catch (error) {
        return { success: false, error: error.message }
    }
}

/**
 * Met à jour une property dans Loomky
 * 
 * @param {string} propertyId - ID de la property
 * @param {Object} payload - Payload property à mettre à jour
 * @param {string} token - Token d'authentification (OBLIGATOIRE)
 * @returns {Promise<Object>} - { success, data, error }
 */
export async function updateProperty(propertyId, payload, token) {
    if (!token) {
        return { success: false, error: 'Token d\'authentification requis' }
    }

    if (!propertyId) {
        return { success: false, error: 'PropertyId requis' }
    }

    try {
        console.log('🔄 UPDATE Property - ID:', propertyId)

        const response = await fetch(`${BASE_URL}/v1/properties/${propertyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })

        console.log('🔄 PUT response status:', response.status)

        // ⚠️ Si 204 No Content, pas de body à parser
        if (response.status === 204) {
            console.log('✅ UPDATE Property réussi (204 No Content)')
            return {
                success: true,
                data: { _id: propertyId }
            }
        }

        if (!response.ok) {
            const text = await response.text()
            let errorData = {}
            try {
                errorData = text ? JSON.parse(text) : {}
            } catch (e) {
                return { success: false, error: `Erreur ${response.status}: ${text.substring(0, 100)}` }
            }

            const errorMsg = errorData?.message || response.statusText || 'Erreur inconnue'
            return { success: false, error: `Erreur ${response.status}: ${errorMsg}` }
        }

        // Si 200 avec body
        const data = await response.json()
        console.log('✅ UPDATE Property réussi')

        return { success: true, data }

    } catch (error) {
        console.error('❌ UPDATE Property error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Récupère une property avec ses checklists (fallback pour 204)
 * 
 * @param {string} propertyId - ID de la property
 * @param {string} token - Token d'authentification (OBLIGATOIRE)
 * @returns {Promise<Object>} - { success, property, error }
 */
export async function getProperty(propertyId, token) {

    if (!token) return { success: false, error: 'Token requis' }
    if (!propertyId) return { success: false, error: 'PropertyId requis' }

    try {
        const response = await fetch(`${BASE_URL}/v1/properties/${propertyId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })

        if (!response.ok) {
            return { success: false, error: `Erreur ${response.status}` }
        }

        const data = await response.json()

        return { success: true, data }

    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ============================================
// SECTION 4: ORCHESTRATEUR PRINCIPAL
// ============================================

/**
 * Orchestrateur principal pour synchroniser une fiche vers Loomky
 * Gère la création OU la mise à jour selon l'état existant
 * 
 * @param {Object} fiche - Fiche complète depuis Supabase
 * @param {string} token - Token d'authentification (OBLIGATOIRE)
 * @param {string} mode - 'create' | 'update' (auto-détecté si non fourni)
 * @returns {Promise<Object>} - Résultat détaillé de la sync
 */
export async function syncToLoomky(fiche, token, mode = null) {
    if (!token) {
        return {
            success: false,
            errors: ['Token d\'authentification requis']
        }
    }

    // Auto-détection du mode si non fourni
    const syncMode = mode || (fiche.loomky_property_id ? 'update' : 'create')

    const result = {
        success: false,
        mode: syncMode,
        propertyId: null,
        checklistIds: null,
        snapshot: null,
        errors: []
    }

    try {
        // 1️⃣ PROPERTY : CREATE OU UPDATE
        const propertyPayload = buildPropertyPayload(fiche)
        let propertyResult

        if (syncMode === 'create') {
            console.log('🆕 MODE CREATE - Création property')
            propertyResult = await createProperty(propertyPayload, token)

            if (!propertyResult.success) {
                result.errors.push(propertyResult.error)
                return result
            }

            result.propertyId = propertyResult.propertyId
        } else {
            // MODE UPDATE
            console.log('🔄 MODE UPDATE - Mise à jour property:', fiche.loomky_property_id)
            propertyResult = await updateProperty(fiche.loomky_property_id, propertyPayload, token)

            if (!propertyResult.success) {
                result.errors.push(propertyResult.error)
                return result
            }

            result.propertyId = fiche.loomky_property_id
        }

        result.success = true

        // 2️⃣ Créer les checklists
        // PATCH uniquement si changées (en mode UPDATE)
        const shouldUpdateChecklists = syncMode === 'create' || hasChecklistsChanges(fiche)

        if (shouldUpdateChecklists) {
            console.log(`📋 Checklists ${syncMode === 'create' ? 'à créer' : 'modifiées, mise à jour'}`)

            const checklistsPayload = buildResolvedChecklists(fiche)
            const checklistsResult = await createChecklists(result.propertyId, checklistsPayload, token)

            if (!checklistsResult.success) {
                result.errors.push(checklistsResult.error)
                result.warning = 'Property mise à jour mais checklists échouées'
            } else {
                result.checklistIds = checklistsResult.checklistIds
            }
        } else {
            console.log('📋 Checklists inchangées, PATCH skippé')
            // Garder les IDs existants
            result.checklistIds = fiche.loomky_checklist_ids || null
        }

        // 3️⃣ Créer le snapshot
        result.snapshot = extractLoomkyFields(fiche)

        return result

    } catch (error) {
        result.errors.push(error.message)
        return result
    }
}

// ============================================
// UTILITAIRES
// ============================================
/**
 * Mappe le type de propriété Fiche Logement → Loomky
 */
function mapPropertyType(typePropriete) {
    switch (typePropriete) {
        case 'Appartement':
        case 'Studio':
        case 'Loft':
        case 'Duplex':
            return 'apartment'
        case 'Maison':
        case 'Villa':
            return 'house'
        case 'Autre':
        default:
            return 'other'
    }
}

/**
 * Calcule le nombre de lits simples et doubles
 * Logique EXACTE validée avec Loomky dans SimulationLoomky
 * 
 * ⚠️ Ne pas modifier sans synchroniser avec l'API Loomky
 */
function calculateBedCounts(fiche) {
    let simpleBedCount = 0
    let doubleBedCount = 0

    // Parcourir les 6 chambres possibles
    for (let i = 1; i <= 6; i++) {
        // Lits simples
        simpleBedCount += (fiche[`chambres_chambre_${i}_lit_simple_90_190`] || 0)
        simpleBedCount += (fiche[`chambres_chambre_${i}_canape_lit_simple`] || 0)
        simpleBedCount += (fiche[`chambres_chambre_${i}_lits_superposes_90_190`] || 0) * 2 // 2 couchages par superposé
        simpleBedCount += (fiche[`chambres_chambre_${i}_lit_gigogne`] || 0)

        // Lits doubles
        doubleBedCount += (fiche[`chambres_chambre_${i}_lit_double_140_190`] || 0)
        doubleBedCount += (fiche[`chambres_chambre_${i}_lit_queen_160_200`] || 0)
        doubleBedCount += (fiche[`chambres_chambre_${i}_lit_king_180_200`] || 0)
        doubleBedCount += (fiche[`chambres_chambre_${i}_canape_lit_double`] || 0)
    }

    // Fallback: si aucun lit déclaré, mettre 1 lit simple par défaut
    if (simpleBedCount === 0 && doubleBedCount === 0) {
        simpleBedCount = 1
    }

    return {
        simpleBedCount,
        doubleBedCount
    }
}