import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { ExplorerScene } from "@/components/art/ExplorerScene";
import { FootprintGlyph, PocketGlyph, ShieldGlyph } from "@/components/art/GlyphArt";
import { AppBackground } from "@/components/brand/AppBackground";
import { Button } from "@/components/primitives/Button";
import { SafeScreen } from "@/components/primitives/SafeScreen";
import { Text } from "@/components/primitives/Text";
import { colors } from "@/theme/tokens";

/**
 * The hero: a walking core with mist rings blooming off it.
 *
 * Rings are staggered thirds of one LINEAR loop. The default easing decelerates
 * into the end of a cycle then snaps back to the start, which on a loop reads as
 * a stutter; linear plus stagger reads as a continuous pulse.
 */
function RevealOrb() {
  const progress = useSharedValue(0);
  const pop = useSharedValue(0.75);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.linear }),
      -1,
      false,
    );
    // A spring entrance costs nothing and is most of what makes an app feel
    // alive on first open.
    pop.value = withSpring(1, { damping: 9, stiffness: 130 });
  }, [progress, pop]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <Animated.View
      style={[
        { flex: 1, minHeight: 150, alignItems: "center", justifyContent: "center" },
        popStyle,
      ]}
    >
      {[0, 1, 2].map((i) => (
        <PulseRing key={i} progress={progress} delay={i / 3} />
      ))}
      <ExplorerScene size={178} />
    </Animated.View>
  );
}

/** One expanding ring, offset within the shared loop. */
function PulseRing({ progress, delay }: { progress: SharedValue<number>; delay: number }) {
  const style = useAnimatedStyle(() => {
    const t = (progress.value + delay) % 1;
    return {
      transform: [{ scale: 0.55 + t * 1.1 }],
      opacity: (1 - t) * 0.8,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: 168,
          height: 168,
          borderRadius: 84,
          borderWidth: 5,
          borderColor: colors.mist[300],
        },
        style,
      ]}
    />
  );
}

/** One selling point, as a chunky card that springs in. */
function PointRow({
  icon,
  label,
  tint,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  tint: string;
  index: number;
}) {
  const enter = useSharedValue(0);

  useEffect(() => {
    // Mass grows with position, so the three cards land in sequence rather than
    // as one block.
    enter.value = withSpring(1, { damping: 14, stiffness: 120, mass: 0.6 + index * 0.2 });
  }, [enter, index]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 18 }],
  }));

  return (
    <Animated.View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          backgroundColor: colors.semantic.surface,
          borderRadius: 20,
          padding: 10,
          borderBottomWidth: 3,
          borderBottomColor: colors.ink[100],
          shadowColor: colors.ink[700],
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          // Pale pad: the glyph brings its own colour, so a saturated disc
          // behind it would be colour on colour.
          backgroundColor: tint,
        }}
      >
        {icon}
      </View>
      <Text variant="caption" weight="medium" className="flex-1">
        {label}
      </Text>
    </Animated.View>
  );
}

export interface ValuePropScreenProps {
  onStart: () => void;
  isLoading?: boolean;
}

export function ValuePropScreen({ onStart, isLoading = false }: ValuePropScreenProps) {
  const { t } = useTranslation("onboarding");

  return (
    <AppBackground>
      {/*
        One screen, no scroll. An onboarding that scrolls buries its own call to
        action, so the layout is built to FIT: the hero takes the space that is
        left over (flex-1) instead of claiming a fixed height, and the copy and
        cards are sized to the smallest phone we support.
      */}
      <SafeScreen transparent>
        <View className="flex-1 justify-end gap-4 pb-2">
          <RevealOrb />

          <View className="gap-2">
            <Text variant="label" tone="mist" weight="bold">
              {t("value.eyebrow")}
            </Text>
            <Text variant="title" weight="bold">
              {t("value.title")}
            </Text>
            <Text variant="body" tone="muted">
              {t("value.subtitle")}
            </Text>

            <View className="mt-3 gap-2">
              <PointRow
                index={0}
                tint={colors.mint[100]}
                icon={<FootprintGlyph size={28} />}
                label={t("value.points.walk")}
              />
              <PointRow
                index={1}
                tint={colors.mist[100]}
                icon={<PocketGlyph size={28} />}
                label={t("value.points.background")}
              />
              <PointRow
                index={2}
                tint={colors.sunny[200]}
                icon={<ShieldGlyph size={28} />}
                label={t("value.points.privacy")}
              />
            </View>
          </View>

          <Button label={t("value.cta")} onPress={onStart} isLoading={isLoading} size="lg" />
        </View>
      </SafeScreen>
    </AppBackground>
  );
}
