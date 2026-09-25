// supabase/functions/monday-sync/sync.ts
//
// Cœur PUR de la synchronisation Fiche Logement → Monday : aucun accès
// réseau ni environnement ici. Tout ce qui parle à Monday ou à Supabase est
// injecté (`Deps`), ce qui permet de prouver par test l'isolation des champs
// et le calcul du snapshot sans appeler ni Monday ni la base.
//
// Les 7 champs synchronisés (board 1272144935) :
// - type_premier_menage      → colonne Premiers Ménages (status, `statut47`)
// - type_premiere_maintenance → colonne Maintenance     (status, `color_mm3ftnef`)
// - airbnb_mot_passe          → MDP Airbnb Propriétaire (text)
// - booking_mot_passe         → MDP Booking Propriétaire (text)
// - airbnb_email              → Identifiant Airbnb Propriétaire (text)
// - booking_email             → Identifiant Booking Propriétaire (text)
// - bac_secours               → BAC secours (status, `color_mm7hfdn5`)
//
// « BAC secours » reçoit le type de la boîte à clés de SECOURS : 'TTlock' ou
// 'Masterlock' si la fiche répond oui, sinon null (colonne vidée). La valeur
// est dérivée côté front (src/lib/clefsSecours.js, valeurMondayBacSecours).
// La colonne « Boîte à clé » (boîte principale) est remplie À LA MAIN par les
// coordinateurs : ce sync n'y touche pas.
//
// Les identifiants (emails de connexion) sont lus par les automatisations
// Monday qui composent l'email de bienvenue au propriétaire : colonne vide =
// email client incomplet. Ils suivent exactement le modèle des mots de
// passe : colonne text, valeur de la base envoyée telle quelle, vide compris.
//
// PRINCIPES
// 1. Une écriture Monday PAR CHAMP (`change_column_value`), jamais une mutation
//    groupée : `change_multiple_column_values` est atomique, un statut refusé
//    (label supprimé côté board, valeur legacy, colonne modifiée…) entraînait
//    les mots de passe dans sa chute — 17 fiches « Vérification / Inventaire »
//    jamais synchronisées, sans aucun retour utilisateur. Chaque champ a
//    désormais son propre résultat : ok / error / skipped.
// 2. Statuts envoyés par INDEX (identifiant de label Monday), pas par libellé :
//    un renommage de label côté Monday — exactement la panne du jour — ne
//    casse plus rien. Risque résiduel documenté : si la colonne est
//    reconstruite côté Monday, les identifiants peuvent changer ; la table
//    ci-dessous doit alors être réalignée (lecture : `settings_str` de la
//    colonne). Un index faux écrirait la mauvaise valeur SANS erreur, d'où la
//    vérification live avant chaque merge qui touche à cette table.
// 3. Le diff (quels champs pousser) se calcule ICI, contre le snapshot lu en
//    base à l'instant du sync, pas contre l'état d'un onglet. Le snapshot n'est
//    fusionné (par clé, RPC `fusionner_monday_snapshot`) qu'avec les champs
//    réellement écrits côté Monday : un champ en échec reste « à re-pousser »
//    au prochain enregistrement.
// 4. Garde de renumérotation AVANT d'écrire : si le numéro de bien en base
//    n'est plus celui envoyé par l'onglet, on n'écrit rien (ni Monday, ni
//    snapshot). La RPC re-vérifie le numéro dans son WHERE pour la fenêtre
//    entre la lecture et la fusion.
// 5. Aucun mot de passe ni identifiant (email propriétaire) dans les logs ni
//    dans les messages rendus au client.

// ============================================================
// Configuration Monday
// ============================================================
export const BOARD_ID = '1272144935'

export const COLUMN_IDS = {
  numeroBien: 'num_ro',            // numbers — clé de lookup
  statut: 'statut47',              // status — Premiers Ménages
  maintenance: 'color_mm3ftnef',   // status — Maintenance
  airbnbPassword: 'text_mm2q5tw8', // text — MDP Airbnb Propriétaire
  bookingPassword: 'text_mm2qaz6a', // text — MDP Booking Propriétaire
  airbnbLogin: 'text_mm2qs0eh',    // text — Identifiant Airbnb Propriétaire
  bookingLogin: 'text_mm2qg8ar',   // text — Identifiant Booking Propriétaire
  bacSecours: 'color_mm7hfdn5'     // status — BAC secours (type de la boîte de secours)
} as const

