import { useEffect, useRef, useState } from "react";

import type { LocationSample } from "../core/motion-filter";
import {
  getCurrentPositionOnce,
  onLocationFix,
  seedCurrentPosition,
} from "../engine/location-engine";

/**
 * `locating` is the honest state before the first fix: not an error, not a
 * position, and NOT a reason to render a map centred on a guess.
 */
export const FIX_STATUS = {
  Locating: "locating",
  Ready: "ready",
  Unavailable: "unavailable",
} as const;

type FixStatus = (typeof FIX_STATUS)[keyof typeof FIX_STATUS];

export interface LivePosition {
  /** Latest known position as [lng, lat], or `null` until the first fix. */
  coords: [number, number] | null;
  /** The FIRST fix of the session, which anchors the POI scatter. */
  anchor: LocationSample | null;
  status: FixStatus;
}

/**
 * How long to wait for a first fix before opening the map anyway.
 *
 * A cold GPS start indoors can take a while, and a walker who opens the app in
 * a basement should still get a usable map rather than a spinner forever.
 */
const FIRST_FIX_TIMEOUT_MS = 10_000;

/**
 * Where the walker is, right now.
 *
 * Two values rather than one, because they answer different questions and
 * change at different rates. `coords` follows every fix so the marker tracks
 * the walker; `anchor` is frozen at the first fix so the POI scatter stays
 * put. Regenerating collectibles on each fix would make them swim along with
 * the walker and never be reachable.
 *
 * The first fix also seeds the explored set, so the map opens with the ground
 * underfoot already revealed instead of a featureless wall of fog.
 */
export function useLivePosition(): LivePosition {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [anchor, setAnchor] = useState<LocationSample | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const seeded = useRef(false);

  // Adopting a fix is identical whatever produced it, so both sources go
  // through here. Seeding on the ONE-SHOT read alone would be fragile: that
  // call routinely times out indoors or on a moving train, and the walker would
  // then land on a wall of fog with no way out of it.
  const adopt = useRef((fix: LocationSample): void => {
    setCoords([fix.lng, fix.lat]);
    setAnchor((previous) => previous ?? fix);
    if (seeded.current) return;
    seeded.current = true;
    void seedCurrentPosition(fix);
  }).current;

  useEffect(() => {
    let active = true;
    void (async () => {
      const fix = await getCurrentPositionOnce();
      // The screen may already be gone; writing state then is a stale write.
      if (!active || !fix) return;
      adopt(fix);
    })();
    return () => {
      active = false;
    };
  }, [adopt]);

  useEffect(() => onLocationFix(adopt), [adopt]);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FIRST_FIX_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const status: FixStatus =
    coords !== null ? FIX_STATUS.Ready : timedOut ? FIX_STATUS.Unavailable : FIX_STATUS.Locating;

  return { coords, anchor, status };
}
