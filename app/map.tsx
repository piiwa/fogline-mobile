import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BellGlyph, CompassGlyph, FootprintGlyph, LocateGlyph } from "@/components/art/GlyphArt";
import { GlassPanel } from "@/components/primitives/GlassPanel";
import { PressableScale } from "@/components/primitives/PressableScale";
import { Text } from "@/components/primitives/Text";
import { MapControl } from "@/features/exploration/ui/hud/MapControl";
import { generatePoisAround, type Poi } from "@/features/exploration/data/mock-pois";
import { isBackgroundTrackingSupported } from "@/features/exploration/engine/location-engine";
import { PERM_MODE } from "@/features/exploration/engine/permission.types";
import { GEOFENCE_BLOCK } from "@/features/exploration/proximity/geofencing";
import { useExploration } from "@/features/exploration/hooks/use-exploration.hook";
import { useExplorationTracking } from "@/features/exploration/hooks/use-exploration-tracking.hook";
import { FIX_STATUS, useLivePosition } from "@/features/exploration/hooks/use-live-position.hook";
import { useLocationPermission } from "@/features/exploration/hooks/use-location-permission.hook";
import { useProximity } from "@/features/exploration/hooks/use-proximity.hook";
import { useDemoWalk } from "@/features/exploration/demo/use-demo-walk.hook";
import { LocatingScreen } from "@/features/exploration/ui/feedback/LocatingScreen";
import { RevealFx } from "@/features/exploration/ui/feedback/RevealFx";
import { PoiSheet } from "@/features/exploration/ui/feedback/PoiSheet";
import { FogMap, type FogMapHandle } from "@/features/exploration/ui/FogMap";
import type { PoiMarker } from "@/features/exploration/ui/fog-geometry";
import { ExplorationHud } from "@/features/exploration/ui/hud/ExplorationHud";
import { colors } from "@/theme/tokens";

// Paris fallback until a real fix arrives (simulator with no location set).
const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566];
/** Height of the HUD row — the reveal card is placed just below it. */
const HUD_BLOCK = 96;

