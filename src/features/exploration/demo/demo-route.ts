import type { LocationSample } from "../core/motion-filter";

/**
 * A synthetic walk, used by the demo mode.
 *
 * Reviewing this feature otherwise means physically walking a few hundred metres,
 * which no reviewer will do — and the iOS simulator has no pedometer, so even a
 * simulated GPS route exercises only half the pipeline. The demo route feeds the
 * SAME ingestion path as a real fix (filter → grid → store → sync), so what it
 * demonstrates is the real system, not a mock of it.
 */
interface DemoStep {
  /** Metres travelled since the previous step. */
  metres: number;
  /** Compass bearing in degrees (0 = north). */
  bearingDeg: number;
  /** Steps taken over that leg — what makes it read as walking. */
  steps: number;
}

const METERS_PER_DEGREE_LAT = 111320;
/** A relaxed walking pace: ~0.75 m per step. */
const METRES_PER_STEP = 0.75;

/** A loop around the block: out, around, and back past the start. */
const LEG_BEARINGS = [0, 0, 90, 90, 180, 180, 270, 270, 0, 45, 90, 135];
const LEG_METRES = 45;

const DEMO_STEPS: DemoStep[] = LEG_BEARINGS.map((bearingDeg) => ({
  metres: LEG_METRES,
  bearingDeg,
  steps: Math.round(LEG_METRES / METRES_PER_STEP),
}));

/** Advance a position by `metres` along `bearingDeg` (local flat-earth). */
function advance(
  from: { lat: number; lng: number },
  metres: number,
  bearingDeg: number,
): { lat: number; lng: number } {
  const rad = (bearingDeg * Math.PI) / 180;
  const metresPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((from.lat * Math.PI) / 180);
  return {
    lat: from.lat + (metres * Math.cos(rad)) / METERS_PER_DEGREE_LAT,
    lng: from.lng + (metres * Math.sin(rad)) / Math.max(metresPerDegreeLng, 1e-9),
  };
}

/**
 * Expand the route into location samples starting from `origin`. Pure: the same
 * origin always yields the same walk, which keeps the demo reproducible.
 */
export function buildDemoWalk(
  origin: { lat: number; lng: number },
  startedAtMs: number,
): { sample: LocationSample; steps: number }[] {
  const out: { sample: LocationSample; steps: number }[] = [];
  let position = origin;
  let timestampMs = startedAtMs;

  for (const step of DEMO_STEPS) {
    position = advance(position, step.metres, step.bearingDeg);
    timestampMs += 20_000;
    out.push({
      sample: {
        lat: position.lat,
        lng: position.lng,
        accuracyM: 18,
        speedMps: 1.3,
        timestampMs,
      },
      steps: step.steps,
    });
  }
  return out;
}
