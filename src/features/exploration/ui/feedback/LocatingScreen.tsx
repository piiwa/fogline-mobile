import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { CompassGlyph, FootprintGlyph } from "@/components/art/GlyphArt";
import { Text } from "@/components/primitives/Text";
import { colors } from "@/theme/tokens";

const RINGS = [0, 1, 2];
const RING_CYCLE_MS = 2100;

/**
 * What fills the screen while the first GPS fix is on its way.
 *
 * The map is deliberately NOT mounted behind this. `initialRegion` is read once
 * at creation and never again, so mounting the map before the position is known
 * means committing the camera to a guess — and the fog, which is sized from that
 * camera, ends up somewhere the walker is not. Waiting is not a nicety here, it
 * is what keeps the geometry coherent.
 *
 * The pulse is a compass sending out rings: exactly the gesture of a device
 * searching for itself, and it reads as looking rather than as loading.
 */
export function LocatingScreen({ unavailable = false }: { unavailable?: boolean }) {
  const { t } = useTranslation("map");

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        backgroundColor: colors.semantic.background,
      }}
    >
      <View style={{ width: 190, height: 190, alignItems: "center", justifyContent: "center" }}>
        {RINGS.map((index) => (
          <PulseRing key={index} index={index} paused={unavailable} />
        ))}

        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.semantic.surface,
            borderWidth: 3,
            borderColor: colors.mist[300],
            borderBottomWidth: 6,
            borderBottomColor: colors.mist[400],
            shadowColor: colors.mist[700],
            shadowOpacity: 0.22,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          {unavailable ? (
            <CompassGlyph size={44} color={colors.mist[400]} shade={colors.mist[600]} />
          ) : (
            <Bob>
              <FootprintGlyph size={44} color={colors.mint[400]} shade={colors.mint[600]} />
            </Bob>
          )}
        </View>
      </View>

      <View style={{ alignItems: "center", gap: 8, paddingHorizontal: 40 }}>
        <Text variant="subtitle" weight="bold">
          {t(unavailable ? "locating.unavailableTitle" : "locating.title")}
        </Text>
        <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>
          {t(unavailable ? "locating.unavailableBody" : "locating.body")}
        </Text>
      </View>
    </View>
  );
}

/** One expanding ring. Staggered against its siblings to read as a sequence. */
function PulseRing({ index, paused }: { index: number; paused: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (paused) return;
    progress.value = withDelay(
      (index * RING_CYCLE_MS) / RINGS.length,
      withRepeat(withTiming(1, { duration: RING_CYCLE_MS, easing: Easing.out(Easing.quad) }), -1),
    );
  }, [index, paused, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.45 + progress.value * 0.55 }],
    opacity: (1 - progress.value) * 0.55,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: 190,
          height: 190,
          borderRadius: 95,
          borderWidth: 2,
          borderColor: colors.mint[400],
        },
        style,
      ]}
    />
  );
}

function Bob({ children }: { children: React.ReactNode }) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [offset]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -offset.value * 4 }] }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
