"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileNav } from "@/components/MobileNav";
import { TopBar } from "@/components/TopBar";
import { formatInrCompact } from "@/lib/money";

type Summary = {
  billCount: number;
  totalSales: number;
  upiTotal: number;
  cashTotal: number;
  udhaarTotal: number;
};

type DueRow = {
  id: string;
  name: string;
  phone: string | null;
  balanceDue: number;
  daysPending: number;
};

export default function HisaabPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dues, setDues] = useState<DueRow[]>([]);

  useEffect(() => {
    fetch("/api/ledger/today")
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => {});
    fetch("/api/ledger/dues")
      .then((r) => r.json())
      .then((d) => setDues(d.dues ?? []))
      .catch(() => {});
  }, []);

  const openReminder = async (id: string) => {
    const res = await fetch(`/api/customers/${id}/reminder-link`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <TopBar />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-4">
        <h1 className="text-xl font-bold text-stone-900">Aaj ka hisaab</h1>

        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
              <div className="text-xs text-stone-500">Bills</div>
              <div className="mt-1 text-2xl font-bold">{summary.billCount}</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
              <div className="text-xs text-stone-500">Total Bikri</div>
              <div className="mt-1 text-2xl font-bold text-orange-600">
                {formatInrCompact(summary.totalSales)}
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
              <div className="text-xs text-stone-500">UPI + Cash</div>
              <div className="mt-1 text-sm font-bold">
                {formatInrCompact(summary.upiTotal)} +{" "}
                {formatInrCompact(summary.cashTotal)}
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
              <div className="text-xs text-stone-500">Udhaar</div>
              <div className="mt-1 text-2xl font-bold text-red-600">
                {formatInrCompact(summary.udhaarTotal)}
              </div>
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="text-base font-bold text-stone-900">
            Baaki Hisaab (Dues)
          </h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {dues.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 py-2.5"
              >
                <div>
                  <div className="font-semibold text-stone-900">{d.name}</div>
                  <div className="text-xs text-stone-500">
                    {d.daysPending} days pending
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-red-600 tabular-nums">
                    {formatInrCompact(d.balanceDue)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openReminder(d.id)}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Remind</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}
