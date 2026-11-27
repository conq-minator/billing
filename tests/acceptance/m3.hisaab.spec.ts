import { expect, test } from "@playwright/test";

test.describe("M3 Hisaab Acceptance Tests (AT-13, AT-14, screens)", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/demo/reset", { data: { profile: "fresh" } });
  });

  test("AT-13 & AT-14: Aaj ka hisaab, dues list, and Sharma ji WhatsApp reminder", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(() => typeof window.__injectTranscript === "function");

    await page.evaluate(() => window.__injectTranscript!("Aaj ka hisaab?"));
    await expect(page.getByTestId("query-result-card")).toContainText("Aaj ka hisaab");
    await expect(page.getByTestId("readback-text")).toContainText("₹420");

    await page.evaluate(() =>
      window.__injectTranscript!("Kis-kis ka paisa baaki hai?")
    );
    await expect(page.getByTestId("query-result-card")).toContainText("Sharma ji");

    await page.evaluate(() =>
      window.__injectTranscript!("Sharma ji ko reminder bhejo")
    );
    const link = page.getByTestId("whatsapp-reminder-link");
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toContain("https://wa.me/919830011111");
  });

  test("M3 screens load cleanly on phone viewport", async ({ page }) => {
    for (const route of ["/hisaab", "/items", "/customers", "/bills", "/settings"]) {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
    }
  });
});
