"use client";

import { AnimatePresence, motion } from "motion/react";
import { Trash2 } from "lucide-react";
import type { Bill, BillLine } from "@/engine/types";
import { getDict } from "@/i18n";
import { formatInr, paiseToDecimalString } from "@/lib/money";
import { formatQty } from "@/lib/qty";
import { useBillStore } from "@/store/bill";

export function LiveBill({
  bill,
  onSelectLine,
}: {
  bill: Bill;
  onSelectLine: (line: BillLine) => void;
}) {
  const { lang, sendCommand } = useBillStore();
  const dict = getDict(lang);

  if (bill.lines.length === 0) {
    return (
      <div
        data-testid="live-bill-empty"
        className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/70 p-8 text-center"
      >
        <p className="text-base font-medium text-stone-600">
          {dict.counter.emptyBill}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="live-bill"
      className="flex flex-col rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-4 py-2 text-xs text-stone-500">
        <span>
          Bill #{String(bill.billNo).padStart(4, "0")} ·{" "}
          {bill.customerName ?? dict.counter.walkIn}
        </span>
        <span className="uppercase font-semibold tracking-wider">
          {bill.status}
        </span>
      </div>

      <ul className="divide-y divide-stone-100">
        <AnimatePresence initial={false}>
          {bill.lines.map((line) => {
            const isPriceNeeded = line.flags.includes("price_needed");
            const isAuto = line.flags.includes("auto");
            const isNew = line.flags.includes("new_item");
            const isOneTime = line.flags.includes("one_time");

            return (
              <motion.li
                key={line.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.18 }}
                data-testid={`bill-line-${line.lineNo}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-stone-50"
              >
                <button
                  type="button"
                  onClick={() => onSelectLine(line)}
                  className="flex flex-1 items-center justify-between gap-2 text-left min-h-[48px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-stone-900">
                        {line.nameSnapshot}
                      </span>
                      {isAuto && (
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                          {dict.badges.auto}
                        </span>
                      )}
                      {isNew && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                          {dict.badges.new_item}
                        </span>
                      )}
                      {isOneTime && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          {dict.badges.one_time}
                        </span>
                      )}
                      {isPriceNeeded && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                          {dict.badges.price_needed}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-500">
                      {formatQty(line.qty)} {line.unit} ×{" "}
                      {line.rate !== null
                        ? `₹${paiseToDecimalString(line.rate)}/${line.unit}`
                        : "—"}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-base font-bold tabular-nums ${
                        isPriceNeeded ? "text-red-600" : "text-stone-900"
                      }`}
                    >
                      {isPriceNeeded ? "—" : formatInr(line.amount)}
                    </div>
                    {line.lineDiscountAmount > 0 && (
                      <div className="text-xs text-emerald-700 tabular-nums">
                        −{formatInr(line.lineDiscountAmount)}
                      </div>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  aria-label={`Remove ${line.nameSnapshot}`}
                  onClick={() =>
                    sendCommand({ type: "removeLine", lineId: line.id })
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <div className="border-t border-stone-200 bg-stone-50 px-4 py-3 space-y-1 text-sm">
        <div className="flex justify-between text-stone-600">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatInr(bill.subtotal)}</span>
        </div>
        {bill.billDiscountAmount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Discount</span>
            <span className="tabular-nums">
              −{formatInr(bill.billDiscountAmount)}
            </span>
          </div>
        )}
        {bill.roundOff !== 0 && (
          <div className="flex justify-between text-stone-500 text-xs">
            <span>Round off</span>
            <span className="tabular-nums">
              {bill.roundOff > 0 ? "+" : ""}
              {paiseToDecimalString(bill.roundOff)}
            </span>
          </div>
        )}
        <div className="flex justify-between pt-1 border-t border-stone-200 text-lg font-bold text-stone-900">
          <span>TOTAL</span>
          <span data-testid="bill-total" className="tabular-nums">
            {formatInr(bill.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
