import { createExplorationStore } from "../data/exploration.store";
import { SQLITE_VARIABLE_LIMIT, type CellTable } from "../data/exploration.types";

/** In-memory CellTable so the store logic is tested without SQLite or a device. */
function makeFakeTable() {
  const map = new Map<string, { firstSeen: number; synced: boolean }>();
  /** Largest batch any single call received — guards the bind-variable ceiling. */
  let largestBatch = 0;
  const observe = (n: number): void => {
    largestBatch = Math.max(largestBatch, n);
  };

  const table: CellTable = {
    async init() {
      /* no-op */
    },
    async selectExisting(cellIds) {
      observe(cellIds.length);
      return cellIds.filter((id) => map.has(id));
    },
    async insertMany(cellIds, firstSeen) {
      observe(cellIds.length);
      for (const id of cellIds) {
        if (!map.has(id)) map.set(id, { firstSeen, synced: false });
      }
    },
    async selectAll() {
      return [...map.keys()];
    },
    async selectUnsynced() {
      return [...map.entries()].filter(([, v]) => !v.synced).map(([k]) => k);
    },
    async markSynced(cellIds) {
      observe(cellIds.length);
      for (const id of cellIds) {
        const v = map.get(id);
        if (v) v.synced = true;
      }
    },
    async count() {
      return map.size;
    },
  };

  return { table, getLargestBatch: () => largestBatch };
}

describe("exploration store", () => {
  it("is idempotent — re-adding known cells returns no additions", async () => {
    const store = createExplorationStore(makeFakeTable().table);
    await store.addCells(["a", "b"]);
    const second = await store.addCells(["a", "b", "c"]);
    expect(second.added).toEqual(["c"]);
    expect((await store.getStats()).cellCount).toBe(3);
  });

  it("tracks unsynced cells and clears them on markSynced", async () => {
    const store = createExplorationStore(makeFakeTable().table);
    await store.addCells(["a", "b"]);
    expect((await store.getUnsyncedCells()).sort()).toEqual(["a", "b"]);
    await store.markSynced(["a", "b"]);
    expect(await store.getUnsyncedCells()).toEqual([]);
  });

  describe("bind-variable ceiling", () => {
    // A statement over more ids than SQLite allows throws, and a failed sync
    // never advances its cursor — so the same oversized batch would be retried
    // and fail on every sync from then on.
    const HUGE = Array.from({ length: SQLITE_VARIABLE_LIMIT * 2 + 37 }, (_, i) => `cell-${i}`);

    it("never hands a single call more ids than one statement can bind", async () => {
      const { table, getLargestBatch } = makeFakeTable();
      const store = createExplorationStore(table);

      const { added } = await store.addCells(HUGE);
      await store.markSynced(HUGE);

      expect(added).toHaveLength(HUGE.length);
      expect(getLargestBatch()).toBeLessThanOrEqual(SQLITE_VARIABLE_LIMIT);
    });
  });
});
