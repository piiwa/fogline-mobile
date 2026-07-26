import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { ART, ART_COLORS } from "./art-tokens";

/**
 * The app's drawn glyphs — one family, one hand.
 *
 * These replace the stroke icon set. A library icon is a hairline outline
 * designed to sit quietly in a toolbar; on a colourful map it vanishes, and a
 * screen full of them looks assembled rather than designed. Each glyph here is
 * built from solid shapes with a shared keyline weight and a highlight, so a
 * footprint, a bell and a chest visibly belong to the same world.
 */
export interface GlyphProps {
  size?: number;
  /** Main fill. Defaults to the glyph's own signature colour. */
  color?: string;
  /** Deeper tone for the shaded side. */
  shade?: string;
  /**
   * Draw in white for a coloured background.
   *
   * A glyph keeps its signature colour by default, which vanishes the moment it
   * sits on a surface of that same colour — an active control leaves only the
   * highlight visible, so the drawing reads as broken rather than as itself.
   */
  onColor?: boolean;
}

/** Resolve the two fills, honouring `onColor`. */
function tones(
  color: string | undefined,
  shade: string | undefined,
  onColor: boolean | undefined,
  defaultColor: string,
  defaultShade: string,
): { fill: string; deep: string } {
  if (onColor) {
    return { fill: ART_COLORS.paper, deep: "rgba(255, 255, 255, 0.55)" };
  }
  return { fill: color ?? defaultColor, deep: shade ?? defaultShade };
}

const DEFAULT_SIZE = 28;

/** Two rounded prints, one ahead of the other — the walking mark. */
export function FootprintGlyph({ size = DEFAULT_SIZE, color, shade, onColor }: GlyphProps) {
  const { fill, deep } = tones(color, shade, onColor, ART_COLORS.grape, ART_COLORS.grapeDeep);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G>
        {/* Back print */}
        <Ellipse cx="15" cy="30" rx="8" ry="11" fill={deep} />
        <Ellipse cx="15" cy="28.5" rx="8" ry="11" fill={fill} />
        <Ellipse cx="12.5" cy="24" rx="3" ry="3.6" fill={ART.highlight} />
        {/* Front print */}
        <Ellipse cx="33" cy="20" rx="8" ry="11" fill={deep} />
        <Ellipse cx="33" cy="18.5" rx="8" ry="11" fill={fill} />
        <Ellipse cx="30.5" cy="14" rx="3" ry="3.6" fill={ART.highlight} />
      </G>
    </Svg>
  );
}

/** A round bell with a clapper — proximity alerts. */
export function BellGlyph({ size = DEFAULT_SIZE, color, shade, onColor }: GlyphProps) {
  const { fill, deep } = tones(color, shade, onColor, ART_COLORS.sun, ART_COLORS.sunDeep);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M24 7c-8 0-13 6-13 14v7l-4 6h34l-4-6v-7c0-8-5-14-13-14z" fill={deep} />
      <Path d="M24 6c-8 0-13 6-13 14v7l-4 6h34l-4-6v-7c0-8-5-14-13-14z" fill={fill} />
      <Path
        d="M17 15c1.5-3.5 4-5.5 7-6"
        stroke={ART.highlight}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="24" cy="39" r="5" fill={deep} />
      <Circle cx="24" cy="38.5" r="4.5" fill={fill} />
    </Svg>
  );
}

/** A four-point sparkle — a collectible card. */
export function SparkGlyph({ size = DEFAULT_SIZE, color, shade, onColor }: GlyphProps) {
  const { fill, deep } = tones(color, shade, onColor, ART_COLORS.candy, ART_COLORS.candyDeep);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        d="M24 5c2 11 8 17 19 19-11 2-17 8-19 19-2-11-8-17-19-19 11-2 17-8 19-19z"
        fill={deep}
      />
      <Path
        d="M24 4c2 11 8 17 19 19-11 2-17 8-19 19-2-11-8-17-19-19 11-2 17-8 19-19z"
        fill={fill}
      />
      <Circle cx="18" cy="18" r="3" fill={ART.highlight} />
    </Svg>
  );
}

