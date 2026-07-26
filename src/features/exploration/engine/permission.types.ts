/**
 * Location permission model — shared by the pure state machine
 * (`permission-machine.ts`) and the imperative service (`permission-service.ts`).
 */

export const PERM_STATUS = {
  Granted: "granted",
  Denied: "denied",
  Undetermined: "undetermined",
} as const;

export type PermStatus = (typeof PERM_STATUS)[keyof typeof PERM_STATUS];

/** Raw OS view: foreground ("When in use") vs background ("Always"). */
export interface PermSnapshot {
  foreground: PermStatus;
  background: PermStatus;
}

/**
 * What the feature can do right now.
 * - `undetermined` : nothing asked yet.
 * - `full`         : background granted → reveal works app-closed.
 * - `reduced`      : foreground only → reveal works only while app is open.
 * - `denied`       : location refused → map still renders, no reveal.
 */
export const PERM_MODE = {
  Undetermined: "undetermined",
  Reduced: "reduced",
  Full: "full",
  Denied: "denied",
} as const;

export type PermMode = (typeof PERM_MODE)[keyof typeof PERM_MODE];

/**
 * The next choreography step (AD-4). iOS forbids asking for "Always" directly:
 * you get "When in use" first, then escalate to "Always" at a value moment.
 */
export const PERM_ACTION = {
  PrimeForeground: "prime-foreground",
  PrimeBackground: "prime-background",
  RouteSettings: "route-settings",
  None: "none",
} as const;

export type PermAction = (typeof PERM_ACTION)[keyof typeof PERM_ACTION];
