import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { PUBLIC_ID_LENGTH } from "@/config/constants";
import type { AppDb } from "@/db/client";
import {
  billLines,
  bills,
  billVersions,
  customers,
  items,
  payments,
  preferences,
  priceHistory,
  shop,
  voiceEvents,
} from "@/db/schema";
import { DEMO_SHOP_ID } from "@/db/seed";
import type {
  Bill,
  BillLine,
  CustomerRecord,
  DiscountKind,
  Effect,
  EngineContext,
  ItemRecord,
  Lang,
  LineFlag,
  PreferencesRecord,
  PriceSource,
} from "@/engine/types";
import { getShopDayBounds } from "@/lib/time";
import type { UnitType } from "@/router/intent.schema";

function mapDbBillToEngine(
  row: typeof bills.$inferSelect,
  lineRows: Array<typeof billLines.$inferSelect>,
  customerName: string | null
): Bill {
  return {
    id: row.id,
    shopId: row.shopId,
    billNo: row.billNo,
    publicId: row.publicId,
    customerId: row.customerId,
    customerName,
    status: row.status as Bill["status"],
    sessionState: row.sessionState ?? {},
    clientSeq: row.clientSeq,
    version: row.version,
    lines: lineRows
      .sort((a, b) => a.lineNo - b.lineNo)
      .map(
        (l): BillLine => ({
          id: l.id,
          lineNo: l.lineNo,
          itemId: l.itemId,
          nameSnapshot: l.nameSnapshot,
          qty: Number(l.qty),
          unit: l.unit as UnitType,
          rate: l.rate,
          amount: l.amount,
          lineDiscountType: l.lineDiscountType as "percent" | "flat" | null,
          lineDiscountValue: l.lineDiscountValue
            ? Number(l.lineDiscountValue)
            : null,
          lineDiscountAmount: l.lineDiscountAmount,
          flags: (l.flags ?? []) as LineFlag[],
        })
      ),
    subtotal: row.subtotal,
    itemDiscountTotal: row.itemDiscountTotal,
    billDiscountType: row.billDiscountType as DiscountKind | null,
    billDiscountValue: row.billDiscountValue
      ? Number(row.billDiscountValue)
      : null,
    billDiscountAmount: row.billDiscountAmount,
    roundOff: row.roundOff,
    total: row.total,
    paidCash: row.paidCash,
    paidUpi: row.paidUpi,
    balanceDue: row.balanceDue,
    createdAt: row.createdAt,
    finalizedAt: row.finalizedAt,
    editedAt: row.editedAt,
  };
}

export async function getShopRow(db: AppDb, shopId: string = DEMO_SHOP_ID) {
  const [s] = await db.select().from(shop).where(eq(shop.id, shopId));
  return s ?? null;
}

export async function getTodaySalesTotal(
  db: AppDb,
  shopId: string = DEMO_SHOP_ID,
  now: Date = new Date()
): Promise<number> {
  const { start, end } = getShopDayBounds(now);
  const rows = await db
    .select({
      sum: sql<string>`COALESCE(SUM(${bills.total}), 0)`,
    })
    .from(bills)
    .where(
      and(
        eq(bills.shopId, shopId),
        inArray(bills.status, ["final", "edited"]),
        gte(bills.finalizedAt, start),
        lt(bills.finalizedAt, end)
      )
    );
  return Number(rows[0]?.sum ?? 0);
}

export async function createOpenBill(
  db: AppDb,
  shopId: string = DEMO_SHOP_ID
): Promise<Bill> {
  return db.transaction(async (tx) => {
    const [s] = await tx.select().from(shop).where(eq(shop.id, shopId));
    if (!s) throw new Error("Shop not found");

    const billNo = s.nextBillNo;
    await tx
      .update(shop)
      .set({ nextBillNo: billNo + 1 })
      .where(eq(shop.id, shopId));

    const [created] = await tx
      .insert(bills)
      .values({
        shopId,
        billNo,
        publicId: nanoid(PUBLIC_ID_LENGTH),
        status: "open",
        sessionState: { phase: "OPEN" },
      })
      .returning();

    return mapDbBillToEngine(created, [], null);
  });
}

