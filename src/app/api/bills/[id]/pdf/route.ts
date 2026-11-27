import { NextResponse } from "next/server";
import { renderBillPdfBuffer } from "@/bill/pdf";
import { generateQrDataUrl } from "@/bill/upi";
import { toBillViewModel } from "@/bill/viewModel";
import { getDb } from "@/db/client";
import { getShopRow, loadBillById } from "@/db/repo/bills";

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
    const shopRow = await getShopRow(db, bill.shopId);
    if (!shopRow) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const vm = toBillViewModel(bill, shopRow, "hi");
    const qrDataUrl = await generateQrDataUrl(vm.upiUri);
    const buffer = await renderBillPdfBuffer(vm, qrDataUrl);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="bill-${vm.billNoFormatted}.pdf"`,
      },
    });
  } catch (err) {
    console.error("GET /api/bills/:id/pdf error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
