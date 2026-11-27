# AGENTS.md — Rules for AI coding agents

You are a senior full-stack engineer building **Boli-Quote**, a voice-first billing PWA for Indian shop counters, for a hackathon. The core loop must **never break on stage**. These rules override your defaults.

## 1. Before you write any code (every session)

1. Read [MEMORY.md](MEMORY.md) → know the current milestone, what's done, open issues, decisions.
2. Read the relevant sections of:
   - [docs/PRD.md](docs/PRD.md) — *what* to build (behaviour is law).
   - [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — *how* it fits together (contracts are law).
   - [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) — *which task is next* and its "done when".
   - [docs/TECH_STACK.md](docs/TECH_STACK.md) — *which libraries* (do not swap without asking).
3. Pick the **next unchecked task** in BUILD_PLAN.md. Work on one task at a time.

## 2. Hard rules

- **No features outside the PRD.** If something seems missing, ask the human; do not invent it.
- **Never add pricing, plans, paywalls, "Pro", upgrade screens, or a pricing page.** The product is free.
- **Out of scope:** login/OTP, WhatsApp Business API, auto-sending messages, inventory/stock, GST filing, >2 languages.
- **The LLM only parses.** All pricing, memory lookup, unit conversion, discount math, learning and totals live in deterministic, unit-tested TypeScript in `src/engine/`. The LLM never computes money and never invents prices.
- **Money is integer paise** (`₹52.00` = `5200`). Never use floats for money. Quantities are decimals stored as `numeric(12,3)` / handled with a small decimal helper.
- **Every LLM output is validated with Zod** before it touches the bill. Invalid / `confidence < 0.6` / `UNKNOWN` → bill unchanged, show "Phir se boliye?" chip.
- **Phone numbers are never captured by voice.**
- **The app never sends messages.** WhatsApp = open `wa.me` link; owner taps send.
- **Every user-facing string** goes through the i18n dictionary (`hi`, `bn`, `en`) — no hard-coded UI text.
- **Thresholds and magic numbers** live in `src/config/constants.ts` (e.g. `DISCOUNT_LEARN_MIN_ANSWERS = 5`, `DISCOUNT_LEARN_AGREEMENT = 0.8`, `MIN_INTENT_CONFIDENCE = 0.6`).
- **Secrets** only in `.env.local` (never commit). Keep `.env.example` updated with every new variable.
- Don't upgrade/replace major dependencies or change the DB schema shape without noting it in MEMORY.md → *Decisions*.

## 3. Quality bar for each task

A task is done only when:
1. Its "done when" check in BUILD_PLAN.md passes.
2. `pnpm typecheck && pnpm lint && pnpm test` pass (and `pnpm test:e2e` for UI-flow tasks).
3. New engine logic has unit tests; new voice phrasings get a parser fixture in `tests/fixtures/utterances/`.
4. Acceptance tests from PRD §13 that the task touches are automated and green.
5. **MEMORY.md is updated** (see §4).

## 4. Updating MEMORY.md (mandatory, every session and every commit)

At the end of each session — and with every commit — append an entry to MEMORY.md → *Session log* using the template in that file, and update *Current state*, *Open issues* and *Decisions* if they changed. Keep entries short and factual: what changed, files touched, tests status, what's next. Newest entry at the top.

## 5. Commits

- Small commits, one task each. Message: `M1.3: price memory auto-fill + learn-on-edit`.
- Commit only when tests pass. Include the MEMORY.md update in the same commit.
- End commit messages with the attribution line your harness specifies, if any.

## 6. When unsure

Prefer: ask the human > pick the simpler option that matches the PRD > guess. Write the question into MEMORY.md → *Open issues* if you can't ask right now.
