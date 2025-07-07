// src/components/PDFUpload.jsx - Version simplifiée avec iframe
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
      console.log('📄 Début génération PDF...')
      
      // 1. Créer iframe caché pointant vers l'URL qui marche
      const iframe = document.createElement('iframe')
      iframe.style.position = 'absolute'
      iframe.style.left = '-9999px'
      iframe.style.top = '0'
      iframe.style.width = '800px'
      iframe.style.height = '1200px'
      iframe.style.border = 'none'
      document.body.appendChild(iframe)
      
      // 2. Charger l'URL avec les styles qui marchent
      const pdfUrl = `/print-pdf?fiche=${formData.id}`
      
      await new Promise((resolve, reject) => {
        iframe.onload = () => {
          console.log('📄 Iframe chargé, attente rendu...')
          // Attendre que React rende complètement le contenu
          setTimeout(resolve, 4000) // 4 secondes pour être sûr
        }
        iframe.onerror = reject
        iframe.src = pdfUrl
      })
      
      console.log('📷 Capture du contenu iframe...')
      
      // 3. Capturer le contenu de l'iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
      const pdfContainer = iframeDoc.querySelector('.pdf-container')
      
      if (!pdfContainer) {
        throw new Error('Contenu PDF non trouvé dans iframe')
      }
      
      // 4. Capturer avec html2canvas (les styles sont maintenant appliqués)
      const canvas = await html2canvas(pdfContainer, {
        scale: 2, // Meilleure qualité
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: pdfContainer.offsetWidth,
        height: pdfContainer.offsetHeight
      })
      
      console.log('📝 Conversion en PDF...')
      
      // 5. Créer PDF optimisé
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 190
      const pageHeight = 270
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      const imgData = canvas.toDataURL('image/jpeg', 0.9) // Qualité élevée
      
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
      
      // 6. Générer blob
      const pdfBlob = pdf.output('blob')
      
      console.log('📊 Taille PDF:', (pdfBlob.size / 1024 / 1024).toFixed(2), 'MB')
      
      if (pdfBlob.size > 6 * 1024 * 1024) {
        throw new Error(`PDF trop volumineux: ${(pdfBlob.size / 1024 / 1024).toFixed(2)}MB`)
      }
      
      console.log('☁️ Upload vers Supabase...')
      
      // 7. Upload vers Supabase
      const fileName = `fiche-${formData.id}.pdf`
      const { data, error: uploadError } = await supabase.storage
        .from('fiche-pdfs')
        .upload(fileName, pdfBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf'
        })

      if (uploadError) throw uploadError

      // 8. Récupérer URL publique
      const { data: urlData } = supabase.storage
        .from('fiche-pdfs')
        .getPublicUrl(fileName)

      const finalUrl = urlData.publicUrl
      setPdfUrl(finalUrl)
      
      console.log('✅ PDF généré:', finalUrl)
      
      // 9. Nettoyer
      document.body.removeChild(iframe)
      
      // 10. Notifier
      onPDFGenerated(finalUrl)
      
    } catch (err) {
      console.error('❌ Erreur:', err)
      setError(err.message)
      
      // Nettoyer en cas d'erreur
      const iframe = document.querySelector('iframe[style*="-9999px"]')
      if (iframe) {
        document.body.removeChild(iframe)
      }
    } finally {
      setGenerating(false)
    }
  } // ← Cette accolade manquait !

  return (
    <div className="pdf-upload-component">
      <button 
        onClick={generateAndUploadPDF}
        disabled={generating}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
      >
        {generating ? '⏳ Génération PDF...' : '📄 Générer PDF automatique'}
      </button>
      
      {generating && (
        <p className="text-sm text-gray-500 mt-2">Génération et upload en cours...</p>
      )}
      
      {error && (
        <p className="text-sm text-red-600 mt-2">❌ {error}</p>
      )}
      
      {pdfUrl && (
        <p className="text-sm text-green-600 mt-2">
          ✅ PDF généré : <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">Télécharger</a>
        </p>
      )}
    </div>
  )
}

export default PDFUpload