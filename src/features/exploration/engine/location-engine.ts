import * as Location from "expo-location";
import { Platform } from "react-native";
import * as TaskManager from "expo-task-manager";

import { isExpoGo } from "@/utils/is-expo-go";

import { BACKGROUND_LOCATION_TASK, getExplorationConfig } from "../config/exploration.config";
import { revealCells } from "../core/grid";
import type { LocationSample } from "../core/motion-filter";
import { getExplorationStore } from "../data/exploration.database";
import { notificationCopy } from "../proximity/notification-copy";
import { syncNow } from "../sync/sync-service";

import { readLastFix, writeLastFix } from "./last-fix-store";
import { processFix } from "./location-processor";
import {
  getHistoricalSteps,
  isStepCounterActive,
  readCumulativeSteps,
  startStepCounter,
  stopStepCounter,
} from "./pedometer";

/**
 * Location engine (imperative shell). Sources fixes (foreground watcher +
 * background task), sources steps (pedometer), runs each through the PURE
 * `processFix`, persists revealed cells, notifies the renderer, and kicks a
 * best-effort sync. See AD-3.
 */

type RevealListener = (cells: string[]) => void;
const listeners = new Set<RevealListener>();

type FixListener = (sample: LocationSample) => void;
const fixListeners = new Set<FixListener>();

/**
 * Subscribe to EVERY fix, accepted or rejected.
 *
 * Distinct from `onCellsRevealed` on purpose: the walker's marker has to follow
 * them even while the motion filter is refusing to reveal ground. Someone on a
 * train is rejected by design, and if the marker only moved on acceptance they
 * would watch it sit still hundreds of kilometres behind them. Where you ARE and
 * what you have EARNED are two different questions.
 */
export function onLocationFix(cb: FixListener): () => void {
  fixListeners.add(cb);
  return () => {
    fixListeners.delete(cb);
  };
}

function emitFix(sample: LocationSample): void {
  for (const listener of fixListeners) listener(sample);
}

/** Subscribe to newly-revealed cells (for the reveal animation + HUD). */
export function onCellsRevealed(cb: RevealListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Notify subscribers that ground was revealed. Exported so the demo mode can
 * drive the same reveal feedback without going through the location pipeline.
 */
export function emitRevealed(cells: string[]): void {
  for (const listener of listeners) listener(cells);
}

/**
 * Normalise the OS speed, whose "unknown" value differs by platform.
 *
 * iOS returns a NEGATIVE speed when it has none, so zero there genuinely means
 * standing still. Android has no such sentinel: `LocationResults.kt` reads
 * `location.speed` without consulting `hasSpeed()`, and the platform returns
 * `0.0f` both for "not moving" and for "no speed available" — which is common
 * under balanced accuracy.
 *
 * Reporting that ambiguous zero as a real speed is not a rounding issue, it is
 * a hole in the walking rule: with steps also unknown in the Android background,
 * a zero speed clears the speed guard and a car ride reveals the motorway.
 * Treating it as UNKNOWN instead makes the filter fall back to displacement over
 * elapsed time, which no vehicle can fake.
 */
function normalizeSpeed(raw: number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw < 0) return null;
  if (raw === 0 && Platform.OS === "android") return null;
  return raw;
}

function toSample(loc: Location.LocationObject): LocationSample {
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracyM: loc.coords.accuracy ?? 50,
    speedMps: normalizeSpeed(loc.coords.speed),
    timestampMs: loc.timestamp,
  };
}

/** Core ingestion path shared by the foreground watcher and the background task. */
async function ingest(sample: LocationSample, stepsSinceLast: number | null): Promise<boolean> {
  const last = readLastFix();
  const result = processFix(sample, last, stepsSinceLast);
  if (!result.accepted) return false;

  writeLastFix(result.nextLastFix);
  const store = await getExplorationStore();
  const { added } = await store.addCells(result.cells);
  if (added.length > 0) {
    emitRevealed(added);
    void syncNow();
  }
  return true;
}

// ─── Foreground (app open, real-time) ────────────────────────────────────────

let _fgSub: Location.LocationSubscription | null = null;
/** Whether tracking is currently wanted — see the pending-subscription check. */
let _fgWanted = false;
/**
 * Cumulative step count as of the last ACCEPTED fix. `null` until the pedometer
 * has actually reported — before that, zero would be indistinguishable from
 * "stood still", which the motion filter reads as grounds for rejection.
 */
let _stepsAtLastAccepted: number | null = null;

/**
 * Guards against a second watcher being started while the first is still being
 * awaited.
 *
 * `watchPositionAsync` is async, so checking `_fgSub` before awaiting it is a
 * time-of-check/time-of-use race: two calls in the same tick both see `null`,
 * both subscribe, and only the second handle is ever stored — the first watcher
 * runs forever with no way to remove it, draining the battery the whole design
 * is built to protect.
 */
let _fgStarting = false;

