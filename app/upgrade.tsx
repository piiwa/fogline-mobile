import { router } from "expo-router";
import { useState } from "react";

import { PERM_STATUS } from "@/features/exploration/engine/permission.types";
import { useLocationPermission } from "@/features/exploration/hooks/use-location-permission.hook";
import { AlwaysUpgradeScreen } from "@/features/exploration/ui/onboarding/AlwaysUpgradeScreen";

/** Modal: escalate to "Always" location at a value moment. */
export default function UpgradeScreen() {
  const { snapshot, askBackground, openSettings } = useLocationPermission();
  const [loading, setLoading] = useState(false);

  const canPrompt = snapshot.background === PERM_STATUS.Undetermined;

  const onEnable = async () => {
    setLoading(true);
    await askBackground();
    setLoading(false);
    router.back();
  };

  return (
    <AlwaysUpgradeScreen
      canPrompt={canPrompt}
      onEnable={() => void onEnable()}
      onOpenSettings={() => {
        openSettings();
        router.back();
      }}
      onLater={() => router.back()}
      isLoading={loading}
    />
  );
}
