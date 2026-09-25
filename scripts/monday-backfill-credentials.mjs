// scripts/monday-backfill-credentials.mjs
//
// RATTRAPAGE ONE-SHOT — identifiants et mots de passe Airbnb / Booking vers
// Monday (board Clients 1272144935), pour les fiches `Complété`.
//
// Le sync au fil de l'eau (Edge Function `monday-sync`, PR #100) écrit la
// valeur de la base à chaque modification. Ce script traite l'EXISTANT, avec
// une règle plus stricte : il ne remplit QUE les cellules Monday VIDES, quand
// la base a une valeur. Il n'écrase jamais une cellule déjà remplie.
//
// Ce qu'il ne fait JAMAIS :
//   - écrire dans la base (lecture seule : ni statut, ni monday_snapshot) ;
//   - toucher une autre colonne Monday que les 4 colonnes credentials (les
//     automatisations d'email de bienvenue se déclenchent sur la colonne date
//     + un statut, pas sur celles-ci) ;
//   - afficher ou journaliser une valeur (email, mot de passe) : rapports et
//     logs nomment fiche / numéro / item / colonne, rien d'autre.
//
// USAGE
//   node scripts/monday-backfill-credentials.mjs                    → DRY-RUN (défaut)
//   node scripts/monday-backfill-credentials.mjs --numero 7755      → dry-run limité
//   node scripts/monday-backfill-credentials.mjs --execute --plan <empreinte> [--numero …]
//
//   --execute exige --plan <empreinte> : l'empreinte affichée par le dry-run
//   relu (hash de l'ensemble exact fiche|item|colonne à remplir, sans valeur).
//   Si le plan recalculé au moment de l'exécution vise d'autres cellules — même
//   en nombre égal — le script s'arrête sans rien écrire (Monday ou la base ont
//   bougé entre-temps → refaire un dry-run et le relire).
//   Juste avant CHAQUE écriture, la fiche est relue en base (toujours Complété,
//   même numéro, valeur encore présente — c'est cette valeur relue qui est
//   écrite), puis la ligne Monday (numéro de bien + cellule visée) : ligne
//   renumérotée ou cellule remplie entre-temps → sautée.
//   Monday n'a pas d'écriture conditionnelle : reste une fenêtre de quelques
//   millisecondes entre cette relecture et la mutation, acceptée.
//
// SECRETS
//   `.env.monday-backfill` à la racine (ignoré par git via `.env.*`) :
//     MONDAY_API_TOKEN=…
//     SUPABASE_SERVICE_ROLE_KEY=…
//   L'URL Supabase est lue dans `.env` (VITE_SUPABASE_URL, non secrète).
//   Les valeurs ne sont jamais affichées, même en cas d'erreur.
//
// SORTIES (hors du repo) : ~/.monday-backfill/<horodatage>-{dry-run|execute}.{md,json}

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import {
  BOARD_ID,
  CHAMPS,
  COLONNE_NUMERO,
  COLONNES_LUES,
  RAISONS,
  empreinteDuPlan,
  indexerItems,
  masquer,
  planifierRattrapage,
  resumer,
  verifierAvantEcriture,
  verifierSource
} from './lib/mondayBackfillPlan.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const MONDAY_API = 'https://api.monday.com/v2'
const MONDAY_API_VERSION = '2024-01'
const PAUSE_ENTRE_ECRITURES_MS = 250

// ============================================================
// Arguments
// ============================================================
function lireArguments(argv) {
  const args = { execute: false, plan: null, numeros: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--execute') args.execute = true
    else if (a === '--plan') args.plan = String(argv[++i] ?? '').trim()
    else if (a === '--numero') {
      args.numeros = args.numeros || new Set()
      for (const n of String(argv[++i] ?? '').split(',')) if (n.trim()) args.numeros.add(n.trim())
    } else throw new Error(`Argument inconnu : ${a}`)
  }
  if (args.execute && !args.plan) {
    throw new Error('--execute exige --plan <empreinte> (celle du dry-run relu).')
  }
  return args
}

