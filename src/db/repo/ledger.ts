import { and, desc, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import {
  billLines,
  bills,
  customers,
  items,
  payments,
  priceHistory,
} from "@/db/schema";
import { DEMO_SHOP_ID } from "@/db/seed";
import { daysBetween, getShopDayBounds } from "@/lib/time";

export type TodaySummary = {
  billCount: number;
  totalSales: number;
  upiTotal: number;
  cashTotal: number;
  udhaarTotal: number;
};

export async function getTodaySummary(
  db: AppDb,
  shopId: string = DEMO_SHOP_ID,
  now: Date = new Date()
): Promise<TodaySummary> {
  const { start, end } = getShopDayBounds(now);
  const rows = await db
    .select({
      billCount: sql<string>`COUNT(*)`,
      totalSales: sql<string>`COALESCE(SUM(${bills.total}), 0)`,
      upiTotal: sql<string>`COALESCE(SUM(${bills.paidUpi}), 0)`,
      cashTotal: sql<string>`COALESCE(SUM(${bills.paidCash}), 0)`,
      udhaarTotal: sql<string>`COALESCE(SUM(${bills.balanceDue}), 0)`,
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

  const r = rows[0];
  return {
    billCount: Number(r?.billCount ?? 0),
    totalSales: Number(r?.totalSales ?? 0),
    upiTotal: Number(r?.upiTotal ?? 0),
    cashTotal: Number(r?.cashTotal ?? 0),
    udhaarTotal: Number(r?.udhaarTotal ?? 0),
  };
}

export async function getDuesList(
  db: AppDb,
  shopId: string = DEMO_SHOP_ID,
  now: Date = new Date()
) {
  const custRows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.shopId, shopId), gt(customers.balanceDue, 0)))
    .orderBy(desc(customers.balanceDue));

  const results = [];
  for (const c of custRows) {
    const [oldest] = await db
      .select({ createdAt: bills.createdAt })
      .from(bills)
      .where(and(eq(bills.customerId, c.id), gt(bills.balanceDue, 0)))
      .orderBy(bills.createdAt)
      .limit(1);

    results.push({
      id: c.id,
      name: c.name,
      phone: c.phone,
      balanceDue: c.balanceDue,
      daysPending: oldest ? daysBetween(oldest.createdAt, now) : 0,
    });
  }
  return results;
}

export async function getCustomerDetails(db: AppDb, customerId: string) {
  const [c] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId));
  if (!c) return null;

  const [lastPayment] = await db
    .select()
    .from(payments)
    .where(eq(payments.customerId, customerId))
    .orderBy(desc(payments.createdAt))
    .limit(1);

  return {
    customer: c,
    lastPayment: lastPayment ?? null,
  };
}

export async function getItemPriceHistory(db: AppDb, itemId: string) {
  const [item] = await db.select().from(items).where(eq(items.id, itemId));
  if (!item) return null;

  const history = await db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.itemId, itemId))
    .orderBy(desc(priceHistory.createdAt))
    .limit(20);

  return { item, history };
}

export async function getTopItemsToday(
  db: AppDb,
  shopId: string = DEMO_SHOP_ID,
  now: Date = new Date()
) {
  const { start, end } = getShopDayBounds(now);
  const rows = await db
    .select({
      itemId: billLines.itemId,
      name: billLines.nameSnapshot,
      totalQty: sql<string>`COALESCE(SUM(${billLines.qty}), 0)`,
      totalAmount: sql<string>`COALESCE(SUM(${billLines.amount}), 0)`,
    })
    .from(billLines)
    .innerJoin(bills, eq(billLines.billId, bills.id))
    .where(
      and(
        eq(bills.shopId, shopId),
        inArray(bills.status, ["final", "edited"]),
        gte(bills.finalizedAt, start),
        lt(bills.finalizedAt, end)
      )
    )
    .groupBy(billLines.itemId, billLines.nameSnapshot)
    .orderBy(desc(sql`SUM(${billLines.amount})`))
    .limit(10);

  return rows.map((r) => ({
    itemId: r.itemId,
    name: r.name,
    totalQty: Number(r.totalQty),
    totalAmount: Number(r.totalAmount),
  }));
}
