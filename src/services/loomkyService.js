// ============================================
// LOOMKY SERVICE
// Service centralisé pour l'intégration Loomky
// ============================================
import { supabase } from '../lib/supabaseClient'

/**
 * Configuration Loomky
 */
const LOOMKY_CONFIG = {
    DEV: {
        BASE_URL: 'https://dev.loomky.com'
        // ⚠️ Pas de TOKEN ici - toujours injecté par l'appelant
    },
    PROD: {
        BASE_URL: 'https://api.loomky.com'
        // ⚠️ Pas de TOKEN ici - toujours injecté par l'appelant
    }
}

// Utiliser DEV pour l'instant
const CURRENT_ENV = 'DEV' // TODO PROD: basculer en PROD une fois credentials prêts
const BASE_URL = LOOMKY_CONFIG[CURRENT_ENV].BASE_URL

// ⚠️ IMPORTANT: Le token n'est JAMAIS hardcodé
// Il doit être injecté par l'appelant (FicheFinalisation, SimulationLoomky, etc.)
// Pas de valeur par défaut = sécurité + testabilité

/**
 * Normalise un numéro de téléphone vers le format E.164 strict attendu par l'API Loomky.
 *
 * L'API Loomky rejette tout numéro qui n'est pas en E.164 (`+<indicatif><digits>` sans
 * séparateurs) avec une erreur 400 "Invalid phone number format". On normalise donc
 * juste avant l'envoi — la fiche et la DB gardent la saisie utilisateur brute (lisible).
 *
 * Hypothèse métier :
 *  - `+...` (international) → respecté, juste cleané des séparateurs
 *  - `00...` (vieux format intl, sémantiquement équivalent à `+`) → les deux `0` initiaux
 *    sont remplacés par `+` (ex: `0033699999988` → `+33699999988`)
 *  - `0...` → assumé français, le `0` initial est remplacé par `+33`
 *  - Tout le reste retourne `''` pour laisser le fallback `+33700000000` côté appelant
 *    prendre le relais (filet de sécurité — l'API exige un téléphone non vide).
 *
 * Validation longueur : si le numéro normalisé fait moins de 11 caractères (`+` + indicatif +
 * chiffres), on retourne `''`. Filet de sécurité ultime côté envoi API ; la vraie validation
 * à la saisie (avec message d'alerte au coordinateur) viendra dans une PR séparée.
 *
 * Cas non couverts par design (à signaler si rencontrés en prod) :
 *  - Numéros sans préfixe `0` ni `+` ni `00` (ex: `33699999999` brut) → retournent `''`
 *    (fallback). Signe d'une saisie incomplète côté coordinateur.
 *
 * @param {string|null|undefined} phone - Saisie utilisateur brute
 * @returns {string} - Numéro E.164 (`+...`) ou `''` si non normalisable / trop court
 */
