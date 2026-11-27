"use client";

import { Mic, MicOff, Radio, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getDict } from "@/i18n";
import { useBillStore } from "@/store/bill";
import { ReplaySttAdapter } from "@/voice/adapters/replay";
import { RecorderSttAdapter } from "@/voice/adapters/recorder";
import type { SttAdapter } from "@/voice/adapters/types";
import { WebSpeechSttAdapter } from "@/voice/adapters/webspeech";
import { prewarmTts, speakReadback } from "@/voice/tts";

export function MicButton({
  sttProvider: defaultSttProvider,
  ttsProvider,
}: {
  sttProvider: "gemini" | "groq" | "webspeech" | "replay";
  ttsProvider: "gemini" | "browser";
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

  const [activeProvider, setActiveProvider] = useState<
    "gemini" | "groq" | "webspeech" | "replay"
  >(defaultSttProvider);
  const [webSpeechSupported, setWebSpeechSupported] = useState(false);

  const adapterRef = useRef<SttAdapter | null>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const wasListeningOnDownRef = useRef<boolean>(false);

  useEffect(() => {
    setActiveProvider(defaultSttProvider);
  }, [defaultSttProvider]);

  useEffect(() => {
    const ws = new WebSpeechSttAdapter();
    setWebSpeechSupported(ws.isSupported());
  }, []);

  useEffect(() => {
    setOnReadback((text, rLang) => {
      void speakReadback(text, rLang, ttsProvider);
    });
    prewarmTts(ttsProvider);
    return () => setOnReadback(undefined);
  }, [setOnReadback, ttsProvider]);

  function getAdapter(provider: "gemini" | "groq" | "webspeech" | "replay"): SttAdapter {
    if (provider === "gemini" || provider === "groq") {
      const rec = new RecorderSttAdapter(provider);
      if (rec.isSupported()) return rec;
      // If server recorder unsupported (e.g. insecure origin), try WebSpeech
      const ws = new WebSpeechSttAdapter();
      if (ws.isSupported()) return ws;
    }
    if (provider === "webspeech") {
      const ws = new WebSpeechSttAdapter();
      if (ws.isSupported()) return ws;
    }
    return new ReplaySttAdapter();
  }

  const startListening = async () => {
    if (micState !== "idle") return;
    const adapter = getAdapter(activeProvider);
    adapterRef.current = adapter;
    setMicState("listening");

    try {
      await adapter.start(lang, {
        onPartial: (t) => setPartialTranscript(t),
        onFinal: async (t) => {
          setMicState("idle");
          await submitTranscript(t);
        },
        onError: (err) => {
          setMicState("idle");
          const msg = String(err || "");
          if (msg.includes("empty_transcript") || msg.includes("empty_recording")) {
            useBillStore.setState({
              toast:
                lang === "bn"
                  ? "Kono kotha shona jaayni. Mic chepe aashirvaad atta ba items bolun."
                  : "No speech recognized. Tap the mic, speak your items clearly, and tap again.",
            });
          } else if (
            msg.includes("permission") ||
            msg.includes("NotAllowed") ||
            msg.includes("denied")
          ) {
            useBillStore.setState({
              toast: "Microphone permission denied. Click the lock/settings icon in your browser address bar to allow mic access.",
            });
          } else if (
            msg.includes("not supported") ||
            msg.includes("insecure")
          ) {
            useBillStore.setState({
              toast: "Audio recording requires HTTPS or localhost. If on mobile, open via localhost or use the text box below.",
            });
          } else {
            useBillStore.setState({ toast: `Voice error: ${msg}` });
          }
        },
      });
    } catch (e) {
      setMicState("idle");
      useBillStore.setState({
        toast: e instanceof Error ? e.message : "Failed to start microphone",
      });
    }
  };

  const stopListening = async () => {
    if (micState !== "listening") return;
    try {
      await adapterRef.current?.stop();
    } catch {
      // Ignore stop errors
    } finally {
      setMicState("idle");
    }
  };

  const handlePointerDown = () => {
    pointerDownTimeRef.current = Date.now();
    wasListeningOnDownRef.current = micState === "listening";

    if (handsFree) {
      return;
    }

    if (micState === "idle") {
      isHoldingRef.current = true;
      void startListening();
    }
  };

  const handlePointerUp = () => {
    if (handsFree) {
      return;
    }

    const duration = Date.now() - pointerDownTimeRef.current;
    if (duration > 400 && isHoldingRef.current && micState === "listening") {
      // User held the button down and now released -> stop listening (Hold-to-talk)
      isHoldingRef.current = false;
      void stopListening();
    } else {
      // Short tap: leave it listening so user can speak and tap again to stop!
      isHoldingRef.current = false;
    }
  };

  const handleClick = () => {
    if (handsFree) {
      if (micState === "listening") {
        void stopListening();
      } else if (micState === "idle") {
        void startListening();
      }
      return;
    }

    // If user tapped quickly (click):
    // If they were already listening when they pressed down, stop listening now!
    if (wasListeningOnDownRef.current && micState === "listening") {
      void stopListening();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      {/* Mic Trigger */}
      <div className="relative">
        {micState === "listening" && (
          <span className="absolute -inset-3 rounded-full bg-red-400 opacity-40 animate-ping" />
        )}

        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
          data-testid="mic-button"
          className={`relative flex h-24 w-24 items-center justify-center rounded-full shadow-lg transition select-none active:scale-95 ${
            micState === "listening"
              ? "bg-red-600 text-white ring-4 ring-red-300 animate-pulse"
              : micState === "processing"
                ? "bg-amber-500 text-white animate-spin"
                : "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-500/20"
          }`}
          aria-label={dict.counter.holdToTalk}
        >
          {micState === "listening" ? (
            <MicOff className="h-10 w-10" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </button>
      </div>

      {/* Status label */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="text-xs font-medium text-stone-700">
          {micState === "listening" ? (
            <span className="text-red-600 font-semibold flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-600 animate-ping" />
              Listening... Speak items (Tap again to finish)
            </span>
          ) : micState === "processing" ? (
            <span className="text-amber-600 font-semibold">
              Processing speech with Gemini...
            </span>
          ) : (
            <span>Tap or hold to speak items</span>
          )}
        </span>

        {/* Controls row */}
        <div className="flex items-center gap-2">
          {/* Hands-free toggle */}
          <button
            type="button"
            onClick={() => setHandsFree(!handsFree)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              handsFree
                ? "border-orange-300 bg-orange-50 text-orange-700"
                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            <Radio className="h-3 w-3" />
            <span>{handsFree ? "Tap-to-talk ON" : "Hold or Tap"}</span>
          </button>

          {/* STT Engine toggle if Web Speech is available */}
          {webSpeechSupported && (
            <button
              type="button"
              onClick={() =>
                setActiveProvider((p) =>
                  p === "gemini" ? "webspeech" : "gemini"
                )
              }
              title="Switch STT engine"
              className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-50 transition"
            >
              <Sparkles className="h-3 w-3 text-orange-500" />
              <span>
                {activeProvider === "gemini" ? "Gemini AI STT" : "Web Speech"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
