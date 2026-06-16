// Client Geoapify (géocodage, Places, Routing, Route Matrix). Pur `fetch`,
// runnable Deno. La clé n'est jamais loggée (redaction sur les erreurs).

import { haversine, sleep } from './util.ts'

const GEOAPIFY_TIMEOUT_MS = 12000

export interface PlaceItem {
  name: string
  lat: number
  lon: number
  straight_m: number
  /** Renseigné par buildFacts après routing (distance/durée de marche réelle). */
  walk?: RouteLeg | null
}

export interface RouteLeg {
  distance: number // mètres
  time: number // secondes
}

export interface GeocodeRaw {
  lat: number
  lon: number
  formatted: string
  result_type?: string
  city?: string
  postcode?: string
  rank?: { confidence?: number }
}

export class GeocodeError extends Error {}

// deno-lint-ignore no-explicit-any
type Json = any

export class GeoapifyClient {
  constructor(private readonly apiKey: string) {}

  // Retire le secret d'une chaîne : la valeur exacte de la clé ET tout motif
  // `apiKey=...` (au cas où l'URL apparaisse encodée/tronquée autrement).
  private redact(s: string): string {
    return s
      .split(this.apiKey).join('***KEY***')
      .replace(/(apikey=)[^&\s)"']+/gi, '$1***KEY***')
  }

  // Point de redaction UNIQUE pour tout appel GET. Le try/catch enveloppe le
  // fetch lui-même : un échec réseau (DNS/TLS/timeout) rejette AVANT toute
  // branche de statut, et l'erreur Deno peut contenir l'URL complète — donc
  // apiKey=... Aucune erreur brute ne sort d'ici ; le message redacté est ce
  // qui finira potentiellement en meta.degraded (persisté), en réponse ou en log.
  private async getJSON(url: string, label: string): Promise<Json> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(GEOAPIFY_TIMEOUT_MS) })
      const body = await res.text()
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${body.slice(0, 180)}`)
      await sleep(120) // courtoisie quota (free tier)
      return JSON.parse(body)
    } catch (e) {
      throw new Error(`[geoapify:${label}] ${this.redact(e instanceof Error ? e.message : String(e))}`)
    }
  }

  // Idem GET : redaction à la source, fetch inclus.
  private async postJSON(url: string, payload: unknown, label: string): Promise<Json> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(GEOAPIFY_TIMEOUT_MS),
      })
      const body = await res.text()
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${body.slice(0, 180)}`)
      await sleep(120)
      return JSON.parse(body)
    } catch (e) {
      throw new Error(`[geoapify:${label}] ${this.redact(e instanceof Error ? e.message : String(e))}`)
    }
  }

  async geocode(text: string): Promise<GeocodeRaw> {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(text)}&lang=fr&limit=1&format=json&apiKey=${this.apiKey}`
    const j = await this.getJSON(url, 'geocode')
    const r = j.results?.[0]
    if (!r || typeof r.lat !== 'number' || typeof r.lon !== 'number') {
      throw new GeocodeError('géocodage sans résultat exploitable')
    }
    return r as GeocodeRaw
  }

  /**
   * Places dans un cercle, biaisé par proximité, NOMMÉS uniquement (les POI
   * sans nom sont écartés). `catList` essayé dans l'ordre : la 1re catégorie
   * acceptée (HTTP 200) gagne (fallback si une catégorie est rejetée).
   */
  async placesNamed(
    catList: string[],
    lon: number,
    lat: number,
    radius: number,
    label: string,
  ): Promise<{ usedCats: string; items: PlaceItem[] }> {
    let lastErr: unknown
    for (const cats of catList) {
      try {
        const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(cats)}`
          + `&filter=circle:${lon},${lat},${radius}&bias=proximity:${lon},${lat}&limit=40&lang=fr&apiKey=${this.apiKey}`
        const j = await this.getJSON(url, `places:${label}`)
        const items: PlaceItem[] = (j.features || [])
          .map((f: Json) => {
            const p = f.properties || {}
            const c = (f.geometry && f.geometry.coordinates) || [p.lon, p.lat]
            return {
              name: p.name as string,
              lon: c[0],
              lat: c[1],
              straight_m: typeof p.distance === 'number' ? p.distance : haversine(lat, lon, c[1], c[0]),
            }
          })
          .filter((p: PlaceItem) => !!p.name)
        return { usedCats: cats, items }
      } catch (e) {
        lastErr = e
      }
    }
    throw lastErr
  }

  /**
   * Route Matrix marche : origine → tous les targets en UN appel. Renvoie un
   * tableau aligné sur `targets` ([{distance,time}|null]). Permet de trier les
   * POI par distance de marche réelle sans router chacun individuellement.
   */
  async routeMatrixWalk(
    origin: { lat: number; lon: number },
    targets: { lat: number; lon: number }[],
  ): Promise<(RouteLeg | null)[]> {
    if (!targets.length) return []
    const payload = {
      mode: 'walk',
      sources: [{ location: [origin.lon, origin.lat] }],
      targets: targets.map((t) => ({ location: [t.lon, t.lat] })),
    }
    const j = await this.postJSON(`https://api.geoapify.com/v1/routematrix?apiKey=${this.apiKey}`, payload, 'routematrix')
    const row: Json[] = j.sources_to_targets?.[0] || []
    const byTarget = new Map<number, Json>(row.map((c) => [c.target_index, c]))
    return targets.map((_, i) => {
      const c = byTarget.get(i)
      return c && c.distance != null ? { distance: c.distance, time: c.time } : null
    })
  }

  /** Routing point à point (mode `walk` ou `drive`). */
  async routeOne(
    from: { lat: number; lon: number },
    to: { lat: number; lon: number },
    mode: 'walk' | 'drive',
  ): Promise<RouteLeg | null> {
    const url = `https://api.geoapify.com/v1/routing?waypoints=${from.lat},${from.lon}|${to.lat},${to.lon}&mode=${mode}&apiKey=${this.apiKey}`
    const j = await this.getJSON(url, `routing:${mode}`)
    const p = j.features?.[0]?.properties
    return p && p.distance != null ? { distance: p.distance, time: p.time } : null
  }
}
