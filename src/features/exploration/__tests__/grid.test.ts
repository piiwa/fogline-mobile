import { cellForPoint, dilate, dissolveToMultiPolygon, revealCells } from "../core/grid";

describe("grid", () => {
  const paris = { lat: 48.8566, lng: 2.3522 };

  it("encodes a point to an h3 cell deterministically", () => {
    const a = cellForPoint(paris.lat, paris.lng);
    const b = cellForPoint(paris.lat, paris.lng);
    expect(a).toBe(b);
    expect(typeof a).toBe("string");
  });

  it("reveals a wider neighbourhood as GPS accuracy degrades", () => {
    const tight = revealCells({ ...paris, accuracyM: 5 }).length;
    const loose = revealCells({ ...paris, accuracyM: 150 }).length;
    expect(loose).toBeGreaterThan(tight);
  });

  it("caps the reveal footprint even for a garbage fix", () => {
    const huge = revealCells({ ...paris, accuracyM: 5000 });
    // k is clamped to 3 → gridDisk(_, 3) = 37 cells. Never floods the map.
    expect(huge.length).toBeLessThanOrEqual(37);
  });

  it("dissolves a set of cells into non-empty polygon rings", () => {
    const poly = dissolveToMultiPolygon(revealCells({ ...paris, accuracyM: 150 }));
    expect(poly.length).toBeGreaterThan(0);
    // GeoJSON MultiPolygon: polygons → rings → points → [lng, lat].
    expect(poly[0]![0]![0]!.length).toBe(2);
  });

  describe("dilate (feathered-fog bands)", () => {
    it("grows the set outward and always contains the original cells", () => {
      const cells = [cellForPoint(paris.lat, paris.lng)!];
      const grown = dilate(cells, 1);
      expect(grown).toEqual(expect.arrayContaining(cells));
      // One hexagon dilated by one ring = itself + 6 neighbours.
      expect(grown).toHaveLength(7);
    });
  });
});

describe("malformed cell ids", () => {
  const paris = { lat: 48.8566, lng: 2.3522 };

  it("never throws while dissolving — a bad id would kill the map screen", () => {
    const good = cellForPoint(paris.lat, paris.lng)!;
    expect(() => dissolveToMultiPolygon([good, "not-an-h3", ""])).not.toThrow();
    expect(dissolveToMultiPolygon([good, "not-an-h3"]).length).toBeGreaterThan(0);
  });
});

describe("hostile coordinates", () => {
  it("refuses a reveal near the antimeridian instead of poisoning the map", () => {
    // A disc straddling ±180° dissolves into a ring that spans the globe the
    // wrong way, and exploration is permanent — so the damage never ages out.
    expect(revealCells({ lat: 0, lng: 179.9, accuracyM: 20 })).toEqual([]);
    expect(revealCells({ lat: 0, lng: -179.9, accuracyM: 20 })).toEqual([]);
  });
});
