# Couch Legend as a long-form game — the plan

> **Status:** `living-ledger` · 2026-09-04. What is DECIDED lives in
> [`../DESIGN.md`](../DESIGN.md) §§ 11–12; this file is the fuller map —
> the portfolio, the 18-stage matrix, the journey, and the phases after this
> one. Evidence: [`../research/2026-09-04-long-form-idle-research.md`](../research/2026-09-04-long-form-idle-research.md)
> and [`../sim/2026-09-04-couch-balance.md`](../sim/2026-09-04-couch-balance.md).
> Speculative ideas are marked `LATER` and are deliberately outside DESIGN.md
> until adopted.

## 1 · What the game was missing, measured

`MEASURED` at `d877ed0`, before any research was read:

- **2 of 18** chapters gate any new content row; **0 of 18** introduce a new
  mechanic, verb or system (`tools/stage-evolution.ts`, 13/13 self-tests).
- A balanced player buys **all 38 shop rows within 78 minutes**; **99.6 %** of
  the 14-day story then has no new row; **13 of 18** chapters arrive with
  nothing new to buy (`adopted` dataset, 24 runs).

So the eighteen chapters were eighteen *thresholds and paintings* over one
loop. The mechanics did not evolve with the life; only the numbers did.

**After phase A, the same instrument reports `14/18` chapters introducing a
new mechanic and a further `3/18` *deepening* one — so 17 of 18 deliver
something new** (22 self-tests, up from 13 — the after-number is measured by a
stricter instrument, not a looser one). The five late chapters that supply a
stronger version of an earlier shape are mastery, not new mechanics, and the
matrix's "later" column is where they belong. What has *not* changed is the shelf:
still `2/18` chapters gating a content row, still `4 of 38` rows behind a
stage. That is deliberate — the shelf is the tuned opening and arc-3 batches
(F5) are the place to widen it, not the keepsake family.

## 2 · The player journey, and where it broke

| moment | before | after this wave |
|---|---|---|
| first launch → first hit | good — the click is sacred and instant | unchanged |
| first meaningful purchase | good — within a minute | unchanged |
| first automation | The Roommate, ~30 min | unchanged, plus the couch's own automation much later |
| **first stage transition** | a painting and a caption | **an object arrives and does something** |
| first prestige | banks Clarity, resets the afternoon | **the couch survives it — visibly** |
| **midgame (day 1 → 8)** | **the break: no new rows, ever** | **a keepsake every chapter; places fill and force choices** |
| late authored chapters | scenery only | keepsakes that RETIRE earlier ones — the set changes shape |
| **stage 18 → endless** | "keep buying the same things" | keepsakes still arrive in the tail; mastery is the `LATER` answer |

The break is between roughly **78 minutes and day 12** — 99.6 % of the
authored story. That is exactly where keepsakes now land: chapters 2–18.

## 3 · The mechanic portfolio — six families, one shipped

A small number of reusable families, each introduced, combined, transformed or
mastered across the story. Not eighteen minigames.

| # | family | status | the decision it creates |
|---|---|---|---|
| **F1** | **The Couch — keepsakes** | **SHIPPED 2026-09-04** | which permanent objects are on the couch right now, out of more than fit |
| F2 | **The Morning Routine** — Clarity as a choice, not only a multiplier | `LATER`, DESIGN § 8.1 | what this life becomes, decided at Wake & Bake |
| F3 | **Arrangements** — automation you configure rather than buy | `LATER`, seeded by F1's `auto-buy` | what buys itself, and in what order |
| F4 | **The afternoon's weather** — an optional per-afternoon emphasis from the chapter's own pool | `LATER` | what this afternoon is for |
| F5 | **Arc-3 content batches A–D** | `LATER`, DESIGN § 9.8 | more shelf, in the era that has none |
| F6 | **The Long Afternoon — mastery** | `LATER` | deepening a keepsake instead of collecting another |

**Why F1 first:** it is the only one of the six that attacks the *measured*
defect directly (every chapter, not every prestige), it needs no new currency,
it cannot touch the Clarity rails, and it is permanent — so it makes prestige
feel like continuing rather than restarting. F2 is the natural second: Cookie
Clicker evidence says a prestige layer that is only a flat multiplier draws
"it kills the unique experience of the run", and Clarity is currently exactly
that shape. **F2 must not become an outright Clarity spend** without new
evidence: § 9.6 rail 6 requires banked Clarity to grow strictly every cycle,
which an expenditure breaks as written. Allocation, not expenditure.

