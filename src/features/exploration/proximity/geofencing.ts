import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { haversineMeters } from "@/utils/geo-scale";
import { isExpoGo } from "@/utils/is-expo-go";

import { GEOFENCE_TASK, getExplorationConfig } from "../config/exploration.config";
import type { Poi } from "../data/mock-pois";

import { notificationCopy } from "./notification-copy";
import { notifyNearbyPoi } from "./proximity-notifications";

/**
 * OS-level geofencing around the nearest uncollected POIs. The system monitors
 * the regions (battery ~0 vs continuous distance polling); iOS caps at ~20
 * regions, so we monitor only the nearest N (AD-9).
 */
const REGION_RADIUS_M = 90;

interface GeofenceEvent {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

// Not registered in Expo Go — geofence events are delivered through TaskManager
// background execution, which Expo Go does not provide (see AD-11).
if (!isExpoGo()) {
  TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
    if (error) return;
    const { eventType } = (data ?? {}) as GeofenceEvent;
    if (eventType === Location.GeofencingEventType.Enter) {
      const copy = notificationCopy();
      await notifyNearbyPoi(copy.nearbyTitle, copy.nearbyBody);
    }
  });
}

/**
 * Why geofences cannot be armed, when they cannot.
 *
 * Two causes, and telling someone the wrong one is worse than saying nothing:
 * "grant Always" sends a person into Settings to toggle something that will
 * change nothing, because Expo Go has no background execution at all. What is
 * fixable and what is not are different messages.
 */
export const GEOFENCE_BLOCK = {
  None: "none",
  /** Expo Go: no TaskManager background execution, so no region can be watched. */
  Runtime: "runtime",
  /** A build that can do it, but the "Always" grant is missing. */
  Permission: "permission",
} as const;

export type GeofenceBlock = (typeof GEOFENCE_BLOCK)[keyof typeof GEOFENCE_BLOCK];

/**
 * What, if anything, stands between the user and armed geofences.
 *
 * Geofencing is a BACKGROUND location capability: `startGeofencingAsync` throws
 * without the "Always" grant, on both platforms. Checking notification
 * permission instead — which the toggle used to do — produces the exact state
 * this feature exists to avoid: a lit switch, a persisted opt-in, and not one
 * region armed.
 */
export async function geofenceBlocker(): Promise<GeofenceBlock> {
  if (isExpoGo()) return GEOFENCE_BLOCK.Runtime;
  const { granted } = await Location.getBackgroundPermissionsAsync().catch(() => ({
    granted: false,
  }));
  return granted ? GEOFENCE_BLOCK.None : GEOFENCE_BLOCK.Permission;
}

/**
 * (Re)monitor the nearest uncollected POIs. Opt-in; no-op in Expo Go.
 *
 * Returns what blocked it, if anything, so the caller can tell the user the
 * truth rather than assume success. Every OS call is guarded: this runs from
 * an effect on every position change, so one unguarded rejection is not a single
 * error but an unhandled rejection on a loop.
 */
export async function syncGeofences(
  pois: Poi[],
  center: { lat: number; lng: number },
): Promise<GeofenceBlock> {
  const blocker = await geofenceBlocker();
  if (blocker !== GEOFENCE_BLOCK.None) return blocker;
  const cfg = getExplorationConfig();
  const nearest = pois
    .filter((poi) => !poi.collected)
    .sort((a, b) => haversineMeters(center, a) - haversineMeters(center, b))
    .slice(0, cfg.geofenceMax);

  const regions: Location.LocationRegion[] = nearest.map((poi) => ({
    identifier: poi.id,
    latitude: poi.lat,
    longitude: poi.lng,
    radius: REGION_RADIUS_M,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));

  const running = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false);
  if (running) await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => undefined);
  if (regions.length === 0) return GEOFENCE_BLOCK.None;

  try {
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
    return GEOFENCE_BLOCK.None;
  } catch {
    // "Always" was revoked between the check and the call, or the platform
    // refused the region set. Silence here is correct; the caller reports it.
    return GEOFENCE_BLOCK.Permission;
  }
}

export async function stopGeofences(): Promise<void> {
  const running = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false);
  if (running) await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => undefined);
}
