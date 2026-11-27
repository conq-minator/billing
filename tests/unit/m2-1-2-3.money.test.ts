import { describe, expect, it } from "vitest";
import { apply } from "@/engine/apply";
import type { Bill, CustomerRecord, EngineContext, ItemRecord, PreferencesRecord } from "@/engine/types";
import type { Intent } from "@/router/intent.schema";

function baseIntent(partial: Partial<Intent>): Intent {
  return {
    intent: "UNKNOWN",
    items: [],
    target_line: null,
    changes: null,
    discount: null,
    customer: null,
    payment: null,
    query: null,
    answer: null,
    language: "hinglish",
    confidence: 1,
    ...partial,
  };
}

const CATALOGUE: ItemRecord[] = [
  {
    id: "i-atta",
    shopId: "s1",
    name: "Aashirvaad Atta",
    nameNorm: "aashirvaad atta",
    aliases: ["atta"],
    defaultUnit: "kg",
    pricePerUnit: 5200,
    priceSource: "owner_spoken",
    timesUsed: 5,
    lastUpdated: new Date(),
  },
  {
    id: "i-dal",
    shopId: "s1",
    name: "Toor Dal",
    nameNorm: "toor dal",
    aliases: ["dal"],
    defaultUnit: "kg",
    pricePerUnit: 16000,
    priceSource: "owner_spoken",
    timesUsed: 5,
    lastUpdated: new Date(),
  },
  {
    id: "i-maggi",
    shopId: "s1",
    name: "Maggi 70g",
    nameNorm: "maggi 70g",
    aliases: ["maggi"],
    defaultUnit: "pkt",
    pricePerUnit: 1400,
    priceSource: "owner_spoken",
    timesUsed: 5,
    lastUpdated: new Date(),
  },
  {
    id: "i-doodh",
    shopId: "s1",
    name: "Amul Taaza 500ml",
    nameNorm: "amul taaza 500ml",
    aliases: ["doodh"],
    defaultUnit: "unit",
    pricePerUnit: 2800,
    priceSource: "owner_spoken",
    timesUsed: 5,
    lastUpdated: new Date(),
  },
  {
    id: "i-surf",
    shopId: "s1",
    name: "Surf Excel 1kg",
    nameNorm: "surf excel 1kg",
    aliases: ["surf"],
    defaultUnit: "unit",
    pricePerUnit: 14000,
    priceSource: "owner_spoken",
    timesUsed: 5,
    lastUpdated: new Date(),
  },
  {
    id: "i-chawal",
    shopId: "s1",
    name: "Basmati Chawal",
    nameNorm: "basmati chawal",
    aliases: ["chawal"],
    defaultUnit: "kg",
    pricePerUnit: 9000,
    priceSource: "owner_spoken",
    timesUsed: 5,
    lastUpdated: new Date(),
  },
];

const CUSTOMERS: CustomerRecord[] = [
  {
    id: "c-sharma",
    shopId: "s1",
    name: "Sharma ji",
    nameNorm: "sharma ji",
    phone: "9830011111",
    balanceDue: 120000,
  },
];

function makeBill(subtotal = 0): Bill {
  return {
    id: "b1",
    shopId: "s1",
    billNo: 142,
    publicId: "pub142",
    customerId: null,
    customerName: null,
    status: "open",
    sessionState: { phase: "OPEN" },
    clientSeq: 0,
    version: 1,
    lines: [],
    subtotal,
    itemDiscountTotal: 0,
    billDiscountType: null,
    billDiscountValue: null,
    billDiscountAmount: 0,
    roundOff: 0,
    total: subtotal,
    paidCash: 0,
    paidUpi: 0,
    balanceDue: subtotal,
    createdAt: new Date("2026-11-27T12:00:00Z"),
    finalizedAt: null,
    editedAt: null,
  };
}

function makeCtx(bill: Bill, prefs?: PreferencesRecord): EngineContext {
  return {
    bill,
    catalogue: CATALOGUE,
    customers: CUSTOMERS,
    prefs: prefs ?? {
      shopId: "s1",
      discountScopeHistory: [],
      discountScopeLearned: null,
    },
    lang: "hi",
    now: new Date("2026-11-27T12:00:00Z"),
    shopId: "s1",
  };
}

