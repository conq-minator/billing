"use client";

import { Mic, MicOff, Radio } from "lucide-react";
import { useEffect, useRef } from "react";
import { getDict } from "@/i18n";
import { useBillStore } from "@/store/bill";
import { ReplaySttAdapter } from "@/voice/adapters/replay";
import { RecorderSttAdapter } from "@/voice/adapters/recorder";
import type { SttAdapter } from "@/voice/adapters/types";
import { WebSpeechSttAdapter } from "@/voice/adapters/webspeech";
import { prewarmTts, speakReadback } from "@/voice/tts";

export function MicButton({
  sttProvider,
  ttsProvider,
}: {
  sttProvider: "groq" | "sarvam" | "webspeech" | "replay";
  ttsProvider: "sarvam" | "browser";
}) {
  const {
    lang,
    micState,
    handsFree,
    setHandsFree,
    setMicState,
    setPartialTranscript,
    setOnReadback,
    submitTranscript,
  } = useBillStore();
  const dict = getDict(lang);

  const adapterRef = useRef<SttAdapter | null>(null);

  useEffect(() => {
    setOnReadback((text, rLang) => {
      void speakReadback(text, rLang, ttsProvider);
    });
    prewarmTts(ttsProvider);
    return () => setOnReadback(undefined);
  }, [setOnReadback, ttsProvider]);

  function getAdapter(): SttAdapter {
    if (sttProvider === "groq" || sttProvider === "sarvam") {
      const rec = new RecorderSttAdapter(sttProvider);
      if (rec.isSupported()) return rec;
    }
    if (sttProvider === "webspeech") {
      const ws = new WebSpeechSttAdapter();
      if (ws.isSupported()) return ws;
    }
    return new ReplaySttAdapter();
  }

  const startListening = async () => {
    if (micState !== "idle") return;
    const adapter = getAdapter();
    adapterRef.current = adapter;
    setMicState("listening");

    await adapter.start(lang, {
      onPartial: (t) => setPartialTranscript(t),
      onFinal: async (t) => {
        setMicState("idle");
        await submitTranscript(t);
      },
      onError: () => {
        setMicState("idle");
      },
    });
  };

  const stopListening = async () => {
    if (micState !== "listening") return;
    await adapterRef.current?.stop();
    setMicState("idle");
  };

  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      <button
        type="button"
        onPointerDown={handsFree ? undefined : startListening}
        onPointerUp={handsFree ? undefined : stopListening}
        onClick={
          handsFree
            ? () =>
                micState === "listening" ? stopListening() : startListening()
            : undefined
        }
        data-testid="mic-button"
        className={`flex h-24 w-24 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${
          micState === "listening"
            ? "bg-red-600 text-white ring-4 ring-red-200 animate-pulse"
            : micState === "processing"
              ? "bg-amber-500 text-white"
              : "bg-orange-600 text-white hover:bg-orange-700"
        }`}
        aria-label={dict.counter.holdToTalk}
      >
        {micState === "listening" ? (
          <MicOff className="h-10 w-10" />
        ) : (
          <Mic className="h-10 w-10" />
        )}
      </button>

      <div className="flex items-center gap-3 text-xs text-stone-600">
        <span>
          {micState === "listening"
            ? dict.counter.listening
            : handsFree
              ? dict.counter.tapToSpeak
              : dict.counter.holdToTalk}
        </span>
        <button
          type="button"
          onClick={() => setHandsFree(!handsFree)}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            handsFree
              ? "border-orange-300 bg-orange-50 text-orange-700"
              : "border-stone-200 bg-white text-stone-600"
          }`}
        >
          <Radio className="h-3 w-3" />
          <span>{handsFree ? dict.counter.handsFreeOn : "Hands-free"}</span>
        </button>
      </div>
    </div>
  );
}
