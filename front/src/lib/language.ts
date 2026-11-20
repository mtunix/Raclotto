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

/** A number as `language` writes it: "1.250" and "4,5" in German; `options` set decimals, percent and the like. */
export function formatNumber(value: number, language: string | undefined, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(language, options);
}

/** antd Statistic's `formatter` for `language`; the Statistic's own separators are always English. */
export function numberFormatter(language: string | undefined, options?: Intl.NumberFormatOptions) {
  return (value: number | string) => formatNumber(Number(value), language, options);
}

/** An average rating with one decimal, the way the stars show it: "4,5" in German. */
export function formatRating(value: number, language: string | undefined): string {
  return formatNumber(value, language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Hours and minutes as `language` writes them ("19:05", "7:05 PM"); a value that is no date stays as it is. */
export function formatTime(value: string, language: string | undefined): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" });
}

/** How long ago `value` was, as `language` says it ("vor 3 Minuten", "just now"); a value that is no date stays as it is. */
export function formatTimeAgo(value: string, language: string | undefined, now: number = Date.now()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const seconds = Math.round((date.getTime() - now) / 1000);
  const format = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  if (Math.abs(seconds) < 60) return format.format(0, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return format.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return format.format(hours, "hour");
  return format.format(Math.round(hours / 24), "day");
}

/** A day and time as `language` writes it; a value that is no date stays as it is. */
export function formatDateTime(value: string, language: string | undefined): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(language);
}
