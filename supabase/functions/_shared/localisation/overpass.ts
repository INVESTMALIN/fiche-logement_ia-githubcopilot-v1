// Ancre macro "ville/bourg notable" via Overpass (OSM). Geoapify n'a pas
// d'endpoint natif "plus grande ville voisine". Requête légère (nœuds
// place=city|town avec population). Tolérante aux pannes : plusieurs miroirs +
// retries ; détecte les réponses "200 mais vide" avec remark timeout. Le
// caller (buildFacts) dégrade en `null` si tout échoue — jamais un crash.

import { haversine, normalizeText } from './util.ts'
import { POP_MIN_VILLE_NOTABLE, VILLE_NOTABLE_MIN_DISTANCE_M, VILLE_NOTABLE_RADIUS } from './config.ts'

export interface TownCandidate {
  nom: string
  population: number
  lat: number
  lon: number
}

const MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

const OVERPASS_TIMEOUT_MS = 8000

// deno-lint-ignore no-explicit-any
async function overpass(query: string): Promise<any> {
  let lastErr: unknown
  // Un essai par miroir (les 4 miroirs donnent déjà 4 chances). Timeout dur par
  // requête pour ne jamais faire pendre l'Edge Function (limite wall-clock).
  for (const ep of MIRRORS) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'fiche-logement-localisation/1.0' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
      })
      const body = await res.text()
      if (!res.ok) {
        lastErr = new Error(`Overpass HTTP ${res.status} @ ${ep.split('/')[2]}`)
        continue
      }
      const j = JSON.parse(body)
      // Overpass renvoie parfois 200 + remark de timeout avec elements vides.
      const empty = !Array.isArray(j.elements) || j.elements.length === 0
      if (empty && typeof j.remark === 'string' && /timeout|error|runtime/i.test(j.remark)) {
        lastErr = new Error(`Overpass remark: ${j.remark}`)
        continue
      }
      return j
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

/**
 * Ville/bourg notable le plus proche (population ≥ seuil), hors commune du bien.
 * Lance si Overpass est totalement indisponible ; renvoie `null` si aucune
 * ville notable dans le rayon (cas légitime, pas une erreur).
 */
export async function nearestNotableTown(lat: number, lon: number, excludeName: string): Promise<TownCandidate | null> {
  const q = `[out:json][timeout:25];(`
    + `node(around:${VILLE_NOTABLE_RADIUS},${lat},${lon})[place~"^(city|town)$"][population];`
    + `);out tags center 300;`
  const r = await overpass(q)
  // Normalisation des DEUX côtés avant comparaison (accents/tirets/espaces/casse) :
  // la saisie fiche "Nimes" ou "Saint Etienne" doit exclure "Nîmes"/"Saint-Étienne" côté OSM.
  const exclude = normalizeText(excludeName)
  // deno-lint-ignore no-explicit-any
  const cands = (r.elements || [])
    .map((el: any) => {
      const c = el.type === 'node' ? [el.lat, el.lon] : el.center ? [el.center.lat, el.center.lon] : null
      const pop = parseInt(String(el.tags?.population || '').replace(/\D/g, ''), 10)
      const tlat: number | undefined = c?.[0]
      const tlon: number | undefined = c?.[1]
      return {
        nom: (el.tags?.name as string) || '',
        population: Number.isFinite(pop) ? pop : 0,
        lat: tlat,
        lon: tlon,
        straight_m: tlat != null && tlon != null ? haversine(lat, lon, tlat, tlon) : Number.POSITIVE_INFINITY,
      }
    })
    .filter((e) =>
      e.nom !== '' &&
      Number.isFinite(e.straight_m) &&
      e.population >= POP_MIN_VILLE_NOTABLE &&
      e.straight_m >= VILLE_NOTABLE_MIN_DISTANCE_M && // garde-fou : jamais la commune du bien
      normalizeText(e.nom) !== exclude)
    .sort((a, b) => a.straight_m - b.straight_m)
  const best = cands[0]
  return best ? { nom: best.nom, population: best.population, lat: best.lat as number, lon: best.lon as number } : null
}
