import { delta, merge, union } from "../core/gset";

describe("gset (grow-only set CRDT)", () => {
  it("union is commutative and idempotent", () => {
    const a = ["x", "y"];
    const b = ["y", "z"];
    expect([...union(a, b)].sort()).toEqual(["x", "y", "z"]);
    expect([...union(b, a)].sort()).toEqual(["x", "y", "z"]);
    expect([...union(a, a)].sort()).toEqual(["x", "y"]);
  });

  it("delta returns only cells missing remotely", () => {
    expect(delta(["a", "b", "c"], ["b"]).sort()).toEqual(["a", "c"]);
    expect(delta(["a"], ["a", "b"])).toEqual([]);
  });

  it("merge never removes and reports what was added", () => {
    const { next, added } = merge(new Set(["a"]), ["a", "b"]);
    expect([...next].sort()).toEqual(["a", "b"]);
    expect(added).toEqual(["b"]);
  });

  it("converges regardless of merge order (conflict-free)", () => {
    // Device order A then B vs B then A → identical final state.
    const ab = merge(merge(new Set<string>(), ["a", "b"]).next, ["b", "c"]).next;
    const ba = merge(merge(new Set<string>(), ["b", "c"]).next, ["a", "b"]).next;
    expect([...ab].sort()).toEqual([...ba].sort());
    expect([...ab].sort()).toEqual(["a", "b", "c"]);
  });
});
