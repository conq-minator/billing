"use client";

import { ExternalLink } from "lucide-react";
import { formatInrCompact } from "@/lib/money";
import { useBillStore } from "@/store/bill";

export function QueryResultCard() {
  const { queryResult } = useBillStore();
  if (!queryResult) return null;

  const data = queryResult.data;

  return (
    <div
      data-testid="query-result-card"
      className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xs space-y-2"
    >
      <div className="text-sm font-bold text-stone-900">{queryResult.title}</div>

      {queryResult.type === "today_summary" && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-stone-50 p-2">
            <div className="text-stone-500">Bills</div>
            <div className="text-base font-bold">{String(data.billCount ?? 0)}</div>
          </div>
          <div className="rounded-lg bg-stone-50 p-2">
            <div className="text-stone-500">Total Sales</div>
            <div className="text-base font-bold">
              {formatInrCompact(Number(data.totalSales ?? 0))}
            </div>
          </div>
          <div className="rounded-lg bg-stone-50 p-2">
            <div className="text-stone-500">UPI / Cash</div>
            <div className="font-semibold">
              {formatInrCompact(Number(data.upiTotal ?? 0))} /{" "}
              {formatInrCompact(Number(data.cashTotal ?? 0))}
            </div>
          </div>
          <div className="rounded-lg bg-stone-50 p-2">
            <div className="text-stone-500">Udhaar</div>
            <div className="font-semibold text-red-700">
              {formatInrCompact(Number(data.udhaarTotal ?? 0))}
            </div>
          </div>
        </div>
      )}

      {queryResult.type === "dues_list" && Array.isArray(data.dues) && (
        <ul className="divide-y divide-stone-100 text-xs">
          {(data.dues as Array<{ id: string; name: string; balanceDue: number; daysPending: number }>).map(
            (d) => (
              <li key={d.id} className="flex justify-between py-1.5">
                <span>
                  {d.name} ({d.daysPending}d)
                </span>
                <span className="font-bold text-red-700">
                  {formatInrCompact(d.balanceDue)}
                </span>
              </li>
            )
          )}
        </ul>
      )}

      {typeof data.reminderUrl === "string" && (
        <a
          href={data.reminderUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="whatsapp-reminder-link"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Open WhatsApp Reminder</span>
        </a>
      )}
    </div>
  );
}
