import { chunkForSqlite, type CellTable } from "./exploration.types";

/**
 * Offline-first explored-cell store — the source of truth for the fog render.
 *
 * Grow-only: cells are only ever added, matching the G-Set model. `addCells`
 * reports exactly which cells were newly inserted, so the renderer animates only
 * fresh territory and the sync layer knows its delta.
 *
 * Work is chunked, never per-cell: a first sync on a reinstalled app pulls the
 * whole historical set at once, and one awaited round-trip per cell would mean
 * thousands of sequential bridge calls.
 */
export interface ExplorationStore {
  init(): Promise<void>;
  addCells(cellIds: string[], now?: number): Promise<{ added: string[] }>;
  getAllCells(): Promise<string[]>;
  getUnsyncedCells(): Promise<string[]>;
  markSynced(cellIds: string[]): Promise<void>;
  getStats(): Promise<{ cellCount: number }>;
}

export function createExplorationStore(table: CellTable): ExplorationStore {
  return {
    init: () => table.init(),

    async addCells(cellIds, now = Date.now()) {
      const unique = [...new Set(cellIds)];
      if (unique.length === 0) return { added: [] };

      const added: string[] = [];
      for (const batch of chunkForSqlite(unique)) {
        // Two statements per batch (read the overlap, insert the difference)
        // instead of one per cell.
        const existing = new Set(await table.selectExisting(batch));
        const fresh = batch.filter((id) => !existing.has(id));
        if (fresh.length > 0) {
          await table.insertMany(fresh, now);
          added.push(...fresh);
        }
      }
      return { added };
    },

    getAllCells: () => table.selectAll(),
    getUnsyncedCells: () => table.selectUnsynced(),

    async markSynced(cellIds) {
      for (const batch of chunkForSqlite(cellIds)) {
        await table.markSynced(batch);
      }
    },

    async getStats() {
      return { cellCount: await table.count() };
    },
  };
}
