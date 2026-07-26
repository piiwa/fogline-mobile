/**
 * Static feature flags — frozen at app boot. Pattern ported from core-frontend.
 * Never call `getFeatures()` at module top-level.
 */
export interface FoglineFeatures {
  exploration: {
    /** Cross-device sync of the explored set. Off ⇒ purely local exploration. */
    syncEnabled: boolean;
  };
}

const defaults: FoglineFeatures = {
  exploration: { syncEnabled: true },
};

let _features: FoglineFeatures | null = null;

function deepMerge<T>(base: T, override: Partial<T>): T {
  if (typeof base !== "object" || base === null) return override as T;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      key in result &&
      typeof result[key] === "object" &&
      result[key] !== null
    ) {
      result[key] = deepMerge(result[key], value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export function initializeFeatures(overrides: Partial<FoglineFeatures> = {}): void {
  _features = Object.freeze(deepMerge(defaults, overrides));
}

export function getFeatures(): FoglineFeatures {
  if (_features === null) initializeFeatures();
  return _features as FoglineFeatures;
}
