import type { Lang } from "@/engine/types";
import type { SttAdapter, SttCallbacks } from "./types";

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export class WebSpeechSttAdapter implements SttAdapter {
  readonly name = "webspeech" as const;
  private recognition: SpeechRecognitionLike | null = null;
  private finalText = "";
  private callbacks: SttCallbacks | null = null;

  isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const w = window as unknown as Record<string, unknown>;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  async start(lang: Lang, callbacks: SttCallbacks): Promise<void> {
    if (!this.isSupported()) {
      callbacks.onError("Web Speech API not supported in this browser");
      return;
    }

    const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = lang === "bn" ? "bn-IN" : lang === "hi" ? "hi-IN" : "en-IN";
    rec.interimResults = true;
    rec.continuous = true;

    this.finalText = "";
    this.callbacks = callbacks;

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const t = res[0]?.transcript ?? "";
        if (res.isFinal) {
          this.finalText = `${this.finalText} ${t}`.trim();
        } else {
          interim = `${interim} ${t}`.trim();
        }
      }
      const combined = `${this.finalText} ${interim}`.trim();
      if (combined) callbacks.onPartial(combined);
    };

    rec.onerror = (e) => {
      callbacks.onError(e.error || "speech_error");
    };

    rec.onend = () => {
      if (this.finalText.trim()) {
        callbacks.onFinal(this.finalText.trim());
      } else {
        callbacks.onError("empty_transcript");
      }
      this.recognition = null;
    };

    this.recognition = rec;
    rec.start();
  }

  async stop(): Promise<void> {
    if (this.recognition) {
      this.recognition.stop();
    } else if (this.finalText && this.callbacks) {
      this.callbacks.onFinal(this.finalText);
    }
  }
}
