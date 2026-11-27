# Demo — 3-minute script & demo-day checklist

## Script

| Time | Beat | What happens on screen |
|---|---|---|
| 0:00–0:25 | **Hook.** "Evening rush at a kirana. Customer lists 9 items. The shopkeeper packs them, then types every item into the billing app while 4 people wait. On a busy day, the keyboard is the bottleneck. We removed it." | Counter screen, empty bill |
| 0:25–1:15 | **Live billing while packing.** Presenter "packs" props and speaks in Hinglish: "Atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, doodh 2, Surf ek, Kurkure 3 packet…" | Lines animate in with `auto` badges; Kurkure shows `price needed`. On "bas" → app asks only "Kurkure ka rate?" → "10" |
| 1:15–1:45 | **Owner control + learning.** Tap atta rate → change → toast "yaad rakh liya". Say "20% discount" → app asks whole vs item (or on `trained` profile applies whole and says so) → "nahi, sirf dal pe" | Discount line moves instantly; totals recompute |
| 1:45–2:15 | **Pay & share.** Readback "Total ₹___, UPI ya cash?" → "UPI" | Big QR; scan live with a phone; WhatsApp share sheet with bill image + link |
| 2:15–2:40 | **Hisaab.** "Aaj ka hisaab?" → spoken summary. "Kis-kis ka paisa baaki hai?" → list → "Sharma ji ko reminder bhejo" | Ledger card; WhatsApp opens with pre-filled reminder |
| 2:40–3:00 | **Close.** One line in Bengali ("Atta du kilo, dal ek kilo… bas"). 10-second clip of building it hands-free with Wispr Flow. "Free for every shop in India. Speak the bill, skip the keyboard." | Bengali bill; Flow clip |

## Before the demo (T-1 day)

- [ ] `pnpm demo:reset` on the demo deployment; choose profile (`fresh` to show the question, `trained` to show learned behaviour).
- [ ] Real shop UPI VPA set in Settings; scan-test QR in **GPay, PhonePe, Paytm** (₹1 test payment) → log result in MEMORY.md.
- [ ] WhatsApp installed and logged in on the demo phone; reminder target customer has a phone number saved.
- [ ] Mic permission granted on the demo device; HTTPS URL bookmarked; PWA installed.
- [ ] TTS phrase cache pre-warmed (open app once on venue Wi-Fi).
- [ ] Backup clips present in Settings → Demo (hi + bn) and tested with STT disabled.
- [ ] Hotspot as backup network; check latency panel p95 ≤ 1.5 s.
- [ ] Rehearse 3 full runs in a row with zero errors.

## If something breaks on stage

| Problem | Do this (≤ 5 s) |
|---|---|
| Venue too noisy / STT wrong | Settings → Demo → *Play clip* (same pipeline, pre-recorded audio) |
| STT vendor down | Settings → Demo → STT = Web Speech |
| Network flaky | Switch to phone hotspot; queued utterances replay automatically |
| Anything else | `?debug=1` text box: type the utterance — the rest of the pipeline is identical |
| Data got messy | Settings → Demo → Reset (2 s) |

## Judge Q&A crib

- **Business model?** "It's free. Our goal is adoption by millions of shops. A free voice billing layer can later support credit/payments partnerships, but that is not in this build."
- **Why not just a POS?** Typing is the bottleneck; hands are busy packing.
- **Can the AI get prices wrong?** The AI never sets prices — it only understands speech. Prices come from the shop's own memory, are badged, and unknowns are asked.
- **Languages?** Hindi/Hinglish + Bengali, done properly; architecture supports adding a regional language via lexicon + i18n files.
- **Where does Wispr Flow fit?** We built the product hands-free with Flow (see BUILT_WITH_FLOW.md); the in-app speech engine is an Indic STT.
