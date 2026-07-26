/**
 * i18n resources loader — static imports per (language, namespace).
 *
 * No `import.meta.glob` in RN/Metro. Add a namespace = add 2 imports + 2 entries
 * + 1 line in NAMESPACES (the single source of truth consumed by i18n.config).
 */
import enCommon from "./translations/en/common.json";
import enMap from "./translations/en/map.json";
import enOnboarding from "./translations/en/onboarding.json";
import frCommon from "./translations/fr/common.json";
import frMap from "./translations/fr/map.json";
import frOnboarding from "./translations/fr/onboarding.json";

export const NAMESPACES = ["common", "onboarding", "map", "identity"] as const;

export function loadResources() {
  return {
    fr: {
      common: frCommon,
      onboarding: frOnboarding,
      map: frMap,
    },
    en: {
      common: enCommon,
      onboarding: enOnboarding,
      map: enMap,
    },
  } as const;
}
