import { createRequire } from 'node:module'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)
const { handleDrivePocRequest } = require('./api/_drivePocCore.cjs')

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      react(),
      {
        name: 'drive-poc-local-api',
        configureServer(server) {
          server.middlewares.use('/api/drive-poc', (request, response) => {
            handleDrivePocRequest(request, response)
          })
        },
      },
    ],
  }
})
