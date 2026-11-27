# Build Plan — the most efficient way to build Boli-Quote

Follow milestones **in order**. Inside a milestone, follow task order unless a task is marked ⇄ (can run in parallel with the previous one). Tick the box here **and** log it in [MEMORY.md](../MEMORY.md) when a task's *Done when* passes.

---

## The strategy (why this order is fastest)

1. **Engine first, test-driven.** The hard, demo-critical logic (qty words, unit conversion, price memory, discount learning, totals) is pure TypeScript. Write PRD §13 acceptance tests against the engine *before* any UI. Most bugs die here, for free, in milliseconds.
2. **Text before voice.** Build the whole loop with a **transcript text box** (`?debug=1`) and a transcript-injection test hook. The mic/STT is plugged in last in M1 — it's just another source of text. No one waits on audio to test billing.
3. **LLM behind fixtures.** Record real LLM outputs once into `tests/fixtures/intents/`; CI and most dev runs use `LLM_MODE=fixture`. Live calls only for the parser eval script. Fast, free, deterministic.
4. **One engine, two inputs.** Taps and voice both produce `Intent` → `engine.apply`. Build edits once.
5. **One view-model, five renderers.** Screen, public page, PDF, PNG, print all read `toBillViewModel`. Layout bugs fixed once.
6. **Vertical slice early.** By the end of M1 a full spoken bill must work end-to-end on a phone. Everything after is additive.
7. **Demo safety is a feature.** Fallback adapters, demo reset and backup clips are tasks, not afterthoughts.

Definition of done for **every** task: *Done when* passes · `pnpm typecheck && pnpm lint && pnpm test` green · MEMORY.md updated.

---

## M0 — Scaffold (≈ 0.5 day)

- [x] **M0.1 Project init.** Next.js 15 App Router + TS strict + Tailwind v4 + shadcn/ui + ESLint/Prettier + Vitest + Playwright, pnpm. Scripts: `dev`, `dev:https`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, `db:migrate`, `db:seed`, `demo:reset`.
  *Done when:* `pnpm build` and an empty Vitest + Playwright test pass.
- [x] **M0.2 Config.** `src/config/env.ts` (Zod env), `src/config/constants.ts` (all thresholds), `.env.example` per TECH_STACK §5.
  *Done when:* app boots with an empty `.env.local` in DEMO_MODE using fallbacks, with a banner.
- [x] **M0.3 DB layer.** Drizzle schema exactly per ARCHITECTURE §7, migrations, `db/client.ts` choosing PGlite when `DATABASE_URL` empty.
  *Done when:* `pnpm db:migrate` works on PGlite and on a Supabase URL.
- [x] **M0.4 Seed.** `db/seed.ts`: demo shop "Sharma General Store", Kolkata, test VPA; ~40 realistic kirana items with Hindi + Bengali aliases, default units, prices (atta ₹52/kg, toor dal ₹160/kg, Maggi 70g ₹14/pkt, Amul Taaza 500ml ₹28, Surf Excel 1kg ₹140, chawal, jeera ₹600/kg, Parle-G, sugar, oil, salt, tea, soap…); **Kurkure deliberately absent**; 5 customers with dues (Sharma ji, Gupta ji, Rina di, …). Two preference profiles: `fresh`, `trained`.
  *Done when:* `pnpm db:seed` is idempotent; `demo:reset` restores exactly.
- [x] **M0.5 Money/qty/time helpers** (`lib/money.ts`, `qty.ts`, `time.ts`) with tests (paise rounding, `en-IN` formatting, Asia/Kolkata day bounds).

## M1 — Core loop (must be bug-free) (≈ 2 days)

### Engine (pure, TDD) — write tests from PRD tables first
- [ ] **M1.1 Lexicon + normaliser + number words** (hi + bn): aadha, paav, sawa, dedh, dhai, saadhe, paune, sau; Bengali equivalents; transliteration to Latin.
  *Done when:* table-driven tests for every row of PRD FR-5.2 pass.
- [ ] **M1.2 Units + conversion** (mass/volume/count families; incompatible → null).
  *Done when:* 500 g @ ₹52/kg = ₹26.00; pkt ↔ kg = null.
