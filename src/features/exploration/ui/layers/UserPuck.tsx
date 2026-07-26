import { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import { AnimatedRegion, MarkerAnimated, type LatLng } from "react-native-maps";

import { colors } from "@/theme/tokens";

/**
 * How long the marker takes to glide from its last position to a new fix.
 *
 * Matched to the fix cadence rather than chosen for looks: too short and the
 * glide finishes early, leaving the same stutter it was meant to remove; too
 * long and the marker lags visibly behind reality.
 */
const GLIDE_MS = 900;

/**
 * The explorer's position.
 *
 * A marker and nothing else. Markers go through `addAnnotation:`, and MapKit
 * paints annotations above every overlay — so the puck is guaranteed to sit on
 * top without any of the re-insertion tricks that overlays need. The bloom that
 * used to be drawn with map Circles is part of the marker view itself, which
 * removes two overlays from every render of the map.
 *
 * The position is driven through an `AnimatedRegion` rather than passed as a
 * plain coordinate. GPS delivers discrete jumps every few dozen metres, so a
 * marker bound straight to the raw fix TELEPORTS on each one. Interpolating
 * between fixes is what makes the walker read as moving rather than blinking,
 * and it runs off the JS thread.
 */
export function UserPuck({ coordinate }: { coordinate: LatLng }) {
  const animated = useRef(
    new AnimatedRegion({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;

  useEffect(() => {
    const animation = animated.timing({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
      duration: GLIDE_MS,
      // `AnimatedRegion` drives four separate values that the marker reads back
      // on the JS side; the native driver cannot animate them, and asking for
      // it silently freezes the puck.
      useNativeDriver: false,
      toValue: 0,
    });
    animation.start();
    return () => animation.stop();
  }, [animated, coordinate.latitude, coordinate.longitude]);

  return (
    <MarkerAnimated
      coordinate={animated as unknown as LatLng}
      anchor={{ x: 0.5, y: 0.5 }}
      // Android renders a marker's children into a bitmap, so it has to keep
      // resampling while the puck moves. Apple Maps hosts them as real views
      // and ignores this prop entirely.
      tracksViewChanges={Platform.OS === "android"}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(43, 217, 188, 0.22)",
        }}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FFFFFF",
            shadowColor: colors.ink[700],
            shadowOpacity: 0.35,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 6,
          }}
        >
          <View
            style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.mint[400] }}
          />
        </View>
      </View>
    </MarkerAnimated>
  );
}
