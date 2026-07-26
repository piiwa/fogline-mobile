import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";

import { ChestGlyph, SparkGlyph } from "@/components/art/GlyphArt";
import { Button } from "@/components/primitives/Button";
import { Text } from "@/components/primitives/Text";
import { colors } from "@/theme/tokens";

import { POI_KIND, POI_RARITY, type PoiRarity } from "../../data/mock-pois";
import type { PoiMarker } from "../fog-geometry";

const RARITY_TINT: Record<PoiRarity, { fill: string; lip: string }> = {
  [POI_RARITY.Common]: { fill: colors.mint[400], lip: colors.mint[600] },
  [POI_RARITY.Rare]: { fill: colors.bubble[400], lip: colors.bubble[500] },
  [POI_RARITY.Legendary]: { fill: colors.sunny[400], lip: colors.sunny[600] },
};

export interface PoiSheetProps {
  poi: PoiMarker | null;
  onClose: () => void;
}

/**
 * What a tapped collectible says about itself.
 *
 * Deliberately a card, not a full sheet: the map is the subject, and the point
 * of opening a POI here is to confirm it is a real object with an identity —
 * not to open a second screen. Collecting is out of scope for this exercise and
 * the card says so plainly rather than offering a button that does nothing.
 */
export function PoiSheet({ poi, onClose }: PoiSheetProps) {
  const { t } = useTranslation("map");
  if (!poi) return null;

  const tint = RARITY_TINT[poi.rarity];

  return (
    <>
      {/* Tapping anywhere outside dismisses — the expected gesture for a card
          floating over content. */}
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(160)}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("poi.close")}
          onPress={onClose}
          style={{ flex: 1, backgroundColor: "rgba(27, 24, 57, 0.35)" }}
        />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(16)}
        exiting={SlideOutDown.duration(200)}
        style={{ position: "absolute", left: 16, right: 16, bottom: 28 }}
      >
        {/* A coloured shoulder peeking out from behind the card: the rarity is
            felt before it is read, and the card gains depth without a gradient. */}
        <View
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            top: -10,
            height: 60,
            borderRadius: 30,
            backgroundColor: tint.fill,
            opacity: 0.9,
          }}
        />
        <View
          style={{
            backgroundColor: colors.semantic.surface,
            borderRadius: 30,
            padding: 20,
            gap: 16,
            borderWidth: 2,
            borderColor: colors.ink[100],
            borderBottomWidth: 6,
            borderBottomColor: tint.lip,
            shadowColor: colors.ink[700],
            shadowOpacity: 0.25,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 10 },
            elevation: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 33,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.semantic.surface,
                borderWidth: 3,
                borderColor: tint.fill,
                borderBottomWidth: 5,
                borderBottomColor: tint.lip,
              }}
            >
              {poi.kind === POI_KIND.Chest ? (
                <ChestGlyph size={34} color={tint.fill} shade={tint.lip} />
              ) : (
                <SparkGlyph size={34} color={tint.fill} shade={tint.lip} />
              )}
            </View>

            <View style={{ flex: 1, gap: 3 }}>
              <Text variant="subtitle" weight="bold">
                {poi.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                    borderRadius: 999,
                    backgroundColor: tint.fill,
                  }}
                >
                  <Text variant="label" weight="bold" style={{ color: "#FFFFFF" }}>
                    {t(`poi.rarity.${poi.rarity}`)}
                  </Text>
                </View>
                <Text variant="caption" tone="muted">
                  {t(`poi.kind.${poi.kind}`)}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              backgroundColor: colors.mist[100],
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Text variant="caption" tone="muted">
              {t("poi.collectHint")}
            </Text>
          </View>

          <Button label={t("poi.close")} onPress={onClose} variant="outline" />
        </View>
      </Animated.View>
    </>
  );
}
