# What long-form idle games do, and what Couch Legend takes from it

> **Status:** `reference` · 2026-09-04 · research input to
> [`../DESIGN.md`](../DESIGN.md) §§ 11–12. **Research is input to decisions,
> not the deliverable.** Every claim below is tagged, and the tag matters more
> than the sentence.
>
> Contracts this run was launched under, verbatim and filled before the first
> agent spawned: [`2026-09-04-CONTRACTS.md`](2026-09-04-CONTRACTS.md).

## 0 · The measured problem this research was for

Two measurements, both from this repository at `d877ed0`, taken before any
research was read — so the research could not have invented the problem.

**`MEASURED` — stage census** (`tools/stage-evolution.ts`, an instrument that
imports the live content tables and passes 6 known positives, 5 known
negatives and 2 controls; exit 0):

```
gate ANY new content row : 2/18   (corner-store, cousins-couch)
introduce a new MECHANIC : 0/18   (none)
have delivered scene art : 3/18
content rows gated total : 4 of 38 shelf rows
```

**`MEASURED` — shelf exhaustion** (committed `adopted` simulator dataset, 24
runs): a **balanced** player first-buys **all 38 shop rows within 78
minutes**; **99.6 %** of the 14-day authored story then passes with no new
purchasable row; **13 of 18 chapters arrive with nothing new to buy**. Across
every playing archetype the last new row lands between **29 minutes and ~8
hours**, leaving **13.7–14.0 days** of the story with nothing new on the shelf.

That is the redesign's reason to exist, in numbers rather than in a feeling.
*(After the change: the same instrument, with its self-test grown from 13
checks to 22, reports `introduce a new MECHANIC: 14/18`, `DEEPEN an existing
shape: 3/18`, `deliver ANYTHING new: 17/18`.)*

## 1 · Method, and what it deliberately discards

Two waves, 6 agents, 68 findings, 257 tool calls against live sources.
Every finding carried: a **named** comparator, the **verbatim span** it came
from, its URL and date, a self-declared evidence kind, whether it would change
a Couch Legend decision, and whether the claim was **wider than its source**.

A finding was allowed to change a design decision only if
`(not refuted) and changes_couch_legend and named_comparator and (not
already_covered_by) and (not generalization_risk) and evidence_kind`.
The predicate was field-audited (0 unread, 0 undefined fields; exit 0) and
fixture-tested (7 fixtures, 5 die, 2 survive, 0 mismatches; exit 0) **before**
the fleet ran.

**Wave 1: 33 findings → 12 survived.** Causes of death: 13 "confirms what
Couch Legend already does", 8 "claim wider than its source". A rule that kills
64 % of its own input is discriminating rather than decorating.

### What could not be reached (`MEASURED`, and it matters)

`reddit.com` and `old.reddit.com` refuse fetches entirely; `*.fandom.com`
returns **HTTP 402**; `web.archive.org` is unfetchable; `tvtropes.org` 403s;
`wiki.melvoridle.com` 403s. **r/incremental_games is where this genre's design
discourse actually lives, and none of it is in this report.** The community
evidence below is Steam reviews and discussions — a reasonable proxy audience,
not the same audience. Wave 2 was told not to spend calls on those domains.

## 2 · The twelve findings that were allowed to change something

| # | game | kind | what it says |
|---|---|---|---|
| 1 | NGU Idle | developer-stated | A new system unlocks at a specific milestone and is announced **in the game's own voice**, naming the verb and what to do now. |
| 2 | Kittens Game | measured | Religion is not a side pond: Faith → Worship → **a global production bonus on the base economy**. |
| 3 | Cookie Clicker | measured | Once every Heavenly Upgrade is owned, the game's own guide says the remaining activity is grinding the same loop for bigger numbers. |
| 4 | Universal Paperclips | measured | Stage 2 is a **different kind of game** (power balancing, not manufacturing) — the verb changes, not the coefficients. |
| 5 | Universal Paperclips | developer-stated | Lantz signalled the phase change by the protagonist **narratively discarding** what it had optimised for, not by a UI reset. |
| 6 | Universal Paperclips | measured | It ends with a definitive narrative endpoint plus a **bounded** restart, rather than an unbounded numeric tail. |
| 7 | Antimatter Dimensions | measured | Eternity wipes the entire Infinity economy and hands over a **different tree**. |
| 8 | Antimatter Dimensions | measured | After Reality the central decision becomes **which Glyph to equip and build a set around** — a loadout, with a real cost to change. |
| 9 | Realm Grinder | measured | Reincarnation offers a **faction re-pick**: which whole playstyle governs the next cycle. |
| 10 | Melvor Idle | community | Endgame completionism is named **"busywork"** by negative reviewers — the exact shape of Couch Legend's measured 16/18. |
| 11 | Idle Slayer | community | A collection is resented specifically for expecting **"perfect everything"**. |
| 12 | Idle Slayer | community | A cosmetic set is praised specifically because it is **"not necessary content"**. |

### What each one actually changed

- **#8 is the closest named precedent for what shipped.** Keepsakes are a
  loadout: a bounded set of permanent modifiers, curated across resets. The
  one deliberate divergence is stated in DESIGN § 11.1 — AD charges a Reality
  to unequip; Couch Legend charges nothing, because the no-punishment pillar
  outranks the tension that cost would buy.
