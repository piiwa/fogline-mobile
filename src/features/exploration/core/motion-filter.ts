/**
 * Walking gate — decides whether a location sample counts as exploration.
 *
 * "Only walking reveals the map" (brief). The PEDOMETER is the ground truth:
 * movement with no accumulated steps is a vehicle/transit → rejected for free,
 * at ~zero battery. GPS speed is a secondary guard against fast bursts, and the
 * meters-per-step ratio rejects GPS teleports. See AD-2.
 *
 * PURE: no device deps, fully unit-tested. The engine assembles `MotionContext`
 * from the pedometer + successive fixes and calls `classifyMotion`.
 */

/** A location reading, reduced to the motion-relevant fields. */
export interface LocationSample {
  lat: number;
  lng: number;
  accuracyM: number;
  /** OS-reported ground speed in m/s. `null` when unavailable. */
  speedMps: number | null;
  timestampMs: number;
}

/** What happened since the last ACCEPTED sample. */
export interface MotionContext {
  /**
   * Steps since the last accepted sample, or `null` when the pedometer can't
   * answer — notably Android in the background, which has no historical step
   * query (iOS does). `null` ≠ 0: unknown falls back to speed-only gating rather
   * than wrongly rejecting the walk.
   */
  stepsSinceLast: number | null;
  metersSinceLast: number;
  secondsSinceLast: number;
}

export const MOTION_REASON = {
  Ok: "ok",
  NoSteps: "no-steps",
  TooFast: "too-fast",
  GpsJump: "gps-jump",
  Stationary: "stationary",
} as const;

export type MotionReason = (typeof MOTION_REASON)[keyof typeof MOTION_REASON];

export interface MotionVerdict {
  counts: boolean;
  reason: MotionReason;
}

/** Walking (and running) tops out well under this. Above → not on foot. */
const WALK_MAX_SPEED_MPS = 3.0;
/** At least this many steps in the window to count as walking. */
const MIN_STEPS = 1;
/** A human doesn't cover more than this per step; above → GPS teleport. */
const MAX_METERS_PER_STEP = 2.5;
/** Below this displacement with no steps = standing still, silently ignored. */
const STATIONARY_MAX_METERS = 5;

/**
 * Speed to judge this sample by, in m/s.
 *
 * The OS speed is preferred, but Android frequently reports none — and that is
 * exactly the platform where steps are also unknown in the background. Trusting
 * `speedMps` alone there would leave NO signal at all, so a car ride would
 * reveal the motorway. Displacement over elapsed time is always available and
 * closes that hole; it under-reports on a winding road, which errs toward
 * accepting a walk rather than rejecting one.
 */
function effectiveSpeedMps(sample: LocationSample, ctx: MotionContext): number {
  if (sample.speedMps !== null) return sample.speedMps;
  if (ctx.secondsSinceLast <= 0) return 0;
  return ctx.metersSinceLast / ctx.secondsSinceLast;
}

/**
 * Classify a sample. Order matters: stationary (quietly ignore) → no-steps
 * (vehicle/transit) → too-fast (speed burst) → gps-jump (implausible ratio) →
 * ok. Each earlier reason is a stronger/cheaper signal than the next.
 */
export function classifyMotion(sample: LocationSample, ctx: MotionContext): MotionVerdict {
  const steps = ctx.stepsSinceLast;
  const hasSteps = steps !== null && steps >= MIN_STEPS;
  const overSpeed = effectiveSpeedMps(sample, ctx) > WALK_MAX_SPEED_MPS;

  // No usable movement (and no steps to prove pacing) → quietly ignore.
  if (!hasSteps && ctx.metersSinceLast < STATIONARY_MAX_METERS) {
    return { counts: false, reason: MOTION_REASON.Stationary };
  }

  // Steps unknown (e.g. Android background) → speed is the only signal left.
  if (steps === null) {
    if (overSpeed) return { counts: false, reason: MOTION_REASON.TooFast };
    return { counts: true, reason: MOTION_REASON.Ok };
  }

  // Steps known: the pedometer is ground truth.
  if (steps < MIN_STEPS) {
    return { counts: false, reason: MOTION_REASON.NoSteps };
  }
  if (overSpeed) {
    return { counts: false, reason: MOTION_REASON.TooFast };
  }
  const metersPerStep = ctx.metersSinceLast / steps;
  if (metersPerStep > MAX_METERS_PER_STEP) {
    return { counts: false, reason: MOTION_REASON.GpsJump };
  }
  return { counts: true, reason: MOTION_REASON.Ok };
}
