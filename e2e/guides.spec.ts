// e2e/guides.spec.ts
import { test, expect, type Page } from "@playwright/test";

// The shortcut listener attaches after hydration: retry until the palette is actually open.
// Then fill the query (not keystrokes, which can land before the input is focused) and wait for the match.
async function jumpTo(page: Page, query: string) {
  await openPalette(page);
  const input = page.getByPlaceholder("Search pages and activities…");
  await input.fill(query);
  await expect(page.getByRole("option", { name: query, exact: true })).toHaveAttribute("aria-selected", "true");
  await input.press("Enter");
}
async function openPalette(page: Page) {
  await expect(async () => {
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder("Search pages and activities…")).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("dialog", { name: "Welcome to AionTools" }).getByRole("button", { name: "Skip" }).click();
});

test("crafting prices update the total and persist", async ({ page }) => {
  await page.goto("/en/crafting");
  const total = page.getByTestId("crafting-total");
  await expect(total).toHaveText("30,477,639");
  const price = page.getByLabel("Unit price of Common Material");
  await price.fill("2000");
  await price.press("Enter");
  await expect(total).toHaveText("30,492,838");
  await page.reload();
  await expect(page.getByLabel("Unit price of Common Material")).toHaveValue("2,000");
  await expect(page.getByTestId("crafting-total")).toHaveText("30,492,838");
});

test("content guide filters by section", async ({ page }) => {
  await page.goto("/en/guides/content");
  await page.getByRole("group", { name: "Section" }).getByRole("button", { name: "Recharge" }).click();
  await expect(page.getByText("Nightmare", { exact: true })).toBeVisible();
  await expect(page.getByText("Duty Missions", { exact: true })).toHaveCount(0);
});

test("roadmap steps persist", async ({ page }) => {
  await page.goto("/en/guides/roadmap");
  const first = page.getByRole("checkbox").first();
  await first.check();
  await expect(page.getByText(/^1 of \d+ steps done$/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
});

test("Ctrl+K jumps to an activity", async ({ page }) => {
  await page.goto("/en");
  await jumpTo(page, "Nightmare");
  await expect(page).toHaveURL(/\/en\/guides\/content#nightmare$/);
  await expect(page.locator("details#nightmare")).toHaveAttribute("open", "");
  // Same-page jump: opens another entry without a navigation.
  await jumpTo(page, "Duty Missions");
  await expect(page.locator("details#duty-missions")).toHaveAttribute("open", "");
});
