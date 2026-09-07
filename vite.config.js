import { createRequire } from 'node:module'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)
const { handleDrivePocRequest } = require('./api/_drivePocCore.cjs')
const { handleDossierBienRequest } = require('./api/_dossierBienCore.cjs')

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      react(),
      {
        // Les fonctions serverless de `api/` ne tournent pas sous `vite dev` :
        // on les monte ici pour que le parcours local passe par le MEME code
        // qu'en production (Vercel).
        name: 'api-local',
        configureServer(server) {
          server.middlewares.use('/api/drive-poc', (request, response) => {
            handleDrivePocRequest(request, response)
          })
          server.middlewares.use('/api/dossier-bien', (request, response) => {
            handleDossierBienRequest(request, response)
          })
        },
      },
    ],
  }
})