export type FieldKey =
  | 'type_premier_menage'
  | 'type_premiere_maintenance'
  | 'airbnb_mot_passe'
  | 'booking_mot_passe'
  | 'airbnb_email'
  | 'booking_email'
  | 'bac_secours'

export const FIELD_KEYS: readonly FieldKey[] = [
  'type_premier_menage',
  'type_premiere_maintenance',
  'airbnb_mot_passe',
  'booking_mot_passe',
  'airbnb_email',
  'booking_email',
  'bac_secours'
] as const

export const FIELD_COLUMN: Record<FieldKey, string> = {
  type_premier_menage: COLUMN_IDS.statut,
  type_premiere_maintenance: COLUMN_IDS.maintenance,
  airbnb_mot_passe: COLUMN_IDS.airbnbPassword,
  booking_mot_passe: COLUMN_IDS.bookingPassword,
  airbnb_email: COLUMN_IDS.airbnbLogin,
  booking_email: COLUMN_IDS.bookingLogin,
  bac_secours: COLUMN_IDS.bacSecours
}

// Valeur Fiche Logement (TYPES_PASSAGE, src/lib/avisGrilleHelpers.js) →
// identifiant de label de la colonne `statut47`, lu dans `settings_str.labels`
// le 2026-09-16 :
//   0 À voir · 1 Classique · 2 Pas nécessaire · 3 Remise en état ·
//   4 Vérification/Inventaire/Dépôt consommables/Autres · 5 À définir ·
//   6 Approfondi · 7 Fait par Proprio
// « À voir » et « À définir » n'existent que côté Monday, la fiche ne les
// produit jamais. La valeur fiche « Vérification / Inventaire » (avec espaces)
// est celle stockée en base ; côté Monday le label a été renommé et étendu,
// l'index 4 reste le même — c'est tout l'intérêt de passer par l'index.
export const PREMIER_MENAGE_INDEX: Readonly<Record<string, number>> = {
  'Classique': 1,
  'Pas nécessaire': 2,
  'Remise en état': 3,
  'Vérification / Inventaire': 4,
  'Approfondi': 6,
  'Fait par Proprio': 7
}

// TYPES_MAINTENANCE → identifiant de label de `color_mm3ftnef` (même lecture) :
//   0 Intervention propriétaire · 1 Pas d'intervention · 2 Intervention artisan
// Une fiche antérieure à la refonte FicheAvis du 14/05 peut porter un ancien
// label TYPES_PASSAGE dans ce champ : absent d'ici → `skipped`, jamais envoyé.
export const MAINTENANCE_INDEX: Readonly<Record<string, number>> = {
  'Intervention propriétaire': 0,
  "Pas d'intervention": 1,
  'Intervention artisan': 2
}

// Type de la boîte à clés de secours → identifiant de label de `color_mm7hfdn5`
// (colonne « BAC secours », créée le 2026-09-25), lu dans `settings_str.labels`
// le 2026-09-25 : 0 TTlock · 1 Masterlock.
export const BAC_SECOURS_INDEX: Readonly<Record<string, number>> = {
  'TTlock': 0,
  'Masterlock': 1
}

// ============================================================
// Types — requête, résultats, dépendances
// ============================================================
// `undefined` = champ NON FOURNI par l'appelant (clé absente de la requête),
// distinct de `null` = champ fourni et vide. Un champ non fourni n'est jamais
// poussé : un onglet resté sur un front antérieur n'envoie que les champs
// qu'il connaît, et traiter les champs absents (identifiants, BAC secours)
// comme vides viderait les colonnes Monday correspondantes.
export type SyncFields = Record<FieldKey, string | null | undefined>

export interface SyncRequest {
  ficheId: string
  numeroBien: number | string
  fields: SyncFields
  // true = pousser tous les champs fournis quel que soit le snapshot (finalisation
  // initiale Brouillon → Complété). Sinon : diff contre le snapshot en base.
  pushAll?: boolean
  dryRun?: boolean
  // Ancien contrat (front antérieur à ce fix) : ignoré, le diff se fait ici.
  changedFields?: FieldKey[]
}

export type FieldStatus = 'ok' | 'error' | 'skipped'

