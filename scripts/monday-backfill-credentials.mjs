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
//   node scripts/monday-backfill-credentials.mjs --execute --attendu N [--numero …]
//
//   --execute exige --attendu N : le nombre de cellules annoncé par le dry-run
//   relu. Si le plan recalculé au moment de l'exécution diffère, le script
//   s'arrête sans rien écrire (quelqu'un a modifié Monday ou la base entre-temps
//   → refaire un dry-run).
//   Avant d'écrire, chaque item est relu : une cellule remplie entre le plan et
//   l'écriture est sautée.
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
  COLONNES_LUES,
  RAISONS,
  estVide,
  indexerItems,
  masquer,
  planifierRattrapage,
  resumer
} from './lib/mondayBackfillPlan.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const MONDAY_API = 'https://api.monday.com/v2'
const MONDAY_API_VERSION = '2024-01'
const PAUSE_ENTRE_ECRITURES_MS = 250

// ============================================================
// Arguments
// ============================================================
function lireArguments(argv) {
  const args = { execute: false, attendu: null, numeros: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--execute') args.execute = true
    else if (a === '--attendu') args.attendu = Number(argv[++i])
    else if (a === '--numero') {
      args.numeros = args.numeros || new Set()
      for (const n of String(argv[++i] ?? '').split(',')) if (n.trim()) args.numeros.add(n.trim())
    } else throw new Error(`Argument inconnu : ${a}`)
  }
  if (args.execute && !Number.isInteger(args.attendu)) {
    throw new Error('--execute exige --attendu N (nombre de cellules du dry-run relu).')
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

async function relireItem(config, itemId) {
  const q = `query ($ids: [ID!], $cols: [String!]) { items(ids: $ids) { id column_values(ids: $cols) { id text } } }`
  const data = await monday(config, q, { ids: [itemId], cols: CHAMPS.map((c) => c.columnId) })
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
function rapportMarkdown({ mode, horodatage, args, resume, plan, execution }) {
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
  l.push(`**${resume.cellulesARemplir} cellule(s) à remplir** sur **${resume.fichesTouchees} fiche(s)**.`)
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
  console.log(`[backfill] plan : ${resume.cellulesARemplir} cellule(s) à remplir sur ${resume.fichesTouchees} fiche(s)`)

  let execution = null
  if (args.execute) {
    if (resume.cellulesARemplir !== args.attendu) {
      throw new Error(`Plan recalculé = ${resume.cellulesARemplir} cellule(s), attendu = ${args.attendu} : rien n'est écrit. Refaire un dry-run et le relire.`)
    }
    execution = { ecrites: 0, sauteesEntreTemps: 0, erreurs: 0, journal: [] }
    // Regroupement par item : une relecture Monday par item, juste avant d'écrire
    const parItem = new Map()
    for (const e of plan.ecritures) {
      if (!parItem.has(e.itemId)) parItem.set(e.itemId, [])
      parItem.get(e.itemId).push(e)
    }
    for (const [itemId, ecritures] of parItem) {
      const valeurs = ecritures.map((e) => e.valeur)
      let cellules
      try {
        cellules = await relireItem(config, itemId)
      } catch (err) {
        for (const e of ecritures) {
          execution.erreurs++
          execution.journal.push({ ficheId: e.ficheId, numeroBien: e.numeroBien, itemId, columnId: e.columnId, label: e.label, resultat: `ERREUR relecture : ${masquer(err.message, valeurs)}` })
        }
        console.warn(`[backfill] item=${itemId} relecture impossible : ${masquer(err.message, valeurs)}`)
        continue
      }
      for (const e of ecritures) {
        const entree = { ficheId: e.ficheId, numeroBien: e.numeroBien, itemId, columnId: e.columnId, label: e.label }
        if (!estVide(cellules[e.columnId])) {
          execution.sauteesEntreTemps++
          execution.journal.push({ ...entree, resultat: 'SAUTÉE — remplie entre le plan et l\'écriture' })
          console.log(`[backfill] n°${e.numeroBien} item=${itemId} ${e.label} → sautée (remplie entre-temps)`)
          continue
        }
        try {
          await ecrireCellule(config, itemId, e.columnId, e.valeur)
          execution.ecrites++
          execution.journal.push({ ...entree, resultat: 'ÉCRITE' })
          console.log(`[backfill] n°${e.numeroBien} item=${itemId} ${e.label} → écrite`)
        } catch (err) {
          execution.erreurs++
          const detail = masquer(err.message, valeurs)
          execution.journal.push({ ...entree, resultat: `ERREUR : ${detail}` })
          console.warn(`[backfill] n°${e.numeroBien} item=${itemId} ${e.label} → ERREUR : ${detail}`)
        }
        await pause(PAUSE_ENTRE_ECRITURES_MS)
      }
    }
    console.log(`[backfill] bilan : écrites=${execution.ecrites} sautées-entre-temps=${execution.sauteesEntreTemps} erreurs=${execution.erreurs}`)
  }

  // Rapports : décisions et journal seulement, jamais `plan.ecritures` (valeurs)
  const base = join(sortie, `${horodatage}-${mode}`)
  writeFileSync(`${base}.md`, rapportMarkdown({ mode, horodatage, args, resume, plan, execution }))
  writeFileSync(`${base}.json`, JSON.stringify({ mode, horodatage, resume, fichesSautees: plan.fichesSautees, decisions: plan.decisions, execution }, null, 2))
  console.log(`[backfill] rapport : ${base}.md`)
  if (execution && execution.erreurs > 0) process.exitCode = 2
}

main().catch((err) => {
  // Les messages d'erreur construits ici ne portent ni token ni valeur.
  console.error(`[backfill] ARRÊT : ${err.message}`)
  process.exitCode = 1
})
