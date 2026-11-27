import { describe, expect, it } from "vitest";
import { apply } from "@/engine/apply";
import type { Bill, EngineContext, ItemRecord } from "@/engine/types";
import type { Intent } from "@/router/intent.schema";

function makeBill(): Bill {
  return {
    id: "bill-1",
    shopId: "shop-1",
    billNo: 143,
    publicId: "pub123456789",
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
    createdAt: new Date("2026-11-27T12:00:00Z"),
    finalizedAt: null,
    editedAt: null,
  };
}

function makeCatalogue(): ItemRecord[] {
  return [
    {
      id: "item-atta",
      shopId: "shop-1",
      name: "Aashirvaad Atta",
      nameNorm: "aashirvaad atta",
      aliases: ["atta", "aata"],
      defaultUnit: "kg",
      pricePerUnit: 5200,
      priceSource: "owner_spoken",
      timesUsed: 5,
      lastUpdated: new Date("2026-11-24T12:00:00Z"),
    },
    {
      id: "item-dal",
      shopId: "shop-1",
      name: "Toor Dal",
      nameNorm: "toor dal",
      aliases: ["dal", "arhar dal"],
      defaultUnit: "kg",
      pricePerUnit: 16000,
      priceSource: "owner_spoken",
      timesUsed: 5,
      lastUpdated: new Date("2026-11-24T12:00:00Z"),
    },
    {
      id: "item-maggi",
      shopId: "shop-1",
      name: "Maggi 70g",
      nameNorm: "maggi 70g",
      aliases: ["maggi"],
      defaultUnit: "pkt",
      pricePerUnit: 1400,
      priceSource: "owner_spoken",
      timesUsed: 5,
      lastUpdated: new Date("2026-11-24T12:00:00Z"),
    },
    {
      id: "item-doodh",
      shopId: "shop-1",
      name: "Amul Taaza 500ml",
      nameNorm: "amul taaza 500ml",
      aliases: ["doodh", "amul doodh"],
      defaultUnit: "unit",
      pricePerUnit: 2800,
      priceSource: "owner_spoken",
      timesUsed: 5,
      lastUpdated: new Date("2026-11-24T12:00:00Z"),
    },
    {
      id: "item-surf",
      shopId: "shop-1",
      name: "Surf Excel 1kg",
      nameNorm: "surf excel 1kg",
      aliases: ["surf"],
      defaultUnit: "unit",
      pricePerUnit: 14000,
      priceSource: "owner_spoken",
      timesUsed: 5,
      lastUpdated: new Date("2026-11-24T12:00:00Z"),
    },
    {
      id: "item-chawal",
      shopId: "shop-1",
      name: "Basmati Chawal",
      nameNorm: "basmati chawal",
      aliases: ["chawal", "rice"],
      defaultUnit: "kg",
      pricePerUnit: 9000,
      priceSource: "owner_spoken",
      timesUsed: 5,
      lastUpdated: new Date("2026-11-24T12:00:00Z"),
    },
    {
      id: "item-jeera",
      shopId: "shop-1",
      name: "Jeera",
      nameNorm: "jeera",
      aliases: ["jeera"],
      defaultUnit: "kg",
      pricePerUnit: 60000,
      priceSource: "owner_spoken",
      timesUsed: 5,
      lastUpdated: new Date("2026-11-24T12:00:00Z"),
    },
  ];
}

function makeCtx(bill = makeBill(), catalogue = makeCatalogue()): EngineContext {
  return {
    bill,
    catalogue,
    customers: [],
    prefs: {
      shopId: "shop-1",
      discountScopeHistory: [],
      discountScopeLearned: null,
    },
    lang: "hi",
    now: new Date("2026-11-27T12:00:00Z"),
    shopId: "shop-1",
  };
}

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

