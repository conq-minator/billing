import { describe, expect, it } from "vitest";
import { createMemoryDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { createOpenBill } from "@/db/repo/bills";
import { processUtterance } from "@/db/repo/utteranceService";
import { DEMO_SHOP_ID, seedDatabase } from "@/db/seed";

describe("M1.9 integration: processUtterance with PGlite", () => {
  it("processes AT-01 transcript end-to-end and persists bill + voice_event", async () => {
    process.env.LLM_MODE = "fixture";
    const { db, client } = await createMemoryDb();
    try {
      await runMigrations(db);
      await seedDatabase(db, "fresh");

      const openBill = await createOpenBill(db, DEMO_SHOP_ID);
      const res = await processUtterance(db, {
        billId: openBill.id,
        transcript:
          "Aashirvaad atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, Amul doodh 2, Surf ek",
        lang: "hi",
        clientSeq: 1,
      });

      expect(res.bill.lines).toHaveLength(5);
      expect(res.bill.total).toBe(67200);
      expect(res.route).toBe("llm");

      const finishRes = await processUtterance(db, {
        billId: openBill.id,
        transcript: "bas",
        lang: "hi",
        clientSeq: 2,
      });
      expect(finishRes.route).toBe("fast");
      expect(finishRes.readback?.text).toContain("672");
      expect(finishRes.bill.sessionState.phase).toBe("AWAITING_PAYMENT");
    } finally {
      await client.close();
    }
  });
});