export async function startForegroundTracking(): Promise<void> {
  // Foreground location IS available in Expo Go — only BACKGROUND execution is
  // not. Guarding this on `isExpoGo` would silently disable the whole feature in
  // the very runtime the reviewer uses.
  _fgWanted = true;
  if (_fgSub || _fgStarting) return;
  _fgStarting = true;
  startStepCounter();
  _stepsAtLastAccepted = null;
  const cfg = getExplorationConfig();
  _fgSub = await Location.watchPositionAsync(
    { accuracy: cfg.locationAccuracy, distanceInterval: cfg.distanceIntervalM, timeInterval: 5000 },
    (loc) => {
      // Steps must be counted over the SAME window as the distance the motion
      // filter compares them against — i.e. since the last ACCEPTED fix, not
      // since the last callback. Advancing this baseline on every callback
      // measures the two halves of the ratio over different windows, which
      // latches the filter into permanent rejection.
      //
      // `null` (no pedometer, or none reported yet) means "unknown", which the
      // filter answers with speed-only gating — never "zero steps".
      const sample = toSample(loc);
      // Before the filter runs: position is reported even when reveal is not.
      emitFix(sample);

      const cumulative = isStepCounterActive() ? readCumulativeSteps() : null;
      const stepsDelta =
        cumulative !== null && _stepsAtLastAccepted !== null
          ? Math.max(0, cumulative - _stepsAtLastAccepted)
          : null;

      void ingest(sample, stepsDelta).then((accepted) => {
        if (accepted) _stepsAtLastAccepted = cumulative;
      });
    },
  ).finally(() => {
    _fgStarting = false;
  });

  // `stopForegroundTracking` may have run while the subscription was pending;
  // honour it rather than leaving an orphan watcher behind.
  if (!_fgWanted) {
    _fgSub?.remove();
    _fgSub = null;
    stopStepCounter();
  }
}

export function stopForegroundTracking(): void {
  _fgWanted = false;
  _fgSub?.remove();
  _fgSub = null;
  _stepsAtLastAccepted = null;
  stopStepCounter();
}

/**
 * Reveal the ground the walker is currently standing on.
 *
 * Arriving on a map that is 100% fog reads as a failed render, not as an
 * invitation: there is no landmark, no scale, and no proof the layer works. You
 * can see where you are standing, so the app grants that much and asks you to
 * walk for the rest. It also seeds the motion filter's reference point, which
 * otherwise only exists after the first accepted fix.
 *
 * Idempotent by construction — the explored set is a grow-only union (AD-5).
 */
export async function seedCurrentPosition(sample: LocationSample): Promise<void> {
  const cells = revealCells({ lat: sample.lat, lng: sample.lng, accuracyM: sample.accuracyM });
  if (cells.length === 0) return;
  const store = await getExplorationStore();
  const { added } = await store.addCells(cells);
  if (added.length > 0) {
    emitRevealed(added);
    void syncNow();
  }
}

/** One-shot position for centring the map. `null` on failure. */
export async function getCurrentPositionOnce(): Promise<LocationSample | null> {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: getExplorationConfig().locationAccuracy,
    });
    return toSample(loc);
  } catch {
    return null;
  }
}

// ─── Background (app closed) ──────────────────────────────────────────────────

// Registered at module load so the OS can hand work to it after a cold relaunch.
// Skipped in Expo Go: TaskManager is unavailable on Android there and never
// executes in the background on iOS, so registering would either throw or
// silently promise a capability we don't have (see AD-11).
if (!isExpoGo()) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) return;
    const locations = (data as { locations?: Location.LocationObject[] } | null)?.locations ?? [];
    for (const loc of locations) {
      const sample = toSample(loc);
      const last = readLastFix();
      const steps = last
        ? await getHistoricalSteps(new Date(last.timestampMs), new Date(sample.timestampMs))
        : null;
      await ingest(sample, steps);
    }
  });
}

/**
 * True when background reveal is actually possible on this runtime. Expo Go can
 * do foreground exploration only — the app degrades to reduced mode there, the
 * same graceful path as a user who declined "Always".
 */
export function isBackgroundTrackingSupported(): boolean {
  return !isExpoGo();
}

export async function startBackgroundTracking(): Promise<void> {
  if (isExpoGo()) return;
  const cfg = getExplorationConfig();
  const already = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
    () => false,
  );
  if (already) return;
  const copy = notificationCopy();
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: cfg.locationAccuracy,
    distanceInterval: cfg.distanceIntervalM,
    deferredUpdatesInterval: cfg.deferredUpdatesMs,
    pausesUpdatesAutomatically: true,
    activityType: Location.ActivityType.Fitness,
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: copy.foregroundTitle,
      notificationBody: copy.foregroundBody,
    },
  });
}

export async function stopBackgroundTracking(): Promise<void> {
  const already = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
    () => false,
  );
  if (already) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}