// ============================================================
// Environnement — valeurs jamais affichées
// ============================================================
function lireFichierEnv(chemin) {
  if (!existsSync(chemin)) return {}
  const env = {}
  for (const ligne of readFileSync(chemin, 'utf8').split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}

function chargerConfig() {
  const secrets = lireFichierEnv(join(repoRoot, '.env.monday-backfill'))
  const publics = lireFichierEnv(join(repoRoot, '.env'))
  const manquants = []
  if (!secrets.MONDAY_API_TOKEN) manquants.push('MONDAY_API_TOKEN')
  if (!secrets.SUPABASE_SERVICE_ROLE_KEY) manquants.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!publics.VITE_SUPABASE_URL) manquants.push('VITE_SUPABASE_URL (.env)')
  if (manquants.length) {
    throw new Error(`Configuration incomplète, variable(s) absente(s) ou vide(s) : ${manquants.join(', ')}`)
  }
  return {
    mondayToken: secrets.MONDAY_API_TOKEN,
    serviceRole: secrets.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl: publics.VITE_SUPABASE_URL.replace(/\/+$/, '')
  }
}

// ============================================================
// Supabase — lecture seule, service role
// ============================================================
// Relit UNE fiche à l'instant (statut, numéro, champ visé). null = disparue.
async function relireFiche(config, ficheId, field) {
  const url = `${config.supabaseUrl}/rest/v1/fiches?select=statut,logement_numero_bien,${field}&id=eq.${encodeURIComponent(ficheId)}`
  const res = await fetch(url, { headers: { apikey: config.serviceRole, Authorization: `Bearer ${config.serviceRole}` } })
  if (!res.ok) throw new Error(`Supabase HTTP ${res.status} : relecture de la fiche impossible`)
  const lignes = await res.json()
  return lignes[0] ?? null
}

