import { normalizeText } from "@/engine/normalize";
import { parseQtyWords } from "@/engine/numbers";
import type { Lang, Question } from "@/engine/types";
import type { Intent } from "./intent.schema";

export type FastPathContext = {
  lang: Lang;
  pendingQuestion?: Question | null;
};

function makeBaseIntent(
  intent: Intent["intent"],
  lang: Lang,
  partial: Partial<Intent> = {}
): Intent {
  return {
    intent,
    items: [],
    target_line: null,
    changes: null,
    discount: null,
    customer: null,
    payment: null,
    query: null,
    answer: null,
    language: lang === "bn" ? "bn" : "hinglish",
    confidence: 1,
    ...partial,
  };
}

export function matchFastPath(
  transcript: string,
  ctx: FastPathContext
): Intent | null {
  const norm = normalizeText(transcript);
  if (!norm) return null;

  // 1. Pending question answers take priority
  if (ctx.pendingQuestion?.kind === "price") {
    const cleaned = norm
      .replace(/\b(rupaye|rupees|rs|taka|ka|ki|ke|er|dam|rate)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const numMatch = cleaned.match(/^(\d+(?:\.\d+)?)$/);
    if (numMatch) {
      const price = Number(numMatch[1]);
      if (price >= 0) {
        return makeBaseIntent("ANSWER_PENDING_QUESTION", ctx.lang, {
          answer: { price, scope: null, item_names: [], customer: null },
        });
      }
    }
    const wordParsed = parseQtyWords(cleaned.split(" "), ctx.lang);
    if (wordParsed && wordParsed.qty > 0) {
      return makeBaseIntent("ANSWER_PENDING_QUESTION", ctx.lang, {
        answer: { price: wordParsed.qty, scope: null, item_names: [], customer: null },
      });
    }
  }

  if (ctx.pendingQuestion?.kind === "discount_scope") {
    if (
      /^(poore bill pe|pura bill|whole bill|puro bill|puro bill e|whole)$/.test(
        norm
      )
    ) {
      return makeBaseIntent("ANSWER_PENDING_QUESTION", ctx.lang, {
        answer: { price: null, scope: "whole", item_names: [], customer: null },
      });
    }
    const itemScopeMatch = norm.match(/^(?:sirf|shudhu|only)\s+(.+?)\s+(?:pe|e)$/);
    if (itemScopeMatch) {
      const names = itemScopeMatch[1]
        .split(/\s+(?:aur|ar|and)\s+|,/)
        .map((s) => s.trim())
        .filter(Boolean);
      return makeBaseIntent("ANSWER_PENDING_QUESTION", ctx.lang, {
        answer: {
          price: null,
          scope: "items",
          item_names: names,
          customer: null,
        },
      });
    }
    if (/^(kisi item pe|item pe|items|kono item e)$/.test(norm)) {
      return makeBaseIntent("ANSWER_PENDING_QUESTION", ctx.lang, {
        answer: { price: null, scope: "items", item_names: [], customer: null },
      });
    }
  }

  // 2. Finish bill / Record bill keywords
  if (
    /^(bas|ho gaya|hogaya|total batao|bill banao|bill bana do|hoye geche|hoyeche|total bolo|done|finish|khatam|shesh|record the bill|record bill|save bill|bill save karo|bill record karo|shompurno|pura ho gaya)$/i.test(
      norm
    )
  ) {
    return makeBaseIntent("FINISH_BILL", ctx.lang);
  }

  // 3. Payment modes
  if (/^(upi|gpay|phonepe|paytm|qr)$/.test(norm)) {
    return makeBaseIntent("RECORD_PAYMENT", ctx.lang, {
      payment: { mode: "upi", amount: null },
    });
  }
  if (/^(cash|nagad|nakad)$/.test(norm)) {
    return makeBaseIntent("RECORD_PAYMENT", ctx.lang, {
      payment: { mode: "cash", amount: null },
    });
  }
  if (/^(udhaar|udhaar likh|udhaar likh do|baad mein dega|baki|baki likh|baki likh dao|baki likho)$/.test(norm)) {
    return makeBaseIntent("RECORD_PAYMENT", ctx.lang, {
      payment: { mode: "due", amount: null },
    });
  }

  // 4. Discount remove
  if (/^(discount hata|discount bad|discount cancel)$/.test(norm)) {
    return makeBaseIntent("APPLY_DISCOUNT", ctx.lang, {
      changes: {
        name: null,
        qty: null,
        unit: null,
        price: null,
        one_time: false,
        remove_discount: true,
      },
    });
  }

  // 5. Read bill
  if (/^(sab padh ke sunao|padh ke sunao|sob pore shonao|read bill)$/.test(norm)) {
    return makeBaseIntent("READ_BILL", ctx.lang);
  }

  // 6. Today's summary
  if (/^(aaj ka hisaab|aaj ka hisab|ajker hisab|today summary)$/.test(norm)) {
    return makeBaseIntent("QUERY_LEDGER", ctx.lang, {
      query: { type: "today_summary", customer: null, item: null },
    });
  }

  return null;
}
