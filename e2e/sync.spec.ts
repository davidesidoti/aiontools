// e2e/sync.spec.ts
import { test, expect, type Page } from "@playwright/test";

async function onboard(page: Page, name: string) {
  await page.goto("/en");
  const dialog = page.getByRole("dialog", { name: "Welcome to AionTools" });
  await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Add character" }).click();
  await dialog.getByRole("button", { name: "Done" }).click();
}

test("a sync code carries progress to another browser and back", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  await onboard(a, "Aria");
  await a.goto("/en/checklist");
  await a.getByRole("button", { name: "Duty Missions, Aria: set to 1" }).click();
  await a.goto("/en/settings");
  await a.getByRole("button", { name: "Create sync code" }).click();
  const code = (await a.getByTestId("sync-code").textContent())!.trim();

  const b = await (await browser.newContext()).newPage();
  await b.goto("/en");
  await b.getByRole("dialog", { name: "Welcome to AionTools" }).getByRole("button", { name: "Skip" }).click();
  await b.goto("/en/settings");
  await b.getByLabel("Sync code").fill(code);
  await b.getByRole("button", { name: "Connect" }).click();
  await expect(b.getByTestId("sync-code")).toHaveText(code);
  await b.goto("/en/checklist");
  await expect(b.getByRole("group", { name: "Duty Missions, Aria: 1 of 5" })).toBeVisible();

  await b.getByRole("button", { name: "Duty Missions, Aria: set to 2" }).click();
  await b.waitForTimeout(3_000); // debounce (2 s) + request
  await a.goto("/en/checklist"); // load pulls the newer cloud copy
  await expect(a.getByRole("group", { name: "Duty Missions, Aria: 2 of 5" })).toBeVisible();
});
