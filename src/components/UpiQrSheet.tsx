"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { buildUpiUri, generateQrSvg } from "@/bill/upi";
import { getDict } from "@/i18n";
import { formatInr } from "@/lib/money";
import { useBillStore } from "@/store/bill";

export function UpiQrSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { bill, shop, lang, submitTranscript } = useBillStore();
  const dict = getDict(lang);
  const [svg, setSvg] = useState("");

  useEffect(() => {
    if (!open || !bill || !shop) return;
    const uri = buildUpiUri({
      vpa: shop.upiVpa,
      name: shop.name,
      amountPaise: bill.total,
      billNo: bill.billNo,
    });
    generateQrSvg(uri).then(setSvg).catch(() => setSvg(""));
  }, [open, bill, shop]);

  if (!bill || !shop) return null;

  const handleReceived = async () => {
    await submitTranscript("UPI");
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          data-testid="upi-qr-sheet"
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl bg-white p-6 text-center shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold text-stone-900">
              {shop.name}
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-1 text-3xl font-extrabold text-orange-600 tabular-nums">
            {formatInr(bill.total)}
          </p>
          <p className="text-xs text-stone-500">
            Bill #{String(bill.billNo).padStart(4, "0")} · {shop.upiVpa}
          </p>

          <div
            className="mx-auto my-4 flex h-60 w-60 items-center justify-center rounded-2xl border border-stone-200 bg-white p-3"
            dangerouslySetInnerHTML={{ __html: svg }}
          />

          <button
            type="button"
            onClick={handleReceived}
            data-testid="upi-received-btn"
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-base font-bold text-white hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>{dict.counter.received}</span>
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
