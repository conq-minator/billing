import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { getTodaySalesTotal } from "@/db/repo/bills";
import { processUtterance } from "@/db/repo/utteranceService";
import { DEMO_SHOP_ID } from "@/db/seed";

const UtteranceReqSchema = z.object({
  billId: z.string().uuid(),
  transcript: z.string().min(1),
  lang: z.enum(["hi", "bn", "en"]).default("hi"),
  clientSeq: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = UtteranceReqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = await processUtterance(db, parsed.data);
    const todayTotal = await getTodaySalesTotal(db, DEMO_SHOP_ID);
    return NextResponse.json({ ...result, todayTotal });
  } catch (err) {
    console.error("POST /api/utterance error:", err);
    return NextResponse.json(
      { error: "Failed to process utterance" },
      { status: 500 }
    );
  }
}