export async function getOrCreateLatestOpenBill(
  db: AppDb,
  shopId: string = DEMO_SHOP_ID
): Promise<Bill> {
  const [open] = await db
    .select()
    .from(bills)
    .where(and(eq(bills.shopId, shopId), eq(bills.status, "open")))
    .orderBy(desc(bills.createdAt))
    .limit(1);

  if (open) {
    const loaded = await loadBillById(db, open.id);
    if (loaded) return loaded;
  }
  return createOpenBill(db, shopId);
}

export async function loadBillById(
  db: AppDb,
  billId: string
): Promise<Bill | null> {
  const [row] = await db.select().from(bills).where(eq(bills.id, billId));
  if (!row) return null;

  const lineRows = await db
    .select()
    .from(billLines)
    .where(eq(billLines.billId, billId))
    .orderBy(asc(billLines.lineNo));

  let customerName: string | null = null;
  if (row.customerId) {
    const [cust] = await db
      .select({ name: customers.name })
      .from(customers)
      .where(eq(customers.id, row.customerId));
    customerName = cust?.name ?? null;
  }

  return mapDbBillToEngine(row, lineRows, customerName);
}

export async function loadEngineContext(
  db: AppDb,
  billId: string,
  lang: Lang,
  now: Date = new Date()
): Promise<EngineContext | null> {
  const bill = await loadBillById(db, billId);
  if (!bill) return null;

  const [itemRows, customerRows, prefRows] = await Promise.all([
    db.select().from(items).where(eq(items.shopId, bill.shopId)),
    db.select().from(customers).where(eq(customers.shopId, bill.shopId)),
    db.select().from(preferences).where(eq(preferences.shopId, bill.shopId)),
  ]);

  const catalogue: ItemRecord[] = itemRows.map((it) => ({
    id: it.id,
    shopId: it.shopId,
    name: it.name,
    nameNorm: it.nameNorm,
    aliases: it.aliases ?? [],
    defaultUnit: it.defaultUnit as UnitType,
    pricePerUnit: it.pricePerUnit,
    priceSource: it.priceSource as PriceSource | null,
    timesUsed: it.timesUsed,
    lastUpdated: it.lastUpdated,
  }));

  const customerList: CustomerRecord[] = customerRows.map((c) => ({
    id: c.id,
    shopId: c.shopId,
    name: c.name,
    nameNorm: c.nameNorm,
    phone: c.phone,
    balanceDue: c.balanceDue,
  }));

  const prefRow = prefRows[0];
  const prefs: PreferencesRecord = {
    shopId: bill.shopId,
    discountScopeHistory: prefRow?.discountScopeHistory ?? [],
    discountScopeLearned:
      (prefRow?.discountScopeLearned as "whole" | "items" | null) ?? null,
  };

  return {
    bill,
    catalogue,
    customers: customerList,
    prefs,
    lang,
    now,
    shopId: bill.shopId,
  };
}

