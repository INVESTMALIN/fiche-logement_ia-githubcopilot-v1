// src/pages/FicheGuideAcces.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PhotoUpload from '../components/PhotoUpload'
import { Sparkles, Copy, Check, AlertCircle, Loader2 } from 'lucide-react'

export default function FicheGuideAcces() {
  const { 
    next, 
    back,
    currentStep,
    totalSteps,
    formData,
    getField, 
    updateField, 
    handleSave, 
    saveStatus 
  } = useForm()

  // États pour l'assistant Guide d'accès
  const [loading, setLoading] = useState(false)
  const [guideGenere, setGuideGenere] = useState('')
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const sessionIdRef = useRef(null)

  // Générer sessionId au montage
  useEffect(() => {
    if (!sessionIdRef.current && formData) {
      const ficheId = formData.id || formData.nom || 'nouvelle_fiche'
      const slug = String(ficheId).toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '')
      sessionIdRef.current = `fiche_${slug}_guide_acces`
    }
  }, [formData])

  // Vérifier si une vidéo est uploadée
  const videoUrl = getField('section_guide_acces.video_acces')?.[0]
  const hasVideo = videoUrl && videoUrl.length > 0

  const handleGenererGuide = async () => {
    if (!hasVideo) {
      setError('Veuillez d\'abord uploader une vidéo.')
      return
    }

    setLoading(true)
    setError(null)
    setGuideGenere('')

    try {
      // ÉTAPE 1 : Extraction audio via backend Railway
      console.log('🎵 Extraction audio en cours...')
      
      const extractResponse = await fetch('https://video-compressor-production.up.railway.app/extract-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl })
      })

      if (!extractResponse.ok) {
        throw new Error(`Erreur extraction audio: ${extractResponse.status}`)
      }

      const { audioUrl } = await extractResponse.json()
      console.log('✅ Audio extrait:', audioUrl)

      // ÉTAPE 2 : Envoi vers webhook n8n
      console.log('🤖 Génération du guide d\'accès...')

      const guideResponse = await fetch('https://hub.cardin.cloud/webhook/396c1d02-5034-466e-865a-774764ccdaae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          audioUrl: audioUrl
        })
      })

      if (!guideResponse.ok) {
        throw new Error(`Erreur génération guide: ${guideResponse.status}`)
      }

      const guideData = await guideResponse.json()
      const guide = guideData.output || guideData.response || 'Guide généré (format non reconnu)'
      
      setGuideGenere(guide)
      console.log('✅ Guide généré avec succès')

    } catch (err) {
      console.error('❌ Erreur:', err)
      
      let errorMessage = 'Une erreur est survenue lors de la génération du guide.'
      
      if (err.message.includes('extraction audio')) {
        errorMessage = 'Impossible d\'extraire l\'audio de la vidéo. Vérifiez que la vidéo est valide.'
      } else if (err.message.includes('génération guide')) {
        errorMessage = 'L\'assistant Guide d\'accès n\'a pas pu générer le guide. Réessayez dans quelques instants.'
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Problème de connexion réseau. Vérifiez votre connexion internet.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyGuide = () => {
    navigator.clipboard.writeText(guideGenere)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        setError('Impossible de copier le texte.')
      })
  }

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Guide d'accès</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            
            {/* Introduction */}
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
              <h3 className="font-semibold text-blue-800 mb-2">
                Préparation Guide d'accès : depuis le panneau de la rue ou un élément identifiable, jusqu'à l'intérieur de l'appartement
              </h3>
              <p className="text-blue-700 text-sm">
                Fournissez les éléments visuels nécessaires pour créer un guide d'accès complet pour les voyageurs.
              </p>
            </div>

            {/* Upload Photos étapes */}
            <div>
              <PhotoUpload 
                fieldPath="section_guide_acces.photos_etapes"
                label="Fournir plusieurs photos étape par étape pour le carrousel photo"
                multiple={true}
                maxFiles={25}
              />
              <p className="text-sm text-gray-500 mt-2">
                📸 Photos de chaque étape du parcours : panneau de rue, entrée immeuble, hall, ascenseur, palier, porte d'appartement, etc.
              </p>
            </div>

            {/* Upload Vidéo */}
            <div>
              <PhotoUpload 
                fieldPath="section_guide_acces.video_acces"
                label="Fournir une vidéo depuis le panneau de la rue ou un emplacement identifiable"
                multiple={true}
                maxFiles={1}
                acceptVideo={true}
              />
              <p className="text-sm text-gray-500 mt-2">
                🎥 Vidéo continue du trajet complet depuis un point de repère identifiable jusqu'à la porte d'entrée.
              </p>
            </div>

            {/* ASSISTANT - Guide d'accès */}
            {hasVideo && (
              <div className="mt-8 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Assistant Guide d'accès</h3>
                    <p className="text-sm text-gray-600">Génération automatique du guide d'accès depuis votre vidéo</p>
                  </div>
                </div>

                {/* Bouton générer */}
                {!guideGenere && !loading && (
                  <button
                    onClick={handleGenererGuide}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-5 h-5" />
                    Générer le guide d'accès
                  </button>
                )}

                {/* Loading state */}
                {loading && (
                  <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    <div className="text-center">
                      <p className="font-medium text-gray-900">Génération en cours...</p>
                      <p className="text-sm text-gray-600 mt-1">Extraction audio + transcription + génération du guide</p>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {error && (
                  <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-800">{error}</p>
                      <button
                        onClick={handleGenererGuide}
                        className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium underline"
                      >
                        Réessayer
                      </button>
                    </div>
                  </div>
                )}

                {/* Guide généré */}
                {guideGenere && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">Guide d'accès généré :</p>
                      <button
                        onClick={handleCopyGuide}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white hover:bg-gray-50 border rounded-lg transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-white rounded-lg border p-4 max-h-96 overflow-y-auto">
                      <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {guideGenere}
                      </p>
                    </div>

                    {/* Bouton régénérer */}
                    <button
                      onClick={handleGenererGuide}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      Régénérer le guide
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Indicateur de sauvegarde */}
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

              <Button 
                variant="primary"
                onClick={next}
                disabled={currentStep >= totalSteps - 1}
              >
                Suivant
              </Button>
            </div>
          </div>

        </div>
        <div className="h-20"></div>   
      </div>
    </div>
  )
}