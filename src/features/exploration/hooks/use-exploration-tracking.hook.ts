import { useCallback, useEffect, useState } from "react";

import { mmkv, mmkvKeys } from "@/storage/mmkv";

import {
  startBackgroundTracking,
  startForegroundTracking,
  stopBackgroundTracking,
  stopForegroundTracking,
} from "../engine/location-engine";
import { PERM_MODE, type PermMode } from "../engine/permission.types";

/**
 * Drives the location engine from the current permission mode + a user
 * pause toggle. Tracking runs whenever location is usable and the user hasn't
 * paused; background updates only start in `full` mode. Reduced/denied modes
 * automatically fall back to foreground-only / off (graceful degradation).
 */
export function useExplorationTracking(mode: PermMode): {
  isTracking: boolean;
  toggle: () => void;
} {
  const usable = mode === PERM_MODE.Full || mode === PERM_MODE.Reduced;
  const [paused, setPaused] = useState<boolean>(
    () => mmkv.getString(mmkvKeys.trackingEnabled) === "paused",
  );

  const isTracking = usable && !paused;

  useEffect(() => {
    // A run token: the effect is async, so a re-run can otherwise interleave
    // with the previous one and leave the engine in the state the STALE run
    // wanted. Only the latest run is allowed to act.
    let current = true;

    void (async () => {
      if (!isTracking) {
        stopForegroundTracking();
        await stopBackgroundTracking();
        return;
      }

      await startForegroundTracking();
      if (!current) return;

      // Background updates are torn down whenever the mode is no longer Full —
      // not only when tracking stops entirely. Revoking "Always" in Settings
      // moves Full → Reduced while tracking stays on, and without this the
      // registered background task would keep running against a permission the
      // user has just taken away.
      if (mode === PERM_MODE.Full) {
        await startBackgroundTracking();
      } else {
        await stopBackgroundTracking();
      }
    })();

    return () => {
      current = false;
    };
  }, [isTracking, mode]);

  const toggle = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      mmkv.set(mmkvKeys.trackingEnabled, next ? "paused" : "active");
      return next;
    });
  }, []);

  return { isTracking, toggle };
}
