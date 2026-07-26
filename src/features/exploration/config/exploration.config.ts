import { Accuracy } from "expo-location";

/**
 * Tunable constants for the exploration engine, behind a lazy getter so nothing
 * is read at module load. These encode the battery ↔ precision trade-off (AD-3):
 * coarse cells → coarse location → low power.
 */
export interface ExplorationConfig {
  /** Location accuracy for foreground and background updates. */
  locationAccuracy: Accuracy;
  /** Minimum distance (m) between accepted location updates. */
  distanceIntervalM: number;
  /** Deferred-updates window (ms) — lets the OS batch background wakeups. */
  deferredUpdatesMs: number;
  /** Maximum cells pushed per sync request. */
  syncBatchSize: number;
  /** Maximum geofence regions monitored at once (iOS caps around 20). */
  geofenceMax: number;
}

/**
 * Background task identifiers.
 *
 * The OS keys persisted background work off these strings, so they must be
 * declared exactly once: a rename that misses one copy leaves the previous task
 * registered and running with no code left to stop it.
 */
export const BACKGROUND_LOCATION_TASK = "fogline-background-location";
export const GEOFENCE_TASK = "fogline-geofence";

let _config: ExplorationConfig | null = null;

export function getExplorationConfig(): ExplorationConfig {
  if (_config === null) {
    _config = Object.freeze({
      locationAccuracy: Accuracy.Balanced,
      distanceIntervalM: 40,
      deferredUpdatesMs: 30_000,
      syncBatchSize: 500,
      geofenceMax: 18,
    });
  }
  return _config;
}
