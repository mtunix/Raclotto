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

it("has no English fallbacks behind t(), which never show: t() returns the key when one is missing", () => {
  const fallbacks = Object.entries(sources).flatMap(([file, text]) =>
    [...text.matchAll(/\bt\([^()]*\)\s*\|\|\s*["'`]/g)].map((match) => `${file}: ${match[0]}`),
  );
  expect(fallbacks).toEqual([]);
});
