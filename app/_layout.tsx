import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import "../global.css";

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { AppProviders } from "@/providers/AppProviders";
import { colors } from "@/theme/tokens";

export default function RootLayout() {
  return (
    // Outermost on purpose: it has to survive anything the providers throw,
    // including during their own initialisation.
    <ErrorBoundary>
      <AppProviders>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.semantic.background },
            animation: "fade",
          }}
        >
          <Stack.Screen name="upgrade" options={{ presentation: "modal" }} />
          <Stack.Screen name="identity" options={{ presentation: "modal" }} />
        </Stack>
      </AppProviders>
    </ErrorBoundary>
  );
}
