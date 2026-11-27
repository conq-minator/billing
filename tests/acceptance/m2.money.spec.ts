import { expect, test } from "@playwright/test";

test.describe("M2 Money Acceptance Tests (AT-07, AT-08, AT-09, AT-12, AT-16)", () => {
  test.beforeEach(async ({ request, page }) => {
    await request.post("/api/demo/reset", { data: { profile: "fresh" } });
    await page.goto("/");
    await page.waitForFunction(() => typeof window.__injectTranscript === "function");
  });

  test("AT-07 & AT-08: Ambiguous discount asks, learns on trained profile, and handles correction", async ({
    request,
    page,
  }) => {
    await page.evaluate(() =>
      window.__injectTranscript!("Chawal 2 kilo, dal 1 kilo")
    );
    await expect(page.getByTestId("bill-total")).toContainText("₹340.00");

    // Fresh shop asks whole vs items
    await page.evaluate(() => window.__injectTranscript!("20% discount"));
    await expect(page.getByTestId("pending-chip")).toContainText(
      "poore bill pe ya kisi item pe"
    );
    await page.getByTestId("pending-scope-whole").click();
    await expect(page.getByTestId("bill-total")).toContainText("₹272.00");

    // Switch to trained profile -> applies without asking, then AT-08 correction moves to dal & chawal
    await request.post("/api/demo/reset", { data: { profile: "trained" } });
    await page.reload();
    await page.waitForFunction(() => typeof window.__injectTranscript === "function");

    await page.evaluate(() =>
      window.__injectTranscript!("Chawal 2 kilo, dal 1 kilo")
    );
    await page.evaluate(() => window.__injectTranscript!("20% discount"));
    await expect(page.getByTestId("pending-chip")).toHaveCount(0);
    await expect(page.getByTestId("readback-text")).toContainText("poore bill pe");

    await page.evaluate(() =>
      window.__injectTranscript!("nahi, 20% sirf dal aur chawal pe tha")
    );
    await expect(page.getByTestId("readback-text")).toContainText(
      "chune hue items pe"
    );
  });

  test("AT-09: Target total 950", async ({ page }) => {
    await page.evaluate(() =>
      window.__injectTranscript!(
        "Aashirvaad atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, Amul doodh 2, Surf ek"
      )
    );
    await page.evaluate(() => window.__injectTranscript!("Chawal 2 kilo, dal 1 kilo"));
    await expect(page.getByTestId("bill-total")).toContainText("₹1,012.00");

    await page.evaluate(() => window.__injectTranscript!("Total 950 kar do"));
    await expect(page.getByTestId("bill-total")).toContainText("₹950.00");
  });

  test("AT-12: Sharma ji split payment updates balance + UPI QR sheet", async ({
    page,
  }) => {
    await page.evaluate(() =>
      window.__injectTranscript!(
        "Aashirvaad atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, Amul doodh 2, Surf ek"
      )
    );
    await expect(page.getByTestId("bill-total")).toContainText("₹672.00");

    await page.getByTestId("action-upi").click();
    await expect(page.getByTestId("upi-qr-sheet")).toBeVisible();
    await page.getByTestId("upi-received-btn").click();
    await expect(page.getByTestId("readback-text")).toContainText("UPI");
  });

  test("AT-16: Public bill page, PDF, PNG exports work", async ({
    request,
    page,
  }) => {
    const publicRes = await page.goto("/b/demo00000142");
    expect(publicRes?.status()).toBe(200);
    await expect(page.getByText("Sharma General Store")).toBeVisible();
    await expect(page.getByText("Pay ₹420.00 with UPI")).toBeVisible();

    const billsRes = await request.get("/api/bills");
    const billsJson = await billsRes.json();
    const sampleId = billsJson.bills[0].id;

    const pdfRes = await request.get(`/api/bills/${sampleId}/pdf`);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()["content-type"]).toContain("application/pdf");

    const pngRes = await request.get(`/api/bills/${sampleId}/png`);
    expect(pngRes.status()).toBe(200);
    expect(pngRes.headers()["content-type"]).toContain("image/png");
  });
});
