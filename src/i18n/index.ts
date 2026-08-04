import { en, type TranslationKey } from "./en";

export function t(
  key: TranslationKey,
  replacements: Readonly<Record<string, string | number>> = {},
): string {
  let value: string = en[key];
  for (const [name, replacement] of Object.entries(replacements)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}

export { en };
export type { TranslationKey };