export type FieldReason =
  | 'VALEUR_NON_RECONNUE'  // skipped : valeur fiche absente de la table d'index
  | 'MONDAY_REFUSE'        // error : Monday a rejeté l'écriture de cette colonne
  | 'ITEM_NOT_FOUND'       // error : aucune ligne Monday pour ce numéro de bien
  | 'MONDAY_API_ERROR'     // error : lookup impossible (réseau, token, quota…)

export interface FieldResult {
  field: FieldKey
  status: FieldStatus
  reason?: FieldReason
  // Diagnostic court, sans aucune valeur de champ (les mots de passe sont
  // masqués si Monday les renvoyait dans son message).
  message?: string
}

export interface SyncResponse {
  // true ssi aucun champ demandé n'est en error ni en skipped
  success: boolean
  itemId: string | null
  results: FieldResult[]
  // Snapshot fusionné rendu par la RPC (état en base après fusion), ou null si
  // rien n'a été persisté (rien d'écrit, renumérotation en vol, erreur RPC).
  snapshot: Record<string, unknown> | null
  snapshotPersiste: boolean
  dryRun?: boolean
}

export type SyncErrorCode =
  | 'FICHE_INTROUVABLE'    // fiche invisible pour l'appelant (RLS) ou inexistante
  | 'NUMERO_BIEN_CHANGE'   // la fiche a été renumérotée : l'onglet est périmé
  | 'DB_READ_ERROR'
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'

export interface SyncError {
  success: false
  error: SyncErrorCode
  message: string
}

export interface FicheLue {
  numeroBien: string | null
  snapshot: Record<string, unknown> | null
}

export interface Deps {
  // Lecture de la fiche SOUS RLS (client authentifié par le JWT de l'appelant).
  // null = aucune ligne visible.
  lireFiche: (ficheId: string) => Promise<FicheLue | null>
  // Lookup de l'item Monday par num_ro. null = introuvable.
  trouverItem: (numeroBien: string) => Promise<string | null>
  // Écriture d'UNE colonne. Lance en cas de refus Monday.
  ecrireColonne: (itemId: string, columnId: string, valeur: unknown) => Promise<void>
  // RPC fusionner_monday_snapshot. null = aucune ligne (garde numéro / RLS).
  fusionnerSnapshot: (ficheId: string, numeroBien: string, patch: Record<string, unknown>) => Promise<Record<string, unknown> | null>
  log?: (message: string) => void
  warn?: (message: string) => void
}

// ============================================================
// Construction des valeurs de colonne
// ============================================================
export interface Ecriture {
  field: FieldKey
  columnId: string
  valeur: unknown
}

export interface Plan {
  // Champs que le diff (ou pushAll) demande de pousser
  demandes: FieldKey[]
  // Écritures Monday à effectuer (champs demandés et traduisibles)
  ecritures: Ecriture[]
  // Champs demandés mais non traduisibles (valeur legacy) → jamais envoyés
  ignores: FieldResult[]
}

const normaliser = (v: unknown): string | null => (v === undefined || v === null ? null : String(v))

// Traduit une valeur fiche en valeur de colonne Monday, ou `undefined` si la
// valeur n'est pas reconnue (à ignorer, jamais à envoyer).
//
// ⚠️ On envoie TOUJOURS une valeur pour un champ demandé, même vide : sinon un
// effacement côté fiche (mot de passe supprimé, statut décoché) ne se
// propagerait jamais. Pour Monday (`change_column_value`) : `{}` vide une
// colonne status, la chaîne vide vide une colonne text.
export function traduireValeur(field: FieldKey, valeur: string | null): unknown | undefined {
  switch (field) {
    case 'type_premier_menage': {
      if (!valeur) return {}
      const index = PREMIER_MENAGE_INDEX[valeur]
      return index === undefined ? undefined : { index }
    }
    case 'type_premiere_maintenance': {
      if (!valeur) return {}
      const index = MAINTENANCE_INDEX[valeur]
      return index === undefined ? undefined : { index }
    }
    case 'bac_secours': {
      if (!valeur) return {}
      const index = BAC_SECOURS_INDEX[valeur]
      return index === undefined ? undefined : { index }
    }
    case 'airbnb_mot_passe':
    case 'booking_mot_passe':
    case 'airbnb_email':
    case 'booking_email':
      return valeur ?? ''
  }
}

