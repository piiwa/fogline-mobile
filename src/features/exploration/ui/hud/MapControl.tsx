import { View } from "react-native";

import { PressableScale } from "@/components/primitives/PressableScale";
import { Text } from "@/components/primitives/Text";
import { colors } from "@/theme/tokens";

export interface MapControlProps {
  label: string;
  /**
   * Rendered with `onColor` when the control is active, so the drawing stays
   * legible once the button takes the glyph's own colour as its background.
   */
  renderIcon: (onColor: boolean) => React.ReactNode;
  active: boolean;
  /** Colour when active. Each control owns a hue so they read apart at a glance. */
  tint: string;
  tintLip: string;
  onPress: () => void;
}

/**
 * A labelled map control.
 *
 * Icon-only round buttons are unreadable — a footprint, a bell and a triangle
 * tell a first-time user nothing about what they do. Every control therefore
 * carries its verb, and the chunky bottom lip plus a distinct hue per action
 * makes the row scannable rather than three identical circles.
 */
export function MapControl({ label, renderIcon, active, tint, tintLip, onPress }: MapControlProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={{
        alignItems: "center",
        gap: 6,
      }}
    >
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? tint : colors.semantic.surface,
          borderWidth: 3,
          borderColor: active ? "#FFFFFF" : colors.ink[100],
          borderBottomWidth: 6,
          borderBottomColor: active ? tintLip : colors.ink[200],
          shadowColor: active ? tint : colors.ink[700],
          shadowOpacity: active ? 0.45 : 0.2,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 8,
        }}
      >
        {renderIcon(active)}
      </View>
      <View
        style={{
          backgroundColor: colors.semantic.surface,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 3,
          shadowColor: colors.ink[700],
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <Text variant="label" weight="bold" style={{ color: active ? tint : colors.ink[400] }}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}
