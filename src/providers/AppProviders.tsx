import type { i18n as I18nInstance } from "i18next";
import { useCallback, useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BootFailed, BootLoading } from "@/components/feedback/BootScreen";
import { initializeFeatures } from "@/config/features";
import { initializeRuntimeConfig } from "@/config/runtime.config";
import { getExplorationStore } from "@/features/exploration/data/exploration.database";
import { initializeI18n } from "@/i18n/i18n.config";
import { hydratePrefsStorage } from "@/storage/mmkv";
import { ThemeProvider } from "@/theme/theme.context";

type BootState =
  | { status: "loading" }
  | { status: "ready"; i18n: I18nInstance }
  | { status: "failed"; error: Error };

/** Longest the app may sit on the boot screen before it admits it is stuck. */
const BOOT_TIMEOUT_MS = 12_000;

/**
 * Fail rather than hang.
 *
 * Every step below touches something that can be slow or absent on a real
 * device — a filesystem, a database file, a bundled asset. Awaiting them with
 * no ceiling means one unresolved promise leaves the app on its loading colour
 * with no error, no spinner change, and nothing for a tester to report beyond
 * "it is stuck". A timeout converts that silence into a message.
 */
function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Boot step timed out: ${label}`)), BOOT_TIMEOUT_MS),
    ),
  ]);
}

/**
 * Root composition of global providers.
 *
 * The async bootstrap (prefs hydration, runtime config, features, SQLite, i18n)
 * runs once and gates children behind a boot screen, so screens never render
 * against half-initialised globals. Failure is a first-class outcome: it is
 * caught, named, and shown, with a retry that re-runs the whole sequence.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BootState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await withTimeout(hydratePrefsStorage(), "preferences");
        initializeRuntimeConfig();
        initializeFeatures();
        await withTimeout(getExplorationStore(), "database");
        const instance = await withTimeout(initializeI18n(), "translations");
        if (!cancelled) setState({ status: "ready", i18n: instance });
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("[Fogline] bootstrap failed", error);
        setState({ status: "failed", error });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (state.status === "loading") return <BootLoading />;
  if (state.status === "failed") return <BootFailed error={state.error} onRetry={retry} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={state.i18n}>
          <ThemeProvider>{children}</ThemeProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
