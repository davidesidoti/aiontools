// e2e/events.spec.ts
import { test, expect } from "@playwright/test";

test.use({ timezoneId: "Europe/Rome" });

test.beforeEach(async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("dialog", { name: "Welcome to AionTools" }).getByRole("button", { name: "Skip" }).click();
});

test("the top bar shows the Rift and Shugo countdowns on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const bar = page.locator("body > div header").first();
  await expect(bar.getByText("Spacetime Rift")).toBeVisible();
  await expect(bar.getByText("Shugo Festival")).toBeVisible();
});

test("switching the Global server changes the event times on Home", async ({ page }) => {
  await page.goto("/en");
  const siege = page.getByTestId("event-when-siege");
  await expect(siege).not.toBeEmpty();
  const before = await siege.textContent();

  await page.goto("/en/settings");
  await page.getByLabel("Server").click();
  await page.getByRole("option", { name: "NA West" }).click();
  await page.goto("/en");
  await expect(siege).not.toHaveText(before!);
});
