/**
 * Fogline palette — playful, saturated, high-contrast.
 *
 * Design intent: the world you have walked is BRIGHT and full of colour; the
 * unknown is a soft lavender cloud, not a black mask. Darkness reads as "broken
 * screen"; a pastel mist reads as "there is something there you haven't seen
 * yet", which is the feeling the whole feature is selling.
 *
 * Mirrored in tailwind.config.ts — both must stay in sync.
 */
export const colors = {
  /** Text and deep contrast. Indigo-black, never neutral grey. */
  ink: {
    50: "#F4F4FB",
    100: "#E5E5F5",
    200: "#C9C9E6",
    300: "#9E9ECB",
    400: "#6F6FA8",
    500: "#4A4A85",
    600: "#343064",
    700: "#26224C",
    800: "#1B1839",
    900: "#12102A",
  },
  /** The mist. Periwinkle → deep grape as it thickens. */
  mist: {
    100: "#E9E6FD",
    200: "#CFC8FA",
    300: "#AEA2F4",
    400: "#8C7BEC",
    500: "#6E5AE0",
    600: "#5741C4",
    700: "#43319B",
  },
  /** Primary accent — electric mint. The colour of "revealed". */
  mint: {
    100: "#D6FBF3",
    200: "#9DF5E4",
    300: "#5FEBD2",
    400: "#2BD9BC",
    500: "#12BFA2",
    600: "#0C9880",
  },
  /** Chests and rewards. */
  sunny: {
    200: "#FFE9A8",
    300: "#FFD65C",
    400: "#FFC12E",
    500: "#F0A50E",
    600: "#C27F06",
  },
  /** Collectibles / WeCards. */
  bubble: {
    200: "#FFC7DE",
    300: "#FF93C0",
    400: "#FF5FA2",
    500: "#E93B85",
  },
  semantic: {
    background: "#EFF3FB",
    surface: "#FFFFFF",
    foreground: "#1B1839",
    muted: "#6F6FA8",
    border: "#DCE1F0",
    success: "#12BFA2",
    warning: "#FFC12E",
    danger: "#FF5D6C",
  },
} as const;

/**
 * Gradient pairs. Every gradient runs mint → grape: the same journey the map
 * makes from revealed ground into the mist.
 */
export const gradients = {
  primary: [colors.mint[300], colors.mist[400]],
  reveal: [colors.mint[200], colors.mint[400]],
  reward: [colors.sunny[300], colors.bubble[400]],
} as const;
