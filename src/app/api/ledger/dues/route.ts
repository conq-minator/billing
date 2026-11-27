import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getDuesList } from "@/db/repo/ledger";
import { DEMO_SHOP_ID } from "@/db/seed";

export async function GET() {
  try {
    const db = getDb();
    const dues = await getDuesList(db, DEMO_SHOP_ID);
    return NextResponse.json({ dues });
  } catch (err) {
    console.error("GET /api/ledger/dues error:", err);
    return NextResponse.json({ error: "Failed to load dues" }, { status: 500 });
  }
}
