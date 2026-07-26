import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

import { deriveMode, nextAction } from "../engine/permission-machine";
import {
  PERM_STATUS,
  type PermAction,
  type PermMode,
  type PermSnapshot,
} from "../engine/permission.types";
import {
  getPermissionSnapshot,
  openSettings,
  requestBackground,
  requestForeground,
} from "../engine/permission-service";

const UNKNOWN: PermSnapshot = {
  foreground: PERM_STATUS.Undetermined,
  background: PERM_STATUS.Undetermined,
};

export interface UseLocationPermission {
  snapshot: PermSnapshot;
  mode: PermMode;
  action: PermAction;
  /** False until the first OS read completes — lets routers avoid a flash. */
  ready: boolean;
  askForeground: () => Promise<void>;
  askBackground: () => Promise<void>;
  openSettings: () => void;
  refresh: () => Promise<void>;
}

/**
 * Bridges the OS permission state to the pure state machine, and re-checks on
 * app foreground so a revocation in Settings gracefully drops the app to reduced
 * mode instead of silently breaking (AD-4).
 */
export function useLocationPermission(): UseLocationPermission {
  const [snapshot, setSnapshot] = useState<PermSnapshot>(UNKNOWN);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    setSnapshot(await getPermissionSnapshot());
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const askForeground = useCallback(async () => {
    setSnapshot(await requestForeground());
  }, []);

  const askBackground = useCallback(async () => {
    setSnapshot(await requestBackground());
  }, []);

  return {
    snapshot,
    mode: deriveMode(snapshot),
    action: nextAction(snapshot),
    ready,
    askForeground,
    askBackground,
    openSettings,
    refresh,
  };
}
