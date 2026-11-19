import { PANTRY, addIngredients, api, createSession, expect, t, test } from "./support";

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
  // The footer's button; antd's corner ✕ has the same name in German.
  await result.getByRole("button", { name: t("common.close") }).last().click();
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

// The e2e server runs without an image model, so a level-up must skip the picture quietly.
test("levels up a new cook without asking for a picture the server can't make", async ({ page }) => {
  const session = await createSession(page);
  await addIngredients(page, session, PANTRY);
  const admin = await api(page);
  const email = `climber-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.test`;
  const { token } = await admin.post<{ token: string }>("/invites", { email });
  const climber = await admin.post<{ token: string; user: { id: number } }>("/auth/register", {
    token,
    email,
    name: email.split("@")[0],
    password: "climber-password-1",
  });
  const client = await api(page, climber.token);
  const ingredients = await client.get<{ id: number }[]>("/ingredients", { session_key: session.key });
  const me = await client.get<{ next_level: { required_experience: number } }>("/auth/me");
  // Hand-picked pans of one ingredient bring the cook just short of the next level, so the next roll crosses it.
  let xp = 0;
  while (xp < me.next_level.required_experience - 15) {
    const outcome = await client.post<{ reward: { xp_after: number } }>(
      "/pans",
      { name: `Climb ${xp}`, ingredients: [ingredients[0].id] },
      { session_key: session.key },
    );
    xp = outcome.reward.xp_after;
  }

  await page.evaluate(
    ({ token, userId }) => {
      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user_id", String(userId));
    },
    { token: climber.token, userId: climber.user.id },
  );
  const generationRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/images/generate")) generationRequests.push(request.url());
  });
  await page.goto(`/${session.id}/generate`);

  const plus = page.getByRole("button", { name: "+" });
  await plus.nth(0).click();
  await plus.nth(0).click();
  await page.getByRole("button", { name: t("generate.generateButton") }).click();

  const result = page.getByRole("dialog").filter({ hasText: t("common.rate") });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(result.getByText(t("level.leveledUp"))).toBeVisible();
  await result.getByRole("button", { name: t("common.close") }).click();

  await expect(result).toBeHidden();
  await expect(page.getByRole("button", { name: t("generate.generateButton") })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(t("image.profilePictureError"))).toBeHidden();
  expect(generationRequests).toEqual([]);
});
