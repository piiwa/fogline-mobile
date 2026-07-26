import { mmkv, mmkvKeys } from "@/storage/mmkv";

import type { LastFix } from "./location-processor";

/**
 * Persists the last accepted fix. Kept in MMKV (not just memory) because the
 * background location task can run in a fresh JS context after the app is
 * relaunched — the reference fix must survive across launches so motion deltas
 * stay correct.
 */
export function readLastFix(): LastFix | null {
  const raw = mmkv.getString(mmkvKeys.lastFix);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LastFix>;
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      typeof parsed.timestampMs === "number"
    ) {
      return { lat: parsed.lat, lng: parsed.lng, timestampMs: parsed.timestampMs };
    }
  } catch {
    // corrupt value → treat as no reference
  }
  return null;
}

export function writeLastFix(fix: LastFix): void {
  mmkv.set(mmkvKeys.lastFix, JSON.stringify(fix));
}
