import { cellForPoint, dissolveToMultiPolygon } from "../core/grid";
import { buildExploredHoles, buildFogRing } from "../ui/fog-geometry";

const REGION = {
  latitude: 37.3318,
  longitude: -122.0312,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

describe("fog ring", () => {
  it("fully encloses the visible region", () => {
    // If the ring did not surround the camera, the map would show through
    // unfogged — the exact opposite of the feature.
    const { coordinates } = buildFogRing(REGION);
    const lats = coordinates.map((c) => c.latitude);
    const lngs = coordinates.map((c) => c.longitude);

    expect(Math.min(...lats)).toBeLessThan(REGION.latitude - REGION.latitudeDelta);
    expect(Math.max(...lats)).toBeGreaterThan(REGION.latitude + REGION.latitudeDelta);
    expect(Math.min(...lngs)).toBeLessThan(REGION.longitude - REGION.longitudeDelta);
    expect(Math.max(...lngs)).toBeGreaterThan(REGION.longitude + REGION.longitudeDelta);
  });

  it("never leaves the range Mercator can draw", () => {
    const world = { latitude: 0, longitude: 0, latitudeDelta: 170, longitudeDelta: 350 };
    const lats = buildFogRing(world).coordinates.map((c) => c.latitude);
    expect(Math.min(...lats)).toBeGreaterThanOrEqual(-85);
    expect(Math.max(...lats)).toBeLessThanOrEqual(85);
  });

  it("keeps a usable size when the camera is zoomed all the way in", () => {
    const pinhole = { latitude: 48.8, longitude: 2.3, latitudeDelta: 0, longitudeDelta: 0 };
    const { coordinates } = buildFogRing(pinhole);
    const span =
      Math.max(...coordinates.map((c) => c.latitude)) -
      Math.min(...coordinates.map((c) => c.latitude));
    expect(span).toBeGreaterThan(0);
  });
});

describe("native overlay ceilings", () => {
  // Every ring becomes an interior polygon MapKit holds for the overlay's
  // lifetime. An explored area fragments as someone walks, so an unbounded
  // count grows until the map dies — the exact "crashes after a while" shape.
  it("caps the holes handed to the renderer", () => {
    // Cells spread far apart so they dissolve into separate rings, and a camera
    // wide enough that all of them stay in frame.
    const many = Array.from({ length: 400 }, (_, i) => cellForPoint(40 + i * 0.05, 2 + i * 0.05)!);
    const wide = { latitude: 45, longitude: 6, latitudeDelta: 40, longitudeDelta: 40 };
    const holes = buildExploredHoles(dissolveToMultiPolygon(many), buildFogRing(wide));
    expect(holes.length).toBeLessThanOrEqual(60);
  });
});

describe("holes are clipped to their own outer ring", () => {
  // MapKit resolves a polygon with an even-odd rule, so an interior ring that
  // lies entirely outside the exterior ring is FILLED instead of pierced: the
  // walked ground turns opaque and the unknown world turns clear. The feature
  // renders backwards, and it is reachable just by panning away.
  it("drops explored ground that the camera has left behind", () => {
    const explored = dissolveToMultiPolygon([cellForPoint(48.8566, 2.3522)!]);
    const elsewhere = buildFogRing({
      latitude: 37.3318,
      longitude: -122.0312,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    expect(buildExploredHoles(explored, elsewhere)).toHaveLength(0);
  });

  it("keeps it while the camera is still on it", () => {
    const explored = dissolveToMultiPolygon([cellForPoint(48.8566, 2.3522)!]);
    const onIt = buildFogRing({
      latitude: 48.8566,
      longitude: 2.3522,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    expect(buildExploredHoles(explored, onIt).length).toBeGreaterThan(0);
  });
});
