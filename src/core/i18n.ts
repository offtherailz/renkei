import { LocaleCode, LocalizedStringArray, LocalizedText } from "../types/models";

export function detectUserLocale(): LocaleCode {
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
