import { expect, test } from "@playwright/test";

test("home page renders counter screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("mic-button")).toBeVisible();
  await expect(page.getByTestId("action-new-bill")).toBeVisible();
});
