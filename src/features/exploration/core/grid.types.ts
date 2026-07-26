/**
 * Spatial primitives for the exploration grid.
 *
 * The exploration state is a set of H3 cells (Uber's hexagonal hierarchical
 * index). We never store raw GPS — only the coarse cells a walk touched. See
 * AD-1 in docs/2026-07-24-fogline-design.md.
 */

/** An H3 cell index (base-16 string, e.g. "8a1fb46622dffff"). */
export type H3Index = string;

/** A single location reading reduced to what the grid needs. */
export interface GpsFix {
  lat: number;
  lng: number;
  /** Horizontal accuracy radius in meters (from the OS location fix). */
  accuracyM: number;
}

/**
 * GeoJSON MultiPolygon coordinate array: polygons → rings → [lng, lat] points.
 * This is what `dissolveToMultiPolygon` returns and what the map renderer
 * consumes as the "explored" holes cut out of the fog.
 */
export type MultiPolygonCoords = number[][][][];
