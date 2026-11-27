import { eq, sql } from "drizzle-orm";
import { getEnv } from "@/config/env";
import type { AppDb } from "@/db/client";
import { bills, customers, payments } from "@/db/schema";
import { apply } from "@/engine/apply";
import { resolveOrCreateCustomer } from "@/engine/payment";
import { pendingQuestions } from "@/engine/pending";
import { resolveItem } from "@/engine/resolveItem";
import type { EngineResult, Lang } from "@/engine/types";
import { formatInrCompact, rupeesToPaise } from "@/lib/money";
import { daysBetween } from "@/lib/time";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { Intent, UnitType } from "@/router/intent.schema";
import { routeUtterance } from "@/router/route";
import {
  getShopRow,
  loadEngineContext,
  persistEngineResult,
  recordVoiceEvent,
} from "./bills";
import {
  getCustomerDetails,
  getDuesList,
  getItemPriceHistory,
  getTodaySummary,
} from "./ledger";

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

    let engineRes: EngineResult;
    const txDb = tx as unknown as AppDb;

    if (routed.intent.intent === "QUERY_LEDGER") {
      const qType = routed.intent.query?.type ?? "today_summary";
      if (qType === "dues_list") {
        const dues = await getDuesList(txDb, freshCtx.shopId, freshCtx.now);
        const topText =
          dues.length === 0
            ? "Kisi ka udhaar baaki nahi hai."
            : dues
                .slice(0, 3)
                .map((d) => `${d.name} ${formatInrCompact(d.balanceDue)}`)
                .join(", ");
        engineRes = {
          bill: freshCtx.bill,
          effects: [],
          readback: { text: topText, lang },
          queryResult: {
            type: "dues_list",
            title: lang === "bn" ? "বাকি হিসাব" : "Baaki hisaab",
            data: { dues },
          },
        };
      } else if (
        qType === "customer_balance" &&
        routed.intent.query?.customer
      ) {
        const { customer } = resolveOrCreateCustomer(
          routed.intent.query.customer,
          freshCtx.customers,
          freshCtx.shopId
        );
        const details = await getCustomerDetails(txDb, customer.id);
        const bal = details?.customer.balanceDue ?? 0;
        engineRes = {
          bill: freshCtx.bill,
          effects: [],
          readback: {
            text: `${customer.name} ka ${formatInrCompact(bal)} baaki hai.`,
            lang,
          },
          queryResult: {
            type: "customer_balance",
            title: customer.name,
            data: {
              balanceDue: bal,
              lastPayment: details?.lastPayment ?? null,
            },
          },
        };
      } else {
        const summary = await getTodaySummary(txDb, freshCtx.shopId, freshCtx.now);
        const text =
          lang === "bn"
            ? `Aj ${summary.billCount} bill, ${formatInrCompact(summary.totalSales)} bikri. UPI ${formatInrCompact(summary.upiTotal)}, cash ${formatInrCompact(summary.cashTotal)}, baki ${formatInrCompact(summary.udhaarTotal)}.`
            : `Aaj ${summary.billCount} bill, ${formatInrCompact(summary.totalSales)} bikri. UPI ${formatInrCompact(summary.upiTotal)}, cash ${formatInrCompact(summary.cashTotal)}, udhaar ${formatInrCompact(summary.udhaarTotal)}.`;
        engineRes = {
          bill: freshCtx.bill,
          effects: [],
          readback: { text, lang },
          queryResult: {
            type: "today_summary",
            title: lang === "bn" ? "আজকের হিসাব" : "Aaj ka hisaab",
            data: summary,
          },
        };
      }
    } else if (routed.intent.intent === "QUERY_PRICE" && routed.intent.query?.item) {
      const resolved = resolveItem(routed.intent.query.item, freshCtx.catalogue);
      if ("item" in resolved) {
        const hist = await getItemPriceHistory(txDb, resolved.item.id);
        const latest = hist?.history[0];
        const days = latest ? daysBetween(latest.createdAt, freshCtx.now) : 0;
        const rateStr = latest
          ? formatInrCompact(latest.pricePerUnit)
          : resolved.item.pricePerUnit
            ? formatInrCompact(resolved.item.pricePerUnit)
            : "unknown";
        const unit = latest?.unit ?? resolved.item.defaultUnit;
        const text = `${rateStr} per ${unit}, ${days} din pehle.`;
        engineRes = {
          bill: freshCtx.bill,
          effects: [],
          readback: { text, lang },
          queryResult: {
            type: "item_price_history",
            title: resolved.item.name,
            data: {
              item: resolved.item.name,
              rate: rateStr,
              unit,
              daysAgo: days,
              history: hist?.history ?? [],
            },
          },
        };
      } else {
        engineRes = {
          bill: freshCtx.bill,
          effects: [],
          readback: { text: "Is item ka rate record nahi mila.", lang },
        };
      }
    } else if (
      routed.intent.intent === "SEND_REMINDER" &&
      routed.intent.customer?.name
    ) {
      const { customer } = resolveOrCreateCustomer(
        routed.intent.customer.name,
        freshCtx.customers,
        freshCtx.shopId
      );
      const shopRow = await getShopRow(txDb, freshCtx.shopId);
      const env = getEnv();
      const amountStr = formatInrCompact(customer.balanceDue);
      const msg =
        lang === "bn"
          ? `Namaskar ${customer.name}, ${shopRow?.name ?? "Shop"}-er ${amountStr} baki ache. ${env.NEXT_PUBLIC_APP_URL}`
          : `Namaste ${customer.name}, ${shopRow?.name ?? "Shop"} pe aapka ${amountStr} baaki hai. ${env.NEXT_PUBLIC_APP_URL}`;
      const reminderUrl = buildWhatsAppUrl({
        phone: customer.phone,
        text: msg,
      });
      engineRes = {
        bill: freshCtx.bill,
        effects: [],
        readback: {
          text: `${customer.name} ka reminder taiyaar hai (${amountStr}).`,
          lang,
        },
        queryResult: {
          type: "customer_balance",
          title: `Reminder: ${customer.name}`,
          data: {
            customerId: customer.id,
            customerName: customer.name,
            balanceDue: customer.balanceDue,
            reminderUrl,
            hasPhone: Boolean(customer.phone),
          },
        },
      };
    } else if (
      routed.intent.intent === "RECORD_PAYMENT" &&
      freshCtx.bill.lines.length === 0 &&
      routed.intent.customer?.name &&
      routed.intent.payment?.amount
    ) {
      const { customer } = resolveOrCreateCustomer(
        routed.intent.customer.name,
        freshCtx.customers,
        freshCtx.shopId
      );
      const amountPaise = rupeesToPaise(routed.intent.payment.amount);
      const mode = routed.intent.payment.mode === "upi" ? "upi" : "cash";
      await txDb.insert(payments).values({
        shopId: freshCtx.shopId,
        customerId: customer.id,
        billId: null,
        amount: amountPaise,
        mode,
      });
      const [updatedCust] = await txDb
        .update(customers)
        .set({
          balanceDue: sql`GREATEST(0, ${customers.balanceDue} - ${amountPaise})`,
        })
        .where(eq(customers.id, customer.id))
        .returning();
      engineRes = {
        bill: freshCtx.bill,
        effects: [],
        readback: {
          text: `${customer.name} se ${formatInrCompact(amountPaise)} jama ho gaya. Baaki ${formatInrCompact(updatedCust?.balanceDue ?? 0)}.`,
          lang,
        },
      };
    } else {
      engineRes = apply(routed.intent, freshCtx);
    }

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
