import { NextResponse } from "next/server";
import { getEnv } from "@/config/env";
import { getDb } from "@/db/client";
import { resetDatabase, type DemoProfile } from "@/db/seed";

export async function POST(req: Request) {
  const env = getEnv();
  if (!env.DEMO_MODE) {
    return NextResponse.json({ error: "Demo mode disabled" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const profile: DemoProfile =
      body.profile === "trained" ? "trained" : "fresh";
    const db = getDb();
    await resetDatabase(db, profile);
    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    console.error("POST /api/demo/reset error:", err);
    return NextResponse.json(
      { error: "Failed to reset demo data" },
      { status: 500 }
    );
  }
}
