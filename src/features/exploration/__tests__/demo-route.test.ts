import { buildDemoWalk } from "../demo/demo-route";
import { classifyMotion } from "../core/motion-filter";
import { haversineMeters } from "@/utils/geo-scale";

const ORIGIN = { lat: 48.8566, lng: 2.3522 };
const T0 = 1_700_000_000_000;

describe("demo walk", () => {
  it("every leg passes the walking filter — the demo must reveal ground", () => {
    const walk = buildDemoWalk(ORIGIN, T0);
    let previous = { ...ORIGIN, timestampMs: T0 };

    for (const leg of walk) {
      const verdict = classifyMotion(leg.sample, {
        stepsSinceLast: leg.steps,
        metersSinceLast: haversineMeters(previous, leg.sample),
        secondsSinceLast: (leg.sample.timestampMs - previous.timestampMs) / 1000,
      });
      expect(verdict.counts).toBe(true);
      previous = { ...leg.sample };
    }
  });
});
