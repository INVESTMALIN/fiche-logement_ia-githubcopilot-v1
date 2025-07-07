// src/components/PDFUpload.jsx - Version avec génération double PDF
import React, { useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
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
      console.log('📄 Début génération PDF Logement...')
      
      // Créer iframe pour fiche logement
      const iframe = document.createElement('iframe')
      iframe.style.position = 'absolute'
      iframe.style.left = '-9999px'
      iframe.style.top = '0'
      iframe.style.width = '800px'
      iframe.style.height = '1200px'
      iframe.style.border = 'none'
      document.body.appendChild(iframe)
      
      // Charger fiche logement
      const pdfUrl = `/print-pdf?fiche=${formData.id}`
      
      await new Promise((resolve, reject) => {
        iframe.onload = () => {
          console.log('📄 Iframe logement chargé, attente rendu...')
          setTimeout(resolve, 4000)
        }
        iframe.onerror = reject
        iframe.src = pdfUrl
      })
      
      console.log('📷 Capture du contenu iframe logement...')
      
      // Capturer le contenu de l'iframe logement
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
      const pdfContainer = iframeDoc.querySelector('.pdf-container')
      
      if (!pdfContainer) {
        throw new Error('Contenu PDF logement non trouvé dans iframe')
      }
      
      // Capturer avec html2canvas
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: pdfContainer.offsetWidth,
        height: pdfContainer.offsetHeight
      })
      
      console.log('📝 Conversion en PDF logement...')
      
      // Créer PDF logement
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 190
      const pageHeight = 270
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      const imgData = canvas.toDataURL('image/jpeg', 0.9)
      
      // Gestion multi-pages si nécessaire
      if (imgHeight > pageHeight) {
        let position = 0
        while (position < imgHeight) {
          pdf.addImage(imgData, 'JPEG', 10, 10 - position, imgWidth, imgHeight)
          position += pageHeight
          if (position < imgHeight) {
            pdf.addPage()
          }
        }
      } else {
        pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight)
      }
      
      // Générer blob logement
      const pdfBlob = pdf.output('blob')
      
      console.log('📊 Taille PDF logement:', (pdfBlob.size / 1024 / 1024).toFixed(2), 'MB')
      
      if (pdfBlob.size > 6 * 1024 * 1024) {
        throw new Error(`PDF logement trop volumineux: ${(pdfBlob.size / 1024 / 1024).toFixed(2)}MB`)
      }
      
      console.log('☁️ Upload PDF logement vers Supabase...')
      
      // Upload PDF logement vers Supabase
      const fileName = `fiche-logement-${numeroBien}.pdf`
      const { data, error: uploadError } = await supabase.storage
        .from('fiche-pdfs')
        .upload(fileName, pdfBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf'
        })

      if (uploadError) throw uploadError

      // Récupérer URL publique logement
      const { data: urlData } = supabase.storage
        .from('fiche-pdfs')
        .getPublicUrl(fileName)

      const finalUrl = urlData.publicUrl
      
      console.log('✅ PDF logement généré:', finalUrl)
      
      // Nettoyer iframe logement
      document.body.removeChild(iframe)

      // ===============================
      // 2. GÉNÉRATION PDF MÉNAGE
      // ===============================
      console.log('🧹 Début génération PDF Ménage...')
      
      // Créer iframe pour fiche ménage
      const iframeMenage = document.createElement('iframe')
      iframeMenage.style.position = 'absolute'
      iframeMenage.style.left = '-9999px'
      iframeMenage.style.top = '0'
      iframeMenage.style.width = '800px'
      iframeMenage.style.height = '1200px'
      iframeMenage.style.border = 'none'
      document.body.appendChild(iframeMenage)
      
      // Charger fiche ménage
      const pdfMenageUrl = `/print-pdf-menage?fiche=${formData.id}`
      
      await new Promise((resolve, reject) => {
        iframeMenage.onload = () => {
          console.log('🧹 Iframe ménage chargé, attente rendu...')
          setTimeout(resolve, 4000)
        }
        iframeMenage.onerror = reject
        iframeMenage.src = pdfMenageUrl
      })
      
      console.log('📷 Capture du contenu iframe ménage...')
      
      // Capturer le contenu de l'iframe ménage
      const iframeMenageDoc = iframeMenage.contentDocument || iframeMenage.contentWindow.document
      const pdfMenageContainer = iframeMenageDoc.querySelector('.pdf-container')
      
      if (!pdfMenageContainer) {
        throw new Error('Contenu PDF ménage non trouvé dans iframe')
      }
      
      // Capturer avec html2canvas ménage
      const canvasMenage = await html2canvas(pdfMenageContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: pdfMenageContainer.offsetWidth,
        height: pdfMenageContainer.offsetHeight
      })
      
      console.log('📝 Conversion en PDF ménage...')
      
      // Créer PDF ménage
      const pdfMenage = new jsPDF('p', 'mm', 'a4')
      const imgHeightMenage = (canvasMenage.height * imgWidth) / canvasMenage.width
      
      const imgDataMenage = canvasMenage.toDataURL('image/jpeg', 0.9)
      
      // Gestion multi-pages si nécessaire
      if (imgHeightMenage > pageHeight) {
        let position = 0
        while (position < imgHeightMenage) {
          pdfMenage.addImage(imgDataMenage, 'JPEG', 10, 10 - position, imgWidth, imgHeightMenage)
          position += pageHeight
          if (position < imgHeightMenage) {
            pdfMenage.addPage()
          }
        }
      } else {
        pdfMenage.addImage(imgDataMenage, 'JPEG', 10, 10, imgWidth, imgHeightMenage)
      }
      
      // Générer blob ménage
      const pdfMenageBlob = pdfMenage.output('blob')
      
      console.log('📊 Taille PDF ménage:', (pdfMenageBlob.size / 1024 / 1024).toFixed(2), 'MB')
      
      if (pdfMenageBlob.size > 6 * 1024 * 1024) {
        throw new Error(`PDF ménage trop volumineux: ${(pdfMenageBlob.size / 1024 / 1024).toFixed(2)}MB`)
      }
      
      console.log('☁️ Upload PDF ménage vers Supabase...')
      
      // Upload PDF ménage vers Supabase
      const fileNameMenage = `fiche-menage-${numeroBien}.pdf`
      const { data: dataMenage, error: uploadErrorMenage } = await supabase.storage
        .from('fiche-pdfs')
        .upload(fileNameMenage, pdfMenageBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf'
        })

      if (uploadErrorMenage) throw uploadErrorMenage

      // Récupérer URL publique ménage
      const { data: urlDataMenage } = supabase.storage
        .from('fiche-pdfs')
        .getPublicUrl(fileNameMenage)

      const finalUrlMenage = urlDataMenage.publicUrl
      
      console.log('✅ PDF ménage généré:', finalUrlMenage)
      
      // Nettoyer iframe ménage
      document.body.removeChild(iframeMenage)
      
      // ===============================
      // 3. FINALISATION
      // ===============================
      
      setPdfUrl(finalUrl)

      // Notifier avec l'URL du PDF logement (pour le lien téléchargement)
      if (onPDFGenerated) {
        onPDFGenerated(finalUrl)
      }
      
      console.log('🎉 Génération complète des 2 PDF terminée!')
      
    } catch (err) {
      console.error('❌ Erreur génération PDF:', err)
      setError(err.message)
      
      // Nettoyer tous les iframes en cas d'erreur
      const iframes = document.querySelectorAll('iframe[style*="-9999px"]')
      iframes.forEach(iframe => {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="pdf-upload-component">
      <button 
        onClick={generateAndUploadPDF}
        disabled={generating}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
      >
        {generating ? '⏳ Génération 2 PDF...' : '📄 Générer PDF automatique'}
      </button>
      
      {generating && (
        <p className="text-sm text-gray-500 mt-2">Génération fiche logement + fiche ménage en cours...</p>
      )}
      
      {error && (
        <p className="text-sm text-red-600 mt-2">❌ {error}</p>
      )}
      
      {pdfUrl && (
        <p className="text-sm text-green-600 mt-2">
          ✅ PDF logement généré : <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">Télécharger</a>
        </p>
      )}
    </div>
  )
}

export default PDFUpload