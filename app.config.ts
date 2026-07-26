import type { ExpoConfig } from "expo/config";

import baseConfig from "./app.json";

/**
 * Dynamic Expo config — overrides static `app.json` with env-driven values.
 *
 * Build-time variables:
 * - `EAS_PROJECT_ID`            — overrides the project id linked in app.json
 * - `APP_ENV`                   — "development" | "preview" | "production"
 * - `EXPO_PUBLIC_API_BASE_URL`  — sync backend base URL (forwarded to `extra`)
 */
const APP_ENVS = ["development", "preview", "production"] as const;
type AppEnv = (typeof APP_ENVS)[number];

/**
 * Where the sync API lives, resolved once at build time.
 *
 * Only development gets a fallback. A build that ships without
 * EXPO_PUBLIC_API_BASE_URL gets an empty string, and the app runs offline-only —
 * an explicit, documented state. Defaulting a release build to `localhost`
 * instead would look configured while every request quietly failed.
 */
const DEV_API_URL = "http://localhost:8250/api/v1";

function resolveApiBaseUrl(appEnv: AppEnv): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) return configured;
  return appEnv === "development" ? DEV_API_URL : "";
}

export default ({ config }: { config: ExpoConfig }): ExpoConfig => {
  const base = (baseConfig as { expo: ExpoConfig }).expo;
  const appEnv = (process.env.APP_ENV ?? "development") as AppEnv;
  // No placeholder fallback: a fake project id makes `eas init` believe the
  // app is already linked and fail, and it silently points updates at a project
  // that does not exist. Absent is a better state than wrong.
  const easProjectId = process.env.EAS_PROJECT_ID;

  const bundleSuffix = appEnv === "production" ? "" : `.${appEnv}`;
  const displayName =
    appEnv === "production" ? "Fogline" : `Fogline (${appEnv === "preview" ? "Preview" : "Dev"})`;

  return {
    ...base,
    ...config,
    name: displayName,
    ios: {
      ...base.ios,
      bundleIdentifier: `${base.ios?.bundleIdentifier}${bundleSuffix}`,
    },
    android: {
      ...base.android,
      package: `${base.android?.package}${bundleSuffix}`,
    },
    extra: {
      ...base.extra,
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
      apiBaseUrl: resolveApiBaseUrl(appEnv),
      appEnv,
    },
  };
};
