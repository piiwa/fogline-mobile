import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  View,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cn } from "@/utils/string";

export interface SafeScreenProps extends ViewProps {
  scrollable?: boolean;
  keyboardAware?: boolean;
  /** Transparent background — used when a full-bleed map/background sits behind. */
  transparent?: boolean;
  contentContainerClassName?: string;
  scrollProps?: Omit<ScrollViewProps, "children">;
  edges?: readonly ("top" | "right" | "bottom" | "left")[];
}

/**
 * Standard screen wrapper: SafeAreaView + optional keyboard avoidance + optional
 * scroll. Root of every screen instead of a bare View.
 */
export function SafeScreen({
  scrollable = false,
  keyboardAware = true,
  transparent = false,
  children,
  className,
  contentContainerClassName,
  scrollProps,
  edges = ["top", "right", "bottom", "left"],
  ...rest
}: SafeScreenProps) {
  const inner = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerClassName={cn("px-5 pt-4 pb-12", contentContainerClassName)}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    // Same horizontal gutter as the scrollable branch — otherwise non-scrolling
    // screens render their content flush against the device bezel.
    <View className={cn("flex-1 px-5 pt-4", contentContainerClassName)} {...rest}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={edges}
      className={cn("flex-1", transparent ? undefined : "bg-background", className)}
    >
      {keyboardAware ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}
