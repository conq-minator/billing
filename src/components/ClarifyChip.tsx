"use client";

import { AlertCircle, X } from "lucide-react";
import { getDict } from "@/i18n";
import { useBillStore } from "@/store/bill";

export function ClarifyChip() {
  const { clarify, lang, clearClarify } = useBillStore();
  const dict = getDict(lang);

  if (!clarify) return null;

  return (
    <div
      data-testid="clarify-chip"
      className="flex items-center justify-between gap-2 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-900"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{dict.readback.clarify}</span>
        </div>
        {clarify.transcript && (
          <p className="mt-0.5 truncate text-xs text-red-700">
            &ldquo;{clarify.transcript}&rdquo;
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={clearClarify}
        aria-label="Dismiss"
        className="rounded-lg p-1.5 hover:bg-red-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
