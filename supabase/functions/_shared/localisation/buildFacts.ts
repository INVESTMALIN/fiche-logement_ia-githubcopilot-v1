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
import { haversine, leg } from './util.ts'
import {
  AIRPORTS,
  ARRET_CATS,
  ARRET_RADII,
  FAITS_SCHEMA_VERSION,
  GARE_CATS,
  GARE_RADII,
  POI_GROUPS,
  POP_MIN_VILLE_NOTABLE,
  type Airport,
} from './config.ts'
import type { Adresse, Aeroport, BuildResult, Faits, Poi, TransportStop, VilleNotable } from './types.ts'

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

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
    degraded.push(`route_matrix KO → routes individuelles: ${msg(e)}`)
  }

  if (matrixLegs) {
    let i = 0
    for (const gr of groups) for (const it of gr.items) it.walk = matrixLegs[i++] ?? null
  } else {
    // Fallback : route marche individuelle (acceptable car 1×/logement).
    for (const gr of groups) {
      for (const it of gr.items) {
        it.walk = await geo.routeOne(origin, it, 'walk').catch(() => null)
      }
    }
  }

  const pois: Record<string, Poi[]> = {}
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

  // 3) Transport — arrêt bus/tram le plus proche + gare (rayon large),
  //    chacun avec temps à pied ET en voiture.
  const arret = await nearestStop(geo, origin, ARRET_CATS, ARRET_RADII, degraded, 'arret')
  const gare = await nearestStop(geo, origin, GARE_CATS, GARE_RADII, degraded, 'gare')
  const transport = {
    arret_proche: await twoModes(geo, origin, arret),
    gare_proche: await twoModes(geo, origin, gare),
  }

  // 4) Ancres macro — voiture seule. Ville notable (Overpass, dégradable),
  //    aéroport (liste curée, toujours disponible).
  let ville_notable: VilleNotable | null = null
  try {
    const tc = await nearestNotableTown(origin.lat, origin.lon, adresse.ville)
    if (tc) {
      const d = await geo.routeOne(origin, tc, 'drive').catch(() => null)
      ville_notable = { nom: tc.nom, voiture: d ? leg(d.distance, d.time) : null, population: tc.population }
    }
  } catch (e) {
    degraded.push(`ville_notable indisponible (Overpass): ${msg(e)}`)
  }

  let aeroport: Aeroport | null = null
  const ap = nearestAirport(origin.lat, origin.lon)
  if (ap) {
    const d = await geo.routeOne(origin, ap, 'drive').catch(() => null)
    aeroport = { nom: ap.name, voiture: d ? leg(d.distance, d.time) : null, iata: ap.iata }
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
      degraded,
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
): Promise<TransportStop | null> {
  if (!stop) return null
  const w = await geo.routeOne(origin, stop, 'walk').catch(() => null)
  const d = await geo.routeOne(origin, stop, 'drive').catch(() => null)
  return {
    nom: stop.name,
    marche: w ? leg(w.distance, w.time) : null,
    voiture: d ? leg(d.distance, d.time) : null,
  }
}
