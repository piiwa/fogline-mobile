import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import { mmkv, mmkvKeys } from "@/storage/mmkv";

/**
 * Minimal device-scoped session.
 *
 * The exercise doesn't need real user auth — exploration is scoped to a device.
 * We mint a stable random device id (Keychain/Keystore), exchange it for a JWT
 * at `/auth/device`, and cache the token. Everything is best-effort: if the
 * backend is unreachable, `getAccessToken` returns null and sync simply no-ops
 * (offline-first, graceful degradation — AD-8).
 */
const DEVICE_ID_KEY = "fogline.device_id";

let _deviceId: string | null = null;
let _accessToken: string | null = null;

/**
 * The identity string doubles as a bearer secret: anyone holding it can read
 * that person's explored zones. `Math.random()` is not a CSPRNG and its output
 * is predictable from previous draws in several engines, so it has no business
 * minting one. `randomUUID` goes to the platform's secure generator.
 */
function randomId(): string {
  return Crypto.randomUUID();
}

/** The current identity, safe to display. Exported for the identity screen. */
export async function getDeviceId(): Promise<string> {
  if (_deviceId) return _deviceId;
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) {
    _deviceId = existing;
    return existing;
  }
  const id = randomId();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  _deviceId = id;
  return id;
}

/**
 * Exchanges a device id for a token.
 *
 * Injected rather than imported: the HTTP client needs the session (to attach a
 * bearer token) and the session needs the client (to mint one). Importing both
 * ways creates a require cycle, and Metro warns that one of the two modules
 * will observe the other as uninitialised — a crash that only shows up on the
 * first call. Wiring the direction at startup breaks it.
 */
type TokenExchange = (deviceId: string) => Promise<string>;

let _exchange: TokenExchange = async () => {
  throw new Error("Device token exchange not configured");
};

export function setTokenExchange(exchange: TokenExchange): void {
  _exchange = exchange;
}

export async function getAccessToken(): Promise<string | null> {
  if (_accessToken) return _accessToken;
  try {
    const deviceId = await getDeviceId();
    const res = await _exchange(deviceId);
    _accessToken = res;
    return _accessToken;
  } catch {
    // Backend down / offline → no token. Caller (sync) degrades gracefully.
    return null;
  }
}

export function clearAccessToken(): void {
  _accessToken = null;
}

/**
 * Adopt an identity minted on another device — the multi-device path.
 *
 * Exploration is scoped to an identity, not to a handset, so making two devices
 * converge is a matter of making them present the same one. There is no account
 * system here by choice, which leaves exactly one honest way to move an identity
 * across: show it, and let it be carried.
 *
 * The sync cursor is cleared along with the cached token. It counts positions in
 * the PREVIOUS identity's stream, and replaying it against another one would
 * skip everything before that number — the new device would silently receive
 * only the tail of a history it has none of.
 */
export async function adoptIdentity(identity: string): Promise<void> {
  const trimmed = identity.trim();
  if (trimmed.length === 0) return;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, trimmed);
  _deviceId = trimmed;
  _accessToken = null;
  mmkv.delete(mmkvKeys.syncCursor);
}
