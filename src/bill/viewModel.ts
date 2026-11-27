import { BILL_NO_PAD_LENGTH } from "@/config/constants";
import type { Bill, Lang } from "@/engine/types";
import { formatInr, paiseToDecimalString } from "@/lib/money";
import { formatQty } from "@/lib/qty";
import { formatBillTimestamp } from "@/lib/time";
import { buildUpiUri } from "./upi";

export type BillViewModel = {
  title: string;
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  gstin: string | null;
  billNoFormatted: string;
  publicId: string;
  timestamp: string;
  customerName: string;
  status: "open" | "final" | "edited";
  lines: Array<{
    lineNo: number;
    name: string;
    qtyText: string;
    rateText: string;
    amountText: string;
    discountText: string | null;
  }>;
  subtotalText: string;
  billDiscountLabel: string | null;
  billDiscountText: string | null;
  roundOffText: string | null;
  totalText: string;
  totalPaise: number;
  paidText: string;
  balanceDueText: string;
  upiUri: string;
};

export function toBillViewModel(
  bill: Bill,
  shop: {
    name: string;
    address: string;
    phone: string;
    upiVpa: string;
    gstin: string | null;
  },
  lang: Lang = "hi"
): BillViewModel {
  const billNoFormatted = String(bill.billNo).padStart(BILL_NO_PAD_LENGTH, "0");
  const lines = bill.lines.map((l) => ({
    lineNo: l.lineNo,
    name: l.nameSnapshot,
    qtyText: `${formatQty(l.qty)} ${l.unit}`,
    rateText:
      l.rate !== null ? `${paiseToDecimalString(l.rate).replace(/\.00$/, "")}/${l.unit}` : "—",
    amountText: l.rate !== null ? paiseToDecimalString(l.amount) : "—",
    discountText:
      l.lineDiscountAmount > 0
        ? `-${paiseToDecimalString(l.lineDiscountAmount)}`
        : null,
  }));

  let billDiscountLabel: string | null = null;
  if (bill.billDiscountType === "percent" && bill.billDiscountValue !== null) {
    billDiscountLabel = `Bill discount (${bill.billDiscountValue}%)`;
  } else if (bill.billDiscountAmount > 0) {
    billDiscountLabel = "Bill discount";
  }

  const paidParts: string[] = [];
  if (bill.paidUpi > 0) paidParts.push(`UPI ${formatInr(bill.paidUpi)}`);
  if (bill.paidCash > 0) paidParts.push(`Cash ${formatInr(bill.paidCash)}`);

  const upiAmount = bill.balanceDue > 0 ? bill.balanceDue : bill.total;

  return {
    title: bill.status === "edited" ? "Bill / Estimate (Edited)" : "Bill / Estimate",
    shopName: shop.name,
    shopAddress: shop.address,
    shopPhone: shop.phone,
    gstin: shop.gstin,
    billNoFormatted,
    publicId: bill.publicId,
    timestamp: formatBillTimestamp(new Date(bill.createdAt)),
    customerName: bill.customerName ?? (lang === "bn" ? "ওয়াক-ইন" : "Walk-in"),
    status: bill.status,
    lines,
    subtotalText: paiseToDecimalString(bill.subtotal),
    billDiscountLabel,
    billDiscountText:
      bill.billDiscountAmount > 0
        ? `-${paiseToDecimalString(bill.billDiscountAmount)}`
        : null,
    roundOffText:
      bill.roundOff !== 0 ? paiseToDecimalString(bill.roundOff) : null,
    totalText: formatInr(bill.total),
    totalPaise: bill.total,
    paidText: paidParts.length > 0 ? paidParts.join(" + ") : "Unpaid",
    balanceDueText: formatInr(bill.balanceDue),
    upiUri: buildUpiUri({
      vpa: shop.upiVpa,
      name: shop.name,
      amountPaise: upiAmount,
      billNo: bill.billNo,
    }),
  };
}
