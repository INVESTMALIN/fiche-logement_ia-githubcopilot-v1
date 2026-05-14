// src/lib/avisGrilleHelpers.js
// Logique partagée pour la grille d'évaluation objective (FicheAvis + supabaseHelpers + PDF)

export const GRILLE_CRITERES = [
  {
    key: 'proprete_generale',
    label: 'Propreté générale',
    niveaux: [
      { val: 5, name: 'Excellent état', desc: 'Parfaitement propre, aucune trace, ménage professionnel' },
      { val: 4, name: 'Bon état', desc: 'Propre, quelques détails mineurs oubliés' },
      { val: 3, name: 'État moyen', desc: 'Correct mais nécessite un nettoyage' },
      { val: 2, name: 'État dégradé', desc: 'Sale, poussières, traces visibles' },
      { val: 1, name: 'Mauvais état', desc: 'Très sale, insalubre (odeurs, salissures importantes, graisses incrustées, nuisibles/insectes)' }
    ]
  },
  {
    key: 'sols',
    label: 'Sols (parquet, carrelage, moquette)',
    niveaux: [
      { val: 5, name: 'Excellent état', desc: 'Impeccables, aucun défaut' },
      { val: 4, name: 'Bon état', desc: "Légères traces d'usure" },
      { val: 3, name: 'État moyen', desc: 'Usure visible (rayures, taches)' },
      { val: 2, name: 'État dégradé', desc: 'Dégradations (taches incrustées, usure forte)' },
      { val: 1, name: 'Mauvais état', desc: 'Très abîmés ou détériorés (trous, cassures)' }
    ]
  },
  {
    key: 'murs_plafonds',
    label: 'Murs et plafonds',
    niveaux: [
      { val: 5, name: 'Excellent état', desc: 'Neufs ou comme neufs' },
      { val: 4, name: 'Bon état', desc: 'Quelques micro-traces ou marques légères' },
      { val: 3, name: 'État moyen', desc: 'Traces visibles, jaunissement, petits trous' },
      { val: 2, name: 'État dégradé', desc: 'Nombreuses traces, fissures, peinture abîmée, trous mal rebouchés' },
      { val: 1, name: 'Mauvais état', desc: 'Très dégradés (humidité, moisissures, gros dégâts)' }
    ]
  },
  {
    key: 'cuisine',
    label: 'Cuisine (équipements + surfaces)',
    niveaux: [
      { val: 5, name: 'Excellent état', desc: 'Comme neuve, équipements impeccables' },
      { val: 4, name: 'Bon état', desc: 'Fonctionnelle et propre' },
      { val: 3, name: 'État moyen', desc: 'Fonctionnelle mais usée' },
      { val: 2, name: 'État dégradé', desc: 'Sale, équipements abîmés' },
      { val: 1, name: 'Mauvais état', desc: "Hors d'usage ou très détériorée (rouille, traces de brûlures)" }
    ]
  },
  {
    key: 'salle_bain',
    label: 'Salle de bain / WC',
    niveaux: [
      { val: 5, name: 'Excellent état', desc: 'Parfait état, aucune trace de calcaire ou moisissure' },
      { val: 4, name: 'Bon état', desc: 'Bon état, légères traces' },
      { val: 3, name: 'État moyen', desc: 'Usure visible (calcaire, joints fatigués)' },
      { val: 2, name: 'État dégradé', desc: 'Mauvais entretien, moisissures visibles, rouille, joints piqués' },
      { val: 1, name: 'Mauvais état', desc: 'Très dégradée, insalubre ou inutilisable (rouille, moisissure)' }
    ]
  },
  {
    key: 'equipements',
    label: 'Équipements (chauffage, électricité, etc.)',
    niveaux: [
      { val: 5, name: 'Excellent état', desc: 'Parfaitement fonctionnels, récents' },
      { val: 4, name: 'Bon état', desc: 'Fonctionnels sans problème' },
      { val: 3, name: 'État moyen', desc: 'Fonctionnels mais vieillissants' },
      { val: 2, name: 'État dégradé', desc: 'Dysfonctionnements partiels (prises arrachées, fils apparents)' },
      { val: 1, name: 'Mauvais état', desc: 'Non fonctionnels ou dangereux (fils dénudés, prises arrachées, câbles non protégés)' }
    ]
  },
  {
    key: 'menuiseries',
    label: 'Menuiseries (portes, fenêtres)',
    niveaux: [
      { val: 5, name: 'Excellent état', desc: 'Parfait état' },
      { val: 4, name: 'Bon état', desc: 'Bon état, légère usure' },
      { val: 3, name: 'État moyen', desc: 'Usure normale (fermeture moins fluide)' },
      { val: 2, name: 'État dégradé', desc: 'Abîmées ou difficiles à utiliser' },
      { val: 1, name: 'Mauvais état', desc: 'Cassées ou non fonctionnelles' }
    ]
  },
  {
    key: 'odeurs',
    label: 'Odeurs',
    niveaux: [
      { val: 5, name: 'Excellent état', desc: 'Aucune odeur' },
      { val: 4, name: 'Bon état', desc: 'Légère odeur neutre' },
      { val: 3, name: 'État moyen', desc: 'Odeur perceptible' },
      { val: 2, name: 'État dégradé', desc: 'Mauvaises odeurs' },
      { val: 1, name: 'Mauvais état', desc: 'Odeurs fortes, persistantes' }
    ]
  },
  {
    key: 'impression_generale',
    label: 'Impression générale',
    niveaux: [
      { val: 5, name: 'Excellent état', desc: 'Logement comme neuf, prêt à être occupé immédiatement sans intervention' },
      { val: 4, name: 'Bon état', desc: 'Logement agréable, habitable immédiatement' },
      { val: 3, name: 'État moyen', desc: 'Habitable mais nécessite un rafraîchissement' },
      { val: 2, name: 'État dégradé', desc: 'Nécessite travaux et nettoyage important' },
      { val: 1, name: 'Mauvais état', desc: "Non habitable en l'état" }
    ]
  }
]

