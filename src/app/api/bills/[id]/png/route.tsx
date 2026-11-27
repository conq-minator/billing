import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
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
    const height = Math.max(460, 290 + vm.lines.length * 30);

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "600px",
            height: `${height}px`,
            backgroundColor: "#ffffff",
            padding: "28px",
            fontFamily: "sans-serif",
            color: "#1c1917",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>{vm.shopName}</div>
            <div style={{ fontSize: "13px", color: "#57534e", display: "flex" }}>
              {`${vm.shopAddress} · ${vm.shopPhone}`}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid #d6d3d1",
              borderBottom: "1px solid #d6d3d1",
              padding: "8px 0",
              fontSize: "13px",
              marginBottom: "10px",
            }}
          >
            <span>{`Bill #${vm.billNoFormatted}`}</span>
            <span>{vm.customerName}</span>
            <span>{vm.timestamp}</span>
          </div>

          {vm.lines.map((l) => (
            <div
              key={l.lineNo}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
                fontSize: "15px",
              }}
            >
              <span>{`${l.lineNo}. ${l.name} (${l.qtyText})`}</span>
              <span style={{ fontWeight: 600 }}>{l.amountText}</span>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "2px solid #1c1917",
              marginTop: "14px",
              paddingTop: "10px",
              fontSize: "22px",
              fontWeight: 800,
            }}
          >
            <span>TOTAL</span>
            <span>{vm.totalText}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", fontSize: "13px", color: "#57534e" }}>
              <span>{vm.paidText}</span>
              <span>{`Balance Due: ${vm.balanceDueText}`}</span>
              <span style={{ marginTop: "6px" }}>Made with Boli-Quote</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="UPI QR" width={110} height={110} />
          </div>
        </div>
      ),
      { width: 600, height }
    );
  } catch (err) {
    console.error("GET /api/bills/:id/png error:", err);
    return NextResponse.json({ error: "PNG generation failed" }, { status: 500 });
  }
}