- [ ] **M1.3 resolveItem** (alias → exact → Fuse.js; new-item creation).
  *Done when:* "arhar dal"→Toor Dal, "Surf"→Surf Excel, "doodh"→Amul Taaza, "Kurkure"→new item.
- [ ] **M1.4 fillPrice + learnPrice + price_basis rule** (PRD FR-6.1–6.4, one-time override).
  *Done when:* AT-03 / AT-04 / AT-05 / AT-06 pass at engine level.
- [ ] **M1.5 Line edits** (EDIT_LINE, REMOVE_LINE, SET_PRICE, "last" reference, add).
  *Done when:* AT-10 passes at engine level.
- [ ] **M1.6 computeTotals + pendingQuestions + FINISH flow + readback templates.**
  *Done when:* AT-01, AT-02 pass at engine level; finish with unknown price yields the "Kurkure ka rate?" question.

### Router
- [ ] **M1.7 Intent schema + fast path** (ARCHITECTURE §5.1, §5.3).
  *Done when:* fast-path fixtures pass for finish/payment/pending answers in hi + bn.
- [ ] **M1.8 LLM parser.** Prompt (rules, number tables, ~30 few-shots), Claude call per TECH_STACK §3 (structured output → Zod), confidence guard, timeout → fast-path fallback, `LLM_MODE=fixture` record/replay.
  *Done when:* `tests/eval/parser.eval.ts` (live, manual) scores ≥ 95% on `tests/fixtures/utterances/*.hi.json`; recorded fixtures committed.

### API + UI (text-first)
- [ ] **M1.9 Repository + `/api/utterance` + `/api/bills/*/commands`** with per-bill serial processing (row lock, `clientSeq`), single transaction, `voice_events` logging.
  *Done when:* integration test posts AT-01 transcript and gets the expected bill JSON.
- [ ] **M1.10 Counter screen (text input).** TopBar, LiveBill with badges + animations, TranscriptStrip, debug text box, PendingChip, ClarifyChip, toasts, Done / New bill.
  *Done when:* Playwright AT-01…AT-06, AT-10 pass via transcript injection on phone + tablet viewports.
- [ ] **M1.11 Tap-to-edit.** LineEditSheet (item, qty, unit, rate, "only this bill" toggle, remove), swipe-to-delete, number pad for pending price.
  *Done when:* AT-04 passes by tapping.

### Voice (plug in the mic)
- [ ] **M1.12 Audio capture + STT adapters** (`sarvam`, `webspeech`, `replay`) + hold-to-talk MicButton + partial transcripts.
  *Done when:* on a real Android phone over HTTPS, AT-01 spoken in Hinglish produces 5 lines; p95 latency logged ≤ 1.5 s.
- [ ] **M1.13 TTS readbacks** (Sarvam + browser fallback, phrase cache, pre-warm).
  *Done when:* finish readback is spoken in < 600 ms after response for cached phrases.

**M1 exit gate:** full spoken bill on a phone, 3 runs in a row, zero errors. Record a screen capture for BUILT_WITH_FLOW.md.

## M2 — Money (≈ 1.5 days)

- [ ] **M2.1 Discount engine:** percent/flat on whole bill and items, target total, remove; discount lines in view.
  *Done when:* AT-09 passes; item + bill discount math matches PRD §9 sample (₹623.00).
- [ ] **M2.2 Ambiguity question + learning + correction + Settings reset** (constants-driven).
  *Done when:* AT-07, AT-08 pass (engine + Playwright); `trained` profile skips the question.
- [ ] **M2.3 Payments:** UPI (QR sheet + "Received"), cash, udhaar (ask "Kiske naam pe?"), partial; customer attach by voice ("Sharma ji ka bill") with fuzzy match/create.
  *Done when:* AT-12 passes; customer balance correct in DB.
- [ ] **M2.4 UPI URI + QR** (`bill/upi.ts`, tested encoding).
  *Done when:* AT-11 manual scan succeeds in GPay, PhonePe, Paytm with exact amount (log result in MEMORY.md).
- [ ] **M2.5 View-model + exports:** `toBillViewModel`, PDF, PNG, 58 mm print, public `/b/:publicId` page with Pay-with-UPI button.
  *Done when:* all four renderings show identical numbers to the screen for the PRD §9 sample (snapshot test).
