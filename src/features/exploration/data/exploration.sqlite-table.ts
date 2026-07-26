import type { SQLiteDatabase } from "expo-sqlite";

import type { CellTable } from "./exploration.types";

/**
 * SQLite-backed `CellTable`. The schema is intentionally tiny — a grow-only set
 * of coarse cells plus a sync flag. No coordinates, no route, and no movement
 * timestamps ever leave the device beyond `first_seen`, which is local UI only.
 *
 * Callers pass bounded batches (see `chunkForSqlite`); these methods build one
 * statement per call and do not chunk again.
 */
export function createSqliteCellTable(db: SQLiteDatabase): CellTable {
  return {
    async init() {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS explored_cells (
           cell_id    TEXT PRIMARY KEY,
           first_seen INTEGER NOT NULL,
           synced     INTEGER NOT NULL DEFAULT 0
         );`,
      );
    },

    async selectExisting(cellIds) {
      if (cellIds.length === 0) return [];
      const placeholders = cellIds.map(() => "?").join(",");
      const rows = await db.getAllAsync<{ cell_id: string }>(
        `SELECT cell_id FROM explored_cells WHERE cell_id IN (${placeholders})`,
        ...cellIds,
      );
      return rows.map((r) => r.cell_id);
    },

    async insertMany(cellIds, firstSeen) {
      if (cellIds.length === 0) return;
      const values = cellIds.map(() => "(?, ?, 0)").join(",");
      const params: (string | number)[] = [];
      for (const id of cellIds) params.push(id, firstSeen);
      await db.runAsync(
        `INSERT OR IGNORE INTO explored_cells (cell_id, first_seen, synced) VALUES ${values}`,
        ...params,
      );
    },

    async selectAll() {
      const rows = await db.getAllAsync<{ cell_id: string }>("SELECT cell_id FROM explored_cells");
      return rows.map((r) => r.cell_id);
    },

    async selectUnsynced() {
      const rows = await db.getAllAsync<{ cell_id: string }>(
        "SELECT cell_id FROM explored_cells WHERE synced = 0",
      );
      return rows.map((r) => r.cell_id);
    },

    async markSynced(cellIds) {
      if (cellIds.length === 0) return;
      const placeholders = cellIds.map(() => "?").join(",");
      await db.runAsync(
        `UPDATE explored_cells SET synced = 1 WHERE cell_id IN (${placeholders})`,
        ...cellIds,
      );
    },

    async count() {
      const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM explored_cells");
      return row?.n ?? 0;
    },
  };
}