## 4 · The 18-stage mechanics matrix

`new` = what the chapter now introduces. `verb` = the decision it adds.
`ties to` = the existing system it transforms. `after` = how a later chapter
changes it. All 17 keepsakes are shipped and pinned by test.

| # | chapter | arc | new (keepsake) | verb / decision | ties to | idle-safe? | later |
|---|---|---|---|---|---|---|---|
| 1 | First Light | 1 | — (bare couch) | the click | — | yes | the couch fills |
| 2 | Corner Store Nights | 1 | **Exact Change** · return-gift 45 s | none yet — it just works | offline return | yes | mastered at 16 |
| 3 | Somebody's Cousin's Couch | 1 | **Valid Until Morning** · buzz floor 18 % | — | Buzz decay | yes | mastered at 13 |
| 4 | The Couch | 2 | **The Spare Key** · every 5th hit twice | — | the hit | yes | mastered at 17 |
| 5 | Rituals of the Room | 2 | **The Standing Glass** · Work also pays nugs, up to what the garden grows · **+1 place** | first real choice: 2 of 4 — and grow the garden to raise the ceiling | Work ↔ Grow | yes | mastered at 14 |
| 6 | The Long Sunday | 2 | **The Sunday Ledger** · Clarity +12 % | prestige-facing | Wake & Bake | yes | mastered at 18 |
| 7 | Green Thumbs | 2 | **The Cutting** · Grow doubles every 21 | favours depth over breadth | milestone curve | yes | pairs with 8 |
| 8 | A Working Stiff | 2 | **The Name Tag Drawer** · Work doubles every 21 · **+1 place** | which shelf to deepen | milestone curve | yes | pairs with 7 |
| 9 | The Operation | 2 | **The Evidence Tag** · offline uncapped at 30 % | a real trade: long absences win, short ones lose | offline rule | **yes — rewards being away** | — |
| 10 | Local Legend | 2 | **The Window Placard** · Grow buys itself | the verb changes: configure, not tap | purchasing | yes | pairs with 11 |
| 11 | Head in the Cloud | 2 | **The Standing Order** · Work buys itself · **+1 place** | both shelves automated? | purchasing | yes | pairs with 10 |
| 12 | The Garden Upstairs | 2 | **Earth in the Window** · Grow also pays cash, up to what the jobs earn | the mirror of 5 | Grow ↔ Work | yes | — |
| 13 | Mythic Canopy | 2 | **A Jar of That Light** · buzz floor 40 % | **retires ch 3** | Buzz decay | yes | frees a place |
| 14 | The Civilization | 3 | **The First Follower** · Work pays 30 % nugs, up to three gardens' worth · **+1 place** | **retires ch 5** | Work ↔ Grow | yes | frees a place |
| 15 | The Archive | 3 | **The Accession Card** · takes one place, gives two | spend a place to gain places | the couch itself | yes | — |
| 16 | The Long Now | 3 | **The Long Now Clock** · return-gift 300 s | **retires ch 2** | offline return | yes | frees a place |
| 17 | Almost Everything | 3 | **The Overlap** · every 3rd hit twice · **+1 place** | **retires ch 4** | the hit | yes | frees a place |
| 18 | The Long Afternoon | 3 | **The Long Afternoon** · Clarity +35 % | **retires ch 6** | Wake & Bake | yes | the tail's anchor |

**Read the right-hand columns together.** Arc 2 introduces; arc 3 mostly
**retires** — five late keepsakes supersede five early ones, each freeing a
place. That is the family gaining depth rather than the shelf gaining rows,
and it is why the couch does not simply fill up and stop being a decision.

**Deliberately not one new subsystem per row.** Ten effect *shapes* cover
seventeen chapters; six chapters carry a mastered version of an earlier shape.

**The cross-wires carry a ceiling (2026-09-04, #20; owner-confirmed the same
evening, [D-0004]).** Uncapped, The Standing
Glass let a large Work shelf swamp the garden — measured as the one rail-5a
breach in phase A's evidence — so each cross-wire now pays its share of the
sending shelf *up to a multiple of what the receiving shelf makes itself*
(1× for the glass and Earth in the Window, 3× for The First Follower). The
two shelves need each other again; the rails re-measured clean on all 27
runs (`../sim/2026-09-04-couch-balance.md` § 4).

