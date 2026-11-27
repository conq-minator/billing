import Fuse from "fuse.js";
import { getDict, tFormat } from "@/i18n";
import { formatInrCompact, rupeesToPaise } from "@/lib/money";
import type { Intent } from "@/router/intent.schema";
import { normalizeItemName } from "./normalize";
import { computeTotals } from "./totals";
import type { Bill, CustomerRecord, Effect, Lang, Question } from "./types";

export function resolveOrCreateCustomer(
  name: string,
  customers: CustomerRecord[],
  shopId: string
): { customer: CustomerRecord; isNew: boolean } {
  const norm = normalizeItemName(name);
  const exact = customers.find((c) => c.nameNorm === norm);
  if (exact) return { customer: exact, isNew: false };

  const fuse = new Fuse(customers, {
    keys: ["nameNorm"],
    threshold: 0.35,
    includeScore: true,
  });
  const hit = fuse.search(norm);
  if (hit.length > 0 && (hit[0].score ?? 1) <= 0.35) {
    return { customer: hit[0].item, isNew: false };
  }

  const created: CustomerRecord = {
    id: crypto.randomUUID(),
    shopId,
    name: name.trim(),
    nameNorm: norm,
    phone: null,
    balanceDue: 0,
  };
  return { customer: created, isNew: true };
}

export function applyPaymentIntent(params: {
  bill: Bill;
  intent: Intent;
  customers: CustomerRecord[];
  lang: Lang;
  now: Date;
  shopId: string;
}): {
  bill: Bill;
  effects: Effect[];
  readback?: string;
  question?: Question;
} {
  const { intent, customers, lang, now, shopId } = params;
  const dict = getDict(lang);
  const effects: Effect[] = [];
  const bill = computeTotals({
    ...params.bill,
    sessionState: { ...params.bill.sessionState },
  });

  // Attach customer if provided in this utterance
  let customerName = bill.customerName;
  if (intent.customer?.name) {
    const { customer, isNew } = resolveOrCreateCustomer(
      intent.customer.name,
      customers,
      shopId
    );
    bill.customerId = customer.id;
    bill.customerName = customer.name;
    customerName = customer.name;
    if (isNew) {
      effects.push({
        type: "upsertCustomer",
        c: { ...customer, isNew: true },
      });
    }
  }

  const payment = intent.payment;
  if (!payment) {
    return { bill, effects };
  }

  const total = bill.total;

  if (payment.mode === "cash") {
    const amount = payment.amount !== null ? rupeesToPaise(payment.amount) : total;
    bill.paidCash = amount;
    bill.balanceDue = Math.max(0, total - bill.paidCash - bill.paidUpi);
    bill.status = bill.status === "edited" ? "edited" : "final";
    bill.finalizedAt = bill.finalizedAt ?? now;
    effects.push({
      type: "payment",
      row: {
        shopId,
        customerId: bill.customerId,
        billId: bill.id,
        amount,
        mode: "cash",
      },
    });
    return {
      bill,
      effects,
      readback: tFormat(dict.readback.paidCash, {
        amount: formatInrCompact(amount).replace(/^₹/, ""),
      }),
    };
  }

  if (payment.mode === "upi") {
    const amount = payment.amount !== null ? rupeesToPaise(payment.amount) : total;
    bill.paidUpi = amount;
    bill.balanceDue = Math.max(0, total - bill.paidCash - bill.paidUpi);
    bill.status = bill.status === "edited" ? "edited" : "final";
    bill.finalizedAt = bill.finalizedAt ?? now;
    effects.push({
      type: "payment",
      row: {
        shopId,
        customerId: bill.customerId,
        billId: bill.id,
        amount,
        mode: "upi",
      },
    });
    return {
      bill,
      effects,
      readback: tFormat(dict.readback.paidUpi, {
        amount: formatInrCompact(amount).replace(/^₹/, ""),
      }),
    };
  }

  // mode === "due" or "split"
  if (!bill.customerId) {
    bill.sessionState.pendingQueue = [
      ...(bill.sessionState.pendingQueue ?? []).filter(
        (q) => q.kind !== "udhaar_customer"
      ),
      { kind: "udhaar_customer" },
    ];
    const question: Question = {
      kind: "udhaar_customer",
      text: dict.questions.udhaarCustomer,
    };
    return { bill, effects, question, readback: question.text };
  }

  const paidNow =
    payment.mode === "split" && payment.amount !== null
      ? Math.min(rupeesToPaise(payment.amount), total)
      : 0;
  const due = Math.max(0, total - paidNow);

  bill.paidCash = paidNow;
  bill.balanceDue = due;
  bill.status = bill.status === "edited" ? "edited" : "final";
  bill.finalizedAt = bill.finalizedAt ?? now;

  if (paidNow > 0) {
    effects.push({
      type: "payment",
      row: {
        shopId,
        customerId: bill.customerId,
        billId: bill.id,
        amount: paidNow,
        mode: "cash",
      },
    });
  }
  if (due > 0) {
    effects.push({
      type: "customerBalanceDelta",
      customerId: bill.customerId,
      delta: due,
    });
  }

  return {
    bill,
    effects,
    readback:
      paidNow > 0
        ? tFormat(dict.readback.paidSplit, {
            paid: formatInrCompact(paidNow).replace(/^₹/, ""),
            due: formatInrCompact(due).replace(/^₹/, ""),
            customer: customerName ?? "",
          })
        : tFormat(dict.readback.paidDue, {
            amount: formatInrCompact(due).replace(/^₹/, ""),
            customer: customerName ?? "",
          }),
  };
}