export default function MapScreen() {
  const { t } = useTranslation("map");
  const insets = useSafeAreaInsets();
  const { mode } = useLocationPermission();
  const { cells, cellCount, areaKm2, exploredMultiPolygon } = useExploration();
  // Tracking is NOT a mode the user starts. The product idea is that walking
  // reveals the map, so it runs whenever permission allows it; a play button
  // would contradict the whole premise.
  useExplorationTracking(mode);
  const mapRef = useRef<FogMapHandle | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<PoiMarker | null>(null);

  // The walker's live position. `anchor` is the first fix and never moves, so
  // the collectibles stay where they were scattered instead of following the
  // walker around and staying forever out of reach.
  const { coords, anchor, status } = useLivePosition();
  const center = coords ?? DEFAULT_CENTER;
  const pois = useMemo<Poi[]>(
    () =>
      anchor
        ? generatePoisAround(anchor.lat, anchor.lng)
        : generatePoisAround(DEFAULT_CENTER[1], DEFAULT_CENTER[0]),
    [anchor],
  );
  const demo = useDemoWalk();
  const {
    enabled: proximityOn,
    needsNotificationPermission,
    blocker: alertsBlocker,
    toggle: toggleProximity,
  } = useProximity(pois, center[1], center[0], mode);

  // Reduced mode has two distinct causes: the user hasn't granted "Always"
  // (fixable → offer the upgrade), or the runtime simply cannot do background
  // work at all (Expo Go → explain, don't offer a dead-end prompt).
  const showUpgradeBanner = mode === PERM_MODE.Reduced && isBackgroundTrackingSupported();
  const showRuntimeBanner = mode === PERM_MODE.Reduced && !isBackgroundTrackingSupported();

  // The map is NOT mounted before the position is known. `initialRegion` is read
  // once at creation, so opening the map on a guessed centre commits the camera
  // to that guess — and the fog is sized from the camera, so it ends up drawn
  // somewhere the walker is not. Worse, explored ground outside that rectangle
  // is handed to MapKit as a hole lying outside its own outer ring, which it
  // fills instead of piercing: the map renders INVERTED, walked ground opaque
  // and the unknown world clear.
  if (status === FIX_STATUS.Locating) {
    return <LocatingScreen />;
  }
  if (status === FIX_STATUS.Unavailable) {
    // No fix after the timeout. Opening the map on the fallback centre would
    // show someone a foreign city and call it their exploration.
    return <LocatingScreen unavailable />;
  }

  return (
    <View className="flex-1 bg-background">
      <FogMap
        ref={mapRef}
        exploredCells={cells}
        exploredOutline={exploredMultiPolygon}
        position={center}
        hasFix={coords !== null}
        pois={pois}
        onSelectPoi={setSelectedPoi}
      />
      <RevealFx topOffset={insets.top + HUD_BLOCK} />

      <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16 }}>
        <ExplorationHud areaKm2={areaKm2} cellCount={cellCount} />
      </View>

      <View
        className="gap-3"
        style={{ position: "absolute", bottom: insets.bottom + 16, left: 16, right: 16 }}
      >
        {showUpgradeBanner ? (
          <PressableScale onPress={() => router.push("/upgrade")} accessibilityRole="button">
            <GlassPanel>
              <Text variant="caption">{t("banner.reduced")}</Text>
            </GlassPanel>
          </PressableScale>
        ) : null}
        {showRuntimeBanner ? (
          <GlassPanel>
            <Text variant="caption" tone="muted">
              {t("banner.expoGo")}
            </Text>
          </GlassPanel>
        ) : null}
        {needsNotificationPermission ? (
          <GlassPanel>
            <Text variant="caption" tone="muted">
              {t("banner.notificationsDenied")}
            </Text>
          </GlassPanel>
        ) : null}
        {alertsBlocker !== GEOFENCE_BLOCK.None ? (
          <GlassPanel>
            <Text variant="caption" tone="muted">
              {t(
                alertsBlocker === GEOFENCE_BLOCK.Runtime
                  ? "banner.alertsExpoGo"
                  : "banner.alertsNeedAlways",
              )}
            </Text>
          </GlassPanel>
        ) : null}
        {mode === PERM_MODE.Denied ? (
          <GlassPanel>
            <Text variant="caption" tone="danger">
              {t("banner.denied")}
            </Text>
          </GlassPanel>
        ) : null}

        <View className="flex-row items-end justify-center gap-4">
          <MapControl
            label={t("hud.demo")}
            active={demo.isWalking}
            tint={colors.mist[500]}
            tintLip={colors.mist[700]}
            onPress={() =>
              demo.isWalking ? demo.stop() : demo.start({ lat: center[1], lng: center[0] })
            }
            renderIcon={(onColor) => <FootprintGlyph size={30} onColor={onColor} />}
          />
          <MapControl
            label={t("hud.recenter")}
            active={false}
            tint={colors.mint[400]}
            tintLip={colors.mint[600]}
            onPress={() => mapRef.current?.recenter()}
            renderIcon={(onColor) => <LocateGlyph size={30} onColor={onColor} />}
          />
          <MapControl
            label={t("hud.alerts")}
            active={proximityOn}
            tint={colors.sunny[400]}
            tintLip={colors.sunny[600]}
            onPress={() => void toggleProximity()}
            renderIcon={(onColor) => <BellGlyph size={30} onColor={onColor} />}
          />
          {/* Exploration belongs to an identity, not to a handset. This is where
              that identity is carried to a second device — and it earns a label
              like every other control, because a bare icon explains nothing. */}
          <MapControl
            label={t("hud.identity")}
            active={false}
            tint={colors.bubble[400]}
            tintLip={colors.bubble[500]}
            onPress={() => router.push("/identity")}
            renderIcon={(onColor) => <CompassGlyph size={30} onColor={onColor} />}
          />
        </View>
      </View>

      {/* Last child on purpose: siblings with no `zIndex` paint in declaration
          order, so a sheet declared before the controls opens BEHIND them and
          its buttons cannot be reached. */}
      <PoiSheet poi={selectedPoi} onClose={() => setSelectedPoi(null)} />
    </View>
  );
}
