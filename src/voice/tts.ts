import type { Lang } from "@/engine/types";

const memoryCache = new Map<string, string>();

const COMMON_PHRASES: Array<{ lang: Lang; text: string }> = [
  { lang: "hi", text: "UPI ya cash?" },
  { lang: "hi", text: "Phir se boliye?" },
  { lang: "bn", text: "UPI na cash?" },
  { lang: "bn", text: "Abar bolben?" },
];

export async function speakReadback(
  text: string,
  lang: Lang,
  provider: "gemini" | "sarvam" | "browser" = "browser"
): Promise<void> {
  if (typeof window === "undefined" || !text.trim()) return;

  const key = `${lang}:${text}`;

  if (provider === "gemini" || provider === "sarvam") {
    try {
      let audioUrl = memoryCache.get(key);
      if (!audioUrl) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang }),
        });
        if (res.ok) {
          const blob = await res.blob();
          audioUrl = URL.createObjectURL(blob);
          memoryCache.set(key, audioUrl);
        }
      }
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        await audio.play();
        return;
      }
    } catch {
      // Fall through to browser speechSynthesis
    }
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "bn" ? "bn-IN" : "hi-IN";
    utter.rate = 1.05;
    window.speechSynthesis.speak(utter);
  }
}

export function prewarmTts(provider: "gemini" | "sarvam" | "browser" = "browser"): void {
  if (provider === "browser" || typeof window === "undefined") return;
  for (const p of COMMON_PHRASES) {
    const key = `${p.lang}:${p.text}`;
    if (memoryCache.has(key)) continue;
    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (blob) {
          memoryCache.set(key, URL.createObjectURL(blob));
        }
      })
      .catch(() => {});
  }
}
