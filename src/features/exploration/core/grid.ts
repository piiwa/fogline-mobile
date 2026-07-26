import { cellsToMultiPolygon, gridDisk, isValidCell, latLngToCell } from "h3-js";

import type { GpsFix, H3Index, MultiPolygonCoords } from "./grid.types";

/**
 * H3 grid — the single spatial encoding of exploration.
 *
 * Why H3 (see AD-1): hexagons tile the world without directional bias
 * (equidistant neighbours → clean reveal rings), dissolve into a smooth
 * frontier, and their hierarchy gives level-of-detail for free. The explored
 * state is `Set<H3Index>` — minimal, aggregated (no raw trace → GDPR by design),
 * monotone, and a conflict-free grow-only set for multi-device sync.
 *
 * This module is PURE (deterministic, no device deps) so it is unit-tested
 * without a simulator.
 */

/** Exploration cell resolution. Res 10 ≈ 66 m edge (~120 m across). */
const EXPLORATION_RES = 10;

/**
 * How wide the reveal can grow with GPS uncertainty (in cell rings). At res 10,
 * k=3 ≈ a ~450 m footprint — a hard ceiling so a garbage fix (accuracy 2 km)
 * never floods the map.
 */
const MAX_REVEAL_K = 3;

/**
 * Longitude past which a reveal is refused.
 *
 * A reveal disc near the antimeridian produces cells on both sides of the
 * ±180° seam. Neither renderer draws such a ring correctly, and the explored
 * set is permanent, so the damage would never age out.
 */
const ANTIMERIDIAN_GUARD_LNG = 179.5;

/**
 * Average H3 hexagon edge length in meters, per resolution. Hard-coded from the
 * H3 spec (rather than calling `getHexagonEdgeLengthAvg`) so the reveal geometry
 * is deterministic and version-stable.
 */
const AVG_EDGE_METERS: Record<number, number> = {
  7: 1220.63,
  8: 461.35,
  9: 174.38,
  10: 65.91,
  11: 24.91,
  12: 9.42,
};

function avgEdgeMeters(res: number): number {
  return AVG_EDGE_METERS[res] ?? AVG_EDGE_METERS[EXPLORATION_RES]!;
}

/**
 * Encode a lat/lng into its H3 cell. Deterministic.
 *
 * Returns `null` rather than throwing on unusable input. `latLngToCell` throws
 * on non-finite values, and this sits on the ingestion path of every GPS fix
 * and every POI — one bad reading should not take down the screen.
 */
export function cellForPoint(
  lat: number,
  lng: number,
  res: number = EXPLORATION_RES,
): H3Index | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  try {
    return latLngToCell(lat, lng, res);
  } catch {
    return null;
  }
}

/**
 * The cells a single fix reveals. We reveal the cells covered by the GPS
 * ACCURACY DISC, not just the point — honest reveal: a tight fix reveals only
 * the cell you stand in; a loose fix reveals the neighbourhood it could be in,
 * never more precisely than the sensor actually knows.
 */
export function revealCells(fix: GpsFix, res: number = EXPLORATION_RES): H3Index[] {
  // A cell whose neighbourhood straddles ±180° dissolves into a ring that spans
  // the globe the wrong way round, and because exploration never forgets, that
  // ring poisons every later render. Refusing the fix loses one reading; taking
  // it corrupts the map permanently.
  if (Math.abs(fix.lng) > ANTIMERIDIAN_GUARD_LNG) return [];

  const center = cellForPoint(fix.lat, fix.lng, res);
  if (center === null) return [];
  const edge = avgEdgeMeters(res);
  const k = Math.min(MAX_REVEAL_K, Math.max(0, Math.round(fix.accuracyM / edge)));
  return k === 0 ? [center] : gridDisk(center, k);
}

/**
 * Keep only well-formed H3 indices.
 *
 * A single malformed id — a corrupted row, a bad payload from a future server
 * version — makes `cellsToMultiPolygon` throw, and that throw happens while
 * rendering the map, so the screen dies and stays dead for as long as the value
 * remains in the store. Filtering at the boundary contains the blast radius to
 * the one bad cell.
 */
function keepValidCells(cells: H3Index[]): H3Index[] {
  return cells.filter((cell) => {
    try {
      return isValidCell(cell);
    } catch {
      return false;
    }
  });
}

/**
 * Dissolve a set of cells into GeoJSON MultiPolygon coordinates (outer rings +
 * holes). Adjacent cells merge into a single smooth boundary —
 * this is the fog frontier. Returns `[]` for an empty set.
 */
export function dissolveToMultiPolygon(cells: H3Index[]): MultiPolygonCoords {
  const valid = keepValidCells(cells);
  if (valid.length === 0) return [];
  return cellsToMultiPolygon(valid, true);
}

/**
 * Grow a cell set outward by `rings` hexagon rings (morphological dilation).
 *
 * Purely a function of the set, with no renderer involved, which is what makes
 * it testable without a device. Used to widen a reveal beyond the single cell
 * a fix lands in when GPS accuracy does not justify that much precision.
 */
export function dilate(cells: H3Index[], rings: number): H3Index[] {
  const valid = keepValidCells(cells);
  if (rings <= 0 || valid.length === 0) return [...new Set(valid)];
  const grown = new Set<H3Index>();
  for (const cell of valid) {
    for (const neighbour of gridDisk(cell, rings)) grown.add(neighbour);
  }
  return [...grown];
}
