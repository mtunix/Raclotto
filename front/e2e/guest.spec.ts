import { PANTRY, addIngredients, createSession, expect, login, t, test } from "./support";

test("a guest joins by the session's link, rolls, and keeps the account", async ({ page, browser }) => {
  const session = await createSession(page);
  await addIngredients(page, session, PANTRY);
  await page.goto(`/${session.id}`);
  await page.getByRole("button", { name: t("join.inviteToTable") }).first().click();
  const link = (await page.getByRole("dialog").locator(".join-qr-link-text").textContent()) ?? "";
  expect(link).toContain("/join/");

  const guest = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  const name = `guest${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await guest.goto(link);
  await guest.getByPlaceholder(t("auth.namePlaceholder")).fill(name);
  await guest.getByRole("button", { name: t("join.join") }).click();
  await expect(guest).toHaveURL(new RegExp(`/${session.id}/generate$`));
  await guest.getByRole("button", { name: t("rules.gotIt") }).click();
  await expect(guest.getByText(t("guest.notice"))).toBeVisible();

  await guest.getByRole("button", { name: "+" }).first().click();
  await guest.getByRole("button", { name: t("generate.generateButton") }).click();
  const result = guest.getByRole("dialog").filter({ hasText: t("common.rate") });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await result.getByRole("button", { name: t("common.close") }).last().click();
  await expect(result).toBeHidden();
  // The session's first pan picked its first ingredient of the hour.
  await expect(guest.getByText(t("ingredientOfTheHour.none"))).toBeHidden();

  await guest.getByRole("button", { name: t("guest.keepAccountButton") }).first().click();
  await expect(guest).toHaveURL(new RegExp(`/${session.id}/settings$`));
  await guest.getByLabel(t("auth.password"), { exact: true }).fill("guest-password-1");
  await guest.getByLabel(t("auth.confirmPassword")).fill("guest-password-1");
  await guest.getByRole("button", { name: t("guest.keepAccountButton") }).click();
  await expect(guest.getByText(t("guest.kept"))).toBeVisible();
  await expect(guest.getByText(t("settings.changePassword")).first()).toBeVisible();

  await guest.evaluate(() => localStorage.clear());
  await login(guest, name, "guest-password-1");
  await expect(guest.getByText(t("session.createNew"))).toBeVisible();
  await guest.close();
});
