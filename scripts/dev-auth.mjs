// scripts/dev-auth.mjs
// Ouvre l'app en local, se connecte avec le compte de test des agents,
// et met la session en cache pour que les scripts suivants n'aient plus
// a repasser par le formulaire de login.
//
// Usage : node scripts/dev-auth.mjs [baseUrl]
// Defaut : http://localhost:5173
//
// La session est ecrite HORS du repo, dans le profil utilisateur,
// pour qu'aucun token ne puisse finir dans un commit par accident.

import { chromium } from 'playwright-core'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const baseUrl = process.argv[2] || 'http://localhost:5173'
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
const email = env.DEV_AGENT_EMAIL
const password = env.DEV_AGENT_PASSWORD

if (!email || !password) {
  console.error('ECHEC : DEV_AGENT_EMAIL ou DEV_AGENT_PASSWORD absent du .env')
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()

const errors = []
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 30000 })

  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('form button[type="submit"]')

  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20000 })

  mkdirSync(dirname(statePath), { recursive: true })
  await context.storageState({ path: statePath })

  console.log(JSON.stringify({
    ok: true,
    compte: email,
    urlApresLogin: page.url(),
    sessionEcriteDans: statePath,
    erreursConsole: errors
  }, null, 2))
} catch (e) {
  console.error('ECHEC login :', e.message)
  console.error('URL courante :', page.url())
  if (errors.length) console.error('Erreurs page :', errors.join(' | '))
  process.exitCode = 1
} finally {
  await browser.close()
}
