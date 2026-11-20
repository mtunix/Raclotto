import type { Page } from "@playwright/test";
import { PANTRY, addIngredients, api, createSession, expect, login, t, test } from "./support";

const COOK_PASSWORD = "cook-password-1";

/** A cook of its own rolls the pans, so their XP can't level up the admin other tests roll as. */
async function registerCook(page: Page) {
  const admin = await api(page);
  const email = `cook-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.test`;
  const name = email.split("@")[0];
  const { token } = await admin.post<{ token: string }>("/invites", {});
  const cook = await admin.post<{ token: string }>("/auth/register", { token, email, name, password: COOK_PASSWORD });
  return { name, token: cook.token };
}

async function newCook(page: Page) {
  return api(page, (await registerCook(page)).token);
}

test("sorts the whole history by rating, not just the page it has loaded", async ({ page }) => {
  const session = await createSession(page);
  await addIngredients(page, session, PANTRY);
  const client = await newCook(page);
  const ingredients = await client.get<{ id: number }[]>("/ingredients", { session_key: session.key });
  // The best pan is the oldest, so newest first it is on the second page.
  for (let i = 0; i < 13; i++) {
    const outcome = await client.post<{ pan: { id: number } }>(
      "/pans",
      { name: i === 0 ? "Best Pan" : `Pan ${i}`, ingredients: [ingredients[i % ingredients.length].id] },
      { session_key: session.key },
    );
    await client.post("/ratings", { pan_id: outcome.pan.id, rating: i === 0 ? 5 : 1 + (i % 3) });
  }

  await page.goto(`/${session.id}/history`);
  const titles = page.getByRole("heading", { level: 4 });
  await expect(titles.first()).toHaveText("Pan 12");
  await expect(page.getByText("Best Pan")).toBeHidden();

  // A desktop shows sorting and filters without a toggle.
  await expect(page.getByText(t("history.sortAndFilters"))).toBeHidden();
  await page.locator(".ant-select").filter({ hasText: t("history.time") }).click();
  await page.locator(".ant-select-item-option").filter({ hasText: t("history.rating") }).click();

  await expect(titles.first()).toHaveText("Best Pan");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("folds sorting and filters behind a toggle", async ({ page }) => {
    const session = await createSession(page);
    await addIngredients(page, session, PANTRY);
    const client = await newCook(page);
    const ingredients = await client.get<{ id: number }[]>("/ingredients", { session_key: session.key });
    await client.post("/pans", { name: "Phone Pan", ingredients: [ingredients[0].id] }, { session_key: session.key });

    await page.goto(`/${session.id}/history`);
    await expect(page.getByText("Phone Pan")).toBeVisible();
    const sorting = page.locator(".ant-select").filter({ hasText: t("history.time") });
    await expect(sorting).toBeHidden();

    await page.getByText(t("history.sortAndFilters")).click();

    await expect(sorting).toBeVisible();
  });
});

test("lets a pan's author delete it, ratings and all, only after confirming", async ({ page, browser }) => {
  const session = await createSession(page);
  await addIngredients(page, session, PANTRY);
  const cook = await registerCook(page);
  const client = await api(page, cook.token);
  const [potato] = await client.get<{ id: number }[]>("/ingredients", { session_key: session.key });
  const roll = (name: string) =>
    client.post<{ pan: { id: number } }>("/pans", { name, ingredients: [potato.id] }, { session_key: session.key });
  const doomed = await roll("Doomed Pan");
  await roll("Kept Pan");
  await (await api(page)).post("/ratings", { pan_id: doomed.pan.id, rating: 4 });

  // Someone else, an admin at that, gets no way to delete the cook's pans.
  await page.goto(`/${session.id}/history`);
  await expect(page.getByText("Doomed Pan")).toBeVisible();
  await expect(page.getByRole("button", { name: t("history.panActions") })).toHaveCount(0);

  const cookPage = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await cookPage.addInitScript(() => localStorage.setItem("rules_seen", "1"));
  await login(cookPage, cook.name, COOK_PASSWORD);
  await expect(cookPage.getByText(t("session.createNew"))).toBeVisible();
  await cookPage.goto(`/${session.id}/history`);
  const card = cookPage.locator(".pan-card").filter({ hasText: "Doomed Pan" });
  const dialog = cookPage.getByRole("dialog");
  const openConfirm = async () => {
    await card.getByRole("button", { name: t("history.panActions") }).click();
    await cookPage.getByRole("menuitem", { name: t("history.deletePan") }).click();
    await expect(dialog).toContainText(t("history.deleteConfirmTitle").replace("{{name}}", "Doomed Pan"));
  };

  await openConfirm();
  await expect(dialog).toContainText(t("history.deleteConfirmMessage"));
  const cancel = dialog.getByRole("button", { name: t("common.cancel") });
  await expect(cancel).toBeFocused();
  await cookPage.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(card).toBeVisible();

  await openConfirm();
  await cookPage.mouse.click(5, 5);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: t("history.deleteConfirm") }).click();

  await expect(cookPage.getByText(t("history.panDeleted"))).toBeVisible();
  await expect(card).toHaveCount(0);
  await expect(cookPage.getByText("Kept Pan")).toBeVisible();
  const left = await client.get<{ items: { name: string }[] }>("/pans", { session_key: session.key });
  expect(left.items.map((pan) => pan.name)).toEqual(["Kept Pan"]);
  await cookPage.close();
});
