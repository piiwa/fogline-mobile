import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { CompassGlyph } from "@/components/art/GlyphArt";
import { GlassPanel } from "@/components/primitives/GlassPanel";
import { Text } from "@/components/primitives/Text";
import { colors } from "@/theme/tokens";

import { onCellsRevealed } from "../../engine/location-engine";

export interface RevealFxProps {
  /** Distance from the top so the card never collides with the HUD. */
  topOffset: number;
}

/**
 * Celebration when new territory is uncovered: a soft aurora vignette breathing
 * in from the screen edges (never a flat wash over the chrome), a success
 * haptic, and a card that springs in and settles back out.
 *
 * All motion runs on the Reanimated UI thread so the map keeps its frame budget.
 */
export function RevealFx({ topOffset }: RevealFxProps) {
  const { t } = useTranslation("map");
  const vignette = useSharedValue(0);
  const card = useSharedValue(0);
  const [cellsAdded, setCellsAdded] = useState(0);

  const celebrate = useCallback(
    (count: number) => {
      setCellsAdded(count);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      vignette.value = withSequence(
        withTiming(1, { duration: 220 }),
        withTiming(0, { duration: 900 }),
      );
      card.value = withSequence(
        withSpring(1, { damping: 14, stiffness: 180 }),
        withTiming(1, { duration: 1400 }),
        withTiming(0, { duration: 380 }),
      );
    },
    [vignette, card],
  );

  useEffect(() => onCellsRevealed((cells) => celebrate(cells.length)), [celebrate]);

  const vignetteStyle = useAnimatedStyle(() => ({ opacity: vignette.value * 0.55 }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [{ translateY: (1 - card.value) * -14 }, { scale: 0.96 + card.value * 0.04 }],
  }));

  return (
    <>
      {/* Edge-lit vignette: colour blooms from the borders, the centre (the map)
          stays untouched — the opposite of a full-screen tint. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, vignetteStyle]}>
        <LinearGradient
          colors={[colors.mint[400], "transparent", colors.mist[400]]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", top: topOffset, left: 0, right: 0, alignItems: "center" },
          cardStyle,
        ]}
      >
        <GlassPanel>
          <View className="flex-row items-center gap-2.5">
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${colors.mint[400]}33` }}
            >
              <CompassGlyph size={24} />
            </View>
            <View>
              <Text variant="caption" weight="semibold" tone="mint">
                {t("reveal.toast")}
              </Text>
              <Text variant="label" tone="muted">
                +{cellsAdded} {t("hud.cells")}
              </Text>
            </View>
          </View>
        </GlassPanel>
      </Animated.View>
    </>
  );
}
