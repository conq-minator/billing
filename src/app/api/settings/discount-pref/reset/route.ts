import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { preferences } from "@/db/schema";
import { DEMO_SHOP_ID } from "@/db/seed";

export async function POST() {
  try {
    const db = getDb();
    await db
      .update(preferences)
      .set({
        discountScopeHistory: [],
        discountScopeLearned: null,
      })
      .where(eq(preferences.shopId, DEMO_SHOP_ID));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/settings/discount-pref/reset error:", err);
    return NextResponse.json({ error: "Failed to reset preference" }, { status: 500 });
  }
}
