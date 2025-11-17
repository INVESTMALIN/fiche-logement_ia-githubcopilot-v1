// src/lib/generateAssistantPDF.js
// Génération PDF pour assistants IA (Guide d'accès + Annonce)
// VERSION SIMPLE ET ROBUSTE

import { jsPDF } from 'jspdf'
import { supabase } from './supabaseClient'

// PALETTE LETAHOST
const COLORS = {
  primary: '#dbae61',
  primaryDark: '#c19b4f',
  dark: '#1a202c',
  gray: '#4a5568',
  lightGray: '#e2e8f0',
}

// CONSTANTES LAYOUT
const LAYOUT = {
  marginLeft: 20,
  marginRight: 20,
  marginTop: 25,
  marginBottom: 25,
  pageWidth: 210,
  pageHeight: 297,
  contentWidth: 170,
}

// HELPER : Vérifier si besoin de page break
const checkPageBreak = (doc, yPos, spaceNeeded = 20) => {
  const maxY = LAYOUT.pageHeight - LAYOUT.marginBottom
  
  if (yPos + spaceNeeded > maxY) {
    doc.addPage()
    return LAYOUT.marginTop
  }
  
  return yPos
}

// RENDER : Header commun
const renderHeader = (doc, type, metadata) => {
  let yPos = LAYOUT.marginTop

  // Ligne dorée en haut
  doc.setDrawColor(219, 174, 97)
  doc.setLineWidth(2)
  doc.line(LAYOUT.marginLeft, yPos, LAYOUT.pageWidth - LAYOUT.marginRight, yPos)
  yPos += 10

  // Titre principal
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.primaryDark)
  const title = type === 'guide' ? 'Guide d\'Acces' : 'Annonce du Logement'
  doc.text(title, LAYOUT.marginLeft, yPos)
  yPos += 10

  // Sous-titre Letahost
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.gray)
  doc.text('Letahost - Conciergerie de luxe', LAYOUT.marginLeft, yPos)
  yPos += 8

  // Ligne de séparation
  doc.setDrawColor(219, 174, 97)
  doc.setLineWidth(0.5)
  doc.line(LAYOUT.marginLeft, yPos, LAYOUT.pageWidth - LAYOUT.marginRight, yPos)
  yPos += 10

  // INFO LOGEMENT
  doc.setFontSize(9)
  
  // Numéro bien
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gray)
  doc.text('BIEN N°', LAYOUT.marginLeft, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.dark)
  doc.text(metadata.numero_bien || 'N/A', LAYOUT.marginLeft, yPos + 4)

  // Type logement
  const col2X = LAYOUT.marginLeft + 60
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gray)
  doc.text('TYPE', col2X, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.dark)
  doc.text(metadata.type_propriete || 'Non specifie', col2X, yPos + 4)

  // Date génération
  const col3X = LAYOUT.marginLeft + 120
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gray)
  doc.text('GENERE LE', col3X, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.dark)
  const dateStr = new Date().toLocaleDateString('fr-FR')
  doc.text(dateStr, col3X, yPos + 4)

  yPos += 12

  // Adresse (si disponible)
  if (metadata.adresse && metadata.adresse.ville) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.gray)
    doc.text('ADRESSE', LAYOUT.marginLeft, yPos)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.dark)
    
    const adresseParts = [
      metadata.adresse.rue,
      metadata.adresse.complement,
      metadata.adresse.code_postal,
      metadata.adresse.ville
    ].filter(Boolean)
    
    const adresseComplete = adresseParts.join(', ')
    
    // Wrapper manuellement l'adresse
    const words = adresseComplete.split(' ')
    let currentLine = ''
    let lineCount = 0
    
    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      const testWidth = doc.getTextWidth(testLine)
      
      if (testWidth > LAYOUT.contentWidth && currentLine) {
        doc.text(currentLine, LAYOUT.marginLeft, yPos + 4 + (lineCount * 4))
        lineCount++
        currentLine = word
      } else {
        currentLine = testLine
      }
    })
    
    if (currentLine) {
      doc.text(currentLine, LAYOUT.marginLeft, yPos + 4 + (lineCount * 4))
      lineCount++
    }
    
    yPos += 4 + (lineCount * 4) + 8
  } else {
    yPos += 8
  }

  // Ligne de séparation finale
  doc.setDrawColor(COLORS.lightGray)
  doc.setLineWidth(0.3)
  doc.line(LAYOUT.marginLeft, yPos, LAYOUT.pageWidth - LAYOUT.marginRight, yPos)
  yPos += 10

  return yPos
}

