import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/config/env";

const TtsSchema = z.object({
  text: z.string().min(1).max(400),
  lang: z.enum(["hi", "bn", "en"]).default("hi"),
});

export async function POST(req: Request) {
  const env = getEnv();
  if (!env.SARVAM_API_KEY) {
    return NextResponse.json(
      { error: "SARVAM_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const parsed = TtsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid TTS payload" }, { status: 400 });
    }

    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": env.SARVAM_API_KEY,
      },
      body: JSON.stringify({
        inputs: [parsed.data.text],
        target_language_code: parsed.data.lang === "bn" ? "bn-IN" : "hi-IN",
        speaker: "meera",
        model: "bulbul:v1",
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Sarvam TTS error" }, { status: 502 });
    }

    const data = (await res.json()) as { audios?: string[] };
    const b64 = data.audios?.[0];
    if (!b64) {
      return NextResponse.json({ error: "No audio returned" }, { status: 502 });
    }

    const buf = Buffer.from(b64, "base64");
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("POST /api/tts error:", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
