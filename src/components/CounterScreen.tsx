"use client";

import { useEffect, useState } from "react";
import type { BillLine } from "@/engine/types";
import { useBillStore } from "@/store/bill";
import { ActionBar } from "./ActionBar";
import { ClarifyChip } from "./ClarifyChip";
import { LineEditSheet } from "./LineEditSheet";
import { LiveBill } from "./LiveBill";
import { MobileNav } from "./MobileNav";
import { PendingChip } from "./PendingChip";
import { QueryResultCard } from "./QueryResultCard";
import { TopBar } from "./TopBar";
import { TranscriptStrip } from "./TranscriptStrip";
import { UpiQrSheet } from "./UpiQrSheet";

declare global {
  interface Window {
    __injectTranscript?: (text: string) => Promise<void>;
  }
}

export function CounterScreen({
  demoMode,
  micSlot,
}: {
  demoMode: boolean;
  micSlot?: React.ReactNode;
}) {
  const { bill, loading, toast, clearToast, init, submitTranscript } =
    useBillStore();
  const [editingLine, setEditingLine] = useState<BillLine | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [showDebugBox, setShowDebugBox] = useState(demoMode);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("debug") === "1") {
        setShowDebugBox(true);
      }
      if (demoMode && bill) {
        window.__injectTranscript = async (text: string) => {
          await submitTranscript(text);
        };
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        delete window.__injectTranscript;
      }
    };
  }, [demoMode, bill, submitTranscript]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(clearToast, 4000);
    return () => clearTimeout(id);
  }, [toast, clearToast]);

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <TopBar />

      {toast && (
        <div
          role="status"
          data-testid="toast-banner"
          className="mx-auto mt-2 w-full max-w-5xl px-3"
        >
          <div className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white shadow-md">
            {toast}
          </div>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 p-3 lg:grid lg:grid-cols-12 lg:items-start">
        <section className="flex flex-1 flex-col gap-3 lg:col-span-7">
          {loading || !bill ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
              Loading bill...
            </div>
          ) : (
            <LiveBill bill={bill} onSelectLine={setEditingLine} />
          )}
        </section>

        <section className="flex flex-col gap-3 lg:sticky lg:top-16 lg:col-span-5">
          <PendingChip />
          <ClarifyChip />
          <QueryResultCard />
          <TranscriptStrip showDebugBox={showDebugBox} />
          <ActionBar onOpenQr={() => setQrOpen(true)} />
          {micSlot}
        </section>
      </main>

      <LineEditSheet
        line={editingLine}
        onClose={() => setEditingLine(null)}
      />
      <UpiQrSheet open={qrOpen} onClose={() => setQrOpen(false)} />
      <MobileNav />
    </div>
  );
}
