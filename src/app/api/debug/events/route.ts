import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { MAX_VOICE_EVENTS_DEBUG } from "@/config/constants";
import { getEnv } from "@/config/env";
import { getDb } from "@/db/client";
import { voiceEvents } from "@/db/schema";
import { DEMO_SHOP_ID } from "@/db/seed";

export async function GET() {
  const env = getEnv();
  if (!env.DEMO_MODE) {
    return NextResponse.json({ error: "Demo mode disabled" }, { status: 403 });
  }

  try {
    const db = getDb();
    const events = await db
      .select()
      .from(voiceEvents)
      .where(eq(voiceEvents.shopId, DEMO_SHOP_ID))
      .orderBy(desc(voiceEvents.createdAt))
      .limit(MAX_VOICE_EVENTS_DEBUG);

    const totals = events
      .map((e) => Number((e.latencyMs as Record<string, number>)?.totalMs ?? 0))
      .filter((n) => n > 0)
      .sort((a, b) => a - b);

    const p50 = totals.length > 0 ? totals[Math.floor(totals.length * 0.5)] : 0;
    const p95 = totals.length > 0 ? totals[Math.floor(totals.length * 0.95)] : 0;
    const fastHits = events.filter((e) => e.route === "fast").length;
    const fastHitRate = events.length > 0 ? Math.round((fastHits / events.length) * 100) : 0;

    return NextResponse.json({
      events,
      stats: { p50, p95, fastHitRate, count: events.length },
    });
  } catch (err) {
    console.error("GET /api/debug/events error:", err);
    return NextResponse.json({ error: "Failed to load debug events" }, { status: 500 });
  }
}
