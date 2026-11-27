import { NextResponse } from "next/server";
import { getEnv } from "@/config/env";

export async function POST(req: Request) {
  const env = getEnv();

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const lang = String(formData.get("lang") ?? "hi");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    if (env.effectiveSttProvider === "groq" && env.GROQ_API_KEY) {
      const upstream = new FormData();
      upstream.append("file", file, "audio.webm");
      upstream.append("model", env.GROQ_STT_MODEL);
      upstream.append("language", lang === "bn" ? "bn" : "hi");
      upstream.append(
        "prompt",
        "Indian kirana store billing in Hinglish, Hindi, or Bengali: Aashirvaad atta, toor dal, Maggi, Amul doodh, Surf Excel, chawal, jeera, Kurkure, kilo, gram, packet, rupaye, bas, UPI, cash, udhaar."
      );

      const res = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
          },
          body: upstream,
        }
      );

      if (!res.ok) {
        const msg = await res.text();
        return NextResponse.json(
          { error: "Groq STT error", details: msg },
          { status: 502 }
        );
      }

      const data = (await res.json()) as { text?: string };
      return NextResponse.json({ transcript: data.text ?? "" });
    }

    if (env.effectiveSttProvider === "sarvam" && env.SARVAM_API_KEY) {
      const upstream = new FormData();
      upstream.append("file", file, "audio.webm");
      upstream.append("language_code", lang === "bn" ? "bn-IN" : "hi-IN");
      upstream.append("model", "saarika:v2");

      const res = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: {
          "api-subscription-key": env.SARVAM_API_KEY,
        },
        body: upstream,
      });

      if (!res.ok) {
        const msg = await res.text();
        return NextResponse.json(
          { error: "Sarvam STT error", details: msg },
          { status: 502 }
        );
      }

      const data = (await res.json()) as { transcript?: string };
      return NextResponse.json({ transcript: data.transcript ?? "" });
    }

    return NextResponse.json(
      { error: "No server STT provider configured (GROQ_API_KEY / SARVAM_API_KEY missing)" },
      { status: 503 }
    );
  } catch (err) {
    console.error("POST /api/stt/session error:", err);
    return NextResponse.json({ error: "STT proxy failed" }, { status: 500 });
  }
}
