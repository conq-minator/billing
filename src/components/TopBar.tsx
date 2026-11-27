"use client";

import Link from "next/link";
import { getDict } from "@/i18n";
import { formatInrCompact } from "@/lib/money";
import { useBillStore } from "@/store/bill";

export function TopBar() {
  const { shop, todayTotal, lang, setLang } = useBillStore();
  const dict = getDict(lang);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white px-3 py-2.5 shadow-xs">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-bold text-stone-900">
            {shop?.name ?? dict.appName}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-600">
          <span>
            {dict.counter.todayTotal}:{" "}
            <strong className="text-stone-900">
              {formatInrCompact(todayTotal)}
            </strong>
          </span>
          <nav className="hidden sm:flex items-center gap-2.5 text-xs font-medium text-stone-600">
            <Link href="/hisaab" className="hover:text-orange-600">
              {dict.nav.hisaab}
            </Link>
            <Link href="/items" className="hover:text-orange-600">
              {dict.nav.items}
            </Link>
            <Link href="/customers" className="hover:text-orange-600">
              {dict.nav.customers}
            </Link>
            <Link href="/bills" className="hover:text-orange-600">
              {dict.nav.bills}
            </Link>
            <Link href="/settings" className="hover:text-orange-600">
              {dict.nav.settings}
            </Link>
          </nav>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-label="Language toggle"
          className="inline-flex rounded-lg border border-stone-200 bg-stone-100 p-0.5"
        >
          <button
            type="button"
            onClick={() => setLang("hi")}
            data-testid="lang-hi"
            className={`min-h-[36px] rounded-md px-2.5 text-xs font-semibold transition ${
              lang === "hi"
                ? "bg-white text-orange-600 shadow-xs"
                : "text-stone-600"
            }`}
          >
            हिं
          </button>
          <button
            type="button"
            onClick={() => setLang("bn")}
            data-testid="lang-bn"
            className={`min-h-[36px] rounded-md px-2.5 text-xs font-semibold transition ${
              lang === "bn"
                ? "bg-white text-orange-600 shadow-xs"
                : "text-stone-600"
            }`}
          >
            বাং
          </button>
        </div>
      </div>
    </header>
  );
}
