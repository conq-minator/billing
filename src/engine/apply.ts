import { MIN_INTENT_CONFIDENCE } from "@/config/constants";
import { getDict, tFormat } from "@/i18n";
import { formatInrCompact, paiseToDecimalString } from "@/lib/money";
import { roundQty } from "@/lib/qty";
import type { Intent } from "@/router/intent.schema";
import { fillPrice } from "./fillPrice";
import { applyDiscountIntent } from "./discount";
import { recordDiscountScopeAnswer } from "./discountLearning";
import { normalizeItemName } from "./normalize";
import { applyPaymentIntent, resolveOrCreateCustomer } from "./payment";
import { pendingQuestions } from "./pending";
import { readbackBillItems, readbackFinish } from "./readback";
import { resolveItem } from "./resolveItem";
import { computeTotals } from "./totals";
import type {
  Bill,
  BillLine,
  Effect,
  EngineContext,
  EngineResult,
  ItemRecord,
} from "./types";

function newId(): string {
  return crypto.randomUUID();
}

function findTargetLine(
  bill: Bill,
  target: Intent["target_line"],
  catalogue: ItemRecord[]
): BillLine | undefined {
  if (bill.lines.length === 0) return undefined;
  if (!target || target.ref === "last" || !target.name) {
    if (bill.sessionState.lastLineId) {
      const byLastId = bill.lines.find(
        (l) => l.id === bill.sessionState.lastLineId
      );
      if (byLastId) return byLastId;
    }
    return bill.lines[bill.lines.length - 1];
  }

  const targetNorm = normalizeItemName(target.name);
  // Direct match on line nameSnapshot
  const direct = bill.lines.find((l) =>
    normalizeItemName(l.nameSnapshot).includes(targetNorm)
  );
  if (direct) return direct;

  // Match via catalogue alias
  const resolved = resolveItem(target.name, catalogue);
  if ("item" in resolved) {
    const byItem = bill.lines.find((l) => l.itemId === resolved.item.id);
    if (byItem) return byItem;
  }

  return undefined;
}