describe("M1 Engine acceptance tests", () => {
  it("AT-01: 5 spoken items auto-fill prices and compute total ₹672", () => {
    const res = apply(
      baseIntent({
        intent: "ADD_ITEMS",
        items: [
          { name: "Aashirvaad atta", qty: 5, unit: "kg", price: null, price_basis: null },
          { name: "toor dal", qty: 1, unit: "kg", price: null, price_basis: null },
          { name: "Maggi", qty: 4, unit: "pkt", price: null, price_basis: null },
          { name: "Amul doodh", qty: 2, unit: null, price: null, price_basis: null },
          { name: "Surf", qty: 1, unit: null, price: null, price_basis: null },
        ],
      }),
      makeCtx()
    );

    expect(res.bill.lines).toHaveLength(5);
    expect(res.bill.lines.every((l) => l.flags.includes("auto"))).toBe(true);
    expect(res.bill.total).toBe(67200); // 260 + 160 + 56 + 56 + 140 = 672
  });

  it("AT-02: 'Dal' -> Toor Dal, qty 1, default unit kg", () => {
    const res = apply(
      baseIntent({
        intent: "ADD_ITEMS",
        items: [{ name: "Dal", qty: 1, unit: null, price: null, price_basis: null }],
      }),
      makeCtx()
    );
    expect(res.bill.lines[0].nameSnapshot).toBe("Toor Dal");
    expect(res.bill.lines[0].qty).toBe(1);
    expect(res.bill.lines[0].unit).toBe("kg");
    expect(res.bill.total).toBe(16000);
  });

  it("AT-03: unknown item Kurkure 3 pkt -> price_needed -> Done asks rate -> answer fills bill & memory", () => {
    const ctx = makeCtx();
    const r1 = apply(
      baseIntent({
        intent: "ADD_ITEMS",
        items: [{ name: "Kurkure", qty: 3, unit: "pkt", price: null, price_basis: null }],
      }),
      ctx
    );
    expect(r1.bill.lines[0].flags).toContain("new_item");
    expect(r1.bill.lines[0].flags).toContain("price_needed");
    expect(r1.bill.total).toBe(0);

    const newItemEffect = r1.effects.find((e) => e.type === "upsertItem");
    expect(newItemEffect).toBeDefined();
    const newItemRec: ItemRecord = {
      id: r1.bill.lines[0].itemId,
      shopId: "shop-1",
      name: "Kurkure",
      nameNorm: "kurkure",
      aliases: ["kurkure"],
      defaultUnit: "pkt",
      pricePerUnit: null,
      priceSource: null,
      timesUsed: 0,
      lastUpdated: ctx.now,
    };

    const r2 = apply(
      baseIntent({ intent: "FINISH_BILL" }),
      makeCtx(r1.bill, [...ctx.catalogue, newItemRec])
    );
    expect(r2.question?.kind).toBe("price");
    expect(r2.question?.text).toBe("Kurkure ka rate kya hai?");

    const r3 = apply(
      baseIntent({
        intent: "ANSWER_PENDING_QUESTION",
        answer: { price: 10, scope: null, item_names: [], customer: null },
      }),
      makeCtx(r2.bill, [...ctx.catalogue, newItemRec])
    );
    expect(r3.bill.lines[0].rate).toBe(1000);
    expect(r3.bill.lines[0].amount).toBe(3000);
    expect(r3.bill.total).toBe(3000);
    expect(r3.bill.sessionState.phase).toBe("AWAITING_PAYMENT");
    expect(r3.effects.some((e) => e.type === "priceHistory")).toBe(true);
  });

  it("AT-04 & AT-05: price edit learns memory unless one_time ('sirf is baar')", () => {
    const ctx = makeCtx();
    const r1 = apply(
      baseIntent({
        intent: "ADD_ITEMS",
        items: [{ name: "Atta", qty: 5, unit: "kg", price: null, price_basis: null }],
      }),
      ctx
    );

    // AT-04: change rate to 55 -> learns memory
    const r2 = apply(
      baseIntent({
        intent: "SET_PRICE",
        target_line: { ref: "name", name: "Atta" },
        changes: { qty: null, unit: null, price: 55, one_time: false, remove_discount: false },
      }),
      makeCtx(r1.bill)
    );
    expect(r2.bill.lines[0].rate).toBe(5500);
    expect(r2.bill.total).toBe(27500);
    expect(r2.toast).toContain("yaad rakh liya");
    expect(r2.effects.some((e) => e.type === "upsertItem")).toBe(true);

    // AT-05: 58 sirf is baar -> bill updates, memory unchanged (no upsertItem)
    const r3 = apply(
      baseIntent({
        intent: "SET_PRICE",
        target_line: { ref: "name", name: "Atta" },
        changes: { qty: null, unit: null, price: 58, one_time: true, remove_discount: false },
      }),
      makeCtx(r2.bill)
    );
    expect(r3.bill.lines[0].rate).toBe(5800);
    expect(r3.bill.lines[0].flags).toContain("one_time");
    expect(r3.effects.some((e) => e.type === "upsertItem")).toBe(false);
  });

  it("AT-06: 'Paav kilo jeera' (₹600/kg) -> 0.25 kg, ₹150", () => {
    const res = apply(
      baseIntent({
        intent: "ADD_ITEMS",
        items: [{ name: "Jeera", qty: 0.25, unit: "kg", price: null, price_basis: null }],
      }),
      makeCtx()
    );
    expect(res.bill.lines[0].qty).toBe(0.25);
    expect(res.bill.lines[0].amount).toBe(15000);
  });

  it("AT-10: remove line, edit qty, and 'last' line correction", () => {
    const ctx = makeCtx();
    const r1 = apply(
      baseIntent({
        intent: "ADD_ITEMS",
        items: [
          { name: "Chawal", qty: 2, unit: "kg", price: null, price_basis: null },
          { name: "Dal", qty: 1, unit: "kg", price: null, price_basis: null },
        ],
      }),
      ctx
    );

    const r2 = apply(
      baseIntent({
        intent: "REMOVE_LINE",
        target_line: { ref: "name", name: "Chawal" },
      }),
      makeCtx(r1.bill)
    );
    expect(r2.bill.lines).toHaveLength(1);
    expect(r2.bill.lines[0].nameSnapshot).toBe("Toor Dal");

    const r3 = apply(
      baseIntent({
        intent: "EDIT_LINE",
        target_line: { ref: "name", name: "Dal" },
        changes: { qty: 2, unit: "kg", price: null, one_time: false, remove_discount: false },
      }),
      makeCtx(r2.bill)
    );
    expect(r3.bill.lines[0].qty).toBe(2);
    expect(r3.bill.total).toBe(32000);

    const r4 = apply(
      baseIntent({
        intent: "EDIT_LINE",
        target_line: { ref: "last", name: null },
        changes: { qty: 1, unit: null, price: null, one_time: false, remove_discount: false },
      }),
      makeCtx(r3.bill)
    );
    expect(r4.bill.lines[0].qty).toBe(1);
    expect(r4.bill.total).toBe(16000);
  });

  it("FR-6.4: 'Atta ka rate 260 kar do' on 5 kg resolves line_total -> ₹52/kg", () => {
    const ctx = makeCtx();
    const r1 = apply(
      baseIntent({
        intent: "ADD_ITEMS",
        items: [{ name: "Atta", qty: 5, unit: "kg", price: null, price_basis: null }],
      }),
      ctx
    );
    const r2 = apply(
      baseIntent({
        intent: "SET_PRICE",
        target_line: { ref: "name", name: "Atta" },
        changes: { qty: null, unit: null, price: 260, one_time: false, remove_discount: false },
      }),
      makeCtx(r1.bill)
    );
    expect(r2.bill.lines[0].rate).toBe(5200);
    expect(r2.bill.total).toBe(26000);
  });
});