// Quels champs pousser ? Parmi les champs FOURNIS : tous si pushAll ou si la
// fiche n'a jamais été synchronisée ; sinon ceux dont la valeur diffère du
// snapshot en base. Une clé absente du snapshot compte comme « jamais
// poussée » (cas de tous les snapshots antérieurs à l'ajout des identifiants).
export function champsAPousser(fields: SyncFields, snapshot: Record<string, unknown> | null, pushAll: boolean): FieldKey[] {
  const fournis = FIELD_KEYS.filter((k) => fields[k] !== undefined)
  if (pushAll || !snapshot || typeof snapshot !== 'object') return fournis
  return fournis.filter((k) => {
    if (!Object.prototype.hasOwnProperty.call(snapshot, k)) return true
    return normaliser(fields[k]) !== normaliser(snapshot[k])
  })
}

export function planifier(fields: SyncFields, snapshot: Record<string, unknown> | null, pushAll: boolean): Plan {
  const demandes = champsAPousser(fields, snapshot, pushAll)
  const ecritures: Ecriture[] = []
  const ignores: FieldResult[] = []
  for (const field of demandes) {
    const valeur = traduireValeur(field, normaliser(fields[field]))
    if (valeur === undefined) {
      ignores.push({
        field,
        status: 'skipped',
        reason: 'VALEUR_NON_RECONNUE',
        message: 'Valeur non reconnue par Monday : re-sélectionnez une valeur dans la liste.'
      })
    } else {
      ecritures.push({ field, columnId: FIELD_COLUMN[field], valeur })
    }
  }
  return { demandes, ecritures, ignores }
}