async function lireFichesCompletees(config) {
  const colonnes = ['id', 'logement_numero_bien', ...CHAMPS.map((c) => c.field)].join(',')
  const fiches = []
  const pas = 1000
  for (let debut = 0; ; debut += pas) {
    const url = `${config.supabaseUrl}/rest/v1/fiches?select=${colonnes}&statut=eq.${encodeURIComponent('Complété')}&order=id.asc`
    const res = await fetch(url, {
      headers: {
        apikey: config.serviceRole,
        Authorization: `Bearer ${config.serviceRole}`,
        Range: `${debut}-${debut + pas - 1}`,
        'Range-Unit': 'items'
      }
    })
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status} : lecture des fiches impossible`)
    const page = await res.json()
    fiches.push(...page)
    if (page.length < pas) break
  }
  return fiches
}

// ============================================================
// Monday
// ============================================================
async function monday(config, query, variables) {
  const res = await fetch(MONDAY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: config.mondayToken, 'API-Version': MONDAY_API_VERSION },
    body: JSON.stringify({ query, variables })
  })
  let json
  try {
    json = await res.json()
  } catch {
    throw new Error(`Monday HTTP ${res.status} : réponse non JSON`)
  }
  if (Array.isArray(json.errors) && json.errors.length) throw new Error(`Monday GraphQL : ${JSON.stringify(json.errors)}`)
  if (json.error_message || json.error_code) throw new Error(`Monday ${json.error_code ?? 'error'} : ${json.error_message ?? ''}`)
  if (!res.ok) throw new Error(`Monday HTTP ${res.status}`)
  if (!json.data) throw new Error('Monday : réponse sans data')
  return json.data
}

async function lireTousLesItems(config) {
  const premier = `
    query ($board: [ID!], $cols: [String!]) {
      boards(ids: $board) {
        items_page(limit: 500) {
          cursor
          items { id name column_values(ids: $cols) { id text } }
        }
      }
    }`
  const suivant = `
    query ($cursor: String!, $cols: [String!]) {
      next_items_page(limit: 500, cursor: $cursor) {
        cursor
        items { id name column_values(ids: $cols) { id text } }
      }
    }`
  const items = []
  let data = await monday(config, premier, { board: [BOARD_ID], cols: COLONNES_LUES })
  let page = data.boards?.[0]?.items_page
  if (!page) throw new Error(`Board ${BOARD_ID} illisible`)
  items.push(...page.items)
  while (page.cursor) {
    data = await monday(config, suivant, { cursor: page.cursor, cols: COLONNES_LUES })
    page = data.next_items_page
    items.push(...page.items)
  }
  return items
}

// Relit le numéro de bien ET la cellule visée, à l'instant.
async function relireCellule(config, itemId, columnId) {
  const q = `query ($ids: [ID!], $cols: [String!]) { items(ids: $ids) { id column_values(ids: $cols) { id text } } }`
  const data = await monday(config, q, { ids: [itemId], cols: [COLONNE_NUMERO, columnId] })
  const item = data.items?.[0]
  if (!item) throw new Error(`item ${itemId} introuvable à la relecture`)
  const cellules = {}
  for (const cv of item.column_values) cellules[cv.id] = cv.text ?? null
  return cellules
}

async function ecrireCellule(config, itemId, columnId, valeur) {
  const q = `
    mutation ($board: ID!, $item: ID!, $col: String!, $val: JSON!) {
      change_column_value(board_id: $board, item_id: $item, column_id: $col, value: $val) { id }
    }`
  const data = await monday(config, q, { board: BOARD_ID, item: itemId, col: columnId, val: JSON.stringify(valeur) })
  if (!data.change_column_value?.id) throw new Error(`change_column_value sans id (${columnId})`)
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms))

// ============================================================
// Rapports — AUCUNE valeur
// ============================================================
function rapportMarkdown({ mode, horodatage, args, resume, empreinte, plan, execution }) {
  const l = []
  l.push(`# Rattrapage identifiants / MDP → Monday — ${mode === 'execute' ? 'EXÉCUTION' : 'DRY-RUN'}`)
  l.push('')
  l.push(`- Horodatage : ${horodatage}`)
  l.push(`- Board : ${BOARD_ID} · fiches : statut = Complété${args.numeros ? ` · filtre numéros : ${[...args.numeros].join(', ')}` : ''}`)
  l.push(`- Règle : remplir uniquement les cellules Monday **vides**, si la base a une valeur. Jamais d'écrasement.`)
  l.push(`- Aucune valeur (email, mot de passe) dans ce rapport.`)
  l.push('')
  l.push(`## Résumé`)
  l.push('')
  l.push(`**${resume.cellulesARemplir} cellule(s) à remplir** sur **${resume.fichesTouchees} fiche(s)** — empreinte du plan : \`${empreinte}\``)
  l.push('')
  l.push('| Colonne | À remplir | Sautée : déjà remplie | Sautée : base vide |')
  l.push('|---|---:|---:|---:|')
  for (const [label, t] of Object.entries(resume.parColonne)) l.push(`| ${label} | ${t.remplir} | ${t.DEJA_REMPLI} | ${t.BASE_VIDE} |`)
  l.push('')
  if (plan.fichesSautees.length) {
    l.push(`## Fiches sautées entièrement (${plan.fichesSautees.length})`)
    l.push('')
    l.push('| N° bien | Fiche | Raison |')
    l.push('|---|---|---|')
    for (const f of plan.fichesSautees) {
      l.push(`| ${f.numeroBien || '—'} | \`${f.ficheId}\` | ${RAISONS[f.raison]}${f.itemIds ? ` (items ${f.itemIds.join(', ')})` : ''} |`)
    }
    l.push('')
  }
  if (execution) {
    l.push(`## Exécution`)
    l.push('')
    l.push(`Écrites : **${execution.ecrites}** · sautées (remplies entre le plan et l'écriture) : **${execution.sauteesEntreTemps}** · en erreur : **${execution.erreurs}**`)
    l.push('')
  }
  l.push(`## Détail par fiche et par colonne`)
  l.push('')
  l.push('| N° bien | Item Monday | Colonne | Décision |')
  l.push('|---|---|---|---|')
  const journal = execution ? new Map(execution.journal.map((j) => [`${j.itemId}|${j.columnId}`, j])) : null
  for (const d of plan.decisions) {
    let decision = d.action === 'remplir' ? '**à remplir**' : `sautée — ${RAISONS[d.raison]}`
    if (journal && d.action === 'remplir') {
      const j = journal.get(`${d.itemId}|${d.columnId}`)
      decision = j ? j.resultat : 'non traitée'
    }
    l.push(`| ${d.numeroBien} | ${d.itemId} | ${d.label} | ${decision} |`)
  }
  l.push('')
  return l.join('\n')
}

