"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/MobileNav";
import { TopBar } from "@/components/TopBar";
import { formatInrCompact, paiseToRupees } from "@/lib/money";

type ItemRow = {
  id: string;
  name: string;
  aliases: string[];
  defaultUnit: string;
  pricePerUnit: number | null;
};

export default function ItemsPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rateInput, setRateInput] = useState("");

  const load = () => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter(
    (it) =>
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()))
  );

  const saveRate = async (id: string) => {
    const val = Number(rateInput);
    if (Number.isNaN(val) || val < 0) return;
    await fetch("/api/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, priceRupees: val }),
    });
    setEditingId(null);
    load();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <TopBar />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-stone-900">
            Items ({items.length})
          </h1>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search item or alias..."
          className="min-h-[48px] w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm"
        />

        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {filtered.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-2 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="font-semibold text-stone-900">{it.name}</div>
                <div className="truncate text-xs text-stone-500">
                  {it.aliases.slice(0, 4).join(", ")}
                </div>
              </div>

              {editingId === it.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    className="w-20 rounded-lg border border-stone-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => saveRate(it.id)}
                    className="rounded-lg bg-orange-600 px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(it.id);
                    setRateInput(
                      it.pricePerUnit !== null
                        ? String(paiseToRupees(it.pricePerUnit))
                        : ""
                    );
                  }}
                  className="min-h-[40px] rounded-lg bg-stone-100 px-3 text-sm font-bold text-stone-900"
                >
                  {it.pricePerUnit !== null
                    ? `${formatInrCompact(it.pricePerUnit)}/${it.defaultUnit}`
                    : "—"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </main>
      <MobileNav />
    </div>
  );
}