- **#4 + #5 shaped the verb, and how it is announced.** `auto-buy` keepsakes
  change the player's job from tapping *buy* to deciding *what buys itself* —
  a verb change inside an existing system. Minting happens at a chapter turn,
  with the chapter's own line, not a stat-screen reveal.
- **#2 + #1 fixed the boundary of the mechanic.** Every keepsake effect
  resolves into a system that already existed. Nothing mints a currency.
- **#11 + #12 changed the UI copy, not the mechanic.** The Couch tab shows
  history, never a completion checklist; it says in as many words that nothing
  can be missed and nothing needs completing. Structurally, keepsakes are
  minted by the story, so a completionist grind for them is impossible.
- **#3 + #10 corroborate the measured problem from outside**, which is worth
  more than another confirmation of the solution.
- **#6, #7, #9 are alternatives considered and declined for now**, recorded so
  a later session knows they were weighed: a hard authored capstone with a
  bounded NG+ (#6), a second full prestige layer (#7), a per-prestige
  playstyle re-pick (#9 — the closest relative of the Morning Routine family,
  DESIGN § 8.1).

## 3 · Constraints the research hardened (findings that confirmed, not changed)

These died under the survival rule — correctly, since they change nothing —
but they are why several pillars are now enforced numerically rather than
merely believed.

- **Chores have a shape, and it is named three times independently.** Idle
  Wizard's Wizard Squad ("a 1-hour challenge of doing NOTHING"), Kittens Game
  Blackcoin (an externally-drifting rate you must time), Melvor Township
  (repair costs outrunning yield after 2 hours away). All three are
  *timed windows or maintenance*. Nothing in the couch has either.
- **An active/idle gap large enough to feel obligatory is resented even by
  fans.** An NGU Industries reviewer who *recommends* the game objects to
  needing ~20 active minutes a day; another names the offline penalty as
  **~8×**. Couch Legend's measured optimiser-vs-auto-arranger gap is
  **1.8–1.9× in peak nugs, cash a wash, and 2–4 % *slower* through the
  story** (three seeds, `../sim/2026-09-04-couch-balance.md` § 3; the
  "4.9× / +0.6 %" this line first carried was a horizon-balance snapshot
  that the fixture regeneration showed to be prestige-timing noise) — and
  the story is what gates content, so the gap that matters is the small one,
  and it points the other way.
- **Return-from-absence should feel like anticipation paying off.** Anthony
  Pecorella, in Game Developer: *"The longer you're away from the game, the
  greater your incentive to return."* `return-gift` is that principle as a
  mechanic. Clicker Heroes 2 players report the inverse — an idle game with no
  overnight progress read as a broken promise.
- **RNG-gated loss reads as unearned punishment** (Melvor reviewers). The hit
  echo is "every Nth hit", never a roll.

## 4 · Monetization evidence

**Prices actually read on live store pages**, not recalled: **$1.99**
Universal Paperclips iOS ("No ads, no in-app purchases, full gameplay") ·
**$2.99** Kittens Game iOS · **$4.99** Cookie Clicker on Steam and its ad-free
Android build with compatible saves · **$9.99** Melvor Idle base plus $4.99
expansions, whose developer wrote *"No MTX or IAPs of any kind will be added
to this game. You're safe here."* · **$24.99** Leaf Blower Revolution's
"Premium Pack" bundling premium currency with 30-minute-to-72-hour time skips.

**The split that matters** is not IAP versus no IAP. It is **permanent versus
timed**: Idle Slayer players call its time-limited boosts "whale traps" and
tell each other *"Avoid the time limited boosts, they are not worth it at
all"*, while treating permanent purchases favourably — same game, same review
corpus. Selling time back also invites the belief the wait was inflated; an
Idle Slayer balance patch drew exactly that accusation, contested by longer-
playing players and traced to a documented mechanic rather than confirmed.

Trade press, on why the genre is unusual: a Kongregate executive in Game
Developer attributes part of idle games' appeal to there being *"a natural
energy system without the need for an energy currency"* — so selling energy
refills would move Couch Legend backwards relative to its own genre.

Store policy (read from the live pages, 2026-09-04) is recorded in
DESIGN § 12.3, including one finding worth repeating because it is a **gap,
not a permission**: Google Play's Violence subsection explicitly allows
"fictional violence in the context of a game", and the Marijuana subsection on
the same page carries **no equivalent sentence**. The margin comes from that
clause being scoped to real commerce, not from a written carve-out.

## 5 · Honest limits

- **`UNPROVEN`: that collection systems drive retention.** The strongest
  evidence found anywhere was one Trimps reviewer at 500 hours citing a
  ten-tier Discord role ladder. No retention curve, cohort data, A/B result or
  developer-published number linking a collection, cosmetic or
  world-transformation system to actual retention was found. The attachment
  rationale for keepsakes is `REASONED`, not measured. What *is* measured is
  the fairness-rail effect (DESIGN § 11.4).
- **No developer-authored design rationale was found** for Melvor Idle, NGU
  Idle, Kittens Game or Idle Wizard's unlock cadence. Cadence claims here rest
  on wikis, guides and player discussion.
- **No r/incremental_games evidence at all** (§ 1).
- **The comparator set skews to games with a Steam presence**, because Steam
  is what this environment can read. Mobile-only idle games — the closest
  competitors to an Android Couch Legend — are under-represented.
- **The genre precedent for cannabis-themed games on Google Play** (Weed Firm,
  Hempire and similar being live at Mature ratings) is category feasibility
  only; those are broad slapstick dealer-sims and validate nothing about this
  game's register.
