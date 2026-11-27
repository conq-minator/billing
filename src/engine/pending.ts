import { getDict, tFormat } from "@/i18n";
import type { Bill, Lang, Question } from "./types";

/**
 * Recomputes the pending question queue from the current bill state.
 * Order: unknown prices (line order) -> ambiguous discount -> udhaar customer.
 */
export function pendingQuestions(bill: Bill, lang: Lang = "hi"): Question[] {
  const dict = getDict(lang);
  const queue: Question[] = [];

  for (const line of bill.lines) {
    if (line.flags.includes("price_needed") || line.rate === null) {
      queue.push({
        kind: "price",
        text: tFormat(dict.questions.price, { item: line.nameSnapshot }),
        lineId: line.id,
        itemId: line.itemId,
        itemName: line.nameSnapshot,
        unit: line.unit,
      });
    }
  }

  const existing = bill.sessionState.pendingQueue ?? [];
  for (const q of existing) {
    if (q.kind === "discount_scope") {
      queue.push({
        kind: "discount_scope",
        text: tFormat(dict.questions.discountScope, {
          desc: q.itemName ?? "Discount",
        }),
      });
    } else if (q.kind === "discount_items") {
      queue.push({
        kind: "discount_items",
        text: dict.questions.discountItems,
      });
    } else if (q.kind === "udhaar_customer") {
      queue.push({
        kind: "udhaar_customer",
        text: dict.questions.udhaarCustomer,
      });
    }
  }

  return queue;
}
