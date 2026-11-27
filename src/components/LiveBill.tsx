"use client";

import { AnimatePresence, motion } from "motion/react";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Bill, BillLine } from "@/engine/types";
import { getDict } from "@/i18n";
import { formatInr, paiseToDecimalString } from "@/lib/money";
import { formatQty } from "@/lib/qty";
import { UnitOptions, type UnitType } from "@/router/intent.schema";
import { useBillStore } from "@/store/bill";

export function LiveBill({
  bill,
  onSelectLine,
}: {
  bill: Bill;
  onSelectLine: (line: BillLine) => void;
}) {
  const { lang, sendCommand, submitTranscript } = useBillStore();
  const dict = getDict(lang);

  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualUnit, setManualUnit] = useState<UnitType>("unit");
  const [manualPrice, setManualPrice] = useState("");

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualName.trim();
    if (!trimmed) return;

    const phrase = `${trimmed} ${manualQty || 1} ${manualUnit} ${
      manualPrice ? `${manualPrice} rupaye` : ""
    }`.trim();

    setShowManualAdd(false);
    setManualName("");
    setManualQty("1");
    setManualPrice("");

    await submitTranscript(phrase);
  };

  const manualAddModal = showManualAdd && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <h3 className="text-base font-bold text-stone-900">
            Add Item Manually by Hand
          </h3>
          <button
            type="button"
            onClick={() => setShowManualAdd(false)}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleManualAddSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700">
              Item Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Amul Milk, Aashirvaad Atta"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-semibold focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-stone-700">
                Quantity
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                required
                value={manualQty}
                onChange={(e) => setManualQty(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-bold focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700">
                Unit
              </label>
              <select
                value={manualUnit}
                onChange={(e) => setManualUnit(e.target.value as UnitType)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-2.5 py-2 text-sm font-semibold focus:border-orange-500 focus:outline-none"
              >
                {UnitOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700">
              Price / Rate in ₹ (optional)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Leave blank to use catalogue rate"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowManualAdd(false)}
              className="flex-1 rounded-xl border border-stone-300 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-orange-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-700"
            >
              Add to Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (bill.lines.length === 0) {
    return (
      <>
        {manualAddModal}
        <div
          data-testid="live-bill-empty"
          className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/70 p-8 text-center"
        >
          <p className="text-base font-medium text-stone-600">
            {dict.counter.emptyBill}
          </p>
          <button
            type="button"
            onClick={() => setShowManualAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item Manually by Hand</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {manualAddModal}
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

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title={`Edit ${line.nameSnapshot}`}
                      aria-label={`Edit ${line.nameSnapshot}`}
                      onClick={() => onSelectLine(line)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      title={`Remove ${line.nameSnapshot}`}
                      aria-label={`Remove ${line.nameSnapshot}`}
                      onClick={() =>
                        sendCommand({ type: "removeLine", lineId: line.id })
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {/* Add item manually button at bottom of list */}
        <div className="p-2 border-t border-stone-100 bg-stone-50/50">
          <button
            type="button"
            onClick={() => setShowManualAdd(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2 text-xs font-semibold text-stone-600 hover:border-orange-400 hover:bg-orange-50/50 hover:text-orange-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Item Manually by Hand</span>
          </button>
        </div>

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
    </>
  );
}
