import Anthropic from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import fs from "node:fs";
import path from "node:path";
import { LLM_TIMEOUT_MS } from "@/config/constants";
import { getEnv } from "@/config/env";
import { normalizeText } from "@/engine/normalize";
import type { Bill, Lang, Question } from "@/engine/types";
import { IntentSchema, type Intent } from "./intent.schema";
import { buildRequestContext, STATIC_SYSTEM_PROMPT } from "./prompt";

let fixtureMap: Record<string, Intent> | null = null;

function loadFixtures(): Record<string, Intent> {
  if (fixtureMap) return fixtureMap;
  fixtureMap = {};
  const dir = path.join(process.cwd(), "tests", "fixtures", "intents");
  if (!fs.existsSync(dir)) return fixtureMap;

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(dir, file), "utf-8")
      ) as Record<string, unknown>;
      for (const [key, val] of Object.entries(raw)) {
        const parsed = IntentSchema.safeParse(val);
        if (parsed.success) {
          fixtureMap[normalizeText(key)] = parsed.data;
        }
      }
    } catch {
      // Ignore malformed fixture files
    }
  }
  return fixtureMap;
}

export function clearFixtureCache(): void {
  fixtureMap = null;
}

export function lookupFixtureIntent(transcript: string): Intent | null {
  const map = loadFixtures();
  const key = normalizeText(transcript);
  return map[key] ?? null;
}

const UNKNOWN_INTENT: Intent = {
  intent: "UNKNOWN",
  items: [],
  target_line: null,
  changes: null,
  discount: null,
  customer: null,
  payment: null,
  query: null,
  answer: null,
  language: "hinglish",
  confidence: 0,
};

export async function parseWithLlm(params: {
  transcript: string;
  lang: Lang;
  bill: Bill;
  pendingQuestion?: Question | null;
  customerNames: string[];
}): Promise<{ intent: Intent; cacheReadTokens: number; fromFixture: boolean }> {
  const env = getEnv();

  if (env.effectiveLlmMode === "fixture") {
    const hit = lookupFixtureIntent(params.transcript);
    return {
      intent: hit ?? UNKNOWN_INTENT,
      cacheReadTokens: 0,
      fromFixture: true,
    };
  }

  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: LLM_TIMEOUT_MS,
    maxRetries: 0,
  });

  const jsonSchema = zodToJsonSchema(IntentSchema, {
    $refStrategy: "none",
  });

  const userContent = buildRequestContext(params);

  const requestBody = {
    model: env.LLM_MODEL,
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: STATIC_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: jsonSchema,
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await client.messages.create(requestBody as any);

  if (response.stop_reason !== "end_turn") {
    return { intent: UNKNOWN_INTENT, cacheReadTokens: 0, fromFixture: false };
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { intent: UNKNOWN_INTENT, cacheReadTokens: 0, fromFixture: false };
  }

  const parsed = IntentSchema.safeParse(JSON.parse(textBlock.text));
  const usage = response.usage as unknown as {
    cache_read_input_tokens?: number;
  };

  return {
    intent: parsed.success ? parsed.data : UNKNOWN_INTENT,
    cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
    fromFixture: false,
  };
}
