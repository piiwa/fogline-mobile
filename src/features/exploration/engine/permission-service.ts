import * as Location from "expo-location";
import { Linking } from "react-native";

import { PERM_STATUS, type PermSnapshot, type PermStatus } from "./permission.types";

/**
 * Imperative permission calls (shell). Reads/requests OS location permissions
 * and maps them to the pure `PermSnapshot` the state machine consumes (AD-4).
 */
function mapStatus(status: Location.PermissionStatus, granted: boolean): PermStatus {
  if (granted) return PERM_STATUS.Granted;
  if (status === Location.PermissionStatus.DENIED) return PERM_STATUS.Denied;
  return PERM_STATUS.Undetermined;
}

export async function getPermissionSnapshot(): Promise<PermSnapshot> {
  const fg = await Location.getForegroundPermissionsAsync();
  let background: PermStatus = PERM_STATUS.Undetermined;
  try {
    const bg = await Location.getBackgroundPermissionsAsync();
    background = mapStatus(bg.status, bg.granted);
  } catch {
    // Background permission not configured / unavailable → treat as undetermined.
  }
  return { foreground: mapStatus(fg.status, fg.granted), background };
}

export async function requestForeground(): Promise<PermSnapshot> {
  await Location.requestForegroundPermissionsAsync();
  return getPermissionSnapshot();
}

export async function requestBackground(): Promise<PermSnapshot> {
  try {
    await Location.requestBackgroundPermissionsAsync();
  } catch {
    // On Android 11+ the OS won't prompt for "Allow all the time" — the caller
    // routes the user to Settings instead (see nextAction → RouteSettings).
  }
  return getPermissionSnapshot();
}

export function openSettings(): void {
  void Linking.openSettings();
}
