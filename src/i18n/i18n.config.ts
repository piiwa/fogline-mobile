import { getLocales } from "expo-localization";
import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import { mmkv, mmkvKeys } from "@/storage/mmkv";

import { loadResources, NAMESPACES } from "./i18n-loader";

const SUPPORTED_LANGUAGES = ["fr", "en"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Fogline targets a French audience (WeWard) first; English is the fallback.
const DEFAULT_LANGUAGE: SupportedLanguage = "fr";

function isSupported(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

function detectLanguage(): SupportedLanguage {
  const stored = mmkv.getString(mmkvKeys.language);
  if (stored && isSupported(stored)) return stored;
  const deviceLanguage = getLocales()[0]?.languageCode;
  if (deviceLanguage && isSupported(deviceLanguage)) return deviceLanguage;
  return DEFAULT_LANGUAGE;
}

let _instance: I18nInstance | null = null;

export async function initializeI18n(): Promise<I18nInstance> {
  if (_instance !== null) return _instance;

  await i18next.use(initReactI18next).init({
    lng: detectLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    ns: NAMESPACES as unknown as string[],
    defaultNS: "common",
    resources: loadResources(),
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  _instance = i18next;
  return i18next;
}
