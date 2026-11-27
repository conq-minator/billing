# PRD — Boli-Quote: Voice Billing for India's Shop Counters

| | |
|---|---|
| **Version** | 1.0 (hackathon build) |
| **Event** | Scaler × Wispr Flow "India Runs on Voice" — track: Small Business |
| **Status** | Approved spec. Behaviour here is binding; ask before deviating. |
| **Related** | [ARCHITECTURE.md](ARCHITECTURE.md) · [TECH_STACK.md](TECH_STACK.md) · [BUILD_PLAN.md](BUILD_PLAN.md) · [DEMO.md](DEMO.md) |

Requirement IDs (`FR-x.y`) are referenced by tests and commits.

---

## 1. Problem & positioning

**Positioning line:** *"On a busy day, the keyboard is the bottleneck. We removed it."*

**The scene.** A customer at a kirana / hardware / general store counter lists what they want. The shopkeeper picks and packs. Then they stop, go to a keyboard or phone, and type every item, quantity and price. The next customer waits. On a rush day this happens 100+ times.

**Our answer.** While packing, the shopkeeper just *says* what they're giving: *"Aashirvaad atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, Amul doodh 2, Surf ek"*. By the time the bag is packed, the bill is ready — itemised, priced from memory, discounted, read back, UPI QR on screen, WhatsApp-ready.

**Why voice is mandatory, not a gimmick**
- Hands are busy picking, weighing and packing.
- Typing the bill doubles time per customer → queues.
- Bills made from memory after packing forget or mis-price items.

**Business model:** None in this build. **The product is 100% free** — no pricing, subscription, paywall, "Pro", upgrade screens, or freemium language anywhere (app or docs). Judge answer: *"It's free. Our goal is adoption by millions of shops. A free voice billing layer can later support credit/payments partnerships, but that is not in this build."*

## 2. Users

| Persona | Context | Needs |
|---|---|---|
| **Primary: Counter shopkeeper** (kirana, hardware/paint, stationery, sweets, medical-general, small wholesale) | Phone or tablet on the counter, noisy shop, hands busy, Hinglish or Bengali speech | Bill in the time it takes to pack; trust the prices; fix mistakes in one phrase; collect via UPI |
| Secondary: Tradesperson | On-site bills (electrician, plumber) | Same engine |
| Customer (indirect) | Scans QR / receives WhatsApp link | Clear bill, easy payment |

## 3. Goals & success metrics (demo-level)

| Goal | Metric / target |
|---|---|
| Bill faster than typing | 9-item bill finalised < 20 s after last item spoken |
| Responsive | Utterance end → lines on screen **p50 < 1.0 s, p95 < 1.5 s** |
| Accurate | ≥ 95% of the utterance fixtures parse to the expected lines |
| Trustworthy | Every auto-filled value visibly badged; zero invented prices |
| Never breaks on stage | All PRD §13 acceptance tests green in CI; demo backup path works offline from STT |

## 4. Core principles (apply everywhere)

- **P1 Live bill.** Every utterance appends/edits lines instantly.
- **P2 Owner in control.** Every field (item, qty, unit, rate, discount, adjustments, customer) is editable by tap/keyboard **and** voice, before and after finalising.
- **P3 Memory learns from corrections** (§6, §7).
- **P4 Never block the flow.** Missing info is flagged on the bill and asked **once, at the end**, in one short spoken question — never mid-sentence.
- **P5 Show what was auto-filled** with small badges.
- **P6 Short spoken readbacks** in the owner's language. Never long speeches.

---

## 5. Items, quantities & units

### FR-5.1 Quantity + unit rules
1. Spoken unit → use exactly: kg/kilo, gram/g, litre/L, ml, packet/pkt, piece/pc, dozen/darjan, box, bottle, bag, meter, etc.
2. Number, no unit ("Maggi 4") → qty = 4, unit = item's remembered default unit, else `unit`.
3. No quantity ("dal", "Surf") → qty = 1, unit = remembered default, else `unit`.
4. "Dal ek" → qty 1, unit = remembered default or `unit`.

