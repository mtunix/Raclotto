import { test as base, expect, type Page } from "@playwright/test";
import de from "../src/locales/de/translation.json" with { type: "json" };

export { expect };

/** The German text of a translation key; the app starts in German and the admin keeps it. */
export function t(key: string): string {
  const text = key.split(".").reduce<unknown>(
    (node, part) => (typeof node === "object" && node !== null ? (node as Record<string, unknown>)[part] : undefined),
    de,
  );
  if (typeof text !== "string") throw new Error(`No German translation for ${key}`);
  return text;
}

export const ADMIN = { name: "admin", password: process.env.E2E_ADMIN_PASSWORD ?? "" };

type Options = {
  /** Console errors a test expects, such as the 401 of a rejected login. */
  allowedConsoleErrors: RegExp[];
};

/** Fails a test on any uncaught page error, and on console errors it didn't allow. */
export const test = base.extend<Options & { failOnErrors: void }>({
  allowedConsoleErrors: [[], { option: true }],
  failOnErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error" && !allowedConsoleErrors.some((pattern) => pattern.test(message.text()))) {
          errors.push(`console: ${message.text()}`);
        }
      });
      await use();
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

export async function login(page: Page, name: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder(t("auth.emailOrNamePlaceholder")).fill(name);
  await page.getByPlaceholder(t("auth.passwordPlaceholder")).fill(password);
  await page.getByRole("button", { name: t("auth.login") }).click();
}

export interface Session {
  id: number;
  key: string;
  name: string;
}

/** A fresh session, joined; names are unique so tests sharing the database don't meet. */
export async function createSession(page: Page, prefix = "E2E"): Promise<Session> {
  const name = `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await page.goto("/");
  await page.getByPlaceholder(t("session.sessionNamePlaceholder")).fill(name);
  await page.getByRole("button", { name: t("common.create") }).click();
  await page.waitForURL(/\/\d+$/);
  const id = Number(new URL(page.url()).pathname.slice(1));
  const session = await (await api(page)).get<Session>(`/sessions/${id}`);
  return { id, key: session.key, name };
}

export interface NewIngredient {
  name: string;
  /** 1 fill, 2 sauce */
  type: 1 | 2;
  vegan?: boolean;
  vegetarian?: boolean;
  meat?: boolean;
}

/** Calls the API as the signed-in user, for setup a test doesn't exercise through the UI. */
export async function api(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("auth_token"));
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  return {
    async get<T>(path: string, params?: Record<string, string>): Promise<T> {
      const response = await page.request.get(`/api${path}`, { headers, params });
      expect(response.status(), `GET ${path}`).toBe(200);
      return (await response.json()) as T;
    },
    async post<T>(path: string, data: unknown, params?: Record<string, string>): Promise<T> {
      const response = await page.request.post(`/api${path}`, { headers, params, data });
      expect(response.ok(), `POST ${path}: ${await response.text()}`).toBeTruthy();
      return (await response.json()) as T;
    },
  };
}

export async function addIngredients(page: Page, session: Session, ingredients: NewIngredient[]) {
  const client = await api(page);
  for (const ingredient of ingredients) {
    await client.post("/ingredients", { vegan: true, vegetarian: false, meat: false, ...ingredient }, { session_key: session.key });
  }
}

/** Enough vegan fills and sauces for any roll the admin's diet allows. */
export const PANTRY: NewIngredient[] = [
  { name: "Potato", type: 1 },
  { name: "Leek", type: 1 },
  { name: "Mushroom", type: 1 },
  { name: "Pepper", type: 1 },
  { name: "Aioli", type: 2 },
  { name: "Salsa", type: 2 },
];