export const SECURITE_DANGERS = [
  { key: 'fils_denudes', label: 'Fils dénudés' },
  { key: 'prises_arrachees', label: 'Prises arrachées / cassées' },
  { key: 'cables_non_proteges', label: 'Câbles apparents non protégés' },
  { key: 'disjoncteur_defaillant', label: 'Disjoncteur défaillant / absent' },
  { key: 'installation_dangereuse', label: 'Installation électrique dangereuse' },
  { key: 'chauffage_dangereux', label: 'Chauffage défectueux ou dangereux' },
  { key: 'odeur_brule', label: 'Odeur de brûlé / échauffement' }
]

export const dangerLabelByKey = (key) =>
  SECURITE_DANGERS.find(d => d.key === key)?.label || key

export const TYPES_PASSAGE = [
  'Vérification / Inventaire',
  'Classique',
  'Fait par Proprio',
  'Approfondi',
  'Remise en état',
  'Pas nécessaire'
]

// Verdict global → label affichable + clé legacy stockée dans avis_logement_etat_general
export const VERDICTS = [
  { key: 'excellent_etat', min: 40, label: 'Excellent état' },
  { key: 'bon_etat', min: 34, label: 'Bon état' },
  { key: 'etat_moyen', min: 25, label: 'État moyen' },
  { key: 'etat_degrade', min: 16, label: 'État dégradé' },
  { key: 'tres_mauvais_etat', min: 0, label: 'Mauvais état' }
]

export const computeGrilleStats = (sectionAvis) => {
  if (!sectionAvis) return { total: 0, filled: 0, verdict: null, verdictLabel: null }
  let total = 0
  let filled = 0
  GRILLE_CRITERES.forEach(({ key }) => {
    const note = sectionAvis[`grille_${key}_note`]
    if (typeof note === 'number' && note >= 1 && note <= 5) {
      total += note
      filled += 1
    }
  })
  const verdict = filled === GRILLE_CRITERES.length
    ? VERDICTS.find(v => total >= v.min)
    : null
  return {
    total,
    filled,
    verdict: verdict ? verdict.key : null,
    verdictLabel: verdict ? verdict.label : null
  }
}

// Mapping note critère "Propreté générale" → valeur legacy avis_logement_proprete
export const proprietyFromGrilleNote = (note) => {
  if (typeof note !== 'number') return null
  if (note === 5) return 'propre'
  if (note >= 3) return 'correct'
  return 'sale'
}
