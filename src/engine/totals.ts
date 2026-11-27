import { ROUND_OFF_TO_PAISE } from "@/config/constants";
import { roundHalfUp, roundToPaiseStep } from "@/lib/money";
import type { Bill, BillLine } from "./types";

export function computeLineTotals(line: BillLine): BillLine {
  const hasPriceNeeded = line.flags.includes("price_needed") || line.rate === null;
  const amount = hasPriceNeeded || line.rate === null
    ? 0
    : roundHalfUp(line.rate * line.qty);

  let lineDiscountAmount = 0;
  if (!hasPriceNeeded && line.lineDiscountType && line.lineDiscountValue !== null) {
    if (line.lineDiscountType === "percent") {
      lineDiscountAmount = roundHalfUp((amount * line.lineDiscountValue) / 100);
    } else if (line.lineDiscountType === "flat") {
      lineDiscountAmount = Math.min(Math.round(line.lineDiscountValue), amount);
    }
  }

  return {
    ...line,
    amount,
    lineDiscountAmount,
  };
}

export function computeTotals(bill: Bill): Bill {
  const lines = bill.lines.map((l, idx) =>
    computeLineTotals({ ...l, lineNo: idx + 1 })
  );

  let subtotal = 0;
  let itemDiscountTotal = 0;
  for (const line of lines) {
    if (!line.flags.includes("price_needed") && line.rate !== null) {
      subtotal += line.amount - line.lineDiscountAmount;
      itemDiscountTotal += line.lineDiscountAmount;
    }
  }

  let billDiscountAmount = 0;
  if (bill.billDiscountType && bill.billDiscountValue !== null) {
    if (bill.billDiscountType === "percent") {
      billDiscountAmount = roundHalfUp(
        (subtotal * bill.billDiscountValue) / 100
      );
    } else if (bill.billDiscountType === "flat") {
      billDiscountAmount = Math.min(Math.round(bill.billDiscountValue), subtotal);
    } else if (bill.billDiscountType === "target_total") {
      billDiscountAmount = Math.max(
        0,
        subtotal - Math.round(bill.billDiscountValue)
      );
    }
  }

  const preRound = subtotal - billDiscountAmount;
  const roundOff =
    bill.billDiscountType === "target_total"
      ? 0
      : roundToPaiseStep(preRound, ROUND_OFF_TO_PAISE) - preRound;
  const total = preRound + roundOff;
  const balanceDue = Math.max(0, total - bill.paidCash - bill.paidUpi);

  return {
    ...bill,
    lines,
    subtotal,
    itemDiscountTotal,
    billDiscountAmount,
    roundOff,
    total,
    balanceDue,
  };
}
