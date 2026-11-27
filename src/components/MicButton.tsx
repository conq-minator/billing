"use client";

import { Mic, MicOff, Sparkles, Wand2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDict } from "@/i18n";
import { useBillStore } from "@/store/bill";
import { ReplaySttAdapter } from "@/voice/adapters/replay";
import { RecorderSttAdapter } from "@/voice/adapters/recorder";
import type { SttAdapter } from "@/voice/adapters/types";
import { WebSpeechSttAdapter } from "@/voice/adapters/webspeech";
import { prewarmTts, speakReadback } from "@/voice/tts";

export type MicMode = "auto" | "tap" | "hold";

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
    setMicState,
    setPartialTranscript,
    setOnReadback,
    submitTranscript,
  } = useBillStore();
  const dict = getDict(lang);

  const [activeProvider, setActiveProvider] = useState<
    "gemini" | "groq" | "webspeech" | "replay"
  >(defaultSttProvider);
  const [micMode, setMicMode] = useState<MicMode>("auto");
  const [webSpeechSupported, setWebSpeechSupported] = useState(false);

  const adapterRef = useRef<SttAdapter | null>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const wasListeningOnDownRef = useRef<boolean>(false);
  const autoSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoModeActiveRef = useRef<boolean>(false);
  const lastSpokenTextRef = useRef<string>("");

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

  const clearSilenceTimer = () => {
    if (autoSilenceTimerRef.current) {
      clearTimeout(autoSilenceTimerRef.current);
      autoSilenceTimerRef.current = null;
    }
  };

  function getAdapter(provider: "gemini" | "groq" | "webspeech" | "replay"): SttAdapter {
    // If Web Speech is available and user wants auto or webspeech, prefer WebSpeech for zero-latency live streaming
    if (provider === "webspeech" || (micMode === "auto" && webSpeechSupported)) {
      const ws = new WebSpeechSttAdapter();
      if (ws.isSupported()) return ws;
    }
    if (provider === "gemini" || provider === "groq") {
      const rec = new RecorderSttAdapter(provider);
      if (rec.isSupported()) return rec;
      const ws = new WebSpeechSttAdapter();
      if (ws.isSupported()) return ws;
    }
    return new ReplaySttAdapter();
  }

  const stopListening = useCallback(async () => {
    clearSilenceTimer();
    if (micState !== "listening") return;
    try {
      await adapterRef.current?.stop();
    } catch {
      // Ignore stop errors
    } finally {
      setMicState("idle");
    }
  }, [micState, setMicState]);

  const startListening = useCallback(async () => {
    if (micState !== "idle") return;
    clearSilenceTimer();
    lastSpokenTextRef.current = "";

    const adapter = getAdapter(activeProvider);
    adapterRef.current = adapter;
    setMicState("listening");

    try {
      await adapter.start(lang, {
        onPartial: (t) => {
          lastSpokenTextRef.current = t;
          setPartialTranscript(t);

          // In Auto mode: Natural pause detection!
          // When user pauses speaking for 1400ms, commit this completed item phrase
          if (micMode === "auto" && t.trim().length > 2) {
            clearSilenceTimer();
            autoSilenceTimerRef.current = setTimeout(async () => {
              const phraseToSubmit = lastSpokenTextRef.current.trim();
              if (!phraseToSubmit) return;

              lastSpokenTextRef.current = "";
              setPartialTranscript("");

              // Stop current recognition turn to commit
              await adapterRef.current?.stop();
              setMicState("processing");

              try {
                await submitTranscript(phraseToSubmit);
              } finally {
                // If auto mode is still on, automatically re-listen after 400ms
                if (autoModeActiveRef.current) {
                  setTimeout(() => {
                    void startListening();
                  }, 500);
                } else {
                  setMicState("idle");
                }
              }
            }, 1400);
          }
        },

        onFinal: async (finalText) => {
          clearSilenceTimer();
          setMicState("processing");
          setPartialTranscript("");

          try {
            await submitTranscript(finalText);
          } finally {
            if (micMode === "auto" && autoModeActiveRef.current) {
              setTimeout(() => {
                void startListening();
              }, 500);
            } else {
              setMicState("idle");
            }
          }
        },

        onError: (err) => {
          clearSilenceTimer();
          setMicState("idle");
          const msg = String(err || "");

          if (micMode === "auto" && autoModeActiveRef.current) {
            // In auto mode, if timeout occurred due to silence, quietly re-listen
            if (msg.includes("empty_transcript") || msg.includes("no-speech")) {
              setTimeout(() => {
                if (autoModeActiveRef.current) void startListening();
              }, 400);
              return;
            }
          }

          if (msg.includes("empty_transcript") || msg.includes("empty_recording")) {
            useBillStore.setState({
              toast:
                lang === "bn"
                  ? "Kono kotha shona jaayni. Spashto bhabe bolun."
                  : "No speech recognized. Speak clearly into the microphone.",
            });
          } else if (
            msg.includes("permission") ||
            msg.includes("NotAllowed") ||
            msg.includes("denied")
          ) {
            useBillStore.setState({
              toast:
                "Microphone permission denied. Click the lock/settings icon in your browser address bar to allow mic access.",
            });
          } else if (msg.includes("not supported") || msg.includes("insecure")) {
            useBillStore.setState({
              toast:
                "Microphone requires HTTPS or localhost. If on mobile, open via localhost or use the text box below.",
            });
          } else {
            useBillStore.setState({ toast: `Voice error: ${msg}` });
          }
        },
      });
    } catch (e) {
      clearSilenceTimer();
      setMicState("idle");
      useBillStore.setState({
        toast: e instanceof Error ? e.message : "Failed to start microphone",
      });
    }
  }, [micState, activeProvider, lang, micMode, setMicState, setPartialTranscript, submitTranscript]);

  const toggleAutoMode = () => {
    if (micMode === "auto") {
      if (autoModeActiveRef.current) {
        autoModeActiveRef.current = false;
        void stopListening();
      } else {
        autoModeActiveRef.current = true;
        void startListening();
      }
    }
  };

  const handlePointerDown = () => {
    pointerDownTimeRef.current = Date.now();
    wasListeningOnDownRef.current = micState === "listening";

    if (micMode === "auto") {
      return;
    }

    if (micMode === "tap") {
      return;
    }

    // Hold mode
    if (micState === "idle") {
      isHoldingRef.current = true;
      void startListening();
    }
  };

  const handlePointerUp = () => {
    if (micMode === "auto" || micMode === "tap") {
      return;
    }

    // Hold mode release
    const duration = Date.now() - pointerDownTimeRef.current;
    if (duration > 350 && isHoldingRef.current && micState === "listening") {
      isHoldingRef.current = false;
      void stopListening();
    } else {
      isHoldingRef.current = false;
    }
  };

  const handleClick = () => {
    if (micMode === "auto") {
      toggleAutoMode();
      return;
    }

    if (micMode === "tap") {
      if (micState === "listening") {
        void stopListening();
      } else if (micState === "idle") {
        void startListening();
      }
      return;
    }

    // Hold mode tap
    if (wasListeningOnDownRef.current && micState === "listening") {
      void stopListening();
    }
  };

  const isAutoListening = micMode === "auto" && autoModeActiveRef.current && micState === "listening";

  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      {/* Mic Trigger */}
      <div className="relative">
        {(micState === "listening" || isAutoListening) && (
          <span className="absolute -inset-3.5 rounded-full bg-red-400 opacity-40 animate-ping" />
        )}

        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
          data-testid="mic-button"
          className={`relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl transition-all duration-200 select-none active:scale-95 ${
            isAutoListening
              ? "bg-emerald-600 text-white ring-4 ring-emerald-300 shadow-emerald-500/30 animate-pulse"
              : micState === "listening"
                ? "bg-red-600 text-white ring-4 ring-red-300 shadow-red-500/30 animate-pulse"
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
          {isAutoListening ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600 animate-ping" />
              Auto Mode Active · Speak items naturally (Say &quot;Finish&quot; when done)
            </span>
          ) : micState === "listening" ? (
            <span className="text-red-600 font-semibold flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
              Listening... Speak items (Tap again to finish)
            </span>
          ) : micState === "processing" ? (
            <span className="text-amber-600 font-semibold">
              Processing items with Gemini...
            </span>
          ) : (
            <span className="text-stone-600">
              {micMode === "auto"
                ? "Tap mic to start Continuous Auto Mode"
                : micMode === "tap"
                  ? "Tap mic to start speaking"
                  : "Hold mic while speaking"}
            </span>
          )}
        </span>

        {/* 3-Mode Selector & Engine Toggle */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
          {/* Mode Dropdown / Segmented control */}
          <div className="inline-flex items-center rounded-xl border border-stone-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                if (autoModeActiveRef.current) {
                  autoModeActiveRef.current = false;
                  void stopListening();
                }
                setMicMode("auto");
              }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                micMode === "auto"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Wand2 className="h-3 w-3" />
              <span>Auto (Continuous)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (autoModeActiveRef.current) {
                  autoModeActiveRef.current = false;
                  void stopListening();
                }
                setMicMode("tap");
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                micMode === "tap"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span>Tap to Speak</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (autoModeActiveRef.current) {
                  autoModeActiveRef.current = false;
                  void stopListening();
                }
                setMicMode("hold");
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                micMode === "hold"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span>Hold to Talk</span>
            </button>
          </div>

          {/* Engine Toggle */}
          {webSpeechSupported && (
            <button
              type="button"
              onClick={() =>
                setActiveProvider((p) =>
                  p === "gemini" ? "webspeech" : "gemini"
                )
              }
              title="Switch STT engine"
              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 transition shadow-2xs"
            >
              <Sparkles className="h-3 w-3 text-orange-500" />
              <span>
                {activeProvider === "gemini" ? "Gemini AI" : "Live Web Speech"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
