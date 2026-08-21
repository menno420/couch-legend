# Life-story balance — simulator, validation, and the tested proposal

> **Status:** `reference` (simulation results) · 2026-08-20 · the phase-2 planning/testing session
> ([the brief](../planning/2026-08-20-life-story-direction.md) § 7 defines
> done-when; [DESIGN.md § 9](../DESIGN.md) carries the decisions this evidence
> backs).
>
> **Method-ladder label (sim-lab): NUMERIC SIMULATION** — seeded,
> deterministic, parameter-swept, validated against two real hand-played
> browser sessions before any conclusion was drawn. Every number below is
> reproducible from a committed command; nothing is hand-copied from a
> transient run. Verdicts use sim-lab's vocabulary:
> **approve / reject / needs-more-evidence**.

## 0 · Reproduction

```
pnpm check              # typecheck + full test suite (incl. replay parity) + build
pnpm sim dtsense        # integration-step sensitivity
pnpm sim baseline 14 2  # 14-day runs, prototype tuning  → docs/sim/data/baseline-*
pnpm sim sweep 3        # tuning-candidate grid, 3-day probes
pnpm sim invariance     # first-2h proto-vs-candidate comparison
pnpm sim tuned 14 2     # 14-day runs, candidate tuning  → docs/sim/data/tuned-*
pnpm sim fit            # stage thresholds from the tuned balanced curve
pnpm sim analyze tuned  # reach/fairness tables from the tuned dataset
```

The simulator (`src/lib/sim/`) consumes the game's own engine and action
layer (`src/lib/engine.ts` via `src/lib/actions.ts` — the action layer was
extracted from the web store in this session precisely so the UI and the
simulator run one implementation). Randomness is a single seeded mulberry32
stream used only for click-cadence jitter; hits are scheduled per-hit so the
click stream is identical at every integration step size.

## 1 · The instrument, and how much to trust it

### 1.1 Integration

The UI advances the economy in fixed 50 ms steps; the simulator's step is
configurable and its effect measured (`pnpm sim dtsense`, no-prestige 4 h,
shared hit schedule, reference dt = 0.5 s):

| dt | lifeHigh divergence | worst landmark drift |
|---|---|---|
| 1 s | 0.76% | 8 s |
| 2 s | 0.05% | 0 s |
| 5 s | 0.07% | 8 s |

Long-horizon runs use **dt = 2 s**. Long prestige-cycling paths are chaotic
in cycle detail (a purchase-order flip re-times everything downstream), so
cross-seed aggregate stability is what the experiments report; per-seed
detail is never load-bearing.

### 1.2 Validation against reality (the brief's § 6 gate)

Two real sessions were hand-played through Chromium on a local build of
`e4b168b` (this session driving the real UI in real time — decisions written
as a phased plan before the run; `tools/trace/README.md` documents the
method), recorded as action-plus-snapshot fixtures, and replayed through the
engine on the UI's own 50 ms grid (`tests/replay.test.ts`, bands registered
before the first run):

| trace | compared snapshots | replay misses | worst field error |
|---|---|---|---|
| 11-min fresh start (496 hits, 50 buys) | 136 | 0 | high 0.24% · cash 0.68% · buzz 0.57% · totalHits 0.27% · nugs 4.75%* |
| prestige session (live Wake & Bake) | 44 | 0 | all fields ≤ 3.7%*, Clarity exact across the reset |

\* the nugs/cash worsts are absolute residuals of ~2 units on nearly-empty
wallets right after purchases — one 50 ms tick of action-timing skew at
contemporary rates, i.e. recorder resolution, not model error (the same
trajectories carry cumulative flows of ~26 K with sub-percent error).

**What the validation run also caught — in the recorder, not the game:** the
first driver located the hit button by index; when `peakHigh` crossed 400 the
Wake & Bake header button mounted and shifted the indices, after which its
clicks first timed out (t≈240–508 s: nothing recorded, nothing landed — the
real economy ran on idle+auto exactly as the replay predicted) and later
resolved against the wrong elements (t≥510 s: 163 recorded hits that
demonstrably never reached the game — save-file `totalHits` growth equals
roommate auto-hits exactly over that window). Those 163 actions are marked
`phantom` in the committed fixture with this evidence
(`meta.phantomEvidence`); the second driver locates by text and captured a
clean end-to-end prestige. Detail worth keeping: **the replay stayed inside
its bands through the degraded window too** — honest silence in a recording
is handled; only false records had to be annotated.

