// src/lib/videoCompressor.js
// URL de base du service video-compressor (generate-pdf, compress-video, extract-audio).
// Configurable par VITE_VIDEO_COMPRESSOR_URL (URL de base, sans chemin) ; repli sur
// l'adresse Railway historique si la variable est absente ou vide.
const VIDEO_COMPRESSOR_URL_PAR_DEFAUT = 'https://video-compressor-production.up.railway.app'

const urlConfiguree = (import.meta.env.VITE_VIDEO_COMPRESSOR_URL || '').trim()

export const VIDEO_COMPRESSOR_URL = (urlConfiguree || VIDEO_COMPRESSOR_URL_PAR_DEFAUT).replace(/\/+$/, '')
