import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { customers } from "@/db/schema";
import { DEMO_SHOP_ID } from "@/db/seed";
import { normalizeItemName } from "@/engine/normalize";

const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(customers)
      .where(eq(customers.shopId, DEMO_SHOP_ID))
      .orderBy(desc(customers.balanceDue));
    return NextResponse.json({ customers: rows });
  } catch (err) {
    console.error("GET /api/customers error:", err);
    return NextResponse.json({ error: "Failed to load customers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid customer" }, { status: 400 });
    }
    const db = getDb();
    const [created] = await db
      .insert(customers)
      .values({
        shopId: DEMO_SHOP_ID,
        name: parsed.data.name.trim(),
        nameNorm: normalizeItemName(parsed.data.name),
        phone: parsed.data.phone ?? null,
        balanceDue: 0,
      })
      .returning();
    return NextResponse.json({ customer: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/customers error:", err);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