export function normalizePhoneForLoomky(phone) {
    if (!phone || typeof phone !== 'string') return ''
    const trimmed = phone.trim()
    if (!trimmed) return ''

    // On garde la trace d'un `+` initial avant de strip les séparateurs,
    // pour distinguer "+33..." (international) de "0033..." (qui serait perdu sinon).
    const hasPlus = trimmed.startsWith('+')
    const digitsOnly = trimmed.replace(/\D/g, '')

    if (!digitsOnly) return '' // garbage type "abc" ou "+++" → fallback sécurité

    let normalized = ''
    if (hasPlus) {
        // Déjà international, on respecte tel quel après cleanup des séparateurs
        normalized = `+${digitsOnly}`
    } else if (digitsOnly.startsWith('00')) {
        // Vieux format intl (`00<indicatif><digits>`) équivalent à `+`.
        // ⚠️ Branche `00` testée AVANT `0` sinon `0033...` serait intercepté et deviendrait `+33033...`
        normalized = `+${digitsOnly.slice(2)}`
    } else if (digitsOnly.startsWith('0')) {
        // Assumé français : remplace le 0 initial par +33
        normalized = `+33${digitsOnly.slice(1)}`
    } else {
        // Ni `+` ni `0` ni `00` au début → format non reconnu, on laisse le fallback gérer
        return ''
    }

    // Validation longueur minimale : un E.164 valide fait au moins 11 caractères
    // (préfixe pays + chiffres). Filtre les saisies tronquées type `+33699` ou `06 99`.
    if (normalized.length < 11) return ''

    return normalized
}

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

        // `|| null` (pas `|| ''`) pour cohérence avec le mapping DB (cf. supabaseHelpers.js).
        // Une saisie vide retombe sur le fallback hardcodé dans createPropertyOwnerOnLoomky.
        proprietaire_telephone: formData.section_proprietaire?.telephone || null,
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
        logement_appartement_etage: formData.section_logement?.appartement?.etage || '',

        // Clefs / Accès
        clefs_digicode_details: formData.section_clefs?.digicodeDetails || '',
        clefs_emplacement_boite: formData.section_clefs?.emplacementBoite || '',

        // Visite (pour numberOfRooms et numberOfBathrooms)
        visite_nombre_chambres: formData.section_visite?.nombre_chambres || formData.section_logement?.caracteristiques?.nombreChambres || '',
        visite_nombre_salles_bains: formData.section_visite?.nombre_salles_bains || '',

        // Visite — pièces conditionnelles (clés d'activation des blocs Buanderie / Stockage et Autres pièces ou matériel dans buildResolvedChecklists)
        visite_pieces_buanderie: formData.section_visite?.pieces_buanderie ?? null,
        visite_pieces_autre: formData.section_visite?.pieces_autre ?? null,
        // `_details` aligné sur le pattern `|| ''` des autres champs texte "autre" dans normalizeFormDataToFiche (cuisine, consommables).
        visite_pieces_autre_details: formData.section_visite?.pieces_autre_details || '',

        // Équipements - WiFi
        equipements_wifi_statut: formData.section_equipements?.wifi_statut || '',
        equipements_wifi_nom_reseau: formData.section_equipements?.wifi_nom_reseau || '',
        equipements_wifi_mot_de_passe: formData.section_equipements?.wifi_mot_de_passe || '',
        equipements_wifi_details: formData.section_equipements?.wifi_details || '',

        // Équipements - parking
        equipements_parking_type: formData.section_equipements?.parking_type || '',
        equipements_parking_rue_details: formData.section_equipements?.parking_rue_details || '',
        equipements_parking_sur_place_details: formData.section_equipements?.parking_sur_place_details || '',
        equipements_parking_payant_details: formData.section_equipements?.parking_payant_details || '',

        // Équipements - buanderie (pilote les tasks conditionnelles de la checklist Buanderie / Stockage dans buildResolvedChecklists).
        // Décision métier : source unique = section Équipements globale du logement, conditionnel simple (case cochée = tâche affichée).
        // Aucune déduction inter-sections — un lave-linge déjà coché en cuisine ou SDB n'affecte PAS l'affichage en buanderie.
        // Le réagencement de la saisie du linge dans la fiche fera l'objet d'une discussion séparée (hors scope).
        equipements_lave_linge: formData.section_equipements?.lave_linge ?? null,
        equipements_seche_linge: formData.section_equipements?.seche_linge ?? null,
        equipements_etendoir: formData.section_equipements?.etendoir ?? null,

        // Consommables — pilote les tasks "produits ménagers obligatoires" et "sur demande" dans buildResolvedChecklists
        consommables_fournis_par_prestataire: formData.section_consommables?.fournis_par_prestataire ?? null,
        consommables_gel_douche: formData.section_consommables?.gel_douche ?? null,
        consommables_shampoing: formData.section_consommables?.shampoing ?? null,
        consommables_apres_shampoing: formData.section_consommables?.apres_shampoing ?? null,
        consommables_pastilles_lave_vaisselle: formData.section_consommables?.pastilles_lave_vaisselle ?? null,
        consommables_autre_consommable: formData.section_consommables?.autre_consommable ?? null,
        consommables_autre_consommable_details: formData.section_consommables?.autre_consommable_details || '',

        // Consommables café — pilote la task "Consommables café: ..." dans la checklist Cuisine (indépendant du toggle prestataire)
        consommables_cafe_nespresso: formData.section_consommables?.cafe_nespresso ?? null,
        consommables_cafe_senseo: formData.section_consommables?.cafe_senseo ?? null,
        consommables_cafe_tassimo: formData.section_consommables?.cafe_tassimo ?? null,
        consommables_cafe_soluble: formData.section_consommables?.cafe_soluble ?? null,
        consommables_cafe_moulu: formData.section_consommables?.cafe_moulu ?? null,
        consommables_cafe_grain: formData.section_consommables?.cafe_grain ?? null,
        consommables_cafe_autre: formData.section_consommables?.cafe_autre ?? null,
        consommables_cafe_autre_details: formData.section_consommables?.cafe_autre_details || '',

        // Salon / Salle à manger — équipements (pilote les tasks conditionnelles dans LES DEUX checklists Salon et Salle à manger de buildResolvedChecklists).
        // Source unique `section_salon_sam` (page unique côté Fiche Logement), consommée par deux checklists distinctes côté Loomky.
        // Climatisation et Chauffage sont volontairement présents dans Salon ET SAM : une seule case source pilote l'affichage dans les deux pièces côté ménage.
        // Liste limitée aux 9 clés réellement consommées par buildResolvedChecklists — les autres champs `salon_sam_*` mappés en DB (cheminee, jeux_societe, livres_*, stores_*, volets, autre) ne pilotent aucune task et restent hors scope ici.
        salon_sam_equipements_table_basse: formData.section_salon_sam?.equipements_table_basse ?? null,
        salon_sam_equipements_canape: formData.section_salon_sam?.equipements_canape ?? null,
        salon_sam_equipements_fauteuils: formData.section_salon_sam?.equipements_fauteuils ?? null,
        salon_sam_equipements_climatisation: formData.section_salon_sam?.equipements_climatisation ?? null,
        salon_sam_equipements_chauffage: formData.section_salon_sam?.equipements_chauffage ?? null,
        salon_sam_equipements_television: formData.section_salon_sam?.equipements_television ?? null,
        salon_sam_equipements_canape_lit: formData.section_salon_sam?.equipements_canape_lit ?? null,
        salon_sam_equipements_table_manger: formData.section_salon_sam?.equipements_table_manger ?? null,
        salon_sam_equipements_chaises: formData.section_salon_sam?.equipements_chaises ?? null,

        // Cuisine 1 — équipements (pilote les tasks conditionnelles d'équipements dans la checklist Cuisine de buildResolvedChecklists)
        // Liste alignée sur les 18 colonnes DB cf. supabaseHelpers.js:801-818
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
        cuisine_1_equipements_hotte: formData.section_cuisine_1?.equipements_hotte ?? null,
        cuisine_1_equipements_blender: formData.section_cuisine_1?.equipements_blender ?? null,
        cuisine_1_equipements_cuiseur_riz: formData.section_cuisine_1?.equipements_cuiseur_riz ?? null,
        cuisine_1_equipements_machine_pain: formData.section_cuisine_1?.equipements_machine_pain ?? null,
        cuisine_1_equipements_lave_linge: formData.section_cuisine_1?.equipements_lave_linge ?? null,
        cuisine_1_equipements_autre: formData.section_cuisine_1?.equipements_autre ?? null,
        cuisine_1_equipements_autre_details: formData.section_cuisine_1?.equipements_autre_details || '',

        // Cuisine 1 — types de cafetière (enrichissent la task "Cafetière (...)" avec les types entre parenthèses)
        // Liste alignée sur les 8 colonnes DB cf. supabaseHelpers.js:868-875
        cuisine_1_cafetiere_type_filtre: formData.section_cuisine_1?.cafetiere_type_filtre ?? null,
        cuisine_1_cafetiere_type_expresso: formData.section_cuisine_1?.cafetiere_type_expresso ?? null,
        cuisine_1_cafetiere_type_piston: formData.section_cuisine_1?.cafetiere_type_piston ?? null,
        cuisine_1_cafetiere_type_keurig: formData.section_cuisine_1?.cafetiere_type_keurig ?? null,
        cuisine_1_cafetiere_type_nespresso: formData.section_cuisine_1?.cafetiere_type_nespresso ?? null,
        cuisine_1_cafetiere_type_manuelle: formData.section_cuisine_1?.cafetiere_type_manuelle ?? null,
        cuisine_1_cafetiere_type_bar_grain: formData.section_cuisine_1?.cafetiere_type_bar_grain ?? null,
        cuisine_1_cafetiere_type_bar_moulu: formData.section_cuisine_1?.cafetiere_type_bar_moulu ?? null,

        // Chambres (pour calculateBedCounts - 6 chambres possibles)
        ...generateChambresFlat(formData),

        // Salles de bain (équipements - 6 SDB possibles, pilote les tasks conditionnelles dans la boucle SDB de buildResolvedChecklists)
        ...generateSallesDeBainFlat(formData),

        // Équipements spécifiques / extérieurs — pilote les tasks conditionnelles des checklists "Autres pièces ou matériel", "Extérieurs" et "Piscine" dans buildResolvedChecklists.

        // --- Autres pièces ou matériel (7 clés) ---
        equip_spe_ext_dispose_salle_cinema: formData.section_equip_spe_exterieur?.dispose_salle_cinema ?? null,
        equip_spe_ext_dispose_salle_sport: formData.section_equip_spe_exterieur?.dispose_salle_sport ?? null,
        equip_spe_ext_dispose_salle_jeux: formData.section_equip_spe_exterieur?.dispose_salle_jeux ?? null,
        equip_spe_ext_dispose_jacuzzi: formData.section_equip_spe_exterieur?.dispose_jacuzzi ?? null,
        equip_spe_ext_dispose_sauna: formData.section_equip_spe_exterieur?.dispose_sauna ?? null,
        equip_spe_ext_dispose_hammam: formData.section_equip_spe_exterieur?.dispose_hammam ?? null,
        // Tableau de strings (`'Billard'`, `'Baby Foot'`, `'Ping Pong'`) — orthographe/casse alignée sur la source FicheEquipExterieur.jsx
        equip_spe_ext_salle_jeux_equipements: formData.section_equip_spe_exterieur?.salle_jeux_equipements || [],

        // --- Extérieurs (4 clés) ---
        equip_spe_ext_dispose_exterieur: formData.section_equip_spe_exterieur?.dispose_exterieur ?? null,
        // Tableau de strings (`'Balcon'`, `'Terrasse'`, `'Jardin'`, `'Patio'`) — `'Aucun'` saisissable mais sans task associée côté checklist. Casse alignée sur FicheEquipExterieur.jsx:468.
        equip_spe_ext_exterieur_type_espace: formData.section_equip_spe_exterieur?.exterieur_type_espace || [],
        // Tableau de strings — valeurs consommées par buildResolvedChecklists : `'Barbecue'`, `'Plancha'`, `'Brasero'`, `'Table extérieure'`, `'Jeux pour enfants'`, `'Produits pour la plage'`, `'Autre'`.
        // Note : la liste saisissable dans FicheEquipExterieur.jsx contient d'autres valeurs (Chaises, Parasol, Hamac, etc.) qui n'ont pas de task associée — voulu, on garde le comportement actuel.
        equip_spe_ext_exterieur_equipements: formData.section_equip_spe_exterieur?.exterieur_equipements || [],
        // `_autre_details` aligné sur le pattern `|| ''` des autres champs texte "autre" dans normalizeFormDataToFiche (cuisine, consommables, visite).
        equip_spe_ext_exterieur_equipements_autre_details: formData.section_equip_spe_exterieur?.exterieur_equipements_autre_details || '',

        // --- Piscine (2 clés) ---
        // Double condition côté buildResolvedChecklists : dispose_piscine === true ET piscine_type === 'Privée'.
        // Une piscine publique/partagée (copropriété, résidence) n'est pas nettoyée par la femme de ménage du logement — pas de task.
        equip_spe_ext_dispose_piscine: formData.section_equip_spe_exterieur?.dispose_piscine ?? null,
        // Radio à 2 valeurs côté saisie : `'Privée'` (P majuscule, accent é) ou `'Publique ou partagée'`. Casse strictement alignée sur FicheEquipExterieur.jsx:728 et sur le test `=== 'Privée'` du consommateur.
        equip_spe_ext_piscine_type: formData.section_equip_spe_exterieur?.piscine_type || '',

        // Loomky sync fields
        loomky_property_id: formData.loomky_property_id,
        loomky_checklist_ids: formData.loomky_checklist_ids,
        loomky_sync_status: formData.loomky_sync_status,
        loomky_synced_at: formData.loomky_synced_at,
        loomky_snapshot: formData.loomky_snapshot
    }
}

