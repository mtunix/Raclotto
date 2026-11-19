import { PANTRY, addIngredients, createSession, expect, t, test } from "./support";

for (const [path, title] of [
  ["dashboard", "common.dashboard"],
  ["achievements", "common.achievements"],
  ["profile", "profile.title"],
] as const) {
  test(`shows the ${path}`, async ({ page }) => {
    const session = await createSession(page);
    await addIngredients(page, session, PANTRY);
    await page.goto(`/${session.id}/${path}`);
    await expect(page.getByText(t(title)).first()).toBeVisible();
  });
}

test("shows the rules without signing in", async ({ browser }) => {
  const page = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await page.goto("/rules");
  await expect(page.getByText(t("rules.title")).first()).toBeVisible();
  await page.close();
});
