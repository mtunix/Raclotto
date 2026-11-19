import { PANTRY, addIngredients, createSession, expect, t, test } from "./support";

const PANTRY_NAMES = new RegExp(PANTRY.map((ingredient) => ingredient.name).join("|"));

test("rolls a pan, rates it and finds it in the history", async ({ page }) => {
  const session = await createSession(page);
  await addIngredients(page, session, PANTRY);
  await page.goto(`/${session.id}/generate`);

  const plus = page.getByRole("button", { name: "+" });
  await plus.nth(0).click();
  await plus.nth(0).click();
  await plus.nth(1).click();
  await page.getByRole("button", { name: t("generate.generateButton") }).click();

  const result = page.getByRole("dialog").filter({ hasText: t("common.rate") });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(result.getByText(PANTRY_NAMES).first()).toBeVisible();
  await result.locator(".ant-rate-star").nth(3).click();
  await result.getByRole("button", { name: t("common.close") }).click();
  await expect(result).toBeHidden();

  await page.goto(`/${session.id}/history`);
  await expect(page.getByText(PANTRY_NAMES).first()).toBeVisible();
  await expect(page.locator(".ant-rate-star-full")).toHaveCount(4);
});

test("spins the bandit onto a pan", async ({ page }) => {
  const session = await createSession(page);
  await addIngredients(page, session, PANTRY);
  await page.goto(`/${session.id}/generate`);

  await page.getByRole("tab", { name: t("generate.banditMode") }).click();
  // The lever is a clickable panel, not a button.
  await page.getByText(t("generate.banditSpin")).click();

  const result = page.getByRole("dialog").filter({ hasText: t("generate.rollAnotherDice") });
  await expect(result).toBeVisible({ timeout: 20_000 });
  await expect(result.getByText(PANTRY_NAMES).first()).toBeVisible();
  await result.locator(".ant-rate-star").nth(4).click();
  await expect(result.locator(".ant-rate-star-full")).toHaveCount(5);
});
