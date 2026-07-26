/**
 * Basemap styling for Android (Google Maps `customMapStyle`).
 *
 * iOS has no equivalent: `customMapStyle` is silently ignored by Apple Maps, so
 * there the basemap is Apple's own light style (see `FogMap`).
 *
 * Intent: the walked world should look like a friendly illustrated map — soft
 * paper ground, mint parks, candy water, and roads clean enough to navigate.
 * The mist above it supplies all the drama, so the basemap stays calm and
 * cheerful rather than competing with it.
 */
type MapStyleElement = {
  featureType?: string;
  elementType?: string;
  stylers: Record<string, string | number>[];
};

export const playfulMapStyle: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#F3F1FA" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4A4A85" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },

  // Roads: the readable skeleton of revealed ground.
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#FFE9A8" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6F6FA8" }] },

  // Nature and water in candy tones — the reward for walking somewhere.
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#C7F5E7" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#EDF6F1" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#B9E4F7" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4A9CC4" }] },

  // Remove clutter that would compete with the POIs we place ourselves.
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
];
