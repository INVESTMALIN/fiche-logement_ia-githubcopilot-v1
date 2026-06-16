// Utilitaires géo partagés (sans dépendance externe, runnable Deno).

/** Distance à vol d'oiseau en mètres (Haversine). */
export function haversine(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000
  const toR = (d: number) => (d * Math.PI) / 180
  const dLat = toR(bLat - aLat)
  const dLon = toR(bLon - aLon)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export interface Leg {
  distance_m: number
  duree_s: number
  duree_min: number
}

/**
 * Construit un "leg" (distance + durée) à partir d'un résultat de routing.
 * `duree_s` null → leg null (on ne fabrique jamais une durée fictive).
 * Minute plancher à 1 (un POI à 30 s reste "1 min", jamais "0 min").
 */
export function leg(distance_m: number | null | undefined, duree_s: number | null | undefined): Leg | null {
  if (distance_m == null || duree_s == null) return null
  return {
    distance_m: Math.round(distance_m),
    duree_s: Math.round(duree_s),
    duree_min: Math.max(1, Math.round(duree_s / 60)),
  }
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Normalise une chaîne pour comparaison/clé robuste : retire accents et
 * ponctuation, abaisse la casse, réduit les espaces. UN SEUL normaliseur
 * partagé pour tout rapprochement de chaînes — clé d'adresse (recompute) ET
 * comparaison d'une saisie humaine (fiche) à une donnée canonique (OSM/Geoapify).
 * Ex. "Saint-Étienne" et "Saint Etienne" → "saint etienne" ; "Nîmes" → "nimes".
 */
export function normalizeText(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}
