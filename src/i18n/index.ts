import { en, type TranslationKey } from "./en";
import { ja } from "./ja";

export type Language = "en" | "ja";

const STORAGE_KEY = "sourceglass.language";

function storedLanguage(): Language | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "en" || value === "ja" ? value : undefined;
  } catch {
    return undefined;
  }
}

function browserLanguage(): Language {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

let language: Language = storedLanguage() ?? browserLanguage();

if (typeof document !== "undefined") {
  document.documentElement.lang = language;
}

export function getLanguage(): Language {
  return language;
}

export function setLanguage(nextLanguage: Language): void {
  language = nextLanguage;
  if (typeof document !== "undefined") {
    document.documentElement.lang = nextLanguage;
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch {
      // A blocked storage API must not prevent an in-memory language change.
    }
  }
}

export function t(
  key: TranslationKey,
  replacements: Readonly<Record<string, string | number>> = {},
): string {
  const dictionary = language === "ja" ? ja : en;
  let value: string = dictionary[key];
  for (const [name, replacement] of Object.entries(replacements)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}

export { en, ja };
export type { TranslationKey };
