import { cellForPoint } from "../core/grid";
import type { MultiPolygonCoords } from "../core/grid.types";
import { shapeRingWithin } from "../core/polygon-shaping";
import type { Poi } from "../data/mock-pois";

/** Chaikin passes — two is enough to read as a curve, four times the points. */
const SMOOTHING_PASSES = 2;

/**
 * Hard vertex budget per ring. This is a SAFETY bound.
 *
 * iOS copies every interior ring of a polygon into a STACK array
 * (`AIRMapPolygon.m`: `CLLocationCoordinate2D coords[holes[h].count]`) on the
 * main thread, which has roughly 1 MB. At 16 bytes per coordinate, a ring of
 * tens of thousands of points overflows the stack and kills the process with a
 * SIGSEGV — invisible to any JS error handling. A walk accumulates vertices for
 * the lifetime of the install, so without this bound the crash is a matter of
 * time, not of misuse.
 */
const MAX_POINTS_PER_RING = 1800;

/**
 * Ceiling on the NUMBER of holes, on top of the per-ring vertex budget.
 *
 * Ranked by EXTENT, not vertex count: counting points selects the most
 * fragmented outlines and discards the largest, so the main area someone walked
 * would be the first thing dropped.
 */
const MAX_HOLES = 60;

interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function boundsOf(ring: LatLng[]): Bounds {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const point of ring) {
    if (point.latitude < minLat) minLat = point.latitude;
    if (point.latitude > maxLat) maxLat = point.latitude;
    if (point.longitude < minLng) minLng = point.longitude;
    if (point.longitude > maxLng) maxLng = point.longitude;
  }
  return { minLat, maxLat, minLng, maxLng };
}

/** Bounding-box diagonal, in degrees — a cheap proxy for "how big on screen". */
function ringExtent(ring: LatLng[]): number {
  const b = boundsOf(ring);
  return Math.hypot(b.maxLat - b.minLat, b.maxLng - b.minLng);
}

function overlaps(a: Bounds, b: Bounds): boolean {
  return (
    a.minLat <= b.maxLat && a.maxLat >= b.minLat && a.minLng <= b.maxLng && a.maxLng >= b.minLng
  );
}

/** A coordinate in the shape the native renderer expects. */
export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * How far beyond the visible region the mist extends, as a multiple of the
 * region's own span. Generous enough that a pan or a pinch does not expose an
 * unfogged edge before the camera settles and the ring is rebuilt.
 */
const FOG_OVERSCAN = 3;

/** Valid WGS84 bounds, kept a hair inside so no coordinate ever sits on the edge. */
const MAX_LAT = 85;
const MAX_LNG = 179.9;
/** Floor on the camera span, so a fully zoomed-in map still yields a real quad. */
const MIN_SPAN = 0.001;

function clamp(value: number, max: number, min: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface FogRing {
  coordinates: LatLng[];
}

/**
 * A rectangle covering the visible map, oversized.
 *
 * NOT a world-spanning ring: Apple Maps does not render the fill of a polygon
 * that spans the globe, which leaves the map entirely visible and the fog
 * invisible. Sizing the ring to the camera keeps every coordinate within the
 * range MapKit draws reliably.
 */
export function buildFogRing(region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}): FogRing {
  // Every coordinate handed to the native renderer must be finite and inside
  // the valid WGS84 range. A NaN or an out-of-range longitude is not a visual
  // glitch — MapKit rejects the overlay and takes the app down with it, which
  // is reachable simply by zooming out far enough for the overscan to push
  // longitude past 180°.
  const safe = (value: number, fallback: number): number =>
    Number.isFinite(value) ? value : fallback;

  const centerLat = clamp(safe(region.latitude, 0), MAX_LAT, -MAX_LAT);
  const centerLng = clamp(safe(region.longitude, 0), MAX_LNG, -MAX_LNG);
  const latPad = Math.max(safe(region.latitudeDelta, MIN_SPAN), MIN_SPAN) * FOG_OVERSCAN;
  const lngPad = Math.max(safe(region.longitudeDelta, MIN_SPAN), MIN_SPAN) * FOG_OVERSCAN;

  const north = clamp(centerLat + latPad, MAX_LAT, -MAX_LAT);
  const south = clamp(centerLat - latPad, MAX_LAT, -MAX_LAT);
  const east = clamp(centerLng + lngPad, MAX_LNG, -MAX_LNG);
  const west = clamp(centerLng - lngPad, MAX_LNG, -MAX_LNG);

  return {
    coordinates: [
      { latitude: south, longitude: west },
      { latitude: south, longitude: east },
      { latitude: north, longitude: east },
      { latitude: north, longitude: west },
    ],
  };
}

