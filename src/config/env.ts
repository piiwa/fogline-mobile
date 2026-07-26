import Constants from "expo-constants";

/**
 * Strongly-typed access to Expo runtime config (set by `app.config.ts`).
 * Read-only at runtime; `EXPO_PUBLIC_*` vars are forwarded into `extra`.
 */
interface FoglineEnv {
  apiBaseUrl: string;
  appEnv: "development" | "preview" | "production";
}

// The URL is resolved once in app.config.ts and baked into `extra`. Keeping a
// second table here would be a second source of truth that drifts.
/**
 * In development, `localhost` only resolves on the iOS simulator. On a physical
 * device it points at the device itself, so rewrite it to the host Metro is
 * served from (`hostUri`). No-op in preview/production.
 */
function resolveApiBaseUrl(url: string, appEnv: FoglineEnv["appEnv"]): string {
  if (!url) return "";
  if (appEnv !== "development" || !/localhost|127\.0\.0\.1/.test(url)) return url;
  const hostUri = (Constants.expoConfig as { hostUri?: string } | null)?.hostUri;
  const host = hostUri?.split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") return url;
  return url.replace(/localhost|127\.0\.0\.1/, host);
}

function readEnv(): FoglineEnv {
  const extra = (Constants.expoConfig?.extra ?? {}) as Partial<FoglineEnv>;
  const appEnv = (extra.appEnv as FoglineEnv["appEnv"]) ?? "development";
  return {
    apiBaseUrl: resolveApiBaseUrl(extra.apiBaseUrl ?? "", appEnv),
    appEnv,
  };
}

let _env: FoglineEnv | null = null;

export function getEnv(): FoglineEnv {
  if (_env === null) _env = readEnv();
  return _env;
}