### FR-5.2 Number words (both languages must be covered)

| Hindi / Hinglish | Value | Bengali | Value |
|---|---|---|---|
| ek, do, teen, chaar, paanch, chhe, saat, aath, nau, das … | 1–10 … | ek, dui, tin, char, panch, chhoy, saat, aat, noy, dosh … | 1–10 … |
| aadha | 0.5 | adh / aadha | 0.5 |
| paav | 0.25 (kg) | poa | 0.25 (kg) |
| sawa X | X + 0.25 (sawa alone / sawa kilo = 1.25) | soa X | X + 0.25 |
| dedh | 1.5 | der | 1.5 |
| dhai | 2.5 | aarai | 2.5 |
| saadhe X | X + 0.5 | saare X | X + 0.5 |
| sau / do sau / dhai sau | 100 / 200 / 250 (grams when unit implied g) | sho / dui sho / aarai sho | 100 / 200 / 250 |

Examples: "aadha kilo" = 0.5 kg · "paav kilo" = 0.25 kg · "dedh litre" = 1.5 L · "do sau gram" = 200 g · "dhai sau" = 250 (g if item unit is mass) · "poa kilo" = 0.25 kg.

> Note: "sawa" alone with a unit means 1.25 of that unit; "sawa do" means 2.25. The normaliser implements: `sawa N = N + 0.25` (and `sawa` alone = 1.25), `saadhe N = N + 0.5`, `paune N = N − 0.25`.

### FR-5.3 Unit conversion for pricing
- Price per kg & spoken 500 g → line price = 0.5 × per-kg price. Same for L ↔ ml, kg ↔ g, dozen ↔ piece (×12).
- **Never convert incompatible units** (packet ↔ kg). Incompatible → line flagged `price_needed`.

### FR-5.4 Item recognition
- Fuzzy + alias match against the shop catalogue ("arhar dal" = "toor dal", "Surf" = "Surf Excel", "doodh" = "milk").
- Brand + size is part of identity when spoken ("Maggi 70 g", "Amul Taaza 500 ml").
- Unknown item → **auto-created** and flagged `new_item`; flow never stops.
- One utterance may contain many items (separated by "aur", commas, pauses, or plain listing).
- Successive utterances keep appending to the same open bill until finalised.

### FR-5.5 Voice edits (all must work, plus tap equivalents)

| Utterance | Effect |
|---|---|
| "Dal 2 kilo kar do" | Update qty/unit of the dal line |
| "Chawal hata do" / "Maggi cancel" | Remove line |
| "Nahi nahi, ek hi" | Correct the **last-mentioned** line (qty → 1) |
| "Atta ka rate 260 kar do" | Change price (and learn it, §6) — "260" for 5 kg atta is a line total ⇒ rate 52/kg (see FR-6.4) |
| "Aur ek Parle-G" | Add line |

---

## 6. Price memory

Each catalogue item stores: `price_per_unit`, `unit`, `last_updated`, `times_used`, `price_source ∈ {owner_spoken, owner_edited, auto}`.

### FR-6.1 Filling prices

| Situation | Action | Badge |
|---|---|---|
| Owner says the price ("Atta 5 kilo 250 ka") | Use it; update memory | none |
| No price spoken, item has remembered price | Auto-fill silently; **do not ask** | `auto` (small, grey) |
| No price spoken, no remembered price | Leave empty, flag red; at finish ask once "Maggi ka rate kya hai?"; answer fills bill **and** memory | `price needed` → none |

**Rule:** only ask about prices truly unknown. Never confirm a remembered price.

### FR-6.2 Learning from corrections
- Owner changes an auto-filled price (voice or tap) → becomes the remembered price. Toast: *"Atta ka naya rate ₹52/kg yaad rakh liya."*
- **One-time override:** "sirf is baar" / "aaj ke liye" (or "only this bill" toggle on the edit sheet) → apply to this bill only, memory unchanged.

