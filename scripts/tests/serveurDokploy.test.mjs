// Tests du serveur Dokploy (serveur-dokploy.mjs) : santé, routes api, statique, repli SPA, sécurité des chemins.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, chmodSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { createServer, API_ROUTES } from '../../serveur-dokploy.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function dist() {
  const d = mkdtempSync(path.join(os.tmpdir(), 'fl-dist-'))
  writeFileSync(path.join(d, 'index.html'), '<!doctype html><title>FL</title>')
  mkdirSync(path.join(d, 'assets'))
  writeFileSync(path.join(d, 'assets', 'app-abc123.js'), 'console.log(1)')
  writeFileSync(path.join(d, 'logo.png'), 'png')
  return d
}

async function withServer(opts, fn) {
  const server = createServer(opts)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  try { await fn(base) } finally { await new Promise((r) => server.close(r)) }
}

test('inventaire : API_ROUTES correspond aux fonctions réelles de api/', () => {
  const reel = readdirSync(path.join(ROOT, 'api')).filter((f) => f.endsWith('.js') && !f.startsWith('_')).map((f) => f.slice(0, -3)).sort()
  assert.deepEqual([...API_ROUTES].sort(), reel)
})

test('santé, statique, repli SPA, 404 et en-têtes de cache', async () => {
  await withServer({ distDir: dist(), load: () => async (req, res) => { res.statusCode = 200; res.end('{"ok":true}') } }, async (base) => {
    let r = await fetch(base + '/healthz'); assert.equal(r.status, 200); assert.equal(await r.text(), '{"status":"ok"}')
    r = await fetch(base + '/assets/app-abc123.js'); assert.equal(r.status, 200); assert.match(r.headers.get('cache-control'), /immutable/)
    r = await fetch(base + '/fiche/42'); assert.equal(r.status, 200); assert.match(await r.text(), /<title>FL/); assert.equal(r.headers.get('cache-control'), 'no-cache')
    r = await fetch(base + '/'); assert.equal(r.status, 200)
    r = await fetch(base + '/assets/absent.js'); assert.equal(r.status, 404)
    r = await fetch(base + '/api/inconnue'); assert.equal(r.status, 404)
    r = await fetch(base + '/api/dossier-bien', { method: 'POST', body: '{}' }); assert.equal(r.status, 200); assert.equal(await r.text(), '{"ok":true}')
  })
})

test('chemin hors de dist refusé (renvoie l\'appli, jamais un fichier extérieur)', async () => {
  await withServer({ distDir: dist() }, async (base) => {
    const r = await fetch(base + '/..%2f..%2fetc%2fpasswd')
    assert.notEqual(r.status, 500)
    assert.doesNotMatch(await r.text(), /root:/)
  })
})

test('une route api qui lève au chargement répond 503 sans faire tomber le reste', async () => {
  await withServer({ distDir: dist(), load: () => { throw new Error('variable absente') } }, async (base) => {
    let r = await fetch(base + '/api/drive-poc', { method: 'POST', body: '{}' }); assert.equal(r.status, 503)
    r = await fetch(base + '/healthz'); assert.equal(r.status, 200)
  })
})

test('adresse mal formée : 400, et le serveur reste vivant', async () => {
  await withServer({ distDir: dist() }, async (base) => {
    let r = await fetch(base + '/%E0%A4%A'); assert.equal(r.status, 400)
    r = await fetch(base + '/healthz'); assert.equal(r.status, 200)
  })
})

test('fichier illisible : erreur isolée, le serveur reste vivant', async (t) => {
  if (process.getuid && process.getuid() === 0) return t.skip('root lit tout')
  const d = dist(); writeFileSync(path.join(d, 'secret.txt'), 'x'); chmodSync(path.join(d, 'secret.txt'), 0o000)
  await withServer({ distDir: d }, async (base) => {
    const r = await fetch(base + '/secret.txt').catch(() => ({ status: 'coupé' }))
    assert.notEqual(r.status, 200)
    const h = await fetch(base + '/healthz'); assert.equal(h.status, 200)
  })
})
