// src/lib/AlerteDetector.js
import { GRILLE_CRITERES, computeGrilleStats, proprietyFromGrilleNote, dangerLabelByKey } from './avisGrilleHelpers'

// Génère un aperçu synthétique du logement
export const generateApercu = (formData) => {
  const logement = formData.section_logement || {}
  const visite = formData.section_visite || {}
  const equipements = formData.section_equipements || {}
  const avis = formData.section_avis || {}
  
  // Nom du logement
  const nom = logement.typologie || 'Logement'
  
  // Capacité
  const capacite = {
    personnes: logement.nombre_personnes_max || 'Non renseigné',
    chambres: visite.nombre_chambres || 'Non renseigné',
    lits: logement.nombre_lits || 'Non renseigné',
    surface: logement.surface ? `${logement.surface} m²` : 'Non renseigné'
  }
  
  // Équipements clés
  const wifi = {
    disponible: equipements.wifi_statut === 'oui',
    texte: equipements.wifi_statut === 'oui' ? 'Disponible' : 
           equipements.wifi_statut === 'en_cours' ? 'En cours' : 'Non disponible'
  }
  
  const parking = {
    disponible: equipements.parking_type && (equipements.parking_type === 'rue' || equipements.parking_type === 'sur_place' || equipements.parking_type === 'payant'),
    texte: equipements.parking_type === 'rue' ? 'Gratuit (rue)' :
           equipements.parking_type === 'sur_place' ? 'Gratuit (sur place)' :
           equipements.parking_type === 'payant' ? 'Payant' : 'Non disponible'
  }
  
  // Atouts
  const atouts = []
  const atoutsLogement = avis.atouts_logement || {}
  if (atoutsLogement.lumineux) atouts.push('Lumineux')
  if (atoutsLogement.central) atouts.push('Central')
  if (atoutsLogement.paisible) atouts.push('Paisible')
  if (atoutsLogement.tranquille) atouts.push('Tranquille')
  if (atoutsLogement.vue_panoramique) atouts.push('Vue panoramique')
  if (atoutsLogement.spacieux) atouts.push('Spacieux')
  if (atoutsLogement.charmant) atouts.push('Charmant')
  if (atoutsLogement.renove) atouts.push('Rénové')
  if (wifi.disponible) atouts.push('WiFi')
  if (equipements.parking_type === 'rue') atouts.push('Parking gratuit')
  if (equipements.parking_type === 'sur_place') atouts.push('Parking gratuit')
  
  
  return {
    nom,
    capacite,
    equipements: { wifi, parking },
    atouts
  }
}

