// Serveur unique pour notre hébergement Dokploy (sortie de Vercel, 29/10/2026).
//
// Vercel servait le front Vite construit (`dist/`) et routait `api/*.js` (une fonction par
// fichier). Ici tourne UN conteneur : ce serveur porte les deux, avec Node seul (aucune
// dépendance ajoutée). Les handlers de `api/` ne sont pas réécrits : même signature
// (request, response) Node, donc la version Vercel reste déployable à l'identique.
//
// NE PAS renommer en `server.js` / `server.mjs` : Vercel détecte ces noms comme point
// d'entrée et changerait sa façon de construire le projet tant qu'il sert encore.
//
// Ordre : /healthz (sans E/S, pour les contrôles de déploiement), puis /api, puis le
// statique, puis le repli SPA (équivalent du `rewrites` de vercel.json).
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { existsSync, statSync, createReadStream } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Inventaire des fonctions de `api/` (hors fichiers `_*.cjs` partagés). Un test compare
// cette liste au contenu réel du dossier : une fonction ajoutée plus tard ne peut pas être
// oubliée ici en silence.
export const API_ROUTES = ['dossier-bien', 'drive-poc']

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.map': 'application/json; charset=utf-8', '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.wasm': 'application/wasm',
}

// Chargement paresseux par route : un module qui lève au chargement (variable absente)
// ne doit faire tomber que sa route (503), pas le front ni l'autre route.
const handlers = new Map()
function loadHandler(name) {
  if (!handlers.has(name)) handlers.set(name, require(path.join(ROOT, 'api', `${name}.js`)))
  return handlers.get(name)
}

function sendFile(res, file, method) {
  const ext = path.extname(file).toLowerCase()
  res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream')
  // Fichiers de `dist/assets` : noms contenant une empreinte, immuables. Le reste (index.html,
  // images non empreintées) : revalidation à chaque visite, pour qu'un déploiement soit vu tout de suite.
  const immuable = file.includes(`${path.sep}assets${path.sep}`)
  res.setHeader('Cache-Control', immuable ? 'public, max-age=31536000, immutable' : 'no-cache')
  res.setHeader('Content-Length', statSync(file).size)
  if (method === 'HEAD') return res.end()
  createReadStream(file).pipe(res)
}

export function createServer({ distDir = path.join(ROOT, 'dist'), load = loadHandler } = {}) {
  const index = path.join(distDir, 'index.html')
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local')
    const pathname = decodeURIComponent(url.pathname)

    if (pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      return res.end('{"status":"ok"}')
    }

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      const name = pathname.slice(5).replace(/\/+$/, '')
      if (!API_ROUTES.includes(name)) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
        return res.end(JSON.stringify({ error: 'Not found', path: url.pathname }))
      }
      try {
        const handler = load(name)
        return await handler(req, res)
      } catch (error) {
        console.error(`[api/${name}]`, error?.message || error)
        if (!res.headersSent) {
          res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' })
          return res.end(JSON.stringify({ error: 'Service indisponible' }))
        }
        return res.end()
      }
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' })
      return res.end()
    }

    // Statique, sans jamais sortir de `dist/` (chemins « .. » neutralisés par path.join + contrôle).
    const file = path.join(distDir, pathname)
    if (file.startsWith(distDir + path.sep) && existsSync(file) && statSync(file).isFile()) return sendFile(res, file, req.method)

    // Repli SPA (vercel.json : toutes les routes vers /). Un fichier statique absent avec
    // une extension (ex. /assets/vieux.js) répond 404 au lieu de renvoyer du HTML.
    if (path.extname(pathname)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      return res.end('Not found')
    }
    return sendFile(res, index, req.method)
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000)
  createServer().listen(port, '0.0.0.0', () => console.log(`Fiche Logement prête sur le port ${port}`))
}
