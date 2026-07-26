/**
 * Persistence contract for the explored-cell set.
 *
 * `CellTable` is the low-level primitive — implemented by SQLite in the app and
 * by an in-memory fake in tests. Set logic (which cells are new, stats) sits
 * above it in `exploration.store.ts`, which is what gets unit-tested.
 *
 * Every method takes a bounded list: SQLite has a hard ceiling on bind
 * variables per statement, so the store chunks before calling in.
 */
export interface CellTable {
  init(): Promise<void>;
  /** Of the given ids, those already stored. */
  selectExisting(cellIds: string[]): Promise<string[]>;
  /** Insert rows, ignoring any that already exist. */
  insertMany(cellIds: string[], firstSeen: number): Promise<void>;
  selectAll(): Promise<string[]>;
  selectUnsynced(): Promise<string[]>;
  markSynced(cellIds: string[]): Promise<void>;
  count(): Promise<number>;
}

/**
 * Bind-variable budget per statement.
 *
 * expo-sqlite vendors SQLite with `SQLITE_MAX_VARIABLE_NUMBER = 32766`. A single
 * statement over more ids than that throws — and because a failed sync never
 * advances its cursor, the same oversized batch would be retried and fail on
 * every sync from then on. Chunking well under the limit keeps that impossible.
 */
export const SQLITE_VARIABLE_LIMIT = 8000;

/** Split a list into chunks that fit within one statement. */
export function chunkForSqlite<T>(items: T[], size = SQLITE_VARIABLE_LIMIT): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