// Helper pour mapper les 6 chambres
// Couvre les 8 compteurs de lits (consommés par calculateBedCounts) + les 5 équipements
// conditionnels consommés par la boucle Chambres de buildResolvedChecklists.
// Pattern booléen `?? null` identique à generateSallesDeBainFlat pour préserver le tri-état.
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

        // Équipements conditionnels chambre (pilotent les tasks conditionnelles de la checklist Chambre dans buildResolvedChecklists).
        // Liste alignée sur les colonnes DB cf. supabaseHelpers.js (mapping section_chambres.chambre_X.equipements_*).
        chambresFlat[`chambres_chambre_${i}_equipements_espace_rangement`] = chambre.equipements_espace_rangement ?? null
        chambresFlat[`chambres_chambre_${i}_equipements_climatisation`] = chambre.equipements_climatisation ?? null
        chambresFlat[`chambres_chambre_${i}_equipements_chauffage`] = chambre.equipements_chauffage ?? null
        chambresFlat[`chambres_chambre_${i}_equipements_draps_fournis`] = chambre.equipements_draps_fournis ?? null
        chambresFlat[`chambres_chambre_${i}_equipements_oreillers_couvertures_sup`] = chambre.equipements_oreillers_couvertures_sup ?? null
    }

    return chambresFlat
}

/**
 * Helper pour aplatir les équipements des 6 SDB possibles.
 * section_salle_de_bains.salle_de_bain_${i}.equipements_* → salle_de_bains_salle_de_bain_${i}_equipements_*
 * Liste alignée sur les 12 colonnes DB par SDB cf. supabaseHelpers.js:682-693 (idem SDB 2-6 jusqu'à l. 793).
 * Note : la colonne DB `_douche_baignoire_com` est tronquée (limite de longueur) alors que le champ source
 * dans la fiche est `equipements_douche_baignoire_combinees` — mapping explicite ci-dessous, identique
 * à ce que fait mapFormDataToSupabase pour rester symétrique.
 */
