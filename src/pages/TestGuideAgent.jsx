// src/pages/TestGuideAgent.jsx
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, User, ArrowLeft, Upload, FileText, FileAudio, FileVideo, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function TestGuideAgent() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [userId, setUserId] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const sessionIdRef = useRef(null)
  const fileInputRef = useRef(null)
  const listRef = useRef(null)
  const endRef = useRef(null)
  const shouldStickRef = useRef(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id)
    })

    let id = localStorage.getItem('test_guide_session_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('test_guide_session_id', id)
    }
    sessionIdRef.current = id
  }, [])

  const welcome = "Salut ! Je suis l'Assistant Guide d'Accès 🗺️."

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i++
      setMessages([{ sender: 'bot', text: welcome.slice(0, i) }])
      if (i >= welcome.length) clearInterval(interval)
    }, 10)
    return () => clearInterval(interval)
  }, [])

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }

  const isNearBottom = (el) => el ? (el.scrollHeight - el.scrollTop - el.clientHeight) < 40 : true

  useEffect(() => {
    if (shouldStickRef.current) {
      endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    const el = listRef.current
    const onScroll = () => {
      shouldStickRef.current = isNearBottom(el)
      setShowScrollButton(!shouldStickRef.current)
    }
    el?.addEventListener('scroll', onScroll)
    return () => el?.removeEventListener('scroll', onScroll)
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files[0]

    if (!file) return

    // Validation des types acceptés
    const isMp3 = file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')
    const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4')
    const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')
    const isMov = file.type === 'video/quicktime' || file.name.toLowerCase().endsWith('.mov')

    if (!isMp3 && !isMp4 && !isMov && !isTxt) {
      alert('Veuillez sélectionner un fichier MP3, MP4, MOV ou TXT uniquement.')
      e.target.value = ''
      return
    }

    // Validation taille (50MB max pour vidéos, 10MB pour audio/txt)
    const maxSize = (isMp4 || isMov) ? 200 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert(`Le fichier est trop volumineux. Taille maximum : ${(isMp4 || isMov) ? '200MB' : '10MB'}.`)
      e.target.value = ''
      return
    }

    // Validation fichier vide
    if (file.size === 0) {
      alert('Le fichier sélectionné est vide.')
      e.target.value = ''
      return
    }

    setSelectedFile(file)
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = () => {
    if (!selectedFile) return <FileText className="w-4 h-4" />
    const name = selectedFile.name.toLowerCase()
    if (name.endsWith('.mp3')) return <FileAudio className="w-4 h-4 text-purple-600" />
    if (name.endsWith('.mp4') || name.endsWith('.mov')) return <FileVideo className="w-4 h-4 text-blue-600" />
    if (name.endsWith('.txt')) return <FileText className="w-4 h-4 text-green-600" />
    return <FileText className="w-4 h-4" />
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || !userId) return

    shouldStickRef.current = isNearBottom(listRef.current)

    const newMessage = { sender: 'user', text: input }
    const updatedMessages = [...messages, newMessage]
    setMessages(updatedMessages)
    const userInput = input
    setInput('')
    setLoading(true)

    try {
      let requestBody = {
        chatInput: userInput,
        sessionId: sessionIdRef.current
      }

      // Si un fichier est sélectionné
      if (selectedFile) {
        if (selectedFile.size === 0) {
          throw new Error('HTTP 400 - Fichier vide')
        }

        const maxSize = selectedFile.name.toLowerCase().endsWith('.mp4') || selectedFile.name.toLowerCase().endsWith('.mov') 
          ? 200 * 1024 * 1024 
          : 10 * 1024 * 1024

        const base64Promise = new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(selectedFile)
        })

        const base64Data = await base64Promise
        requestBody.files = [{
          data: base64Data,
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream'
        }]
      }

      // AbortController pour timeout (2 min pour vidéos)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)

      const res = await fetch('https://hub.cardin.cloud/webhook/5ebcffdd-fee8-4525-85f1-33f57ce4d28d/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        let errText = null
        try {
          errText = await res.text()
        } catch {}
        const tail = errText ? ` - ${errText.slice(0, 200)}` : ''
        throw new Error(`HTTP ${res.status}${tail}`)
      }

      let data
      try {
        data = await res.json()
      } catch (jsonError) {
        throw new Error('Réponse invalide du serveur (JSON malformé)')
      }

      const reply = { sender: 'bot', text: data.output || 'Réponse indisponible.' }
      setMessages((prev) => [...prev, reply])

      // Reset fichier
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (err) {
      console.error('Erreur webhook:', err)

      let errorMessage = "Une erreur est survenue, merci de réessayer dans quelques instants."

      if (err.name === 'AbortError') {
        errorMessage = "La requête a expiré (2min). Merci de réessayer."
      } else if (err.message?.includes('HTTP 504')) {
        errorMessage = "L'assistant prend plus de temps que prévu à analyser votre fichier. Merci de réessayer dans quelques instants."
      } else if (err.message?.includes('HTTP 500') || err.message?.includes('HTTP 502') || err.message?.includes('HTTP 503')) {
        errorMessage = "Une erreur technique s'est produite côté serveur. Merci de réessayer dans quelques instants."
      } else if (err.message?.includes('HTTP 413')) {
        errorMessage = "Le fichier est trop volumineux. Merci d'utiliser un fichier de moins de 200MB (vidéo) ou 10MB (audio/texte)."
      } else if (err.message?.includes('HTTP 400')) {
        errorMessage = "Problème avec votre demande. Vérifiez le fichier sélectionné et réessayez."
      } else if (err.message?.includes('HTTP 401') || err.message?.includes('HTTP 403')) {
        errorMessage = "Problème d'autorisation. Merci de vous reconnecter."
      } else if (err.message?.includes('JSON malformé')) {
        errorMessage = "Erreur de communication avec le serveur. Merci de réessayer."
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errorMessage = "Problème de connexion réseau. Vérifiez votre connexion internet et réessayez."
      }

      setMessages((prev) => [...prev, {
        sender: 'bot',
        text: errorMessage
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 shadow-lg">
        <div className="px-6 md:px-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Test Assistant Guide d'Accès</h1>
              <p className="text-sm text-white/80">Environnement de test - Agent Guide D'accès</p>
            </div>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2 text-white hover:text-white/80 transition-colors border-2 border-white/50 hover:border-white px-3 py-2 rounded-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Retour Dashboard</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Page de test</strong> : Tester l'agent IA avant intégration dans FicheGuideAcces.jsx.
          </p>
          <p className="text-xs text-yellow-700 mt-2">
            Webhook : <code className="bg-yellow-100 px-1 py-0.5 rounded">5ebcffdd-fee8-4525-85f1-33f57ce4d28d</code>
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-4 h-[600px] flex flex-col overflow-hidden relative">
          <div ref={listRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end flex-row-reverse' : ''}`}>
                {msg.sender === 'bot' && <Bot className="w-4 h-4 text-blue-600 mt-1" />}
                {msg.sender === 'user' && <User className="w-4 h-4 text-gray-400 mt-1" />}
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-blue-100 text-right ml-auto'
                      : 'bg-gray-100 text-left'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-sm text-gray-500 italic flex items-center gap-2 animate-pulse">
                <Bot className="w-4 h-4 text-blue-600" />
                <span>L'IA analyse votre fichier...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-20 right-4 bg-white border border-gray-300 rounded-full p-2 shadow-md hover:bg-gray-100"
              title="Aller en bas"
            >
              ↓
            </button>
          )}

          {/* Fichier sélectionné */}
          {selectedFile && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getFileIcon()}
                <div>
                  <span className="text-sm text-blue-700 font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-blue-600 ml-2">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              </div>
              <button onClick={removeFile} className="text-blue-600 hover:text-blue-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={sendMessage} className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".mp3,.mp4,.mov,.txt,audio/mpeg,video/mp4,video/quicktime,text/plain"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-md cursor-pointer text-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                Joindre fichier
              </label>
              <span className="text-xs text-gray-500">MP3, MP4, MOV ou TXT</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Posez votre question ou demandez un guide..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Envoyer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}