import { useEffect, useState } from "react";
import { Polygon } from "react-native-maps";

import type { FogRing, LatLng } from "../fog-geometry";

/**
 * The mist: ONE polygon covering the visible map, with walked ground punched out.
 *
 * Three native behaviours shape this component, each verified in
 * `AIRMapPolygon.m` rather than assumed:
 *
 * 1. `strokeColor` is always set explicitly. `MapPolygon.js` destructures
 *    `{ strokeColor = '#000' }`, so omitting it yields BLACK, and MapKit strokes
 *    even at `lineWidth = 0`.
 *
 * 2. The ring is sized to the VIEWPORT, not the world. A polygon spanning ±180°
 *    never renders its fill on Apple Maps, which leaves the map fully visible
 *    and the mist invisible.
 *
 * 3. `setHoles:` stores the interior polygons and returns WITHOUT rebuilding the
 *    polygon; only `setCoordinates:` consumes them. Props within one commit are
 *    applied by `NSDictionary` enumeration, whose order is unspecified — so
 *    setting both together is a coin flip, and losing it yields a solid mist
 *    with no holes at all. `useTwoPhaseHoles` removes the coin flip.
 */
const FOG_FILL = "rgba(139, 124, 226, 0.55)";

/**
 * The frontier is this polygon's OWN stroke.
 *
 * MapKit strokes every ring of a polygon, holes included, so the outline of
 * walked ground comes free with the mist itself. That removed a whole separate
 * layer of polylines — and with it the draw-order problem that layer created,
 * since one overlay cannot be painted over itself.
 *
 * The world-sized outer ring is stroked too, but it sits far outside the
 * viewport by construction, so it is never seen.
 */
const FRONTIER_STROKE = "rgba(255, 255, 255, 0.92)";
const FRONTIER_WIDTH = 3;

/** Far below map resolution — only there to make the second commit distinct. */
const NUDGE_DEG = 1e-7;

/**
 * Guarantee that `setCoordinates:` runs AFTER `setHoles:`.
 *
 * The two cannot be ordered within one commit, so they are split across two:
 * the first carries the new holes, the second changes `coordinates` by an
 * imperceptible amount. React commits them separately, so the second
 * `setCoordinates:` is guaranteed to see the interior polygons stored by the
 * first, and rebuilds the polygon with them.
 */
function useTwoPhaseHoles(revision: number): boolean {
  const [nudgedFor, setNudgedFor] = useState<number | null>(null);

  useEffect(() => {
    setNudgedFor(revision);
  }, [revision]);

  return nudgedFor === revision;
}

export interface FogLayerProps {
  /** The rectangle the mist covers — built from the camera by the caller, so
   *  that the holes can be clipped against the very same rectangle. */
  ring: FogRing;
  /** Walked ground, cut out of the mist. */
  holes: LatLng[][];
  /** Changes when the explored geometry changes. */
  revision: number;
}

export function FogLayer({ ring, holes, revision }: FogLayerProps) {
  const offset = useTwoPhaseHoles(revision) ? NUDGE_DEG : 0;

  const coordinates = ring.coordinates.map((point) => ({
    latitude: point.latitude + offset,
    longitude: point.longitude,
  }));

  return (
    <Polygon
      coordinates={coordinates}
      holes={holes}
      fillColor={FOG_FILL}
      strokeColor={FRONTIER_STROKE}
      strokeWidth={FRONTIER_WIDTH}
    />
  );
}
