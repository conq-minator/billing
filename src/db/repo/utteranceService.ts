import { eq } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { bills } from "@/db/schema";
import { apply } from "@/engine/apply";
import { pendingQuestions } from "@/engine/pending";
import type { EngineResult, Lang } from "@/engine/types";
import type { Intent, UnitType } from "@/router/intent.schema";
import { routeUtterance } from "@/router/route";
import {
  loadEngineContext,
  persistEngineResult,
  recordVoiceEvent,
} from "./bills";

export async function processUtterance(
  db: AppDb,
  params: {
    billId: string;
    transcript: string;
    lang: Lang;
    clientSeq?: number;
  }
): Promise<EngineResult & { route: string; latencyMs: Record<string, number> }> {
  const t0 = Date.now();
  const { billId, transcript, lang, clientSeq } = params;

  const ctx = await loadEngineContext(db, billId, lang);
  if (!ctx) {
    throw new Error("Bill not found");
  }
  const dbLoadMs = Date.now() - t0;

  if (clientSeq !== undefined && clientSeq <= ctx.bill.clientSeq) {
    return {
      bill: ctx.bill,
      effects: [],
      route: "fast",
      latencyMs: { dbLoadMs, totalMs: Date.now() - t0 },
    };
  }

  const queue = pendingQuestions(ctx.bill, lang);
  const tRoute = Date.now();
  const routed = await routeUtterance({
    transcript,
    lang,
    bill: ctx.bill,
    pendingQuestion: queue[0] ?? null,
    customerNames: ctx.customers.map((c) => c.name),
  });
  const routeMs = Date.now() - tRoute;

  const tEngine = Date.now();
  const result = await db.transaction(async (tx) => {
    // Lock bill row on Postgres; PGlite serializes transactions
    if (process.env.DATABASE_URL?.trim()) {
      await tx.select({ id: bills.id }).from(bills).where(eq(bills.id, billId)).for("update");
    }

    const freshCtx = await loadEngineContext(tx as unknown as AppDb, billId, lang);
    if (!freshCtx) throw new Error("Bill not found");

    const engineRes = apply(routed.intent, freshCtx);
    if (engineRes.clarify) {
      engineRes.clarify.transcript = transcript;
    }

    const outcome = engineRes.clarify ? "clarify" : "applied";
    if (!engineRes.clarify) {
      await persistEngineResult(
        tx as unknown as AppDb,
        engineRes.bill,
        engineRes.effects,
        clientSeq ?? freshCtx.bill.clientSeq + 1
      );
    }

    const totalMs = Date.now() - t0;
    const latencyMs = {
      dbLoadMs,
      routeMs,
      engineAndWriteMs: Date.now() - tEngine,
      totalMs,
    };

    await recordVoiceEvent(tx as unknown as AppDb, {
      shopId: freshCtx.shopId,
      billId,
      transcript,
      lang,
      route: routed.route,
      intentJson: routed.intent as unknown as Record<string, unknown>,
      outcome,
      latencyMs,
    });

    return { ...engineRes, route: routed.route, latencyMs };
  });

  return result;
}

export type TapCommand =
  | {
      type: "editLine";
      lineId: string;
      qty?: number;
      unit?: UnitType;
      rate?: number | null; // rupees
      oneTime?: boolean;
    }
  | { type: "removeLine"; lineId: string }
  | { type: "setRate"; lineId: string; rate: number; oneTime?: boolean }
  | { type: "answerPrice"; lineId: string; rate: number }
  | { type: "finish" }
  | { type: "reopen" };

export async function processTapCommand(
  db: AppDb,
  billId: string,
  command: TapCommand,
  lang: Lang = "hi"
): Promise<EngineResult> {
  return db.transaction(async (tx) => {
    const ctx = await loadEngineContext(tx as unknown as AppDb, billId, lang);
    if (!ctx) throw new Error("Bill not found");

    if (command.type === "reopen") {
      const reopened = {
        ...ctx.bill,
        status: "edited" as const,
        version: ctx.bill.version + 1,
        editedAt: new Date(),
        sessionState: { ...ctx.bill.sessionState, phase: "OPEN" as const },
      };
      await persistEngineResult(tx as unknown as AppDb, reopened, []);
      return { bill: reopened, effects: [] };
    }

    const intent: Intent = {
      intent: "UNKNOWN",
      items: [],
      target_line: null,
      changes: null,
      discount: null,
      customer: null,
      payment: null,
      query: null,
      answer: null,
      language: lang === "bn" ? "bn" : "hi",
      confidence: 1,
    };

    if (command.type === "finish") {
      intent.intent = "FINISH_BILL";
    } else if (command.type === "removeLine") {
      const line = ctx.bill.lines.find((l) => l.id === command.lineId);
      intent.intent = "REMOVE_LINE";
      intent.target_line = {
        ref: "name",
        name: line?.nameSnapshot ?? null,
      };
    } else if (command.type === "editLine" || command.type === "setRate") {
      const line = ctx.bill.lines.find((l) => l.id === command.lineId);
      intent.intent = command.type === "setRate" ? "SET_PRICE" : "EDIT_LINE";
      intent.target_line = {
        ref: "name",
        name: line?.nameSnapshot ?? null,
      };
      intent.changes = {
        qty: command.type === "editLine" ? (command.qty ?? null) : null,
        unit: command.type === "editLine" ? (command.unit ?? null) : null,
        price: command.rate ?? null,
        one_time: command.oneTime ?? false,
        remove_discount: false,
      };
    } else if (command.type === "answerPrice") {
      intent.intent = "ANSWER_PENDING_QUESTION";
      intent.answer = {
        price: command.rate,
        scope: null,
        item_names: [],
        customer: null,
      };
    }

    const res = apply(intent, ctx);
    await persistEngineResult(tx as unknown as AppDb, res.bill, res.effects);
    return res;
  });
}