// Détecte les alertes dans la fiche
export const detectAlertes = (formData) => {
  const alertes = {
    critiques: [],
    moderees: [],
    elementsAbimes: []
  }
  
  const avis = formData.section_avis || {}
  const reglementation = formData.section_reglementation || {}
  const equipements = formData.section_equipements || {}
  const securite = formData.section_securite || {}
  
  // ALERTES CRITIQUES (rouge)
  
  // Zone à risques
  if (avis.quartier_securite === 'zone_risques') {
    alertes.critiques.push({
      icone: '🚨',
      titre: 'Zone à risques détectée',
      message: 'Le quartier est classé comme zone à risques',
      action: 'Vérifications supplémentaires recommandées'
    })
  }
  
  // Logement en mauvais état — la grille est la source de vérité (toujours fraîche
  // pendant l'édition), les champs legacy servent uniquement de fallback pour les
  // fiches antérieures à la refonte qui n'ont pas de grille remplie.
  const grilleStats = computeGrilleStats(avis)
  const verdictMauvais = grilleStats.verdict === 'etat_degrade' || grilleStats.verdict === 'tres_mauvais_etat'
  const legacyEtatMauvais = avis.logement_etat_general === 'etat_degrade' || avis.logement_etat_general === 'tres_mauvais_etat'
  if (verdictMauvais || (grilleStats.filled === 0 && legacyEtatMauvais)) {
    alertes.critiques.push({
      icone: '⚠️',
      titre: 'État général mauvais',
      message: 'Le logement nécessite des rénovations importantes',
      action: 'Travaux requis avant mise en location'
    })
  }

  // Propreté insuffisante — même logique : critère 1 de la grille en priorité,
  // legacy uniquement si grille vide.
  const propreteFromGrille = proprietyFromGrilleNote(avis.grille_proprete_generale_note)
  if (propreteFromGrille === 'sale' || (propreteFromGrille === null && avis.logement_proprete === 'sale')) {
    alertes.critiques.push({
      icone: '🧹',
      titre: 'Propreté insuffisante',
      message: 'Le logement nécessite un nettoyage en profondeur',
      action: 'Grand ménage obligatoire'
    })
  }

  // Danger sécurité — au moins un élément électrique dangereux coché dans la
  // vérification sécurité de la grille avis. Vieilles fiches sans sécurité
  // remplie : securite_dangers est null ou [] → pas d'alerte.
  if (avis.securite_dangers?.length > 0) {
    const dangersLisibles = avis.securite_dangers.map(dangerLabelByKey).join(' · ')
    alertes.critiques.push({
      icone: '🚨',
      titre: 'Danger sécurité détecté',
      message: `Éléments dangereux observés : ${dangersLisibles}`,
      action: 'Le logement ne doit pas être mis en location avant intervention.'
    })
  }

  // Pas de détecteur de fumée
  const detecteurFumee = securite.equipements?.includes('Détecteur de fumée')
  if (!detecteurFumee) {
    alertes.critiques.push({
      icone: '🔥',
      titre: 'Détecteur de fumée manquant',
      message: 'Obligatoire selon la réglementation',
      action: 'Installation immédiate requise'
    })
  }
  
  // ALERTES MODÉRÉES (orange)
  
  // Quartier défavorisé
  if (avis.quartier_types?.includes('quartier_defavorise')) {
    alertes.moderees.push({
      icone: '📍',
      titre: 'Quartier défavorisé',
      message: 'Peut impacter l\'attractivité du logement'
    })
  }
  
  // Perturbations détectées
  if (avis.quartier_perturbations === 'perturbateur') {
    alertes.moderees.push({
      icone: '🔊',
      titre: 'Perturbations signalées',
      message: avis.quartier_perturbations_details || 'Nuisances sonores ou autres perturbations'
    })
  }

  // Vis-à-vis important
  if (avis.logement_vis_a_vis === 'vis_a_vis_direct') {
    alertes.moderees.push({
      icone: '👀',
      titre: 'Vis-à-vis important',
      message: 'Manque d\'intimité, peut impacter l\'expérience'
    })
  }
  
  // WiFi non disponible
  if (equipements.wifi_statut === 'non') {
    alertes.moderees.push({
      icone: '📶',
      titre: 'WiFi non disponible',
      message: 'Équipement essentiel manquant pour la plupart des voyageurs'
    })
  }
  
  // Critères individuels en mauvais état (note ≤ 2) — utile pour repérer un
  // défaut isolé qui serait masqué par un verdict global correct (ex : cuisine
  // à 1/5 noyée dans un verdict "Bon état"). Skip si le verdict global est
  // déjà mauvais : l'alerte critique "État général mauvais" couvre déjà le cas.
  if (grilleStats.verdict !== 'etat_degrade' && grilleStats.verdict !== 'tres_mauvais_etat') {
    GRILLE_CRITERES.forEach((critere) => {
      const note = avis[`grille_${critere.key}_note`]
      if (typeof note === 'number' && note <= 2) {
        const niveau = critere.niveaux.find(n => n.val === note)
        alertes.moderees.push({
          icone: '📉',
          titre: `Défaut sur "${critere.label}"`,
          message: niveau ? `${niveau.name} : ${niveau.desc}` : `Note ${note}/5`
        })
      }
    })
  }

  // Démarches réglementaires requises
  if (reglementation.ville_changement_usage && reglementation.ville_changement_usage !== 'NON !') {
    alertes.moderees.push({
      icone: '📋',
      titre: 'Changement d\'usage requis',
      message: 'Démarche administrative à effectuer en mairie'
    })
  }
  
  if (reglementation.ville_declaration_simple && reglementation.ville_declaration_simple !== 'NON !') {
    alertes.moderees.push({
      icone: '📄',
      titre: 'Déclaration simple requise',
      message: 'Formulaire Cerfa à déposer en mairie'
    })
  }
  
  // ÉLÉMENTS ABÎMÉS
  const sectionsAbimes = [
    { key: 'section_cuisine_1', nom: 'Cuisine', icone: '🍳' },
    { key: 'section_salon_sam', nom: 'Salon/SAM', icone: '🛋️' },
    { key: 'section_chambres', nom: 'Chambres', icone: '🛏️' },
    { key: 'section_salle_de_bains', nom: 'Salle de bains', icone: '🚿' },
    { key: 'section_equip_spe_exterieur', nom: 'Extérieur', icone: '🏡' }
  ]
  
  sectionsAbimes.forEach(({ key, nom, icone }) => {
    const section = formData[key]
    if (!section) return
    
    // Vérifier les éléments abîmés dans la section
    if (section.elements_abimes === true) {
      alertes.elementsAbimes.push({ espace: nom, icone })
    }
    
    // Pour les chambres (accordéons)
    if (key === 'section_chambres') {
      for (let i = 1; i <= 6; i++) {
        const chambre = section[`chambre_${i}`]
        if (chambre?.elements_abimes === true) {
          alertes.elementsAbimes.push({ 
            espace: `Chambre ${i}`, 
            icone: '🛏️' 
          })
        }
      }
    }
    
    // Pour les SDB (accordéons)
    if (key === 'section_salle_de_bains') {
      for (let i = 1; i <= 6; i++) {
        const sdb = section[`salle_de_bain_${i}`]
        if (sdb?.elements_abimes === true) {
          alertes.elementsAbimes.push({ 
            espace: `Salle de bain ${i}`, 
            icone: '🚿' 
          })
        }
      }
    }
    
    // Pour les équipements extérieurs
    if (key === 'section_equip_spe_exterieur') {
      if (section.garage_elements_abimes === true) {
        alertes.elementsAbimes.push({ espace: 'Garage', icone: '🚗' })
      }
      if (section.buanderie_elements_abimes === true) {
        alertes.elementsAbimes.push({ espace: 'Buanderie', icone: '🧺' })
      }
      if (section.autres_pieces_elements_abimes === true) {
        alertes.elementsAbimes.push({ espace: 'Autres pièces', icone: '🏠' })
      }
    }
  })
  
  return alertes
}