describe("M2 Discounts, Learning, and Payments", () => {
  it("PRD §9 sample: 5 items + 10% on Toor Dal + 5% bill discount -> ₹623.00", () => {
    const r1 = apply(
      baseIntent({
        intent: "ADD_ITEMS",
        items: [
          { name: "Atta", qty: 5, unit: "kg", price: null, price_basis: null },
          { name: "Dal", qty: 1, unit: "kg", price: null, price_basis: null },
          { name: "Maggi", qty: 4, unit: "pkt", price: null, price_basis: null },
          { name: "Doodh", qty: 2, unit: null, price: null, price_basis: null },
          { name: "Surf", qty: 1, unit: null, price: null, price_basis: null },
        ],
      }),
      makeCtx(makeBill())
    );
    const r2 = apply(
      baseIntent({
        intent: "APPLY_DISCOUNT",
        discount: {
          kind: "percent",
          value: 10,
          scope: "items",
          item_names: ["Dal"],
          is_correction: false,
        },
      }),
      makeCtx(r1.bill)
    );
    expect(r2.bill.subtotal).toBe(65600);

    const r3 = apply(
      baseIntent({
        intent: "APPLY_DISCOUNT",
        discount: {
          kind: "percent",
          value: 5,
          scope: "whole",
          item_names: [],
          is_correction: false,
        },
      }),
      makeCtx(r2.bill)
    );
    expect(r3.bill.billDiscountAmount).toBe(3280);
    expect(r3.bill.roundOff).toBe(-20);
    expect(r3.bill.total).toBe(62300);
  });

  it("AT-09: target total 'Total 950 kar do' on ₹987 bill -> ₹37 flat discount, roundOff 0", () => {
    const r1 = apply(
      baseIntent({
        intent: "ADD_ITEMS",
        items: [{ name: "Atta", qty: 1, unit: "kg", price: 987, price_basis: "per_unit" }],
      }),
      makeCtx(makeBill())
    );
    const r2 = apply(
      baseIntent({
        intent: "APPLY_DISCOUNT",
        discount: {
          kind: "target_total",
          value: 950,
          scope: "whole",
          item_names: [],
          is_correction: false,
        },
      }),
      makeCtx(r1.bill)
    );
    expect(r2.bill.billDiscountAmount).toBe(3700);
    expect(r2.bill.roundOff).toBe(0);
    expect(r2.bill.total).toBe(95000);
  });

  it("AT-07 & AT-08: ambiguous discount asks on fresh, learns after 5, and handles correction", () => {
    let prefs: PreferencesRecord = {
      shopId: "s1",
      discountScopeHistory: [],
      discountScopeLearned: null,
    };

    const billRes = apply(
      baseIntent({
        intent: "ADD_ITEMS",
        items: [
          { name: "Dal", qty: 1, unit: "kg", price: null, price_basis: null },
          { name: "Chawal", qty: 1, unit: "kg", price: null, price_basis: null },
        ],
      }),
      makeCtx(makeBill(), prefs)
    );

    // Ask 5 times -> whole
    for (let i = 0; i < 5; i++) {
      const qRes = apply(
        baseIntent({
          intent: "APPLY_DISCOUNT",
          discount: {
            kind: "percent",
            value: 20,
            scope: "unspecified",
            item_names: [],
            is_correction: false,
          },
        }),
        makeCtx(billRes.bill, prefs)
      );
      expect(qRes.question?.kind).toBe("discount_scope");

      const aRes = apply(
        baseIntent({
          intent: "ANSWER_PENDING_QUESTION",
          answer: { price: null, scope: "whole", item_names: [], customer: null },
        }),
        makeCtx(qRes.bill, prefs)
      );
      const saveEff = aRes.effects.find((e) => e.type === "savePrefs");
      if (saveEff && saveEff.type === "savePrefs") prefs = saveEff.prefs;
    }

    expect(prefs.discountScopeLearned).toBe("whole");

    // 6th time applies without asking
    const autoRes = apply(
      baseIntent({
        intent: "APPLY_DISCOUNT",
        discount: {
          kind: "percent",
          value: 20,
          scope: "unspecified",
          item_names: [],
          is_correction: false,
        },
      }),
      makeCtx(billRes.bill, prefs)
    );
    expect(autoRes.question).toBeUndefined();
    expect(autoRes.bill.billDiscountAmount).toBe(5000); // 20% of 250
    expect(autoRes.readback?.text).toContain("poore bill pe");

    // AT-08: correction moves to Dal & Chawal and lowers agreement below 80%
    const corrRes = apply(
      baseIntent({
        intent: "APPLY_DISCOUNT",
        discount: {
          kind: "percent",
          value: 20,
          scope: "items",
          item_names: ["Dal", "Chawal"],
          is_correction: true,
        },
      }),
      makeCtx(autoRes.bill, prefs)
    );
    expect(corrRes.bill.billDiscountAmount).toBe(0);
    expect(corrRes.bill.itemDiscountTotal).toBe(5000);
    const corrPrefs = corrRes.effects.find((e) => e.type === "savePrefs");
    expect(corrPrefs && corrPrefs.type === "savePrefs" && corrPrefs.prefs.discountScopeLearned).toBeNull();
  });

  it("AT-12: 'Sharma ji ka bill, 500 diya baaki udhaar' updates Sharma ji balance", () => {
    const r1 = apply(
      baseIntent({
        intent: "ADD_ITEMS",
        items: [{ name: "Atta", qty: 10, unit: "kg", price: null, price_basis: null }], // ₹520
      }),
      makeCtx(makeBill())
    );
    const r2 = apply(
      baseIntent({
        intent: "RECORD_PAYMENT",
        customer: { name: "Sharma ji" },
        payment: { mode: "split", amount: 500 },
      }),
      makeCtx(r1.bill)
    );
    expect(r2.bill.paidCash).toBe(50000);
    expect(r2.bill.balanceDue).toBe(2000);
    const deltaEff = r2.effects.find((e) => e.type === "customerBalanceDelta");
    expect(deltaEff).toEqual({
      type: "customerBalanceDelta",
      customerId: "c-sharma",
      delta: 2000,
    });
  });
});
