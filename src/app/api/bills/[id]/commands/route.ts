import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { getTodaySalesTotal } from "@/db/repo/bills";
import { processTapCommand } from "@/db/repo/utteranceService";
import { DEMO_SHOP_ID } from "@/db/seed";
import { Unit } from "@/router/intent.schema";

const CommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("editLine"),
    lineId: z.string().uuid(),
    name: z.string().min(1).optional(),
    qty: z.number().positive().optional(),
    unit: Unit.optional(),
    rate: z.number().nonnegative().nullable().optional(),
    oneTime: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("removeLine"),
    lineId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("setRate"),
    lineId: z.string().uuid(),
    rate: z.number().nonnegative(),
    oneTime: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("answerPrice"),
    lineId: z.string().uuid(),
    rate: z.number().nonnegative(),
  }),
  z.object({ type: z.literal("finish") }),
  z.object({ type: z.literal("reopen") }),
]);

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = CommandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid command", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const lang = (body.lang as "hi" | "bn" | "en") ?? "hi";
    const db = getDb();
    const result = await processTapCommand(db, id, parsed.data, lang);
    const todayTotal = await getTodaySalesTotal(db, DEMO_SHOP_ID);
    return NextResponse.json({ ...result, todayTotal });
  } catch (err) {
    console.error("POST /api/bills/:id/commands error:", err);
    return NextResponse.json(
      { error: "Failed to execute command" },
      { status: 500 }
    );
  }
}
