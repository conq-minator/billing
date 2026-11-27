import { describe, expect, it } from "vitest";
import { matchFastPath } from "@/router/fastpath";
import { routeUtterance } from "@/router/route";
import type { Bill } from "@/engine/types";

const EMPTY_BILL: Bill = {
  id: "b1",
  shopId: "s1",
  billNo: 1,
  publicId: "pub1",
  customerId: null,
  customerName: null,
  status: "open",
  sessionState: { phase: "OPEN" },
  clientSeq: 0,
  version: 1,
  lines: [],
  subtotal: 0,
  itemDiscountTotal: 0,
  billDiscountType: null,
  billDiscountValue: null,
  billDiscountAmount: 0,
  roundOff: 0,
  total: 0,
  paidCash: 0,
  paidUpi: 0,
  balanceDue: 0,
  createdAt: new Date(),
  finalizedAt: null,
  editedAt: null,
};

describe("M1.7 fast-path router (hi + bn)", () => {
  it("matches finish triggers in hi and bn", () => {
    expect(matchFastPath("bas", { lang: "hi" })?.intent).toBe("FINISH_BILL");
    expect(matchFastPath("ho gaya", { lang: "hi" })?.intent).toBe("FINISH_BILL");
    expect(matchFastPath("hoye geche", { lang: "bn" })?.intent).toBe("FINISH_BILL");
    expect(matchFastPath("total bolo", { lang: "bn" })?.intent).toBe("FINISH_BILL");
  });

  it("matches payment modes", () => {
    expect(matchFastPath("UPI", { lang: "hi" })?.payment?.mode).toBe("upi");
    expect(matchFastPath("cash", { lang: "hi" })?.payment?.mode).toBe("cash");
    expect(matchFastPath("udhaar likh do", { lang: "hi" })?.payment?.mode).toBe("due");
  });

  it("matches pending price answers", () => {
    const res = matchFastPath("10 rupaye", {
      lang: "hi",
      pendingQuestion: {
        kind: "price",
        text: "Kurkure ka rate kya hai?",
        lineId: "l1",
        itemId: "i1",
        itemName: "Kurkure",
        unit: "pkt",
      },
    });
    expect(res?.intent).toBe("ANSWER_PENDING_QUESTION");
    expect(res?.answer?.price).toBe(10);
  });

  it("matches pending discount scope answers", () => {
    const whole = matchFastPath("poore bill pe", {
      lang: "hi",
      pendingQuestion: { kind: "discount_scope", text: "20% poore bill pe ya kisi item pe?" },
    });
    expect(whole?.answer?.scope).toBe("whole");

    const items = matchFastPath("sirf dal aur chawal pe", {
      lang: "hi",
      pendingQuestion: { kind: "discount_scope", text: "20% poore bill pe ya kisi item pe?" },
    });
    expect(items?.answer?.scope).toBe("items");
    expect(items?.answer?.item_names).toEqual(["dal", "chawal"]);
  });
});

describe("M1.8 fixture LLM replay", () => {
  it("replays recorded AT-01 intent in fixture mode", async () => {
    process.env.LLM_MODE = "fixture";
    const res = await routeUtterance({
      transcript: "Aashirvaad atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, Amul doodh 2, Surf ek",
      lang: "hi",
      bill: EMPTY_BILL,
      customerNames: [],
    });
    expect(res.route).toBe("llm");
    expect(res.intent.intent).toBe("ADD_ITEMS");
    expect(res.intent.items).toHaveLength(5);
  });
});
