import { router } from "expo-router";
import { useState } from "react";

import { useLocationPermission } from "@/features/exploration/hooks/use-location-permission.hook";
import { ValuePropScreen } from "@/features/exploration/ui/onboarding/ValuePropScreen";
import { mmkv, mmkvKeys } from "@/storage/mmkv";

/**
 * Onboarding: value-prop priming, then the foreground ("When in use") request.
 * Background ("Always") is NOT asked here — it's escalated later from the map at
 * a value moment (AD-4).
 */
export default function OnboardingScreen() {
  const { askForeground } = useLocationPermission();
  const [loading, setLoading] = useState(false);

  const onStart = async () => {
    setLoading(true);
    await askForeground();
    mmkv.set(mmkvKeys.onboardingCompleted, "true");
    setLoading(false);
    router.replace("/map");
  };

  return <ValuePropScreen onStart={() => void onStart()} isLoading={loading} />;
}
