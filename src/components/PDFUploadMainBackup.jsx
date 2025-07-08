// src/components/PDFUpload.jsx - Version avec capture SECTION PAR SECTION
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
      
      console.log('📷 Capture des sections PDF logement...')
      
      // Capturer le contenu de l'iframe logement
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
      const pdfContainer = iframeDoc.querySelector('.pdf-container')
      
      if (!pdfContainer) {
        throw new Error('Contenu PDF logement non trouvé dans iframe')
      }
      
      // ===== NOUVELLE LOGIQUE : CAPTURE SECTION PAR SECTION =====
      console.log('📑 Capture section par section...')
      
      // 1. Capturer l'en-tête d'abord
      const header = pdfContainer.querySelector('.header')
      const sections = pdfContainer.querySelectorAll('.section')
      
      console.log(`📋 Trouvé ${sections.length} sections + header`)
      
      // Créer PDF logement
      const pdf = new jsPDF('p', 'mm', 'a4')
      let needsNewPage = false
      
      // Capturer header
      if (header) {
        console.log('📸 Capture header...')
        const headerCanvas = await html2canvas(header, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        })
        
        const imgWidth = 190
        const headerHeight = (headerCanvas.height * imgWidth) / headerCanvas.width
        const headerData = headerCanvas.toDataURL('image/jpeg', 0.9)
        
        // Vérifier si header tient sur la page
        if (headerHeight > 250) {
          // Header trop grand, le mettre sur sa propre page
          pdf.addImage(headerData, 'JPEG', 10, 10, imgWidth, headerHeight)
          needsNewPage = true
        } else {
          pdf.addImage(headerData, 'JPEG', 10, 10, imgWidth, headerHeight)
          needsNewPage = (headerHeight > 200) // Préparer nouvelle page si header prend trop de place
        }
      }
      
      // Capturer chaque section
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]
        console.log(`📸 Capture section ${i + 1}/${sections.length}...`)
        
        const sectionCanvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        })
        
        const imgWidth = 190
        const sectionHeight = (sectionCanvas.height * imgWidth) / sectionCanvas.width
        const sectionData = sectionCanvas.toDataURL('image/jpeg', 0.9)
        
        // Nouvelle page pour chaque section (sauf la première si header petit)
        if (needsNewPage || i > 0) {
          pdf.addPage()
        }
        
        const maxPageHeight = 250 // mm utilisables sur une page A4
        if (sectionHeight > maxPageHeight) {
        // Section trop longue → découper en plusieurs pages
        let position = 0
        while (position < sectionHeight) {
            if (position > 0) pdf.addPage()
            pdf.addImage(sectionData, 'JPEG', 10, 10 - position, imgWidth, sectionHeight)
            position += maxPageHeight
        }
        } else {
        // Section normale → une page
        pdf.addImage(sectionData, 'JPEG', 10, 10, imgWidth, sectionHeight)
        }
        needsNewPage = true // Toutes les sections suivantes sur nouvelle page
      }
      
      console.log('📝 PDF logement assemblé avec succès')
      
      // Générer blob logement
      const pdfBlob = pdf.output('blob')
      
      console.log('📊 Taille PDF logement:', (pdfBlob.size / 1024 / 1024).toFixed(2), 'MB')
      
      if (pdfBlob.size > 10 * 1024 * 1024) {
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
      
      console.log('📷 Capture des sections PDF ménage...')
      
      // Capturer le contenu de l'iframe ménage
      const iframeMenageDoc = iframeMenage.contentDocument || iframeMenage.contentWindow.document
      const pdfMenageContainer = iframeMenageDoc.querySelector('.pdf-container')
      
      if (!pdfMenageContainer) {
        throw new Error('Contenu PDF ménage non trouvé dans iframe')
      }
      
      // ===== MÊME LOGIQUE POUR MÉNAGE : CAPTURE SECTION PAR SECTION =====
      console.log('📑 Capture ménage section par section...')
      
      // 1. Capturer l'en-tête ménage
      const headerMenage = pdfMenageContainer.querySelector('.header')
      const sectionsMenage = pdfMenageContainer.querySelectorAll('.section')
      
      console.log(`📋 Trouvé ${sectionsMenage.length} sections ménage + header`)
      
      // Créer PDF ménage
      const pdfMenage = new jsPDF('p', 'mm', 'a4')
      let needsNewPageMenage = false
      
      // Capturer header ménage
      if (headerMenage) {
        console.log('📸 Capture header ménage...')
        const headerMenageCanvas = await html2canvas(headerMenage, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        })
        
        const imgWidthMenage = 190
        const headerMenageHeight = (headerMenageCanvas.height * imgWidthMenage) / headerMenageCanvas.width
        const headerMenageData = headerMenageCanvas.toDataURL('image/jpeg', 0.9)
        
        // Vérifier si header tient sur la page
        if (headerMenageHeight > 250) {
          pdfMenage.addImage(headerMenageData, 'JPEG', 10, 10, imgWidthMenage, headerMenageHeight)
          needsNewPageMenage = true
        } else {
          pdfMenage.addImage(headerMenageData, 'JPEG', 10, 10, imgWidthMenage, headerMenageHeight)
          needsNewPageMenage = (headerMenageHeight > 200)
        }
      }
      
      // Capturer chaque section ménage
      for (let i = 0; i < sectionsMenage.length; i++) {
        const sectionMenage = sectionsMenage[i]
        console.log(`📸 Capture section ménage ${i + 1}/${sectionsMenage.length}...`)
        
        const sectionMenageCanvas = await html2canvas(sectionMenage, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        })
        
        const imgWidthMenage = 190
        const sectionMenageHeight = (sectionMenageCanvas.height * imgWidthMenage) / sectionMenageCanvas.width
        const sectionMenageData = sectionMenageCanvas.toDataURL('image/jpeg', 0.9)
        
        // Nouvelle page pour chaque section
        if (needsNewPageMenage || i > 0) {
          pdfMenage.addPage()
        }
        
        const maxPageHeight = 250 // mm utilisables sur une page A4
        if (sectionMenageHeight > maxPageHeight) {
        // Section trop longue → découper en plusieurs pages
        let position = 0
        while (position < sectionMenageHeight) {
            if (position > 0) pdfMenage.addPage()
            pdfMenage.addImage(sectionMenageData, 'JPEG', 10, 10 - position, imgWidthMenage, sectionMenageHeight)
            position += maxPageHeight
        }
        } else {
        // Section normale → une page
        pdfMenage.addImage(sectionMenageData, 'JPEG', 10, 10, imgWidthMenage, sectionMenageHeight)
        }
        needsNewPageMenage = true
      }
      
      console.log('📝 PDF ménage assemblé avec succès')
      
      // Générer blob ménage
      const pdfMenageBlob = pdfMenage.output('blob')
      
      console.log('📊 Taille PDF ménage:', (pdfMenageBlob.size / 1024 / 1024).toFixed(2), 'MB')
      
      if (pdfMenageBlob.size > 10 * 1024 * 1024) {
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