import { haversineMeters } from "@/utils/geo-scale";

import { revealCells } from "../core/grid";
import type { H3Index } from "../core/grid.types";
import { classifyMotion, MOTION_REASON } from "../core/motion-filter";
import type { LocationSample, MotionReason } from "../core/motion-filter";

/**
 * Pure fix processor (functional core): decide whether a location sample counts
 * as exploration and which cells it reveals, given the last accepted fix and
 * the step delta. No device deps → unit-tested. The engine is the thin shell
 * that sources fixes/steps and persists the result.
 */
export interface LastFix {
  lat: number;
  lng: number;
  timestampMs: number;
}

export interface ProcessResult {
  accepted: boolean;
  reason: MotionReason;
  /** Cells to reveal (empty when the sample is rejected). */
  cells: H3Index[];
  /** New reference fix — advances only when the sample is accepted. */
  nextLastFix: LastFix;
}

function seed(sample: LocationSample): ProcessResult {
  // First fix of a session: no prior to compare against, so we can't verify
  // walking — but revealing the single cell you're standing in is expected and
  // harmless (one cell).
  return {
    accepted: true,
    reason: MOTION_REASON.Ok,
    cells: revealCells({ lat: sample.lat, lng: sample.lng, accuracyM: sample.accuracyM }),
    nextLastFix: { lat: sample.lat, lng: sample.lng, timestampMs: sample.timestampMs },
  };
}

/**
 * Beyond this gap, the previous fix is no longer a usable reference.
 *
 * The motion filter compares distance travelled against steps taken over the
 * SAME window. After a long gap — app closed, a metro ride, tracking paused —
 * the distance is measured from an ancient point while the step count only
 * covers the current session. The ratio is then meaningless and would reject
 * every subsequent fix, latching exploration off permanently. Re-seeding is the
 * honest answer: we cannot prove that gap was walked, so we reveal only the cell
 * underfoot and start measuring again.
 */
const STALE_REFERENCE_SECONDS = 5 * 60;

export function processFix(
  sample: LocationSample,
  last: LastFix | null,
  stepsSinceLast: number | null,
): ProcessResult {
  if (last === null) return seed(sample);

  const metersSinceLast = haversineMeters(last, sample);
  const secondsSinceLast = Math.max(0, (sample.timestampMs - last.timestampMs) / 1000);

  if (secondsSinceLast > STALE_REFERENCE_SECONDS) return seed(sample);

  const verdict = classifyMotion(sample, { stepsSinceLast, metersSinceLast, secondsSinceLast });

  if (!verdict.counts) {
    return { accepted: false, reason: verdict.reason, cells: [], nextLastFix: last };
  }
  return {
    accepted: true,
    reason: verdict.reason,
    cells: revealCells({ lat: sample.lat, lng: sample.lng, accuracyM: sample.accuracyM }),
    nextLastFix: { lat: sample.lat, lng: sample.lng, timestampMs: sample.timestampMs },
  };
}
