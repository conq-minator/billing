import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getTodaySummary } from "@/db/repo/ledger";
import { DEMO_SHOP_ID } from "@/db/seed";

export async function GET() {
  try {
    const db = getDb();
    const summary = await getTodaySummary(db, DEMO_SHOP_ID);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/ledger/today error:", err);
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