export async function persistEngineResult(
  db: AppDb,
  bill: Bill,
  effects: Effect[],
  nextClientSeq?: number
): Promise<void> {
  for (const eff of effects) {
    if (eff.type === "upsertItem") {
      const existing = await db
        .select({ id: items.id })
        .from(items)
        .where(eq(items.id, eff.item.id));
      if (existing.length > 0) {
        await db
          .update(items)
          .set({
            defaultUnit: eff.item.defaultUnit,
            pricePerUnit: eff.item.pricePerUnit,
            priceSource: eff.item.priceSource,
            timesUsed: eff.item.timesUsed,
            lastUpdated: new Date(),
          })
          .where(eq(items.id, eff.item.id));
      } else {
        await db.insert(items).values({
          id: eff.item.id,
          shopId: eff.item.shopId,
          name: eff.item.name,
          nameNorm: eff.item.nameNorm,
          aliases: eff.item.aliases,
          defaultUnit: eff.item.defaultUnit,
          pricePerUnit: eff.item.pricePerUnit,
          priceSource: eff.item.priceSource,
          timesUsed: eff.item.timesUsed,
        });
      }
    } else if (eff.type === "priceHistory") {
      await db.insert(priceHistory).values({
        itemId: eff.row.itemId,
        pricePerUnit: eff.row.pricePerUnit,
        unit: eff.row.unit,
        source: eff.row.source,
        billId: eff.row.billId,
      });
    } else if (eff.type === "savePrefs") {
      await db
        .update(preferences)
        .set({
          discountScopeHistory: eff.prefs.discountScopeHistory,
          discountScopeLearned: eff.prefs.discountScopeLearned,
        })
        .where(eq(preferences.shopId, eff.prefs.shopId));
    } else if (eff.type === "upsertCustomer") {
      const existing = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, eff.c.id));
      if (existing.length === 0) {
        await db.insert(customers).values({
          id: eff.c.id,
          shopId: eff.c.shopId,
          name: eff.c.name,
          nameNorm: eff.c.nameNorm,
          phone: eff.c.phone,
          balanceDue: eff.c.balanceDue,
        });
      }
    } else if (eff.type === "payment") {
      await db.insert(payments).values({
        shopId: eff.row.shopId,
        customerId: eff.row.customerId,
        billId: eff.row.billId,
        amount: eff.row.amount,
        mode: eff.row.mode,
      });
    } else if (eff.type === "customerBalanceDelta") {
      await db
        .update(customers)
        .set({
          balanceDue: sql`${customers.balanceDue} + ${eff.delta}`,
        })
        .where(eq(customers.id, eff.customerId));
    }
  }

  await db
    .update(bills)
    .set({
      customerId: bill.customerId,
      status: bill.status,
      sessionState: bill.sessionState,
      clientSeq: nextClientSeq ?? bill.clientSeq,
      version: bill.version,
      subtotal: bill.subtotal,
      itemDiscountTotal: bill.itemDiscountTotal,
      billDiscountType: bill.billDiscountType,
      billDiscountValue:
        bill.billDiscountValue !== null ? String(bill.billDiscountValue) : null,
      billDiscountAmount: bill.billDiscountAmount,
      roundOff: bill.roundOff,
      total: bill.total,
      paidCash: bill.paidCash,
      paidUpi: bill.paidUpi,
      balanceDue: bill.balanceDue,
      finalizedAt: bill.finalizedAt,
      editedAt: bill.editedAt,
    })
    .where(eq(bills.id, bill.id));

  await db.delete(billLines).where(eq(billLines.billId, bill.id));
  if (bill.lines.length > 0) {
    await db.insert(billLines).values(
      bill.lines.map((l) => ({
        id: l.id,
        billId: bill.id,
        lineNo: l.lineNo,
        itemId: l.itemId,
        nameSnapshot: l.nameSnapshot,
        qty: String(l.qty),
        unit: l.unit,
        rate: l.rate,
        amount: l.amount,
        lineDiscountType: l.lineDiscountType,
        lineDiscountValue:
          l.lineDiscountValue !== null ? String(l.lineDiscountValue) : null,
        lineDiscountAmount: l.lineDiscountAmount,
        flags: l.flags,
      }))
    );
  }

  if (bill.status === "edited") {
    await db.insert(billVersions).values({
      billId: bill.id,
      version: bill.version,
      snapshot: bill as unknown as Record<string, unknown>,
    });
  }
}

export async function recordVoiceEvent(
  db: AppDb,
  params: {
    shopId: string;
    billId: string | null;
    transcript: string;
    lang: string;
    route: "fast" | "llm" | "fallback";
    intentJson: Record<string, unknown>;
    outcome: "applied" | "clarify" | "error";
    latencyMs: Record<string, number>;
  }
): Promise<void> {
  await db.insert(voiceEvents).values(params);
}
