import type { LocaleCode, LocalizedStringArray, LocalizedText } from "../types/models";

export const LOCALE_OVERRIDE_KEY = "renkei_locale_override";

export function detectUserLocale(): LocaleCode {
  // Override esplicito dalle impostazioni (sincrono, serve prima di Dexie).
  if (typeof localStorage !== "undefined") {
    const override = localStorage.getItem(LOCALE_OVERRIDE_KEY);
    if (override === "it" || override === "en") {
      return override;
    }
  }

  if (typeof navigator === "undefined") {
    return "en";
  }

  const value = (navigator.language || "en").toLowerCase();
  return value.startsWith("it") ? "it" : "en";
}

export function pickLocalizedText(text: LocalizedText, locale: LocaleCode): string {
  return text[locale] || text.en || text.it;
}

export function pickLocalizedArray(text: LocalizedStringArray, locale: LocaleCode): string[] {
  const selected = text[locale];
  if (selected?.length) {
    return selected;
  }
  return text.en?.length ? text.en : text.it;
}
