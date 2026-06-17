// Orchestrateur : adresse → fiche de faits localisation (palette pour l'agent
// annonce). Cœur = Geoapify (géocodage, POI, routing). Ancres macro = OSM
// (ville notable via Overpass, aéroport via liste curée). Dégradation gracieuse :
// seul le géocodage est bloquant ; toute autre brique qui échoue → null + note
// dans meta.degraded, jamais un crash du build.
//
// Porté du spike validé sur bien réel #1965 (Colmar).

import { GeoapifyClient, type PlaceItem, type RouteLeg } from './geoapify.ts'
import { nearestNotableTown } from './overpass.ts'
import { geocodeText } from './address.ts'
import { haversine, leg, scrubApiKey, type Leg } from './util.ts'
import {
  AIRPORTS,
  ARRET_CATS,
  ARRET_RADII,
  FAITS_SCHEMA_VERSION,
  GARE_CATS,
  GARE_RADII,
  METRO_CATS,
  METRO_RADII,
  POI_GROUPS,
  POP_MIN_VILLE_NOTABLE,
  type Airport,
} from './config.ts'
import type { Adresse, Aeroport, BuildResult, Faits, Poi, TransportStop, VilleNotable } from './types.ts'

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// Budget de temps global du fallback de routing POI (matrix indisponible).
// Garantit que la function termine et upserte même si chaque route individuelle
// pend jusqu'à son timeout réseau. Combiné au fait qu'on ne route que le top N
// gardé par catégorie, le pire cas reste : budget + 1 appel en vol (~budget+12s).
const FALLBACK_ROUTING_BUDGET_MS = 15000

function nearestAirport(lat: number, lon: number): (Airport & { straight_m: number }) | null {
  return AIRPORTS
    .map((a) => ({ ...a, straight_m: haversine(lat, lon, a.lat, a.lon) }))
    .sort((a, b) => a.straight_m - b.straight_m)[0] || null
}

