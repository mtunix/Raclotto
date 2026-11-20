import { PANTRY, addIngredients, api, createSession, expect, test } from "./support";

// Only a browser lays the page out; a view wider than a phone scrolls sideways.
test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("no view is wider than the screen", async ({ page }) => {
    const session = await createSession(page);
    await addIngredients(page, session, PANTRY);
    await (await api(page)).post("/pans/generate", { num_fill: 2, num_sauce: 1 }, { session_key: session.key });

    for (const view of ["", "dashboard", "generate", "history", "add", "achievements", "settings", "profile"]) {
      await page.goto(`/${session.id}/${view}`);
      await page.waitForLoadState("networkidle");
      const overflow = Number(await page.evaluate("document.documentElement.scrollWidth - window.innerWidth"));
      expect(overflow, `/${view} is ${overflow}px too wide`).toBeLessThanOrEqual(0);
    }
  });
});
