import i18next from "i18next";

/**
 * Copy for OS-level notifications.
 *
 * These strings are produced OUTSIDE React — by the geofencing task and the
 * foreground-service configuration — so they cannot use the `useTranslation`
 * hook. Reading from the i18n instance directly keeps them in the user's
 * language instead of hardcoding English into the two most visible surfaces the
 * app has: the persistent tracking notification and the proximity alert.
 */
export function notificationCopy(): {
  foregroundTitle: string;
  foregroundBody: string;
  nearbyTitle: string;
  nearbyBody: string;
} {
  const t = i18next.getFixedT(null, "map");
  return {
    foregroundTitle: t("notifications.foregroundTitle"),
    foregroundBody: t("notifications.foregroundBody"),
    nearbyTitle: t("notifications.nearbyTitle"),
    nearbyBody: t("notifications.nearbyBody"),
  };
}