export async function buildLocalisationFacts(
  adresse: Adresse,
  geoapifyKey: string,
  nowISO: string,
): Promise<BuildResult> {
  const geo = new GeoapifyClient(geoapifyKey)
  const degraded: string[] = []

  // 1) Géocodage — bloquant (sans coordonnées, aucun fait possible).
  const g = await geo.geocode(geocodeText(adresse))
  const origin = { lat: g.lat, lon: g.lon }

  // 2) POI nommés par catégorie, puis UNE Route Matrix marche pour le temps de
  //    marche réel, tri par distance réelle, top N par catégorie.
  const groups: { key: string; keep: number; items: PlaceItem[] }[] = []
  for (const grp of POI_GROUPS) {
    try {
      const { items } = await geo.placesNamed(grp.cats, origin.lon, origin.lat, grp.radius, grp.key)
      groups.push({ key: grp.key, keep: grp.keep, items })
    } catch (e) {
      degraded.push(`pois.${grp.key} indisponible: ${msg(e)}`)
      groups.push({ key: grp.key, keep: grp.keep, items: [] })
    }
  }

  const allTargets = groups.flatMap((gr) => gr.items)
  let routing: 'matrix' | 'individual' = 'matrix'
  let matrixLegs: (RouteLeg | null)[] | null = null
  try {
    matrixLegs = await geo.routeMatrixWalk(origin, allTargets)
  } catch (e) {
    routing = 'individual'
    degraded.push(`route_matrix KO → fallback routes individuelles bornées: ${msg(e)}`)
  }

  const pois: Record<string, Poi[]> = {}
  if (matrixLegs) {
    // Chemin nominal : 1 appel matrix (borné, 1 requête quel que soit le nombre
    // de cibles) → temps de marche réel pour tous les candidats → tri par
    // distance de marche réelle → top N.
    let i = 0
    for (const gr of groups) for (const it of gr.items) it.walk = matrixLegs[i++] ?? null
    for (const gr of groups) {
      pois[gr.key] = gr.items
        .map((it) => ({
          nom: it.name,
          _sort: it.walk?.distance ?? it.straight_m,
          marche: it.walk ? leg(it.walk.distance, it.walk.time) : null,
        }))
        .sort((a, b) => a._sort - b._sort)
        .slice(0, gr.keep)
        .map(({ _sort, ...rest }) => rest)
    }
  } else {
    // Chemin dégradé (matrix indisponible) : router ~40 candidats bruts × 7
    // catégories en séquentiel ferait exploser le wall-clock (chaque route peut
    // pendre jusqu'à son timeout). On borne le coût en DEUX temps :
    //   1) on ne route que le top N par catégorie, ordonné à vol d'oiseau
    //      (tradeoff validé : on sacrifie la précision de l'ordre, jamais
    //      l'enrichissement) ;
    //   2) budget de temps global : passé le budget, les POI restants tombent
    //      en marche=null et sont comptés dans degraded.
    // → la function termine et upserte toujours, même si tout pend.
    const start = Date.now()
    let skipped = 0
    for (const gr of groups) {
      const kept = gr.items.slice().sort((a, b) => a.straight_m - b.straight_m).slice(0, gr.keep)
      const entries: Poi[] = []
      for (const it of kept) {
        let marche: Leg | null = null
        if (Date.now() - start < FALLBACK_ROUTING_BUDGET_MS) {
          const r = await geo.routeOne(origin, it, 'walk').catch(() => null)
          marche = r ? leg(r.distance, r.time) : null
        }
        if (!marche) skipped++
        entries.push({ nom: it.name, marche })
      }
      pois[gr.key] = entries
    }
    if (skipped > 0) {
      degraded.push(`pois: ${skipped} temps de marche non calculés (fallback borné, budget ${FALLBACK_ROUTING_BUDGET_MS} ms)`)
    }
  }

  // 3) Transport — arrêt bus/tram + métro (créneau dédié) + gare (rayon large),
  //    chacun avec temps à pied ET en voiture. Le métro a SA propre requête pour
  //    qu'une bouche de métro ne soit pas masquée par un arrêt de bus plus proche.
  const arret = await nearestStop(geo, origin, ARRET_CATS, ARRET_RADII, degraded, 'arret')
  const metro = await nearestStop(geo, origin, METRO_CATS, METRO_RADII, degraded, 'metro')
  const gare = await nearestStop(geo, origin, GARE_CATS, GARE_RADII, degraded, 'gare')
  const transport = {
    arret_proche: await twoModes(geo, origin, arret, degraded, 'arret'),
    metro_proche: await twoModes(geo, origin, metro, degraded, 'metro'),
    gare_proche: await twoModes(geo, origin, gare, degraded, 'gare'),
  }

  // 4) Ancres macro — voiture seule. Ville notable (Overpass, dégradable),
  //    aéroport (liste curée, toujours disponible).
  let ville_notable: VilleNotable | null = null
  try {
    const tc = await nearestNotableTown(origin.lat, origin.lon, adresse.ville)
    if (tc) {
      const voiture = await routeLeg(geo, origin, tc, 'drive', degraded, 'ancres_macro.ville_notable')
      ville_notable = { nom: tc.nom, voiture, population: tc.population }
    }
  } catch (e) {
    degraded.push(`ville_notable indisponible (Overpass): ${msg(e)}`)
  }

  let aeroport: Aeroport | null = null
  const ap = nearestAirport(origin.lat, origin.lon)
  if (ap) {
    const voiture = await airportDrive(geo, origin, ap, degraded)
    aeroport = { nom: ap.name, voiture, iata: ap.iata }
  }

  const faits: Faits = {
    schema_version: FAITS_SCHEMA_VERSION,
    ville: g.city || adresse.ville,
    code_postal: g.postcode || adresse.code_postal,
    coordonnees: { lat: g.lat, lon: g.lon },
    pois,
    transport,
    ancres_macro: { ville_notable, aeroport },
    meta: {
      source: 'geoapify',
      routing,
      geocode_confidence: g.rank?.confidence ?? null,
      geocode_result_type: g.result_type ?? null,
      population_min_ville_notable: POP_MIN_VILLE_NOTABLE,
      // Filet anti-fuite avant persistance : aucune note ne doit contenir de
      // secret (en plus de la redaction à la source dans le client Geoapify).
      degraded: degraded.map(scrubApiKey),
      generated_at: nowISO,
    },
  }

  return {
    faits,
    geocode: {
      lat: g.lat,
      lon: g.lon,
      confidence: g.rank?.confidence ?? null,
      result_type: g.result_type ?? null,
      formatted: g.formatted,
      city: g.city ?? null,
      postcode: g.postcode ?? null,
    },
  }
}

