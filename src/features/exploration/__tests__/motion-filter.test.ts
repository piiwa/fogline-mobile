import { classifyMotion, MOTION_REASON } from "../core/motion-filter";

const base = { lat: 48.8, lng: 2.3, accuracyM: 20, speedMps: 1.3, timestampMs: 1000 };

describe("motion-filter", () => {
  it("accepts walking: steps present, plausible speed and ratio", () => {
    const v = classifyMotion(base, {
      stepsSinceLast: 12,
      metersSinceLast: 15,
      secondsSinceLast: 10,
    });
    expect(v.counts).toBe(true);
    expect(v.reason).toBe(MOTION_REASON.Ok);
  });

  it("rejects a vehicle: real movement, no steps", () => {
    const v = classifyMotion(
      { ...base, speedMps: 8 },
      { stepsSinceLast: 0, metersSinceLast: 120, secondsSinceLast: 12 },
    );
    expect(v.counts).toBe(false);
    expect(v.reason).toBe(MOTION_REASON.NoSteps);
  });

  it("rejects a GPS jump: implausible meters-per-step", () => {
    const v = classifyMotion(base, {
      stepsSinceLast: 2,
      metersSinceLast: 400,
      secondsSinceLast: 12,
    });
    expect(v.reason).toBe(MOTION_REASON.GpsJump);
  });

  it("quietly ignores standing still (no movement, no steps)", () => {
    const v = classifyMotion(
      { ...base, speedMps: 0 },
      { stepsSinceLast: 0, metersSinceLast: 1, secondsSinceLast: 30 },
    );
    expect(v.reason).toBe(MOTION_REASON.Stationary);
  });

  describe("steps unknown (Android background: null pedometer)", () => {
    it("falls back to speed and accepts a slow move", () => {
      const v = classifyMotion(base, {
        stepsSinceLast: null,
        metersSinceLast: 30,
        secondsSinceLast: 20,
      });
      expect(v.counts).toBe(true);
    });
  });
});

describe("no steps AND no OS speed (Android background)", () => {
  // The platform AD-2 exists for: no pedometer in the background, and often no
  // speed either. With neither signal, nothing would reject a car.
  const noSpeed = { ...base, speedMps: null };

  it("rejects a car ride using speed derived from displacement", () => {
    const v = classifyMotion(noSpeed, {
      stepsSinceLast: null,
      metersSinceLast: 900, // 900 m in 60 s = 15 m/s ≈ 54 km/h
      secondsSinceLast: 60,
    });
    expect(v.counts).toBe(false);
    expect(v.reason).toBe(MOTION_REASON.TooFast);
  });

  it("does not divide by zero when two fixes share a timestamp", () => {
    const v = classifyMotion(noSpeed, {
      stepsSinceLast: null,
      metersSinceLast: 50,
      secondsSinceLast: 0,
    });
    expect(v.counts).toBe(true);
  });
});
