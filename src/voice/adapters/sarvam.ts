import type { Lang } from "@/engine/types";
import type { SttAdapter, SttCallbacks } from "./types";

export class SarvamSttAdapter implements SttAdapter {
  readonly name = "sarvam" as const;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;
  private callbacks: SttCallbacks | null = null;
  private lang: Lang = "hi";

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
      const recorder = new MediaRecorder(this.stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        this.cleanupStream();
        try {
          const form = new FormData();
          form.append("file", blob, "audio.webm");
          form.append("lang", this.lang);
          const res = await fetch("/api/stt/session", {
            method: "POST",
            body: form,
          });
          if (!res.ok) throw new Error("STT request failed");
          const data = (await res.json()) as { transcript?: string };
          if (data.transcript) {
            this.callbacks?.onFinal(data.transcript);
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
      recorder.start();
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
