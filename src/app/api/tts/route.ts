import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/config/env";

const TtsSchema = z.object({
  text: z.string().min(1).max(400),
  lang: z.enum(["hi", "bn", "en"]).default("hi"),
});

export async function POST(req: Request) {
  const env = getEnv();

  try {
    const body = await req.json();
    const parsed = TtsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid TTS payload" }, { status: 400 });
    }

    if (env.effectiveTtsProvider === "gemini" && env.GEMINI_API_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        env.GEMINI_TTS_MODEL
      )}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: parsed.data.text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Kore" },
              },
            },
          },
        }),
      });

      if (!res.ok) {
        return NextResponse.json({ error: "Gemini TTS error" }, { status: 502 });
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }>;
          };
        }>;
      };
      const inline = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inline?.data) {
        return NextResponse.json({ error: "No audio returned" }, { status: 502 });
      }

      const buf = Buffer.from(inline.data, "base64");
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": inline.mimeType || "audio/wav",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    return NextResponse.json(
      { error: "No server TTS provider configured" },
      { status: 503 }
    );
  } catch (err) {
    console.error("POST /api/tts error:", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
