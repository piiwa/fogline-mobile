import { openDatabaseAsync } from "expo-sqlite";

import { createExplorationStore, type ExplorationStore } from "./exploration.store";
import { createSqliteCellTable } from "./exploration.sqlite-table";

/**
 * Opens the real SQLite database and memoizes the initialized store, so every
 * caller (renderer, engine, sync) shares one handle. `expo-sqlite` is bundled
 * in Expo Go, so this needs no `isExpoGo` guard.
 */
let _storePromise: Promise<ExplorationStore> | null = null;

async function open(): Promise<ExplorationStore> {
  const db = await openDatabaseAsync("fogline.db");
  const store = createExplorationStore(createSqliteCellTable(db));
  await store.init();
  return store;
}

export function getExplorationStore(): Promise<ExplorationStore> {
  if (_storePromise === null) _storePromise = open();
  return _storePromise;
}