### FR-6.3 Price history
- Every memory change writes a `price_history` row.
- Query "Atta pichli baar kitne ka diya tha?" → "₹52 per kilo, 3 din pehle."

### FR-6.4 Price basis (line total vs per unit)
- "Atta 5 kilo 250 ka" — the parser marks `price_basis: line_total` when the amount refers to the whole quantity ("ka", "ke", "mein", "total") and `per_unit` for "kilo ka 52", "52 rupaye kilo", "per packet 14".
- Engine converts line totals to per-unit before storing in memory (250 / 5 = ₹50/kg).
- If ambiguous, default rule: amount > (remembered rate × qty × 0.5) → treat as line_total; otherwise per_unit. If no remembered rate and qty > 1, treat as line_total. This rule lives in the engine and is unit-tested.

---

## 7. Discounts

### FR-7.1 Types (each shown as a separate, editable, removable line)
- Percent, whole bill: "Poore bill pe 10% discount"
- Percent, specific items: "Dal aur chawal pe 20% kam"
- Flat, whole bill: "50 rupaye kam kar do"
- Target total: "Total 950 kar do" → flat discount = subtotal − 950
- Flat, item: "Atta pe 20 rupaye kam"
- Remove: "discount hata do" / tap ✕

### FR-7.2 Ambiguous discount → ask, then learn
- Discount with no target (e.g. "20% discount") and items not named:
  - **Learning phase (default):** ask *"20% poore bill pe ya kisi item pe?"* → answer applied; recorded in `preferences.discount_scope_history`.
  - **Learned phase:** when **≥ 5 answers** exist and **≥ 80%** share one scope → stop asking, apply that scope. Readback still states it: *"20% poore bill pe laga diya. Total ₹1,840."*
- **Correction after the fact** ("nahi, sirf dal aur chawal pe", "sorry, 20% sirf is aur us pe tha") → move discount to those lines, recompute, record as a **correction** (counts as an answer for the other scope ⇒ lowers agreement). If agreement drops below 80% → back to asking.
- Items named explicitly ("dal pe 20%") → never ask.
- Settings shows learned preference with **reset** ("Discount preference: whole bill (learned) — reset").
- Thresholds are config constants: `DISCOUNT_LEARN_MIN_ANSWERS = 5`, `DISCOUNT_LEARN_AGREEMENT = 0.8`.
- If the owner answers "kisi item pe" without naming items, follow-up once: *"Kaun se item?"*

---

## 8. Finishing, payment, customer

### FR-8.1 Finish
- Triggers: "bas", "ho gaya", "total batao", "bill banao" (Bengali: "hoye geche", "bas", "total bolo", "bill banao"), or big **Done** button.
- On finish: ask each `price_needed` item first (batched queue, one short question each), any pending discount question, then readback: *"Total ₹1,240. 9 item, 10% discount laga. UPI ya cash?"*
- Readback = total, item count, discount if any, payment question. Full list only on "sab padh ke sunao".

### FR-8.2 Customer (optional)
- Default: **Walk-in**.
- "Sharma ji ka bill" at any point → fuzzy match existing customer, else create.
- **Phone numbers are never taken by voice.** For WhatsApp: pick saved customer, Contact Picker API (where supported), or type.

### FR-8.3 Payment
| Say | Result |
|---|---|
| "UPI" | Large on-screen UPI QR with exact amount (primary path) |
| "Cash" | Mark paid |
| "Udhaar likh do" / "baad mein dega" | Full amount due on customer account; if Walk-in ask *"Kiske naam pe?"* |
| "500 diya, baaki udhaar" | Paid ₹500 (mode: cash unless "UPI" said), rest due on customer |

### FR-8.4 UPI (real, no fake APIs)
- NPCI URI: `upi://pay?pa=<shop_vpa>&pn=<shop_name>&am=<amount 2dp>&cu=INR&tn=Bill%20<bill_no>` (URL-encoded).
- Rendered as QR on screen and in the PDF/PNG.
- WhatsApp: share **https** link to public bill page `/b/<public_id>` showing bill, QR and "Pay with UPI" button (opens `upi://` intent on mobile).
- Must be tested with GPay, PhonePe and Paytm before demo.
- UPI payment is marked paid by the owner (tap "Received" or say "aa gaya"); there is no payment-status API in this build.

