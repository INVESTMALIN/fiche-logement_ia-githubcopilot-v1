// scripts/lib/mondayBackfillPlan.mjs
//
// Cœur PUR du rattrapage one-shot des identifiants / mots de passe vers
// Monday (script `scripts/monday-backfill-credentials.mjs`). Aucun accès
// réseau, aucune variable d'environnement : testable tel quel
// (scripts/tests/mondayBackfillPlan.test.mjs).
//
// RÈGLE DE SÉCURITÉ — différente du sync au fil de l'eau :
//   on ne remplit QUE les cellules Monday actuellement VIDES, et seulement si
//   la base a une valeur. Une cellule déjà remplie n'est jamais écrasée (on ne
//   peut pas garantir sur tout l'historique qu'une saisie manuelle ancienne
//   corresponde à la base).
//
// AUCUNE VALEUR dans ce qui sort de ce module vers un rapport ou un log :
//   les décisions nomment la fiche, le numéro, l'item et la colonne, jamais
//   l'email ni le mot de passe. Les valeurs ne vivent que dans `ecritures`,
//   consommé par le script pour appeler Monday, jamais sérialisé.

// Mêmes colonnes que supabase/functions/monday-sync/sync.ts (COLUMN_IDS)
export const BOARD_ID = '1272144935'
export const COLONNE_NUMERO = 'num_ro'

export const CHAMPS = Object.freeze([
  { field: 'airbnb_email', columnId: 'text_mm2qs0eh', label: 'Identifiant Airbnb' },
  { field: 'booking_email', columnId: 'text_mm2qg8ar', label: 'Identifiant Booking' },
  { field: 'airbnb_mot_passe', columnId: 'text_mm2q5tw8', label: 'MDP Airbnb' },
  { field: 'booking_mot_passe', columnId: 'text_mm2qaz6a', label: 'MDP Booking' }
])

export const COLONNES_LUES = Object.freeze([COLONNE_NUMERO, ...CHAMPS.map((c) => c.columnId)])

// Raisons de saut, par fiche ou par cellule
export const RAISONS = Object.freeze({
  DEJA_REMPLI: 'cellule Monday déjà remplie (jamais écrasée)',
  BASE_VIDE: 'aucune valeur en base',
  ITEM_ABSENT: 'aucune ligne Monday pour ce numéro de bien',
  ITEM_AMBIGU: 'plusieurs lignes Monday pour ce numéro de bien (aucune écriture)',
  NUMERO_VIDE: 'numéro de bien vide en base'
})

export const estVide = (v) => v === undefined || v === null || String(v).trim() === ''

const numero = (v) => (v === undefined || v === null ? '' : String(v).trim())

/**
 * Indexe les items Monday par numéro de bien (texte de la colonne num_ro).
 * @param {Array<{ id: string, name?: string, column_values: Array<{ id: string, text: string|null }> }>} items
 * @returns {Map<string, Array<{ id: string, cellules: Record<string, string|null> }>>}
 */
export function indexerItems(items) {
  const parNumero = new Map()
  for (const item of items) {
    const cellules = {}
    for (const cv of item.column_values || []) cellules[cv.id] = cv.text ?? null
    const n = numero(cellules[COLONNE_NUMERO])
    if (!n) continue
    if (!parNumero.has(n)) parNumero.set(n, [])
    parNumero.get(n).push({ id: String(item.id), cellules })
  }
  return parNumero
}

/**
 * Calcule le plan de rattrapage.
 *
 * @param {Array<Record<string, unknown>>} fiches — lignes `fiches` Complété :
 *   { id, logement_numero_bien, airbnb_email, booking_email, airbnb_mot_passe, booking_mot_passe }
 * @param {Map} itemsParNumero — sortie de `indexerItems`
 * @returns {{
 *   decisions: Array<{ ficheId, numeroBien, itemId, field, columnId, label, action: 'remplir'|'sauter', raison?: string }>,
 *   ecritures: Array<{ ficheId, numeroBien, itemId, field, columnId, label, valeur: string }>,
 *   fichesSautees: Array<{ ficheId, numeroBien, raison: string, itemIds?: string[] }>
 * }}
 *   `decisions` et `fichesSautees` sont sans valeur (rapport). `ecritures`
 *   porte les valeurs : à ne JAMAIS sérialiser.
 */
export function planifierRattrapage(fiches, itemsParNumero) {
  const decisions = []
  const ecritures = []
  const fichesSautees = []

  const triees = [...fiches].sort((a, b) => numero(a.logement_numero_bien).localeCompare(numero(b.logement_numero_bien), 'fr', { numeric: true }))

  for (const fiche of triees) {
    const ficheId = String(fiche.id)
    const numeroBien = numero(fiche.logement_numero_bien)

    // Rien à remplir pour cette fiche → pas la peine de parler d'item
    const champsAvecValeur = CHAMPS.filter((c) => !estVide(fiche[c.field]))

    if (!numeroBien) {
      fichesSautees.push({ ficheId, numeroBien, raison: 'NUMERO_VIDE' })
      continue
    }
    const items = itemsParNumero.get(numeroBien) || []
    if (items.length === 0) {
      fichesSautees.push({ ficheId, numeroBien, raison: 'ITEM_ABSENT' })
      continue
    }
    if (items.length > 1) {
      fichesSautees.push({ ficheId, numeroBien, raison: 'ITEM_AMBIGU', itemIds: items.map((i) => i.id) })
      continue
    }
    const item = items[0]

    for (const c of CHAMPS) {
      const base = { ficheId, numeroBien, itemId: item.id, field: c.field, columnId: c.columnId, label: c.label }
      if (!estVide(item.cellules[c.columnId])) {
        decisions.push({ ...base, action: 'sauter', raison: 'DEJA_REMPLI' })
      } else if (!champsAvecValeur.includes(c)) {
        decisions.push({ ...base, action: 'sauter', raison: 'BASE_VIDE' })
      } else {
        decisions.push({ ...base, action: 'remplir' })
        ecritures.push({ ...base, valeur: String(fiche[c.field]) })
      }
    }
  }
  return { decisions, ecritures, fichesSautees }
}

/**
 * Totaux du plan, sans aucune valeur.
 */
export function resumer(plan) {
  const parColonne = {}
  for (const c of CHAMPS) parColonne[c.label] = { remplir: 0, DEJA_REMPLI: 0, BASE_VIDE: 0 }
  for (const d of plan.decisions) {
    const cible = parColonne[d.label]
    if (d.action === 'remplir') cible.remplir++
    else cible[d.raison]++
  }
  const fichesTouchees = new Set(plan.ecritures.map((e) => e.ficheId))
  const fichesSautees = {}
  for (const f of plan.fichesSautees) fichesSautees[f.raison] = (fichesSautees[f.raison] || 0) + 1
  return {
    cellulesARemplir: plan.ecritures.length,
    fichesTouchees: fichesTouchees.size,
    parColonne,
    fichesSautees
  }
}

/**
 * Remplace toute occurrence des valeurs données par •••, puis tronque.
 * Monday peut renvoyer la valeur refusée dans son message d'erreur.
 */
export function masquer(message, valeurs, max = 300) {
  let out = String(message ?? '')
  for (const v of valeurs) {
    if (typeof v === 'string' && v.length > 0) out = out.split(v).join('•••')
  }
  return out.length > max ? out.slice(0, max) + '…' : out
}
