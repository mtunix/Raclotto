import { ADMIN, createSession, expect, login, t, test } from "./support";

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe("with a wrong password", () => {
    test.use({ allowedConsoleErrors: [/401/] });

    test("is told the credentials are wrong", async ({ page }) => {
      await login(page, ADMIN.name, "not-the-password");
      await expect(page.getByText(t("auth.invalidCredentials"))).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  test("sees the rules once, on entering the first session", async ({ page }) => {
    await login(page, ADMIN.name, ADMIN.password);
    await expect(page.getByText(t("session.createNew"))).toBeVisible();
    // The intro is a dialog over the session; creating one opens it.
    await page.evaluate(() => localStorage.removeItem("rules_seen"));
    await createSession(page);
    const intro = page.getByRole("dialog", { name: t("rules.firstVisitTitle") });
    await expect(intro).toBeVisible();
    await intro.getByRole("button", { name: t("rules.gotIt") }).click();
    await expect(intro).toBeHidden();

    await page.reload();
    await expect(page.getByRole("button", { name: t("common.settings") })).toBeVisible();
    await expect(intro).toBeHidden();
  });

  test("is sent to the login from a protected page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test("signs out", async ({ page }) => {
  await createSession(page);
  await page.getByRole("button", { name: t("auth.logout") }).click();
  await expect(page).toHaveURL(/\/login$/);
});
