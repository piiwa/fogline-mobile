import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { colors } from "@/theme/tokens";

/**
 * What the app shows before it is itself.
 *
 * Deliberately built from raw React Native primitives and literal strings: this
 * screen has to be able to render when i18n, the theme, or the database are
 * exactly what failed. A boot screen that depends on the thing it reports on
 * cannot report on it.
 */

export function BootLoading() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        backgroundColor: colors.semantic.background,
      }}
    >
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: 38,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.mist[100],
          borderWidth: 3,
          borderColor: colors.mist[300],
        }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: colors.mint[400],
          }}
        />
      </View>
      <Text style={{ fontSize: 20, fontWeight: "700", color: colors.ink[700] }}>Fogline</Text>
      <ActivityIndicator color={colors.mist[500]} />
    </View>
  );
}

/**
 * Boot failed. Say what broke, and offer the one action that can help.
 *
 * The previous behaviour was to keep showing the loading colour forever, which
 * is indistinguishable from a hang and gives a tester nothing to report.
 */
export function BootFailed({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.semantic.background, padding: 24 }}>
      <ScrollView contentContainerStyle={{ paddingTop: 80, gap: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.ink[700] }}>
          Fogline could not start
        </Text>
        <Text style={{ fontSize: 15, color: colors.ink[500] }}>
          {error.name}: {error.message}
        </Text>
        {error.stack ? (
          <Text style={{ fontSize: 11, fontFamily: "Courier", color: colors.ink[400] }}>
            {error.stack.split("\n").slice(0, 10).join("\n")}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 22,
            paddingVertical: 12,
            borderRadius: 999,
            backgroundColor: colors.mint[400],
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Retry</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
