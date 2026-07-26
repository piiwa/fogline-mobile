import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

import { ART, ART_COLORS } from "./art-tokens";

export interface ExplorerSceneProps {
  size?: number;
}

/**
 * The onboarding hero: a little world half-eaten by mist, with a trail of
 * footprints walking out of it.
 *
 * This is the one drawing that has to carry the idea in a single glance, so it
 * states the whole product in shapes: a bright globe (what you can see), a
 * lavender cloud lying across it (what you cannot), and prints crossing the
 * boundary (how you change that). An icon in a circle could never say that —
 * which is exactly why the screen felt empty before.
 */
export function ExplorerScene({ size = 240 }: ExplorerSceneProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Defs>
        <LinearGradient id="globe" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={ART_COLORS.mint} />
          <Stop offset="1" stopColor="#12BFA2" />
        </LinearGradient>
        <LinearGradient id="cloud" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#CFC8FA" />
          <Stop offset="1" stopColor={ART_COLORS.grape} />
        </LinearGradient>
        <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={ART_COLORS.mint} stopOpacity="0.35" />
          <Stop offset="1" stopColor={ART_COLORS.mint} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Glow behind everything, so the scene sits in light rather than on a flat field */}
      <Circle cx="120" cy="120" r="112" fill="url(#halo)" />

      {/* The globe */}
      <Circle cx="120" cy="122" r="78" fill={ART_COLORS.mintDeep} />
      <Circle cx="120" cy="118" r="78" fill="url(#globe)" />

      {/* Land masses — soft blobs, not a real map: it reads as "a world", not "Earth" */}
      <Path
        d="M78 96c14-10 30-6 36 4s-4 20-18 22-26-4-28-12 2-10 10-14z"
        fill={ART_COLORS.cream}
        opacity={0.9}
      />
      <Path
        d="M132 140c12-6 26-2 28 8s-10 16-22 14-18-6-16-14 4-6 10-8z"
        fill={ART_COLORS.cream}
        opacity={0.85}
      />
      <Ellipse cx="92" cy="150" rx="14" ry="9" fill={ART_COLORS.cream} opacity={0.75} />

      {/* Specular highlight — one pale shape is what turns a disc into a sphere */}
      <Ellipse
        cx="92"
        cy="82"
        rx="26"
        ry="16"
        fill={ART.highlight}
        opacity={0.55}
        transform="rotate(-25 92 82)"
      />

      {/* The mist, lying across the lower half */}
      <G opacity={0.94}>
        <Path
          d="M42 150c8-14 26-16 36-8 6-14 28-16 38-6 10-8 26-4 30 8 12-2 22 6 22 16 0 14-14 22-32 22H62c-18 0-30-10-30-22 0-4 4-8 10-10z"
          fill={ART_COLORS.grapeDeep}
        />
        <Path
          d="M42 147c8-14 26-16 36-8 6-14 28-16 38-6 10-8 26-4 30 8 12-2 22 6 22 16 0 14-14 22-32 22H62c-18 0-30-10-30-22 0-4 4-8 10-10z"
          fill="url(#cloud)"
        />
        <Ellipse cx="72" cy="158" rx="16" ry="8" fill={ART.highlight} opacity={0.5} />
      </G>

      {/* Footprints walking out of the mist, toward the light */}
      <G>
        <Ellipse cx="150" cy="196" rx="7" ry="9.5" fill={ART_COLORS.grapeDeep} opacity={0.45} />
        <Ellipse cx="170" cy="184" rx="7" ry="9.5" fill={ART_COLORS.grape} opacity={0.75} />
        <Ellipse cx="190" cy="170" rx="7" ry="9.5" fill={ART_COLORS.grape} />
        <Ellipse cx="188" cy="166" rx="2.6" ry="3.2" fill={ART.highlight} />
      </G>

      {/* A collectible peeking out of the cleared side */}
      <G>
        <Path
          d="M176 62c1.4 7.6 5.6 11.8 13.2 13.2-7.6 1.4-11.8 5.6-13.2 13.2-1.4-7.6-5.6-11.8-13.2-13.2 7.6-1.4 11.8-5.6 13.2-13.2z"
          fill={ART_COLORS.candyDeep}
        />
        <Path
          d="M176 60c1.4 7.6 5.6 11.8 13.2 13.2-7.6 1.4-11.8 5.6-13.2 13.2-1.4-7.6-5.6-11.8-13.2-13.2 7.6-1.4 11.8-5.6 13.2-13.2z"
          fill={ART_COLORS.candy}
        />
      </G>
    </Svg>
  );
}