/** A lidded chest with a clasp — a reward. */
export function ChestGlyph({ size = DEFAULT_SIZE, color, shade, onColor }: GlyphProps) {
  const { fill, deep } = tones(color, shade, onColor, ART_COLORS.sun, ART_COLORS.sunDeep);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x="7" y="22" width="34" height="18" rx="5" fill={deep} />
      <Rect x="7" y="21" width="34" height="17" rx="5" fill={fill} />
      <Path d="M7 22c0-7 7-12 17-12s17 5 17 12z" fill={deep} />
      <Path d="M8 21c0-6.5 6.5-11 16-11s16 4.5 16 11z" fill={fill} />
      <Rect x="20" y="18" width="8" height="12" rx="3" fill={deep} />
      <Path
        d="M14 15c2.5-2 5.5-3 9-3"
        stroke={ART.highlight}
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** A shield with a tick — the privacy promise. */
export function ShieldGlyph({ size = DEFAULT_SIZE, color, shade, onColor }: GlyphProps) {
  const { fill, deep } = tones(color, shade, onColor, ART_COLORS.mint, ART_COLORS.mintDeep);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M24 5l15 6v13c0 10-7 16-15 20-8-4-15-10-15-20V11z" fill={deep} />
      <Path d="M24 4l15 6v13c0 10-7 16-15 20-8-4-15-10-15-20V10z" fill={fill} />
      <Path
        d="M16 23l6 6 11-12"
        stroke={ART_COLORS.paper}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * A phone in a pocket, still counting — "it keeps going with the app closed".
 *
 * The moon that used to carry this line read as NIGHT rather than as background
 * work, which is a different promise entirely. A dark screen with steps rising
 * out of it says the thing the sentence actually claims: you put the phone away,
 * and the walking still registers.
 */
export function PocketGlyph({ size = DEFAULT_SIZE, color, shade, onColor }: GlyphProps) {
  const { fill, deep } = tones(color, shade, onColor, ART_COLORS.grape, ART_COLORS.grapeDeep);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* The handset, screen off */}
      <Rect x="9" y="9" width="21" height="33" rx="6" fill={deep} />
      <Rect x="9" y="7" width="21" height="33" rx="6" fill={fill} />
      <Rect x="12.5" y="11" width="14" height="24" rx="3.5" fill={ART.ink} opacity={0.32} />
      <Ellipse
        cx="15"
        cy="15"
        rx="2.4"
        ry="3.4"
        fill={ART.highlight}
        transform="rotate(-25 15 15)"
      />
      {/* Steps still registering, rising away from the sleeping screen */}
      <Circle cx="36" cy="30" r="3" fill={fill} />
      <Circle cx="40" cy="21" r="2.4" fill={fill} opacity={0.8} />
      <Circle cx="37" cy="12" r="1.8" fill={fill} opacity={0.55} />
    </Svg>
  );
}

/** A compass rose — the background-exploration prompt. */
export function CompassGlyph({ size = DEFAULT_SIZE, color, shade, onColor }: GlyphProps) {
  const { fill, deep } = tones(color, shade, onColor, ART_COLORS.grape, ART_COLORS.grapeDeep);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx="24" cy="25" r="19" fill={deep} />
      <Circle cx="24" cy="24" r="19" fill={fill} />
      <Circle cx="24" cy="24" r="14" fill={ART_COLORS.paper} />
      {/* Needle: the lit half points where you have not been yet */}
      <Path d="M24 12l5 12-5 12-5-12z" fill={ART_COLORS.candy} />
      <Path d="M24 24l5-12-5 12z" fill={ART_COLORS.candyDeep} />
      <Circle cx="24" cy="24" r="3" fill={deep} />
      <Ellipse cx="16" cy="15" rx="4" ry="2.6" fill={ART.highlight} transform="rotate(-30 16 15)" />
    </Svg>
  );
}

/** A hexagon — one explored cell, the unit the whole feature is built on. */
export function CellGlyph({ size = DEFAULT_SIZE, color, shade, onColor }: GlyphProps) {
  const { fill, deep } = tones(color, shade, onColor, ART_COLORS.grape, ART_COLORS.grapeDeep);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M24 6l16 9.5v19L24 44 8 34.5v-19z" fill={deep} />
      <Path d="M24 5l16 9.5v19L24 43 8 33.5v-19z" fill={fill} />
      <Path
        d="M14 17l10-6 10 6"
        stroke={ART.highlight}
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** A crosshair over a dot — recentre the map on the walker. */
export function LocateGlyph({ size = DEFAULT_SIZE, color, shade, onColor }: GlyphProps) {
  const { fill, deep } = tones(color, shade, onColor, ART_COLORS.mint, ART_COLORS.mintDeep);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx="24" cy="24" r="13" fill="none" stroke={deep} strokeWidth={4} />
      <Circle cx="24" cy="24" r="13" fill="none" stroke={fill} strokeWidth={3} />
      <Circle cx="24" cy="24" r="5.5" fill={fill} />
      <Path
        d="M24 3v7M24 38v7M3 24h7M38 24h7"
        stroke={fill}
        strokeWidth={4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
