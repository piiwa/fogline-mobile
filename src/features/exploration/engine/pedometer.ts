import * as Device from "expo-device";
import { Pedometer } from "expo-sensors";
import { Platform } from "react-native";

/**
 * Pedometer access — the ground-truth "on foot" signal (AD-2). Two paths:
 * - FOREGROUND (both platforms): a live cumulative counter; the engine reads the
 *   delta between fixes.
 * - BACKGROUND (iOS only): a historical step query for a past window. Android
 *   has no historical query → returns `null`, and the motion filter falls back
 *   to speed-only gating.
 *
 * Everything degrades to a safe default (0 / null / no-op) in Expo Go, on
 * simulators, or when the sensor is unavailable.
 */
let _watch: Pedometer.Subscription | null = null;
let _cumulative = 0;
let _active = false;

/** Start the live cumulative counter (foreground). Idempotent. */
export function startStepCounter(): void {
  // Works in Expo Go; simply absent on simulators (no CoreMotion hardware).
  if (_watch || !Device.isDevice) return;
  try {
    _watch = Pedometer.watchStepCount((result) => {
      _cumulative = result.steps;
    });
    _active = true;
  } catch {
    _watch = null;
    _active = false;
  }
}

export function stopStepCounter(): void {
  _watch?.remove();
  _watch = null;
  _cumulative = 0;
  _active = false;
}

/** Steps observed since `startStepCounter` (cumulative within the session). */
export function readCumulativeSteps(): number {
  return _cumulative;
}

/**
 * Whether a real step counter is running. False on simulators / in Expo Go / on
 * devices without a pedometer — the engine then reports steps as `null` so the
 * motion filter uses its speed-only fallback instead of wrongly seeing "0 steps".
 */
export function isStepCounterActive(): boolean {
  return _active;
}

/** Historical steps in a past window (iOS only). `null` when unsupported. */
export async function getHistoricalSteps(start: Date, end: Date): Promise<number | null> {
  if (Platform.OS !== "ios" || !Device.isDevice) return null;
  try {
    if (!(await Pedometer.isAvailableAsync())) return null;
    const result = await Pedometer.getStepCountAsync(start, end);
    return result?.steps ?? null;
  } catch {
    return null;
  }
}