export function generateSallesDeBainFlat(formData) {
    const sdbFlat = {}

    for (let i = 1; i <= 6; i++) {
        const sdb = formData.section_salle_de_bains?.[`salle_de_bain_${i}`] || {}
        const prefix = `salle_de_bains_salle_de_bain_${i}_equipements`

        sdbFlat[`${prefix}_douche`] = sdb.equipements_douche ?? null
        sdbFlat[`${prefix}_baignoire`] = sdb.equipements_baignoire ?? null
        sdbFlat[`${prefix}_douche_baignoire_com`] = sdb.equipements_douche_baignoire_combinees ?? null
        sdbFlat[`${prefix}_double_vasque`] = sdb.equipements_double_vasque ?? null
        sdbFlat[`${prefix}_wc`] = sdb.equipements_wc ?? null
        sdbFlat[`${prefix}_bidet`] = sdb.equipements_bidet ?? null
        sdbFlat[`${prefix}_chauffage`] = sdb.equipements_chauffage ?? null
        sdbFlat[`${prefix}_lave_linge`] = sdb.equipements_lave_linge ?? null
        sdbFlat[`${prefix}_seche_cheveux`] = sdb.equipements_seche_cheveux ?? null
        sdbFlat[`${prefix}_seche_serviette`] = sdb.equipements_seche_serviette ?? null
        sdbFlat[`${prefix}_autre`] = sdb.equipements_autre ?? null
        sdbFlat[`${prefix}_autre_details`] = sdb.equipements_autre_details || ''
    }

    return sdbFlat
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
        type: "apartment", // TODO PROD: mapPropertyType(fiche.logement_type_propriete),
        address: {
            street: fiche.proprietaire_adresse_rue || 'Non renseignée',
            city: fiche.proprietaire_adresse_ville || 'Non renseignée',
            postalCode: fiche.proprietaire_adresse_code_postal || '00000',
            country: 'FR'
        },
        description: `${fiche.logement_type_propriete || ''} - ${fiche.logement_typologie || ''} à ${fiche.proprietaire_adresse_ville || ''}`.trim() || 'Logement de vacances',
        status: "active",
        checkin: {
            from: "16:00",
            to: "00:00"
        },
        checkout: {
            from: "00:00",
            to: "10:00"
        },
        surfaceArea: fiche.logement_surface ? parseInt(fiche.logement_surface) : 10,
        defaultOccupancy: fiche.logement_nombre_personnes_max ? parseInt(fiche.logement_nombre_personnes_max) : 1,
        maxOccupancy: fiche.logement_nombre_personnes_max ? parseInt(fiche.logement_nombre_personnes_max) : 1,
        numberOfRooms: fiche.logement_type_propriete === "Studio" ? 1 : (parseInt(fiche.visite_nombre_chambres) || 1),
        numberOfBathrooms: fiche.visite_nombre_salles_bains ? parseInt(fiche.visite_nombre_salles_bains) : 1,
        defaultRate: 5000,
        timezone: "Europe/Paris",
        ...calculateBedCounts(fiche),
        coordinates: {
            latitude: 0,
            longitude: 0
        }
    }
}

/**
 * Construit le payload d'enrichissement pour le PUT post-création
 * Appelé depuis FicheFinalisation, quand toutes les données sont disponibles
 * Couvre : accessDetails + wifiDetails
 */
