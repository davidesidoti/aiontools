// e2e/builds.spec.ts
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("dialog", { name: "Welcome to AionTools" }).getByRole("button", { name: "Skip" }).click();
});

test("class grid leads to a build with skill icons", async ({ page }) => {
  await page.goto("/en/builds");
  await page.getByRole("link", { name: "Ranger" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ranger" })).toBeVisible();
  await expect(page.locator("#skills img").first()).toBeVisible();
  await page.getByRole("link", { name: "Soul binding" }).click();
  await expect(page).toHaveURL(/#soulbind$/);
});

test("unknown class is a 404", async ({ page }) => {
  const res = await page.goto("/en/builds/not-a-class");
  expect(res?.status()).toBe(404);
});

test("no page scrolls sideways on a 375px phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/en", "/en/checklist", "/en/builds/ranger", "/en/crafting", "/en/guides/content", "/en/guides/roadmap", "/en/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, path).toBeLessThanOrEqual(375);
  }
});

test("anchor jumps keep the section title below the sticky header", async ({ page }) => {
  for (const size of [{ width: 375, height: 812 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(size);
    await page.goto("/en/builds/ranger");
    await page.getByRole("link", { name: "Soul binding" }).click();
    await expect(page).toHaveURL(/#soulbind$/);
    await page.waitForTimeout(300);
    const headerBottom = await page.locator("main header").first().evaluate((el) => el.getBoundingClientRect().bottom);
    const titleTop = await page.locator("#soulbind-title").evaluate((el) => el.getBoundingClientRect().top);
    expect(titleTop, `${size.width}px`).toBeGreaterThanOrEqual(headerBottom);
  }
});

test("no build page scrolls sideways on a 375px phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const id of ["chanter", "ranger", "cleric", "spirit-master", "gladiator", "sorcerer", "templar", "assassin"]) {
    await page.goto(`/it/builds/${id}`);
    await page.waitForLoadState("networkidle");
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, id).toBeLessThanOrEqual(375);
  }
});
