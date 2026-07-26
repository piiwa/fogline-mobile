import NetInfo from "@react-native-community/netinfo";

import { getFeatures } from "@/config/features";
import { getConfig } from "@/config/runtime.config";
import { mmkv, mmkvKeys } from "@/storage/mmkv";

import { getExplorationConfig } from "../config/exploration.config";
import { pullCells, pushCells } from "../data/exploration.api";
import { getExplorationStore } from "../data/exploration.database";
import { emitRevealed } from "../engine/location-engine";

import { runSync, type SyncResult } from "./sync-core";

export type { SyncResult } from "./sync-core";

/**
 * Single-flight guard.
 *
 * Every revealed cell fires `syncNow()`, and a brisk walk reveals several within
 * a second. Overlapping runs would each read the same unsynced set and push it
 * twice — harmless server-side (the union is idempotent) but wasteful, and it
 * races two writers on the cursor. Callers already in flight join the run that
 * is happening rather than starting another.
 */
let _inFlight: Promise<SyncResult> | null = null;

/**
 * Imperative shell over the pure `runSync`: wires the real store, api, mmkv
 * cursor, and connectivity. Best-effort — a failed sync never surfaces to the
 * user or breaks the render.
 */
export function syncNow(): Promise<SyncResult> {
  if (_inFlight) return _inFlight;

  _inFlight = execute().finally(() => {
    _inFlight = null;
  });
  return _inFlight;
}

async function execute(): Promise<SyncResult> {
  try {
    if (!getFeatures().exploration.syncEnabled) {
      return { pushed: 0, pulled: 0, skipped: true };
    }
    // No backend configured for this build → offline-only, by design. Firing
    // requests at an empty base URL would just produce noise and retries.
    if (!getConfig().apiBaseUrl) {
      return { pushed: 0, pulled: 0, skipped: true };
    }
    const store = await getExplorationStore();
    const cfg = getExplorationConfig();
    return await runSync({
      store,
      pushCells,
      pullCells,
      getCursor: () => mmkv.getString(mmkvKeys.syncCursor),
      setCursor: (cursor) => mmkv.set(mmkvKeys.syncCursor, cursor),
      isConnected: async () => (await NetInfo.fetch()).isConnected ?? false,
      batchSize: cfg.syncBatchSize,
      // Territory pulled from another device is territory revealed, as far as
      // every screen is concerned. Same event as a walked reveal, so the map
      // and the HUD update through the one path they already listen on.
      onMerged: emitRevealed,
    });
  } catch {
    return { pushed: 0, pulled: 0, skipped: true };
  }
}
