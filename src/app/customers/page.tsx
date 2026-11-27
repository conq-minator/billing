"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileNav } from "@/components/MobileNav";
import { TopBar } from "@/components/TopBar";
import { formatInrCompact } from "@/lib/money";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  balanceDue: number;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);

  const load = () => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const recordPayment = async (id: string, amountRupees: number) => {
    await fetch(`/api/customers/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountRupees, mode: "cash" }),
    });
    load();
  };

  const openReminder = async (id: string) => {
    const res = await fetch(`/api/customers/${id}/reminder-link`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <TopBar />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-3 p-4">
        <h1 className="text-xl font-bold text-stone-900">Customers</h1>

        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {customers.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div>
                <div className="font-semibold text-stone-900">{c.name}</div>
                <div className="text-xs text-stone-500">
                  {c.phone ?? "No phone"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-red-600 tabular-nums">
                  {formatInrCompact(c.balanceDue)}
                </span>
                {c.balanceDue > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => recordPayment(c.id, 100)}
                      className="min-h-[40px] rounded-xl border border-stone-200 px-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      -₹100
                    </button>
                    <button
                      type="button"
                      onClick={() => openReminder(c.id)}
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Remind</span>
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>
      <MobileNav />
    </div>
  );
}
