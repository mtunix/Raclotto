import { PANTRY, addIngredients, api, createSession, expect, t, test } from "./support";

test("sorts the whole history by rating, not just the page it has loaded", async ({ page }) => {
  const session = await createSession(page);
  await addIngredients(page, session, PANTRY);
  // A cook of its own rolls the pans, so their XP can't level up the admin other tests roll as.
  const admin = await api(page);
  const email = `cook-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.test`;
  const { token } = await admin.post<{ token: string }>("/invites", { email });
  const cook = await admin.post<{ token: string }>("/auth/register", {
    token,
    email,
    name: email.split("@")[0],
    password: "cook-password-1",
  });
  const client = await api(page, cook.token);
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

  await page.getByText(t("history.sortAndFilters")).click();
  await page.locator(".ant-select").filter({ hasText: t("history.time") }).click();
  await page.locator(".ant-select-item-option").filter({ hasText: t("history.rating") }).click();

  await expect(titles.first()).toHaveText("Best Pan");
});
