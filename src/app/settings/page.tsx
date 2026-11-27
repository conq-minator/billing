"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/MobileNav";
import { TopBar } from "@/components/TopBar";

type DebugStats = {
  p50: number;
  p95: number;
  fastHitRate: number;
  count: number;
};

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [upiVpa, setUpiVpa] = useState("");
  const [learnedScope, setLearnedScope] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<DebugStats | null>(null);

  const load = () => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.shop) {
          setName(d.shop.name ?? "");
          setUpiVpa(d.shop.upiVpa ?? "");
        }
        setLearnedScope(d.preferences?.discountScopeLearned ?? null);
      })
      .catch(() => {});

    fetch("/api/debug/events")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.stats) setStats(d.stats);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const saveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, upiVpa }),
    });
    setMsg("Settings saved.");
  };

  const resetDiscountPref = async () => {
    await fetch("/api/settings/discount-pref/reset", { method: "POST" });
    setMsg("Discount preference reset.");
    load();
  };

  const resetDemo = async (profile: "fresh" | "trained") => {
    await fetch("/api/demo/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    setMsg(`Demo data reset (${profile} profile).`);
    load();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <TopBar />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-4">
        <h1 className="text-xl font-bold text-stone-900">Settings</h1>

        {msg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-900">
            {msg}
          </div>
        )}

        <form
          onSubmit={saveShop}
          className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4"
        >
          <h2 className="font-bold text-stone-900">Shop Details</h2>
          <div>
            <label className="block text-xs font-medium text-stone-600">
              Shop Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600">
              UPI VPA
            </label>
            <input
              type="text"
              value={upiVpa}
              onChange={(e) => setUpiVpa(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 px-3 text-sm"
            />
          </div>
          <button
            type="submit"
            className="min-h-[44px] rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white"
          >
            Save Shop
          </button>
        </form>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
          <h2 className="font-bold text-stone-900">Discount Preference</h2>
          <p className="text-sm text-stone-600">
            Current:{" "}
            <strong>
              {learnedScope ? `${learnedScope} (learned)` : "Not learned yet"}
            </strong>
          </p>
          <button
            type="button"
            onClick={resetDiscountPref}
            className="min-h-[40px] rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-700"
          >
            Reset Discount Preference
          </button>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <h2 className="font-bold text-amber-950">Demo Controls</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => resetDemo("fresh")}
              className="min-h-[44px] rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white"
            >
              Reset Demo (Fresh)
            </button>
            <button
              type="button"
              onClick={() => resetDemo("trained")}
              className="min-h-[44px] rounded-xl border border-amber-400 bg-white px-4 text-sm font-semibold text-amber-950"
            >
              Reset Demo (Trained)
            </button>
          </div>
          {stats && (
            <div className="text-xs text-amber-900 pt-1">
              Voice events: {stats.count} · p50: {stats.p50} ms · p95:{" "}
              {stats.p95} ms · Fast-path: {stats.fastHitRate}%
            </div>
          )}
        </section>
      </main>
      <MobileNav />
    </div>
  );
}