/**
 * GeoJSON coord rings ([lng, lat]) → renderer `LatLng` rings, simplified and
 * corner-cut on the way so the frontier reads as a curve rather than a chain of
 * hexagons, and carries far fewer vertices into the native overlay.
 */
function toLatLngRings(multiPolygon: MultiPolygonCoords): LatLng[][] {
  const rings: LatLng[][] = [];
  for (const polygon of multiPolygon) {
    // Only the outer ring. A dissolved polygon may also carry inner rings — an
    // unexplored pocket entirely surrounded by walked ground — and those are
    // dropped, so such a pocket renders as revealed.
    //
    // Not an oversight but a library ceiling: `Polygon.holes` is a FLAT list of
    // rings, all of them holes of the one outer ring, so there is no way to
    // express a hole inside a hole. MapKit itself supports it via nested
    // interior polygons; reaching it would mean a native module, which is well
    // outside this exercise. Recorded in DECISIONS.md (AD-6).
    const outer = polygon[0];
    if (!outer) continue;

    const shaped = shapeRingWithin(outer, MAX_POINTS_PER_RING, SMOOTHING_PASSES);
    const ring: LatLng[] = [];
    for (const point of shaped) {
      const lng = point[0];
      const lat = point[1];
      if (typeof lng === "number" && typeof lat === "number") {
        ring.push({ latitude: lat, longitude: lng });
      }
    }
    // A polygon hole needs at least 3 points to be valid on both platforms.
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

/**
 * Walked ground as polygon rings, ready to be punched out of the mist.
 *
 * Takes the ALREADY dissolved outline. Dissolving from the cells again here
 * would run a second full H3 pass and a second shaping pass over the entire
 * lifetime set on every accepted fix — the same work the caller has already
 * paid for.
 *
 * Deliberately ONE outline, not a stack of dilated bands. Bands were an attempt
 * at a feathered edge, but each step is a whole H3 ring — roughly 120 m — so on
 * a small explored area the "gradient" spanned several times the area itself and
 * read as tree rings. A single clean edge with a glowing frontier line is both
 * truer to the data and far better looking.
 */
export function buildExploredHoles(explored: MultiPolygonCoords, ring: FogRing): LatLng[][] {
  const outer = boundsOf(ring.coordinates);
  // A hole lying entirely OUTSIDE its own outer ring is not a hole. MapKit
  // resolves the polygon with an even-odd rule, so such a ring is FILLED rather
  // than pierced: walked ground turns opaque while the unknown world stays
  // clear — the feature rendered exactly backwards. This is reachable simply by
  // panning away from explored territory, so the filter is correctness, not an
  // optimisation. (It happens to save the native renderer a lot of work too.)
  const visible = toLatLngRings(explored).filter((candidate) =>
    overlaps(boundsOf(candidate), outer),
  );
  if (visible.length <= MAX_HOLES) return visible;
  return [...visible].sort((a, b) => ringExtent(b) - ringExtent(a)).slice(0, MAX_HOLES);
}

export interface PoiMarker extends Poi {
  discovered: boolean;
}

/** Tag each POI with whether it sits on explored ground (drives its styling). */
export function decoratePois(pois: Poi[], exploredCells: Set<string>): PoiMarker[] {
  return pois.map((poi) => {
    const cell = cellForPoint(poi.lat, poi.lng);
    return { ...poi, discovered: cell !== null && exploredCells.has(cell) };
  });
}
