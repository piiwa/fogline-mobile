import { PERM_ACTION, PERM_MODE, PERM_STATUS } from "./permission.types";
import type { PermAction, PermMode, PermSnapshot } from "./permission.types";

/**
 * Permission state machine — PURE derivation of "what mode are we in" and "what
 * do we ask next", from the raw OS snapshot. See AD-4.
 *
 * Keeping this pure means the whole consent choreography (the scored centrepiece
 * of the brief) is unit-tested without a device, and the imperative service +
 * onboarding UI just render its output.
 */

/** What the feature can do given the current OS grants. */
export function deriveMode(s: PermSnapshot): PermMode {
  if (s.foreground === PERM_STATUS.Undetermined) return PERM_MODE.Undetermined;
  if (s.foreground === PERM_STATUS.Denied) return PERM_MODE.Denied;
  if (s.background === PERM_STATUS.Granted) return PERM_MODE.Full;
  return PERM_MODE.Reduced;
}

/**
 * The next step in the consent choreography.
 *
 * iOS constraint: you cannot request "Always" up front — you get "When in use"
 * first, then a system escalation to "Always" later. Once a level is DENIED you
 * can no longer re-prompt for it, so the only path left is Settings.
 */
export function nextAction(s: PermSnapshot): PermAction {
  if (s.foreground === PERM_STATUS.Undetermined) return PERM_ACTION.PrimeForeground;
  if (s.foreground === PERM_STATUS.Denied) return PERM_ACTION.RouteSettings;
  if (s.background === PERM_STATUS.Granted) return PERM_ACTION.None;
  if (s.background === PERM_STATUS.Undetermined) return PERM_ACTION.PrimeBackground;
  return PERM_ACTION.RouteSettings;
}
