import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getEnv } from "@/config/env";
import { getDb } from "@/db/client";
import { getShopRow } from "@/db/repo/bills";
import { customers } from "@/db/schema";
import { DEMO_SHOP_ID } from "@/db/seed";
import { formatInrCompact } from "@/lib/money";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(req.url);
    const lang = url.searchParams.get("lang") === "bn" ? "bn" : "hi";

    const db = getDb();
    const [cust] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    if (!cust) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    const shopRow = await getShopRow(db, DEMO_SHOP_ID);
    const env = getEnv();
    const amountStr = formatInrCompact(cust.balanceDue);

    const text =
      lang === "bn"
        ? `Namaskar ${cust.name}, ${shopRow?.name ?? "Shop"}-er ${amountStr} baki ache. Suvidha moto UPI-te pathiye deben: ${env.NEXT_PUBLIC_APP_URL}`
        : `Namaste ${cust.name}, ${shopRow?.name ?? "Shop"} pe aapka ${amountStr} baaki hai. Kripya suvidha anusar bhej dein: ${env.NEXT_PUBLIC_APP_URL}`;

    return NextResponse.json({
      url: buildWhatsAppUrl({ phone: cust.phone, text }),
      text,
      hasPhone: Boolean(cust.phone),
    });
  } catch (err) {
    console.error("GET /api/customers/:id/reminder-link error:", err);
    return NextResponse.json({ error: "Failed to build reminder" }, { status: 500 });
  }
}
