import { test, expect } from "@playwright/test";

test("removing a character can be undone", async ({ page }) => {
  await page.goto("/en");
  const dialog = page.getByRole("dialog", { name: "Welcome to AionTools" });
  await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.getByLabel("Name", { exact: true }).fill("Aria");
  await dialog.getByRole("button", { name: "Add character" }).click();
  await dialog.getByRole("button", { name: "Done" }).click();
  await page.goto("/en/settings");
  await page.getByRole("button", { name: "Remove Aria" }).click();
  await expect(page.getByRole("button", { name: "Remove Aria" })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Remove Aria" })).toBeVisible();
});