- [ ] **M2.6 WhatsApp share** (wa.me + Web Share API with PNG; customer phone via saved / Contact Picker / typed).
  *Done when:* on Android, share opens WhatsApp with message + https link.
- [ ] **M2.7 Reopen & edit finalised bill** (status `edited`, `bill_versions`, same bill no., re-export).
  *Done when:* AT-16 passes.

## M3 — Hisaab (≈ 1 day)

- [ ] **M3.1 Ledger queries** (today summary, dues list w/ days pending, customer balance + last payment, top items) as repo functions + `/api/ledger/*`.
  *Done when:* AT-13 passes — spoken numbers equal SQL results on seeded + generated data.
- [ ] **M3.2 Voice intents:** QUERY_LEDGER, QUERY_PRICE (price history: "₹52 per kilo, 3 din pehle"), RECORD_PAYMENT against dues ("Sharma ji ne 500 diya"), SEND_REMINDER (wa.me with polite hi/bn template + amount + https link).
  *Done when:* AT-14 passes on a phone; history answer correct.
- [ ] **M3.3 Screens ⇄:** Aaj ka hisaab, Items (catalogue, aliases, history, edit), Customers (balances, reminder button), Bills (history, reopen).
  *Done when:* each screen usable one-handed on a phone; Playwright smoke test per screen.

## M4 — Polish & demo safety (≈ 1 day)

- [ ] **M4.1 Bengali end-to-end:** UI labels, readbacks, questions, lexicon, few-shots, STT/TTS `bn-IN`.
  *Done when:* AT-15 (AT-01, AT-03, AT-07 in Bengali) passes; Bengali parser eval ≥ 95%.
- [ ] **M4.2 Noise handling:** hold-to-talk default, hands-free VAD toggle, retry prompts, mic-permission UX.
- [ ] **M4.3 Offline-tolerant UI:** IndexedDB utterance queue, "connecting…" pill, ordered replay; PWA install + offline shell (Serwist).
  *Done when:* toggling airplane mode mid-bill loses no utterance.
- [ ] **M4.4 Demo mode:** Settings → Demo: reset data, profile switch (`fresh`/`trained`), replay backup clips (hi + bn) through the pipeline, debug latency panel.
  *Done when:* full DEMO.md script runs with STT disabled, using clips only.
- [ ] **M4.5 Performance pass:** verify prompt cache hits, DB round trips ≤ 2 per utterance, p95 ≤ 1.5 s on venue-like network (throttled 4G). If not met, the team decides whether to switch `LLM_MODEL` (record the decision).
- [ ] **M4.6 Final QA:** all AT-01…AT-16 green in CI; manual UPI scan + WhatsApp checks; DEMO.md checklist.

### Stretch (only after M4 is fully green, and only with approval)
- GST mode display (Tax Invoice, HSN, CGST/SGST).
- "Sabse zyada kya bika aaj?" polish.

---

## Parallel work (if more than one person/agent)

| Stream | Can start | Owns |
|---|---|---|
| A — Engine & tests | M0.5 | `src/engine`, `tests/unit`, `tests/fixtures` |
| B — Router & LLM | after M1.7 schema lands | `src/router`, parser eval |
| C — UI | after M1.9 API shape lands (mock with fixtures before) | `src/app`, `src/components`, `src/store` |
| D — Voice | anytime after M0 | `src/voice` (develop against a test page) |

Contracts to agree before splitting: `IntentSchema`, `EngineResult`, `Bill` types, API shapes (ARCHITECTURE §5.3, §6, §8). Streams never edit each other's folders without coordination.

---

## Testing approach

| Layer | Tool | What |
|---|---|---|
| Engine | Vitest | Every PRD table row, AT-xx at engine level, property tests for totals (sum invariants, never negative) |
| Parser | Vitest (fixture) + eval script (live) | `utterance → intent` fixtures in hi and bn; ≥ 95% live accuracy |
| API | Vitest + PGlite | utterance → persisted bill, concurrency/order |
| UI | Playwright | AT-01…AT-16 via `window.__injectTranscript(text)` (enabled when `DEMO_MODE`) on 390×844 and 1180×820 viewports |
| Device | Manual (DEMO.md) | Mic, STT, TTS, UPI scans, WhatsApp |

Add a fixture for every new phrasing you see fail in real use — that's how the parser improves.
