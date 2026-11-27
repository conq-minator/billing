import type { Bill, Lang, Question } from "@/engine/types";
import { matchFastPath } from "./fastpath";
import type { Intent } from "./intent.schema";
import { parseWithLlm } from "./llm";

export type RouteResult = {
  intent: Intent;
  route: "fast" | "llm" | "fallback";
  latencyMs: number;
};

export async function routeUtterance(params: {
  transcript: string;
  lang: Lang;
  bill: Bill;
  pendingQuestion?: Question | null;
  customerNames: string[];
}): Promise<RouteResult> {
  const start = Date.now();

  const fast = matchFastPath(params.transcript, {
    lang: params.lang,
    pendingQuestion: params.pendingQuestion,
  });
  if (fast) {
    return {
      intent: fast,
      route: "fast",
      latencyMs: Date.now() - start,
    };
  }

  try {
    const llmRes = await parseWithLlm(params);
    return {
      intent: llmRes.intent,
      route: "llm",
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      intent: {
        intent: "UNKNOWN",
        items: [],
        target_line: null,
        changes: null,
        discount: null,
        customer: null,
        payment: null,
        query: null,
        answer: null,
        language: params.lang === "bn" ? "bn" : "hinglish",
        confidence: 0,
      },
      route: "fallback",
      latencyMs: Date.now() - start,
    };
  }
}
