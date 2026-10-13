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

test("the build header sits right under the top bar", async ({ page }) => {
  for (const size of [{ width: 375, height: 812 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(size);
    await page.goto("/en/builds/ranger");
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(200);
    const barBottom = await page.locator("body > div header").first().evaluate((el) => el.getBoundingClientRect().bottom);
    const buildTop = await page.locator("main header").first().evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(buildTop - barBottom), `${size.width}px`).toBeLessThanOrEqual(1);
  }
});