## 5 · Onboarding and unlock cadence

- **Chapter 2 (~4 minutes) is the teaching moment**: one keepsake, one place,
  auto-arranged, announced in the couch's voice with what it does and where to
  watch it. Nothing to decide yet — the mechanic teaches itself by working.
- **Chapter 5 is the first real choice** (a second place, a third keepsake).
- **Chapters 2–4 may only carry rate-neutral effects.** This is a pinned test,
  not a guideline: an early keepsake that raises nug/s shrinks how much the
  next small Grow row appears to add, and that measurably broke § 9.6 rail 5a
  (idle-only fell to 0.3 % against a ≥ 2 % rail) in the first version.
- **Progressive disclosure by construction:** the Couch tab shows a bare-couch
  state naming the chapter that will fill it, and its "+" affordability dot
  only appears when there is a free place and something to put in it.

## 6 · The endless tail

Stage 18 currently continues to mint nothing, because 17 is the last keepsake.
The tail's honest state today: the prestige loop, plus a couch that is
finished. Two `LATER` answers, in preference order:

1. **F6 mastery** — deepen a keepsake already owned rather than collect a new
   one, paid for by something the tail already produces. Keeps the decision
   space alive without authoring more chapters.
2. **F5 arc-3 batches** — more shelf where there is currently none (five arc-3
   chapters frame **zero** shop items today, measured).

Antimatter Dimensions' answer to running out of authored content was to stop
and let the community extend it. Universal Paperclips' was a definitive ending
plus a bounded restart. **Both are legitimate** — the requirement is that the
authored boundary is honest and visible, not that it is hidden behind an
infinite ladder.

## 7 · Explicit non-goals

- No second economy, no new currency. Keepsakes are minted by the story.
- No energy, no timers that demand attendance, no streaks, no FOMO, no
  daily-login anything, no maintenance cost, no decaying asset.
- No randomness in any effect. No RNG-gated loss.
- No mandatory active play: on each of three seeds the optimiser lane peaks
  at **1.8–1.9× the nugs** of the auto-arranging lane over the final three
  days, cash a wash, and closes the story **2–4 % later** — currency, not
  progress (`../sim/2026-09-04-couch-balance.md` § 3; an earlier version of
  this line quoted a horizon-balance snapshot, "4.9× / +0.6 %", which the
  regeneration showed to be timing noise).
- No per-stage conditionals in components; no second simulator; no duplicated
  formula. One content table, one pure derivation, one action layer.
- No real-money anything: no billing SDK, no store console, no receipts.

## 8 · Phases after this one

| phase | what | gate |
|---|---|---|
| **A — done** | F1 keepsakes end to end + IAP preview + evidence | #19 |
| **A′ — done** | The one rail breach A stated, closed by tuning: the cross-wire ceiling, 27 runs regenerated | #20 |
| B | Owner plays the couch and says whether arranging is interesting — **asked 2026-09-04** (fleet-manager `OQ-CL-COUCH-FEEL`); his answer the same evening: *"haven't played yet"* — still open | **owner** |
| C | F2 Morning Routine, designed against rail 6 (allocation, not spend) — **first after B, owner's order** ([D-0005]) | needs B |
| D | F5 arc-3 content batches; F6 mastery for the tail — after C ([D-0005]) | needs B, then C |
| E | The remaining 15 scene packages (DESIGN § 9.8) — **chapters 4–6 prompted** (`../design/2026-09-04-arc-2-scene-prompts.md`, #20); **he runs them in the ChatGPT project himself** (chosen 2026-09-04) and QAs the pairs (`OQ-CL-SCENES-4-6`) | art lane, owner QA |
| F | Real billing: StoreKit / Play Billing behind `BillingAdapter` | **owner-gated** |
| G | Android milestone B (DESIGN § 7) | **owner-gated on device evidence** |

## 9 · Owner-only, and why

- **Whether arranging the couch is actually fun.** Simulation can prove it is
  fair, reachable and idle-safe. It cannot prove it is interesting. That is a
  feel pass, and it is his.
- **Real IAP activation, store console work, final prices, publishing,
  production signing.** Untouched here by design.
- **Android device behaviour.** No container in this estate has an SDK,
  emulator or device; real WebView behaviour stays UNMEASURED.
