import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { customers, payments } from "@/db/schema";
import { DEMO_SHOP_ID } from "@/db/seed";
import { rupeesToPaise } from "@/lib/money";

const PaymentSchema = z.object({
  amountRupees: z.number().positive(),
  mode: z.enum(["cash", "upi"]).default("cash"),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = PaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment" }, { status: 400 });
    }

    const amountPaise = rupeesToPaise(parsed.data.amountRupees);
    const db = getDb();

    const updated = await db.transaction(async (tx) => {
      await tx.insert(payments).values({
        shopId: DEMO_SHOP_ID,
        customerId: id,
        billId: null,
        amount: amountPaise,
        mode: parsed.data.mode,
      });

      const [c] = await tx
        .update(customers)
        .set({
          balanceDue: sql`GREATEST(0, ${customers.balanceDue} - ${amountPaise})`,
        })
        .where(eq(customers.id, id))
        .returning();
      return c;
    });

    if (!updated) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ customer: updated });
  } catch (err) {
    console.error("POST /api/customers/:id/payments error:", err);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
