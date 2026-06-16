// Formes de données de la fiche de faits localisation.
// `Faits` = ce qui est stocké dans fiche_localisation_faits.faits et consommé
// plus tard par l'Edge Function annonce-generate. Ne contient JAMAIS la rue
// (interdit en sortie publique) — seulement ville, code postal et faits calculés.

import type { Leg } from './util.ts'

export interface Adresse {
  rue: string
  complement?: string
  ville: string
  code_postal: string
}

export interface Poi {
  nom: string
  marche: Leg | null
}

export interface TransportStop {
  nom: string
  marche: Leg | null
  voiture: Leg | null
}

export interface VilleNotable {
  nom: string
  voiture: Leg | null
  population: number
}

export interface Aeroport {
  nom: string
  voiture: Leg | null
  iata: string
}

export interface Faits {
  schema_version: number
  ville: string
  code_postal: string
  coordonnees: { lat: number; lon: number }
  /** Clés : commerces, boulangeries, restaurants, bars_cafes, sites_touristiques, parcs, pres_de_leau. */
  pois: Record<string, Poi[]>
  transport: {
    arret_proche: TransportStop | null
    gare_proche: TransportStop | null
  }
  ancres_macro: {
    ville_notable: VilleNotable | null
    aeroport: Aeroport | null
  }
  meta: {
    source: 'geoapify'
    routing: 'matrix' | 'individual'
    geocode_confidence: number | null
    geocode_result_type: string | null
    population_min_ville_notable: number
    /** Notes de dégradation (ex: ancre macro indisponible). Vide = run nominal. */
    degraded: string[]
    generated_at: string
  }
}

export interface GeocodeResult {
  lat: number
  lon: number
  confidence: number | null
  result_type: string | null
  formatted: string
  city: string | null
  postcode: string | null
}

export interface BuildResult {
  faits: Faits
  geocode: GeocodeResult
}
