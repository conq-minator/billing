import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import {
  createOpenBill,
  getOrCreateLatestOpenBill,
  getShopRow,
  getTodaySalesTotal,
} from "@/db/repo/bills";
import { bills } from "@/db/schema";
import { DEMO_SHOP_ID } from "@/db/seed";

export async function GET(req: Request) {
  try {
    const db = getDb();
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    if (mode === "active") {
      const [bill, shopRow, todayTotal] = await Promise.all([
        getOrCreateLatestOpenBill(db, DEMO_SHOP_ID),
        getShopRow(db, DEMO_SHOP_ID),
        getTodaySalesTotal(db, DEMO_SHOP_ID),
      ]);
      return NextResponse.json({ bill, shop: shopRow, todayTotal });
    }

    const rows = await db
      .select()
      .from(bills)
      .where(eq(bills.shopId, DEMO_SHOP_ID))
      .orderBy(desc(bills.createdAt))
      .limit(50);

    return NextResponse.json({ bills: rows });
  } catch (err) {
    console.error("GET /api/bills error:", err);
    return NextResponse.json(
      { error: "Failed to load bills" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const db = getDb();
    const bill = await createOpenBill(db, DEMO_SHOP_ID);
    return NextResponse.json({ bill }, { status: 201 });
  } catch (err) {
    console.error("POST /api/bills error:", err);
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 }
    );
  }
}
