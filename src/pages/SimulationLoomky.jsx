// src/pages/SimulationLoomky.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabaseClient'

const STORAGE_KEY = 'loomky_api_config'
const HISTORY_KEY = 'loomky_test_history'

export default function SimulationLoomky() {
  const { user } = useAuth()

  // === NOUVEAUX ÉTATS POUR AUTH LOOMKY ===
  const [loomkyEmail, setLoomkyEmail] = useState('')
  const [loomkyPassword, setLoomkyPassword] = useState('')
  const [loomkyToken, setLoomkyToken] = useState(null)
  const [loomkyAuthStatus, setLoomkyAuthStatus] = useState('disconnected') // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [loomkyAuthError, setLoomkyAuthError] = useState(null)
  const [loomkyUserInfo, setLoomkyUserInfo] = useState(null)

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

    // Charger token Loomky si existant
    const savedToken = localStorage.getItem('loomky_jwt')
    const savedUserInfo = localStorage.getItem('loomky_user_info')
    if (savedToken && savedUserInfo) {
      try {
        setLoomkyToken(savedToken)
        setLoomkyUserInfo(JSON.parse(savedUserInfo))
        setLoomkyAuthStatus('connected')
      } catch (e) {
        console.error('Erreur chargement token Loomky:', e)
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
  const LOOMKY_BASE_URL = 'https://api.loomky.com'

  // === FONCTION AUTHENTIFICATION LOOMKY ===
  const handleLoomkyLogin = async () => {
    if (!loomkyEmail || !loomkyPassword) {
      alert('⚠️ Veuillez remplir email et mot de passe')
      return
    }

    setLoomkyAuthStatus('connecting')
    setLoomkyAuthError(null)

    try {
      const response = await fetch(`${LOOMKY_BASE_URL}/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: loomkyEmail,
          password: loomkyPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Erreur ${response.status}`)
      }

      // Succès : extraire le token et les infos user
      setLoomkyToken(data.token.token)
      setLoomkyUserInfo({
        firstName: data.token.userFirstName,
        accountName: data.token.accountName,
        role: data.token.userRole
      })
      setLoomkyAuthStatus('connected')

      // Sauvegarder token dans localStorage
      localStorage.setItem('loomky_jwt', data.token.token)
      localStorage.setItem('loomky_user_info', JSON.stringify({
        firstName: data.token.userFirstName,
        accountName: data.token.accountName,
        role: data.token.userRole
      }))

    } catch (error) {
      console.error('Erreur authentification Loomky:', error)
      setLoomkyAuthError(error.message)
      setLoomkyAuthStatus('error')
    }
  }

  const handleLoomkyLogout = () => {
    setLoomkyToken(null)
    setLoomkyUserInfo(null)
    setLoomkyAuthStatus('disconnected')
    setLoomkyAuthError(null)
    setLoomkyPassword('')
    localStorage.removeItem('loomky_jwt')
    localStorage.removeItem('loomky_user_info')
  }

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

    // Salon
    checklists.push({
      name: "Salon",
      tasks: [
        { name: "Vue d'ensemble (murs + sols)", description: "Vérifier la propreté générale" },
        { name: "Canapé", description: "Nettoyer et aspirer" },
        { name: "Table basse", description: "Dépoussiérer" }
      ],
      required: true,
      beforePhotosRequired: true,
      afterPhotosRequired: true
    })

    // Cuisine
    checklists.push({
      name: "Cuisine",
      tasks: [
        { name: "Plan de travail", description: "Nettoyer et désinfecter" },
        { name: "Évier", description: "Nettoyer et faire briller" },
        { name: "Frigo", description: "Nettoyer intérieur et extérieur" },
        { name: "Poubelle avec sac propre", description: "Vider et mettre un nouveau sac" }
      ],
      required: true,
      beforePhotosRequired: true,
      afterPhotosRequired: true
    })

    // === SECTIONS CONDITIONNELLES ===

    // Jacuzzi (si disponible)
    if (fiche.equip_spe_ext_dispose_jacuzzi) {
      checklists.push({
        name: "Jacuzzi",
        tasks: [
          { name: "Nettoyage complet", description: "Nettoyer parois et fond" },
          { name: "Vérification fonctionnement", description: "Tester jets et température" }
        ],
        required: true,
        beforePhotosRequired: true,
        afterPhotosRequired: true
      })
    }

    // Piscine (si disponible)
    if (fiche.equip_spe_ext_dispose_piscine) {
      checklists.push({
        name: "Piscine",
        tasks: [
          { name: "Intérieur piscine", description: "Nettoyer parois et ligne d'eau" },
          { name: "Rebords", description: "Nettoyer margelles" }
        ],
        required: true,
        beforePhotosRequired: true,
        afterPhotosRequired: true
      })
    }

    return { checklists }
  }

  const mapTypeToLoomky = (typePropriete) => {
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
      checkin: {
        from: "N/A",
        to: "N/A"
      },
      checkout: {
        from: "N/A",
        to: "N/A"
      },
      surfaceArea: fiche.logement_surface || null,
      defaultOccupancy: fiche.logement_nombre_personnes_max ? parseInt(fiche.logement_nombre_personnes_max) : null,
      numberOfRooms: fiche.visite_nombre_chambres ? parseInt(fiche.visite_nombre_chambres) : null,
      numberOfBathrooms: fiche.visite_nombre_salles_bains ? parseInt(fiche.visite_nombre_salles_bains) : null,
      defaultRate: null,
      timezone: "Europe/Paris",
      ...calculateBedCounts(fiche),
      coordinates: {
        latitude: null,
        longitude: null
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
      const hebergementResponse = await fetch(apiConfig.endpointHebergement || 'https://api.loomky.com/v1/properties', {
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

      // Récupérer propertyId
      // Récupérer propertyId avec guard
      propertyId = hebergementData._id

      if (!hebergementResponse.ok || !propertyId) {
        const errorMsg = hebergementData?.message || hebergementResponse.statusText || 'Erreur inconnue'
        throw new Error(`❌ Création de la propriété Loomky échouée (${hebergementResponse.status}): ${errorMsg}. Les checklists n'ont pas été envoyées.`)
      }

      // === 2️⃣ ENVOI CHECKLISTS ===
      if (payloadChecklist?.checklists) {
        const checklistEndpoint = `${apiConfig.endpointChecklist || 'https://api.loomky.com/v1/properties'}/${propertyId}/cleaning-checklists`

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
          extractedMessage: checklistData.message || null
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

        {/* SECTION 0: AUTHENTIFICATION LOOMKY */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            1. 🔑 Authentification Loomky
          </h2>

          {loomkyAuthStatus === 'disconnected' || loomkyAuthStatus === 'error' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Connectez-vous à l'API Loomky pour obtenir votre token JWT
              </p>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Loomky
                </label>
                <input
                  type="email"
                  value={loomkyEmail}
                  onChange={(e) => setLoomkyEmail(e.target.value)}
                  placeholder="contact@example.fr"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={loomkyPassword}
                  onChange={(e) => setLoomkyPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Erreur */}
              {loomkyAuthError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    ❌ <strong>Erreur :</strong> {loomkyAuthError}
                  </p>
                </div>
              )}

              {/* Bouton connexion */}
              <button
                onClick={handleLoomkyLogin}
                disabled={loomkyAuthStatus === 'connecting'}
                className={`w-full py-3 rounded-lg font-semibold text-white transition ${loomkyAuthStatus === 'connecting'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                  }`}
              >
                {loomkyAuthStatus === 'connecting' ? '⏳ Connexion en cours...' : '🔐 Se connecter à Loomky'}
              </button>
            </div>
          ) : (
            // État connecté
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-900 font-semibold mb-2">
                  ✅ Connecté à Loomky
                </p>
                <div className="text-sm text-green-800 space-y-1">
                  <p><strong>Nom :</strong> {loomkyUserInfo?.firstName}</p>
                  <p><strong>Compte :</strong> {loomkyUserInfo?.accountName}</p>
                  <p><strong>Rôle :</strong> {loomkyUserInfo?.role}</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-2">Token JWT (tronqué) :</p>
                <code className="text-xs text-gray-800 break-all">
                  {loomkyToken?.substring(0, 50)}...
                </code>
              </div>

              <button
                onClick={handleLoomkyLogout}
                className="w-full py-2 rounded-lg font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition"
              >
                🚪 Se déconnecter
              </button>
            </div>
          )}
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
                placeholder="https://api.loomky.com/v1/properties"
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
      </div>
    </div>
  )
}