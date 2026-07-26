import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, TextInput, View } from "react-native";

import { adoptIdentity, getDeviceId } from "@/auth/mock-session";
import { CompassGlyph } from "@/components/art/GlyphArt";
import { Button } from "@/components/primitives/Button";
import { SafeScreen } from "@/components/primitives/SafeScreen";
import { Text } from "@/components/primitives/Text";
import { syncNow } from "@/features/exploration/sync/sync-service";
import { colors } from "@/theme/tokens";

/** "Courier" does not exist on Android and falls back silently to the default. */
const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

/**
 * Moving an exploration between devices.
 *
 * The brief asks that walking on device A be visible on device B. The sync
 * protocol already converges without a server arbitrating, because the explored
 * set is grow-only and merges by union; what was missing was a way to tell two
 * handsets they belong to the same person. There is no account system here by
 * choice, so the honest answer is to show the identity and let it be carried.
 *
 * Displaying it is also the only place the trade-off becomes visible: this
 * string is a bearer secret. The screen says so plainly rather than letting
 * someone paste it into a group chat.
 */
export default function IdentityScreen() {
  const { t } = useTranslation("identity");
  const [identity, setIdentity] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [adopting, setAdopting] = useState(false);

  useEffect(() => {
    let active = true;
    void getDeviceId().then((id) => {
      if (active) setIdentity(id);
    });
    return () => {
      active = false;
    };
  }, []);

  const copy = useCallback(async () => {
    if (!identity) return;
    await Clipboard.setStringAsync(identity);
    setCopied(true);
  }, [identity]);

  const adopt = useCallback(async () => {
    if (draft.trim().length === 0 || adopting) return;
    setAdopting(true);
    await adoptIdentity(draft);
    // Pull the adopted history before closing, so the map behind this screen is
    // already the other device's map by the time it is visible again.
    await syncNow();
    router.back();
  }, [draft, adopting]);

  return (
    // `scrollable` is not optional here: this screen has a text field, and with
    // the keyboard up the paste target would otherwise sit under it. SafeScreen
    // owns the gutter, so nothing below adds horizontal padding of its own.
    <SafeScreen scrollable>
      <View className="gap-7">
        <View className="items-center gap-3">
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.semantic.surface,
              borderWidth: 3,
              borderColor: colors.bubble[400],
              borderBottomWidth: 6,
              borderBottomColor: colors.bubble[500],
            }}
          >
            <CompassGlyph size={38} color={colors.bubble[400]} shade={colors.bubble[500]} />
          </View>
          <Text variant="title" weight="bold" align="center">
            {t("title")}
          </Text>
          <Text variant="body" tone="muted" align="center">
            {t("intro")}
          </Text>
        </View>

        <View className="gap-3">
          <Text variant="label" weight="bold" tone="muted">
            {t("mine")}
          </Text>
          <View
            style={{
              backgroundColor: colors.mist[100],
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            <Text selectable style={{ fontFamily: MONO, fontSize: 13, lineHeight: 20 }}>
              {identity ?? "..."}
            </Text>
          </View>
          <Button
            label={t(copied ? "copied" : "copy")}
            onPress={() => void copy()}
            variant="outline"
          />
        </View>

        <View className="gap-3">
          <Text variant="label" weight="bold" tone="muted">
            {t("adoptTitle")}
          </Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t("adoptPlaceholder")}
            placeholderTextColor={colors.ink[300]}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            style={{
              backgroundColor: colors.semantic.surface,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: colors.ink[100],
              paddingHorizontal: 16,
              paddingVertical: 14,
              minHeight: 68,
              fontFamily: MONO,
              fontSize: 13,
              color: colors.ink[700],
            }}
          />
          <Button
            label={t(adopting ? "adopting" : "adopt")}
            onPress={() => void adopt()}
            disabled={draft.trim().length === 0 || adopting}
          />
          <Text variant="caption" tone="muted">
            {t("warning")}
          </Text>
        </View>

        {/* A modal with no visible way out relies on a swipe people do not all
            know, and Android offers no equivalent affordance at all. */}
        <Button label={t("close")} onPress={() => router.back()} variant="ghost" />
      </View>
    </SafeScreen>
  );
}
