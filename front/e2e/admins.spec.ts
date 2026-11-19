import { api, createSession, expect, login, t, test } from "./support";

test("grants admin to a new user, who then sees the admin settings", async ({ page, browser }) => {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const guest = { name: `guest${stamp}`, email: `guest-${stamp}@example.test`, password: "guest-password-1" };
  const session = await createSession(page);
  const { token } = await (await api(page)).post<{ token: string }>("/invites", { email: guest.email });
  const registered = await page.request.post("/api/auth/register", {
    data: { token, email: guest.email, name: guest.name, password: guest.password },
  });
  expect(registered.ok(), await registered.text()).toBeTruthy();

  const guestPage = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await guestPage.addInitScript(() => localStorage.setItem("rules_seen", "1"));
  await login(guestPage, guest.name, guest.password);
  await expect(guestPage.getByText(t("session.createNew"))).toBeVisible();
  const guestSession = await createSession(guestPage);
  await guestPage.goto(`/${guestSession.id}/settings`);
  await expect(guestPage.getByRole("tab", { name: t("common.invites") })).toBeVisible();
  await expect(guestPage.getByRole("tab", { name: t("settings.admins") })).toHaveCount(0);

  await page.goto(`/${session.id}/settings`);
  await page.getByRole("tab", { name: t("settings.admins") }).click();
  // The admin's own rights are another admin's to change.
  await expect(page.getByRole("switch", { name: "admin", exact: true })).toBeDisabled();
  const grant = page.getByRole("switch", { name: guest.name, exact: true });
  await expect(grant).not.toBeChecked();
  await grant.click();
  await expect(page.getByText(t("settings.adminGranted").replace("{{name}}", guest.name))).toBeVisible();
  await expect(grant).toBeChecked();

  await guestPage.reload();
  await guestPage.getByRole("tab", { name: t("settings.admins") }).click();
  await expect(guestPage.getByRole("switch", { name: guest.name, exact: true })).toBeDisabled();
  await expect(guestPage.getByRole("switch", { name: "admin", exact: true })).toBeChecked();
  await expect(guestPage.getByRole("switch", { name: "admin", exact: true })).toBeEnabled();
  await guestPage.close();
});
