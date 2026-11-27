"use client";

import { CheckCircle2, FilePlus2, Printer, QrCode, Share2 } from "lucide-react";
import { getDict } from "@/i18n";
import { buildWhatsAppBillMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { useBillStore } from "@/store/bill";

export function ActionBar({
  onOpenQr,
}: {
  onOpenQr?: () => void;
}) {
  const { bill, shop, lang, sendCommand, newBill } = useBillStore();
  const dict = getDict(lang);

  const hasLines = (bill?.lines.length ?? 0) > 0;

  const handleWhatsApp = () => {
    if (!bill || !shop) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const publicUrl = `${origin}/b/${bill.publicId}`;
    const text = buildWhatsAppBillMessage({
      shopName: shop.name,
      billNo: bill.billNo,
      totalPaise: bill.total,
      publicUrl,
    });
    window.open(buildWhatsAppUrl({ text }), "_blank");
  };

  return (
    <div className="grid grid-cols-5 gap-1.5">
      <button
        type="button"
        disabled={!hasLines}
        onClick={() => sendCommand({ type: "finish" })}
        data-testid="action-done"
        className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl bg-orange-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-40"
      >
        <CheckCircle2 className="h-4 w-4" />
        <span>{dict.counter.done}</span>
      </button>

      <button
        type="button"
        disabled={!hasLines}
        onClick={onOpenQr}
        data-testid="action-upi"
        className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-40"
      >
        <QrCode className="h-4 w-4" />
        <span>{dict.counter.upiQr}</span>
      </button>

      <button
        type="button"
        disabled={!hasLines}
        onClick={handleWhatsApp}
        data-testid="action-whatsapp"
        className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-40"
      >
        <Share2 className="h-4 w-4" />
        <span className="truncate max-w-full">{dict.counter.whatsapp}</span>
      </button>

      <button
        type="button"
        disabled={!hasLines || !bill}
        onClick={() => {
          if (bill) window.open(`/print/${bill.id}`, "_blank");
        }}
        data-testid="action-print"
        className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-40"
      >
        <Printer className="h-4 w-4" />
        <span>{dict.counter.print}</span>
      </button>

      <button
        type="button"
        onClick={() => newBill()}
        data-testid="action-new-bill"
        className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50"
      >
        <FilePlus2 className="h-4 w-4" />
        <span className="truncate max-w-full">{dict.counter.newBill}</span>
      </button>
    </div>
  );
}
