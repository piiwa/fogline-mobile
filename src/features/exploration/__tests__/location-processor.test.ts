import { processFix } from "../engine/location-processor";

const at = (lat: number, lng: number, timestampMs: number, speedMps: number | null = 1.2) => ({
  lat,
  lng,
  accuracyM: 15,
  speedMps,
  timestampMs,
});

describe("location-processor", () => {
  it("seeds the first fix: accepted and reveals the current cell", () => {
    const res = processFix(at(48.8566, 2.3522, 1000), null, 0);
    expect(res.accepted).toBe(true);
    expect(res.cells.length).toBeGreaterThan(0);
    expect(res.nextLastFix).toEqual({ lat: 48.8566, lng: 2.3522, timestampMs: 1000 });
  });

  it("rejects a vehicle jump and keeps the previous reference", () => {
    const last = { lat: 48.8566, lng: 2.3522, timestampMs: 1000 };
    // ~1 km away in 20 s, no steps → vehicle.
    const res = processFix(at(48.8656, 2.3522, 21000, 9), last, 0);
    expect(res.accepted).toBe(false);
    expect(res.cells).toEqual([]);
    expect(res.nextLastFix).toBe(last);
  });
});

describe("stale reference recovery", () => {
  it("re-seeds instead of latching off after a long gap", () => {
    // The app was closed at home; the user reappears 3 km away an hour later.
    // Comparing that distance against this session's step count is meaningless,
    // so the fix must re-seed rather than be rejected forever.
    const home = { lat: 48.8566, lng: 2.3522, timestampMs: 0 };
    const anHourLater = 60 * 60 * 1000;
    const res = processFix(at(48.8836, 2.3522, anHourLater), home, 0);

    expect(res.accepted).toBe(true);
    expect(res.cells.length).toBeGreaterThan(0);
    expect(res.nextLastFix.timestampMs).toBe(anHourLater);
  });
});
