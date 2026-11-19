import type { Page } from "@playwright/test";
import { PANTRY, addIngredients, api, createSession, expect, t, test } from "./support";

/** A cook of its own rolls the pans, so their XP can't level up the admin other tests roll as. */
async function newCook(page: Page) {
  const admin = await api(page);
  const email = `cook-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.test`;
  const { token } = await admin.post<{ token: string }>("/invites", { email });
  const cook = await admin.post<{ token: string }>("/auth/register", {
    token,
    email,
    name: email.split("@")[0],
    password: "cook-password-1",
  });
  return api(page, cook.token);
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
