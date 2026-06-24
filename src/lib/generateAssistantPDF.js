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
  // "GENERE LE" : date de génération de l'annonce si fournie (metadata.generated_at),
  // sinon date du jour (comportement historique de l'ancien flux). Garde-fou si la
  // date est invalide → on retombe sur aujourd'hui.
  const dateSource = metadata.generated_at ? new Date(metadata.generated_at) : new Date()
  const dateStr = (Number.isNaN(dateSource.getTime()) ? new Date() : dateSource).toLocaleDateString('fr-FR')
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

// RENDER : Contenu avec détection mixte (Majuscules OU Deux points)
const renderContent = (doc, content, yPos) => {
  const lines = content.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Reset page break check
    yPos = checkPageBreak(doc, yPos, 10)
    
    const trimmedLine = line.trim()
    
    // On ignore les lignes vides ou les séparateurs simples
    if (!trimmedLine || trimmedLine === '-') {
      continue
    }

    // --- LOGIQUE DE DÉTECTION ---

    // 1. Nettoyage pour vérification majuscules (on enlève les tirets, puces et espaces au début)
    // Ex: "- ANALYSE DU TRANSCRIPT" devient "ANALYSE DU TRANSCRIPT"
    const cleanText = trimmedLine.replace(/^[-•\s]+/, '')

    // 2. Détection TITRE GUIDE (Ancienne logique : tout en majuscules)
    // On vérifie qu'il y a des lettres et que c'est égal à sa version majuscule
    const hasLetters = /[a-zA-Z]/.test(cleanText)
    const isUppercase = hasLetters && (cleanText === cleanText.toUpperCase()) && cleanText.length > 3

    // 3. Détection TITRE ANNONCE (Nouvelle logique : finit par deux points)
    const endsWithColon = trimmedLine.endsWith(':') || trimmedLine.endsWith(':\u00a0')
    
    // Titre détecté si l'une des deux conditions est vraie
    // On ajoute une limite de longueur (100 chars) pour éviter de mettre en gras tout un paragraphe qui finirait par :
    const isTitle = (isUppercase || endsWithColon) && trimmedLine.length < 100

    // --- APPLICATION DU STYLE ---

    if (isTitle) {
      // TITRE (Guide ou Annonce) : Gras, Orange
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12) 
      doc.setTextColor(COLORS.primaryDark) // Orange Letahost
      
      // Petit espace avant le titre
      yPos += 4 
    } else {
      // TEXTE NORMAL
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(COLORS.dark)
    }
    
    // --- WRAPPING DU TEXTE ---
    const words = trimmedLine.split(' ')
    let currentLine = ''
    
    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      const testWidth = doc.getTextWidth(testLine)
      
      if (testWidth > LAYOUT.contentWidth && currentLine) {
        doc.text(currentLine, LAYOUT.marginLeft, yPos)
        yPos += 5 // Hauteur de ligne
        yPos = checkPageBreak(doc, yPos, 6)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })
    
    if (currentLine) {
      doc.text(currentLine, LAYOUT.marginLeft, yPos)
      yPos += 5
    }
    
    // --- ESPACEMENT APRÈS ---
    if (isTitle) {
      yPos += 2 // Espace après titre
    } else {
      yPos += 1.5 // Espace après paragraphe
    }
    
    yPos = checkPageBreak(doc, yPos, 6)
  }

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

// ============================================================
// PDF de l'agent annonce (nouveau) — rendu STRUCTURÉ
// ------------------------------------------------------------
// L'agent annonce produit une annonce STRUCTURÉE (sections de output_assemble),
// pas du texte brut. On ne passe donc PAS par renderContent (heuristique
// majuscules/deux-points) : on rend des sections à TITRES EXPLICITES, dans l'ordre
// du rendu écran (AnnonceRendu.jsx), tout en réutilisant le header/footer Letahost
// (ligne dorée, bandeau BIEN N° / TYPE / GÉNÉRÉ LE / ADRESSE).
//
// Pas d'upload bucket ici (contrairement à generateAnnoncePDF) : le PDF part
// directement sur Monday via l'Edge Function annonce-validate. On renvoie donc le
// PDF en base64, prêt à être transporté en JSON.
// ============================================================

const hasText = (v) => typeof v === 'string' && v.trim() !== ''

// Mentions réglementaires (objet) → lignes affichables (mêmes règles qu'AnnonceRendu).
const mentionsReglementairesCorps = (mr = {}) =>
  [
    hasText(mr.numero_enregistrement) && `Numéro d'enregistrement : ${mr.numero_enregistrement}`,
    hasText(mr.dpe_classe) && `Classe DPE : ${mr.dpe_classe}`,
    hasText(mr.mention_consommation_excessive) && mr.mention_consommation_excessive,
    hasText(mr.estimation_depenses_annuelles) && mr.estimation_depenses_annuelles,
  ]
    .filter(Boolean)
    .join('\n')

