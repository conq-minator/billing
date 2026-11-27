import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().optional().default(""),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  LLM_MODEL: z.string().default("claude-opus-5-5"),
  LLM_MODE: z.enum(["live", "fixture"]).default("live"),
  STT_PROVIDER: z.enum(["sarvam", "webspeech", "replay"]).default("sarvam"),
  TTS_PROVIDER: z.enum(["sarvam", "browser"]).default("sarvam"),
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

export type RuntimeConfig = AppEnv & {
  effectiveLlmMode: "live" | "fixture";
  effectiveSttProvider: "sarvam" | "webspeech" | "replay";
  effectiveTtsProvider: "sarvam" | "browser";
  fallbackReasons: string[];
};

let cachedConfig: RuntimeConfig | null = null;

export function getEnv(): RuntimeConfig {
  if (cachedConfig) return cachedConfig;

  const parsed = EnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL || undefined,
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

  let effectiveLlmMode = parsed.LLM_MODE;
  if (effectiveLlmMode === "live" && !parsed.ANTHROPIC_API_KEY) {
    if (parsed.DEMO_MODE) {
      effectiveLlmMode = "fixture";
      fallbackReasons.push("ANTHROPIC_API_KEY missing: using fixture LLM mode");
    } else {
      throw new Error("ANTHROPIC_API_KEY is required when LLM_MODE=live and DEMO_MODE=false");
    }
  }

  let effectiveSttProvider = parsed.STT_PROVIDER;
  if (effectiveSttProvider === "sarvam" && !parsed.SARVAM_API_KEY) {
    if (parsed.DEMO_MODE) {
      effectiveSttProvider = "webspeech";
      fallbackReasons.push("SARVAM_API_KEY missing: using Web Speech STT fallback");
    } else {
      throw new Error("SARVAM_API_KEY is required when STT_PROVIDER=sarvam and DEMO_MODE=false");
    }
  }

  let effectiveTtsProvider = parsed.TTS_PROVIDER;
  if (effectiveTtsProvider === "sarvam" && !parsed.SARVAM_API_KEY) {
    if (parsed.DEMO_MODE) {
      effectiveTtsProvider = "browser";
      fallbackReasons.push("SARVAM_API_KEY missing: using browser TTS fallback");
    } else {
      throw new Error("SARVAM_API_KEY is required when TTS_PROVIDER=sarvam and DEMO_MODE=false");
    }
  }

  if (!parsed.DATABASE_URL) {
    fallbackReasons.push("DATABASE_URL empty: using local PGlite");
  }

  cachedConfig = {
    ...parsed,
    effectiveLlmMode,
    effectiveSttProvider,
    effectiveTtsProvider,
    fallbackReasons,
  };
  return cachedConfig;
}

export function resetEnvCache(): void {
  cachedConfig = null;
}
