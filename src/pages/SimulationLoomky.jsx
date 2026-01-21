// src/pages/SimulationLoomky.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabaseClient'

const STORAGE_KEY = 'loomky_api_config'
const HISTORY_KEY = 'loomky_test_history'

export default function SimulationLoomky() {
  const { user } = useAuth()

  // === TOKEN LOOMKY (pré-rempli avec token test) ===
  const [loomkyToken, setLoomkyToken] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTQyZTEzNWJmZWM5Njk5ZDQ5MDg3MTQiLCJ1c2VyUm9sZSI6InByb3BlcnR5TWFuYWdlciIsImFjY291bnRJZCI6IjY5NDJlMTM1YmZlYzk2OTlkNDkwODcxMSIsImlhdCI6MTc2NTk5MTEzNH0.uZmiEMYUjcmGr2wpmx5DMrC7M_FEzpgLClNVgGYAEmM')

  // === SECTION 1: Configuration API ===
  const [apiConfig, setApiConfig] = useState({
    authType: 'none',
    apiKey: '',
    oauthToken: '',
    endpointHebergement: '',
    endpointChecklist: '',
    useSinglePayload: true,
    customHeaders: [],
    queryParams: []
  })

  // === SECTION 2: Fiches & Payloads ===
  const [fiches, setFiches] = useState([])
  const [selectedFicheId, setSelectedFicheId] = useState('')
  const [selectedFiche, setSelectedFiche] = useState(null)
  const [payloadHebergement, setPayloadHebergement] = useState(null)
  const [payloadChecklist, setPayloadChecklist] = useState(null)
  const [editedPayloadHebergement, setEditedPayloadHebergement] = useState('')
  const [editedPayloadChecklist, setEditedPayloadChecklist] = useState('')
  const [loading, setLoading] = useState(false)

  // === SECTION 3: Tests & Résultats ===
  const [sending, setSending] = useState(false)
  const [testHistory, setTestHistory] = useState([])
  const [deletePropertyId, setDeletePropertyId] = useState('')
  const [deleteChecklistId, setDeleteChecklistId] = useState('')

  // Charger config depuis localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY)
    if (savedConfig) {
      try {
        setApiConfig(JSON.parse(savedConfig))
      } catch (e) {
        console.error('Erreur lecture config:', e)
      }
    }

    const savedHistory = localStorage.getItem(HISTORY_KEY)
    if (savedHistory) {
      try {
        setTestHistory(JSON.parse(savedHistory))
      } catch (e) {
        console.error('Erreur lecture historique:', e)
      }
    }

  }, [])

  // Sauvegarder config
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apiConfig))
  }, [apiConfig])

  // Charger fiches
  useEffect(() => {
    loadFiches()
  }, [])

  // Charger fiche sélectionnée
  useEffect(() => {
    if (selectedFicheId) {
      loadFicheComplete()
    } else {
      resetPayloads()
    }
  }, [selectedFicheId])

  // Sync éditeurs
  useEffect(() => {
    if (payloadHebergement) {
      setEditedPayloadHebergement(JSON.stringify(payloadHebergement, null, 2))
    }
  }, [payloadHebergement])

  useEffect(() => {
    if (payloadChecklist) {
      setEditedPayloadChecklist(JSON.stringify(payloadChecklist, null, 2))
    }
  }, [payloadChecklist])

  const resetPayloads = () => {
    setSelectedFiche(null)
    setPayloadHebergement(null)
    setPayloadChecklist(null)
    setEditedPayloadHebergement('')
    setEditedPayloadChecklist('')
  }

  // === CONSTANTE API LOOMKY ===
  const LOOMKY_BASE_URL = 'https://dev.loomky.com'

  const loadFiches = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('fiches')
        .select('id, nom, logement_numero_bien, statut')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFiches(data || [])
    } catch (error) {
      console.error('Erreur chargement fiches:', error)
      alert('Erreur lors du chargement des fiches')
    } finally {
      setLoading(false)
    }
  }

  const loadFicheComplete = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('fiches')
        .select('*')
        .eq('id', selectedFicheId)
        .single()

      if (error) throw error

      setSelectedFiche(data)
      generatePayloads(data)
    } catch (error) {
      console.error('Erreur chargement fiche:', error)
      alert('Erreur lors du chargement de la fiche')
    } finally {
      setLoading(false)
    }
  }

  const buildResolvedChecklists = (fiche) => {
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

  const mapTypeToLoomky = (typePropriete) => {
    // TEMPORAIRE: L'API test n'accepte que le type 'apartment'
    return 'apartment'

    /* VERSION FINALE (à réactiver en prod):
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
    */
  }

  const calculateBedCounts = (fiche) => {
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

    if (simpleBedCount === 0 && doubleBedCount === 0) {
      simpleBedCount = 1 // Mettre 1 lit simple par défaut
    }

    return { simpleBedCount, doubleBedCount }
  }

  const generatePayloads = (fiche) => {

    // Payload Hébergement (format Loomky)
    const hebergement = {
      name: `${fiche.logement_type_propriete || ''} ${fiche.nom || fiche.logement_numero_bien || ''}`.trim() || "Hébergement sans nom",
      type: mapTypeToLoomky(fiche.logement_type_propriete),
      address: {
        street: fiche.proprietaire_adresse_rue || '',
        city: fiche.proprietaire_adresse_ville || '',
        postalCode: fiche.proprietaire_adresse_code_postal || '',
        country: 'FR'
      },
      description: `${fiche.logement_type_propriete || ''} - ${fiche.logement_typologie || ''} à ${fiche.proprietaire_adresse_ville || ''}`.trim(),
      status: "active",
      checkin: {
        from: "15:00",
        to: "18:00"
      },
      checkout: {
        from: "10:00",
        to: "11:00"
      },
      surfaceArea: fiche.logement_surface || null,
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

    // Payload Checklist (avec logique conditionnelle)
    const checklist = buildResolvedChecklists(fiche)

    setPayloadHebergement(hebergement)
    setPayloadChecklist(checklist)
  }

  const handleCopyPayload = (payloadText, type) => {
    navigator.clipboard.writeText(payloadText)
    alert(`✅ Payload ${type} copié !`)
  }

  const handleResetToGenerated = (type) => {
    if (type === 'hebergement' && payloadHebergement) {
      setEditedPayloadHebergement(JSON.stringify(payloadHebergement, null, 2))
    } else if (type === 'checklist' && payloadChecklist) {
      setEditedPayloadChecklist(JSON.stringify(payloadChecklist, null, 2))
    }
  }

  const validateJSON = (jsonString) => {
    try {
      return { valid: true, data: JSON.parse(jsonString) }
    } catch (e) {
      return { valid: false, error: e.message }
    }
  }

  const sendToAPI = async () => {
    if (!editedPayloadHebergement) {
      alert('⚠️ Aucun payload à envoyer')
      return
    }

    setSending(true)
    const results = []

    try {
      // Parse les payloads
      const payloadHebergement = JSON.parse(editedPayloadHebergement)
      const payloadChecklist = editedPayloadChecklist ? JSON.parse(editedPayloadChecklist) : null

      // Construction des headers
      const headers = {
        'Content-Type': 'application/json'
      }

      // Ajouter le token Loomky si disponible (priorité sur les autres auth)
      if (loomkyToken) {
        headers['Authorization'] = `Bearer ${loomkyToken}`
      } else if (apiConfig.authType === 'api_key' && apiConfig.apiKey) {
        headers['Authorization'] = `Bearer ${apiConfig.apiKey}`
      } else if (apiConfig.authType === 'oauth' && apiConfig.oauthToken) {
        headers['Authorization'] = `Bearer ${apiConfig.oauthToken}`
      }

      // Headers personnalisés
      apiConfig.customHeaders.forEach(h => {
        if (h.name && h.value) headers[h.name] = h.value
      })

      // === 1️⃣ ENVOI PROPERTY ===
      let propertyId = null

      // POST property
      const hebergementResponse = await fetch(apiConfig.endpointHebergement || 'https://dev.loomky.com/v1/properties', {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadHebergement.hebergement || payloadHebergement)
      })

      const hebergementText = await hebergementResponse.text()
      let hebergementData = {}
      try {
        hebergementData = JSON.parse(hebergementText)
      } catch (e) {
        hebergementData = { _id: 'fake-property-id-for-test', message: hebergementText }
      }

      results.push({
        endpoint: 'POST /v1/properties',
        status: hebergementResponse.status,
        statusText: hebergementResponse.statusText,
        ok: hebergementResponse.ok,
        body: hebergementData,
        extractedId: hebergementData._id || null,
        extractedMessage: hebergementData.message || null
      })

      // Récupérer propertyId avec guard
      propertyId = hebergementData.property?._id || hebergementData._id

      if (!hebergementResponse.ok || !propertyId) {
        const errorMsg = hebergementData?.message || hebergementResponse.statusText || 'Erreur inconnue'
        throw new Error(`❌ Création de la propriété Loomky échouée (${hebergementResponse.status}): ${errorMsg}. Les checklists n'ont pas été envoyées.`)
      }

      // === 2️⃣ ENVOI CHECKLISTS ===
      if (payloadChecklist?.checklists) {
        const checklistEndpoint = `${apiConfig.endpointChecklist || 'https://dev.loomky.com/v1/properties'}/${propertyId}/cleaning-checklists`

        const checklistResponse = await fetch(
          checklistEndpoint,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payloadChecklist)
          }
        )

        const checklistText = await checklistResponse.text()
        let checklistData = null
        try {
          checklistData = checklistText ? JSON.parse(checklistText) : null
        } catch (e) {
          checklistData = { message: checklistText }
        }

        results.push({
          endpoint: `PATCH ${checklistEndpoint}`,
          status: checklistResponse.status,
          statusText: checklistResponse.statusText,
          ok: checklistResponse.ok,
          body: checklistData,
          extractedMessage: checklistData?.message || null
        })
      }

      // Sauvegarder dans l'historique
      const newHistory = [
        {
          fiche: selectedFiche?.nom || selectedFiche?.logement_numero_bien || 'Fiche test',
          timestamp: new Date().toISOString(),
          results
        },
        ...testHistory
      ].slice(0, 5) // Garder seulement les 5 derniers

      setTestHistory(newHistory)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))

      // Alert succès/erreur
      const allSuccess = results.every(r => r.ok)
      if (allSuccess) {
        alert('✅ Envoi réussi ! Vérifie les résultats ci-dessous.')
      } else {
        alert('⚠️ Certains appels ont échoué. Vérifie les détails ci-dessous.')
      }

    } catch (error) {
      console.error('Erreur envoi API:', error)
      results.push({
        endpoint: 'Error',
        error: true,
        message: error.message
      })
      alert(`❌ Erreur : ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const clearHistory = () => {
    if (confirm('Effacer l\'historique ?')) {
      setTestHistory([])
      localStorage.removeItem(HISTORY_KEY)
    }
  }

  const deleteProperty = async () => {
    if (!deletePropertyId.trim()) {
      alert('⚠️ Property ID requis')
      return
    }

    if (!confirm(`Supprimer la property ${deletePropertyId} ?`)) {
      return
    }

    setSending(true)
    try {
      const headers = {
        'Content-Type': 'application/json'
      }

      if (loomkyToken) {
        headers['Authorization'] = `Bearer ${loomkyToken}`
      }

      // 1️⃣ Supprimer la checklist si ID fourni
      if (deleteChecklistId.trim()) {
        const checklistUrl = `${LOOMKY_BASE_URL}/v1/properties/${deletePropertyId}/cleaning-checklists/${deleteChecklistId}`
        const checklistRes = await fetch(checklistUrl, {
          method: 'DELETE',
          headers
        })

        if (!checklistRes.ok) {
          throw new Error(`Erreur suppression checklist: ${checklistRes.status}`)
        }
        console.log('✅ Checklist supprimée')
      }

      // 2️⃣ Supprimer la property
      const propertyUrl = `${LOOMKY_BASE_URL}/v1/properties/${deletePropertyId}`
      const propertyRes = await fetch(propertyUrl, {
        method: 'DELETE',
        headers
      })

      if (!propertyRes.ok) {
        throw new Error(`Erreur suppression property: ${propertyRes.status}`)
      }

      alert('✅ Property supprimée avec succès !')
      setDeletePropertyId('')
      setDeleteChecklistId('')

    } catch (error) {
      console.error('Erreur suppression:', error)
      alert(`❌ Erreur : ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Console Test API Loomky
          </h1>
          <p className="text-gray-600">
            Configuration et tests d'intégration (super_admin uniquement)
          </p>
        </div>

        {/* TOKEN LOOMKY */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🔑 Token Loomky (Test)
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token d'authentification (pré-rempli)
            </label>
            <textarea
              value={loomkyToken}
              onChange={(e) => setLoomkyToken(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
              rows="3"
              placeholder="Token JWT..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Token sans expiration fourni par Maxime pour les tests
            </p>
          </div>
        </div>

        {/* SECTION 1: CONFIG API */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            2.⚙️ Configuration API
          </h2>

          <div className="space-y-4">
            {/* Type auth - 3 OPTIONS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Type d'authentification (facultatif)
              </label>
              <div className="grid grid-cols-3 gap-4">
                {/* Carte Pas d'auth */}
                <button
                  type="button"
                  onClick={() => setApiConfig({ ...apiConfig, authType: 'none' })}
                  className={`relative p-6 rounded-xl border-2 transition-all ${apiConfig.authType === 'none'
                    ? 'border-gray-500 bg-gray-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className="text-center">
                    <div className={`text-4xl mb-3 ${apiConfig.authType === 'none' ? 'opacity-100' : 'opacity-50'
                      }`}>
                      🚫
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">Aucune</h3>
                    <p className="text-xs text-gray-600">
                      Pas d'authentification
                    </p>
                  </div>
                  {apiConfig.authType === 'none' && (
                    <div className="absolute top-3 right-3">
                      <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-500"></span>
                      </span>
                    </div>
                  )}
                </button>

                {/* Carte API Key */}
                <button
                  type="button"
                  onClick={() => setApiConfig({ ...apiConfig, authType: 'api_key' })}
                  className={`relative p-6 rounded-xl border-2 transition-all ${apiConfig.authType === 'api_key'
                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className="text-center">
                    <div className={`text-4xl mb-3 ${apiConfig.authType === 'api_key' ? 'opacity-100' : 'opacity-50'
                      }`}>
                      🔑
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">API Key</h3>
                    <p className="text-xs text-gray-600">
                      Header X-API-Key
                    </p>
                  </div>
                  {apiConfig.authType === 'api_key' && (
                    <div className="absolute top-3 right-3">
                      <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                      </span>
                    </div>
                  )}
                </button>

                {/* Carte OAuth */}
                <button
                  type="button"
                  onClick={() => setApiConfig({ ...apiConfig, authType: 'oauth' })}
                  className={`relative p-6 rounded-xl border-2 transition-all ${apiConfig.authType === 'oauth'
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className="text-center">
                    <div className={`text-4xl mb-3 ${apiConfig.authType === 'oauth' ? 'opacity-100' : 'opacity-50'
                      }`}>
                      🛡️
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">OAuth</h3>
                    <p className="text-xs text-gray-600">
                      Bearer Token
                    </p>
                  </div>
                  {apiConfig.authType === 'oauth' && (
                    <div className="absolute top-3 right-3">
                      <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                      </span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Champ credentials - CONDITIONNEL selon authType */}
            {apiConfig.authType === 'api_key' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clé API
                </label>
                <input
                  type="text"
                  value={apiConfig.apiKey}
                  onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                  placeholder="your-api-key"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {apiConfig.authType === 'oauth' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token OAuth
                </label>
                <input
                  type="text"
                  value={apiConfig.oauthToken}
                  onChange={(e) => setApiConfig({ ...apiConfig, oauthToken: e.target.value })}
                  placeholder="Bearer token"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Endpoint API */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base URL API Loomky
              </label>
              <input
                type="text"
                value={apiConfig.endpointHebergement}
                onChange={(e) => setApiConfig({
                  ...apiConfig,
                  endpointHebergement: e.target.value,
                  endpointChecklist: e.target.value
                })}
                placeholder="https://dev.loomky.com/v1/properties"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Saisir l'endpoint POST pour créer une propriété. L'endpoint PATCH pour les checklists sera construit automatiquement avec le PropertyId. Cette URL sera utilisée pour POST /properties et PATCH /properties/{'{propertyId}'}/cleaning-checklists
              </p>
            </div>

            {/* Headers personnalisés */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Headers personnalisés
                </label>
                <button
                  type="button"
                  onClick={() => setApiConfig({
                    ...apiConfig,
                    customHeaders: [...apiConfig.customHeaders, { name: '', value: '' }]
                  })}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  + Ajouter un header
                </button>
              </div>

              <div className="space-y-2">
                {apiConfig.customHeaders.map((header, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={header.name}
                      onChange={(e) => {
                        const newHeaders = [...apiConfig.customHeaders]
                        newHeaders[idx].name = e.target.value
                        setApiConfig({ ...apiConfig, customHeaders: newHeaders })
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={header.value}
                      onChange={(e) => {
                        const newHeaders = [...apiConfig.customHeaders]
                        newHeaders[idx].value = e.target.value
                        setApiConfig({ ...apiConfig, customHeaders: newHeaders })
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newHeaders = apiConfig.customHeaders.filter((_, i) => i !== idx)
                        setApiConfig({ ...apiConfig, customHeaders: newHeaders })
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {apiConfig.customHeaders.length === 0 && (
                  <p className="text-xs text-gray-500 italic">Aucun header personnalisé</p>
                )}
              </div>
            </div>

            {/* Query parameters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Query parameters
                </label>
                <button
                  type="button"
                  onClick={() => setApiConfig({
                    ...apiConfig,
                    queryParams: [...apiConfig.queryParams, { name: '', value: '' }]
                  })}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  + Ajouter un paramètre
                </button>
              </div>

              <div className="space-y-2">
                {apiConfig.queryParams.map((param, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={param.name}
                      onChange={(e) => {
                        const newParams = [...apiConfig.queryParams]
                        newParams[idx].name = e.target.value
                        setApiConfig({ ...apiConfig, queryParams: newParams })
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={param.value}
                      onChange={(e) => {
                        const newParams = [...apiConfig.queryParams]
                        newParams[idx].value = e.target.value
                        setApiConfig({ ...apiConfig, queryParams: newParams })
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newParams = apiConfig.queryParams.filter((_, i) => i !== idx)
                        setApiConfig({ ...apiConfig, queryParams: newParams })
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {apiConfig.queryParams.length === 0 && (
                  <p className="text-xs text-gray-500 italic">Aucun paramètre</p>
                )}
              </div>
            </div>
          </div>

        </div>


        {/* SECTION 2: PAYLOADS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            3. 📝 Sélection Fiche
          </h2>

          {/* Dropdown avec recherche */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fiche à tester
            </label>

            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher par numéro ou nom..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                onFocus={(e) => {
                  e.target.nextElementSibling.classList.remove('hidden')
                }}
                onBlur={(e) => {
                  setTimeout(() => {
                    e.target.nextElementSibling.classList.add('hidden')
                  }, 200)
                }}
                onChange={(e) => {
                  const search = e.target.value.toLowerCase()
                  const dropdown = e.target.nextElementSibling
                  const options = dropdown.querySelectorAll('[data-fiche-id]')

                  options.forEach(option => {
                    const text = option.textContent.toLowerCase()
                    if (text.includes(search)) {
                      option.classList.remove('hidden')
                    } else {
                      option.classList.add('hidden')
                    }
                  })
                }}
              />

              <div className="hidden absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div
                  className="px-4 py-3 hover:bg-gray-100 cursor-pointer text-gray-500"
                  onClick={() => {
                    setSelectedFicheId('')
                    document.querySelector('input[placeholder="Rechercher par numéro ou nom..."]').value = ''
                  }}
                >
                  -- Aucune sélection --
                </div>
                {fiches.map(f => (
                  <div
                    key={f.id}
                    data-fiche-id={f.id}
                    className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-t border-gray-100"
                    onClick={() => {
                      setSelectedFicheId(f.id)
                      const input = document.querySelector('input[placeholder="Rechercher par numéro ou nom..."]')
                      input.value = `${f.logement_numero_bien ? `#${f.logement_numero_bien} - ` : ''}${f.nom || 'Sans nom'}`
                      input.nextElementSibling.classList.add('hidden')
                    }}
                  >
                    <span className="font-medium text-gray-900">
                      {f.logement_numero_bien && <span className="text-indigo-600">#{f.logement_numero_bien}</span>}
                      {f.logement_numero_bien && ' - '}
                      {f.nom || 'Sans nom'}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({f.statut || 'Brouillon'})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedFiche && (
              <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-sm text-indigo-900">
                  ✅ Fiche sélectionnée: <strong>#{selectedFiche.logement_numero_bien}</strong> - {selectedFiche.nom}
                </p>
              </div>
            )}
          </div>

          {selectedFiche && (
            <div className="space-y-6">
              {/* Payload Hébergement */}
              <div>
                <div className="flex justify-between mb-2">
                  <h3 className="text-lg font-semibold">🏠 Payload Hébergement</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResetToGenerated('hebergement')}
                      className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      ↻ Reset
                    </button>
                    <button
                      onClick={() => handleCopyPayload(editedPayloadHebergement, 'Hébergement')}
                      className="px-3 py-1 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                    >
                      📋 Copier
                    </button>
                  </div>
                </div>
                <textarea
                  value={editedPayloadHebergement}
                  onChange={(e) => setEditedPayloadHebergement(e.target.value)}
                  className="w-full h-64 px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Payload Ménage */}
              <div>
                <div className="flex justify-between mb-2">
                  <h3 className="text-lg font-semibold">🧹 Payload Ménage</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResetToGenerated('checklist')}
                      className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      ↻ Reset
                    </button>
                    <button
                      onClick={() => handleCopyPayload(editedPayloadChecklist, 'Ménage')}
                      className="px-3 py-1 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                    >
                      📋 Copier
                    </button>
                  </div>
                </div>
                <textarea
                  value={editedPayloadChecklist}
                  onChange={(e) => setEditedPayloadChecklist(e.target.value)}
                  className="w-full h-64 px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Stats */}
              {payloadChecklist && (
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Total sections générées</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {payloadChecklist.checklists?.length || 0}
                  </p>
                </div>
              )}
            </div>
          )}

          {!selectedFiche && (
            <div className="text-center py-12 text-gray-500">
              Sélectionnez une fiche pour générer les payloads
            </div>
          )}
        </div>

        {/* SECTION 3: TEST */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            4. 🚀 Test API
          </h2>

          {selectedFiche ? (
            <div className="space-y-4">
              <button
                onClick={sendToAPI}
                disabled={sending || !editedPayloadHebergement}
                className={`w-full py-3 rounded-lg font-semibold text-white ${sending || !editedPayloadHebergement
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                  }`}
              >
                {sending ? '⏳ Envoi...' : '🚀 Envoyer'}
              </button>

              {/* Historique */}
              {testHistory.length > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between mb-3">
                    <h3 className="text-lg font-semibold">📊 Historique (5 derniers)</h3>
                    <button onClick={clearHistory} className="text-sm text-red-600 hover:text-red-700">
                      🗑️ Effacer
                    </button>
                  </div>

                  <div className="space-y-3">
                    {testHistory.map((test, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">{test.fiche}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(test.timestamp).toLocaleString('fr-FR')}
                          </span>
                        </div>

                        {test.results.map((result, ridx) => (
                          <div
                            key={ridx}
                            className={`p-3 rounded-lg mb-2 ${result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                              }`}
                          >
                            <div className="flex justify-between">
                              <span className={`text-sm font-semibold ${result.ok ? 'text-green-900' : 'text-red-900'}`}>
                                {result.ok ? '✅' : '❌'} {result.endpoint}
                              </span>
                              <span className="text-xs text-gray-600">
                                {result.status} {result.statusText}
                              </span>
                            </div>

                            {result.extractedId && (
                              <p className="text-xs text-gray-700 mt-1">
                                ID: <strong>{result.extractedId}</strong>
                              </p>
                            )}

                            {result.extractedMessage && (
                              <p className="text-xs text-gray-700 mt-1">{result.extractedMessage}</p>
                            )}

                            {result.body && typeof result.body === 'object' && (
                              <details className="mt-2">
                                <summary className="text-xs text-gray-600 cursor-pointer">
                                  Réponse complète
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-900 text-green-400 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(result.body, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Sélectionnez une fiche
            </div>
          )}
        </div>
        {/* Séparateur */}
        <div className="my-6 border-t border-gray-300"></div>

        {/* Section Suppression */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">🗑️ Supprimer un logement</h3>

          <input
            type="text"
            placeholder="Property ID (requis)"
            value={deletePropertyId}
            onChange={(e) => setDeletePropertyId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />

          <input
            type="text"
            placeholder="Checklist ID (optionnel)"
            value={deleteChecklistId}
            onChange={(e) => setDeleteChecklistId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />

          <button
            onClick={deleteProperty}
            disabled={sending || !deletePropertyId.trim()}
            className={`w-full py-2 rounded-lg font-semibold text-white ${sending || !deletePropertyId.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
              }`}
          >
            {sending ? '⏳ Suppression...' : '🗑️ Supprimer le logement'}
          </button>
        </div>
      </div>
    </div>
  )
}