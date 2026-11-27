import { describe, expect, it } from "vitest";
import { buildUpiUri } from "@/bill/upi";
import { toBillViewModel } from "@/bill/viewModel";
import { apply } from "@/engine/apply";
import type { Bill, EngineContext, ItemRecord } from "@/engine/types";
import type { Intent } from "@/router/intent.schema";

const SHOP = {
  name: "Sharma General Store",
  address: "12 MG Road, Kolkata",
  phone: "9830012345",
  upiVpa: "sharmastore@okaxis",
  gstin: null,
};

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

describe("M2.4 & M2.5 UPI URI and BillViewModel", () => {
  it("encodes NPCI UPI URI correctly", () => {
    const uri = buildUpiUri({
      vpa: "sharmastore@okaxis",
      name: "Sharma General Store",
      amountPaise: 62300,
      billNo: 142,
    });
    expect(uri).toBe(
      "upi://pay?pa=sharmastore%40okaxis&pn=Sharma%20General%20Store&am=623.00&cu=INR&tn=Bill%200142"
    );
  });

  it("produces view-model matching PRD §9 ₹623.00 sample", () => {
    const catalogue: ItemRecord[] = [
      { id: "1", shopId: "s1", name: "Aashirvaad Atta", nameNorm: "atta", aliases: ["atta"], defaultUnit: "kg", pricePerUnit: 5200, priceSource: "owner_spoken", timesUsed: 1, lastUpdated: new Date() },
      { id: "2", shopId: "s1", name: "Toor Dal", nameNorm: "dal", aliases: ["dal"], defaultUnit: "kg", pricePerUnit: 16000, priceSource: "owner_spoken", timesUsed: 1, lastUpdated: new Date() },
      { id: "3", shopId: "s1", name: "Maggi 70g", nameNorm: "maggi", aliases: ["maggi"], defaultUnit: "pkt", pricePerUnit: 1400, priceSource: "owner_spoken", timesUsed: 1, lastUpdated: new Date() },
      { id: "4", shopId: "s1", name: "Amul Taaza 500ml", nameNorm: "doodh", aliases: ["doodh"], defaultUnit: "unit", pricePerUnit: 2800, priceSource: "owner_spoken", timesUsed: 1, lastUpdated: new Date() },
      { id: "5", shopId: "s1", name: "Surf Excel 1kg", nameNorm: "surf", aliases: ["surf"], defaultUnit: "unit", pricePerUnit: 14000, priceSource: "owner_spoken", timesUsed: 1, lastUpdated: new Date() },
    ];
    const bill: Bill = {
      id: "b1", shopId: "s1", billNo: 142, publicId: "pub142", customerId: null, customerName: null,
      status: "open", sessionState: { phase: "OPEN" }, clientSeq: 0, version: 1, lines: [],
      subtotal: 0, itemDiscountTotal: 0, billDiscountType: null, billDiscountValue: null,
      billDiscountAmount: 0, roundOff: 0, total: 0, paidCash: 0, paidUpi: 0, balanceDue: 0,
      createdAt: new Date("2026-11-27T13:12:00Z"), finalizedAt: null, editedAt: null,
    };
    const ctx: EngineContext = {
      bill, catalogue, customers: [],
      prefs: { shopId: "s1", discountScopeHistory: [], discountScopeLearned: null },
      lang: "hi", now: new Date("2026-11-27T13:12:00Z"), shopId: "s1",
    };

    const r1 = apply(baseIntent({
      intent: "ADD_ITEMS",
      items: [
        { name: "atta", qty: 5, unit: "kg", price: null, price_basis: null },
        { name: "dal", qty: 1, unit: "kg", price: null, price_basis: null },
        { name: "maggi", qty: 4, unit: "pkt", price: null, price_basis: null },
        { name: "doodh", qty: 2, unit: null, price: null, price_basis: null },
        { name: "surf", qty: 1, unit: null, price: null, price_basis: null },
      ],
    }), ctx);
    const r2 = apply(baseIntent({
      intent: "APPLY_DISCOUNT",
      discount: { kind: "percent", value: 10, scope: "items", item_names: ["dal"], is_correction: false },
    }), { ...ctx, bill: r1.bill });
    const r3 = apply(baseIntent({
      intent: "APPLY_DISCOUNT",
      discount: { kind: "percent", value: 5, scope: "whole", item_names: [], is_correction: false },
    }), { ...ctx, bill: r2.bill });

    const vm = toBillViewModel(r3.bill, SHOP, "hi");
    expect(vm.subtotalText).toBe("656.00");
    expect(vm.billDiscountText).toBe("-32.80");
    expect(vm.roundOffText).toBe("-0.20");
    expect(vm.totalText).toBe("₹623.00");
  });
});
