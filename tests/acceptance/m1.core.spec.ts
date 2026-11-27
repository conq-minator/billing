import { expect, test } from "@playwright/test";

test.describe("M1 Core Acceptance Tests (AT-01..AT-06, AT-10)", () => {
  test.beforeEach(async ({ request, page }) => {
    await request.post("/api/demo/reset", { data: { profile: "fresh" } });
    await page.goto("/");
    await page.waitForFunction(() => typeof window.__injectTranscript === "function");
  });

  test("AT-01: 5 spoken items auto-fill and finish readback", async ({ page }) => {
    await page.evaluate(() =>
      window.__injectTranscript!(
        "Aashirvaad atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, Amul doodh 2, Surf ek"
      )
    );

    await expect(page.getByTestId("bill-line-1")).toContainText("Aashirvaad Atta");
    await expect(page.getByTestId("bill-line-5")).toContainText("Surf Excel 1kg");
    await expect(page.getByTestId("bill-total")).toContainText("₹672.00");

    await page.evaluate(() => window.__injectTranscript!("bas"));
    await expect(page.getByTestId("readback-text")).toContainText("672");
  });

  test("AT-02 & AT-06: Dal default unit + Paav kilo jeera", async ({ page }) => {
    await page.evaluate(() => window.__injectTranscript!("Dal"));
    await expect(page.getByTestId("bill-line-1")).toContainText("Toor Dal");
    await expect(page.getByTestId("bill-line-1")).toContainText("1 kg");

    await page.evaluate(() => window.__injectTranscript!("Paav kilo jeera"));
    await expect(page.getByTestId("bill-line-2")).toContainText("Jeera");
    await expect(page.getByTestId("bill-line-2")).toContainText("0.25 kg");
    await expect(page.getByTestId("bill-line-2")).toContainText("₹150.00");
  });

  test("AT-03: Unknown Kurkure -> price_needed -> Done asks -> answer fills bill & memory", async ({
    page,
  }) => {
    await page.evaluate(() => window.__injectTranscript!("Kurkure 3 packet"));
    await expect(page.getByTestId("bill-line-1")).toContainText("Kurkure");
    await expect(page.getByTestId("bill-line-1")).toContainText("रेट चाहिए");

    await page.getByTestId("action-done").click();
    await expect(page.getByTestId("pending-chip")).toContainText(
      "Kurkure ka rate kya hai?"
    );

    await page.evaluate(() => window.__injectTranscript!("10 rupaye"));
    await expect(page.getByTestId("bill-total")).toContainText("₹30.00");

    // Next bill auto-fills ₹10
    await page.getByTestId("action-new-bill").click();
    await expect(page.getByTestId("live-bill-empty")).toBeVisible();
    await page.evaluate(() => window.__injectTranscript!("Kurkure 3 packet"));
    await expect(page.getByTestId("bill-total")).toContainText("₹30.00");
  });

  test("AT-04 & AT-05: Tap atta rate 52 -> 55 learns; sirf is baar 58 does not", async ({
    page,
  }) => {
    await page.evaluate(() =>
      window.__injectTranscript!(
        "Aashirvaad atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, Amul doodh 2, Surf ek"
      )
    );
    await page.getByTestId("bill-line-1").getByRole("button").first().click();
    await page.getByTestId("edit-rate-input").fill("55");
    await page.getByTestId("edit-save-btn").click();
    await expect(page.getByTestId("toast-banner")).toContainText("yaad rakh liya");
    await expect(page.getByTestId("bill-line-1")).toContainText("₹275.00");

    await page.evaluate(() =>
      window.__injectTranscript!("Atta 58 ka, sirf is baar")
    );
    await expect(page.getByTestId("bill-line-1")).toContainText("₹290.00");

    // Next bill should still auto-fill ₹55
    await page.getByTestId("action-new-bill").click();
    await expect(page.getByTestId("live-bill-empty")).toBeVisible();
    await page.evaluate(() =>
      window.__injectTranscript!(
        "Aashirvaad atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, Amul doodh 2, Surf ek"
      )
    );
    await expect(page.getByTestId("bill-line-1")).toContainText("₹275.00");
  });

  test("AT-10: Voice remove, edit qty, and last correction", async ({ page }) => {
    await page.evaluate(() =>
      window.__injectTranscript!("Chawal 2 kilo, dal 1 kilo")
    );
    await expect(page.getByTestId("bill-line-1")).toContainText("Basmati Chawal");
    await expect(page.getByTestId("bill-line-2")).toContainText("Toor Dal");

    await page.evaluate(() => window.__injectTranscript!("Chawal hata do"));
    await expect(page.getByTestId("live-bill")).not.toContainText("Basmati Chawal");
    await expect(page.getByTestId("bill-line-1")).toContainText("Toor Dal");

    await page.evaluate(() => window.__injectTranscript!("dal 2 kilo kar do"));
    await expect(page.getByTestId("bill-line-1")).toContainText("2 kg");
    await expect(page.getByTestId("bill-total")).toContainText("₹320.00");

    await page.evaluate(() => window.__injectTranscript!("nahi nahi ek hi"));
    await expect(page.getByTestId("bill-line-1")).toContainText("1 kg");
    await expect(page.getByTestId("bill-total")).toContainText("₹160.00");
  });
});