// Arrêt le plus proche (rayons progressifs). Dédup par nom implicite : on
// renvoie le plus proche après tri, donc un seul même si l'arrêt remonte en
// plusieurs nœuds. Échec Places → note + null (pas de crash).
async function nearestStop(
  geo: GeoapifyClient,
  origin: { lat: number; lon: number },
  cats: string[],
  radii: number[],
  degraded: string[],
  label: string,
): Promise<PlaceItem | null> {
  for (const radius of radii) {
    try {
      const { items } = await geo.placesNamed(cats, origin.lon, origin.lat, radius, label)
      if (items.length) return items.sort((a, b) => a.straight_m - b.straight_m)[0]
    } catch (e) {
      degraded.push(`transport.${label} (r=${radius}) indisponible: ${msg(e)}`)
    }
  }
  return null
}

async function twoModes(
  geo: GeoapifyClient,
  origin: { lat: number; lon: number },
  stop: PlaceItem | null,
  degraded: string[],
  label: string,
): Promise<TransportStop | null> {
  // stop null = absence réelle d'arrêt/gare dans le rayon → légitimement vide,
  // PAS une panne, donc rien dans degraded.
  if (!stop) return null
  const marche = await routeLeg(geo, origin, stop, 'walk', degraded, `transport.${label}`)
  const voiture = await routeLeg(geo, origin, stop, 'drive', degraded, `transport.${label}`)
  return { nom: stop.name, marche, voiture }
}

/**
 * Calcule un leg de trajet et NOTE toute panne dans `degraded` avant de
 * renvoyer null : échec d'appel (timeout, quota, HTTP) OU réponse 200 sans
 * itinéraire. À n'appeler que quand l'ancre/le POI existe — l'absence d'ancre
 * (pas d'arrêt/gare/etc. dans le rayon) est gérée en amont et ne passe jamais
 * par ici. Ainsi `meta.degraded` distingue "on a essayé et ça a cassé" (noté)
 * d'une "absence réelle" (non notée).
 */
async function routeLeg(
  geo: GeoapifyClient,
  origin: { lat: number; lon: number },
  dest: { lat: number; lon: number },
  mode: 'walk' | 'drive',
  degraded: string[],
  label: string,
): Promise<Leg | null> {
  try {
    const r = await geo.routeOne(origin, dest, mode)
    if (r) return leg(r.distance, r.time)
    degraded.push(`${label}.${mode} routing sans itinéraire`)
    return null
  } catch (e) {
    degraded.push(`${label}.${mode} routing KO: ${msg(e)}`)
    return null
  }
}

/**
 * Décale un point d'environ `meters` mètres vers une cible (interpolation
 * lat/lon, suffisante à cette échelle de quelques km).
 */
function nudgeToward(
  p: { lat: number; lon: number },
  toward: { lat: number; lon: number },
  meters: number,
): { lat: number; lon: number } {
  const tot = haversine(p.lat, p.lon, toward.lat, toward.lon)
  if (tot === 0) return p
  const f = Math.min(1, meters / tot)
  return { lat: p.lat + (toward.lat - p.lat) * f, lon: p.lon + (toward.lon - p.lon) * f }
}

/**
 * Temps voiture vers l'aéroport, avec rattrapage. Même discipline que routeLeg
 * pour la tentative directe : une EXCEPTION = panne API (timeout/quota/HTTP) →
 * notée KO, jamais nudgée ; un retour NULL = vraie absence de route (coord sur
 * une aire non routable) → SEUL cas qui déclenche le rattrapage. Le retry nudgé
 * (~1,5 km vers l'origine, qui se raccroche au réseau routier) est délégué à
 * routeLeg, qui note correctement KO vs sans itinéraire s'il échoue à son tour
 * et ne note rien s'il réussit. Évite un voiture:null sur un aéroport pourtant
 * accessible en voiture. Portée: ancre aéroport uniquement — ne touche pas aux
 * arrêts/métro/gare/POI.
 */
async function airportDrive(
  geo: GeoapifyClient,
  origin: { lat: number; lon: number },
  airport: { lat: number; lon: number },
  degraded: string[],
): Promise<Leg | null> {
  let direct: RouteLeg | null
  try {
    direct = await geo.routeOne(origin, airport, 'drive')
  } catch (e) {
    // Panne API : ce n'est PAS une coord non routable → on ne nudge pas, on note.
    degraded.push(`ancres_macro.aeroport.drive routing KO: ${msg(e)}`)
    return null
  }
  if (direct) return leg(direct.distance, direct.time)
  // Vraie absence de route sur la coord curée → rattrapage vers un point nudgé.
  const nudged = nudgeToward(airport, origin, 1500)
  return await routeLeg(geo, origin, nudged, 'drive', degraded, 'ancres_macro.aeroport')
}
