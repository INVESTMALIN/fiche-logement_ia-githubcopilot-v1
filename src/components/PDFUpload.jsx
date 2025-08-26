// src/components/PDFUpload.jsx - VERSION DEBUG COMPLÈTE AVEC TOUT LE CODE ORIGINAL
import React, { useState } from 'react'
import html2pdf from 'html2pdf.js'
import { supabase } from '../lib/supabaseClient'
import { useForm } from '../components/FormContext'

const PDFUpload = ({ formData, onPDFGenerated, updateField, handleSave  }) => {
  const { triggerPdfWebhook } = useForm()
  const [generating, setGenerating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [error, setError] = useState(null)


  const generateAndUploadPDF = async () => {
    if (!formData?.id) {
      setError('Aucune donnée de fiche disponible')
      return
    }
  
    setGenerating(true)
    setError(null)
    
    try {
      const numeroBien = formData.section_logement?.numero_bien || 'sans-numero'
      
      // ===============================
      // 1. 🆕 PDF LOGEMENT - SERVEUR (TEST)
      // ===============================
      console.log('📄 Test génération PDF Logement côté SERVEUR...')
      
      
      const serverPdfResponse = await fetch(`/api/print-pdf?fiche=${formData.id}`, {
        method: 'GET'
      })
      console.log('🔍 Réponse serveur status:', serverPdfResponse.status)
      console.log('🔍 Content-Type serveur:', serverPdfResponse.headers.get('content-type'))
      
      
      if (!serverPdfResponse.ok) {
        // Si erreur, voir ce que retourne le serveur
        const errorText = await serverPdfResponse.text()
        console.log('🔍 Erreur serveur:', errorText.substring(0, 200))
        throw new Error(`Erreur serveur PDF: ${serverPdfResponse.status}`)
      }
      
      const logementPdfBlob = await serverPdfResponse.blob()
      
      if (logementPdfBlob.type !== 'application/pdf') {
        throw new Error('Réponse serveur invalide (pas un PDF)')
      }
      
      console.log('✅ PDF Logement SERVEUR généré, taille:', (logementPdfBlob.size / 1024 / 1024).toFixed(2), 'MB')
      
      // ===============================
      // 2. PDF MÉNAGE - CLIENT (ANCIEN)
      // ===============================
      console.log('📄 Génération PDF Ménage côté CLIENT (ancien)...')
      
      const menagePdfBlob = await generatePDFBlob(`/print-pdf-menage?fiche=${formData.id}`)
      console.log('✅ PDF Ménage CLIENT généré, taille:', (menagePdfBlob.size / 1024 / 1024).toFixed(2), 'MB')
      
      // ===============================
      // 3. UPLOAD DES 2 PDF (inchangé)
      // ===============================
      const maxSizeMB = 15
      const maxSizeBytes = maxSizeMB * 1024 * 1024
      
      if (logementPdfBlob.size > maxSizeBytes) {
        throw new Error(`PDF logement trop volumineux: ${(logementPdfBlob.size / 1024 / 1024).toFixed(2)}MB`)
      }
      
      if (menagePdfBlob.size > maxSizeBytes) {
        throw new Error(`PDF ménage trop volumineux: ${(menagePdfBlob.size / 1024 / 1024).toFixed(2)}MB`)
      }
      
      // Upload PDF logement (serveur)
      console.log('☁️ Upload PDF logement (SERVEUR) vers Supabase...')
      const fileName = `fiche-logement-${numeroBien}.pdf`
      const { data, error: uploadError } = await supabase.storage
        .from('fiche-pdfs')
        .upload(fileName, logementPdfBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf'
        })
  
      if (uploadError) throw uploadError
  
      const { data: urlData } = supabase.storage
        .from('fiche-pdfs')
        .getPublicUrl(fileName)
      const finalUrl = urlData.publicUrl
      
      // Upload PDF ménage (client)
      console.log('☁️ Upload PDF ménage (CLIENT) vers Supabase...')
      const fileNameMenage = `fiche-menage-${numeroBien}.pdf`
      const { data: dataMenage, error: uploadErrorMenage } = await supabase.storage
        .from('fiche-pdfs')
        .upload(fileNameMenage, menagePdfBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf'
        })
  
      if (uploadErrorMenage) throw uploadErrorMenage
  
      const { data: urlDataMenage } = supabase.storage
        .from('fiche-pdfs')
        .getPublicUrl(fileNameMenage)
      const finalUrlMenage = urlDataMenage.publicUrl
      
      console.log('✅ PDF logement (SERVEUR):', finalUrl)
      console.log('✅ PDF ménage (CLIENT):', finalUrlMenage)
      
      // Trigger webhook (inchangé)
      console.log('🔄 Déclenchement webhook PDF...')
      const webhookResult = await triggerPdfWebhook(finalUrl, finalUrlMenage)
      
      if (webhookResult.success) {
        console.log('✅ PDF synchronisés vers Drive/Monday!')
      } else {
        console.error('❌ Erreur sync PDF:', webhookResult.error)
      }
      
      setPdfUrl(finalUrl)
      
      if (onPDFGenerated) {
        onPDFGenerated(finalUrl)
      }
      
      console.log('🎉 COMPARAISON DISPONIBLE: PDF Logement (serveur) vs PDF Ménage (client)')
      
    } catch (err) {
      console.error('❌ Erreur génération PDF:', err)
      setError(err.message || 'Erreur lors de la génération du PDF')
    } finally {
      setGenerating(false)
    }
  }


  // ===============================
  // FONCTION GÉNÉRATION PDF BLOB - VERSION DEBUG AVANCÉE
  // ===============================
  const generatePDFBlob = async (url) => {
    return new Promise((resolve, reject) => {
      
      // Créer iframe caché
      const iframe = document.createElement('iframe')
      iframe.style.position = 'absolute'
      iframe.style.left = '-9999px'
      iframe.style.top = '0'
      iframe.style.width = '800px'
      iframe.style.height = '1200px'
      iframe.style.border = 'none'
      
      // 🔥 TIMEOUT AUGMENTÉ : 15 secondes au lieu de 10
      const timeoutId = setTimeout(() => {
        console.error('⏰ TIMEOUT: Iframe trop long à charger')
        if (iframe.parentNode) {
          document.body.removeChild(iframe)
        }
        reject(new Error('Timeout: Chargement iframe trop long (15s)'))
      }, 15000)
      
      iframe.onload = async () => {
        try {
          console.log('📄 Iframe chargé, attente rendu complet...')
          
          // 🔥 ATTENTE AUGMENTÉE : 5 secondes au lieu de 3
          await new Promise(resolve => setTimeout(resolve, 5000))
          
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
                    
          // Chercher plusieurs sélecteurs possibles
          let element = iframeDoc.querySelector('.pdf-container')
          
          if (!element) {
            console.log('⚠️ .pdf-container introuvable, recherche d\'alternatives...')
            element = iframeDoc.querySelector('.container')
            if (element) console.log('✅ Trouvé .container comme alternative')
          }
          
          if (!element) {
            element = iframeDoc.querySelector('div')
            if (element) console.log('✅ Trouvé premier div comme alternative')
          }
          
          if (!element) {
            console.error('❌ Aucun élément trouvé dans l\'iframe')
            console.log('📋 Contenu body:', iframeDoc.body?.innerHTML?.substring(0, 500))
            throw new Error('Élément .pdf-container non trouvé')
          }

          console.log('📄 Génération PDF avec html2pdf optimisé...')
          
          // ✨ CONFIGURATION HTML2PDF OPTIMISÉE POUR COMPRESSION
          const options = {
            margin: [15, 15, 15, 15], // mm : top, right, bottom, left
            filename: 'document.pdf',
            image: { 
              type: 'jpeg', 
              quality: 0.7 // 🔥 COMPRESSION RÉDUITE pour fiabilité
            },
            html2canvas: { 
              scale: 1.2, // 🔥 SCALE RÉDUIT pour performance
              useCORS: true,
              letterRendering: true,
              logging: false,
              backgroundColor: '#ffffff',
              timeout: 10000 // 🔥 TIMEOUT CANVAS
            },
            jsPDF: { 
              unit: 'mm', 
              format: 'a4', 
              orientation: 'portrait',
              compress: true // Garder compression PDF
            },
            pagebreak: { 
              mode: ['avoid-all', 'css'], // Respecte les CSS page-break
              avoid: ['.section', '.header', '.photo-container'] // 🎯 AJOUTÉ .photo-container
            }
          }

          // 🚀 GÉNÉRATION avec gestion d'erreur sécurisée
          html2pdf()
            .from(element)
            .set(options)
            .outputPdf('blob')
            .then(blob => {
              console.log('✅ PDF généré avec succès, taille:', (blob.size / 1024 / 1024).toFixed(2), 'MB')
              clearTimeout(timeoutId)
              if (iframe.parentNode) {
                document.body.removeChild(iframe)
              }
              resolve(blob)
            })
            .catch(err => {
              console.error('❌ Erreur html2pdf:', err)
              clearTimeout(timeoutId)
              if (iframe.parentNode) {
                document.body.removeChild(iframe)
              }
              reject(err)
            })

        } catch (err) {
          console.error('❌ Erreur dans iframe.onload:', err)
          clearTimeout(timeoutId)
          if (iframe.parentNode) {
            document.body.removeChild(iframe)
          }
          reject(err)
        }
      }
      
      iframe.onerror = (error) => {
        console.error('❌ Erreur chargement iframe:', error)
        clearTimeout(timeoutId)
        if (iframe.parentNode) {
          document.body.removeChild(iframe)
        }
        reject(new Error('Erreur chargement iframe'))
      }
      
      document.body.appendChild(iframe)
      iframe.src = url
    })
  }

  return (
    <div className="pdf-upload-container">
      {/* Bouton principal */}
      <button
        onClick={generateAndUploadPDF}
        disabled={generating || !formData?.id}
        className={`py-4 px-8 rounded-lg font-semibold text-white text-lg transition-all ${
          generating || !formData?.id
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
        }`}
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="31.416" strokeDashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            ⏳ Génération 2 PDF...
          </span>
        ) : (
          '📄 Générer la Fiche logement (PDF)'
        )}
      </button>


      {/* États d'affichage */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          <p className="font-semibold">❌ Erreur</p>
          <div className="text-sm whitespace-pre-line">{error}</div>
        </div>
      )}

      {pdfUrl && !generating && (
        <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400 text-green-700">
          <p className="font-semibold">✅ Fiche logement générée avec succès !</p>
          <a 
            href={pdfUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            📄 Télécharger la Fiche logement
          </a>
          <p className="text-sm mt-2 text-green-600">
            Fiche ménage également générée et disponible sur le Drive
          </p>
        </div>
      )}

      {generating && (
        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700">
          <p className="font-semibold">⏳ Génération et synchronisation cours...</p>
          <p className="text-sm">
            Veuillez patienter un instant.
          </p>
        </div>
      )}
    </div>
  )
}

export default PDFUpload