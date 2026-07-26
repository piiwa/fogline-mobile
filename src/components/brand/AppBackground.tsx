import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { colors } from "@/theme/tokens";

/**
 * Backdrop for the non-map screens: a bright sky with two soft colour blooms.
 *
 * The blooms are SVG radial gradients, not translucent circles. A circle with a
 * flat fill has a hard edge and reads as a shape; a gradient fading to zero
 * alpha reads as light. That difference is most of what separates a coloured
 * rectangle from an atmosphere.
 */
export function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={["#F7F5FF", colors.semantic.background, "#E7F6F2"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="mintBloom" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.mint[300]} stopOpacity="0.55" />
            <Stop offset="0.55" stopColor={colors.mint[300]} stopOpacity="0.18" />
            <Stop offset="1" stopColor={colors.mint[400]} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="mistBloom" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.mist[300]} stopOpacity="0.45" />
            <Stop offset="1" stopColor={colors.mist[400]} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="12%" cy="8%" rx="62%" ry="34%" fill="url(#mintBloom)" />
        <Ellipse cx="92%" cy="88%" rx="58%" ry="32%" fill="url(#mistBloom)" />
      </Svg>

      {children}
    </View>
  );
}
