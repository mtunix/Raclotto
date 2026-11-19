import type { Page } from "@playwright/test";
import { createSession, expect, t, test } from "./support";

/** An ingredient's row; its buttons are edit, then delete. */
const row = (page: Page, name: string) =>
  page.getByText(name, { exact: true }).locator("xpath=ancestor::*[.//button][1]");

test("adds, edits and deletes an ingredient", async ({ page }) => {
  const session = await createSession(page);
  await page.goto(`/${session.id}/add`);

  await page.getByText(t("ingredient.addIngredient"), { exact: true }).click();
  const dialog = page.getByRole("dialog");
  const name = dialog.getByPlaceholder(t("common.enterName"));
  await expect(name).toHaveValue("");
  await name.fill("Courgette");
  await dialog.getByRole("button", { name: t("common.create") }).click();
  await expect(dialog).toBeHidden();
  await expect(row(page, "Courgette")).toBeVisible();

  // The dialog opens on the ingredient it edits, and starts empty again for the next one.
  await row(page, "Courgette").getByRole("button").first().click();
  await expect(name).toHaveValue("Courgette");
  await name.fill("Zucchini");
  await dialog.getByRole("button", { name: t("common.save") }).click();
  await expect(dialog).toBeHidden();
  await expect(row(page, "Zucchini")).toBeVisible();
  await page.getByText(t("ingredient.addIngredient"), { exact: true }).click();
  await expect(name).toHaveValue("");
  await dialog.getByRole("button", { name: t("common.cancel") }).click();

  // Deleting asks for a second click.
  const remove = row(page, "Zucchini").getByRole("button").nth(1);
  await remove.click();
  await expect(row(page, "Zucchini")).toBeVisible();
  await remove.click();
  await expect(page.getByText("Zucchini", { exact: true })).toBeHidden();
});