// ============================================================
// Main
// ============================================================
async function main() {
  const args = lireArguments(process.argv.slice(2))
  const config = chargerConfig()
  const horodatage = new Date().toISOString().replace(/[:.]/g, '-')
  const mode = args.execute ? 'execute' : 'dry-run'
  const sortie = join(homedir(), '.monday-backfill')
  mkdirSync(sortie, { recursive: true })

  console.log(`[backfill] mode=${mode}${args.numeros ? ` numeros=${[...args.numeros].join(',')}` : ''}`)

  let fiches = await lireFichesCompletees(config)
  if (args.numeros) fiches = fiches.filter((f) => args.numeros.has(String(f.logement_numero_bien ?? '').trim()))
  console.log(`[backfill] fiches Complété lues : ${fiches.length}`)

  const items = await lireTousLesItems(config)
  console.log(`[backfill] items Monday lus : ${items.length}`)

  const plan = planifierRattrapage(fiches, indexerItems(items))
  const resume = resumer(plan)
  const empreinte = empreinteDuPlan(plan)
  console.log(`[backfill] plan : ${resume.cellulesARemplir} cellule(s) à remplir sur ${resume.fichesTouchees} fiche(s) — empreinte ${empreinte}`)

  let execution = null
  if (args.execute) {
    if (empreinte !== args.plan) {
      throw new Error(`Plan recalculé (empreinte ${empreinte}, ${resume.cellulesARemplir} cellule(s)) différent du plan relu (${args.plan}) : rien n'est écrit. Refaire un dry-run et le relire.`)
    }
    execution = { ecrites: 0, sauteesEntreTemps: 0, erreurs: 0, journal: [] }
    // Juste avant CHAQUE écriture : relecture de la source (fiche en base) puis
    // de la cible (ligne Monday : numéro + cellule)
    const toutesLesValeurs = plan.ecritures.map((e) => e.valeur)
    for (const e of plan.ecritures) {
      const entree = { ficheId: e.ficheId, numeroBien: e.numeroBien, itemId: e.itemId, columnId: e.columnId, label: e.label }
      const trace = `n°${e.numeroBien} item=${e.itemId} ${e.label}`
      try {
        const source = verifierSource(e, await relireFiche(config, e.ficheId, e.field))
        if (source.verdict !== 'ECRIRE') {
          execution.sauteesEntreTemps++
          const pourquoi = source.verdict === 'BASE_VIDEE' ? 'valeur effacée en base' : 'fiche plus Complété, renumérotée ou supprimée'
          execution.journal.push({ ...entree, resultat: `SAUTÉE — ${pourquoi} depuis le plan` })
          console.log(`[backfill] ${trace} → sautée (${pourquoi})`)
          continue
        }
        toutesLesValeurs.push(source.valeur)
        const verdict = verifierAvantEcriture(e, await relireCellule(config, e.itemId, e.columnId))
        if (verdict === 'NUMERO_CHANGE') {
          execution.sauteesEntreTemps++
          execution.journal.push({ ...entree, resultat: 'SAUTÉE — la ligne Monday ne porte plus ce numéro de bien' })
          console.log(`[backfill] ${trace} → sautée (numéro de bien changé sur la ligne)`)
          continue
        }
        if (verdict === 'REMPLIE_ENTRE_TEMPS') {
          execution.sauteesEntreTemps++
          execution.journal.push({ ...entree, resultat: 'SAUTÉE — remplie entre le plan et l\'écriture' })
          console.log(`[backfill] ${trace} → sautée (remplie entre-temps)`)
          continue
        }
        // Valeur RELUE, pas celle du scan initial
        await ecrireCellule(config, e.itemId, e.columnId, source.valeur)
        execution.ecrites++
        execution.journal.push({ ...entree, resultat: 'ÉCRITE' })
        console.log(`[backfill] ${trace} → écrite`)
      } catch (err) {
        execution.erreurs++
        const detail = masquer(err.message, toutesLesValeurs)
        execution.journal.push({ ...entree, resultat: `ERREUR : ${detail}` })
        console.warn(`[backfill] ${trace} → ERREUR : ${detail}`)
      }
      await pause(PAUSE_ENTRE_ECRITURES_MS)
    }
    console.log(`[backfill] bilan : écrites=${execution.ecrites} sautées-entre-temps=${execution.sauteesEntreTemps} erreurs=${execution.erreurs}`)
  }

  // Rapports : décisions et journal seulement, jamais `plan.ecritures` (valeurs)
  const base = join(sortie, `${horodatage}-${mode}`)
  writeFileSync(`${base}.md`, rapportMarkdown({ mode, horodatage, args, resume, empreinte, plan, execution }))
  writeFileSync(`${base}.json`, JSON.stringify({ mode, horodatage, empreinte, resume, fichesSautees: plan.fichesSautees, decisions: plan.decisions, execution }, null, 2))
  console.log(`[backfill] rapport : ${base}.md`)
  if (execution && execution.erreurs > 0) process.exitCode = 2
}

main().catch((err) => {
  // Les messages d'erreur construits ici ne portent ni token ni valeur.
  console.error(`[backfill] ARRÊT : ${err.message}`)
  process.exitCode = 1
})
