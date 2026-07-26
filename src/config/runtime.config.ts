/**
 * Runtime app config — lazy-initialized once at startup.
 *
 * Do NOT call `getConfig()` at module top-level — only inside functions, hooks,
 * or component bodies (mirrors the web core-frontend pattern).
 */
import { getEnv } from "./env";

interface FoglineRuntimeConfig {
  apiBaseUrl: string;
}

let _config: FoglineRuntimeConfig | null = null;

export function initializeRuntimeConfig(overrides: Partial<FoglineRuntimeConfig> = {}): void {
  const env = getEnv();
  _config = Object.freeze({
    apiBaseUrl: env.apiBaseUrl,
    ...overrides,
  });
}

export function getConfig(): FoglineRuntimeConfig {
  if (_config === null) initializeRuntimeConfig();
  return _config as FoglineRuntimeConfig;
}
