import { useEffect } from "react";
import { TextInput, type TextStyle } from "react-native";
import Animated, { useAnimatedProps, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export interface AnimatedNumberProps {
  value: number;
  digits?: number;
  style?: TextStyle;
}

/**
 * A number that springs to its new value instead of snapping.
 *
 * Implemented over a read-only `TextInput` because its `text` prop is settable
 * from the UI thread via `useAnimatedProps` — a `<Text>` child cannot be, and
 * would force a JS-thread re-render on every frame while the map is drawing.
 */
export function AnimatedNumber({ value, digits = 2, style }: AnimatedNumberProps) {
  const progress = useSharedValue(value);

  useEffect(() => {
    progress.value = withSpring(value, { damping: 18, stiffness: 90 });
  }, [value, progress]);

  const animatedProps = useAnimatedProps(() => {
    const text = progress.value.toFixed(digits);
    return { text, defaultValue: text };
  });

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[{ padding: 0, fontVariant: ["tabular-nums"] }, style]}
      animatedProps={animatedProps}
    />
  );
}
