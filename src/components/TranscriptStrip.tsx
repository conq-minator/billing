"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { getDict } from "@/i18n";
import { useBillStore } from "@/store/bill";

export function TranscriptStrip({ showDebugBox }: { showDebugBox: boolean }) {
  const {
    partialTranscript,
    finalTranscript,
    readbackText,
    micState,
    lang,
    submitTranscript,
  } = useBillStore();
  const dict = getDict(lang);
  const [text, setText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const toSend = text;
    setText("");
    await submitTranscript(toSend);
  };

  return (
    <div className="space-y-2">
      {(partialTranscript || finalTranscript || readbackText) && (
        <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs">
          {partialTranscript && (
            <p className="italic text-stone-500">{partialTranscript}</p>
          )}
          {!partialTranscript && finalTranscript && (
            <p className="text-stone-700">
              <span className="font-semibold text-stone-500">You: </span>
              {finalTranscript}
            </p>
          )}
          {readbackText && (
            <p
              data-testid="readback-text"
              className="mt-1 font-semibold text-orange-700"
            >
              {readbackText}
            </p>
          )}
        </div>
      )}

      {showDebugBox && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={dict.counter.debugPlaceholder}
            disabled={micState === "processing"}
            data-testid="debug-transcript-input"
            className="min-h-[48px] flex-1 rounded-xl border border-stone-300 bg-white px-3.5 text-sm shadow-xs focus:border-orange-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={micState === "processing" || !text.trim()}
            data-testid="debug-transcript-send"
            className="flex min-h-[48px] min-w-[48px] items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{dict.counter.send}</span>
          </button>
        </form>
      )}
    </div>
  );
}
