import { getDict, tFormat } from "@/i18n";
import { formatInrCompact } from "@/lib/money";
import type { Bill, Lang } from "./types";

export function formatDiscountSummary(bill: Bill): string {
  if (bill.billDiscountType === "percent" && bill.billDiscountValue) {
    return `${bill.billDiscountValue}%`;
  }
  if (
    (bill.billDiscountType === "flat" ||
      bill.billDiscountType === "target_total") &&
    bill.billDiscountAmount > 0
  ) {
    return formatInrCompact(bill.billDiscountAmount);
  }
  if (bill.itemDiscountTotal > 0) {
    return formatInrCompact(bill.itemDiscountTotal);
  }
  return "";
}

export function readbackFinish(bill: Bill, lang: Lang): string {
  const dict = getDict(lang);
  const totalStr = formatInrCompact(bill.total).replace(/^₹/, "");
  const discDesc = formatDiscountSummary(bill);
  const discountPart = discDesc
    ? tFormat(dict.readback.discountPart, { desc: discDesc })
    : "";

  return tFormat(dict.readback.totalPrompt, {
    total: totalStr,
    count: bill.lines.length,
    discount: discountPart,
  });
}

export function readbackBillItems(bill: Bill, lang: Lang): string {
  const dict = getDict(lang);
  if (bill.lines.length === 0) return dict.readback.emptyBill;
  const prefix = tFormat(dict.readback.billReadPrefix, {
    count: bill.lines.length,
  });
  const itemsText = bill.lines
    .map(
      (l) =>
        `${l.nameSnapshot} ${l.qty} ${l.unit} ${formatInrCompact(l.amount)}`
    )
    .join(", ");
  return `${prefix}${itemsText}. ${tFormat(dict.readback.totalOnly, {
    total: formatInrCompact(bill.total).replace(/^₹/, ""),
    count: bill.lines.length,
    discount: "",
  })}`;
}