// output_assemble → sections ordonnées { titre, corps }. Une section vide (corps
// non renseigné) est omise, comme le rendu écran masque un bloc vide.
function buildAnnonceSections(outputAssemble, plateforme) {
  const sections = []
  const push = (titre, corps) => { if (hasText(corps)) sections.push({ titre, corps }) }

  if (plateforme === 'booking') {
    const b = outputAssemble?.booking || {}
    push("Nom de l'hébergement", b.nom)
    push('About the property', b.about_property)
    push('About the neighbourhood', b.about_neighbourhood)
    push('About the host', b.about_host)
    push('Mentions réglementaires', mentionsReglementairesCorps(b.mentions_reglementaires))
    push("Note sur l'état", b.note_etat)
    push('Note sur le quartier', b.note_quartier)
    push('Caméra (déclaration)', b.note_camera)
  } else {
    const a = outputAssemble?.airbnb || {}
    const titres = Array.isArray(a.titres) ? a.titres.filter(hasText) : []
    if (titres.length) push('Propositions de titre', titres.map((t, i) => `${i + 1}. ${t}`).join('\n'))
    if (typeof a.nombre_voyageurs === 'number') push('Capacité', `${a.nombre_voyageurs} voyageurs`)
    push('Description', a.description)
    push('Le logement', a.logement)
    push('Accès des voyageurs', a.acces_voyageurs)
    push('Échanges voyageurs', a.echanges_voyageurs)
    push('Le quartier', a.quartier)
    push('Comment se déplacer', a.comment_se_deplacer)
    push('Autres remarques', a.autres_remarques)
    push('Mentions réglementaires', mentionsReglementairesCorps(a.mentions_reglementaires))
    push("Note sur l'état", a.note_etat)
    push('Note sur le quartier', a.note_quartier)
  }
  return sections
}

// Titre de section : gras, doré (même esprit que les titres de renderContent).
function renderStructuredTitle(doc, titre, yPos) {
  yPos = checkPageBreak(doc, yPos, 14) // titre + au moins une ligne de corps
  yPos += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(COLORS.primaryDark)
  doc.text(titre, LAYOUT.marginLeft, yPos)
  return yPos + 6
}

// Une ligne logique de corps (peut wrapper sur plusieurs lignes physiques). Une
// ligne vide = petit espace vertical (préserve les blocs par zone du champ logement).
function renderStructuredBodyLine(doc, line, yPos) {
  if (!line.trim()) return yPos + 3
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(COLORS.dark)

  const words = line.trim().split(' ')
  let currentLine = ''
  words.forEach((word) => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word
    if (doc.getTextWidth(testLine) > LAYOUT.contentWidth && currentLine) {
      yPos = checkPageBreak(doc, yPos, 6)
      doc.text(currentLine, LAYOUT.marginLeft, yPos)
      yPos += 5
      currentLine = word
    } else {
      currentLine = testLine
    }
  })
  if (currentLine) {
    yPos = checkPageBreak(doc, yPos, 6)
    doc.text(currentLine, LAYOUT.marginLeft, yPos)
    yPos += 5
  }
  return yPos
}

function renderStructuredSections(doc, sections, yPos) {
  for (const section of sections) {
    yPos = renderStructuredTitle(doc, section.titre, yPos)
    for (const line of section.corps.split('\n')) {
      yPos = renderStructuredBodyLine(doc, line, yPos)
    }
    yPos += 2 // respiration après la section
  }
  return yPos
}

/**
 * Fabrique le PDF d'une annonce STRUCTURÉE (output_assemble) et le renvoie en
 * base64 (sans préfixe data:). Header/footer Letahost réutilisés. Aucun upload
 * bucket : le base64 est transporté tel quel vers l'Edge Function annonce-validate
 * qui le pousse sur Monday.
 *
 * @param {object}  params
 * @param {object}  params.outputAssemble  Sortie assemblée { airbnb } | { booking }.
 * @param {string}  params.plateforme      'airbnb' | 'booking'.
 * @param {object}  params.metadata        { numero_bien, type_propriete, adresse, generated_at }.
 * @returns {string} base64 du PDF.
 */
export function buildAnnonceStructuredPdfBase64({ outputAssemble, plateforme, metadata = {} }) {
  const doc = new jsPDF('p', 'mm', 'a4')

  let yPos = renderHeader(doc, 'annonce', metadata)
  const sections = buildAnnonceSections(outputAssemble, plateforme)
  if (sections.length === 0) {
    throw new Error('Annonce vide : aucune section à imprimer')
  }
  renderStructuredSections(doc, sections, yPos)
  renderFooter(doc, 'annonce', metadata)

  // datauristring → 'data:application/pdf;base64,XXXX' : on ne garde que le base64.
  const dataUri = doc.output('datauristring')
  const base64 = dataUri.includes(',') ? dataUri.slice(dataUri.indexOf(',') + 1) : ''
  if (!base64) throw new Error('Échec de la sérialisation du PDF')
  return base64
}