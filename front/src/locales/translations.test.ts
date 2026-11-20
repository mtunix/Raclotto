import { AchievementKey, ApiErrorCode, EventType } from "../api/generated/model";
import de from "./de/translation.json";
import en from "./en/translation.json";

const sources = import.meta.glob<string>(["../**/*.{ts,tsx}", "!../**/*.test.{ts,tsx}", "!../api/generated/**"], {
  query: "?raw",
  import: "default",
  eager: true,
});

function keysOf(node: object, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]: [string, unknown]) =>
    typeof value === "object" && value !== null ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

const locales = { de: new Set(keysOf(de)), en: new Set(keysOf(en)) };

// A key with plural forms exists as key_one, key_other, ...
const has = (keys: Set<string>, key: string) => keys.has(key) || keys.has(`${key}_one`) || keys.has(`${key}_other`);

const literalKeys = (text: string) => [...text.matchAll(/\bt\(\s*(["'`])([^"'`$]+)\1/g)].map((match) => match[2]);

it("finds the source files", () => {
  expect(Object.keys(sources).length).toBeGreaterThan(50);
});

it("has the same keys in German and English", () => {
  expect([...locales.de].filter((key) => !locales.en.has(key))).toEqual([]);
  expect([...locales.en].filter((key) => !locales.de.has(key))).toEqual([]);
});

it.each(Object.entries(locales))("has every key the source names in %s", (_, keys) => {
  const missing = Object.entries(sources).flatMap(([file, text]) =>
    literalKeys(text)
      .filter((key) => !has(keys, key))
      .map((key) => `${file}: ${key}`),
  );
  expect(missing).toEqual([]);
});

it.each(Object.entries({ de, en }))("has every key the %s texts nest", (_, translation) => {
  const nested = JSON.stringify(translation).matchAll(/\$t\(([^)]+)\)/g);
  expect([...nested].map((match) => match[1]).filter((key) => !has(locales.de, key) || !has(locales.en, key))).toEqual([]);
});

function leaves(node: object, prefix = ""): [string, string][] {
  return Object.entries(node).flatMap(([key, value]: [string, unknown]): [string, string][] =>
    typeof value === "object" && value !== null
      ? leaves(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, String(value)]],
  );
}

const placeholders = (text: string) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]).sort();

it("fills the same placeholders in German and English", () => {
  const english = new Map(leaves(en));
  const differing = leaves(de)
    .filter(([key, text]) => english.has(key) && placeholders(text).join() !== placeholders(english.get(key) ?? "").join())
    .map(([key]) => key);
  expect(differing).toEqual([]);
});

// The backend sends these identifiers for the frontend to translate; the generated client lists every one it can send.
const serverTexts = {
  achievements: [...Object.values(AchievementKey), "retired"].flatMap((key) => [
    `achievements.${key}.title`,
    `achievements.${key}.description`,
  ]),
  events: Object.values(EventType).flatMap((type) => [`events.types.${type}.name`, `events.types.${type}.message`]),
  apiError: [...Object.values(ApiErrorCode).map((code) => `apiError.${code}`), "apiError.unknown"],
};

it.each(Object.entries(serverTexts))("translates every %s identifier the backend sends", (_, keys) => {
  expect(keys.filter((key) => !has(locales.de, key) || !has(locales.en, key))).toEqual([]);
});

it.each(Object.entries(serverTexts))("has no %s texts for identifiers the backend no longer sends", (family, keys) => {
  const known = new Set(keys);
  const stale = [...locales.en].filter(
    (key) =>
      key.startsWith(family === "events" ? "events.types." : `${family}.`) && !known.has(key.replace(/_(one|other)$/, "")),
  );
  expect(stale).toEqual([]);
});

it("has no English fallbacks behind t(), which never show: t() returns the key when one is missing", () => {
  const fallbacks = Object.entries(sources).flatMap(([file, text]) =>
    [...text.matchAll(/\bt\([^()]*\)\s*\|\|\s*["'`]/g)].map((match) => `${file}: ${match[0]}`),
  );
  expect(fallbacks).toEqual([]);
});
