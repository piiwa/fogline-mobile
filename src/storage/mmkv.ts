import AsyncStorage from "@react-native-async-storage/async-storage";
import { MMKV } from "react-native-mmkv";

import { isExpoGo } from "@/utils/is-expo-go";

/**
 * Synchronous preferences storage for small non-sensitive values (language,
 * onboarding + permission flags, sync cursor).
 *
 * - Native build: `react-native-mmkv` (sync C++ MMAP).
 * - Expo Go: AsyncStorage-backed shim with an in-memory cache hydrated at boot.
 *
 * Explored cells (offline business data) → `expo-sqlite`, never here.
 */
export interface PrefsStorage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

export const mmkvKeys = {
  language: "fogline.language",
  onboardingCompleted: "fogline.onboarding.completed",
  proximityOptIn: "fogline.proximity.opt-in",
  trackingEnabled: "fogline.exploration.tracking-enabled",
  syncCursor: "fogline.sync.cursor",
  lastFix: "fogline.exploration.last-fix",
} as const;

const ASYNC_STORAGE_PREFIX = "fogline.prefs:";

function createAsyncStorageShim(): PrefsStorage & { hydrate(): Promise<void> } {
  const cache = new Map<string, string>();
  let hydrated = false;

  const hydrate = async (): Promise<void> => {
    if (hydrated) return;
    const allKeys = await AsyncStorage.getAllKeys();
    const ownKeys = allKeys.filter((k) => k.startsWith(ASYNC_STORAGE_PREFIX));
    if (ownKeys.length > 0) {
      const entries = await AsyncStorage.multiGet(ownKeys);
      for (const [storageKey, value] of entries) {
        if (value === null) continue;
        cache.set(storageKey.slice(ASYNC_STORAGE_PREFIX.length), value);
      }
    }
    hydrated = true;
  };

  const flush = (key: string, value: string | null): void => {
    const storageKey = ASYNC_STORAGE_PREFIX + key;
    const promise =
      value === null
        ? AsyncStorage.removeItem(storageKey)
        : AsyncStorage.setItem(storageKey, value);
    promise.catch(() => undefined);
  };

  return {
    hydrate,
    getString(key) {
      return cache.get(key);
    },
    set(key, value) {
      cache.set(key, value);
      flush(key, value);
    },
    delete(key) {
      cache.delete(key);
      flush(key, null);
    },
  };
}

function createMmkvBackend(): PrefsStorage {
  const instance = new MMKV({ id: "fogline.prefs" });
  return {
    getString(key) {
      return instance.getString(key);
    },
    set(key, value) {
      instance.set(key, value);
    },
    delete(key) {
      instance.delete(key);
    },
  };
}

const shim = isExpoGo() ? createAsyncStorageShim() : null;

export const mmkv: PrefsStorage = shim ?? createMmkvBackend();

/** Hydrate the in-memory cache before any sync reader runs. No-op on native. */
export async function hydratePrefsStorage(): Promise<void> {
  if (shim) await shim.hydrate();
}

export function getBool(key: string): boolean {
  return mmkv.getString(key) === "true";
}

export function setBool(key: string, value: boolean): void {
  mmkv.set(key, value ? "true" : "false");
}