Zero page errors in both sessions.

**And the envelope check the brief's sentence literally asks for** (added in
Codex review — the replay above validates the engine/action seam, not the
harness): the hand-played session's lifetime-High curve sits inside the
simulator's six-archetype strategy envelope at every snapshot past the first
minute (`tests/replay.test.ts`, ±10 % bound margin; the compared axis is
lifetime High because instantaneous High sawtooths for eager-prestige
archetypes — this trace never prestiged, so its High is its lifetime curve).

### 1.3 What the instrument abstracts away

Strategy players are archetypes (attendance × click rate × buy rule ×
prestige discipline), not humans; achievement pickup and purchase decisions
happen on 5–10 s decision ticks rather than instantly; away time uses the
game's own `applyOffline` exactly. None of these gaps plausibly flips the
findings below, which are all orders-of-magnitude or shape findings — see
§ 6 for limits.

## 2 · Finding 1 — the prototype's loop runs away past its playtested hours

**The current (prototype) tuning, left alone for 14 simulated days, explodes
into numbers six-plus orders of magnitude past its own content.** Baseline
dataset (`pnpm sim baseline 14 2`, three seeds each; agreement across seeds
is tight):

| strategy (proto tuning, day 14) | Clarity banked | lifeHigh | prestiges |
|---|---|---|---|
| idle-only (patient prestige) | **~9.0–9.6 × 10⁷** | ~3.7 × 10¹⁷ | 24 |
| save-for-tiers (patient) | ~6.0 × 10⁵ | ~1.6 × 10¹³ | 25 |
| click-heavy (eager) | ~3.9 × 10⁵ | ~1.1 × 10¹⁵ | ~1 760 |
| spend-everything (eager) | ~3.4 × 10⁵ | ~8 × 10¹⁴ | ~1 775 |
| no-prestige | 0 | ~2.3 × 10¹⁰ | 0 |

