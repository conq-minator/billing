import { getDict, tFormat } from "@/i18n";
import { formatInrCompact, rupeesToPaise } from "@/lib/money";
import type { Intent } from "@/router/intent.schema";
import { recordDiscountScopeAnswer } from "./discountLearning";
import { normalizeItemName } from "./normalize";
import { resolveItem } from "./resolveItem";
import { computeTotals } from "./totals";
import type {
  Bill,
  Effect,
  ItemRecord,
  Lang,
  PreferencesRecord,
  Question,
} from "./types";

function formatDiscountDesc(kind: "percent" | "flat" | "target_total", value: number): string {
  if (kind === "percent") return `${value}%`;
  return formatInrCompact(rupeesToPaise(value));
}

function matchBillLines(
  bill: Bill,
  itemNames: string[],
  catalogue: ItemRecord[]
): string[] {
  const matchedIds = new Set<string>();
  for (const name of itemNames) {
    const norm = normalizeItemName(name);
    const direct = bill.lines.find((l) =>
      normalizeItemName(l.nameSnapshot).includes(norm)
    );
    if (direct) {
      matchedIds.add(direct.id);
      continue;
    }
    const resolved = resolveItem(name, catalogue);
    if ("item" in resolved) {
      const byItem = bill.lines.find((l) => l.itemId === resolved.item.id);
      if (byItem) matchedIds.add(byItem.id);
    }
  }
  return Array.from(matchedIds);
}

export function clearAllDiscounts(bill: Bill): Bill {
  const clearedLines = bill.lines.map((l) => ({
    ...l,
    lineDiscountType: null,
    lineDiscountValue: null,
    lineDiscountAmount: 0,
  }));
  const next: Bill = {
    ...bill,
    lines: clearedLines,
    billDiscountType: null,
    billDiscountValue: null,
    billDiscountAmount: 0,
    sessionState: {
      ...bill.sessionState,
      pendingQueue: (bill.sessionState.pendingQueue ?? []).filter(
        (q) => q.kind !== "discount_scope" && q.kind !== "discount_items"
      ),
      lastAutoScope: undefined,
    },
  };
  return computeTotals(next);
}

export function applyDiscountIntent(params: {
  bill: Bill;
  intent: Intent;
  catalogue: ItemRecord[];
  prefs: PreferencesRecord;
  lang: Lang;
  now: Date;
}): {
  bill: Bill;
  effects: Effect[];
  readback?: string;
  question?: Question;
} {
  const { intent, catalogue, prefs, lang, now } = params;
  const dict = getDict(lang);
  const effects: Effect[] = [];
  let bill = {
    ...params.bill,
    sessionState: { ...params.bill.sessionState },
    lines: params.bill.lines.map((l) => ({ ...l })),
  };

  // Remove discount
  if (intent.changes?.remove_discount) {
    bill = clearAllDiscounts(bill);
    return { bill, effects };
  }

  const d = intent.discount;
  if (!d) return { bill, effects };

  // Target total discount
  if (d.kind === "target_total") {
    bill = computeTotals(bill);
    const targetPaise = rupeesToPaise(d.value);
    if (targetPaise > bill.subtotal) {
      return {
        bill: params.bill,
        effects: [],
        readback: dict.readback.targetTooHigh,
      };
    }
    bill.billDiscountType = "target_total";
    bill.billDiscountValue = targetPaise;
    bill = computeTotals(bill);
    return { bill, effects };
  }

  // Correction after auto-applied scope ("nahi, 20% sirf dal aur chawal pe tha")
  if (d.is_correction) {
    const prevType = bill.billDiscountType ?? d.kind;
    const prevVal =
      bill.billDiscountValue ??
      (d.kind === "percent" ? d.value : rupeesToPaise(d.value));
    bill = clearAllDiscounts(bill);

    const lineIds = matchBillLines(bill, d.item_names, catalogue);
    const lineVal = prevType === "flat" ? prevVal : prevVal;
    for (const line of bill.lines) {
      if (lineIds.includes(line.id)) {
        line.lineDiscountType = prevType === "flat" ? "flat" : "percent";
        line.lineDiscountValue = lineVal;
      }
    }
    bill = computeTotals(bill);

    const nextPrefs = recordDiscountScopeAnswer(prefs, "items", true, now);
    effects.push({ type: "savePrefs", prefs: nextPrefs });

    return {
      bill,
      effects,
      readback: tFormat(dict.readback.discountApplied, {
        desc: formatDiscountDesc(d.kind, d.value),
        scope: dict.readback.scopeItems,
        total: formatInrCompact(bill.total).replace(/^₹/, ""),
      }),
    };
  }

  // Determine scope
  let scope = d.scope;
  let wasAutoLearned = false;

  if (scope === "unspecified") {
    if (prefs.discountScopeLearned) {
      scope = prefs.discountScopeLearned;
      wasAutoLearned = true;
    } else {
      const desc = formatDiscountDesc(d.kind, d.value);
      bill.sessionState.pendingQueue = [
        ...(bill.sessionState.pendingQueue ?? []).filter(
          (q) => q.kind !== "discount_scope"
        ),
        {
          kind: "discount_scope",
          itemName: desc,
        },
      ];
      // Stash pending discount on billDiscountType/Value temporarily or in sessionState
      bill.sessionState.lastAutoScope = {
        discountKind: d.kind,
        discountValue: d.value,
      };
      const question: Question = {
        kind: "discount_scope",
        text: tFormat(dict.questions.discountScope, { desc }),
      };
      return {
        bill,
        effects,
        question,
        readback: question.text,
      };
    }
  }

  if (scope === "whole") {
    bill.billDiscountType = d.kind;
    bill.billDiscountValue =
      d.kind === "percent" ? d.value : rupeesToPaise(d.value);
    if (wasAutoLearned) {
      bill.sessionState.lastAutoScope = {
        discountKind: d.kind,
        discountValue: d.value,
      };
    }
    bill = computeTotals(bill);
    return {
      bill,
      effects,
      readback: wasAutoLearned
        ? tFormat(dict.readback.discountApplied, {
            desc: formatDiscountDesc(d.kind, d.value),
            scope: dict.readback.scopeWhole,
            total: formatInrCompact(bill.total).replace(/^₹/, ""),
          })
        : undefined,
    };
  }

  // scope === "items"
  const lineIds = matchBillLines(bill, d.item_names, catalogue);
  if (lineIds.length === 0) {
    bill.sessionState.lastAutoScope = {
      discountKind: d.kind,
      discountValue: d.value,
    };
    bill.sessionState.pendingQueue = [
      ...(bill.sessionState.pendingQueue ?? []),
      { kind: "discount_items" },
    ];
    const question: Question = {
      kind: "discount_items",
      text: dict.questions.discountItems,
    };
    return { bill, effects, question, readback: question.text };
  }

  const lineVal = d.kind === "percent" ? d.value : rupeesToPaise(d.value);
  for (const line of bill.lines) {
    if (lineIds.includes(line.id)) {
      line.lineDiscountType = d.kind === "flat" ? "flat" : "percent";
      line.lineDiscountValue = lineVal;
    }
  }
  bill = computeTotals(bill);
  return { bill, effects };
}
