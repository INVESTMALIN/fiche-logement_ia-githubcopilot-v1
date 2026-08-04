// src/lib/consommablesRecap.js
//
// Source unique des libellés de la section Consommables, et construction du
// rappel affiché en lecture seule dans la section Instructions Ménage.
//
// ⚠️ Le rappel ne stocke RIEN. Aucune colonne, aucune copie, aucune
// synchronisation. Il est recalculé à chaque rendu depuis `section_consommables`,
// donc une modification côté Consommables se voit immédiatement, sans save.
//
// Ce module est importé par FicheConsommables (la saisie) et par
// FicheInstructionsMenage (le rappel) : les deux écrans ne peuvent pas diverger.
// Les deux templates PDF gardent, eux, leurs propres copies — ce sont des
// fichiers volontairement indépendants (cf. docs/📄 PLAN UPLOAD PDF.md).

// Liste fixe : ce que le prestataire DOIT fournir dès lors que les consommables
// du quotidien sont à sa charge. Libellés métier figés.
export const CONSOMMABLES_OBLIGATOIRES = [
  '2 rouleaux de papier toilette par toilette',
  '1 savon pour les mains disponible par lavabo',
  '1 produit vaisselle par cuisine',
  '1 éponge par cuisine (en bon état)',
  'Sel, poivre, sucre (en quantité adéquate)',
  'Café et thé (1 sachet par personne)',
  'Essuie-tout/Sopalin',
  'Sac poubelle',
  'Produit vitres',
  'Produit sol',
  'Produit salle de bain/multi-surfaces ou vinaigre ménager',
  'Produit WC / Javel'
]

// Consommables « sur demande » — cochés au cas par cas pour ce logement.
export const CONSOMMABLES_SUR_DEMANDE = [
  { key: 'gel_douche', label: 'Gel douche' },
  { key: 'shampoing', label: 'Shampoing' },
  { key: 'apres_shampoing', label: 'Après Shampoing' },
  { key: 'pastilles_lave_vaisselle', label: 'Pastilles, sel et liquide de rinçage pour lave-vaisselle' },
  { key: 'autre_consommable', label: 'Autre (précisez)', detailsKey: 'autre_consommable_details' }
]

export const CONSOMMABLES_CAFE = [
  { key: 'cafe_nespresso', label: 'Nespresso' },
  { key: 'cafe_senseo', label: 'Senseo' },
  { key: 'cafe_tassimo', label: 'Tassimo' },
  { key: 'cafe_soluble', label: 'Café soluble' },
  { key: 'cafe_moulu', label: 'Café moulu' },
  { key: 'cafe_grain', label: 'Café grain' },
  { key: 'cafe_autre', label: 'Autre (précisez)', detailsKey: 'cafe_autre_details' }
]

// Booléens `*_par_prestataire` : true = prestataire de ménage, false = propriétaire,
// null = non renseigné. Même convention que le kit de bienvenue.
export const labelFournisseur = (value) => {
  if (value === true) return 'Prestataire de ménage'
  if (value === false) return 'Propriétaire'
  return null
}

// Développe une liste de cases à cocher en libellés, en substituant la précision
// libre quand la case « Autre » est cochée et renseignée.
const cochesToLabels = (options, data) =>
  options
    .filter(({ key }) => data[key] === true)
    .map(({ label, detailsKey }) => {
      const details = detailsKey ? (data[detailsKey] || '').trim() : ''
      return details || label
    })

/**
 * Construit le rappel des consommables à partir de `section_consommables`.
 * Fonction pure : mêmes entrées → mêmes sorties, aucun effet de bord.
 *
 * @param {Object} sectionConsommables — formData.section_consommables
 * @returns {{
 *   premierPanier: string|null,
 *   quotidien: string|null,
 *   obligatoiresApplicables: boolean,
 *   obligatoires: string[],
 *   surDemande: string[],
 *   cafe: string[],
 *   isEmpty: boolean
 * }}
 */
export function buildConsommablesRecap(sectionConsommables) {
  const data = sectionConsommables || {}

  const premierPanier = labelFournisseur(data.premier_panier_par_prestataire)
  const quotidien = labelFournisseur(data.fournis_par_prestataire)

  // La liste rouge ne s'applique que si le quotidien est à la charge du
  // prestataire — même condition que dans FicheConsommables.
  const obligatoiresApplicables = data.fournis_par_prestataire === true

  // Idem pour les « sur demande » : ils ne sont saisissables que dans ce cas.
  const surDemande = obligatoiresApplicables
    ? cochesToLabels(CONSOMMABLES_SUR_DEMANDE, data)
    : []

  // Le café est toujours saisissable, quel que soit le fournisseur.
  const cafe = cochesToLabels(CONSOMMABLES_CAFE, data)

  return {
    premierPanier,
    quotidien,
    obligatoiresApplicables,
    obligatoires: obligatoiresApplicables ? CONSOMMABLES_OBLIGATOIRES : [],
    surDemande,
    cafe,
    isEmpty:
      !premierPanier &&
      !quotidien &&
      surDemande.length === 0 &&
      cafe.length === 0
  }
}