For scale: the deepest authored content unlocks at High 2 × 10⁵, the mood
ladder ends at 10⁵, and the number formatter's suffixes end around 10³⁶.
Within two weeks every strategy is orbiting empty multiplier space — progress
with nothing left to buy, feel, or reach, which is precisely what the
fair-upgrades directive forbids (spider-swing's "score multipliers destroy
comparability" finding, reproduced here as an economy rather than a scoreboard).

**The mechanism is structural, and it has two roots:**

1. **Milestone doublings are superlinear feedback.** Output multiplies by
   2^⌊units/25⌋ while cost grows only geometrically per unit — so wealth →
   units → doublings → wealth compounds. Even with prestige removed entirely,
   14 days reaches lifeHigh ~2.3 × 10¹⁰ — and measured unit counts stay
   *under* ~150 per item in that window (sub-cap doublings up to ×32 plus
   job `highRate` scaling linearly with unit count are enough; the deeper
   milestone tiers are beyond-horizon amplification, which is why the cap
   below is insurance rather than a measured-active brake).
2. **Clarity multiplies rates linearly while its own gain brakes only as a
   square root.** Patient prestige discipline (wait until gain ≈ 0.5 ×
   banked) doubles banked Clarity nearly every cycle: under the prototype
   curve that is Clarity 3 261 by **minute 90** of continuous balanced play —
   territory no hand playtest ever visited. The sqrt loses to the milestone
   feedback, and banked Clarity goes exponential with a hours-scale doubling
   time.

An incidental sharp edge the same runs exposed: patient discipline beats
eager (prestige-the-moment-it-lights) by **~200×** on banked Clarity at day
14 under the prototype curve — a strategy cliff far beyond anything "fair".

**Verdict: reject** — the prototype tuning cannot carry an endless-feeling
life story past its first playtested hours. (This is exactly the outcome the
owner's simulator-first directive was for; DESIGN § 8.2 already suspected
the late game was unplaytested.)

## 3 · Finding 2 — one knee and one cap tame it, without touching the playtested hours

The engine gained an **optional tuning parameter** (`Tuning` in
`src/lib/engine.ts`; the default `PROTO_TUNING` reproduces the prototype
formulas exactly and the whole existing test suite plus new identity pins run
through it — the shipped game's behavior is unchanged by this session). Two
candidate brakes were swept (`pnpm sim sweep 3`, grid over knee ∈ {40, 80},
softExp ∈ {0.5, 0.6}, milestone cap ∈ {6, 8, ∞}, probed on the three most
divergent strategies):

- **Clarity knee:** banked Clarity counts linearly up to the knee; the excess
  counts as `excess^softExp`. This is the effective brake — it alone moves
  day-3 balanced Clarity from 2.1 × 10⁷ (proto) to ~7.7 × 10⁴ (knee 40) /
  ~9.2 × 10⁴ (knee 80), and day-3 lifeHigh down six orders of magnitude.
- **Milestone cap:** doublings stop after N (2⁶ = 64× at cap 6). Inert in
  3-day prestige play (units reset before reaching 150), it exists to bound
  the no-prestige/hoarder unit blowup — verified on the 14-day tuned runs
  below.

**Chosen candidate: `clarityKnee 80 · claritySoftExp 0.5 ·
milestoneCapDoublings 6`.** Knee 80 over 40 for early-game invariance; exp
0.5 over 0.6 as the stronger brake at negligible early cost; cap 6 as the
non-prestige backstop.

**Early-game invariance, measured** (`pnpm sim invariance` — 2 h continuous,
proto vs candidate, same seed): spend-everything and click-heavy — the
profiles that resemble how the game was actually playtested — show
**identical Clarity trajectories** ([0, 11, 26, 55] and [0, 14, 39, 85] per
half hour) with worst landmark drift 65 s / 380 s over two hours (a late
prestige-cycle timing). Balanced-patient diverges from ~minute 60
(proto [0, 14, 3 261, 17 010] vs candidate [0, 14, 1 358, 2 048] — the knee's
first bite lands exactly where the runaway begins, and nowhere earlier.

**Adoption is deliberately NOT this session's call to execute:** the game
still runs `PROTO_TUNING`; the proposal is these constants, and the
implementation session flips the default (one place) together with the stage
schema, updating the pinned tests — per the brief's division: this session
plans and tests, the owner feels it in a build after his looks pass.

## 4 · The stage system on the tuned curve — reach evidence

Thresholds were fitted to the measured tuned-balanced lifeHigh curve at the
target cadence (`pnpm sim fit`; the canonical table is
[`../../src/lib/sim/stage-proposal.ts`](../../src/lib/sim/stage-proposal.ts)).
The curve is **bi-phasic** — explosive first day (the sub-knee era), then a
steady ~×1.1–1.2/day — so thresholds follow the economy players actually
experience rather than a tidy geometric ladder.

The simulated economy is today's item availability, and after Codex review
that is the **decided** system, not an approximation: DESIGN § 9.4's
corrected rule makes stage assignments for existing content era *framing*
(scenes/beats), never availability gates — the first draft's two-key gating
of existing items would have locked the playtested opening behind a
~30-minute stage and invalidated these curves. Real stage gates exist only
on not-yet-authored **additive** content (arc-1 prologue, arc-3 batches),
which can only speed pacing, bounded and re-checkable at implementation.

Median reach times (exact crossing events, three seeds; `ext` = extrapolated
on that run's final-3-day growth, REASONED not measured — `pnpm sim analyze
tuned` prints the full table):

| landmark | balanced | click-heavy-patient | idle-only | click-heavy (eager) | save-for-tiers | no-prestige |
|---|---|---|---|---|---|---|
| The Couch (stage 4) | 31 m | 15 m | 3.1 h | 21 m | 59 m | 8.4 m |
| The Long Sunday (6) | 3.8 h | 2.7 h | 8.8 h | 12.2 h | 4.3 d | 41 h |
| The Operation (9) | 43 h | 37 h | 2.3 d | 6.7 d | ~43 d ext | ~35 d ext |
| Mythic Canopy (13) | 8.2 d | 6.9 d | 9.4 d | ~24 d ext | ~65 d ext | ~59 d ext |
| The Long Afternoon (18) | ~14 d ext | **11.8 d** | ~15 d ext | ~30 d ext | ~72 d ext | ~67 d ext |

The mood ladder stays a first-session arc for attended play (balanced
medians: Baked 5.9 m · Galactic 31 m · Couch Legend 55 m) — the
within-afternoon display works at every stage of the life. An eighth lane,
`zero-click`, is deliberately absent from the table: it never reaches
stage 2, or anything — see F1's measured boundary in § 5.

## 5 · Fairness metrics — measured, with verdicts

Numbers from the final dataset (`docs/sim/data/tuned-*`, 21 runs); the
metric definitions are DESIGN § 9.6 and were refined against this data —
two refinements are called out because they moved:

- **F1 reachability — approve, with its boundary measured and stated.**
  Patient ≤ 15 d (ext), eager ≤ ~30–32 d (ext), degenerate archetypes
  ≤ ~72 d (ext) — nothing past the start threshold is ever walled. The
  boundary took two review rounds to state honestly: round 2 refused
  "nothing walls" while the idle archetype quietly clicked 0.2 Hz (the
  `zero-click` lane and its pin came from that); round 3 refused the
  replacement claim "one hit is enough" — correctly: **1–3 hits freeze
  forever** (High < 4 locks every job, nugs < 10 lock the tray, neither
  replenishes), **4–9 hits** open only the cash/jobs half (unbounded,
  generator-less), **10 hits** open the full game. All three bands are
  pinned by engine-level tests. Making the sub-threshold bands viable
  would need a High or nug trickle — a tuning change rejected as hollowing
  pillar 1, the game's first verb.
- **F2 spread — approve.** Attendance axis (patient): 3.3× at Long Sunday
  → 1.27× by arc 3. Discipline axis: eager trails ≤ 2.6× per stage.
  *Refinement:* the two axes are bounded separately; a single flat "≤ 6×
  across strategies" conflated being-away-for-an-hour with prestige skill.
- **F3 attended dead-time — approve** (scoped, like F1/F4, to playing
  archetypes — the zero-click wall lane's attended blocks are fully dead
  by definition, measured at the 9.9 m attended-block length). Worst
  attended stretch with no offered move, a taken prestige now counting as
  one: balanced 9.9 m · click-heavy-patient 37.5 m (the deep-tail
  post-reset warm-up) · every eager/greedy lane ≤ 50 s. *Refinements:* "a
  move" includes a lit Wake & Bake a patient player declines — strategy
  patience is not dead air; stretches are attended-time only (the first
  cut of this metric silently accumulated away-time across check-in
  sessions and read hours where the player felt minutes); and spans are
  bucketed by the stage at their **start** (Codex caught the first
  analyzer bucketing on the sample after the start, which could misfile a
  span across an arc boundary).
- **F4 check-ins — approve.** 95.9–100 % of check-ins offer a move, for
  every playing archetype (the zero-click wall lane sits outside "playing"
  by F1's boundary).
- **F5 felt upgrades — approve under the corrected two-tier definition.**
  The first draft scored "visible" on engine internals the UI never
  renders (highRate, decay, offlineCap…) — Codex refused it, rightly. As
  corrected: tier (a), instantly-displayed outputs (the nug/s and cash/s
  tiles, the per-click floater) — measured floor **Snack Cache at 4.0 % on
  nug/s** in every lane, double the 2 % rail; tier (b), the five
  deferred-visibility purchases (Hydration, Lava Lamp, The Roommate,
  Blackout Curtains, Meditation Cushion) each has a **named display
  surface** where the player watches it work — the buzz number/bar, the
  Hits tile and balance ticks, the offline report, the Wake & Bake
  preview. No purchase has no surface at all. (Adoption note: the Clarity
  tile's multiplier is now routed through `clarityMultiplier` instead of
  an inline `1 + e·0.18` — Codex caught that adopting the knee would have
  desynced the display from the engine.)
- **F6 the prestige promise — approve as restated, with the rail scoped in
  review twice.** The rail (median rebuild ≤ 0.95× the previous cycle)
  applies to **patient-discipline lanes** — measured 0.90–0.93 late,
  inside it, with the 1–3 unrecovered cycles per ~50–70 now counted
  instead of dropped. The eager exclusion's rationale was itself corrected
  by a review catch: round 2 refused the unqualified rail (three lanes
  read 1.00); the survivorship fix from round 3 then showed the eager
  truth is starker than "ratio 1.00" — **~91 % of eager cycles never
  regain the previous peak at all** (2 858 of 3 149 click-heavy cycles
  unrecovered; Meditation-Cushion and achievement bonuses relight +1 at
  ever-lower peaks), so rebuild time is undefined for that discipline and
  its progression is banked-count accumulation across micro-cycles.
  Banked Clarity strictly grows in every lane. The prototype's compounding
  "dramatically hotter" is gone by design — it WAS the runaway. Late cycles
  pay in story cadence; DESIGN § 9.5 records the trade for the owner to
  feel and veto.

**Overall verdict on the proposal (tuning candidate + stage table):
approve** — with the § 6 limits, and with adoption deliberately left to the
implementation session (the live game is untouched this session).

**Needs-more-evidence (named, not hidden):**

- Post-day-14 tail behavior is extrapolated, not simulated; a longer-horizon
  run belongs to the session that adopts the tuning.
- The deep-tail post-reset warm-up (37.5 m worst) is inside its rail but is
  the first place real players may feel drag — the Clarity-spend shop
  (DESIGN § 8.1) is the designed relief and stays OPEN.
- Archetype realism: policies are archetypes; a real player mixes them. The
  spread bounds bracket the mix but no human trace beyond the two § 1.2
  sessions exists yet.

## 6 · Validity gate (sim-lab, answered honestly)

1. **COMPARABLE TO LIVE?** The engine and action layer ARE the live code
   (imported, not modeled); integration error measured ≤ 0.8 % (§ 1.1);
   replay vs two real browser sessions within registered bands (§ 1.2).
   Abstractions that remain: archetype players, 5–10 s decision cadence,
   achievement pickup on the same cadence. None plausibly flips an
   orders-of-magnitude finding.
2. **UNCORRUPTED?** Determinism pinned by test (same seed → byte-identical);
   three seeds per config with tight agreement (± ~1 % on day-14 lifeHigh);
   no parameter cherry-picking — the full sweep grid is printed by
   `pnpm sim sweep`, and the two mid-analysis corruptions this session hit
   (an analysis pass that read files while a rerun was still writing them,
   and a debug run that silently defaulted to prototype tuning) were both
   caught by cross-checking series-vs-reach consistency and are why the
   final numbers come only from the settled dataset.
3. **ROBUST?** The runaway conclusion holds across every strategy and seed
   (10⁵–10⁸× beyond content); the knee conclusion holds across the whole
   swept grid (every knee/exp combination tames growth by ~6 orders at day
   3); the milestone cap is measured inert through day 14 and is kept as
   beyond-horizon insurance, stated as such.
4. **REPRODUCIBLE?** Committed code, one documented command per experiment
   (§ 0), committed data (`docs/sim/data/`), committed trace fixtures.
5. **LIMITS?** No human playtest of the tuned curve exists (the owner's
   feel pass comes after adoption); extrapolations beyond day 14 are
   labeled; the tuning candidate's constants (knee 80 · exp 0.5 · cap 6)
   were chosen from a coarse grid, not optimized — nearby values behave
   similarly (sweep table), so the choice is a judgment inside a measured
   plateau.

## 7 · What the implementation session takes

1. **Adopt the tuning** by changing `PROTO_TUNING`'s successor in one place
   (make the candidate the new default `Tuning`), updating the identity pins
   in `tests/tuning.test.ts` to the adopted constants.
2. **Add the stage schema**: `lifeHigh` (save v2 + migration per DESIGN
   § 9.4), the `STAGES` table lifted from
   `src/lib/sim/stage-proposal.ts` into `content.ts`, era framing per
   `PROPOSED_STAGE_FRAMING` (existing items keep today's availability —
   real stage gates only on new additive content, per the corrected § 9.4
   rule), revelations re-keyed to `lifeHigh` (fixing the Lore-tab
   permanence defect DESIGN § 9.2 records).
3. **Author arc-1 content** (a small prologue table: 2 generators, 1 job,
   1 ritual is enough for stages 1–3 at the fitted thresholds) and the
   per-stage beats; arc-3 batches A–D can trail.
4. **Art per stage** through the estate's image-prompt / asset-pipeline
   method (DESIGN § 9.7), then the owner's ChatGPT-Work looks pass.
5. Keep `pnpm check` as the one gate; the sim tests keep the simulator
   honest against every future engine change.