---

## 9. The bill

### FR-9.1 Layout (on-screen, PDF, PNG and 58 mm print share one view-model)

```
            SHARMA GENERAL STORE
      12 MG Road, Kolkata · 98xxxxxx10
      GSTIN: (optional, only if set)
--------------------------------------------
Bill No: 0142          27 Nov 2026, 6:42 PM
Customer: Walk-in
--------------------------------------------
#  Item              Qty      Rate     Amount
1  Aashirvaad Atta   5 kg     52/kg     260.00
2  Toor Dal          1 kg    160/kg     160.00
3  Maggi 70g         4 pkt    14/pkt     56.00
4  Amul Taaza 500ml  2 unit   28/unit    56.00
5  Surf Excel 1kg    1 unit  140/unit   140.00
   Item discount: Toor Dal -10%         -16.00
--------------------------------------------
Subtotal                                656.00
Bill discount (5%)                      -32.80
Round off                                -0.20
TOTAL                                ₹ 623.00
Paid: UPI ₹623.00         Balance due: ₹0.00
--------------------------------------------
        [ UPI QR for ₹623 ]   Scan to pay
          Thank you! Phir aaiye 🙏
            Made with Boli-Quote
```

(Corrected arithmetic vs. the original sketch: 5% of 656.00 = 32.80.)

### FR-9.2 Rules
- Label "Bill / Estimate" by default. "Tax Invoice" only with GSTIN + GST mode on (HSN, CGST/SGST). **GST mode is optional and deferred** (stretch).
- Subtotal = Σ line amounts − Σ item discounts.
- **Round-off:** total rounded to nearest whole rupee (config `ROUND_OFF_TO_PAISE = 100`; set 1 to disable). Target-total discounts produce round-off 0.
- Every on-screen line: tap to edit item/qty/unit/rate/remove; swipe to delete; badges `auto`, `new item`, `price needed`.
- Amounts ₹ with 2 decimals; qty shows spoken unit.
- Finalised bills can be reopened → status `edited`, same bill number, "edited" mark, re-exportable.
- Bill numbers: per-shop sequence, zero-padded to 4.

---

## 10. Aaj ka hisaab (ledger voice queries)

Answered from real DB rows: short spoken answer + on-screen card.

| Ask | Answer |
|---|---|
| "Aaj ka hisaab?" | "Aaj 47 bill, ₹18,420 bikri. UPI ₹11,200, cash ₹6,100, udhaar ₹1,120." |
| "Kis-kis ka paisa baaki hai?" | Top pending customers, amount, days pending |
| "Sharma ji ka kitna baaki hai?" | Balance + last payment |
| "Sharma ji ne 500 diya" | Record payment against dues |
| "Sharma ji ko reminder bhejo" | Open `https://wa.me/91<phone>?text=…` with polite message in owner's language + amount + https pay link. Owner taps send. If no phone saved → open customer sheet to pick contact / type number. |
| "Atta pichli baar kitne ka diya?" | Price history (FR-6.3) |
| "Sabse zyada kya bika aaj?" | Top items by qty/amount (nice-to-have) |

"Today" = shop local day, Asia/Kolkata.

---

## 11. UI / UX

### FR-11.1 Main counter screen
- **Top:** shop name, today's running total, language toggle (हिं / বাং).
- **Centre:** live bill; lines animate in; badges visible.
- **Bottom:** giant mic button — **hold-to-talk (default)** and tap-to-toggle hands-free mode; live transcript strip above it.
- **Actions:** Done, UPI QR, WhatsApp, Print, New bill.
- **Pending-question chip** ("Maggi ka rate?") answerable by voice or tap (number pad).
- **Low-confidence chip:** shows transcript + "Did you mean…?" + "Phir se boliye?".
- Layouts: portrait phone; landscape tablet (bill left, actions right).

