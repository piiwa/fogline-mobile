import { shapeRing, shapeRingWithin, simplifyRing, smoothRing } from "../core/polygon-shaping";

/** A closed square, with redundant collinear points along each edge. */
const SQUARE_WITH_NOISE: number[][] = [
  [0, 0],
  [0.5, 0],
  [1, 0],
  [1, 0.5],
  [1, 1],
  [0.5, 1],
  [0, 1],
  [0, 0.5],
];

describe("simplifyRing", () => {
  it("drops collinear points that carry no shape", () => {
    const simplified = simplifyRing(SQUARE_WITH_NOISE, 0.01);
    expect(simplified.length).toBeLessThan(SQUARE_WITH_NOISE.length);
    expect(simplified.length).toBeGreaterThanOrEqual(3);
  });
});

describe("smoothRing", () => {
  it("cuts corners, producing more points than it received", () => {
    const smoothed = smoothRing(SQUARE_WITH_NOISE, 1);
    expect(smoothed.length).toBe(SQUARE_WITH_NOISE.length * 2);
  });
});

describe("shapeRing", () => {
  it("keeps every coordinate finite — a NaN would break the native renderer", () => {
    for (const point of shapeRing(SQUARE_WITH_NOISE, 0.01, 2)) {
      expect(Number.isFinite(point[0])).toBe(true);
      expect(Number.isFinite(point[1])).toBe(true);
    }
  });
});

describe("shapeRingWithin (native stack safety)", () => {
  // iOS copies each hole into a STACK array; an oversized ring is a SIGSEGV,
  // not a catchable error. The budget is a safety bound, not a nicety.
  const bigRing: number[][] = Array.from({ length: 40_000 }, (_, i) => {
    const angle = (i / 40_000) * Math.PI * 2;
    // Wobble so simplification cannot trivially collapse it to a circle.
    const r = 1 + 0.02 * Math.sin(angle * 90);
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  });

  it("brings a huge ring under the budget", () => {
    expect(shapeRingWithin(bigRing, 2000).length).toBeLessThanOrEqual(2000);
  });
});
