import * as Haptics from "expo-haptics";
import { Pressable, type PressableProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends PressableProps {
  /** How far it compresses on press. */
  scaleTo?: number;
  /** Haptic on press-in. Set false for destructive/secondary affordances. */
  haptic?: boolean;
  className?: string;
}

/**
 * Pressable with a spring compression + haptic tick. Runs entirely on the UI
 * thread (Reanimated), so touch feedback stays instant even while the map is
 * re-rendering on the JS thread — the cheapest way to make an app feel native.
 */
export function PressableScale({
  scaleTo = 0.94,
  haptic = true,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={style}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 400 });
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 12, stiffness: 260 });
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
