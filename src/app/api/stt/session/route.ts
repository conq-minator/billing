import { NextResponse } from "next/server";
import { getEnv } from "@/config/env";

export async function POST(req: Request) {
  const env = getEnv();

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const lang = String(formData.get("lang") ?? "en");
    const langHint =
      lang === "bn"
        ? "The audio is in Bengali or Bengali/English."
        : lang === "hi"
        ? "The audio is in Hindi or Hinglish."
        : "The audio is in Indian English, Hindi, or Bengali.";
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    if (env.effectiveSttProvider === "groq" && env.GROQ_API_KEY) {
      const upstream = new FormData();
      upstream.append("file", file, "audio.webm");
      upstream.append("model", env.GROQ_STT_MODEL);
      upstream.append(
        "prompt",
        "Indian kirana store billing in English, Hinglish, Hindi, or Bengali: Aashirvaad atta, toor dal, Maggi, Amul doodh, Surf Excel, chawal, jeera, Kurkure, kilo, gram, packet, rupaye, bas, UPI, cash, udhaar."
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

    if (env.effectiveSttProvider === "gemini" && env.GEMINI_API_KEY) {
      const arrayBuf = await file.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuf).toString("base64");
      
      let mimeType = file.type || "audio/webm";
      if (mimeType.includes("webm")) mimeType = "audio/webm";
      else if (mimeType.includes("wav")) mimeType = "audio/wav";
      else if (mimeType.includes("mp4") || mimeType.includes("m4a")) mimeType = "audio/mp4";
      else if (mimeType.includes("ogg")) mimeType = "audio/ogg";

      const candidateModels = [
        env.GEMINI_STT_MODEL,
        "gemini-3.5-transcribe",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash",
      ];
      // Deduplicate while preserving order
      const modelsToTry = [...new Set(candidateModels.filter(Boolean))];

      let lastErrorMsg = "";
      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            model
          )}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `Transcribe this Indian kirana store billing audio. ${langHint} Return ONLY the spoken words, nothing else.`,
                    },
                    { inlineData: { mimeType, data: base64Audio } },
                  ],
                },
              ],
              generationConfig: { temperature: 0 },
            }),
          });

          if (!res.ok) {
            lastErrorMsg = await res.text();
            console.warn(`Gemini STT model ${model} failed (${res.status}): ${lastErrorMsg.slice(0, 150)}`);
            continue;
          }

          const data = (await res.json()) as {
            candidates?: Array<{
              content?: {
                parts?: Array<{
                  text?: string;
                  audioTranscription?: { text?: string };
                }>;
              };
            }>;
          };

          const part = data.candidates?.[0]?.content?.parts?.[0];
          const transcript = (
            part?.text ||
            part?.audioTranscription?.text ||
            ""
          ).trim();

          return NextResponse.json({ transcript, modelUsed: model });
        } catch (err) {
          lastErrorMsg = err instanceof Error ? err.message : String(err);
          console.warn(`Gemini STT model ${model} threw error:`, lastErrorMsg);
        }
      }

      return NextResponse.json(
        { error: "Gemini STT failed on all candidate models", details: lastErrorMsg },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "No server STT provider configured (GROQ_API_KEY / GEMINI_API_KEY missing)" },
      { status: 503 }
    );
  } catch (err) {
    console.error("POST /api/stt/session error:", err);
    return NextResponse.json({ error: "STT proxy failed" }, { status: 500 });
  }
}
