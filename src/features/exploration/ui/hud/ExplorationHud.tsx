import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { CellGlyph } from "@/components/art/GlyphArt";
import { GlassPanel } from "@/components/primitives/GlassPanel";
import { Text } from "@/components/primitives/Text";
import { colors } from "@/theme/tokens";

import { AnimatedNumber } from "./AnimatedNumber";

export interface ExplorationHudProps {
  areaKm2: number;
  cellCount: number;
}

/**
 * Floating stat pills: how much territory the walk has uncovered. Compact and
 * right-sized rather than a full-width bar — the map is the subject, the HUD is
 * a badge on top of it. The area punches when new ground lands, so progress is
 * felt, not just displayed.
 */
export function ExplorationHud({ areaKm2, cellCount }: ExplorationHudProps) {
  const { t } = useTranslation("map");
  const punch = useSharedValue(1);

  useEffect(() => {
    if (cellCount === 0) return;
    punch.value = withSequence(
      withSpring(1.1, { damping: 10, stiffness: 320 }),
      withSpring(1, { damping: 14, stiffness: 220 }),
    );
  }, [cellCount, punch]);

  const punchStyle = useAnimatedStyle(() => ({ transform: [{ scale: punch.value }] }));

  return (
    <View className="flex-row items-stretch gap-2.5">
      <Animated.View style={punchStyle}>
        <GlassPanel className="px-4 py-2.5">
          <Text variant="label" tone="muted" weight="bold">
            {t("hud.explored")}
          </Text>
          <View className="flex-row items-baseline">
            <AnimatedNumber
              value={areaKm2}
              style={{
                fontSize: 28,
                lineHeight: 34,
                fontWeight: "800",
                color: colors.mint[500],
              }}
            />
            <Text variant="caption" tone="muted" weight="semibold" className="ml-1">
              km²
            </Text>
          </View>
        </GlassPanel>
      </Animated.View>

      <GlassPanel className="justify-center px-4 py-2.5">
        <View className="flex-row items-center gap-2">
          <CellGlyph size={22} />
          <Text variant="title" weight="bold">
            {cellCount}
          </Text>
        </View>
        <Text variant="label" tone="muted" weight="bold">
          {t("hud.cells")}
        </Text>
      </GlassPanel>
    </View>
  );
}
