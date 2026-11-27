# Boli-Quote — Voice Billing for India's Shop Counters

> **"On a busy day, the keyboard is the bottleneck. We removed it."**

Boli-Quote lets a shopkeeper **speak the bill while packing the bag**. By the time the bag is packed, the bill is ready: itemised, priced from memory, discount applied, total read back, UPI QR on screen, WhatsApp-ready.

```
"Aashirvaad atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, Amul doodh 2, Surf ek … bas"
        ↓  (≈1.5 s per utterance)
5 lines · prices auto-filled · "Total ₹672. 5 item. UPI ya cash?" · "UPI" → QR on screen
```

- **Hackathon:** Scaler × Wispr Flow — *India Runs on Voice* (track: Small Business)
- **Languages:** Hindi / Hinglish (primary) + one regional language (default **Bengali**)
- **Price:** **100% free.** No pricing, subscriptions, paywalls or "Pro" tiers — anywhere.
- **Built with:** [Wispr Flow](https://wisprflow.ai) for hands-free development (see [BUILT_WITH_FLOW.md](BUILT_WITH_FLOW.md)). Wispr Flow is *not* the in-app speech engine.

---

## Status

📄 **Docs phase.** No application code exists yet. The docs below are the source of truth; an AI coding agent builds the product from them, milestone by milestone.

Current progress is always in [MEMORY.md](MEMORY.md).

---

## Documentation map (read in this order)

| # | File | What it is | Who reads it |
|---|------|-----------|--------------|
| 1 | [AGENTS.md](AGENTS.md) | Rules every AI coding agent must follow in this repo | AI agents (mandatory) |
| 2 | [docs/PRD.md](docs/PRD.md) | Product requirements — every behaviour, rule and acceptance test | Everyone |
| 3 | [docs/TECH_STACK.md](docs/TECH_STACK.md) | Which technologies we use, exact versions policy, and why | Engineers / agents |
| 4 | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data model, intent contract, engine, APIs, folder layout | Engineers / agents |
| 5 | [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) | The most efficient build order, task by task, with "done when" checks | Engineers / agents |
| 6 | [docs/DEMO.md](docs/DEMO.md) | 3-minute demo script, demo-day checklist, backup plan | Presenter |
| 7 | [MEMORY.md](MEMORY.md) | Running log of what changed in every session / commit + current state | Agents (read first, write last) |
| 8 | [BUILT_WITH_FLOW.md](BUILT_WITH_FLOW.md) | Log of hands-free build sessions with Wispr Flow (submission evidence) | Judges |
| — | [CLAUDE.md](CLAUDE.md) | Pointer for Claude Code → imports AGENTS.md | Claude Code |

---

## What the product does (one screen does 90% of the work)

1. **Speak items** → lines appear live on the bill (fuzzy + alias matching, Hindi/Bengali number words, units).
2. **Prices fill themselves** from the shop's memory (`auto` badge). Unknown prices are flagged and asked **once, at the end**.
3. **Edit by voice or tap** — "dal 2 kilo kar do", "chawal hata do", "nahi nahi, ek hi", or tap any cell.
4. **It learns** — change a price once and it's remembered ("sirf is baar" for one-time overrides). Ambiguous discounts are asked until the owner's habit is learned (≥5 answers, ≥80% agreement).
5. **Finish** — "bas" → short spoken readback → "UPI" (big QR), "cash", "udhaar", or partial.
6. **Share** — PDF / PNG / 58 mm print, and a public `/b/<id>` page with a Pay-with-UPI button for WhatsApp.
7. **Aaj ka hisaab** — voice queries for today's sales, dues, customer balance, price history, reminders via `wa.me`.

---

## Quick start (once code exists)

```powershell
pnpm install
```
```powershell
Copy-Item .env.example .env.local
```
```powershell
pnpm db:migrate; pnpm db:seed
```
```powershell
pnpm dev
```

Open http://localhost:3000 on a phone or tablet on the same network (use HTTPS tunnel for mic access on non-localhost — see TECH_STACK.md §Local HTTPS).

Useful scripts (defined in M1):

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Run the app |
| `pnpm test` | Unit tests (engine, parser fixtures) |
| `pnpm test:e2e` | Playwright acceptance tests (transcript injection, no mic needed) |
| `pnpm db:seed` | Seed demo shop, ~40 items, 5 customers |
| `pnpm demo:reset` | One-click reset to seed data (also a button in Settings → Demo) |

---

## Out of scope (never build)

Pricing / subscriptions / paywalls · login / OTP · WhatsApp Business API · auto-sending messages · inventory / stock · GST filing · more than 2 languages.

If asked about the business model: *"It's free. Our goal is adoption by millions of shops. A free voice billing layer can later support credit/payments partnerships, but that is not in this build."*

---

## Licence

MIT (hackathon submission).

<sub>Made with Boli-Quote · Speak the bill, skip the keyboard.</sub>
