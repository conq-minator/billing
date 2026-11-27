import type { Lang } from "@/engine/types";
import type { SttAdapter, SttCallbacks } from "./types";

const DEMO_CLIPS: Record<Lang, string[]> = {
  hi: [
    "Aashirvaad atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, Amul doodh 2, Surf ek",
    "Kurkure 3 packet",
    "bas",
    "10 rupaye",
    "UPI",
  ],
  bn: [
    "Aashirvaad atta panch kilo, toor dal ek kilo, Maggi char packet, Amul doodh dui, Surf ek",
    "Kurkure tin packet",
    "hoye geche",
    "10 taka",
    "UPI",
  ],
  en: [
    "Aashirvaad atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, Amul doodh 2, Surf ek",
    "bas",
  ],
};

export class ReplaySttAdapter implements SttAdapter {
  readonly name = "replay" as const;
  private idx = 0;

  isSupported(): boolean {
    return true;
  }

  async start(lang: Lang, callbacks: SttCallbacks): Promise<void> {
    const list = DEMO_CLIPS[lang] ?? DEMO_CLIPS.hi;
    const clip = list[this.idx % list.length];
    this.idx++;
    callbacks.onPartial(clip);
    setTimeout(() => callbacks.onFinal(clip), 150);
  }

  async stop(): Promise<void> {
    // No-op
  }
}
