import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().optional().default(""),
  LLM_PROVIDER: z
    .enum(["auto", "gemini", "groq", "anthropic", "fixture"])
    .default("auto"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_STT_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_TTS_MODEL: z.string().default("gemini-2.5-flash-preview-tts"),
  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_LLM_MODEL: z.string().default("llama-3.3-70b-versatile"),
  GROQ_STT_MODEL: z.string().default("whisper-large-v3-turbo"),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  LLM_MODEL: z.string().default("claude-opus-5-5"),
  LLM_MODE: z.enum(["live", "fixture"]).default("live"),
  STT_PROVIDER: z
    .enum(["auto", "gemini", "groq", "webspeech", "replay"])
    .default("auto"),
  TTS_PROVIDER: z.enum(["auto", "gemini", "browser"]).default("auto"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DEFAULT_LANG_PRIMARY: z.enum(["en", "hi", "bn"]).default("en"),
  DEFAULT_LANG_SECONDARY: z.enum(["en", "hi", "bn"]).default("hi"),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export type EffectiveLlmProvider = "gemini" | "groq" | "anthropic" | "fixture";
export type EffectiveSttProvider = "gemini" | "groq" | "webspeech" | "replay";

export type RuntimeConfig = AppEnv & {
  effectiveLlmMode: "live" | "fixture";
  effectiveLlmProvider: EffectiveLlmProvider;
  effectiveSttProvider: EffectiveSttProvider;
  effectiveTtsProvider: "gemini" | "browser";
  fallbackReasons: string[];
};

let cachedConfig: RuntimeConfig | null = null;

export function getEnv(): RuntimeConfig {
  if (cachedConfig) return cachedConfig;

  const parsed = EnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    LLM_PROVIDER: process.env.LLM_PROVIDER || undefined,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
    GEMINI_MODEL: process.env.GEMINI_MODEL || undefined,
    GEMINI_STT_MODEL: process.env.GEMINI_STT_MODEL || undefined,
    GEMINI_TTS_MODEL: process.env.GEMINI_TTS_MODEL || undefined,
    GROQ_API_KEY: process.env.GROQ_API_KEY || undefined,
    GROQ_LLM_MODEL: process.env.GROQ_LLM_MODEL || undefined,
    GROQ_STT_MODEL: process.env.GROQ_STT_MODEL || undefined,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || undefined,
    LLM_MODEL: process.env.LLM_MODEL || undefined,
    LLM_MODE: process.env.LLM_MODE || undefined,
    STT_PROVIDER: process.env.STT_PROVIDER || undefined,
    TTS_PROVIDER: process.env.TTS_PROVIDER || undefined,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
    DEFAULT_LANG_PRIMARY: process.env.DEFAULT_LANG_PRIMARY || undefined,
    DEFAULT_LANG_SECONDARY: process.env.DEFAULT_LANG_SECONDARY || undefined,
    DEMO_MODE: process.env.DEMO_MODE || undefined,
  });

  const fallbackReasons: string[] = [];

  // Resolve LLM provider (Gemini > Groq > Anthropic > Fixture)
  let effectiveLlmProvider: EffectiveLlmProvider = "fixture";
  let effectiveLlmMode = parsed.LLM_MODE;

  if (effectiveLlmMode === "fixture" || parsed.LLM_PROVIDER === "fixture") {
    effectiveLlmMode = "fixture";
    effectiveLlmProvider = "fixture";
  } else if (parsed.LLM_PROVIDER === "gemini" && parsed.GEMINI_API_KEY) {
    effectiveLlmProvider = "gemini";
  } else if (parsed.LLM_PROVIDER === "groq" && parsed.GROQ_API_KEY) {
    effectiveLlmProvider = "groq";
  } else if (parsed.LLM_PROVIDER === "anthropic" && parsed.ANTHROPIC_API_KEY) {
    effectiveLlmProvider = "anthropic";
  } else if (parsed.LLM_PROVIDER === "auto") {
    if (parsed.GEMINI_API_KEY) effectiveLlmProvider = "gemini";
    else if (parsed.GROQ_API_KEY) effectiveLlmProvider = "groq";
    else if (parsed.ANTHROPIC_API_KEY) effectiveLlmProvider = "anthropic";
    else if (parsed.DEMO_MODE) {
      effectiveLlmMode = "fixture";
      effectiveLlmProvider = "fixture";
      fallbackReasons.push(
        "No GEMINI_API_KEY / GROQ_API_KEY / ANTHROPIC_API_KEY: using fixture LLM mode"
      );
    } else {
      throw new Error("An LLM API key is required when DEMO_MODE=false");
    }
  } else if (parsed.DEMO_MODE) {
    effectiveLlmMode = "fixture";
    effectiveLlmProvider = "fixture";
    fallbackReasons.push(
      `Missing key for LLM_PROVIDER=${parsed.LLM_PROVIDER}: using fixture LLM mode`
    );
  }

  // Resolve STT provider (Groq Whisper > Gemini > WebSpeech)
  let effectiveSttProvider: EffectiveSttProvider = "webspeech";
  if (parsed.STT_PROVIDER === "replay") {
    effectiveSttProvider = "replay";
  } else if (parsed.STT_PROVIDER === "webspeech") {
    effectiveSttProvider = "webspeech";
  } else if (parsed.STT_PROVIDER === "groq" && parsed.GROQ_API_KEY) {
    effectiveSttProvider = "groq";
  } else if (parsed.STT_PROVIDER === "gemini" && parsed.GEMINI_API_KEY) {
    effectiveSttProvider = "gemini";
  } else if (parsed.STT_PROVIDER === "auto") {
    if (parsed.GROQ_API_KEY) effectiveSttProvider = "groq";
    else if (parsed.GEMINI_API_KEY) effectiveSttProvider = "gemini";
    else {
      effectiveSttProvider = "webspeech";
      fallbackReasons.push(
        "No GROQ_API_KEY / GEMINI_API_KEY: using Web Speech STT fallback"
      );
    }
  } else if (parsed.DEMO_MODE) {
    effectiveSttProvider = "webspeech";
    fallbackReasons.push(
      `Missing key for STT_PROVIDER=${parsed.STT_PROVIDER}: using Web Speech STT fallback`
    );
  }

  let effectiveTtsProvider: "gemini" | "browser" = "browser";
  if (parsed.TTS_PROVIDER === "gemini" && parsed.GEMINI_API_KEY) {
    effectiveTtsProvider = "gemini";
  } else if (parsed.TTS_PROVIDER === "auto") {
    effectiveTtsProvider = parsed.GEMINI_API_KEY ? "gemini" : "browser";
  }

  if (!parsed.DATABASE_URL) {
    fallbackReasons.push("DATABASE_URL empty: using local PGlite");
  }

  cachedConfig = {
    ...parsed,
    effectiveLlmMode,
    effectiveLlmProvider,
    effectiveSttProvider,
    effectiveTtsProvider,
    fallbackReasons,
  };
  return cachedConfig;
}

export function resetEnvCache(): void {
  cachedConfig = null;
}
