import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { items, priceHistory } from "@/db/schema";
import { DEMO_SHOP_ID } from "@/db/seed";
import { normalizeItemName } from "@/engine/normalize";
import { rupeesToPaise } from "@/lib/money";
import { Unit } from "@/router/intent.schema";

const UpdateItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  defaultUnit: Unit.optional(),
  priceRupees: z.number().nonnegative().nullable().optional(),
  aliases: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(items)
      .where(eq(items.shopId, DEMO_SHOP_ID))
      .orderBy(asc(items.name));
    return NextResponse.json({ items: rows });
  } catch (err) {
    console.error("GET /api/items error:", err);
    return NextResponse.json({ error: "Failed to load items" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const parsed = UpdateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid item update" }, { status: 400 });
    }

    const db = getDb();
    const { id, name, defaultUnit, priceRupees, aliases } = parsed.data;
    const pricePerUnit =
      priceRupees === undefined
        ? undefined
        : priceRupees === null
          ? null
          : rupeesToPaise(priceRupees);

    const [updated] = await db
      .update(items)
      .set({
        ...(name ? { name, nameNorm: normalizeItemName(name) } : {}),
        ...(defaultUnit ? { defaultUnit } : {}),
        ...(pricePerUnit !== undefined
          ? { pricePerUnit, priceSource: "owner_edited", lastUpdated: new Date() }
          : {}),
        ...(aliases ? { aliases } : {}),
      })
      .where(eq(items.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (pricePerUnit !== undefined && pricePerUnit !== null) {
      await db.insert(priceHistory).values({
        itemId: updated.id,
        pricePerUnit,
        unit: updated.defaultUnit,
        source: "owner_edited",
        billId: null,
      });
    }

    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("PUT /api/items error:", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}