export function apply(intent: Intent, ctx: EngineContext): EngineResult {
  const dict = getDict(ctx.lang);
  const effects: Effect[] = [];

  if (
    intent.intent === "UNKNOWN" ||
    intent.confidence < MIN_INTENT_CONFIDENCE
  ) {
    return {
      bill: ctx.bill,
      effects: [],
      readback: { text: dict.readback.clarify, lang: ctx.lang },
      clarify: { transcript: "" },
    };
  }

  // Clone mutable working state
  const workingCatalogue = [...ctx.catalogue];
  let bill: Bill = {
    ...ctx.bill,
    sessionState: { ...ctx.bill.sessionState },
    lines: ctx.bill.lines.map((l) => ({ ...l, flags: [...l.flags] })),
  };

  if (intent.intent === "ADD_ITEMS") {
    let lastLineId = bill.sessionState.lastLineId;

    for (const spoken of intent.items) {
      const resolved = resolveItem(spoken.name, workingCatalogue);
      let item: ItemRecord;
      let isNewItem = false;

      if ("item" in resolved) {
        item = resolved.item;
      } else {
        isNewItem = true;
        item = {
          id: newId(),
          shopId: ctx.shopId,
          name: resolved.newItem.name,
          nameNorm: resolved.newItem.nameNorm,
          aliases: [resolved.newItem.nameNorm],
          defaultUnit: spoken.unit ?? "unit",
          pricePerUnit: null,
          priceSource: null,
          timesUsed: 0,
          lastUpdated: ctx.now,
        };
        workingCatalogue.push(item);
        effects.push({
          type: "upsertItem",
          item: {
            id: item.id,
            shopId: item.shopId,
            name: item.name,
            nameNorm: item.nameNorm,
            aliases: item.aliases,
            defaultUnit: item.defaultUnit,
            pricePerUnit: null,
            priceSource: null,
            timesUsed: 0,
            isNew: true,
          },
        });
      }

      const qty = roundQty(spoken.qty || 1);
      const lineUnit = spoken.unit ?? item.defaultUnit;

      const filled = fillPrice({
        qty,
        lineUnit,
        item,
        isNewItem,
        billId: bill.id,
        spokenPriceRupees: spoken.price,
        spokenBasis: spoken.price_basis,
        oneTime: false,
      });

      effects.push(...filled.effects);
      // Update workingCatalogue if memory changed
      const catIdx = workingCatalogue.findIndex((c) => c.id === item.id);
      if (catIdx >= 0) workingCatalogue[catIdx] = filled.updatedItem;

      const lineId = newId();
      lastLineId = lineId;
      bill.lines.push({
        id: lineId,
        lineNo: bill.lines.length + 1,
        itemId: item.id,
        nameSnapshot: item.name,
        qty,
        unit: lineUnit,
        rate: filled.rate,
        amount: filled.amount,
        lineDiscountType: null,
        lineDiscountValue: null,
        lineDiscountAmount: 0,
        flags: filled.flags,
      });
    }

    bill.sessionState.phase = "OPEN";
    bill.sessionState.lastLineId = lastLineId;
    bill = computeTotals(bill);

    return { bill, effects };
  }

  if (intent.intent === "EDIT_LINE" || intent.intent === "SET_PRICE") {
    const line = findTargetLine(bill, intent.target_line, workingCatalogue);
    if (!line) {
      return {
        bill: ctx.bill,
        effects: [],
        readback: { text: dict.readback.clarify, lang: ctx.lang },
        clarify: { transcript: "" },
      };
    }

    const item = workingCatalogue.find((c) => c.id === line.itemId);
    const changes = intent.changes;
    const newQty = changes?.qty ? roundQty(changes.qty) : line.qty;
    const newUnit = changes?.unit ?? line.unit;
    const oneTime = changes?.one_time ?? false;
    let toast: string | undefined;

    if (changes?.price !== null && changes?.price !== undefined && item) {
      const filled = fillPrice({
        qty: newQty,
        lineUnit: newUnit,
        item,
        isNewItem: false,
        billId: bill.id,
        spokenPriceRupees: changes.price,
        spokenBasis: null,
        oneTime,
      });
      effects.push(...filled.effects);
      line.qty = newQty;
      line.unit = newUnit;
      line.rate = filled.rate;
      line.amount = filled.amount;
      line.flags = filled.flags;

      if (filled.rate !== null) {
        const rateStr = paiseToDecimalString(filled.rate).replace(/\.00$/, "");
        toast = tFormat(
          oneTime ? dict.toasts.oneTimeApplied : dict.toasts.rateLearned,
          { item: line.nameSnapshot, rate: rateStr, unit: newUnit }
        );
      }
    } else if (item) {
      // Qty or unit changed without new spoken price: keep existing rate if unit same, else re-fill from memory
      if (newUnit === line.unit && line.rate !== null) {
        line.qty = newQty;
      } else {
        const filled = fillPrice({
          qty: newQty,
          lineUnit: newUnit,
          item,
          isNewItem: false,
          billId: bill.id,
        });
        line.qty = newQty;
        line.unit = newUnit;
        line.rate = filled.rate;
        line.amount = filled.amount;
        line.flags = filled.flags;
      }
    }

    bill.sessionState.lastLineId = line.id;
    bill = computeTotals(bill);
    return { bill, effects, toast };
  }

  if (intent.intent === "REMOVE_LINE") {
    const line = findTargetLine(bill, intent.target_line, workingCatalogue);
    if (!line) {
      return {
        bill: ctx.bill,
        effects: [],
        readback: { text: dict.readback.clarify, lang: ctx.lang },
        clarify: { transcript: "" },
      };
    }

    bill.lines = bill.lines.filter((l) => l.id !== line.id);
    bill = computeTotals(bill);
    return {
      bill,
      effects,
      toast: tFormat(dict.toasts.lineRemoved, { item: line.nameSnapshot }),
    };
  }

  if (intent.intent === "FINISH_BILL") {
    bill = computeTotals(bill);
    const queue = pendingQuestions(bill, ctx.lang);
    if (queue.length > 0) {
      bill.sessionState.phase = "FINISHING";
      bill.sessionState.askedAt = ctx.now.toISOString();
      return {
        bill,
        effects,
        question: queue[0],
        readback: { text: queue[0].text, lang: ctx.lang },
      };
    }

    bill.sessionState.phase = "AWAITING_PAYMENT";
    return {
      bill,
      effects,
      readback: { text: readbackFinish(bill, ctx.lang), lang: ctx.lang },
    };
  }

  if (intent.intent === "ANSWER_PENDING_QUESTION") {
    const queue = pendingQuestions(bill, ctx.lang);
    const head = queue[0];
    if (
      head &&
      head.kind === "price" &&
      intent.answer?.price !== null &&
      intent.answer?.price !== undefined
    ) {
      const line = bill.lines.find((l) => l.id === head.lineId);
      const item = workingCatalogue.find((c) => c.id === head.itemId);
      if (line && item) {
        const filled = fillPrice({
          qty: line.qty,
          lineUnit: line.unit,
          item,
          isNewItem: line.flags.includes("new_item"),
          billId: bill.id,
          spokenPriceRupees: intent.answer.price,
          spokenBasis: "per_unit",
          oneTime: false,
        });
        effects.push(...filled.effects);
        line.rate = filled.rate;
        line.amount = filled.amount;
        line.flags = filled.flags.filter((f) => f !== "price_needed");
        bill = computeTotals(bill);

        const nextQueue = pendingQuestions(bill, ctx.lang);
        if (nextQueue.length > 0) {
          return {
            bill,
            effects,
            question: nextQueue[0],
            readback: { text: nextQueue[0].text, lang: ctx.lang },
          };
        }

        bill.sessionState.phase = "AWAITING_PAYMENT";
        return {
          bill,
          effects,
          readback: { text: readbackFinish(bill, ctx.lang), lang: ctx.lang },
        };
      }
    }

    if (head && head.kind === "discount_scope" && intent.answer?.scope) {
      const stashed = bill.sessionState.lastAutoScope;
      bill.sessionState.pendingQueue = (
        bill.sessionState.pendingQueue ?? []
      ).filter((q) => q.kind !== "discount_scope");

      const nextPrefs = recordDiscountScopeAnswer(
        ctx.prefs,
        intent.answer.scope,
        false,
        ctx.now
      );
      effects.push({ type: "savePrefs", prefs: nextPrefs });

      const discRes = applyDiscountIntent({
        bill,
        intent: {
          ...intent,
          intent: "APPLY_DISCOUNT",
          discount: stashed
            ? {
                kind: stashed.discountKind,
                value: stashed.discountValue,
                scope: intent.answer.scope,
                item_names: intent.answer.item_names ?? [],
                is_correction: false,
              }
            : null,
        },
        catalogue: workingCatalogue,
        prefs: nextPrefs,
        lang: ctx.lang,
        now: ctx.now,
      });

      return {
        bill: discRes.bill,
        effects: [...effects, ...discRes.effects],
        question: discRes.question,
        readback: discRes.readback
          ? { text: discRes.readback, lang: ctx.lang }
          : undefined,
      };
    }

    if (
      head &&
      head.kind === "discount_items" &&
      intent.answer?.item_names &&
      intent.answer.item_names.length > 0
    ) {
      const stashed = bill.sessionState.lastAutoScope;
      bill.sessionState.pendingQueue = (
        bill.sessionState.pendingQueue ?? []
      ).filter((q) => q.kind !== "discount_items");

      const discRes = applyDiscountIntent({
        bill,
        intent: {
          ...intent,
          intent: "APPLY_DISCOUNT",
          discount: stashed
            ? {
                kind: stashed.discountKind,
                value: stashed.discountValue,
                scope: "items",
                item_names: intent.answer.item_names,
                is_correction: false,
              }
            : null,
        },
        catalogue: workingCatalogue,
        prefs: ctx.prefs,
        lang: ctx.lang,
        now: ctx.now,
      });
      return {
        bill: discRes.bill,
        effects: [...effects, ...discRes.effects],
        question: discRes.question,
        readback: discRes.readback
          ? { text: discRes.readback, lang: ctx.lang }
          : undefined,
      };
    }

    if (head && head.kind === "udhaar_customer" && intent.answer?.customer) {
      bill.sessionState.pendingQueue = (
        bill.sessionState.pendingQueue ?? []
      ).filter((q) => q.kind !== "udhaar_customer");

      const payRes = applyPaymentIntent({
        bill,
        intent: {
          ...intent,
          intent: "RECORD_PAYMENT",
          customer: { name: intent.answer.customer },
          payment: { mode: "due", amount: null },
        },
        customers: ctx.customers,
        lang: ctx.lang,
        now: ctx.now,
        shopId: ctx.shopId,
      });
      return {
        bill: payRes.bill,
        effects: [...effects, ...payRes.effects],
        readback: payRes.readback
          ? { text: payRes.readback, lang: ctx.lang }
          : undefined,
      };
    }

    return {
      bill: ctx.bill,
      effects: [],
      readback: { text: dict.readback.clarify, lang: ctx.lang },
      clarify: { transcript: "" },
    };
  }

  if (intent.intent === "APPLY_DISCOUNT") {
    const discRes = applyDiscountIntent({
      bill,
      intent,
      catalogue: workingCatalogue,
      prefs: ctx.prefs,
      lang: ctx.lang,
      now: ctx.now,
    });
    return {
      bill: discRes.bill,
      effects: [...effects, ...discRes.effects],
      question: discRes.question,
      readback: discRes.readback
        ? { text: discRes.readback, lang: ctx.lang }
        : undefined,
    };
  }

  if (intent.intent === "SET_CUSTOMER") {
    if (intent.customer?.name) {
      const { customer, isNew } = resolveOrCreateCustomer(
        intent.customer.name,
        ctx.customers,
        ctx.shopId
      );
      bill.customerId = customer.id;
      bill.customerName = customer.name;
      if (isNew) {
        effects.push({
          type: "upsertCustomer",
          c: { ...customer, isNew: true },
        });
      }
    }
    if (intent.payment) {
      const payRes = applyPaymentIntent({
        bill,
        intent,
        customers: ctx.customers,
        lang: ctx.lang,
        now: ctx.now,
        shopId: ctx.shopId,
      });
      return {
        bill: payRes.bill,
        effects: [...effects, ...payRes.effects],
        question: payRes.question,
        readback: payRes.readback
          ? { text: payRes.readback, lang: ctx.lang }
          : undefined,
      };
    }
    return { bill, effects };
  }

  if (intent.intent === "RECORD_PAYMENT") {
    const payRes = applyPaymentIntent({
      bill,
      intent,
      customers: ctx.customers,
      lang: ctx.lang,
      now: ctx.now,
      shopId: ctx.shopId,
    });
    return {
      bill: payRes.bill,
      effects: [...effects, ...payRes.effects],
      question: payRes.question,
      readback: payRes.readback
        ? { text: payRes.readback, lang: ctx.lang }
        : undefined,
    };
  }

  if (intent.intent === "READ_BILL") {
    return {
      bill,
      effects,
      readback: { text: readbackBillItems(bill, ctx.lang), lang: ctx.lang },
    };
  }

  // Fallback for M2/M3 intents not yet wired in M1
  void formatInrCompact;
  return {
    bill,
    effects,
  };
}
