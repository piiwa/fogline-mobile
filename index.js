/**
 * App entry.
 *
 * The polyfill import MUST stay first: h3-js constructs a UTF-16 `TextDecoder`
 * at module-evaluation time, and Expo's runtime throws on that encoding. ES
 * imports are evaluated in source order, so importing the (side-effecting)
 * polyfill above the router is what guarantees the patch is installed before any
 * screen — and therefore h3-js — is pulled in.
 */
import "./src/polyfills/text-decoder";

/**
 * Registering the background location task, from the ENTRY POINT.
 *
 * `TaskManager.defineTask` lives at the module scope of the location engine, and
 * that module was previously only reachable through the map screen. Expo Router
 * loads routes lazily, so when the OS relaunches the app headless after the
 * process has died — precisely the case this feature exists for — no React root
 * is mounted, the screen is never evaluated, and the task is never defined.
 * TaskManager then finds no handler for the registered task and can unregister
 * it, killing background exploration until the next manual launch.
 *
 * A side-effect import here is what guarantees the definition exists before any
 * navigation happens. It sits below the polyfill because the engine pulls in
 * h3-js transitively.
 */
import "./src/features/exploration/engine/location-engine";

import "expo-router/entry";
