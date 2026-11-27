"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileNav } from "@/components/MobileNav";
import { TopBar } from "@/components/TopBar";
import { formatInr } from "@/lib/money";

type BillRow = {
  id: string;
  billNo: number;
  publicId: string;
  status: string;
  total: number;
  createdAt: string;
};

export default function BillsPage() {
  const [bills, setBills] = useState<BillRow[]>([]);
  const router = useRouter();

  const load = () => {
    fetch("/api/bills")
      .then((r) => r.json())
      .then((d) => setBills(d.bills ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const reopen = async (id: string) => {
    await fetch(`/api/bills/${id}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "reopen" }),
    });
    router.push("/");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <TopBar />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-3 p-4">
        <h1 className="text-xl font-bold text-stone-900">Bills History</h1>

        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {bills.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div>
                <div className="font-semibold text-stone-900">
                  Bill #{String(b.billNo).padStart(4, "0")}{" "}
                  <span className="ml-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] uppercase text-stone-600">
                    {b.status}
                  </span>
                </div>
                <div className="text-xs text-stone-500">
                  {new Date(b.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 tabular-nums">
                  {formatInr(b.total)}
                </span>
                <Link
                  href={`/b/${b.publicId}`}
                  className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700"
                >
                  View
                </Link>
                <a
                  href={`/api/bills/${b.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700"
                >
                  PDF
                </a>
                {b.status !== "open" && (
                  <button
                    type="button"
                    onClick={() => reopen(b.id)}
                    className="rounded-lg bg-orange-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    Reopen
                  </button>
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
