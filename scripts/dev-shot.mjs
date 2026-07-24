// scripts/dev-shot.mjs
// Ouvre l'app en local avec la session du compte de test, va sur la fiche
// de demo, optionnellement clique une section, et prend une capture.
//
// Usage :
//   node scripts/dev-shot.mjs                      -> tableau de bord
//   node scripts/dev-shot.mjs "Equipements"        -> fiche de test, section Equipements
//   node scripts/dev-shot.mjs "Avis" http://localhost:5173
//
// Se reconnecte tout seul si la session en cache a expire.
// La capture sort dans .shots/ a la racine du repo (dossier ignore par git),
// pour que les agents puissent la relire avec leurs outils fichiers.

import { chromium } from 'playwright-core'
import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const section = process.argv[2] || null
const baseUrl = process.argv[3] || 'http://localhost:5173'
const statePath = join(homedir(), '.agent-auth', 'fiche-logement.json')

function readEnv() {
  const raw = readFileSync(join(repoRoot, '.env'), 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

const env = readEnv()
const ficheId = env.DEV_AGENT_FICHE_ID
const cible = ficheId ? `${baseUrl}/fiche/${ficheId}` : `${baseUrl}/`

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  storageState: existsSync(statePath) ? statePath : undefined
})
const page = await context.newPage()

const errors = []
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

async function login() {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', env.DEV_AGENT_EMAIL)
  await page.fill('input[type="password"]', env.DEV_AGENT_PASSWORD)
  await page.click('form button[type="submit"]')
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 20000 })
  mkdirSync(dirname(statePath), { recursive: true })
  await context.storageState({ path: statePath })
}

try {
  await page.goto(cible, { waitUntil: 'networkidle', timeout: 30000 })

  let reconnecte = false
  if (new URL(page.url()).pathname.startsWith('/login')) {
    await login()
    reconnecte = true
    await page.goto(cible, { waitUntil: 'networkidle', timeout: 30000 })
  }

  if (section) {
    const lien = page.getByText(section, { exact: false }).first()
    await lien.waitFor({ state: 'visible', timeout: 15000 })
    await lien.click()
    await page.waitForTimeout(1200)
  }

  const shotDir = join(repoRoot, '.shots')
  mkdirSync(shotDir, { recursive: true })
  const shotPath = join(shotDir, `fl-shot-${Date.now()}.jpg`)
  await page.screenshot({ path: shotPath, fullPage: true, type: 'jpeg', quality: 55 })

  console.log(JSON.stringify({
    ok: true,
    url: page.url(),
    section: section || '(aucune)',
    sessionReconnectee: reconnecte,
    capture: shotPath,
    pageVide: (await page.evaluate(() => document.body.innerText.trim().length)) === 0,
    erreurs: errors
  }, null, 2))
} catch (e) {
  console.error('ECHEC :', e.message)
  console.error('URL courante :', page.url())
  if (errors.length) console.error('Erreurs page :', errors.join(' | '))
  process.exitCode = 1
} finally {
  await browser.close()
}
