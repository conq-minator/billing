"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import type { BillLine } from "@/engine/types";
import { getDict } from "@/i18n";
import { paiseToRupees } from "@/lib/money";
import { Unit, type UnitType } from "@/router/intent.schema";
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

  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<UnitType>("unit");
  const [rate, setRate] = useState("");
  const [oneTime, setOneTime] = useState(false);

  useEffect(() => {
    if (line) {
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

  return (
    <Dialog.Root open={!!line} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-2xl bg-white p-5 shadow-xl">
          <Dialog.Title className="text-lg font-bold text-stone-900">
            {line.nameSnapshot}
          </Dialog.Title>

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600">
                  Qty
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  data-testid="edit-qty-input"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-base font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitType)}
                  data-testid="edit-unit-select"
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base font-semibold"
                >
                  {Unit.options.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600">
                Rate (₹ / {unit})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                data-testid="edit-rate-input"
                placeholder="₹"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-base font-semibold"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-stone-700 min-h-[44px]">
              <input
                type="checkbox"
                checked={oneTime}
                onChange={(e) => setOneTime(e.target.checked)}
                data-testid="edit-onetime-checkbox"
                className="h-5 w-5 rounded border-stone-300 accent-orange-600"
              />
              <span>{dict.counter.onlyThisBill}</span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleRemove}
                data-testid="edit-remove-btn"
                className="min-h-[48px] rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700"
              >
                {dict.counter.remove}
              </button>
              <button
                type="submit"
                data-testid="edit-save-btn"
                className="min-h-[48px] flex-1 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700"
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
