/**
 * Jest global setup (runs before each test file).
 *
 * Installs the same TextDecoder polyfill the app entry uses, so tests exercise
 * the production code path rather than a test-only shim — h3-js needs a UTF-16
 * decoder at import time and neither Hermes nor jsdom's jest-expo environment
 * provides one. See src/polyfills/text-decoder.ts.
 */
require("./src/polyfills/text-decoder");
