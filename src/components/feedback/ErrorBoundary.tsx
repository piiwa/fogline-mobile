import { Component, type ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { Button } from "@/components/primitives/Button";
import { Text } from "@/components/primitives/Text";
import { colors } from "@/theme/tokens";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: string | null;
}

/**
 * Shows the error instead of the app disappearing.
 *
 * A screen that fails silently, or a bundle that dies on a device with no
 * console attached, costs more time than any bug it hides. When something
 * throws, the message and the stack go on screen where they can be read and
 * photographed — which is the only debugging channel available to someone
 * testing on their own phone, away from a terminal.
 *
 * This catches JS errors only. A native crash takes the process down and never
 * reaches here; the difference is itself diagnostic — if this screen appears,
 * the fault is in our JavaScript, and if the app vanishes, it is native.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string }): void {
    this.setState({ info: info.componentStack ?? null });
    // Also to the terminal, for whoever is running the dev server.
    console.error("[Fogline] render error", error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null, info: null });
  };

  override render(): ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: colors.semantic.background, padding: 20 }}>
        <ScrollView contentContainerStyle={{ paddingTop: 60, gap: 14 }}>
          <Text variant="title" weight="bold">
            Something broke
          </Text>
          <Text variant="body" tone="danger" weight="semibold">
            {error.name}: {error.message}
          </Text>
          {error.stack ? (
            <Text variant="caption" tone="muted" style={{ fontFamily: "Courier" }}>
              {error.stack.split("\n").slice(0, 12).join("\n")}
            </Text>
          ) : null}
          {info ? (
            <Text variant="caption" tone="muted" style={{ fontFamily: "Courier" }}>
              {info.split("\n").slice(0, 10).join("\n")}
            </Text>
          ) : null}
          <Button label="Try again" onPress={this.reset} />
        </ScrollView>
      </View>
    );
  }
}
