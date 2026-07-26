import { Redirect } from "expo-router";
import { View } from "react-native";

import { PERM_MODE } from "@/features/exploration/engine/permission.types";
import { useLocationPermission } from "@/features/exploration/hooks/use-location-permission.hook";
import { mmkv, mmkvKeys } from "@/storage/mmkv";
import { colors } from "@/theme/tokens";

/** Entry gate: onboarding until location is set up, otherwise straight to the map. */
export default function Index() {
  const { mode, ready } = useLocationPermission();

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.semantic.background }} />;
  }

  const onboarded = mmkv.getString(mmkvKeys.onboardingCompleted) === "true";
  if (!onboarded || mode === PERM_MODE.Undetermined) {
    return <Redirect href="/onboarding" />;
  }
  return <Redirect href="/map" />;
}
