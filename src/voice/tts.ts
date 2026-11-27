import type { Lang } from "@/engine/types";

const memoryCache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;

const COMMON_PHRASES: Array<{ lang: Lang; text: string }> = [
  { lang: "hi", text: "UPI ya cash?" },
  { lang: "hi", text: "Phir se boliye?" },
  { lang: "bn", text: "UPI na cash?" },
  { lang: "bn", text: "Abar bolben?" },
  { lang: "en", text: "UPI or cash?" },
  { lang: "en", text: "Please say that again?" },
];

export async function speakReadback(
  text: string,
  lang: Lang,
  provider: "gemini" | "browser" = "gemini"
): Promise<void> {
  if (typeof window === "undefined" || !text.trim()) return;

  // Always cancel any browser robotic synthesis so voices NEVER clash
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  // Stop any previous audio track before starting a new one
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // Ignore audio abort errors
    }
    currentAudio = null;
  }

  const key = `${lang}:${text}`;

  // Default to Gemini Kore Voice
  if (provider === "gemini") {
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
        currentAudio = audio;
        audio.onended = () => {
          if (currentAudio === audio) currentAudio = null;
        };
        await audio.play();
        return;
      }
    } catch (err) {
      console.warn("Gemini TTS audio play failed:", err);
    }
  }

  // Fallback to browser synthesis ONLY if explicitly configured as browser provider
  if (provider === "browser" && "speechSynthesis" in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "bn" ? "bn-IN" : lang === "hi" ? "hi-IN" : "en-IN";
    utter.rate = 1.0;
    window.speechSynthesis.speak(utter);
  }
}

export function prewarmTts(provider: "gemini" | "browser" = "gemini"): void {
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
