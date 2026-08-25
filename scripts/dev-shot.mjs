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
//
// La fiche est ouverte via /fiche?id=<uuid> : c'est le seul format que
// FormContext sait lire. Le script echoue explicitement si la fiche n'est pas
// chargee, au lieu de capturer un formulaire vierge (cf. verifierFicheChargee).

import { chromium } from 'playwright-core'
import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const section = process.argv[2] || null
const arg3 = process.argv[3] || null
const arg4 = process.argv[4] || null
// 3e argument : soit une URL, soit un texte a cadrer et verifier dans la page.
const cibleTexte = arg3 && !arg3.startsWith('http') ? arg3 : null
const baseUrl = [arg3, arg4].find(a => a && a.startsWith('http')) || 'http://localhost:5173'
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
// FormContext lit l'id de fiche dans la QUERY STRING (params.get('id')), jamais
// dans le parametre de route. La route /fiche/:id existe dans App.jsx mais
// personne ne la lit : elle rend un formulaire vierge, sans erreur.
const cible = ficheId ? `${baseUrl}/fiche?id=${ficheId}` : `${baseUrl}/`

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  storageState: existsSync(statePath) ? statePath : undefined
})
const page = await context.newPage()

const errors = []
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

// Le champ "Nom de la Fiche" (placeholder "Le nom se genere automatiquement...")
// vaut "Nouvelle fiche" tant qu'aucune fiche n'est chargee. C'est le seul signal
// visible : un mauvais format d'URL ne leve aucune erreur.
const SELECTEUR_NOM_FICHE = 'input[placeholder*="automatiquement"]'

// Echoue net si la fiche attendue n'est pas chargee. Sans ce garde-fou le script
// capture un formulaire vide en pretendant montrer la fiche, et un agent qui
// enchainerait sur "Enregistrer" ecraserait toutes les colonnes de la fiche.
async function verifierFicheChargee() {
  const champNom = page.locator(SELECTEUR_NOM_FICHE).first()
  await champNom.waitFor({ state: 'visible', timeout: 15000 })
  try {
    await page.waitForFunction(
      sel => {
        const v = document.querySelector(sel)?.value.trim()
        return Boolean(v) && v !== 'Nouvelle fiche'
      },
      SELECTEUR_NOM_FICHE,
      { timeout: 15000 }
    )
  } catch {
    const vu = (await champNom.inputValue()).trim() || '(vide)'
    throw new Error(
      `fiche non chargee : le formulaire affiche "${vu}" au lieu des donnees de ` +
      `la fiche ${ficheId}. FormContext lit l'id dans la query string, l'URL ` +
      `doit etre /fiche?id=<uuid> et non /fiche/<uuid>.`
    )
  }
  return (await champNom.inputValue()).trim()
}

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

  // Avant tout clic : la fiche visee est-elle vraiment chargee ?
  const ficheChargee = ficheId ? await verifierFicheChargee() : null

  if (section) {
    const lien = page.getByText(section, { exact: false }).first()
    await lien.waitFor({ state: 'visible', timeout: 15000 })
    await lien.click()
    await page.waitForTimeout(1200)
  }

  let texteTrouve = null
  if (cibleTexte) {
    const loc = page.getByText(cibleTexte, { exact: false }).first()
    texteTrouve = await loc.count() > 0
    if (texteTrouve) {
      await loc.scrollIntoViewIfNeeded()
      await page.waitForTimeout(400)
    }
  }

  const shotDir = join(repoRoot, '.shots')
  mkdirSync(shotDir, { recursive: true })
  const shotPath = join(shotDir, `fl-shot-${Date.now()}.jpg`)

  // Les sections longues (Avis, Equipements) depassent la taille d'image
  // que les outils fichiers des agents savent relire. Au dela d'une certaine
  // hauteur on cadre sur la fenetre au lieu de capturer toute la page.
  const hauteur = await page.evaluate(() => document.body.scrollHeight)
  const pleinePage = hauteur <= 5000

  await page.screenshot({
    path: shotPath,
    fullPage: pleinePage,
    type: 'jpeg',
    quality: 55
  })

  console.log(JSON.stringify({
    ok: true,
    url: page.url(),
    ficheChargee: ficheChargee || '(aucune fiche visee)',
    section: section || '(aucune)',
    texteCherche: cibleTexte || '(aucun)',
    texteTrouve,
    capturePleinePage: pleinePage,
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
