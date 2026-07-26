import { colorScheme as nwColorScheme } from "nativewind";

// Fogline is light-only by design: the walked world is bright and colourful and
// the mist supplies the contrast. Pinning NativeWind's scheme at module load
// stops a dark frame rendering before mount; `app.json` locks it too.
nwColorScheme.set("light");

/** Thin passthrough so the provider tree stays uniform with the dailo pattern. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
