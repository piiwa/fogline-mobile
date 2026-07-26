/**
 * Mock points of interest — the WeCards and chests the brief describes.
 *
 * Stands in for a real POI service: the exercise is about the exploration layer,
 * not the collectible economy. What matters here is that each POI carries enough
 * identity (kind, rarity, name) for the map to treat them as distinct objects
 * rather than interchangeable dots.
 */
export const POI_KIND = {
  WeCard: "wecard",
  Chest: "chest",
} as const;

type PoiKind = (typeof POI_KIND)[keyof typeof POI_KIND];

export const POI_RARITY = {
  Common: "common",
  Rare: "rare",
  Legendary: "legendary",
} as const;

export type PoiRarity = (typeof POI_RARITY)[keyof typeof POI_RARITY];

export interface Poi {
  id: string;
  kind: PoiKind;
  rarity: PoiRarity;
  /** Display name, shown when the POI is opened. */
  name: string;
  lat: number;
  lng: number;
  collected: boolean;
}

interface PoiSeed {
  distanceM: number;
  bearingDeg: number;
  kind: PoiKind;
  rarity: PoiRarity;
  name: string;
}

/**
 * A fixed scatter rather than a random one: a reviewer opening the app twice
 * should see the same world, and a screenshot should be reproducible.
 */
const SEEDS: PoiSeed[] = [
  {
    distanceM: 160,
    bearingDeg: 20,
    kind: POI_KIND.WeCard,
    rarity: POI_RARITY.Common,
    name: "Carte du quartier",
  },
  {
    distanceM: 240,
    bearingDeg: 95,
    kind: POI_KIND.Chest,
    rarity: POI_RARITY.Rare,
    name: "Coffre du carrefour",
  },
  {
    distanceM: 300,
    bearingDeg: 160,
    kind: POI_KIND.WeCard,
    rarity: POI_RARITY.Legendary,
    name: "Carte légendaire",
  },
  {
    distanceM: 210,
    bearingDeg: 215,
    kind: POI_KIND.WeCard,
    rarity: POI_RARITY.Common,
    name: "Carte du square",
  },
  {
    distanceM: 360,
    bearingDeg: 275,
    kind: POI_KIND.Chest,
    rarity: POI_RARITY.Common,
    name: "Petit coffre",
  },
  {
    distanceM: 180,
    bearingDeg: 330,
    kind: POI_KIND.WeCard,
    rarity: POI_RARITY.Rare,
    name: "Carte rare",
  },
  {
    distanceM: 480,
    bearingDeg: 45,
    kind: POI_KIND.Chest,
    rarity: POI_RARITY.Legendary,
    name: "Grand coffre",
  },
  {
    distanceM: 520,
    bearingDeg: 190,
    kind: POI_KIND.WeCard,
    rarity: POI_RARITY.Common,
    name: "Carte de l'avenue",
  },
];

const METERS_PER_DEGREE_LAT = 111320;

/** Scatter POIs around a centre using the local flat-earth approximation. */
export function generatePoisAround(lat: number, lng: number): Poi[] {
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180);

  return SEEDS.map((seed, index) => {
    const rad = (seed.bearingDeg * Math.PI) / 180;
    const dLat = (seed.distanceM * Math.cos(rad)) / METERS_PER_DEGREE_LAT;
    const dLng = (seed.distanceM * Math.sin(rad)) / Math.max(metersPerDegreeLng, 1e-9);
    return {
      id: `poi-${index}`,
      kind: seed.kind,
      rarity: seed.rarity,
      name: seed.name,
      lat: lat + dLat,
      lng: lng + dLng,
      collected: false,
    };
  });
}
