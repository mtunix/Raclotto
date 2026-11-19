import { useSyncExternalStore } from "react";
import i18next from "i18next";

function subscribe(onChange: () => void): () => void {
  i18next.on("languageChanged", onChange);
  return () => i18next.off("languageChanged", onChange);
}

const currentLanguage = (): string | undefined => i18next.resolvedLanguage ?? i18next.language;

/**
 * The language the UI speaks, re-rendering on a switch. Pass it to the formatters below rather than
 * reading it inside them, so memoized renders see the switch.
 */
export function useLanguage(): string | undefined {
  return useSyncExternalStore(subscribe, currentLanguage);
}

/** A day as `language` writes it ("19.11.2026" in German); a value that is no date stays as it is. */
export function formatDate(value: string, language: string | undefined, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(language, options);
}

/** A day and time as `language` writes it; a value that is no date stays as it is. */
export function formatDateTime(value: string, language: string | undefined): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(language);
}
