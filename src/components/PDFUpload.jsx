// src/components/PDFUpload.jsx - VERSION PUPPETEER RAILWAY
import React, { useState } from 'react'
import { useForm } from '../components/FormContext'

const PDFUpload = ({ formData, onPDFGenerated, updateField, handleSave }) => {
  const { triggerPdfWebhook } = useForm()
  const [generating, setGenerating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [error, setError] = useState(null)

  // Fonction pour aspirer TOUS les styles calculés (Vite Dev Mode)
  const inlineAllStyles = async (iframeDoc) => {
    console.log("🎨 Aspiration de TOUS les styles calculés (Vite Dev Mode)...")

    let combinedCSS = ""

    // Récupérer toutes les règles CSS actives dans l'iframe
    // (Inclut Tailwind injecté dynamiquement par Vite)
    const styleSheets = Array.from(iframeDoc.styleSheets)

    for (const sheet of styleSheets) {
      try {
        // Essayer de lire les règles CSS
        const rules = Array.from(sheet.cssRules || sheet.rules)
        combinedCSS += rules.map(rule => rule.cssText).join("\n")
      } catch (e) {
        // CORS error sur Google Fonts ou autres external stylesheets
        // On les skip, ils sont déjà inline via <style> tags
        console.warn(`⚠️ Impossible de lire stylesheet (CORS):`, sheet.href)
        continue
      }
    }

    if (combinedCSS.length > 0) {
      // Créer une balise <style> avec TOUT le CSS aspiré
      const styleTag = iframeDoc.createElement('style')
      styleTag.textContent = combinedCSS
      iframeDoc.head.appendChild(styleTag)
    }

    // Nettoyer les scripts Vite qui font planter Puppeteer
    const scripts = Array.from(iframeDoc.querySelectorAll('script'))
    scripts.forEach(s => {
      // Supprimer si c'est un script Vite (src ou contenu inline)
      const isViteScript = s.src?.includes('@vite') ||
        s.src?.includes('@react-refresh') ||
        s.textContent?.includes('/@vite') ||
        s.textContent?.includes('/@react-refresh')

      if (isViteScript) {
        s.remove()
      }
    })

    // Transformer les URLs relatives d'images en absolues
    const baseUrl = window.location.origin
    const images = Array.from(iframeDoc.querySelectorAll('img[src]'))
    images.forEach(img => {
      const src = img.getAttribute('src')
      // Uniquement transformer si c'est une URL relative (commence par /)
      if (src && src.startsWith('/') && !src.startsWith('//')) {
        const absoluteUrl = new URL(src, baseUrl).href
        img.setAttribute('src', absoluteUrl)
      }
    })

    return iframeDoc.documentElement.outerHTML
  }

  // Fonction helper pour extraire HTML depuis iframe
  const extractHTMLFromIframe = (url) => {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      document.body.appendChild(iframe)
      iframe.src = url

      const timeout = setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe)
        reject(new Error("Timeout lors de l'extraction HTML"))
      }, 30000)

      iframe.onload = () => {
        setTimeout(async () => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
            if (!iframeDoc) throw new Error("Impossible d'accéder au document de l'iframe")

            // 1. Aspirer le HTML
            const htmlWithInlineCSS = await inlineAllStyles(iframeDoc)

            // 2. Créer un document de travail pour le nettoyage
            const parser = new DOMParser()
            const doc = parser.parseFromString(htmlWithInlineCSS, 'text/html')

            const finalHTML = doc.documentElement.outerHTML

            clearTimeout(timeout)
            if (iframe.parentNode) document.body.removeChild(iframe)

            resolve(finalHTML)
          } catch (err) {
            console.error("❌ Erreur extraction:", err)
            if (iframe.parentNode) document.body.removeChild(iframe)
            reject(err)
          }
        }, 3000) // On laisse 3s pour être sûr que React a fini
      }
    })
  }

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
      // 1. EXTRAIRE HTML LOGEMENT VIA IFRAME
      // ===============================
      console.log('📄 Extraction HTML logement...')
      const htmlLogement = await extractHTMLFromIframe(`/print-pdf?fiche=${formData.id}`)

      // ===============================
      // 2. EXTRAIRE HTML MÉNAGE VIA IFRAME
      // ===============================
      console.log('📄 Extraction HTML ménage...')
      const htmlMenage = await extractHTMLFromIframe(`/print-pdf-menage?fiche=${formData.id}`)

      // ===============================
      // 3. GÉNÉRATION PDF LOGEMENT VIA RAILWAY
      // ===============================
      console.log('📄 Génération PDF logement via Railway...')

      // DEBUG : Vérifier si le logo est dans le HTML
      if (htmlLogement.includes('letahost-transparent.png')) {
        console.log('✅ Logo trouvé dans le HTML')
      } else {
        console.log('❌ Logo ABSENT du HTML')
      }

      const railwayResponseLogement = await fetch('https://video-compressor-production.up.railway.app/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlContent: htmlLogement,
          fileName: `fiche-logement-${numeroBien}.pdf`
        })
      })

      if (!railwayResponseLogement.ok) {
        const errorData = await railwayResponseLogement.json()
        throw new Error(`Erreur Railway logement: ${errorData.message || railwayResponseLogement.statusText}`)
      }

      const resultLogement = await railwayResponseLogement.json()
      console.log('✅ PDF logement généré:', resultLogement.pdfUrl)

      // ===============================
      // 4. GÉNÉRATION PDF MÉNAGE VIA RAILWAY
      // ===============================
      console.log('📄 Génération PDF ménage via Railway...')

      const railwayResponseMenage = await fetch('https://video-compressor-production.up.railway.app/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlContent: htmlMenage,
          fileName: `fiche-menage-${numeroBien}.pdf`
        })
      })

      if (!railwayResponseMenage.ok) {
        const errorData = await railwayResponseMenage.json()
        throw new Error(`Erreur Railway ménage: ${errorData.message || railwayResponseMenage.statusText}`)
      }

      const resultMenage = await railwayResponseMenage.json()
      console.log('✅ PDF ménage généré:', resultMenage.pdfUrl)

      // ===============================
      // 5. TRIGGER WEBHOOK MAKE
      // ===============================
      console.log('📤 Déclenchement webhook Make...')

      const webhookResult = await triggerPdfWebhook(
        resultLogement.pdfUrl,
        resultMenage.pdfUrl
      )

      if (webhookResult.success) {
        console.log('✅ Webhook déclenché avec succès')
        setPdfUrl(resultLogement.pdfUrl)

        if (onPDFGenerated) {
          onPDFGenerated(resultLogement.pdfUrl, resultMenage.pdfUrl)
        }
      } else {
        // On remonte le message du webhook tel quel : il porte l'action à faire
        // (par exemple « le numéro de bien a changé pendant la génération,
        // rechargez la fiche et régénérez »), qu'un libellé générique effacerait.
        throw new Error(webhookResult.error || 'Échec du déclenchement du webhook')
      }

    } catch (err) {
      console.error('❌ Erreur génération PDF:', err)
      setError(err.message || 'Une erreur est survenue lors de la génération des PDF')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="pdf-upload-container">
      {/* Bouton principal */}
      <button
        onClick={generateAndUploadPDF}
        disabled={generating || !formData?.id}
        className={`py-4 px-8 rounded-lg font-semibold text-white text-lg transition-all ${generating || !formData?.id
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="31.416" strokeDashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite" />
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite" />
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
          <p className="font-semibold">⏳ Génération et synchronisation en cours...</p>
          <p className="text-sm">
            Veuillez patienter un instant.
          </p>
        </div>
      )}
    </div>
  )
}

export default PDFUpload