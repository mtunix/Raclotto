import { createSession, expect, t, test } from "./support";

test("renames the session", async ({ page }) => {
  const session = await createSession(page);
  await page.goto(`/${session.id}/settings`);
  await page.getByRole("tab", { name: t("settings.sessionSettings") }).click();

  const name = page.getByRole("tabpanel").getByPlaceholder(t("common.enterName"));
  await expect(name).toHaveValue(session.name);
  await name.fill(`${session.name} renamed`);
  await page.getByRole("tabpanel").getByRole("button", { name: t("common.save") }).click();
  await expect(page.getByText(`${session.name} renamed`, { exact: true }).first()).toBeVisible();
});

test("keeps the event settings it saved", async ({ page }) => {
  const session = await createSession(page);
  await page.goto(`/${session.id}/settings`);
  await page.getByRole("tab", { name: t("settings.eventSettings") }).click();

  const panSwap = page.getByRole("switch").first();
  const before = await panSwap.getAttribute("aria-checked");
  await panSwap.click();
  await page.getByRole("button", { name: t("common.save") }).click();
  await expect(page.getByText(t("common.saved"))).toBeVisible();

  await page.reload();
  await page.getByRole("tab", { name: t("settings.eventSettings") }).click();
  await expect(page.getByRole("switch").first()).not.toHaveAttribute("aria-checked", before ?? "");
});

test("ends the session with a recap", async ({ page }) => {
  const session = await createSession(page);
  await page.goto(`/${session.id}/settings`);
  await page.getByRole("tab", { name: t("settings.sessionSettings") }).click();

  await page.getByRole("button", { name: t("session.endSession") }).click();
  await page.getByRole("dialog").getByRole("button", { name: t("session.endSession") }).click();
  await expect(page).toHaveURL(new RegExp(`/recap/${session.key}$`));
  await expect(page.getByRole("heading", { name: session.name })).toBeVisible();
});

test("invites someone who then registers", async ({ page, browser }) => {
  const session = await createSession(page);
  const email = `guest-${Date.now()}@example.test`;
  await page.goto(`/${session.id}/settings`);
  await page.getByRole("tab", { name: t("common.invites") }).click();
  await page.getByPlaceholder(t("invite.emailPlaceholder")).fill(email);
  const created = page.waitForResponse((r) => r.url().endsWith("/api/invites") && r.request().method() === "POST");
  await page.getByRole("button", { name: t("common.create") }).click();
  const { token } = (await (await created).json()) as { token: string };
  await expect(page.getByText(token)).toBeVisible();

  const guest = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await guest.goto(`/register?token=${encodeURIComponent(token)}`);
  // The link fills in and locks the token and the invited address.
  await expect(guest.getByPlaceholder(t("auth.emailPlaceholder"))).toHaveValue(email);
  await expect(guest.getByPlaceholder(t("auth.emailPlaceholder"))).toBeDisabled();
  await guest.getByPlaceholder(t("auth.namePlaceholder")).fill(`guest${Date.now().toString(36)}`);
  await guest.getByPlaceholder(t("auth.passwordPlaceholder")).fill("guest-password-1");
  await guest.getByPlaceholder(t("auth.confirmPasswordPlaceholder")).fill("guest-password-1");
  await guest.getByRole("button", { name: t("auth.register") }).click();
  await expect(guest.getByText(t("session.createNew"))).toBeVisible();
  await guest.close();
});
