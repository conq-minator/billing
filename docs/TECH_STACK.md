# Tech Stack — Boli-Quote

Every choice below optimises for, in order: **(1) the demo never breaks, (2) latency < 1.5 s per utterance, (3) build speed for a small team + AI agent, (4) zero cost to the shop.**

Do not swap a library without recording the decision in [MEMORY.md](../MEMORY.md) → *Decisions*.

---

## 1. Summary table

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** (strict) everywhere | One language for UI, API, engine, tests; Zod types shared end-to-end |
| Runtime / pkg mgr | **Node.js 22 LTS**, **pnpm** | Fast installs, stable |
| Framework | **Next.js 15 (App Router)** + **React 19** | UI + API routes in one deploy; `next/og` for PNG bills |
| Styling / UI | **Tailwind CSS v4** + **shadcn/ui** (Radix primitives) + **lucide-react** icons | Big accessible touch components (sheets, dialogs, toasts) fast |
| Animation | **motion** (Framer Motion) | Lines animating in as they're recognised |
| PWA | **Serwist** (`@serwist/next`) | Installable, offline shell, utterance queue |
| Client state | **Zustand** | Tiny store for the open bill / mic state; server stays source of truth |
| Validation | **Zod** | Intent JSON, API inputs, env vars |
| Database | **PostgreSQL** — **Supabase** (prod, Mumbai `ap-south-1`); **PGlite** (local dev + tests) | Same SQL dialect everywhere; PGlite = zero-setup Postgres in-process for dev/CI |
| ORM / migrations | **Drizzle ORM** + **drizzle-kit** | Typed SQL, supports both node-postgres and PGlite drivers |
| LLM (intent parser) | **Anthropic Claude API** via `@anthropic-ai/sdk`, model **`claude-opus-5-5`** (env `LLM_MODEL`), `effort: "low"`, structured outputs | Reliable strict JSON for code-switched Hinglish/Bengali; see §3 |
| Speech-to-text | **Sarvam AI STT** (streaming, `hi-IN`, `bn-IN`, code-mixed) behind an `SttAdapter`; **Web Speech API** dev fallback | Indic-first accuracy; adapter keeps us swappable (hosted Whisper as alt adapter) |
| Voice activity | **@ricky0123/vad-web** (Silero VAD, WASM) | Hands-free mode end-of-utterance detection |
| Text-to-speech | **Sarvam TTS** behind a `TtsAdapter`; **browser `speechSynthesis`** fallback; phrase cache | Natural Hindi/Bengali readbacks |
| Fuzzy matching | **Fuse.js** + custom normaliser + **@indic-transliteration/sanscript** | Match "arhar dal"/"अरहर दाल"/"অড়হর ডাল" to one item |
| QR | **qrcode** | Standard UPI QR (SVG on screen, PNG data-URL in exports) |
| PDF | **@react-pdf/renderer** (server) | No headless Chromium needed on serverless |
| PNG (WhatsApp image) | **next/og `ImageResponse`** (Satori) | Fast, edge-friendly bill image |
| Thermal print | CSS `@page { size: 58mm auto }` + `window.print()` | Works with any OS-paired thermal printer |
| Dates | **date-fns** + **date-fns-tz** (`Asia/Kolkata`) | "Aaj" = shop local day |
| Unit tests | **Vitest** | Engine, normaliser, parser fixtures |
| E2E / acceptance | **Playwright** (mobile + tablet viewports) | Drives UI with transcript injection, no mic needed |
| Lint / format | **ESLint** (next config) + **Prettier** | |
| Hosting | **Vercel** (functions pinned to `bom1` Mumbai) + **Supabase** (Mumbai) | Low RTT for Indian counters; free tiers suffice |
| Dev tooling | **Wispr Flow** (dictation into editor/AI agent) | Hackathon requirement — *not* in-app STT. See [BUILT_WITH_FLOW.md](../BUILT_WITH_FLOW.md) |

**Pin exact versions** in `package.json` (no `^`) once M1 scaffolding is done, so the demo build is reproducible.

---

## 2. Why server-authoritative + deterministic engine

The LLM returns *what the owner meant*; plain TypeScript decides *what happens to money*. This makes behaviour reproducible, unit-testable and safe on stage. The engine (`src/engine/`) has **no I/O** — it takes the bill + memory snapshot + intent and returns the new bill + side-effects to persist. 100% of PRD §13 logic is testable without network.

---

## 3. LLM details (Claude API)