### FR-11.2 Other screens
Aaj ka hisaab (cards + dues list) · Items (catalogue, prices, aliases, history, edit) · Customers (balances, reminder) · Bills (history, reopen/edit) · Settings (shop details, UPI VPA, languages, discount preference + reset, GST toggle (disabled/stretch), **Demo**: reset data, backup clips).

### FR-11.3 Design
Large touch targets (≥ 48 px, mic ≥ 96 px), high contrast, readable at arm's length, one-handed, Hindi + regional labels with English secondary, installable PWA.

## 12. Languages
- Primary: Hindi/Hinglish (code-switching is normal). Secondary: one configurable regional language, default **Bengali**.
- All readbacks, prompts, UI labels in both (+ English secondary labels).
- Number words, units, common item names covered in both.
- Two languages perfectly > many badly. Max 2 in this build.

## 13. Acceptance tests (all must pass; automated in `tests/acceptance/`)

| ID | Scenario | Expected |
|---|---|---|
| AT-01 | "Aashirvaad atta 5 kilo, toor dal 1 kilo, Maggi 4 packet, Amul doodh 2, Surf ek" | 5 lines: atta 5 kg, dal 1 kg, Maggi 4 pkt, doodh 2 unit, Surf 1 unit; known prices auto-filled with `auto`; total correct |
| AT-02 | "Dal" | Toor Dal, qty 1, default unit |
| AT-03 | "Kurkure 3 packet" (no memory) → Done | `price needed`; asks "Kurkure ka rate?" → "10 rupaye" → line ₹30, memory saved; next bill auto-fills ₹10 |
| AT-04 | Tap atta rate 52 → 55 | Toast; next bill auto-fills ₹55/kg |
| AT-05 | "Atta 58 ka, sirf is baar" | This bill ₹58/kg; memory stays ₹55 |
| AT-06 | "Paav kilo jeera" (jeera ₹600/kg) | 0.25 kg, ₹150 |
| AT-07 | 9 items, "20% discount" on fresh shop | Asks whole vs items. After 5 "whole" answers, 6th applies whole-bill without asking; readback says so |
| AT-08 | Learned phase, "nahi, 20% sirf dal aur chawal pe tha" | Discount moves to those 2 lines; totals recompute; correction recorded |
| AT-09 | "Total 950 kar do" on ₹987 bill | Flat discount ₹37 line, total ₹950 |
| AT-10 | "Chawal hata do", "dal 2 kilo kar do", "nahi nahi ek hi" | All edit correctly |
| AT-11 | "UPI" | On-screen QR with exact amount scans in GPay/PhonePe/Paytm (manual check) |
| AT-12 | "Sharma ji ka bill, 500 diya baaki udhaar" | Sharma ji balance += total − 500 |
| AT-13 | "Aaj ka hisaab?" | Spoken summary matches DB |
| AT-14 | "Sharma ji ko reminder bhejo" | WhatsApp opens with pre-filled polite message, amount, https pay link |
| AT-15 | AT-01, AT-03, AT-07 in Bengali | Same results |
| AT-16 | Reopen finalised bill, edit, re-export | Same bill no., status edited, new PDF/PNG |

AT-11 and AT-14 have a manual on-device check in [DEMO.md](DEMO.md); everything else runs in CI via transcript injection.

## 14. Out of scope
Pricing/subscriptions/paywalls · login/OTP · WhatsApp Business API · auto-sending messages · inventory/stock · GST filing · > 2 languages. GST mode (display only) is a stretch goal after M4.

## 15. Assumptions & open questions
- Single demo shop profile with a simple profile switcher (no auth). Public bill page uses an unguessable `public_id`, not the DB id.
- Payment confirmation for UPI is manual (no PSP integration).
- Contact Picker API works on Android Chrome only; other platforms fall back to typing.
- Open: confirm demo shop's real UPI VPA for live scan test (owner to provide before demo).
