// Configuration de la collecte localisation = section 6 du contrat d'entrée
// agent annonce (docs/agent-annonce/contrat-entree-agent-annonce-airbnb-v1.md).
// Volumes / rayons / catégories validés sur bien réel #1965 (Colmar).

export const PAYS = 'France'

/**
 * Groupes de POI. `cats` = liste de chaînes de catégories Geoapify essayées
 * dans l'ordre (fallback si une catégorie est rejetée). `radius` en mètres
 * (cercle Geoapify, à vol d'oiseau), `keep` = nombre gardé après tri par
 * distance de marche réelle.
 */
export interface PoiGroup {
  key: string
  cats: string[]
  radius: number
  keep: number
}

export const POI_GROUPS: PoiGroup[] = [
  { key: 'commerces', cats: ['commercial.supermarket,commercial.convenience,commercial.marketplace'], radius: 1000, keep: 5 },
  // bakery existe en catégorie dédiée Geoapify ; fallback large si rejet.
  { key: 'boulangeries', cats: ['commercial.food_and_drink.bakery', 'commercial.food_and_drink'], radius: 1000, keep: 5 },
  { key: 'restaurants', cats: ['catering.restaurant'], radius: 1000, keep: 5 },
  { key: 'bars_cafes', cats: ['catering.bar,catering.cafe,catering.pub'], radius: 1000, keep: 5 },
  { key: 'sites_touristiques', cats: ['tourism.attraction,tourism.sights'], radius: 1500, keep: 5 },
  { key: 'parcs', cats: ['leisure.park'], radius: 1200, keep: 3 },
  // Conditionnel : on garde 0 à 2 plans d'eau nommés (souvent vide en centre-ville,
  // les cours d'eau linéaires ne sortent pas en POI ponctuel — comportement attendu).
  { key: 'pres_de_leau', cats: ['natural.water,beach', 'natural.water'], radius: 2000, keep: 2 },
]

/** Transport : arrêt bus/tram le plus proche (dédup par nom), rayons progressifs. */
export const ARRET_CATS = ['public_transport.bus,public_transport.tram']
export const ARRET_RADII = [2000, 8000]

/** Gare : requête dédiée à rayon large (une gare peut être à plusieurs km). */
export const GARE_CATS = ['public_transport.train']
export const GARE_RADII = [15000, 60000]

/** "Ville/bourg notable" = population significative & reconnaissable (≥ seuil). */
export const POP_MIN_VILLE_NOTABLE = 20000
export const VILLE_NOTABLE_RADIUS = 45000
/**
 * Garde-fou : une "ville notable" plus proche que ce seuil est rejetée. Protège
 * le symptôme "ancre macro = commune du bien à temps quasi nul" même si le
 * rapprochement de nom ratait (saisie fiche très éloignée du nom OSM). Une
 * vraie ville voisine distincte a son centroïde bien au-delà.
 */
export const VILLE_NOTABLE_MIN_DISTANCE_M = 1500

/**
 * Aéroports commerciaux (France + frontaliers couramment utilisés). OSM classe
 * mal les aérodromes (Colmar-Houssen a un IATA mais zéro vol commercial) et les
 * requêtes Overpass grand rayon sont peu fiables → liste statique stable.
 * On prend le plus proche à vol d'oiseau, puis temps voiture via Geoapify.
 */
export interface Airport {
  name: string
  iata: string
  lat: number
  lon: number
}

export const AIRPORTS: Airport[] = [
  { name: 'Paris-Charles de Gaulle', iata: 'CDG', lat: 49.0097, lon: 2.5479 },
  { name: 'Paris-Orly', iata: 'ORY', lat: 48.7233, lon: 2.3794 },
  { name: 'Paris-Beauvais', iata: 'BVA', lat: 49.4544, lon: 2.1128 },
  { name: 'Lyon-Saint-Exupéry', iata: 'LYS', lat: 45.7256, lon: 5.0811 },
  { name: 'Marseille-Provence', iata: 'MRS', lat: 43.4393, lon: 5.2214 },
  { name: "Nice-Côte d'Azur", iata: 'NCE', lat: 43.6584, lon: 7.2159 },
  { name: 'Toulouse-Blagnac', iata: 'TLS', lat: 43.6293, lon: 1.3638 },
  { name: 'Bordeaux-Mérignac', iata: 'BOD', lat: 44.8283, lon: -0.7156 },
  { name: 'Nantes-Atlantique', iata: 'NTE', lat: 47.1532, lon: -1.6111 },
  { name: 'Strasbourg-Entzheim', iata: 'SXB', lat: 48.5383, lon: 7.6282 },
  { name: 'EuroAirport Bâle-Mulhouse-Fribourg', iata: 'MLH', lat: 47.5896, lon: 7.5299 },
  { name: 'Lille-Lesquin', iata: 'LIL', lat: 50.5619, lon: 3.0894 },
  { name: 'Montpellier-Méditerranée', iata: 'MPL', lat: 43.5762, lon: 3.9630 },
  { name: 'Biarritz-Pays Basque', iata: 'BIQ', lat: 43.4684, lon: -1.5311 },
  { name: 'Brest-Bretagne', iata: 'BES', lat: 48.4479, lon: -4.4185 },
  { name: 'Rennes-Saint-Jacques', iata: 'RNS', lat: 48.0695, lon: -1.7348 },
  { name: 'Clermont-Ferrand-Auvergne', iata: 'CFE', lat: 45.7867, lon: 3.1692 },
  { name: 'Pau-Pyrénées', iata: 'PUF', lat: 43.3800, lon: -0.4186 },
  { name: 'Ajaccio-Napoléon Bonaparte', iata: 'AJA', lat: 41.9236, lon: 8.8029 },
  { name: 'Bastia-Poretta', iata: 'BIA', lat: 42.5527, lon: 9.4837 },
  { name: 'Carcassonne', iata: 'CCF', lat: 43.2160, lon: 2.3063 },
  { name: 'Limoges-Bellegarde', iata: 'LIG', lat: 45.8628, lon: 1.1794 },
  { name: 'Tours-Val de Loire', iata: 'TUF', lat: 47.4322, lon: 0.7276 },
  { name: 'Nîmes-Alès-Camargue', iata: 'FNI', lat: 43.7574, lon: 4.4163 },
  { name: 'Perpignan-Rivesaltes', iata: 'PGF', lat: 42.7404, lon: 2.8707 },
  { name: 'Toulon-Hyères', iata: 'TLN', lat: 43.0973, lon: 6.1460 },
  { name: 'Grenoble-Alpes-Isère', iata: 'GNB', lat: 45.3629, lon: 5.3294 },
  { name: 'Metz-Nancy-Lorraine', iata: 'ETZ', lat: 48.9821, lon: 6.2513 },
  // Frontaliers couramment utilisés depuis la France
  { name: 'Genève-Cointrin', iata: 'GVA', lat: 46.2381, lon: 6.1089 },
  { name: 'Luxembourg-Findel', iata: 'LUX', lat: 49.6266, lon: 6.2115 },
  { name: 'Karlsruhe/Baden-Baden', iata: 'FKB', lat: 48.7794, lon: 8.0805 },
  { name: 'Barcelone-El Prat', iata: 'BCN', lat: 41.2974, lon: 2.0833 },
]

export const FAITS_SCHEMA_VERSION = 1
