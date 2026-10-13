// e2e/checklist.spec.ts
import { test, expect } from "@playwright/test";

test("onboarding → tick checklist → state survives reload", async ({ page }) => {
  await page.goto("/en");
  const dialog = page.getByRole("dialog", { name: "Welcome to AionTools" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.getByLabel("Name", { exact: true }).fill("Aria");
  await dialog.getByRole("button", { name: "Add character" }).click();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/en/checklist");
  await page.getByRole("button", { name: "Duty Missions, Aria: set to 1" }).click();
  await expect(page.getByRole("group", { name: "Duty Missions, Aria: 1 of 5" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("group", { name: "Duty Missions, Aria: 1 of 5" })).toBeVisible();
});

test("corrupt saved data is backed up and the app still loads", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("aiontools:user-data", "{bad");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/en");
  await expect(page.getByText("Saved data was unreadable.")).toBeVisible();
  const backups = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("aiontools-backup-")));
  expect(backups).toHaveLength(1);
});