export function buildEnrichmentPayload(fiche) {
    return {
        accessDetails: {
            buildingCode: fiche.clefs_digicode_details || '',
            floor: fiche.logement_appartement_etage || '',
            instructions: fiche.clefs_emplacement_boite || '',
            parking: (() => {
                const type = fiche.equipements_parking_type
                if (type === 'sur_place') return fiche.equipements_parking_sur_place_details || ''
                if (type === 'rue') return fiche.equipements_parking_rue_details || ''
                if (type === 'payant') return fiche.equipements_parking_payant_details || ''
                return ''
            })()
        },
        wifiDetails: (() => {
            const statut = fiche.equipements_wifi_statut || ''
            if (statut === 'non') {
                return {
                    name: '',
                    password: '',
                    instructions: 'Pas de Wi-Fi dans le logement'
                }
            }
            if (statut === 'en_cours') {
                return {
                    name: fiche.equipements_wifi_nom_reseau || '',
                    password: fiche.equipements_wifi_mot_de_passe || '',
                    instructions: 'Le Wi-Fi est en cours d\'installation. ' + (fiche.equipements_wifi_details || '')
                }
            }
            return {
                name: fiche.equipements_wifi_nom_reseau || '',
                password: fiche.equipements_wifi_mot_de_passe || '',
                instructions: fiche.equipements_wifi_details || ''
            }
        })()
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
        beforePhotosRequired: false,
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
        beforePhotosRequired: false,
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
        beforePhotosRequired: false,
        afterPhotosRequired: true
    })

    // Cuisine
    // Ordre cible : inspection + équipements (statiques + conditionnels) → bloc Consommables groupé → Emplacement produits ménagers en dernier
    const cuisineTasks = [
        { name: "Vue d'ensemble de la cuisine (murs et sols)", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et équipements rangés" },
        { name: "Plan de travail", description: "Essuyé et désinfecté" },
        { name: "Plaque de cuisson", description: "Propre et fonctionnelle" },
        { name: "Évier", description: "Nettoyé et sans traces de calcaire. Vérifier que l'écoulement se fait correctement" },
        { name: "Poubelle avec sac propre", description: "Vidée et remplacée. Propre et désinfectée" },
        { name: "Torchon", description: "Propre et plié" }
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
        // Description corrigée : la version précédente avait un copier-coller depuis Congélateur ("Le congélateur est décongelé")
        cuisineTasks.push({ name: "Cuisinière", description: "Propre, désinfectée et fonctionnelle. Aucune nourriture à l'intérieur. Plaques et fours nettoyés." })
    }

    if (fiche.cuisine_1_equipements_cafetiere === true) {
        // Enrichissement du name avec les types cochés entre parenthèses (ex: "Cafetière (Nespresso, Piston)").
        // Si aucun type n'est coché → "Cafetière" tout court (pas de parenthèses vides).
        // Note : la branche morte `|| cuisine_1_equipements_machine_cafe === true` a été supprimée (clé inexistante en DB et dans le formData).
        const cafetiereTypes = []
        if (fiche.cuisine_1_cafetiere_type_filtre === true) cafetiereTypes.push("Filtre")
        if (fiche.cuisine_1_cafetiere_type_expresso === true) cafetiereTypes.push("Expresso")
        if (fiche.cuisine_1_cafetiere_type_piston === true) cafetiereTypes.push("Piston")
        if (fiche.cuisine_1_cafetiere_type_keurig === true) cafetiereTypes.push("Keurig")
        if (fiche.cuisine_1_cafetiere_type_nespresso === true) cafetiereTypes.push("Nespresso")
        if (fiche.cuisine_1_cafetiere_type_manuelle === true) cafetiereTypes.push("Manuelle")
        if (fiche.cuisine_1_cafetiere_type_bar_grain === true) cafetiereTypes.push("Bar à grain")
        if (fiche.cuisine_1_cafetiere_type_bar_moulu === true) cafetiereTypes.push("Bar moulu")
        const cafetiereName = cafetiereTypes.length > 0 ? `Cafetière (${cafetiereTypes.join(", ")})` : "Cafetière"
        cuisineTasks.push({ name: cafetiereName, description: "Propre, désinfectée et fonctionnelle. Aucune capsule ou café à l'intérieur. L'eau a été vidée. Elle ne présente pas de traces de calcaire" })
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

    if (fiche.cuisine_1_equipements_autre === true) {
        // Trim défensif pour ignorer les saisies whitespace-only (sinon tâche avec name vide visuellement — cf. fix Codex P2 PR #12)
        const autreTrimmed = (fiche.cuisine_1_equipements_autre_details || '').trim()
        if (autreTrimmed) {
            cuisineTasks.push({
                name: autreTrimmed,
                description: "Intérieur propre et désinfecté. Appareil fonctionnel"
            })
        }
    }

    // === Bloc Consommables groupé en fin de checklist (préfixe "Consommables:" pour homogénéité) ===
    cuisineTasks.push({ name: "Consommables: Éponge, liquide vaisselle, savon pour les mains", description: "Disponibles, en bon état et en quantité suffisante" })
    cuisineTasks.push({ name: "Consommables: Essuie-tout, sel, sucre, poivre", description: "Disponibles, en bon état et en quantité suffisante" })

    // Task conditionnelle : produits ménagers fournis par le prestataire (cuisine)
    if (fiche.consommables_fournis_par_prestataire === true) {
        cuisineTasks.push({
            name: "Consommables: Produit vitres et produit sol",
            description: "Disponibles, en bon état et en quantité suffisante"
        })
    }

    // Task conditionnelle : consommables "sur demande" cochés par le coordinateur (cuisine)
    // Pastilles + autre consommable libre (si rempli). Affichée uniquement si le prestataire fournit les consommables et au moins un item est coché.
    if (fiche.consommables_fournis_par_prestataire === true) {
        const cuisineSurDemandeItems = []
        if (fiche.consommables_pastilles_lave_vaisselle === true) {
            cuisineSurDemandeItems.push("Pastilles, sel et liquide de rinçage pour lave-vaisselle")
        }
        if (fiche.consommables_autre_consommable === true) {
            // Trim pour ignorer les saisies whitespace-only (sinon "Consommables sur demande:    " orphelin)
            const autreTrimmed = (fiche.consommables_autre_consommable_details || '').trim()
            if (autreTrimmed) {
                cuisineSurDemandeItems.push(autreTrimmed)
            }
        }
        if (cuisineSurDemandeItems.length > 0) {
            cuisineTasks.push({
                name: `Consommables sur demande: ${cuisineSurDemandeItems.join(", ")}`,
                description: "Disponibles, en bon état et en quantité suffisante"
            })
        }
    }

    // Task conditionnelle : types de café cochés par le coordinateur (équipement cuisine)
    // Indépendant du toggle prestataire — c'est une info d'équipement, pas un consommable sur demande.
    // Ordre d'affichage figé selon l'ordre des cases dans FicheConsommables.
    const cafeItems = []
    if (fiche.consommables_cafe_nespresso === true) cafeItems.push("Nespresso")
    if (fiche.consommables_cafe_senseo === true) cafeItems.push("Senseo")
    if (fiche.consommables_cafe_tassimo === true) cafeItems.push("Tassimo")
    if (fiche.consommables_cafe_soluble === true) cafeItems.push("Café soluble")
    if (fiche.consommables_cafe_moulu === true) cafeItems.push("Café moulu")
    if (fiche.consommables_cafe_grain === true) cafeItems.push("Café grain")
    if (fiche.consommables_cafe_autre === true) {
        // Trim pour ignorer les saisies whitespace-only (sinon "Autre : " orphelin — cf. fix Codex P2 PR #12)
        const cafeAutreTrimmed = (fiche.consommables_cafe_autre_details || '').trim()
        if (cafeAutreTrimmed) {
            cafeItems.push(`Autre : ${cafeAutreTrimmed}`)
        }
    }
    if (cafeItems.length > 0) {
        cuisineTasks.push({
            name: `Consommables café: ${cafeItems.join(", ")}`,
            description: "Disponibles, en bon état et en quantité suffisante"
        })
    }

    cuisineTasks.push({ name: "Consommables: Autres produits si demandés par le propriétaire (pastille lave-vaisselle, bouteille d'eau, gâteaux etc.)", description: "Disponibles, en bon état et en quantité suffisante" })


    // Emplacement produits ménagers en toute dernière position
    cuisineTasks.push({ name: "Emplacement produits ménagers", description: "Ordonné et accessible" })

    checklists.push({
        name: "Cuisine",
        tasks: cuisineTasks,
        isRequired: true,
        beforePhotosRequired: false,
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
            beforePhotosRequired: false,
            afterPhotosRequired: true
        })
    } else {
        // Chambres classiques (1 à 6)
        for (let i = 1; i <= Math.min(nombreChambres, 6); i++) {
            // Description "Lits" enrichie si le linge de lit est fourni (cf. brief Victoria).
            // Pas une task séparée : on garde l'ordre des tâches inchangé.
            const litsDescription = fiche[`chambres_chambre_${i}_equipements_draps_fournis`] === true
                ? "Faits avec serviettes roulées sur les lits (1 grande et 1 petite par personne). Linge de lit fourni propre, sans taches ni odeurs"
                : "Faits avec serviettes roulées sur les lits (1 grande et 1 petite par personne)"

            const chambreTasks = [
                { name: "Vue d'ensemble (murs et sols)", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" },
                { name: "Lits", description: litsDescription }
            ]

            // Task conditionnelle : Oreillers et couvertures supplémentaires (juste après Lits)
            if (fiche[`chambres_chambre_${i}_equipements_oreillers_couvertures_sup`] === true) {
                chambreTasks.push({ name: "Oreillers et couvertures supplémentaires", description: "Présents, propres et rangés. Sans taches ni odeurs" })
            }

            chambreTasks.push({ name: "Dessous de lits", description: "Dépoussiérés et nettoyés. Sans éléments oubliés" })

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
                beforePhotosRequired: false,
                afterPhotosRequired: true
            })
        }
    }

    // === SALLES DE BAIN ===
    const nombreSDB = fiche.visite_nombre_salles_bains ? parseInt(fiche.visite_nombre_salles_bains) : 1

    for (let i = 1; i <= Math.min(nombreSDB, 6); i++) {
        // Ordre cible : Vue d'ensemble → (douche/baignoire/combo + joints) → Lavabo → (double vasque, bidet)
        //   → Tiroirs/placards → Tapis de bain → (chauffage, sèche-serviette, sèche-cheveux, lave-linge)
        //   → Poubelle → (Autre) → Consommables en dernier.
        // Les tâches standalone "Parois ou rideau de douche" et "Rideau de baignoire" ont été retirées :
        // leur contenu est désormais absorbé par la description enrichie de Douche/Baignoire/Combo
        // ("Vérifier également : parois/rideau/faïence, robinetterie, évacuation").
        const sdbTasks = [
            { name: "Vue d'ensemble (murs et sols)", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" }
        ]

        // Tasks conditionnelles : Douche / Baignoire / Combo (XOR préservé : si combo, pas de douche ni baignoire séparées)
        const hasDouche = fiche[`salle_de_bains_salle_de_bain_${i}_equipements_douche`] === true
        const hasBaignoire = fiche[`salle_de_bains_salle_de_bain_${i}_equipements_baignoire`] === true
        const hasCombo = fiche[`salle_de_bains_salle_de_bain_${i}_equipements_douche_baignoire_com`] === true

        // Description enrichie commune à Douche, Baignoire et Combo (cf. brief Victoria)
        const ducheBaignoireDesc = "Propre et sans traces de calcaire. Avec bonde ouverte et nettoyée. Évacuation et eau chaude fonctionnelle. Vérifier également : parois/rideau/faïence, robinetterie, évacuation."

        if (hasCombo) {
            sdbTasks.push({ name: "Douche-baignoire", description: ducheBaignoireDesc })
        } else {
            if (hasDouche) {
                sdbTasks.push({ name: "Douche", description: ducheBaignoireDesc })
            }
            if (hasBaignoire) {
                sdbTasks.push({ name: "Baignoire", description: ducheBaignoireDesc })
            }
        }

        // Joints (conditionnel sur douche || combo — pas sur baignoire seule)
        if (hasDouche || hasCombo) {
            sdbTasks.push({ name: "Joints et baguettes des portes de douche", description: "Propre et sans traces ou décoloration" })
        }

        // Lavabo (statique)
        sdbTasks.push({ name: "Lavabo", description: "Propre et sans traces de calcaire. Avec bonde ouverte et nettoyée. Évacuation fonctionnelle et eau chaude fonctionnelle" })

        // Task conditionnelle : Double vasque
        if (fiche[`salle_de_bains_salle_de_bain_${i}_equipements_double_vasque`] === true) {
            sdbTasks.push({ name: "Double vasque", description: "Propre et sans traces de calcaire. Avec bondes ouvertes et nettoyées. Évacuation et eau chaude fonctionnelles" })
        }

        // Task conditionnelle : Bidet
        if (fiche[`salle_de_bains_salle_de_bain_${i}_equipements_bidet`] === true) {
            sdbTasks.push({ name: "Bidet", description: "Propre et sans traces de calcaire. Avec bonde ouverte et nettoyée. Évacuation fonctionnelle et eau chaude fonctionnelle" })
        }

        // Tasks statiques (rangement + tapis)
        sdbTasks.push({ name: "Intérieurs des tiroirs/placards", description: "Rangé, sans éléments oubliés et vue sèche-cheveux accessible" })
        sdbTasks.push({ name: "Tapis de bain", description: "Propre et placé : roulé sur le lavabo ou plié sur sèche serviette ou plié sur rebord de baignoire" })

        // Task conditionnelle : Chauffage
        if (fiche[`salle_de_bains_salle_de_bain_${i}_equipements_chauffage`] === true) {
            sdbTasks.push({ name: "Chauffage", description: "Réglage à 18° à partir du 1er Novembre et éteint à partir du 1er Avril. Etat fonctionnel" })
        }

        // Task conditionnelle : Sèche-serviette
        if (fiche[`salle_de_bains_salle_de_bain_${i}_equipements_seche_serviette`] === true) {
            sdbTasks.push({ name: "Sèche-serviette", description: "Propre, dépoussiéré et fonctionnel. Laissé éteint" })
        }

        // Task conditionnelle : Sèche-cheveux
        if (fiche[`salle_de_bains_salle_de_bain_${i}_equipements_seche_cheveux`] === true) {
            sdbTasks.push({ name: "Sèche-cheveux", description: "Propre, dépoussiéré et fonctionnel. Cordon enroulé et rangé" })
        }

        // Task conditionnelle : Lave-linge (indépendant du lave-linge cuisine, peut coexister)
        if (fiche[`salle_de_bains_salle_de_bain_${i}_equipements_lave_linge`] === true) {
            sdbTasks.push({ name: "Lave-linge", description: "Intérieur propre et désinfecté. Lave-linge fonctionnel. Aucun linge n'a été laissé à l'intérieur. Le filtre a été nettoyé. L'intérieur ne présente pas de traces de calcaire" })
        }

        // Poubelle (statique)
        sdbTasks.push({ name: "Intérieur poubelle avec sac poubelle", description: "Vidée et remplacée. Propre et désinfectée" })

        // Task conditionnelle : Autre équipement (avec trim défensif — cf. fix Codex P2 PR #12)
        if (fiche[`salle_de_bains_salle_de_bain_${i}_equipements_autre`] === true) {
            const autreTrimmed = (fiche[`salle_de_bains_salle_de_bain_${i}_equipements_autre_details`] || '').trim()
            if (autreTrimmed) {
                sdbTasks.push({
                    name: autreTrimmed,
                    description: "Propre, désinfecté et fonctionnel"
                })
            }
        }

        // === Bloc Consommables groupé en fin de checklist ===
        sdbTasks.push({ name: "Consommables: 1 savon pour les mains", description: "Disponible, en bon état et en quantité suffisante" })

        // Task conditionnelle : produits ménagers fournis par le prestataire (SDB)
        if (fiche.consommables_fournis_par_prestataire === true) {
            sdbTasks.push({
                name: "Consommables: Produit SDB / multi-surfaces ou vinaigre ménager",
                description: "Disponible, en bon état et en quantité suffisante"
            })
        }

        // Task conditionnelle : consommables "sur demande" cochés par le coordinateur (SDB)
        // Bloc affiché uniquement si le prestataire fournit les consommables ET qu'au moins un item est coché
        if (fiche.consommables_fournis_par_prestataire === true) {
            const sdbSurDemandeItems = []
            if (fiche.consommables_gel_douche === true) sdbSurDemandeItems.push("Gel douche")
            if (fiche.consommables_shampoing === true) sdbSurDemandeItems.push("Shampoing")
            if (fiche.consommables_apres_shampoing === true) sdbSurDemandeItems.push("Après-shampoing")
            if (sdbSurDemandeItems.length > 0) {
                sdbTasks.push({
                    name: `Consommables sur demande: ${sdbSurDemandeItems.join(", ")}`,
                    description: "Disponibles, en bon état et en quantité suffisante"
                })
            }
        }

        checklists.push({
            name: `Salle de bain ${i}`,
            tasks: sdbTasks,
            required: true,
            isRequired: true,
            beforePhotosRequired: false,
            afterPhotosRequired: true
        })
    }

    // WC
    const wcTasks = [
        { name: "Vue d'ensemble des WC (murs et sols)", description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, tâches retirées et éléments rangés" },
        { name: "Abattant", description: "Propre et désinfecté" },
        { name: "Lunette de WC", description: "Propre et désinfectée" },
        { name: "Cuvette de WC", description: "Propre et désinfectée. Sans trace de calcaire" },
        { name: "Base de WC (arrondi en bas)", description: "Propre et désinfectée" },
        { name: "Brosse de WC", description: "Propre et désinfectée" },
        { name: "Poubelle de WC", description: "Vider et mettre sac neuf. Intérieur poubelle avec sac poubelle" }
    ]

    // === Bloc Consommables groupé en fin de checklist ===
    wcTasks.push({ name: "Consommables: 2 rouleaux de papier toilette", description: "Disponible, en bon état et en quantité suffisante" })

    // Task conditionnelle : produits ménagers fournis par le prestataire (WC)
    if (fiche.consommables_fournis_par_prestataire === true) {
        wcTasks.push({
            name: "Consommables: Produit WC / Javel",
            description: "Disponible, en bon état et en quantité suffisante"
        })
    }

    checklists.push({
        name: "WC",
        tasks: wcTasks,
        isRequired: true,
        beforePhotosRequired: false,
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

        // Task conditionnelle : Étendoir
        if (fiche.equipements_etendoir === true) {
            buanderieTasks.push({ name: "Etendoir à linge", description: "Propre et rangé. Sans linge étendu" })
        }

        // Note : l'ancienne task conditionnelle "Lit bébé" (basée sur bebe_equipements + bebe_lit_bebe_type)
        // a été retirée volontairement. Le lit parapluie est saisi côté chambres, pas en équipements globaux —
        // il n'a pas de sens métier dans la checklist Buanderie. Le mapping bebe_* reste intact côté DB / formData
        // pour les autres consommateurs (PDF, validation).

        // Task standard : Espace de stockage (toujours présent)
        buanderieTasks.push({ name: "Espace de stockage (linge et consommables)", description: "Linge et consommables ordonnés" })

        checklists.push({
            name: "Buanderie / Stockage",
            tasks: buanderieTasks,
            isRequired: true,
            beforePhotosRequired: false,
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

    // Autre pièce (champ libre) — libellé générique au pluriel avec le contenu du champ entre parenthèses.
    // Trim défensif pour ignorer les saisies whitespace-only (sinon "(  )" orphelin — même pattern que les champs "autre" cuisine/SDB).
    // Pas de split sur virgules : le contenu est repris brut tel que saisi par le coordinateur.
    if (fiche.visite_pieces_autre === true) {
        const autrePieceTrimmed = (fiche.visite_pieces_autre_details || '').trim()
        if (autrePieceTrimmed) {
            autresPiecesTasks.push({
                name: `Vue d'ensemble des autres pièces (${autrePieceTrimmed})`,
                description: "Sol aspiré et serpillé, surfaces dépoussiérées et propres, matériel rangé et fonctionnel. Matériel au complet"
            })
        }
    }

    // Ajouter la checklist si au moins une task existe
    if (autresPiecesTasks.length > 0) {
        checklists.push({
            name: "Autres pièces ou matériel",
            tasks: autresPiecesTasks,
            isRequired: true,
            beforePhotosRequired: false,
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

        // Autre équipement (champ libre).
        // Trim défensif pour ignorer les saisies whitespace-only (sinon task avec name vide visuellement —
        // même pattern que les champs "autre" cuisine/SDB et que visite_pieces_autre_details en PR #23).
        if (equipementsExt.includes('Autre')) {
            const autreTrimmed = (fiche.equip_spe_ext_exterieur_equipements_autre_details || '').trim()
            if (autreTrimmed) {
                exterieurTasks.push({
                    name: autreTrimmed,
                    description: "Nettoyé et rangé"
                })
            }
        }

        checklists.push({
            name: "Extérieurs",
            tasks: exterieurTasks,
            isRequired: true,
            beforePhotosRequired: false,
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
            beforePhotosRequired: false,
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
// ⏸️ MODE UPDATE DÉSACTIVÉ TEMPORAIREMENT
// À réactiver quand le diff checklists sera implémenté
// Voir session Claude Brain: 2026-01-26_loomky_phase2_update_implementation.json
// ============================================

/*
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
*/

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

// ============================================
// SECTION 5: API PUBLIQUE SIMPLIFIÉE
// ============================================

/**
 * Enregistre un événement Loomky dans fiches_history
 * Ne bloque jamais le flow principal en cas d'erreur
 * @param {string} ficheId
 * @param {string} numeroBien
 * @param {string} ficheName
 * @param {string} action - 'loomky_property_created' | 'loomky_owner_created' | 'loomky_checklists_created'
 * @param {string} userId
 */
export async function logLoomkyEvent(ficheId, numeroBien, ficheName, action, userId) {
    try {
        await supabase
            .from('fiches_history')
            .insert({
                fiche_id: ficheId,
                numero_bien: numeroBien || '',
                fiche_nom: ficheName || '',
                action,
                changed_by: userId || null,
                changed_at: new Date().toISOString()
            })
    } catch (err) {
        console.warn('logLoomkyEvent failed (non-blocking):', err)
    }
}

/**
 * Crée une property Loomky depuis une fiche normalisée
 * @param {Object} fiche - Fiche normalisée (via normalizeFormDataToFiche)
 * @param {string} token - Token JWT Loomky (saisi par le coordinateur)
 */
export async function createPropertyOnLoomky(fiche, token) {
    const payload = buildPropertyPayload(fiche)
    return await createProperty(payload, token)
}

/**
 * Crée un propriétaire (property owner) dans Loomky depuis une fiche normalisée
 * @param {Object} fiche - Fiche normalisée (via normalizeFormDataToFiche)
 * @param {string} token - Token JWT Loomky (saisi par le coordinateur)
 * @returns {Promise<Object>} - { success, ownerId } ou { success: false, error }
 */
export async function createPropertyOwnerOnLoomky(fiche, token) {
    if (!token) return { success: false, error: 'Token requis' }

    const email = fiche.proprietaire_email || ''

    // Vérifier si cet owner existe déjà dans le registre local
    if (email) {
        const { data: existing } = await supabase
            .from('loomky_owners')
            .select('loomky_owner_id')
            .eq('email', email)
            .maybeSingle()

        if (existing?.loomky_owner_id) {
            return { success: true, ownerId: existing.loomky_owner_id, existing: true }
        }
    }

    // Normalisation E.164 avant envoi à Loomky (qui rejette les autres formats avec une 400).
    // Si la normalisation retourne `''` (vide / non reconnu / garbage), le fallback prend le relais.
    const normalizedPhone = normalizePhoneForLoomky(fiche.proprietaire_telephone)

    const payload = {
        email,
        firstName: fiche.proprietaire_prenom || '',
        lastName: fiche.proprietaire_nom || '',
        phone: normalizedPhone || '+33700000000',
        address: {
            street: fiche.proprietaire_adresse_rue || '',
            city: fiche.proprietaire_adresse_ville || '',
            country: 'FR',
            postalCode: fiche.proprietaire_adresse_code_postal || ''
        },
        ownerPermissions: {
            viewStats: {
                occupancy: true,  // Taux d'occupation
                totalNights: true,   // Nb total de nuits
                grossRevenueExclFees: false,
                grossRevenueInclFees: false,
                grossRevenuePerPlatformInclFees: false,
                grossRevenuePerPlatformExclFees: false,
                nightsPerPlatform: true,  // Nb de nuits par plateforme
                customFees: false,
                commission: false,
                cityTax: false,
                netRevenue: true   // Revenu net
            },
            viewCalendar: true,  // Calendrier
            updateAvailability: false,
            viewBookingDetails: true  // Réservations
        },
        sendCredentials: true,
        type: 'individual'
    }

    try {
        const response = await fetch(`${BASE_URL}/v1/property-owners`, {
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
            return { success: false, error: `Erreur parsing réponse: ${text.substring(0, 100)}` }
        }

        if (!response.ok) {
            const errorMsg = data?.message || response.statusText || 'Erreur inconnue'
            return { success: false, error: `Erreur ${response.status}: ${errorMsg}` }
        }

        const ownerId = data.owner?._id
        if (!ownerId) {
            return { success: false, error: 'OwnerId non trouvé dans la réponse' }
        }

        // Enregistrer dans le registre local pour éviter les doublons futurs
        if (email) {
            await supabase
                .from('loomky_owners')
                .insert({ email, loomky_owner_id: ownerId })
        }

        return { success: true, ownerId, existing: false }

    } catch (error) {
        return { success: false, error: error.message }
    }
}

/**
 * Associe une property à un propriétaire dans Loomky
 * @param {string} ownerId - ID Loomky du propriétaire
 * @param {string} propertyId - ID Loomky de la property
 * @param {string} token - Token JWT Loomky (saisi par le coordinateur)
 * @returns {Promise<Object>} - { success } ou { success: false, error }
 */
export async function assignPropertyToOwnerOnLoomky(ownerId, propertyId, token) {
    if (!token) return { success: false, error: 'Token requis' }
    if (!ownerId) return { success: false, error: 'OwnerId requis' }
    if (!propertyId) return { success: false, error: 'PropertyId requis' }

    try {
        const response = await fetch(`${BASE_URL}/v1/property-owners/${ownerId}/properties/assign`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ propertiesIds: [propertyId] })
        })

        if (response.status === 204) {
            return { success: true }
        }

        if (!response.ok) {
            const text = await response.text()
            let errorData = {}
            try { errorData = text ? JSON.parse(text) : {} } catch (e) { /* noop */ }
            const errorMsg = errorData?.message || response.statusText || 'Erreur inconnue'
            return { success: false, error: `Erreur ${response.status}: ${errorMsg}` }
        }

        return { success: true }

    } catch (error) {
        return { success: false, error: error.message }
    }
}

/**
 * Crée les checklists Loomky pour une property existante
 * @param {string} propertyId - ID Loomky de la property (loomky_property_id)
 * @param {Object} fiche - Fiche normalisée (via normalizeFormDataToFiche)
 * @param {string} token - Token JWT Loomky (saisi par le coordinateur)
 */
export async function createChecklistsOnLoomky(propertyId, fiche, token) {
    const payload = buildResolvedChecklists(fiche)
    return await createChecklists(propertyId, payload, token)
}

/**
 * Enrichit une property Loomky existante (accessDetails + wifiDetails)
 * Appelé depuis FicheFinalisation après création des checklists
 */
export async function enrichPropertyOnLoomky(propertyId, fiche, token) {
    const payload = buildEnrichmentPayload(fiche)
    return await updateProperty(propertyId, payload, token)
}

/**
 * Supprime une property Loomky + nettoie Supabase
 * @param {string} propertyId - ID Loomky de la property
 * @param {string} token - Token JWT Loomky
 * @param {string} ficheId - ID de la fiche Supabase (pour le cleanup)
 */
export async function deletePropertyOnLoomky(propertyId, token, ficheId) {
    if (!token) return { success: false, error: 'Token requis' }
    if (!propertyId) return { success: false, error: 'PropertyId requis' }

    try {
        const response = await fetch(`${BASE_URL}/v1/properties/${propertyId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })

        if (!response.ok) {
            const text = await response.text()
            return { success: false, error: `Erreur ${response.status}: ${text.substring(0, 100)}` }
        }

        return { success: true }

    } catch (error) {
        return { success: false, error: error.message }
    }
}