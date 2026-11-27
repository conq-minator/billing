"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export function DemoBanner({ reasons }: { reasons: string[] }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || reasons.length === 0) return null;

  return (
    <div
      role="status"
      data-testid="demo-fallback-banner"
      className="flex items-center justify-between gap-2 bg-amber-100 px-3 py-1.5 text-xs text-amber-950 border-b border-amber-300"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
        <span className="truncate">
          Demo fallbacks active: {reasons.join(" · ")}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss banner"
        className="rounded p-0.5 hover:bg-amber-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
