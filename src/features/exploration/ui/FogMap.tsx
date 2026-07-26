import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import MapView, { PROVIDER_DEFAULT, type Region } from "react-native-maps";

import type { MultiPolygonCoords } from "../core/grid.types";
import type { Poi } from "../data/mock-pois";

import { buildExploredHoles, buildFogRing, type PoiMarker } from "./fog-geometry";
import { FogLayer } from "./layers/FogLayer";
import { PoiLayer } from "./layers/PoiLayer";
import { UserPuck } from "./layers/UserPuck";
import { playfulMapStyle } from "./map-style";

export interface FogMapHandle {
  /** Animate the camera back onto the walker. */
  recenter: () => void;
}

export interface FogMapProps {
  /** Explored cells — used for POI discovery. */
  exploredCells: string[];
  /** Dissolved explored outline — punched out of the mist. */
  exploredOutline: MultiPolygonCoords;
  /** Live walker position as [lng, lat]. */
  position: [number, number];
  /** Whether `position` is a real fix rather than the fallback centre. */
  hasFix: boolean;
  pois: Poi[];
  /** Called when a discovered POI is tapped. */
  onSelectPoi: (poi: PoiMarker) => void;
}

const INITIAL_DELTA = 0.012;

/**
 * The map, composed of named layers.
 *
 * Draw order is the design: basemap → mist → POIs → walker. POIs and the walker
 * are markers, which MapKit routes through `addAnnotation:` and always paints
 * above overlays — so the exploration layer can never cover them, which the
 * brief requires explicitly.
 *
 * There is exactly ONE overlay on this map. That is deliberate: overlay
 * insertion order decides what is painted over what, and the mist re-inserts
 * itself on every pan and zoom. Anything else drawn as an overlay would need to
 * be re-inserted in lockstep, and re-inserting overlays at gesture frequency is
 * how this screen used to die. With a single overlay the ordering problem does
 * not exist, and the frontier outline comes free as that polygon's own stroke.
 */
export const FogMap = forwardRef<FogMapHandle, FogMapProps>(function FogMap(
  { exploredCells, exploredOutline, position, hasFix, pois, onSelectPoi },
  ref,
) {
  const mapRef = useRef<MapView | null>(null);
  const [longitude, latitude] = [position[0], position[1]];

  const initialRegion = useMemo<Region>(
    // Mount-only by definition, so it must NOT track `position`: recentring is
    // an explicit action from here on.
    () => ({
      latitude,
      longitude,
      latitudeDelta: INITIAL_DELTA,
      longitudeDelta: INITIAL_DELTA,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // The mist is sized from the camera, so it has to follow it. Updated only
  // when a gesture settles: rebuilding mid-pan would rebuild the polygon on
  // every frame of every pan.
  const [region, setRegion] = useState<Region>(initialRegion);

  const recenter = useCallback(() => {
    const target = {
      latitude,
      longitude,
      latitudeDelta: INITIAL_DELTA,
      longitudeDelta: INITIAL_DELTA,
    };
    // Applied immediately as well as animated: `onRegionChangeComplete` only
    // fires once the camera settles, and until it does the mist would still be
    // sized around wherever the camera used to be.
    setRegion(target);
    mapRef.current?.animateToRegion(target, 450);
  }, [latitude, longitude]);

  useImperativeHandle(ref, () => ({ recenter }), [recenter]);

  // The first real fix arrives after mount, and `initialRegion` is mount-only
  // (verified: react-native-maps reads it on creation and never again). Without
  // this the map would sit on the fallback centre with the walker off-screen.
  //
  // Exactly once, and never again: re-centring on every fix would drag the
  // camera out from under anyone who has panned away to look around, and would
  // fire an animation per GPS callback.
  const didAutoCenter = useRef(false);
  useEffect(() => {
    if (!hasFix || didAutoCenter.current) return;
    didAutoCenter.current = true;
    recenter();
  }, [hasFix, recenter]);

  // Geometry identity. The cell count is sufficient ONLY because the explored
  // set is grow-only (AD-5): it cannot change shape without changing size. It
  // is also the right memo key — `exploredCells` gets a fresh array identity on
  // every store read, so keying on the array would rebuild the entire lifetime
  // geometry even when nothing changed.
  const revision = exploredCells.length;

  // The mist ring and its holes are derived TOGETHER from the same camera, so a
  // hole can never be measured against a rectangle it was not clipped to.
  const fogRing = useMemo(() => buildFogRing(region), [region]);
  const holes = useMemo(
    () => buildExploredHoles(exploredOutline, fogRing),
    [exploredOutline, fogRing],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cellSet = useMemo(() => new Set(exploredCells), [revision]);

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      provider={PROVIDER_DEFAULT}
      initialRegion={initialRegion}
      onRegionChangeComplete={setRegion}
      // `customMapStyle` is a Google-Maps feature: on iOS with the default
      // provider (Apple Maps) it is silently discarded, so passing it there
      // would look like styling that never applies. Apple's map follows
      // `userInterfaceStyle` instead.
      customMapStyle={Platform.OS === "android" ? playfulMapStyle : undefined}
      userInterfaceStyle="light"
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      showsPointsOfInterest={false}
      showsBuildings={false}
      showsTraffic={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
    >
      <FogLayer ring={fogRing} holes={holes} revision={revision} />
      <PoiLayer pois={pois} exploredCells={cellSet} onSelect={onSelectPoi} />
      <UserPuck coordinate={{ latitude, longitude }} />
    </MapView>
  );
});
