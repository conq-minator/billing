import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().optional().default(""),
  LLM_PROVIDER: z
    .enum(["auto", "gemini", "groq", "anthropic", "fixture"])
    .default("auto"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_LLM_MODEL: z.string().default("llama-3.3-70b-versatile"),
  GROQ_STT_MODEL: z.string().default("whisper-large-v3-turbo"),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  LLM_MODEL: z.string().default("claude-opus-5-5"),
  LLM_MODE: z.enum(["live", "fixture"]).default("live"),
  STT_PROVIDER: z
    .enum(["auto", "groq", "sarvam", "webspeech", "replay"])
    .default("auto"),
  TTS_PROVIDER: z.enum(["sarvam", "browser"]).default("browser"),
  SARVAM_API_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DEFAULT_LANG_PRIMARY: z.enum(["hi", "bn"]).default("hi"),
  DEFAULT_LANG_SECONDARY: z.enum(["hi", "bn"]).default("bn"),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export type EffectiveLlmProvider = "gemini" | "groq" | "anthropic" | "fixture";
export type EffectiveSttProvider = "groq" | "sarvam" | "webspeech" | "replay";

export type RuntimeConfig = AppEnv & {
  effectiveLlmMode: "live" | "fixture";
  effectiveLlmProvider: EffectiveLlmProvider;
  effectiveSttProvider: EffectiveSttProvider;
  effectiveTtsProvider: "sarvam" | "browser";
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
    GROQ_API_KEY: process.env.GROQ_API_KEY || undefined,
    GROQ_LLM_MODEL: process.env.GROQ_LLM_MODEL || undefined,
    GROQ_STT_MODEL: process.env.GROQ_STT_MODEL || undefined,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || undefined,
    LLM_MODEL: process.env.LLM_MODEL || undefined,
    LLM_MODE: process.env.LLM_MODE || undefined,
    STT_PROVIDER: process.env.STT_PROVIDER || undefined,
    TTS_PROVIDER: process.env.TTS_PROVIDER || undefined,
    SARVAM_API_KEY: process.env.SARVAM_API_KEY || undefined,
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

  // Resolve STT provider (Groq Whisper > Sarvam > WebSpeech)
  let effectiveSttProvider: EffectiveSttProvider = "webspeech";
  if (parsed.STT_PROVIDER === "replay") {
    effectiveSttProvider = "replay";
  } else if (parsed.STT_PROVIDER === "webspeech") {
    effectiveSttProvider = "webspeech";
  } else if (parsed.STT_PROVIDER === "groq" && parsed.GROQ_API_KEY) {
    effectiveSttProvider = "groq";
  } else if (parsed.STT_PROVIDER === "sarvam" && parsed.SARVAM_API_KEY) {
    effectiveSttProvider = "sarvam";
  } else if (parsed.STT_PROVIDER === "auto") {
    if (parsed.GROQ_API_KEY) effectiveSttProvider = "groq";
    else if (parsed.SARVAM_API_KEY) effectiveSttProvider = "sarvam";
    else {
      effectiveSttProvider = "webspeech";
      fallbackReasons.push(
        "No GROQ_API_KEY / SARVAM_API_KEY: using Web Speech STT fallback"
      );
    }
  } else if (parsed.DEMO_MODE) {
    effectiveSttProvider = "webspeech";
    fallbackReasons.push(
      `Missing key for STT_PROVIDER=${parsed.STT_PROVIDER}: using Web Speech STT fallback`
    );
  }

  let effectiveTtsProvider = parsed.TTS_PROVIDER;
  if (effectiveTtsProvider === "sarvam" && !parsed.SARVAM_API_KEY) {
    effectiveTtsProvider = "browser";
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
