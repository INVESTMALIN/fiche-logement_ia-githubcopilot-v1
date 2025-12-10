// src/pages/SimulationLoomky.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabaseClient'

const STORAGE_KEY = 'loomky_api_config'
const HISTORY_KEY = 'loomky_test_history'

export default function SimulationLoomky() {
  const { user } = useAuth()
  
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

  // Régénérer le payload combiné quand on switch le mode
    useEffect(() => {
    if (apiConfig.useSinglePayload && payloadHebergement && payloadChecklist) {
        const combined = {
        hebergement: payloadHebergement,
        checklist: payloadChecklist
        }
        setEditedPayloadHebergement(JSON.stringify(combined, null, 2))
    } else if (!apiConfig.useSinglePayload && payloadHebergement) {
        // Remettre juste l'hébergement si on repasse en mode séparé
        setEditedPayloadHebergement(JSON.stringify(payloadHebergement, null, 2))
    }
    }, [apiConfig.useSinglePayload, payloadHebergement, payloadChecklist])

  const resetPayloads = () => {
    setSelectedFiche(null)
    setPayloadHebergement(null)
    setPayloadChecklist(null)
    setEditedPayloadHebergement('')
    setEditedPayloadChecklist('')
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

  const generatePayloads = (fiche) => {
    // Payload Hébergement
    const hebergement = {
      numero_bien: fiche.logement_numero_bien || null,
      nom: fiche.nom || null,
      type_propriete: fiche.logement_type_propriete || null,
      surface: fiche.logement_surface || null,
      
      adresse: {
        rue: fiche.logement_adresse_rue || null,
        complement: fiche.logement_adresse_complement || null,
        ville: fiche.logement_adresse_ville || null,
        code_postal: fiche.logement_adresse_code_postal || null
      },
      
      capacite: {
        nombre_chambres: fiche.logement_nombre_chambres || null,
        nombre_personnes_max: fiche.logement_nombre_personnes_max || null,
        nombre_lits: fiche.logement_nombre_lits || null,
        typologie: fiche.logement_typologie || null
      },
      
      equipements: {
        wifi: fiche.equipements_wifi_disponible || false,
        parking: fiche.equipements_parking_disponible || false,
        lave_linge: fiche.salle_de_bains_salle_de_bain_1_equipements_lave_linge || false,
        seche_linge: fiche.equipements_seche_linge || false,
        lave_vaisselle: fiche.cuisine_1_lave_vaisselle || false,
        jacuzzi: fiche.equip_spe_ext_jacuzzi_disponible || false,
        piscine: fiche.equip_spe_ext_piscine_disponible || false,
        barbecue: fiche.equip_spe_ext_barbecue_disponible || false,
        climatisation: fiche.equipements_climatisation_disponible || false,
        chauffage: fiche.equipements_chauffage_disponible || false
      }
    }
    
    // Payload Checklist
    const checklist = {
      sections_standard: [
        {
          nom: "Entrée",
          ordre: 1,
          items: ["Vue d'ensemble entrée (murs + sols)", "Porte d'entrée"]
        },
        {
          nom: "Salon",
          ordre: 2,
          items: [
            "Vue d'ensemble (murs + sols)",
            "Canapé",
            "Table basse",
            "Climatisation / Chauffage",
            "Télévision + télécommande"
          ]
        },
        {
          nom: "Salle à manger",
          ordre: 3,
          items: [
            "Vue d'ensemble (murs + sols)",
            "Table + chaises",
            "Climatisation / Chauffage"
          ]
        },
        {
          nom: "Cuisine",
          ordre: 4,
          items: [
            "Vue d'ensemble cuisine",
            "Plan de travail",
            "Plaque de cuisson",
            "Évier",
            "Hotte",
            "Frigo",
            "Congélateur",
            "Poubelle avec sac propre"
          ]
        },
        {
          nom: "Chambre",
          ordre: 5,
          items: [
            "Vue d'ensemble",
            "Lits faits + serviettes",
            "Dessous de lits",
            "Climatisation / Chauffage"
          ]
        },
        {
          nom: "Salle de bain",
          ordre: 6,
          items: [
            "Vue d'ensemble",
            "Douche / baignoire",
            "Lavabo + robinet",
            "Poubelle avec sac propre"
          ]
        },
        {
          nom: "WC",
          ordre: 7,
          items: [
            "Vue d'ensemble",
            "Abattant",
            "Lunette",
            "Intérieur des WC",
            "2 rouleaux papier toilette"
          ]
        }
      ],
      sections_conditionnelles: []
    }
    
    // Sections conditionnelles
    if (fiche.equip_spe_ext_jacuzzi_disponible || fiche.equip_spe_ext_piscine_disponible || fiche.equip_spe_ext_barbecue_disponible) {
      const itemsExt = []
      if (fiche.equip_spe_ext_jacuzzi_disponible) itemsExt.push("Jacuzzi (nettoyage + fonctionnement)")
      if (fiche.equip_spe_ext_piscine_disponible) itemsExt.push("Piscine (intérieur + rebords)")
      if (fiche.equip_spe_ext_barbecue_disponible) itemsExt.push("Barbecue / Plancha")
      
      checklist.sections_conditionnelles.push({
        nom: "Extérieurs",
        ordre: 10,
        condition: "jacuzzi || piscine || barbecue",
        items: itemsExt
      })
    }
    
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
    setSending(true)
    const results = []

    try {
      const hebergementParsed = validateJSON(editedPayloadHebergement)
      const checklistParsed = validateJSON(editedPayloadChecklist)

      if (!hebergementParsed.valid) {
        alert(`❌ JSON Hébergement invalide: ${hebergementParsed.error}`)
        setSending(false)
        return
      }

      if (!apiConfig.useSinglePayload && !checklistParsed.valid) {
        alert(`❌ JSON Checklist invalide: ${checklistParsed.error}`)
        setSending(false)
        return
      }

    // Construction des headers
    const headers = { 'Content-Type': 'application/json' }

    // Auth
    if (apiConfig.authType === 'api_key' && apiConfig.apiKey) {
    headers['X-API-Key'] = apiConfig.apiKey
    } else if (apiConfig.authType === 'oauth' && apiConfig.oauthToken) {
    headers['Authorization'] = `Bearer ${apiConfig.oauthToken}`
    }

    // Headers personnalisés
    apiConfig.customHeaders.forEach(header => {
    if (header.name && header.value) {
        headers[header.name] = header.value
    }
    })

    // Construction de l'URL avec query params
    const buildUrlWithParams = (baseUrl) => {
    if (apiConfig.queryParams.length === 0) return baseUrl
    
    const params = new URLSearchParams()
    apiConfig.queryParams.forEach(param => {
        if (param.name && param.value) {
        params.append(param.name, param.value)
        }
    })
    
    return `${baseUrl}?${params.toString()}`
    }

      // Payload unique
      if (apiConfig.useSinglePayload) {
        if (!apiConfig.endpointHebergement) {
          alert('❌ Endpoint manquant')
          setSending(false)
          return
        }

        const combined = {
          hebergement: hebergementParsed.data,
          checklist: checklistParsed.valid ? checklistParsed.data : null
        }

        const response = await fetch(buildUrlWithParams(apiConfig.endpointHebergement), {
            method: 'POST',
            headers,
            body: JSON.stringify(combined)
            })

        results.push(await parseResponse(response, 'Payload unique'))
      } 
      // 2 payloads séparés
      else {
        if (apiConfig.endpointHebergement) {
          const respHeberg = await fetch(buildUrlWithParams(apiConfig.endpointHebergement), {
            method: 'POST',
            headers,
            body: JSON.stringify(hebergementParsed.data)
            })
          results.push(await parseResponse(respHeberg, 'Hébergement'))
        }

        if (apiConfig.endpointChecklist) {
          const respChecklist = await fetch(buildUrlWithParams(apiConfig.endpointChecklist), {
            method: 'POST',
            headers,
            body: JSON.stringify(checklistParsed.data)
            })
          results.push(await parseResponse(respChecklist, 'Checklist'))
        }
      }

      // Historique
      const newHistory = [
        {
          timestamp: new Date().toISOString(),
          fiche: selectedFiche?.nom || selectedFiche?.logement_numero_bien || 'Sans nom',
          results
        },
        ...testHistory
      ].slice(0, 5)
      
      setTestHistory(newHistory)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))

    } catch (error) {
      alert(`❌ Erreur: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const parseResponse = async (response, endpoint) => {
    const result = {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      timestamp: new Date().toLocaleTimeString('fr-FR')
    }

    try {
      const text = await response.text()
      if (text) {
        try {
          const json = JSON.parse(text)
          result.body = json
          if (json.id) result.extractedId = json.id
          if (json.message) result.extractedMessage = json.message
          if (json.success !== undefined) result.extractedSuccess = json.success
        } catch {
          result.body = text
        }
      }
    } catch (e) {
      result.body = 'Pas de réponse'
    }

    return result
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

        {/* SECTION 1: CONFIG API */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ⚙️ Configuration API
          </h2>

          <div className="space-y-4">
{/* Type auth - 3 OPTIONS */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-3">
    Type d'authentification
  </label>
  <div className="grid grid-cols-3 gap-4">
    {/* Carte Pas d'auth */}
    <button
      type="button"
      onClick={() => setApiConfig({ ...apiConfig, authType: 'none' })}
      className={`relative p-6 rounded-xl border-2 transition-all ${
        apiConfig.authType === 'none'
          ? 'border-gray-500 bg-gray-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="text-center">
        <div className={`text-4xl mb-3 ${
          apiConfig.authType === 'none' ? 'opacity-100' : 'opacity-50'
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
      className={`relative p-6 rounded-xl border-2 transition-all ${
        apiConfig.authType === 'api_key'
          ? 'border-indigo-500 bg-indigo-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="text-center">
        <div className={`text-4xl mb-3 ${
          apiConfig.authType === 'api_key' ? 'opacity-100' : 'opacity-50'
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
      className={`relative p-6 rounded-xl border-2 transition-all ${
        apiConfig.authType === 'oauth'
          ? 'border-purple-500 bg-purple-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="text-center">
        <div className={`text-4xl mb-3 ${
          apiConfig.authType === 'oauth' ? 'opacity-100' : 'opacity-50'
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

            {/* Mode payload */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={apiConfig.useSinglePayload}
                  onChange={(e) => setApiConfig({ ...apiConfig, useSinglePayload: e.target.checked })}
                  className="mr-3 h-5 w-5"
                />
                <div>
                  <span className="text-sm font-medium">Payload unique</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Décocher si 2 endpoints séparés
                  </p>
                </div>
              </label>
            </div>

            {/* Endpoints */}
            {apiConfig.useSinglePayload ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endpoint API
                </label>
                <input
                  type="text"
                  value={apiConfig.endpointHebergement}
                  onChange={(e) => setApiConfig({ ...apiConfig, endpointHebergement: e.target.value })}
                  placeholder="https://api.loomky.com/v1/logements"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endpoint Hébergement
                  </label>
                  <input
                    type="text"
                    value={apiConfig.endpointHebergement}
                    onChange={(e) => setApiConfig({ ...apiConfig, endpointHebergement: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endpoint Checklist
                  </label>
                  <input
                    type="text"
                    value={apiConfig.endpointChecklist}
                    onChange={(e) => setApiConfig({ ...apiConfig, endpointChecklist: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
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
            📝 Sélection Fiche & Payloads
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
            {/* CAS 1: Payload unique combiné */}
            {apiConfig.useSinglePayload ? (
                <div>
                <div className="flex justify-between mb-2">
                    <h3 className="text-lg font-semibold">🏠 Payload combiné (Hébergement + Ménage)</h3>
                    <div className="flex gap-2">
                    <button
                        onClick={() => {
                        const combined = {
                            hebergement: payloadHebergement,
                            checklist: payloadChecklist
                        }
                        setEditedPayloadHebergement(JSON.stringify(combined, null, 2))
                        }}
                        className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        ↻ Reset
                    </button>
                    <button
                        onClick={() => handleCopyPayload(editedPayloadHebergement, 'Combiné')}
                        className="px-3 py-1 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                    >
                        📋 Copier
                    </button>
                    </div>
                </div>
                <textarea
                    value={editedPayloadHebergement}
                    onChange={(e) => setEditedPayloadHebergement(e.target.value)}
                    className="w-full h-96 px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                />
                </div>
            ) : (
                /* CAS 2: Deux payloads séparés */
                <>
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
                </>
            )}

            {/* Stats */}
            {payloadChecklist && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-indigo-50 rounded-lg">
                <div>
                    <p className="text-sm text-gray-600">Sections standard</p>
                    <p className="text-2xl font-bold text-indigo-600">
                    {payloadChecklist.sections_standard?.length || 0}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Sections conditionnelles</p>
                    <p className="text-2xl font-bold text-indigo-600">
                    {payloadChecklist.sections_conditionnelles?.length || 0}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Items totaux</p>
                    <p className="text-2xl font-bold text-indigo-600">
                    {(payloadChecklist.sections_standard?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0) + 
                    (payloadChecklist.sections_conditionnelles?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0)}
                    </p>
                </div>
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
            🚀 Test API
          </h2>

          {selectedFiche ? (
            <div className="space-y-4">
              <button
                onClick={sendToAPI}
                disabled={sending || !editedPayloadHebergement}
                className={`w-full py-3 rounded-lg font-semibold text-white ${
                  sending || !editedPayloadHebergement
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
                            className={`p-3 rounded-lg mb-2 ${
                              result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
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