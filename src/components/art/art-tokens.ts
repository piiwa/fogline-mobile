/**
 * The illustration system.
 *
 * Every drawn element in the app comes from here, so the art reads as one hand
 * rather than a pile of borrowed icons. Three rules define the style:
 *
 * 1. **Filled shapes, never hairlines.** Thin stroke icons disappear on a busy
 *    map and read as generic UI furniture. Everything is solid, with a chunky
 *    outline in the ink colour.
 * 2. **One outline weight everywhere.** A consistent keyline is what makes a set
 *    of drawings feel like a family — more than colour does.
 * 3. **A highlight on every volume.** A single pale shape offset toward the top
 *    left turns a flat blob into an object with a light source, which is most of
 *    what makes an illustration feel "cute" rather than "clip art".
 */
export const ART = {
  /** Outline weight, shared by every drawing. */
  stroke: 3,
  /** Outline colour — deep indigo, never pure black. */
  ink: "#26224C",
  /** The pale offset shape that gives a volume its light. */
  highlight: "rgba(255, 255, 255, 0.55)",
  /** Shadow tucked under a volume, in the same hue family as the ink. */
  shade: "rgba(38, 34, 76, 0.18)",
} as const;

/** The palette the drawings pull from, kept small on purpose. */
export const ART_COLORS = {
  mint: "#2BD9BC",
  mintDeep: "#0C9880",
  grape: "#8C7BEC",
  grapeDeep: "#5741C4",
  sun: "#FFC12E",
  sunDeep: "#C27F06",
  candy: "#FF5FA2",
  candyDeep: "#E93B85",
  cream: "#FFF6E9",
  paper: "#FFFFFF",
} as const;
