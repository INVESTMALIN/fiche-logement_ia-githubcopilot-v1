// src/components/PDFUpload-html2pdf.jsx - Version html2pdf AMÉLIORÉE
import React, { useState } from 'react'
import html2pdf from 'html2pdf.js'
import { supabase } from '../lib/supabaseClient'

const PDFUpload = ({ formData, onPDFGenerated }) => {
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
      // 1. GÉNÉRATION PDF LOGEMENT
      // ===============================
      console.log('📄 Début génération PDF Logement avec html2pdf...')
      
      const logementPdfBlob = await generatePDFBlob(`/print-pdf?fiche=${formData.id}`)
      console.log('✅ PDF Logement généré, taille:', (logementPdfBlob.size / 1024 / 1024).toFixed(2), 'MB')
      
      // ===============================
      // 2. GÉNÉRATION PDF MÉNAGE
      // ===============================
      console.log('📄 Début génération PDF Ménage avec html2pdf...')
      
      const menagePdfBlob = await generatePDFBlob(`/print-pdf-menage?fiche=${formData.id}`)
      console.log('✅ PDF Ménage généré, taille:', (menagePdfBlob.size / 1024 / 1024).toFixed(2), 'MB')
      
      // ===============================
      // 3. UPLOAD VERS SUPABASE STORAGE
      // ===============================
      console.log('📤 Upload des 2 PDF vers Supabase Storage...')
      
      // Upload PDF Logement
      const logementFileName = `fiche-logement-${numeroBien}.pdf`
      const { data: logementData, error: logementError } = await supabase.storage
        .from('fiche-pdfs')
        .upload(logementFileName, logementPdfBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf'
        })

      if (logementError) throw new Error(`Erreur upload logement: ${logementError.message}`)

      // Upload PDF Ménage
      const menageFileName = `fiche-menage-${numeroBien}.pdf`
      const { data: menageData, error: menageError } = await supabase.storage
        .from('fiche-pdfs')
        .upload(menageFileName, menagePdfBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf'
        })

      if (menageError) throw new Error(`Erreur upload ménage: ${menageError.message}`)

      // ===============================
      // 4. GÉNÉRATION URLS PUBLIQUES
      // ===============================
      const { data: logementUrlData } = supabase.storage
        .from('fiche-pdfs')
        .getPublicUrl(logementFileName)

      const { data: menageUrlData } = supabase.storage
        .from('fiche-pdfs')
        .getPublicUrl(menageFileName)

      const finalLogementUrl = logementUrlData.publicUrl
      const finalMenageUrl = menageUrlData.publicUrl

      console.log('🔗 URLs générées:')
      console.log('  - Logement:', finalLogementUrl)
      console.log('  - Ménage:', finalMenageUrl)

      // ===============================
      // 5. FINALISATION
      // ===============================
      setPdfUrl(finalLogementUrl)
      
      if (onPDFGenerated) {
        onPDFGenerated({
          logement: finalLogementUrl,
          menage: finalMenageUrl
        })
      }

      console.log('🎉 Génération et upload terminés avec succès!')

    } catch (err) {
      console.error('❌ Erreur génération PDF:', err)
      setError(err.message || 'Erreur lors de la génération du PDF')
    } finally {
      setGenerating(false)
    }
  }

  // ===============================
  // FONCTION GÉNÉRATION PDF BLOB
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
      
      const timeoutId = setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe)
        }
        reject(new Error('Timeout: Chargement iframe trop long'))
      }, 10000)
      
      iframe.onload = async () => {
        try {
          console.log('📄 Iframe chargé, attente rendu complet...')
          
          // 🔑 CRUCIAL : Attendre que tous les styles soient chargés
          await new Promise(resolve => setTimeout(resolve, 3000))
          
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
          const element = iframeDoc.querySelector('.pdf-container')
          
          if (!element) {
            throw new Error('Élément .pdf-container non trouvé')
          }

          console.log('📄 Génération PDF avec html2pdf...')
          
          // ✨ CONFIGURATION OPTIMALE HTML2PDF
          const options = {
            margin: [15, 15, 15, 15], // mm : top, right, bottom, left
            filename: 'document.pdf',
            image: { 
              type: 'jpeg', 
              quality: 0.95 // Qualité élevée
            },
            html2canvas: { 
              scale: 2, // Résolution élevée
              useCORS: true,
              letterRendering: true,
              logging: false,
              backgroundColor: '#ffffff'
            },
            jsPDF: { 
              unit: 'mm', 
              format: 'a4', 
              orientation: 'portrait',
              compress: true
            },
            pagebreak: { 
              mode: ['avoid-all', 'css'], // Respecte les CSS page-break
              avoid: ['.section', '.header'] // Évite de couper ces éléments
            }
          }

          // 🚀 GÉNÉRATION avec gestion d'erreur
          html2pdf()
            .from(element)
            .set(options)
            .outputPdf('blob')
            .then(blob => {
              clearTimeout(timeoutId)
              if (iframe.parentNode) {
                document.body.removeChild(iframe)
              }
              resolve(blob)
            })
            .catch(err => {
              clearTimeout(timeoutId)
              if (iframe.parentNode) {
                document.body.removeChild(iframe)
              }
              reject(err)
            })

        } catch (err) {
          clearTimeout(timeoutId)
          if (iframe.parentNode) {
            document.body.removeChild(iframe)
          }
          reject(err)
        }
      }
      
      iframe.onerror = () => {
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
      <div>
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
            ⏳ Génération 2 PDF (html2pdf)...
          </span>
        ) : (
          '📄 Générer PDF automatique'
        )}
              </button>
      </div>

      {/* États d'affichage */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          <p className="font-semibold">❌ Erreur</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {pdfUrl && !generating && (
        <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400 text-green-700">
          <p className="font-semibold">✅ PDF logement généré avec succès!</p>
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
          <p className="font-semibold">⏳ Génération en cours...</p>
          <p className="text-sm">
            Utilisation de html2pdf pour une pagination intelligente
          </p>
        </div>
      )}
    </div>
  )
}

export default PDFUpload