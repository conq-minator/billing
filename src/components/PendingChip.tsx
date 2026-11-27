"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { getDict } from "@/i18n";
import { useBillStore } from "@/store/bill";

export function PendingChip() {
  const { pendingQuestion, lang, sendCommand, submitTranscript } = useBillStore();
  const dict = getDict(lang);
  const [priceInput, setPriceInput] = useState("");

  if (!pendingQuestion) return null;

  const handlePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(priceInput);
    if (!pendingQuestion.lineId || Number.isNaN(val) || val < 0) return;
    await sendCommand({
      type: "answerPrice",
      lineId: pendingQuestion.lineId,
      rate: val,
    });
    setPriceInput("");
  };

  return (
    <div
      data-testid="pending-chip"
      className="rounded-2xl border border-amber-300 bg-amber-50 p-3 shadow-xs"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
        <HelpCircle className="h-4 w-4 shrink-0 text-amber-700" />
        <span>{pendingQuestion.text}</span>
      </div>

      {pendingQuestion.kind === "price" && (
        <form onSubmit={handlePriceSubmit} className="mt-2 flex gap-2">
          <input
            type="number"
            step="any"
            min="0"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder={`₹ / ${pendingQuestion.unit ?? "unit"}`}
            data-testid="pending-price-input"
            className="min-h-[44px] flex-1 rounded-xl border border-amber-300 bg-white px-3 text-base font-semibold"
          />
          <button
            type="submit"
            data-testid="pending-price-submit"
            className="min-h-[44px] rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"
          >
            {dict.counter.save}
          </button>
        </form>
      )}

      {pendingQuestion.kind === "discount_scope" && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => submitTranscript("poore bill pe")}
            data-testid="pending-scope-whole"
            className="min-h-[44px] flex-1 rounded-xl bg-amber-600 px-3 text-sm font-semibold text-white hover:bg-amber-700"
          >
            {dict.readback.scopeWhole}
          </button>
          <button
            type="button"
            onClick={() => submitTranscript("kisi item pe")}
            data-testid="pending-scope-items"
            className="min-h-[44px] flex-1 rounded-xl border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-950 hover:bg-amber-100"
          >
            {dict.readback.scopeItems}
          </button>
        </div>
      )}
    </div>
  );
}
