// src/lib/photoHelpers.js
// Normalisation des champs photo — partagé entre l'UI (PhotoUpload) et les
// intégrations qui consomment ces champs (ex: push photo-models Loomky).

/**
 * Normalise la valeur d'un champ photo en tableau.
 *
 * Les champs photo sont censés être des tableaux d'URLs (string[]), mais
 * certains chemins historiques / round-trips Supabase peuvent renvoyer :
 *  - une chaîne JSON sérialisée  ('["https://...", "https://..."]')
 *  - une chaîne '[]' ou une chaîne vide
 *  - une URL unique en string
 *  - null / undefined
 *
 * Renvoie TOUJOURS un vrai tableau (mêmes règles que le parsing inline
 * historique de PhotoUpload). Les éléments ne sont PAS filtrés : l'ordre et les
 * index sont préservés tels quels (PhotoUpload supprime des photos par index,
 * il faut que les index restent alignés sur la valeur stockée).
 *
 * @param {string[]|string|null|undefined} value
 * @returns {Array} tableau (typiquement string[] d'URLs)
 */
export function normalizePhotoField(value) {
    let rawPhotos = value || []

    // Parse les strings JSON (ou les URLs uniques en string)
    if (typeof rawPhotos === 'string') {
        if (rawPhotos === '[]' || rawPhotos === '') {
            rawPhotos = []
        } else if (rawPhotos.startsWith('[')) {
            try { rawPhotos = JSON.parse(rawPhotos) } catch { rawPhotos = [] }
        } else {
            rawPhotos = [rawPhotos] // URL unique
        }
    }

    return Array.isArray(rawPhotos) ? rawPhotos : []
}
