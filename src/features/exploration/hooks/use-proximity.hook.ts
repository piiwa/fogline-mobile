import { useCallback, useEffect, useState } from "react";

import { getBool, mmkvKeys, setBool } from "@/storage/mmkv";

import type { Poi } from "../data/mock-pois";
import type { PermMode } from "../engine/permission.types";
import {
  GEOFENCE_BLOCK,
  geofenceBlocker,
  stopGeofences,
  syncGeofences,
  type GeofenceBlock,
} from "../proximity/geofencing";
import { ensureNotificationPermission } from "../proximity/proximity-notifications";

export interface UseProximity {
  enabled: boolean;
  /** Alerts are on but undeliverable — notifications were declined. */
  needsNotificationPermission: boolean;
  /** Why alerts are on but unarmable, if they are. */
  blocker: GeofenceBlock;
  toggle: () => Promise<void>;
}

/**
 * Opt-in POI proximity alerts.
 *
 * Requires the "Always" grant, not merely notifications: geofencing is a
 * background capability and `startGeofencingAsync` throws without it.
 *
 * The centre is taken as two primitives rather than an object: an object literal
 * from the caller gets a new identity on every render, which would re-run the
 * effect and tear down/re-register every OS geofence each time the map
 * re-renders — a native-API thrash loop in the one subsystem whose whole
 * justification is battery cost.
 */
export function useProximity(
  pois: Poi[],
  centerLat: number,
  centerLng: number,
  mode: PermMode,
): UseProximity {
  const [enabled, setEnabled] = useState<boolean>(() => getBool(mmkvKeys.proximityOptIn));
  const [needsNotificationPermission, setNeedsNotificationPermission] = useState(false);
  const [blocker, setBlocker] = useState<GeofenceBlock>(GEOFENCE_BLOCK.None);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    // `mode` is a dependency because the grant can be REVOKED from Settings
    // while the app runs. Without it the switch would stay lit against regions
    // the OS has already dropped.
    void syncGeofences(pois, { lat: centerLat, lng: centerLng }).then((reason) => {
      if (active) setBlocker(reason);
    });
    return () => {
      active = false;
    };
  }, [enabled, pois, centerLat, centerLng, mode]);

  const toggle = useCallback(async () => {
    if (enabled) {
      setEnabled(false);
      setBool(mmkvKeys.proximityOptIn, false);
      setNeedsNotificationPermission(false);
      setBlocker(GEOFENCE_BLOCK.None);
      await stopGeofences();
      return;
    }

    // Alerts need BOTH: permission to deliver them, and the background location
    // grant that lets the OS watch the regions at all. Checking only the first
    // is what produced a lit switch with nothing armed behind it.
    const canDeliver = await ensureNotificationPermission();
    setNeedsNotificationPermission(!canDeliver);
    if (!canDeliver) return;

    setBlocker(await geofenceBlocker());

    // The opt-in is still recorded when regions cannot be armed yet: the intent
    // is real, the capability is not. Granting "Always" later arms it without
    // asking again, and the banner says so meanwhile.
    setEnabled(true);
    setBool(mmkvKeys.proximityOptIn, true);
  }, [enabled]);

  return { enabled, needsNotificationPermission, blocker, toggle };
}
