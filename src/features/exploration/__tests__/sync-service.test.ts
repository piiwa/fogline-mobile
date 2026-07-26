import { runSync } from "../sync/sync-core";

/** In-memory store mirroring the real one: addCells inserts as UNSYNCED. */
function makeStore(initialUnsynced: string[] = []) {
  const all = new Set<string>(initialUnsynced);
  const unsynced = new Set<string>(initialUnsynced);
  return {
    markedSynced: [] as string[],
    async getAllCells() {
      return [...all];
    },
    async getUnsyncedCells() {
      return [...unsynced];
    },
    async markSynced(cells: string[]) {
      for (const c of cells) {
        unsynced.delete(c);
        this.markedSynced.push(c);
      }
    },
    async addCells(cells: string[]) {
      const added: string[] = [];
      for (const c of cells) {
        if (!all.has(c)) {
          all.add(c);
          unsynced.add(c);
          added.push(c);
        }
      }
      return { added };
    },
  };
}

describe("sync-service (offline-first G-Set delta)", () => {
  it("pushes unsynced cells then flags them synced", async () => {
    const store = makeStore(["a", "b"]);
    const pushed: string[] = [];
    const res = await runSync({
      store,
      pushCells: async (cells) => {
        pushed.push(...cells);
      },
      pullCells: async () => ({ cells: [], cursor: "c1", hasMore: false }),
      getCursor: () => undefined,
      setCursor: () => undefined,
      isConnected: () => true,
    });
    expect(pushed.sort()).toEqual(["a", "b"]);
    expect(res.pushed).toBe(2);
    expect(store.markedSynced.sort()).toEqual(["a", "b"]);
    expect(await store.getUnsyncedCells()).toEqual([]);
  });

  it("skips entirely when offline — no push, no pull, no throw", async () => {
    const store = makeStore(["a"]);
    let pushCalled = false;
    let pullCalled = false;
    const res = await runSync({
      store,
      pushCells: async () => {
        pushCalled = true;
      },
      pullCells: async () => {
        pullCalled = true;
        return { cells: [], cursor: "c", hasMore: false };
      },
      getCursor: () => undefined,
      setCursor: () => undefined,
      isConnected: () => false,
    });
    expect(res.skipped).toBe(true);
    expect(pushCalled).toBe(false);
    expect(pullCalled).toBe(false);
  });
});

describe("paginated pull", () => {
  it("stops at the page ceiling so a stuck cursor cannot loop forever", async () => {
    const store = makeStore([]);
    let calls = 0;

    await runSync({
      store,
      pushCells: async () => undefined,
      // A server that always claims more, and never advances the cursor.
      pullCells: async () => {
        calls += 1;
        return { cells: [], cursor: "same", hasMore: true };
      },
      getCursor: () => undefined,
      setCursor: () => undefined,
      isConnected: () => true,
      maxPullPages: 4,
    });

    expect(calls).toBe(4);
  });

  it("announces territory pulled from another device", async () => {
    // The regression this locks: cells reached SQLite and no screen was told,
    // so adopting another device's identity wrote a whole exploration to disk
    // and left the map looking untouched.
    const announced: string[][] = [];
    const store = makeStore(["local"]);

    await runSync({
      store,
      pushCells: async () => undefined,
      pullCells: async () => ({ cells: ["local", "remote"], cursor: "s:2", hasMore: false }),
      getCursor: () => undefined,
      setCursor: () => undefined,
      isConnected: () => true,
      onMerged: (cells) => announced.push(cells),
    });

    // Only what was genuinely new — a cell the device already had is not news.
    expect(announced).toEqual([["remote"]]);
  });
});
