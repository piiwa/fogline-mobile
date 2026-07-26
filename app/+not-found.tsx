import { Link, Stack } from "expo-router";
import { View } from "react-native";

import { Text } from "@/components/primitives/Text";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <Text variant="title">404</Text>
        <Link href="/">
          <Text tone="mint">Fogline</Text>
        </Link>
      </View>
    </>
  );
}
