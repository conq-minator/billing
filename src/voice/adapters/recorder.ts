import type { Lang } from "@/engine/types";
import type { SttAdapter, SttCallbacks } from "./types";

/**
 * Shared MediaRecorder -> /api/stt/session adapter used for server-side STT
 * providers (Groq Whisper and Sarvam).
 */
export class RecorderSttAdapter implements SttAdapter {
  readonly name: "gemini" | "groq";
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;
  private callbacks: SttCallbacks | null = null;
  private lang: Lang = "en";

  constructor(provider: "gemini" | "groq") {
    this.name = provider;
  }

  isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined"
    );
  }

  async start(lang: Lang, callbacks: SttCallbacks): Promise<void> {
    if (!this.isSupported()) {
      callbacks.onError("Audio capture not supported");
      return;
    }

    this.lang = lang;
    this.callbacks = callbacks;
    this.chunks = [];

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        typeof MediaRecorder.isTypeSupported === "function" &&
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : typeof MediaRecorder.isTypeSupported === "function" &&
            MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(this.stream, { mimeType })
        : new MediaRecorder(this.stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const actualMime = recorder.mimeType || "audio/webm";
        const blob = new Blob(this.chunks, { type: actualMime });
        this.cleanupStream();

        if (blob.size === 0) {
          this.callbacks?.onError("empty_recording");
          return;
        }

        try {
          const form = new FormData();
          form.append("file", blob, "audio.webm");
          form.append("lang", this.lang);
          const res = await fetch("/api/stt/session", {
            method: "POST",
            body: form,
          });

          if (!res.ok) {
            const errData = (await res.json().catch(() => ({}))) as {
              error?: string;
              details?: string;
            };
            throw new Error(
              errData.details || errData.error || `STT request failed (${res.status})`
            );
          }

          const data = (await res.json()) as { transcript?: string };
          if (data.transcript && data.transcript.trim()) {
            this.callbacks?.onFinal(data.transcript.trim());
          } else {
            this.callbacks?.onError("empty_transcript");
          }
        } catch (err) {
          this.callbacks?.onError(
            err instanceof Error ? err.message : "stt_failed"
          );
        }
      };

      this.mediaRecorder = recorder;
      recorder.start(250);
    } catch (err) {
      this.cleanupStream();
      callbacks.onError(
        err instanceof Error ? err.message : "mic_permission_denied"
      );
    }
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
  }

  private cleanupStream(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
  }
}
