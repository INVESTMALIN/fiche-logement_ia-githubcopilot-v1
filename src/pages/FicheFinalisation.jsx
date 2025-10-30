// src/pages/FicheFinalisation.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PDFUpload from '../components/PDFUpload'
import MiniDashboard from '../components/MiniDashboard'
import { prepareForN8nWebhook } from '../lib/PdfFormatter'
import { CheckCircle, PenTool, Send, Bot, Copy, AlertCircle, Sparkles, Loader2 } from 'lucide-react'

export default function FicheFinalisation() {
  const navigate = useNavigate()
  const [showFinalModal, setShowFinalModal] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [currentInput, setCurrentInput] = useState('')
  const [annonceLoading, setAnnonceLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const annonceSessionIdRef = useRef(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, annonceLoading])
  
  const { 
    back, 
    currentStep,
    formData,
    updateField,
    handleSave,
    saveStatus,
    finaliserFiche
  } = useForm()

  useEffect(() => {
    if (!annonceSessionIdRef.current && formData) {
      const ficheId = formData.id || formData.nom || 'nouvelle_fiche'
      const slug = String(ficheId).toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '')
      annonceSessionIdRef.current = `fiche_${slug}_annonce`
    }
  }, [formData])

  const sendMessage = async (message) => {
    if (!message.trim()) return
    
    const userMessage = { role: 'user', content: message }
    setChatMessages(prev => [...prev, userMessage])
    setCurrentInput('')
  
    try {
      setAnnonceLoading(true)
      
      const ficheDataForAI = prepareForN8nWebhook(formData)

      const requestBody = {
        message: message,
        sessionId: annonceSessionIdRef.current,
        ficheData: ficheDataForAI
      }
      
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)
      
      const response = await fetch('https://hub.cardin.cloud/webhook/d9187cd4-1fd5-4ecd-afe0-125924773f69/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestBody,
          numero_bien: formData.section_logement?.numero_bien || null
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeout)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const responseText = await response.text()
      console.log('🔍 Réponse Annonce webhook:', responseText)

      if (!responseText || responseText.trim() === '') {
        throw new Error('Le webhook n\'a renvoyé aucune donnée')
      }

      const responseData = JSON.parse(responseText)
      const data = Array.isArray(responseData) ? responseData[0] : responseData
      const content = data.data?.output || data.output || 'Réponse indisponible.'

      const botMessage = { 
        role: 'assistant', 
        content: content
      }
      
      setChatMessages(prev => [...prev, botMessage])
      
    } catch (error) {
      console.error('Erreur création annonce:', error)
      
      let errorMessage = 'Erreur lors de la génération. Merci de réessayer.'
      
      if (error.name === 'AbortError') {
        errorMessage = 'La génération a pris trop de temps. Vérifiez votre connexion et réessayez.'
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage = 'Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.'
      }
      
      const errorMsg = { 
        role: 'assistant', 
        content: errorMessage
      }
      setChatMessages(prev => [...prev, errorMsg])
    } finally {
      setAnnonceLoading(false)
    }
  }

  const handleGenererAnnonce = async () => {
    const prompt = "Crée une annonce attractive pour ce logement basée sur l'inspection réalisée"
    await sendMessage(prompt)
  }

  const handleCopyMessage = (content, index) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
      })
      .catch(() => {
        // Fail silencieux
      })
  }

  const handleFinaliser = async () => {
    await handleSave()
    await finaliserFiche()
    setShowFinalModal(true)
  }

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Finalisation de l'inspection</h1>

            {/* MINI DASHBOARD - Aperçu + Alertes */}
            <div className="mb-8">
              <MiniDashboard formData={formData} />
            </div>

            {/* GÉNÉRATION PDF */}
            <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">📄 Génération des fiches PDF</h2>
                <p className="text-gray-600">
                  Générez les fiches logement et ménage au format PDF. 
                  Elles seront automatiquement synchronisées avec le Drive et Monday.
                </p>
              </div>

              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <PDFUpload 
                  formData={formData} 
                  onPDFGenerated={(url) => console.log('PDF généré:', url)} 
                  updateField={updateField}
                  handleSave={handleSave}
                />
              </div>

              {/* Note explicative */}
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg 
                      className="w-5 h-5 text-blue-500 mt-0.5" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </div>
                  <div className="text-sm text-blue-700 leading-relaxed space-y-1">
                    <p>1. Cliquez sur <span className="font-semibold">"Générer la Fiche logement"</span>.</p>
                    <p>Les deux Fiches (logement + ménage) seront générées et synchronisées automatiquement avec le Drive et dans Monday <span className="font-semibold">autant de fois que nécessaire</span>.</p>
                    <p>2. Cliquez ensuite sur <span className="font-semibold">"Finaliser la fiche"</span> ci-dessous pour compléter cette fiche et synchroniser les photos/vidéos avec le Drive. <strong>⚠️ Attention, cette action est définitive</strong>.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ASSISTANT ANNONCE - Toujours visible */}
            <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <PenTool className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Assistant Annonce</h3>
                  <p className="text-sm text-gray-600">Générez et affinez votre annonce avec l'IA</p>
                </div>
              </div>

                {/* ⚠️ Note de développement */}
                <div className="mb-6 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800 leading-snug">
                    Cet assistant est encore en cours d’amélioration. Certaines fonctions peuvent être limitées ou en phase de test.
                  </p>
                </div>                

              {/* Zone de chat */}
              <div className="space-y-4">
                {chatMessages.length > 0 && (
                  <div className="max-h-80 overflow-y-auto space-y-3 bg-gray-50 rounded-lg p-4">
                    
                {/* Conversation */}
                {chatMessages.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {/* Historique des messages */}
                    <div className="bg-white rounded-lg border max-h-96 overflow-y-auto p-4 space-y-3">
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.role === 'user'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Bouton copier le dernier message (si c'est l'assistant) */}
                    {chatMessages[chatMessages.length - 1]?.role === 'assistant' && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleCopyMessage(chatMessages[chatMessages.length - 1].content, chatMessages.length - 1)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white hover:bg-gray-50 border rounded-lg transition-colors"
                        >
                          {copiedIndex === chatMessages.length - 1 ? (
                            <>
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="text-green-600">Copié !</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copier le dernier message</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                    
                  {/* Loading state */}
                  {annonceLoading && (
                    <div className="flex items-center justify-center gap-3 py-8 mb-4">
                      <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                      <div className="text-center">
                        <p className="font-medium text-gray-900">
                          {chatMessages.length === 0 ? 'Génération en cours...' : 'Envoi en cours...'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {chatMessages.length === 0 
                            ? 'L\'IA génère votre annonce...'
                            : 'Envoi de votre message à l\'assistant'
                          }
                        </p>
                      </div>
                    </div>
                  )}
                  </div>
                )}

                {/* Bouton générer (seulement si pas encore de messages) */}
                {chatMessages.length === 0 && !annonceLoading && (
                  <button
                    onClick={handleGenererAnnonce}
                    disabled={annonceLoading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-5 h-5" />
                    Générer l'annonce
                  </button>
                )}

                {/* Zone de saisie */}
                {chatMessages.length > 0 && (
                <div className="flex gap-2">
                  <textarea
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !annonceLoading) {
                        e.preventDefault()
                        sendMessage(currentInput)
                      }
                    }}
                    placeholder="Demandez une modification ou posez une question... (Maj+Entrée pour aller à la ligne)"
                    disabled={annonceLoading}
                    rows={3}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  <button
                    onClick={() => sendMessage(currentInput)}
                    disabled={annonceLoading || !currentInput.trim()}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      annonceLoading || !currentInput.trim()
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
              {/* Bouton recommencer */}
              {chatMessages.length > 0 && (
                <button
                  onClick={() => {
                    setChatMessages([])
                    setCurrentInput('')
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Recommencer une nouvelle génération
                </button>
              )}
              </div>
            </div>
            

            {/* Messages sauvegarde */}
            {saveStatus.saving && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                ⏳ Sauvegarde en cours...
              </div>
            )}
            {saveStatus.saved && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                ✅ Sauvegardé avec succès !
              </div>
            )}
            {saveStatus.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                ❌ {saveStatus.error}
              </div>
            )}

            {/* Boutons navigation */}
            <div className="mt-6 flex justify-between">
              <Button
                variant="ghost"
                onClick={back}
                disabled={currentStep === 0}
              >
                Retour
              </Button>
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={handleSave}
                  disabled={saveStatus.saving}
                >
                  {saveStatus.saving ? 'Sauvegarde...' : 'Enregistrer'}
                </Button>
                
                <button
                  onClick={handleFinaliser}
                  disabled={saveStatus.saving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#dbae61] hover:bg-[#c49a4f] text-white rounded-lg font-medium transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  <CheckCircle className="w-5 h-5" />
                  Finaliser la fiche
                </button>
              </div>
            </div>
            <div className="h-20"></div>
          </div>
        </div>
      </div>

      {/* MODAL DE FINALISATION */}
      {showFinalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4 text-center">
            <div className="mb-6">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Fiche finalisée avec succès !
              </h2>
              <p className="text-gray-600">
                La fiche "<strong>{formData.nom}</strong>" a été marquée comme complétée.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => navigate('/')}
              >
                Retour au Dashboard
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowFinalModal(false)}
              >
                Continuer l'édition
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}