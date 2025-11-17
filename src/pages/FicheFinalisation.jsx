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
import { CheckCircle, PenTool, Send, Bot, Copy, AlertCircle, Sparkles, Loader2, Check } from 'lucide-react'
import { generateAnnoncePDF } from '../lib/generateAssistantPDF'
import { supabase } from '../lib/supabaseClient'

export default function FicheFinalisation() {
  const navigate = useNavigate()
  const [showFinalModal, setShowFinalModal] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [currentInput, setCurrentInput] = useState('')
  const [annonceLoading, setAnnonceLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [validatingAnnonce, setValidatingAnnonce] = useState(false)
  const [validatedAnnonce, setValidatedAnnonce] = useState(false)
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
    finaliserFiche,
    triggerAssistantPdfWebhook
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

  const handleValidateAnnonce = async () => {
    const lastMessage = chatMessages[chatMessages.length - 1]
    
    if (!lastMessage || lastMessage.role !== 'assistant') {
      console.error('Aucune annonce à valider')
      return
    }

    setValidatingAnnonce(true)

    try {
      console.log('📄 Validation de l\'annonce...')
      
      const metadata = {
        numero_bien: formData.section_logement?.numero_bien || 'N/A',
        type_propriete: formData.section_logement?.type_propriete || 'Non spécifié',
        adresse: {
          rue: formData.section_proprietaire?.adresse?.rue || '',
          complement: formData.section_proprietaire?.adresse?.complement || '',
          code_postal: formData.section_proprietaire?.adresse?.codePostal || '',
          ville: formData.section_proprietaire?.adresse?.ville || ''
        }
      }

      // Nettoyer le contenu
      const cleanedContent = lastMessage.content
        .replace(/([^\s]):/g, '$1 :')
        .replace(/([^\s])!/g, '$1 !')
        .replace(/([^\s])\?/g, '$1 ?')
        .replace(/([^\s]);/g, '$1 ;')
        .replace(/\u00A0/g, ' ')
        .replace(/\u202F/g, ' ')

      // Générer le PDF
      const pdfUrl = await generateAnnoncePDF(
        cleanedContent,
        metadata,
        formData.id || formData.nom || 'nouvelle_fiche'
      )

      console.log('✅ PDF Annonce généré:', pdfUrl)

      // 🔥 DÉCLENCHER WEBHOOK via FormContext
      const result = await triggerAssistantPdfWebhook(null, pdfUrl)

      if (result.success) {
        console.log('✅ URL annonce sauvegardée et webhook déclenché!')
        setValidatedAnnonce(true)
        setTimeout(() => setValidatedAnnonce(false), 3000)
      } else {
        console.error('❌ Erreur sauvegarde URL annonce:', result.error)
        throw new Error(result.error)
      }

    } catch (err) {
      console.error('❌ Erreur validation annonce:', err)
    } finally {
      setValidatingAnnonce(false)
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

              {/* 🚀 Badge Beta + New */}
              <div className="mb-6 flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">
                    <Sparkles className="w-3 h-3" />
                    BETA
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-purple-900 leading-relaxed">
                    Cette fonctionnalité beta est disponible et s'améliore continuellement grâce à vos retours. N'hésitez pas à l'essayer !
                    <span className="ml-2 px-2.5 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full animate-pulse">
                      NEW
                    </span>
                  </p>
                </div>
              </div>        

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

{/* Loading state */}
{annonceLoading && (
  <div className="flex items-center justify-center gap-3 py-8">
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

{/* Conversation */}
{chatMessages.length > 0 && (
  <div className="space-y-4">
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

    {/* Zone d'actions : Copier + Valider */}
    {chatMessages[chatMessages.length - 1]?.role === 'assistant' && (
      <div className="space-y-3">
        {/* Note d'information validation */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-blue-800">
            <p className="font-medium mb-1">Validation de l'annonce</p>
            <p className="text-blue-700">
              Cliquez sur "Valider cette annonce" pour générer un PDF professionnel et l'enregistrer. 
              Ce PDF sera automatiquement envoyé vers Monday à chaque validation.
            </p>
          </div>
        </div>

        {/* Boutons Copier + Valider (côte à côte) */}
        <div className="flex gap-3">
          <button
            onClick={() => handleCopyMessage(chatMessages[chatMessages.length - 1].content, chatMessages.length - 1)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg font-medium transition-all flex-1"
          >
            {copiedIndex === chatMessages.length - 1 ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gray-700" />
                <span className="text-gray-700">Copier le texte</span>
              </>
            )}
          </button>

          <button
            onClick={handleValidateAnnonce}
            disabled={validatingAnnonce}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {validatingAnnonce ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Génération PDF...</span>
              </>
            ) : validatedAnnonce ? (
              <>
                <Check className="w-4 h-4" />
                <span>Annonce validée !</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Valider cette annonce</span>
              </>
            )}
          </button>
        </div>
      </div>
    )}

    {/* Input pour continuer la conversation */}
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
        className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
          annonceLoading || !currentInput.trim()
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        <Send className="w-4 h-4" />
      </button>
    </div>

    {/* Bouton recommencer (discret) */}
    <button
      onClick={() => {
        setChatMessages([])
        setCurrentInput('')
      }}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all"
    >
      <Sparkles className="w-4 h-4" />
      Recommencer une nouvelle génération
    </button>
  </div>
)}
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