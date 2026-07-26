import { merge } from "../core/gset";
import type { ExplorationStore } from "../data/exploration.store";

/**
 * Pure sync algorithm (functional core) — G-Set delta reconciliation with zero
 * device/network imports, so it is unit-tested in isolation. See AD-5.
 *
 * PUSH: send local cells the server has not acknowledged, then flag them synced.
 * PULL: `merge` remote cells into the local set — a union, so it is commutative
 *       and idempotent — then flag them synced so they never bounce back.
 *
 * The union is what makes multi-device convergence conflict-free: two devices
 * exploring offline, in any order, reach the same state without coordination.
 */
export interface SyncDeps {
  store: Pick<ExplorationStore, "getUnsyncedCells" | "markSynced" | "addCells" | "getAllCells">;
  pushCells: (cells: string[]) => Promise<void>;
  pullCells: (
    since: string | undefined,
  ) => Promise<{ cells: string[]; cursor: string | undefined; hasMore: boolean }>;
  getCursor: () => string | undefined;
  setCursor: (cursor: string) => void;
  isConnected: () => boolean | Promise<boolean>;
  batchSize?: number;
  /** Safety stop so one sync can never loop forever on a broken cursor. */
  maxPullPages?: number;
  /**
   * Called with territory that arrived from ANOTHER device.
   *
   * Without it a pull is invisible: the cells reach SQLite, and every screen
   * already mounted keeps rendering the set it read on mount. Adopting another
   * device's identity would write a whole exploration to disk and leave the map
   * looking untouched — the feature working perfectly and appearing broken.
   *
   * Injected rather than imported so this module stays free of device deps.
   */
  onMerged?: (cells: string[]) => void;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  skipped: boolean;
}

const DEFAULT_BATCH_SIZE = 500;
const DEFAULT_MAX_PULL_PAGES = 25;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function runSync(deps: SyncDeps): Promise<SyncResult> {
  if (!(await deps.isConnected())) {
    return { pushed: 0, pulled: 0, skipped: true };
  }
  const batchSize = deps.batchSize ?? DEFAULT_BATCH_SIZE;

  const pushed = await pushLocalDelta(deps, batchSize);
  const pulled = await pullRemoteDelta(deps);

  return { pushed, pulled, skipped: false };
}

/** Send everything the server has not acknowledged yet, in bounded batches. */
async function pushLocalDelta(deps: SyncDeps, batchSize: number): Promise<number> {
  const unsynced = await deps.store.getUnsyncedCells();
  let pushed = 0;
  for (const batch of chunk(unsynced, batchSize)) {
    await deps.pushCells(batch);
    await deps.store.markSynced(batch);
    pushed += batch.length;
  }
  return pushed;
}

/**
 * Union in what other devices explored, page by page.
 *
 * The server bounds each response, so a client whose cursor was wiped (a
 * reinstall) has a large backlog to walk. The cursor is persisted after EVERY
 * page: an interrupted sync resumes where it stopped instead of starting over.
 */
async function pullRemoteDelta(deps: SyncDeps): Promise<number> {
  const maxPages = deps.maxPullPages ?? DEFAULT_MAX_PULL_PAGES;
  let pulled = 0;
  let cursor = deps.getCursor();

  for (let page = 0; page < maxPages; page += 1) {
    const result = await deps.pullCells(cursor);

    if (result.cells.length > 0) {
      // The union decides what is genuinely new; the store persists exactly
      // that, so the reveal animation only fires for unseen territory.
      const local = new Set(await deps.store.getAllCells());
      const { added } = merge(local, result.cells);

      if (added.length > 0) {
        await deps.store.addCells(added);
        deps.onMerged?.(added);
      }
      // Everything pulled already lives on the server — flag the whole batch so
      // the next push does not send it straight back.
      await deps.store.markSynced(result.cells);
      pulled += added.length;
    }

    if (result.cursor !== undefined) {
      cursor = result.cursor;
      deps.setCursor(result.cursor);
    }
    if (!result.hasMore) break;
  }

  return pulled;
}
