"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { BillLine } from "@/engine/types";
import { getDict } from "@/i18n";
import { paiseToRupees } from "@/lib/money";
import { UnitOptions, type UnitType } from "@/router/intent.schema";
import { useBillStore } from "@/store/bill";

export function LineEditSheet({
  line,
  onClose,
}: {
  line: BillLine | null;
  onClose: () => void;
}) {
  const { lang, sendCommand } = useBillStore();
  const dict = getDict(lang);

  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<UnitType>("unit");
  const [rate, setRate] = useState("");
  const [oneTime, setOneTime] = useState(false);

  useEffect(() => {
    if (line) {
      setName(line.nameSnapshot);
      setQty(String(line.qty));
      setUnit(line.unit);
      setRate(line.rate !== null ? String(paiseToRupees(line.rate)) : "");
      setOneTime(line.flags.includes("one_time"));
    }
  }, [line]);

  if (!line) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = Number(qty);
    const parsedRate = rate.trim() === "" ? null : Number(rate);

    await sendCommand({
      type: "editLine",
      lineId: line.id,
      name: name.trim() || line.nameSnapshot,
      qty: parsedQty > 0 ? parsedQty : line.qty,
      unit,
      rate:
        parsedRate !== null && !Number.isNaN(parsedRate) && parsedRate >= 0
          ? parsedRate
          : undefined,
      oneTime,
    });
    onClose();
  };

  const handleRemove = async () => {
    await sendCommand({ type: "removeLine", lineId: line.id });
    onClose();
  };

  const stepQty = (delta: number) => {
    const cur = Number(qty) || 1;
    const next = Math.max(1, cur + delta);
    setQty(String(next));
  };

  const lineTotalPreview = (Number(qty || 0) * Number(rate || 0)).toFixed(2);

  return (
    <Dialog.Root open={!!line} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <Dialog.Title className="text-lg font-bold text-stone-900">
              Edit Item Details
            </Dialog.Title>
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{dict.counter.remove}</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            {/* Item Name Input */}
            <div>
              <label className="block text-xs font-semibold text-stone-700">
                Item Name (Spelling / Label)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amul Milk, Aashirvaad Atta"
                required
                className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-base font-semibold text-stone-900 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Qty & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Quantity
                </label>
                <div className="mt-1 flex items-center rounded-xl border border-stone-300 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => stepQty(-1)}
                    className="flex h-11 w-10 items-center justify-center bg-stone-100 text-stone-700 hover:bg-stone-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    data-testid="edit-qty-input"
                    className="h-11 w-full text-center text-base font-bold text-stone-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => stepQty(1)}
                    className="flex h-11 w-10 items-center justify-center bg-stone-100 text-stone-700 hover:bg-stone-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitType)}
                  data-testid="edit-unit-select"
                  className="mt-1 h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-900 focus:border-orange-500 focus:outline-none"
                >
                  {UnitOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rate & Total Preview */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Rate (₹ / {unit})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  data-testid="edit-rate-input"
                  placeholder="₹ rate"
                  className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3 text-base font-semibold text-stone-900 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Item Total Preview
                </label>
                <div className="mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-stone-100 px-3 text-base font-bold text-stone-900">
                  ₹{lineTotalPreview}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 text-xs text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={oneTime}
                onChange={(e) => setOneTime(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
              />
              <span>{dict.counter.onlyThisBill} (don&apos;t learn price for future)</span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                {dict.counter.cancel}
              </button>
              <button
                type="submit"
                data-testid="edit-save-button"
                className="flex-1 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-orange-700"
              >
                {dict.counter.save}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
