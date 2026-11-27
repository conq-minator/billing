import type { Lang } from "@/engine/types";

export type SttCallbacks = {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (err: string) => void;
};

export interface SttAdapter {
  readonly name: "gemini" | "groq" | "sarvam" | "webspeech" | "replay";
  isSupported(): boolean;
  start(lang: Lang, callbacks: SttCallbacks): Promise<void>;
  stop(): Promise<void>;
}
