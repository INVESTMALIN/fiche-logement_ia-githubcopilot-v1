// src/pages/SimulationLoomky.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function SimulationLoomky() {
  const { user } = useAuth()
  const [fiches, setFiches] = useState([])
  const [selectedFicheId, setSelectedFicheId] = useState('')
  const [selectedFiche, setSelectedFiche] = useState(null)
  const [loomkyPayload, setLoomkyPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [apiResponse, setApiResponse] = useState(null)
  const [sending, setSending] = useState(false)

  // Charger la liste des fiches au montage
  useEffect(() => {
    loadFiches()
  }, [])

  // Quand la fiche sélectionnée change, la charger
  useEffect(() => {
    if (selectedFicheId) {
      loadFicheComplete()
    } else {
      setSelectedFiche(null)
      setLoomkyPayload(null)
    }
  }, [selectedFicheId])

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
      generateLoomkyPayload(data)
    } catch (error) {
      console.error('Erreur chargement fiche complète:', error)
      alert('Erreur lors du chargement de la fiche')
    } finally {
      setLoading(false)
    }
  }

  const generateLoomkyPayload = (fiche) => {
    // Générer le JSON pour l'API Loomky
    const payload = {
      // === INFOS DE BASE ===
      numero_bien: fiche.logement_numero_bien || null,
      nom: fiche.nom || null,
      type_propriete: fiche.logement_type_propriete || null,
      surface: fiche.logement_surface || null,
      
      // === ADRESSE ===
      adresse: {
        rue: fiche.logement_adresse_rue || null,
        complement: fiche.logement_adresse_complement || null,
        ville: fiche.logement_adresse_ville || null,
        code_postal: fiche.logement_adresse_code_postal || null
      },
      
      // === CAPACITÉ ===
      nombre_chambres: fiche.logement_nombre_chambres || null,
      nombre_personnes_max: fiche.logement_nombre_personnes_max || null,
      nombre_lits: fiche.logement_nombre_lits || null,
      typologie: fiche.logement_typologie || null,
      
      // === ÉQUIPEMENTS ===
      equipements: {
        // Wifi
        wifi: fiche.equipements_wifi_disponible || false,
        
        // Parking
        parking: fiche.equipements_parking_disponible || false,
        
        // Électroménager
        lave_linge: fiche.salle_de_bains_salle_de_bain_1_equipements_lave_linge || false,
        seche_linge: fiche.equipements_seche_linge || false,
        lave_vaisselle: fiche.cuisine_1_lave_vaisselle || false,
        
        // Extérieurs
        jacuzzi: fiche.equip_spe_ext_jacuzzi_disponible || false,
        piscine: fiche.equip_spe_ext_piscine_disponible || false,
        barbecue: fiche.equip_spe_ext_barbecue_disponible || false,
        
        // Autres
        climatisation: fiche.equipements_climatisation_disponible || false,
        chauffage: fiche.equipements_chauffage_disponible || false
      },
      
      // === CHECKLIST (structure basée sur le doc Victoria) ===
      checklist: {
        sections_standard: [
          {
            nom: "Entrée",
            items: ["Vue d'ensemble entrée (murs + sols)", "Porte d'entrée"]
          },
          {
            nom: "Salon",
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
            items: [
              "Vue d'ensemble (murs + sols)",
              "Table + chaises",
              "Climatisation / Chauffage"
            ]
          },
          {
            nom: "Cuisine",
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
            items: [
              "Vue d'ensemble",
              "Lits faits + serviettes",
              "Dessous de lits",
              "Climatisation / Chauffage"
            ]
          },
          {
            nom: "Salle de bain",
            items: [
              "Vue d'ensemble",
              "Douche / baignoire",
              "Lavabo + robinet",
              "Poubelle avec sac propre"
            ]
          },
          {
            nom: "WC",
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
    }
    
    // Ajouter sections conditionnelles selon équipements
    if (fiche.equip_spe_ext_jacuzzi_disponible || fiche.equip_spe_ext_piscine_disponible || fiche.equip_spe_ext_barbecue_disponible) {
      payload.checklist.sections_conditionnelles.push({
        nom: "Extérieurs",
        condition: "jacuzzi || piscine || barbecue",
        items: []
      })
      
      if (fiche.equip_spe_ext_jacuzzi_disponible) {
        payload.checklist.sections_conditionnelles[0].items.push("Jacuzzi (nettoyage + fonctionnement)")
      }
      if (fiche.equip_spe_ext_piscine_disponible) {
        payload.checklist.sections_conditionnelles[0].items.push("Piscine (intérieur + rebords)")
      }
      if (fiche.equip_spe_ext_barbecue_disponible) {
        payload.checklist.sections_conditionnelles[0].items.push("Barbecue / Plancha")
      }
    }
    
    setLoomkyPayload(payload)
  }

  const sendToWebhook = async () => {
    if (!webhookUrl) {
      alert('Veuillez coller une URL webhook.site')
      return
    }

    if (!loomkyPayload) {
      alert('Aucun payload à envoyer. Sélectionnez une fiche d\'abord.')
      return
    }

    setSending(true)
    setApiResponse(null)

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test_api_key_simulation'
        },
        body: JSON.stringify(loomkyPayload)
      })

      const responseData = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString()
      }

      // Essayer de récupérer le body de la réponse
      try {
        const textResponse = await response.text()
        if (textResponse) {
          try {
            responseData.body = JSON.parse(textResponse)
          } catch {
            responseData.body = textResponse
          }
        }
      } catch (e) {
        responseData.body = 'Pas de corps de réponse'
      }

      setApiResponse(responseData)

      if (response.ok) {
        alert('✅ Envoi réussi ! Vérifie webhook.site pour voir la requête.')
      } else {
        alert(`⚠️ Réponse HTTP ${response.status}. Vérifie les détails ci-dessous.`)
      }

    } catch (error) {
      setApiResponse({
        error: true,
        message: error.message,
        timestamp: new Date().toISOString()
      })
      alert(`❌ Erreur d'envoi : ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔬 Simulation API Loomky
          </h1>
          <p className="text-gray-600">
            Environnement de test pour préparer l'intégration avec Loomky
          </p>
        </div>

        {/* Sélection de la fiche */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            1️⃣ Sélectionner une fiche
          </h2>
          
          {loading ? (
            <p className="text-gray-500">Chargement des fiches...</p>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choisir une fiche de test
              </label>
              <select
                value={selectedFicheId}
                onChange={(e) => setSelectedFicheId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">-- Sélectionner une fiche --</option>
                {fiches.map((fiche) => (
                  <option key={fiche.id} value={fiche.id}>
                    {fiche.logement_numero_bien || 'Sans numéro'} - {fiche.nom} ({fiche.statut})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Zone JSON généré */}
        {loomkyPayload && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              2️⃣ Payload JSON pour Loomky
            </h2>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">
                  Format prêt à envoyer à l'API Loomky
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(loomkyPayload, null, 2))
                    alert('JSON copié dans le presse-papier !')
                  }}
                  className="px-3 py-1 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                >
                  📋 Copier
                </button>
              </div>
              
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(loomkyPayload, null, 2)}
              </pre>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 bg-indigo-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Sections standard</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {loomkyPayload.checklist.sections_standard.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Sections conditionnelles</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {loomkyPayload.checklist.sections_conditionnelles.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Items totaux</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {loomkyPayload.checklist.sections_standard.reduce((acc, s) => acc + s.items.length, 0) + 
                   loomkyPayload.checklist.sections_conditionnelles.reduce((acc, s) => acc + s.items.length, 0)}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loomkyPayload && selectedFicheId && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              2️⃣ Payload JSON pour Loomky
            </h2>
            <p className="text-gray-500">
              {loading ? 'Génération du JSON...' : 'Sélectionnez une fiche ci-dessus'}
            </p>
          </div>
        )}

        {/* Zone à venir : Envoi API */}
        {loomkyPayload && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              3️⃣ Tester l'envoi API
            </h2>
            
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>📘 Instructions :</strong>
                </p>
                <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                  <li>Va sur <a href="https://webhook.site" target="_blank" rel="noopener noreferrer" className="underline font-semibold">webhook.site</a></li>
                  <li>Copie ton URL unique (ex: https://webhook.site/xxx-xxx-xxx)</li>
                  <li>Colle-la ci-dessous</li>
                  <li>Clique "Envoyer" et vérifie la requête sur webhook.site</li>
                </ol>
              </div>

              {/* Input URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Webhook de test
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://webhook.site/xxx-xxx-xxx"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Bouton envoi */}
              <button
                onClick={sendToWebhook}
                disabled={sending || !webhookUrl}
                className={`w-full py-3 rounded-lg font-semibold text-white transition ${
                  sending || !webhookUrl
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                }`}
              >
                {sending ? '⏳ Envoi en cours...' : '🚀 Envoyer vers API de test'}
              </button>

              {/* Réponse API */}
              {apiResponse && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    📨 Réponse de l'API
                  </h3>
                  
                  <div className={`p-4 rounded-lg mb-4 ${
                    apiResponse.error 
                      ? 'bg-red-50 border border-red-200' 
                      : apiResponse.ok 
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    {apiResponse.error ? (
                      <>
                        <p className="text-red-900 font-semibold">❌ Erreur</p>
                        <p className="text-red-800 text-sm mt-1">{apiResponse.message}</p>
                      </>
                    ) : (
                      <>
                        <p className={`font-semibold ${apiResponse.ok ? 'text-green-900' : 'text-yellow-900'}`}>
                          {apiResponse.ok ? '✅' : '⚠️'} Status: {apiResponse.status} {apiResponse.statusText}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          {apiResponse.timestamp}
                        </p>
                      </>
                    )}
                  </div>

                  {apiResponse.body && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Corps de la réponse :</p>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                        {typeof apiResponse.body === 'string' 
                          ? apiResponse.body 
                          : JSON.stringify(apiResponse.body, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!loomkyPayload && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-50">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              3️⃣ Tester l'envoi API
            </h2>
            <p className="text-gray-500">
              Sélectionnez d'abord une fiche pour générer le payload
            </p>
          </div>
        )}
      </div>
    </div>
  )
}