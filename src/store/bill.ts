"use client";

import { create } from "zustand";
import type { Bill, Lang, LedgerCard, Question } from "@/engine/types";
import type { TapCommand } from "@/db/repo/utteranceService";
import { drainUtteranceQueue, enqueueUtterance } from "@/lib/offlineQueue";

export type ShopInfo = {
  id: string;
  name: string;
  address: string;
  phone: string;
  upiVpa: string;
  gstin: string | null;
};

type BillState = {
  bill: Bill | null;
  shop: ShopInfo | null;
  todayTotal: number;
  lang: Lang;
  pendingQuestion: Question | null;
  clarify: { transcript: string; suggestion?: string } | null;
  queryResult: LedgerCard | null;
  readbackText: string | null;
  toast: string | null;
  partialTranscript: string;
  finalTranscript: string;
  micState: "idle" | "listening" | "processing";
  handsFree: boolean;
  clientSeq: number;
  isOffline: boolean;
  loading: boolean;
  onReadback?: (text: string, lang: Lang) => void;

  init: () => Promise<void>;
  setLang: (lang: Lang) => void;
  setHandsFree: (v: boolean) => void;
  setMicState: (s: "idle" | "listening" | "processing") => void;
  setPartialTranscript: (t: string) => void;
  setOnReadback: (fn: ((text: string, lang: Lang) => void) | undefined) => void;
  clearToast: () => void;
  clearClarify: () => void;
  submitTranscript: (text: string) => Promise<void>;
  replayOfflineQueue: () => Promise<void>;
  sendCommand: (cmd: TapCommand) => Promise<void>;
  newBill: () => Promise<void>;
};

export const useBillStore = create<BillState>((set, get) => ({
  bill: null,
  shop: null,
  todayTotal: 0,
  lang: "hi",
  pendingQuestion: null,
  clarify: null,
  queryResult: null,
  readbackText: null,
  toast: null,
  partialTranscript: "",
  finalTranscript: "",
  micState: "idle",
  handsFree: false,
  clientSeq: 0,
  isOffline: false,
  loading: true,
  onReadback: undefined,

  init: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/bills?mode=active", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load active bill");
      const data = await res.json();
      set({
        bill: data.bill,
        shop: data.shop,
        todayTotal: data.todayTotal ?? 0,
        clientSeq: data.bill?.clientSeq ?? 0,
        loading: false,
      });
    } catch {
      set({ loading: false, toast: "Failed to load bill" });
    }
  },

  setLang: (lang) => set({ lang }),
  setHandsFree: (handsFree) => set({ handsFree }),
  setMicState: (micState) => set({ micState }),
  setPartialTranscript: (partialTranscript) => set({ partialTranscript }),
  setOnReadback: (onReadback) => set({ onReadback }),
  clearToast: () => set({ toast: null }),
  clearClarify: () => set({ clarify: null }),

  submitTranscript: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const { bill, lang, clientSeq, onReadback } = get();
    if (!bill) return;

    const nextSeq = clientSeq + 1;
    set({
      micState: "processing",
      partialTranscript: "",
      finalTranscript: trimmed,
      clarify: null,
      clientSeq: nextSeq,
    });

    try {
      const res = await fetch("/api/utterance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: bill.id,
          transcript: trimmed,
          lang,
          clientSeq: nextSeq,
        }),
      });
      if (!res.ok) throw new Error("Utterance failed");
      const data = await res.json();

      set({
        bill: data.bill,
        todayTotal: data.todayTotal ?? get().todayTotal,
        pendingQuestion: data.question ?? null,
        clarify: data.clarify ?? null,
        queryResult: data.queryResult ?? null,
        readbackText: data.readback?.text ?? null,
        toast: data.toast ?? null,
        micState: "idle",
        isOffline: false,
      });

      if (data.readback?.text && onReadback) {
        onReadback(data.readback.text, data.readback.lang ?? lang);
      }
    } catch {
      await enqueueUtterance({
        id: `${bill.id}:${nextSeq}`,
        billId: bill.id,
        transcript: trimmed,
        lang,
        clientSeq: nextSeq,
        createdAt: Date.now(),
      }).catch(() => {});
      set({
        micState: "idle",
        isOffline: true,
        toast: lang === "bn" ? "Offline — queue kora holo" : "Connecting... queued",
      });
    }
  },

  replayOfflineQueue: async () => {
    await drainUtteranceQueue(async (item) => {
      try {
        const res = await fetch("/api/utterance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billId: item.billId,
            transcript: item.transcript,
            lang: item.lang,
            clientSeq: item.clientSeq,
          }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        set({ bill: data.bill, todayTotal: data.todayTotal ?? get().todayTotal, isOffline: false });
        return true;
      } catch {
        return false;
      }
    });
  },

  sendCommand: async (cmd: TapCommand) => {
    const { bill, lang, onReadback } = get();
    if (!bill) return;

    try {
      const res = await fetch(`/api/bills/${bill.id}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cmd, lang }),
      });
      if (!res.ok) throw new Error("Command failed");
      const data = await res.json();

      set({
        bill: data.bill,
        todayTotal: data.todayTotal ?? get().todayTotal,
        pendingQuestion: data.question ?? null,
        readbackText: data.readback?.text ?? null,
        toast: data.toast ?? null,
      });

      if (data.readback?.text && onReadback) {
        onReadback(data.readback.text, data.readback.lang ?? lang);
      }
    } catch {
      set({
        toast: lang === "bn" ? "Abar cheshta korun" : "Dobara try karein",
      });
    }
  },

  newBill: async () => {
    try {
      const res = await fetch("/api/bills", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create bill");
      const data = await res.json();
      set({
        bill: data.bill,
        pendingQuestion: null,
        clarify: null,
        readbackText: null,
        finalTranscript: "",
        partialTranscript: "",
        clientSeq: 0,
      });
    } catch {
      set({ toast: "Could not start new bill" });
    }
  },
}));
