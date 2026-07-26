import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { CompassGlyph } from "@/components/art/GlyphArt";
import { AppBackground } from "@/components/brand/AppBackground";
import { Button } from "@/components/primitives/Button";
import { SafeScreen } from "@/components/primitives/SafeScreen";
import { Text } from "@/components/primitives/Text";
import { colors } from "@/theme/tokens";

export interface AlwaysUpgradeScreenProps {
  /** Whether the OS can still prompt (else we route to Settings). */
  canPrompt: boolean;
  onEnable: () => void;
  onOpenSettings: () => void;
  onLater: () => void;
  isLoading?: boolean;
}

/**
 * Shown at a value moment (not upfront) to escalate to "Always" location —
 * respecting the iOS two-step constraint. If the OS can no longer prompt
 * (denied, or Android 11+), it routes to Settings instead (AD-4).
 */
export function AlwaysUpgradeScreen({
  canPrompt,
  onEnable,
  onOpenSettings,
  onLater,
  isLoading = false,
}: AlwaysUpgradeScreenProps) {
  const { t } = useTranslation("onboarding");
  const { t: tc } = useTranslation("common");
  return (
    <AppBackground>
      <SafeScreen transparent>
        <View className="flex-1 justify-between py-4">
          <View className="items-center pt-10">
            <View
              className="items-center justify-center"
              style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.ink[700] }}
            >
              <CompassGlyph size={64} />
            </View>
          </View>

          <View className="gap-3">
            <Text variant="label" tone="mint">
              {t("always.eyebrow")}
            </Text>
            <Text variant="display" weight="bold">
              {t("always.title")}
            </Text>
            <Text variant="subtitle" tone="muted">
              {t("always.body")}
            </Text>
          </View>

          <View className="gap-3">
            <Button
              label={canPrompt ? t("always.cta") : tc("actions.openSettings")}
              onPress={canPrompt ? onEnable : onOpenSettings}
              isLoading={isLoading}
              size="lg"
            />
            <Button label={t("always.later")} onPress={onLater} variant="ghost" />
          </View>
        </View>
      </SafeScreen>
    </AppBackground>
  );
}
