import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Marker } from "react-native-maps";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ChestGlyph, SparkGlyph } from "@/components/art/GlyphArt";
import { colors } from "@/theme/tokens";

import type { Poi, PoiRarity } from "../../data/mock-pois";
import { POI_KIND, POI_RARITY } from "../../data/mock-pois";

import { decoratePois, type PoiMarker } from "../fog-geometry";

/**
 * Rarity is what makes a scatter of pins read as loot rather than as data.
 *
 * Each tier gets its own hue and its own energy: common sits still, rare and
 * legendary bob. Motion is reserved for what is worth walking to.
 */
const RARITY_STYLE: Record<PoiRarity, { fill: string; lip: string; float: boolean }> = {
  [POI_RARITY.Common]: { fill: colors.mint[400], lip: colors.mint[600], float: false },
  [POI_RARITY.Rare]: { fill: colors.bubble[400], lip: colors.bubble[500], float: true },
  [POI_RARITY.Legendary]: { fill: colors.sunny[400], lip: colors.sunny[600], float: true },
};

export interface PoiLayerProps {
  pois: Poi[];
  exploredCells: Set<string>;
  onSelect: (poi: PoiMarker) => void;
}

/**
 * POIs drawn ABOVE the mist — the exploration layer must never degrade them,
 * which the brief requires explicitly.
 *
 * Discovery narrative: a POI still under the mist is a pale ghost, barely there.
 * Once its ground is walked it pops into a coloured bubble whose hue and motion
 * say how rare it is, and becomes tappable.
 */
export function PoiLayer({ pois, exploredCells, onSelect }: PoiLayerProps) {
  const markers = useMemo(() => decoratePois(pois, exploredCells), [pois, exploredCells]);

  return (
    <>
      {markers.map((poi) => (
        <Marker
          key={poi.id}
          coordinate={{ latitude: poi.lat, longitude: poi.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          // Android (and Google Maps on iOS) snapshots marker views, so an
          // animated pin has to keep being sampled while a static one does not.
          // Apple Maps ignores this prop entirely — it hosts marker children as
          // real views — so it is a no-op there rather than a correctness risk.
          tracksViewChanges={poi.discovered}
          onPress={() => {
            if (poi.discovered) onSelect(poi);
          }}
        >
          <PoiPin poi={poi} />
        </Marker>
      ))}
    </>
  );
}

function PoiPin({ poi }: { poi: PoiMarker }) {
  const style = RARITY_STYLE[poi.rarity];
  const bob = useSharedValue(0);
  const floats = poi.discovered && style.float;

  useEffect(() => {
    if (!floats) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [floats, bob]);

  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -bob.value * 5 }] }));

  if (!poi.discovered) {
    // Still under the mist. Barely there on purpose: a ring bright enough to
    // read as a pin makes eight unreachable dots look like the real content of
    // the map, and the mist stops being the subject. A soft glow says "there is
    // something out there" without competing with what has been earned.
    return (
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.14)",
        }}
      >
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: "rgba(255,255,255,0.62)",
          }}
        />
      </View>
    );
  }

  return (
    <Animated.View style={bobStyle}>
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.semantic.surface,
          // Thick keyline plus a bottom lip: the sticker look that makes a pin
          // sit ON the map rather than be painted into it.
          borderWidth: 3,
          borderColor: style.fill,
          borderBottomWidth: 5,
          borderBottomColor: style.lip,
          shadowColor: style.lip,
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 7,
        }}
      >
        {poi.kind === POI_KIND.Chest ? (
          <ChestGlyph size={26} color={style.fill} shade={style.lip} />
        ) : (
          <SparkGlyph size={26} color={style.fill} shade={style.lip} />
        )}
      </View>
    </Animated.View>
  );
}