// ============================================================
// Masquage des secrets dans les diagnostics
// ============================================================
// Monday peut renvoyer la valeur refusée dans son message d'erreur. On retire
// toute occurrence des mots de passe avant de journaliser ou de répondre, et
// on tronque : c'est un diagnostic, pas un dump.
export function masquerSecrets(message: string, secrets: Array<string | null | undefined>, max = 300): string {
  let out = message
  for (const s of secrets) {
    if (typeof s === 'string' && s.length > 0) {
      out = out.split(s).join('•••')
    }
  }
  return out.length > max ? out.slice(0, max) + '…' : out
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// ============================================================
// Orchestration
// ============================================================
export async function synchroniser(req: SyncRequest, deps: Deps): Promise<SyncResponse | SyncError> {
  const log = deps.log ?? (() => {})
  const warn = deps.warn ?? (() => {})
  const numeroBien = String(req.numeroBien ?? '').trim()
  // Valeurs à ne jamais laisser sortir : mots de passe ET identifiants (emails
  // personnels des propriétaires).
  const secrets = [req.fields.airbnb_mot_passe, req.fields.booking_mot_passe, req.fields.airbnb_email, req.fields.booking_email]
  const prefixe = `[monday-sync] fiche=${req.ficheId} numero_bien=${numeroBien}`

  // 1. Lecture de la fiche sous RLS : autorisation + garde de renumérotation
  //    + snapshot le plus frais pour le diff, en une seule lecture.
  let fiche: FicheLue | null
  try {
    fiche = await deps.lireFiche(req.ficheId)
  } catch (err) {
    warn(`${prefixe} lecture fiche impossible : ${masquerSecrets(msg(err), secrets)}`)
    return { success: false, error: 'DB_READ_ERROR', message: 'Lecture de la fiche impossible, synchronisation reportée.' }
  }
  if (!fiche) {
    warn(`${prefixe} fiche invisible pour l'appelant ou inexistante`)
    return { success: false, error: 'FICHE_INTROUVABLE', message: 'Fiche introuvable ou non autorisée pour cet utilisateur.' }
  }
  if ((fiche.numeroBien ?? '').trim() !== numeroBien) {
    warn(`${prefixe} numéro de bien périmé (en base : ${fiche.numeroBien ?? 'NULL'}) : rien n'est écrit`)
    return {
      success: false,
      error: 'NUMERO_BIEN_CHANGE',
      message: 'Le numéro de bien de la fiche a changé : rechargez la fiche, rien n\'a été envoyé à Monday.'
    }
  }

  // 2. Plan : diff contre le snapshot en base, traduction par champ
  const plan = planifier(req.fields, fiche.snapshot, req.pushAll === true)
  const results: FieldResult[] = [...plan.ignores]

  if (plan.ecritures.length === 0) {
    if (plan.ignores.length > 0) {
      warn(`${prefixe} rien à écrire, champs ignorés : ${plan.ignores.map((r) => r.field).join(',')}`)
    } else {
      log(`${prefixe} rien à pousser (snapshot à jour)`)
    }
    return { success: plan.ignores.length === 0, itemId: null, results, snapshot: fiche.snapshot, snapshotPersiste: false, dryRun: req.dryRun === true }
  }

  // Dry-run : on s'arrête avant tout appel Monday et toute écriture en base.
  // Ni mots de passe ni identifiants journalisés ou rendus, seuls les champs.
  if (req.dryRun) {
    log(`${prefixe} DRY-RUN écritures=${plan.ecritures.map((e) => `${e.field}→${e.columnId}`).join(',')} ignorés=${plan.ignores.map((r) => r.field).join(',') || '-'}`)
    for (const e of plan.ecritures) results.push({ field: e.field, status: 'ok', message: 'dry-run : non envoyé' })
    return { success: plan.ignores.length === 0, itemId: 'DRY_RUN', results, snapshot: fiche.snapshot, snapshotPersiste: false, dryRun: true }
  }

  // 3. Lookup de l'item Monday
  let itemId: string | null
  try {
    itemId = await deps.trouverItem(numeroBien)
  } catch (err) {
    const detail = masquerSecrets(msg(err), secrets)
    warn(`${prefixe} lookup Monday échoué : ${detail}`)
    for (const e of plan.ecritures) results.push({ field: e.field, status: 'error', reason: 'MONDAY_API_ERROR', message: detail })
    return { success: false, itemId: null, results, snapshot: null, snapshotPersiste: false }
  }
  if (!itemId) {
    warn(`${prefixe} aucun item Monday sur le board ${BOARD_ID}`)
    for (const e of plan.ecritures) {
      results.push({ field: e.field, status: 'error', reason: 'ITEM_NOT_FOUND', message: `Aucune ligne Monday avec le numéro de bien ${numeroBien}.` })
    }
    return { success: false, itemId: null, results, snapshot: null, snapshotPersiste: false }
  }

  // 4. Une écriture par champ, en séquence. Un refus n'arrête pas les autres.
  const patch: Record<string, unknown> = {}
  for (const e of plan.ecritures) {
    try {
      await deps.ecrireColonne(itemId, e.columnId, e.valeur)
      results.push({ field: e.field, status: 'ok' })
      patch[e.field] = normaliser(req.fields[e.field])
      log(`${prefixe} item=${itemId} ${e.field} → ok`)
    } catch (err) {
      const detail = masquerSecrets(msg(err), secrets)
      results.push({ field: e.field, status: 'error', reason: 'MONDAY_REFUSE', message: detail })
      warn(`${prefixe} item=${itemId} ${e.field} → refusé : ${detail}`)
    }
  }

  // 5. Snapshot : SEULS les champs réellement écrits, fusionnés par clé en
  //    base sous garde du numéro de bien. Un échec ici ne remet pas en cause
  //    les écritures Monday (déjà faites) : au pire un re-push idempotent.
  //    Le numéro passé à la RPC est celui lu EN BASE (brut, non trimmé) : la
  //    garde compare à l'exact, et `mapFormDataToSupabase` stocke la saisie
  //    telle quelle. Avec la valeur trimmée de l'onglet, un numéro stocké avec
  //    un espace ne matcherait jamais et la fiche re-pousserait à chaque save.
  let snapshot: Record<string, unknown> | null = null
  let snapshotPersiste = false
  if (Object.keys(patch).length > 0) {
    try {
      snapshot = await deps.fusionnerSnapshot(req.ficheId, fiche.numeroBien ?? numeroBien, patch)
      snapshotPersiste = snapshot !== null
      if (!snapshotPersiste) {
        warn(`${prefixe} snapshot non persisté : numéro de bien changé pendant le push, ou fiche plus visible`)
      }
    } catch (err) {
      warn(`${prefixe} fusion du snapshot échouée : ${masquerSecrets(msg(err), secrets)}`)
    }
  }

  const trier = (a: FieldResult, b: FieldResult) => FIELD_KEYS.indexOf(a.field) - FIELD_KEYS.indexOf(b.field)
  results.sort(trier)
  const success = results.every((r) => r.status === 'ok')
  log(`${prefixe} item=${itemId} bilan=${results.map((r) => `${r.field}:${r.status}`).join(',')} snapshot=${snapshotPersiste ? 'persisté' : 'non persisté'}`)
  return { success, itemId, results, snapshot, snapshotPersiste }
}
