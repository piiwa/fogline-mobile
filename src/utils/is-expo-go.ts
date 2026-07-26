import Constants from "expo-constants";

/**
 * True when running inside the Expo Go sandbox (`expo start` without a dev
 * client).
 *
 * Expo Go ships a fixed set of native modules, so two capabilities are missing:
 * BACKGROUND execution (`expo-task-manager` → background location, geofencing)
 * and MMKV. The map itself works — `react-native-maps` is bundled.
 *
 * Consequence: in Expo Go the feature runs in REDUCED mode (reveal while the app
 * is open), which is the same graceful path as a user who declined "Always".
 * See AD-11 in DECISIONS.md.
 */
export const isExpoGo = (): boolean => Constants.appOwnership === "expo";
