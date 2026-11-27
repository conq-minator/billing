import { expect, test } from "@playwright/test";

test.describe("M4.1 Bengali Acceptance Test (AT-15)", () => {
  test.beforeEach(async ({ request, page }) => {
    await request.post("/api/demo/reset", { data: { profile: "fresh" } });
    await page.goto("/");
    await page.waitForFunction(() => typeof window.__injectTranscript === "function");
    await page.getByTestId("lang-bn").click();
  });

  test("AT-15: Bengali billing + unknown Kurkure + finish", async ({ page }) => {
    await page.evaluate(() =>
      window.__injectTranscript!(
        "Aashirvaad atta panch kilo, toor dal ek kilo, Maggi char packet, Amul doodh dui, Surf ek"
      )
    );
    await expect(page.getByTestId("bill-total")).toContainText("₹672.00");

    await page.evaluate(() => window.__injectTranscript!("Kurkure tin packet"));
    await expect(page.getByTestId("bill-line-6")).toContainText("Kurkure");

    await page.evaluate(() => window.__injectTranscript!("hoye geche"));
    await expect(page.getByTestId("pending-chip")).toContainText("Kurkure-er dam koto?");

    await page.evaluate(() => window.__injectTranscript!("10"));
    await expect(page.getByTestId("bill-total")).toContainText("₹702.00");
    await expect(page.getByTestId("readback-text")).toContainText("UPI na cash?");
  });
});
