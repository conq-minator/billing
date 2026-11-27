import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { preferences, shop } from "@/db/schema";
import { DEMO_SHOP_ID } from "@/db/seed";

const UpdateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  upiVpa: z.string().min(3).optional(),
  languagePrimary: z.enum(["hi", "bn"]).optional(),
  languageSecondary: z.enum(["hi", "bn"]).optional(),
});

export async function GET() {
  try {
    const db = getDb();
    const [shopRow] = await db
      .select()
      .from(shop)
      .where(eq(shop.id, DEMO_SHOP_ID));
    const [prefRow] = await db
      .select()
      .from(preferences)
      .where(eq(preferences.shopId, DEMO_SHOP_ID));
    return NextResponse.json({
      shop: shopRow ?? null,
      preferences: prefRow ?? null,
    });
  } catch (err) {
    console.error("GET /api/settings error:", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const parsed = UpdateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
    }
    const db = getDb();
    const [updated] = await db
      .update(shop)
      .set(parsed.data)
      .where(eq(shop.id, DEMO_SHOP_ID))
      .returning();
    return NextResponse.json({ shop: updated });
  } catch (err) {
    console.error("PUT /api/settings error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
