import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getTopItemsToday } from "@/db/repo/ledger";
import { DEMO_SHOP_ID } from "@/db/seed";

export async function GET() {
  try {
    const db = getDb();
    const topItems = await getTopItemsToday(db, DEMO_SHOP_ID);
    return NextResponse.json({ topItems });
  } catch (err) {
    console.error("GET /api/ledger/top-items error:", err);
    return NextResponse.json({ error: "Failed to load top items" }, { status: 500 });
  }
}
