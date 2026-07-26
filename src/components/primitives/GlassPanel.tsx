import { View, type ViewProps } from "react-native";

import { colors } from "@/theme/tokens";
import { cn } from "@/utils/string";

/**
 * A chunky white card that floats over the map.
 *
 * Deliberately NOT a native blur. `BlurView` renders as an opaque black
 * rectangle on the iOS simulator and on some device configurations, turning
 * every floating panel into a black box — a failure mode that shows up on
 * exactly the machine a reviewer is most likely to use. An opaque card with a
 * soft shadow is legible everywhere, and over a bright map it reads better.
 *
 * The bottom "lip" — a thicker, darker bottom border — is what gives the card
 * physical depth instead of a flat rectangle stuck on the screen.
 */
export function GlassPanel({ className, children, style, ...rest }: ViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.semantic.surface,
          borderRadius: 24,
          borderBottomWidth: 3,
          borderBottomColor: colors.ink[100],
          shadowColor: colors.ink[700],
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        },
        style,
      ]}
      {...rest}
    >
      <View className={cn("px-4 py-3", className)}>{children}</View>
    </View>
  );
}
