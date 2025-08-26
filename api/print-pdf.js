// pages/api/print-pdf.js - MVP Test Route
import playwright from 'playwright-aws-lambda'

export const config = { 
  api: { 
    bodyParser: false, 
    maxDuration: 60 
  } 
}

export default async function handler(req, res) {
  try {
    const fiche = req.query.fiche
    if (!fiche) {
      return res.status(400).json({ error: 'Missing fiche parameter' })
    }

    console.log('🚀 Génération PDF serveur pour fiche:', fiche)

    // Lancer navigateur headless
    const browser = await playwright.launchChromium()
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      locale: 'fr-FR'
    })
    const page = await context.newPage()

    // Utiliser ta route print existante
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:5173' // Pour le dev local
    
    const url = `${baseUrl}/print-pdf?fiche=${encodeURIComponent(fiche)}`
    
    console.log('📄 Chargement page:', url)
    
    // Charger la page et attendre le rendu complet
    await page.goto(url, { waitUntil: 'networkidle' })
    
    // Attendre que le container PDF soit prêt
    await page.waitForSelector('.pdf-container', { timeout: 15000 })
    
    // Attendre un peu plus pour être sûr que tout est rendu
    await page.waitForTimeout(3000)

    console.log('📄 Génération PDF avec moteur Chromium...')

    // Générer PDF avec moteur natif Chromium
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { 
        top: '15mm', 
        right: '15mm', 
        bottom: '15mm', 
        left: '15mm' 
      }
    })

    await browser.close()
    
    console.log('✅ PDF généré côté serveur, taille:', (pdf.length / 1024 / 1024).toFixed(2), 'MB')

    // Retourner le PDF
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Cache-Control', 'no-store')
    res.send(Buffer.from(pdf))
    
  } catch (error) {
    console.error('❌ Erreur génération PDF serveur:', error)
    res.status(500).json({ 
      error: 'Erreur génération PDF', 
      details: error.message 
    })
  }
}