import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { loadBillById } from "@/db/repo/bills";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const bill = await loadBillById(db, id);
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }
    return NextResponse.json({ bill });
  } catch (err) {
    console.error("GET /api/bills/:id error:", err);
    return NextResponse.json({ error: "Failed to fetch bill" }, { status: 500 });
  }
}
