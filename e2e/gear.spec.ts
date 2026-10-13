// e2e/gear.spec.ts
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("dialog", { name: "Welcome to AionTools" }).getByRole("button", { name: "Skip" }).click();
});

test("gear sub-groups have their own anchors, below the sticky header", async ({ page }) => {
  await page.goto("/en/builds/ranger");
  for (const [link, id] of [["Endgame gear", "endgame"], ["Titles", "titles"], ["Stones", "stones"], ["Pantheon", "pantheon"]]) {
    await page.getByRole("navigation", { name: "Builds" }).getByRole("link", { name: link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await page.waitForTimeout(300);
    const headerBottom = await page.locator("main header").first().evaluate((el) => el.getBoundingClientRect().bottom);
    const titleTop = await page.locator(`#${id}-title`).evaluate((el) => el.getBoundingClientRect().top);
    expect(titleTop, id).toBeGreaterThanOrEqual(headerBottom);
  }
  await expect(page.getByText("Offensive titles", { exact: true })).toBeVisible();
  await expect(page.getByText(/You equip 3 titles/)).toBeVisible();
});

test("endgame gear shows Global usage, and TW usage after switching region", async ({ page }) => {
  await page.goto("/en/builds/ranger");
  const endgame = page.locator("#endgame");
  await expect(endgame.getByText(/Usage data: GameWith, .*characters/)).toBeVisible();
  await expect(endgame.getByText("Splendent Dragon Lord Bow")).toBeVisible();

  await page.evaluate(() => {
    const key = "aiontools:user-data";
    const data = JSON.parse(localStorage.getItem(key)!);
    data.settings.region = "tw";
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();
  await expect(endgame.getByText(/later season/)).toBeVisible();
  await expect(endgame.getByText("Splendent Dragon Lord Bow")).toHaveCount(0);
});
