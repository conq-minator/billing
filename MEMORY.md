# MEMORY.md — Project memory & change log

**Purpose:** the single place where any agent or human picks up the project. Read it first at the start of every session; update it at the end of every session and with every commit (rules in [AGENTS.md](AGENTS.md) §4).

---

## Current state

| | |
|---|---|
| **Phase** | M1 Core loop complete — starting M2 Money |
| **Current milestone** | M2 — Money |
| **Next task** | M2.1 Discount engine |
| **Acceptance tests green** | 7 / 16 (AT-01..AT-06, AT-10 automated; AT-07..AT-09, AT-11..AT-16 in M2–M4) |
| **Demo-ready** | Partial (core voice/text billing loop works) |
| **Last updated** | 2026-11-27 |

### Milestone checklist
- [x] M0 Scaffold
- [x] M1 Core loop
- [ ] M2 Money
- [ ] M3 Hisaab
- [ ] M4 Polish & demo safety

---

## Decisions (append-only; newest at top)

| # | Date | Decision | Why | Where |
|---|------|----------|-----|-------|
| D-008 | 2026-11-27 | Round-off to nearest rupee by default (`ROUND_OFF_TO_PAISE = 100`); target-total discounts have round-off 0 | Spec shows a round-off line but no rule | PRD FR-9.2 |
| D-007 | 2026-11-27 | Corrected PRD §9 sample: 5% of ₹656 = ₹32.80, round-off −0.20, total ₹623.00 | Original sketch arithmetic was off | PRD FR-9.1 |
| D-006 | 2026-11-27 | Intent schema extended with `changes.remove_discount`, `discount.is_correction`, `answer` | Make corrections & pending answers explicit, not inferred | ARCHITECTURE §5.3 |
| D-005 | 2026-11-27 | Deterministic fast-path for finish/payment/pending answers before LLM; also used as LLM-timeout fallback | Latency + stage reliability; no behaviour change | ARCHITECTURE §5.1 |
| D-004 | 2026-11-27 | LLM = Claude API, `claude-opus-5-5`, effort low, structured outputs + Zod; model configurable via `LLM_MODEL` | Reliable strict JSON on code-mixed speech | TECH_STACK §3 |
| D-003 | 2026-11-27 | Postgres everywhere: Supabase (prod, Mumbai) + PGlite (dev/CI) via Drizzle | One SQL dialect, zero-setup local | TECH_STACK §1 |
| D-002 | 2026-11-27 | Money stored as integer paise; qty as numeric(12,3) | No float errors on bills | ARCHITECTURE §1 |
| D-001 | 2026-11-27 | Default secondary language = Bengali | Spec default | PRD §12 |

---

## Open issues / questions

| # | Opened | Question / issue | Owner | Status |
|---|--------|------------------|-------|--------|
| Q-001 | 2026-11-27 | Real UPI VPA + shop name for the demo QR scan test | Team | Open |
| Q-002 | 2026-11-27 | Confirm Sarvam STT/TTS API access + current endpoint/model names before M1.12 | Team | Open |
| Q-003 | 2026-11-27 | If live p95 > 1.5 s at M4.5, decide whether to change `LLM_MODEL` | Team | Open |

---

## Session log (newest at top)

<!--
Template — copy for every session / commit:

### S-NNN · YYYY-MM-DD · <short title>
- **Milestone/task:** M1.4
- **Changed:** what was built/fixed, in 1–4 bullets
- **Files:** key files touched
- **Tests:** typecheck/lint/unit/e2e status; ATs now green (e.g. AT-03, AT-05)
- **Commit:** <hash or "uncommitted">
- **Decisions / issues:** links to D-xxx / Q-xxx added
- **Next:** the next task
-->

### S-003 · 2026-11-27 · M1 Core loop complete
- **Milestone/task:** M1.1–M1.13
- **Changed:** Implemented pure engine (lexicons hi/bn, transliteration/normalizer, number words, units/conversion, Fuse.js `resolveItem`, `fillPrice`/`learnPrice`, line edits, `computeTotals`, `pendingQuestions`, `readback`, `apply`), fast-path + Claude structured-output router with fixture replay, repository + `/api/bills` + `/api/utterance` + `/api/bills/:id/commands` + `/api/demo/reset`, Counter UI + `LineEditSheet` + `PendingChip` + `MicButton` + STT/TTS adapters (`sarvam`, `webspeech`, `replay`).
- **Files:** `src/engine/*`, `src/router/*`, `src/i18n/*`, `src/db/repo/*`, `src/app/api/*`, `src/components/*`, `src/store/bill.ts`, `src/voice/*`, `tests/unit/*`, `tests/integration/*`, `tests/acceptance/m1.core.spec.ts`
- **Tests:** `typecheck`, `lint`, `test` (71/71), `test:e2e` (AT-01..AT-06, AT-10 on mobile + tablet) green.
- **Commit:** local commit on `master` (no remote/push)
- **Decisions / issues:** None
- **Next:** M2.1 Discount engine

### S-002 · 2026-11-27 · M0 Scaffold complete
- **Milestone/task:** M0.1–M0.5
- **Changed:** Initialised Next.js 15 + TS strict + Tailwind v4 + Vitest + Playwright + Drizzle + PGlite; added Zod env/constants with demo fallback banner; created full 10-table Postgres schema & initial migration; added idempotent seed (`40` kirana items without Kurkure, `5` customers, `fresh`/`trained` profiles) and `demo:reset`; added `money.ts`, `qty.ts`, `time.ts` helpers with unit tests.
- **Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `drizzle.config.ts`, `src/config/*`, `src/db/*`, `src/lib/*`, `src/app/*`, `src/components/DemoBanner.tsx`, `tests/unit/helpers.test.ts`, `tests/acceptance/smoke.spec.ts`
- **Tests:** `typecheck`, `lint`, `test` (7/7), `build`, `test:e2e` (2/2), `db:migrate`, `db:seed`, `demo:reset` all green.
- **Commit:** local commit on `main` (no remote/push)
- **Decisions / issues:** None
- **Next:** M1.1 Lexicon + normaliser + number words

### S-001 · 2026-11-27 · Project documentation created
- **Milestone/task:** Pre-M0 (planning)
- **Changed:** Wrote the full doc set from the master build prompt: README, AGENTS (agent rules), CLAUDE (imports AGENTS), PRD, TECH_STACK, ARCHITECTURE, BUILD_PLAN, DEMO, MEMORY, BUILT_WITH_FLOW.
- **Files:** `README.md`, `AGENTS.md`, `CLAUDE.md`, `MEMORY.md`, `BUILT_WITH_FLOW.md`, `docs/PRD.md`, `docs/TECH_STACK.md`, `docs/ARCHITECTURE.md`, `docs/BUILD_PLAN.md`, `docs/DEMO.md`
- **Tests:** n/a (no code)
- **Commit:** uncommitted (folder is not a git repo yet)
- **Decisions / issues:** D-001…D-008, Q-001…Q-003
- **Next:** M0.1 Project init (`git init` first)