// RENDER : Contenu SIMPLE (pas de formatage complexe)
// RENDER : Contenu avec détection titres Annonce + Guide
const renderContent = (doc, content, yPos) => {
  const lines = content.split('\n').filter(line => line.trim())

  lines.forEach((line) => {
    yPos = checkPageBreak(doc, yPos, 10)
    
    const trimmedLine = line.trim()
    
    // Détecter les titres
    const isSectionTitle = trimmedLine.includes('SECTION')
    const isUppercaseTitle = trimmedLine === trimmedLine.toUpperCase() && 
                             trimmedLine.length > 3 && 
                             trimmedLine.length < 100
    
    if (isSectionTitle) {
      // TITRE SECTION (Annonce) : gras orange
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(COLORS.primaryDark)
    } else if (isUppercaseTitle) {
      // TITRE MAJUSCULES (Guide) : gras noir
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(COLORS.primaryDark)
    } else {
      // TEXTE NORMAL
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(COLORS.dark)
    }
    
    // Wrapper le texte manuellement
    const words = trimmedLine.split(' ')
    let currentLine = ''
    
    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      const testWidth = doc.getTextWidth(testLine)
      
      if (testWidth > LAYOUT.contentWidth && currentLine) {
        doc.text(currentLine, LAYOUT.marginLeft, yPos)
        yPos += 6
        yPos = checkPageBreak(doc, yPos, 6)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })
    
    if (currentLine) {
      doc.text(currentLine, LAYOUT.marginLeft, yPos)
      yPos += 6
    }
    
    yPos += 1
  })

  return yPos
}

// RENDER : Footer
const renderFooter = (doc, type, metadata) => {
  const pageCount = doc.internal.getNumberOfPages()
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    
    const yPos = LAYOUT.pageHeight - 15
    
    // Ligne de séparation
    doc.setDrawColor(COLORS.lightGray)
    doc.setLineWidth(0.3)
    doc.line(LAYOUT.marginLeft, yPos, LAYOUT.pageWidth - LAYOUT.marginRight, yPos)
    
    // Texte footer
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.gray)
    
    const footerText = `Letahost - ${type === 'guide' ? 'Guide d\'acces' : 'Annonce'} - Bien #${metadata.numero_bien || 'N/A'}`
    doc.text(footerText, LAYOUT.marginLeft, yPos + 5)
    
    // Numéro de page
    doc.text(`Page ${i}/${pageCount}`, LAYOUT.pageWidth - LAYOUT.marginRight - 15, yPos + 5)
  }
}

/**
 * Générer PDF Guide d'accès
 */
export const generateGuideAccesPDF = async (content, metadata, ficheId) => {
  console.log('📄 Génération PDF Guide d\'accès...')
  
  try {
    const doc = new jsPDF('p', 'mm', 'a4')
    
    let yPos = renderHeader(doc, 'guide', metadata)
    yPos = renderContent(doc, content, yPos)
    renderFooter(doc, 'guide', metadata)
    
    const pdfBlob = doc.output('blob')
    const fileName = `guide_acces_${ficheId}.pdf`
    
    const { error: uploadError } = await supabase.storage
      .from('guide-acces-pdfs')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      })
    
    if (uploadError) throw uploadError
    
    const { data: { publicUrl } } = supabase.storage
      .from('guide-acces-pdfs')
      .getPublicUrl(fileName)
    
    console.log('✅ PDF Guide d\'accès généré:', publicUrl)
    return publicUrl
    
  } catch (error) {
    console.error('❌ Erreur génération PDF Guide d\'accès:', error)
    throw error
  }
}

/**
 * Générer PDF Annonce
 */
export const generateAnnoncePDF = async (content, metadata, ficheId) => {
  console.log('📄 Génération PDF Annonce...')
  
  try {
    const doc = new jsPDF('p', 'mm', 'a4')
    
    let yPos = renderHeader(doc, 'annonce', metadata)
    yPos = renderContent(doc, content, yPos)
    renderFooter(doc, 'annonce', metadata)
    
    const pdfBlob = doc.output('blob')
    const fileName = `annonce_${ficheId}.pdf`
    
    const { error: uploadError } = await supabase.storage
      .from('annonce-pdfs')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      })
    
    if (uploadError) throw uploadError
    
    const { data: { publicUrl } } = supabase.storage
      .from('annonce-pdfs')
      .getPublicUrl(fileName)
    
    console.log('✅ PDF Annonce généré:', publicUrl)
    return publicUrl
    
  } catch (error) {
    console.error('❌ Erreur génération PDF Annonce:', error)
    throw error
  }
}