- **SDK:** `@anthropic-ai/sdk` (official TypeScript SDK). Server-side only; key never reaches the browser.
- **Model:** `claude-opus-5-5` by default, configured via `LLM_MODEL`. Thinking can't be disabled on this model — control latency with `output_config.effort = "low"`. If measured p95 exceeds the 1.5 s budget, the team may choose to set `LLM_MODEL=claude-haiku-5-5` (a team decision; record it in MEMORY.md).
- **Output:** structured outputs (`output_config.format` with a JSON schema generated from the Zod `IntentSchema`; prefer the SDK's `messages.parse()` helper), then **re-validate with Zod** server-side anyway. Do **not** use forced `tool_choice` (`any`/`tool`) — it is rejected on current models.
- **Refusals:** check `stop_reason` before reading content; enable server-side `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`). Any non-success → treat as `UNKNOWN` (bill unchanged, "Phir se boliye?").
- **Prompt caching:** the system prompt (rules + few-shot examples + unit/number word tables) is static and placed first with `cache_control`; per-request context (open bill lines, pending question, last line) goes last. Verify `usage.cache_read_input_tokens > 0`.
- **Timeouts:** per-request timeout 2.5 s, `maxRetries: 0` on the hot path (one quick retry only if time budget allows). On timeout → deterministic fast-path parser result if it matched, else "Phir se boliye?".
- **Streaming:** not required for a ~300-token JSON; non-streaming keeps code simple. Bill updates are streamed to the UI per utterance, not per token.
- **Test mode:** `LLM_MODE=fixture` replays recorded intent JSON from `tests/fixtures/intents/` keyed by normalised transcript — CI never calls the API.
- Verify exact SDK parameter names against the official docs at implementation time (`platform.claude.com/docs`); do not guess.

---

## 4. Speech pipeline details

| Concern | Decision |
|---|---|
| Capture | `getUserMedia` → AudioWorklet → 16 kHz mono PCM16 frames |
| Hold-to-talk (default) | Press = open stream, release = finalise utterance |
| Hands-free | VAD detects speech start/end; 700 ms trailing silence ends an utterance |
| Transport | Browser ⇄ our `/api/stt/session` (issues short-lived Sarvam token or proxies WebSocket) — API key never in browser |
| Languages | Send language hint from toggle (`hi-IN` / `bn-IN`); code-mixed mode on |
| Partial transcripts | Shown live in the transcript strip; only **final** transcripts go to the intent router |
| Fallback | `SttAdapter` = `sarvam` \| `webspeech` \| `replay` (demo backup clips) selected by env / Settings → Demo |
| TTS | Short phrases only. Cache audio by `(lang, text)` in IndexedDB; pre-warm common phrases ("UPI ya cash?", "Phir se boliye?") at app load |

Verify Sarvam endpoint names, model names and auth flow in their docs at implementation time; keep all vendor specifics inside `src/voice/adapters/`.

---

## 5. Environment variables (`.env.example`)

```bash
# Database
DATABASE_URL=                 # Supabase Postgres connection string (pooled). Empty => PGlite at ./.pglite
# LLM
ANTHROPIC_API_KEY=
LLM_MODEL=claude-opus-5-5
LLM_MODE=live                 # live | fixture
# Speech
STT_PROVIDER=sarvam           # sarvam | webspeech | replay
TTS_PROVIDER=sarvam           # sarvam | browser
SARVAM_API_KEY=
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000   # used to build https /b/<id> links
DEFAULT_LANG_PRIMARY=hi
DEFAULT_LANG_SECONDARY=bn
DEMO_MODE=true                # shows Settings → Demo (reset + backup clips)
```

Validated at boot by `src/config/env.ts` (Zod). Missing keys in `DEMO_MODE` → fall back to `webspeech` / `browser` / `fixture` with a visible banner rather than crashing.

---

## 6. Local HTTPS (mic access on phones)

Browsers only allow the mic on `https` or `localhost`. To test on a phone on the LAN, run `pnpm dev:https` (`next dev --experimental-https`) or use a tunnel (e.g. `cloudflared`). Production on Vercel is HTTPS by default.

---

## 7. What we deliberately do **not** use

| Not used | Reason |
|---|---|
| Auth providers / OTP | Out of scope; single demo shop + profile switcher |
| WhatsApp Business API | Out of scope; we open `wa.me` links only |
| Payment gateway / PSP | UPI intent + QR is enough; owner marks received |
| Headless Chromium for PDF | Heavy and slow on serverless; react-pdf instead |
| Client-side LLM calls | Key safety + one place to validate |
| Redux / TanStack Query | Overkill for a single open bill |
