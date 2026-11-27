import { NextResponse } from "next/server";
import { getEnv } from "@/config/env";

export async function POST(req: Request) {
  const env = getEnv();
  if (!env.SARVAM_API_KEY) {
    return NextResponse.json(
      { error: "SARVAM_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const lang = String(formData.get("lang") ?? "hi");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

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
  } catch (err) {
    console.error("POST /api/stt/session error:", err);
    return NextResponse.json({ error: "STT proxy failed" }, { status: 500 });
  }
}
