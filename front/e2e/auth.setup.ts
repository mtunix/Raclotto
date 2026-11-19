import path from "node:path";
import { ADMIN, expect, login, t, test } from "./support";

test("sign in as the seeded admin", async ({ page }) => {
  await login(page, ADMIN.name, ADMIN.password);
  await expect(page.getByText(t("session.createNew"))).toBeVisible();
  // The rules intro has a test of its own; every other test starts past it.
  await page.evaluate(() => localStorage.setItem("rules_seen", "1"));
  await page.context().storageState({ path: path.join(process.env.E2E_RUN_DIR ?? "", "admin.json") });
});
