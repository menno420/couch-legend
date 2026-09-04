# Couch Legend — the mechanics map

> **Status:** `binding` — this is the game's canonical design record. The main
> idea, every mechanic and every formula are **mapped and decided** here; the
> implementation in `src/lib/` must match this document, and the unit tests in
> `tests/` pin the load-bearing numbers. Change tuning deliberately: update this
> file, the content tables and the tests in the same commit.
>
> Provenance: the design was prototyped by Grok from one owner prompt
> (see [`ORIGIN.md`](ORIGIN.md)); this document is the decided, durable form of
> what that prototype established, so any future build — including the Android
> build — derives from here rather than re-deriving from the artifact.

## 1 · The idea, in one paragraph (DECIDED)

An **idle stoner sim**. You keep a fictional character on their couch
comfortable and increasingly *elevated* through one satisfying click ("Take a
hit") and a growing web of idle systems that carry on without you: nug
production (Grow), absurd part-time jobs (Work), and permanent lifestyle
upgrades (Rituals). Getting higher unlocks everything; coming down on purpose
(**Wake & Bake**, the prestige) converts a great afternoon into permanent
Clarity so the next one runs hotter. Tone: warm, deadpan, literary — the couch
is a character; the humor is in the flavor text, never at the player's expense.

**Pillars (DECIDED):**

1. **The click must always feel good** — instant art response, floaters, puffs,
   a soft sound. Everything else is allowed to be idle; the hit is not.
2. **Numbers serve mood** — the mood ladder (Lucid → Couch Legend) *is* the
   progression display; raw numbers stay soft-formatted (10, 4.80K, 3.60M).
3. **Away time is respected** — closing the game is a strategy (offline
   progress, Blackout Curtains), never a punishment.
4. **One afternoon, forever** — no energy, no timers that demand attendance,
   no fail state.

## 2 · Resources (DECIDED)

| Resource | Role | Source | Spent on |
|---|---|---|---|
| **High** | Progression axis — unlocks content and moods. Never decreases (except prestige reset). | Hits (`hitHigh` each), jobs' passive `highRate` | Nothing — it is a gate, not a wallet |
| **Buzz** | Volatile multiplier fuel. Decays exponentially; sqrt-scaled into a global multiplier. | Hits (`hitBuzz`), Lava Lamp | Nothing — it works by existing |
| **Nugs** | Primary currency. | Generators, hits (`hitPower`) | Generators, nug-priced rituals |
| **Cash** | Secondary currency. | Jobs, hit trickle (`hitCash`), passive lamp-staring trickle | Jobs, cash-priced rituals |
| **Clarity** | Prestige currency. Permanent. | Wake & Bake | Nothing yet (multiplies passively; a Clarity spend system is an OPEN question) |
| **Hits** | Lifetime counter (manual + roommate auto-hits). | Clicking, The Roommate | Achievement checks |

## 3 · The three loops (DECIDED)

### 3.1 Click loop (seconds)

`Take a hit` → `+hitPower` nugs, `+hitCash` cash, `+hitHigh` high, `+hitBuzz`
buzz → art crossfades toward baked, floaters rise, mood chips advance.

### 3.2 Idle loop (minutes → hours)

Generators produce nugs/s; jobs produce cash/s and a slow passive high/s; the
Roommate auto-clicks; the Lava Lamp feeds buzz against exponential decay;
buzz-driven multiplier feeds back into everything. Fixed-timestep simulation at
**20 Hz**, frame time clamped to 100 ms.

### 3.3 Prestige loop (sessions)

At `peakHigh ≥ 400`, **Wake & Bake** becomes available: reset high, buzz, nugs,
cash, generators, jobs and rituals; keep `lifeHigh` (the story — § 9.2),
achievements ("lore"), revelations and sound preference; bank **Clarity**.
*(The § 9.2 Lore-permanence defect is fixed as of 2026-08-21: revelations key
on `lifeHigh`, which prestige never lowers.)* Clarity multiplies nug output,
cash output, hit power and job high-rate permanently (+18 % each per point,
knee-braked past 80 banked — § 4).

## 4 · The formulas (DECIDED — pinned by `tests/engine.test.ts`)

All constants live in `src/lib/content.ts` (tables) and `src/lib/engine.ts`
(formulas). The implementation is the source of truth for exact values; this
section fixes the *shapes* so a port (e.g. Android) can be verified against it.

- **Cost curve:** unit `n` of an item costs `baseCost × costScale^n`;
  bulk buying is the closed-form geometric series; Max-buy inverts it
  (`log` form), capped at 1000 units per purchase.
- **Milestones:** every 25 owned units of a generator or job **doubles** that
  item's output: `× 2^min(⌊n/25⌋, 6)` — doublings stop at the adopted cap of
  6 (×64; the no-prestige/hoarder backstop, measured inert through day 14).
- **Buzz multiplier:** `1 + √buzz × 0.12` (further scaled by achievement buzz
  bonuses). Applies to nug output, cash output and the passive cash trickle.
- **Buzz decay:** `dB/dt = −decay × B` with
  `decay = 0.012 / (1 + 0.28·water) / (1 + 0.18·snacks)`; the Lava Lamp adds
  `0.18/s` per level; auto-hits add `hitBuzz` per hit.
- **Hit:** `hitPower = (1 + 0.28·sunday) × clarity` nugs;
  `hitCash = 0.9 × hitPower`; `hitHigh = 1 + 0.06·sunday`;
  `hitBuzz = (2.4 + 0.15·sunday) × (1 + 0.06·lighter) × achBuzz`.
- **Job high rate:** `Σ highRate·n × clarity × playlist × (1 + √buzz × 0.04)`.
- **Passive cash trickle:** `0.05 × (1 + log10(1 + high)) × buzzMult` /s — the
  game never fully stalls at zero.
- **Clarity:** multiplier `1 + 0.18 × effective` with
  `effective = min(banked, 80) + max(0, banked − 80)^0.5` — linear through
  the playtested region, sqrt-braked past the adopted knee of 80 (the
  2026-08-21 adoption; sim evidence in `sim/2026-08-20-life-story-balance.md`
  § 3, adoption re-check in `sim/2026-08-21-adoption-check.md`);
  gain on prestige `⌊√(peakHigh / 90) × (1 + 0.22·cushion)⌋ − banked`,
  available only at `peakHigh ≥ 400`, never negative.
- **lifeHigh:** every point of High ever earned — accumulates with every
  hit, tick and offline gain, is never reduced by anything (prestige resets
  the afternoon, never the story), and keys stages and revelations (§ 9.2).
- **Offline:** effective seconds `min(elapsed, cap) × efficiency` with
  `cap = (2 + 2·curtains) h` and `efficiency = 0.45 + 0.10·curtains`
  (so 2 h @ 45 % bare → 12 h @ 95 % maxed). Buzz relaxes toward the
  lamp/roommate steady state `input/decay` along the exact exponential.
  Absences under 8 s or worth ≤ 2 effective seconds are ignored.

## 5 · Content tables (DECIDED — see `src/lib/content.ts`)

- **14 generators** (Rolling Tray 10 nugs → Mythic Canopy 290 B), cost scale
  1.14–1.16, unlock gates on High from 0 to 200 K — including the two arc-1
  prologue rows (Cousin's Pinch, Borrowed Grinder; stage-gated NEW content).
- **13 jobs** (Unemployed Philosopher → Couch Legend), cash plus a small
  passive high rate, cost scale 1.16–1.20 — including the prologue's Corner
  Store Shift (stage-gated).
- **11 rituals**, finite ladders (5–10 levels) split across the two
  currencies: buzz retention (Hydration, Snack Cache), automation
  (The Roommate), global multipliers (Infinite Playlist, Houseplant Wall,
  Pillow Throne), buzz income (Lava Lamp), offline (Blackout Curtains),
  hit scaling (Sunday Forever, The Green Lighter — the stage-gated prologue
  ritual, +6 % hit buzz per level), prestige yield (Meditation Cushion).
- **18 stages** (`STAGES`) — the life-story chapter table (§ 9): id, arc,
  sim-fitted `minLifeHigh` threshold, pressure, asset-scene key and the
  permanent one-line beat. `STAGE_FRAMING` names each item's era (framing
  only — § 9.4); prologue rows additionally carry a real `stage` gate.
- **9 moods** (Lucid 0 → Couch Legend 100 K) — each carries a one-line
  **revelation** unlocked at first reach; *meant* to be permanent through
  prestige (see the § 3.3 known gap — the permanence lands with § 9.2's
  `lifeHigh` re-key).
- **33 achievements**, many carrying small permanent multipliers
  (nug/cash/buzz) so lore is also progression.
- **25 ambient news lines**, **8 hit interjections**.
- Locked items show as `???` below 45 % of their unlock threshold, and by name
  with an "Unlocks at High N" line above it — the shop teases exactly one step
  ahead.

**Content discipline:** new content goes in these tables, not in components;
ids are permanent (saves reference them); unlock thresholds must stay
monotonically increasing per table (pinned by a test). Stage gates (`stage`
field) bind only NEW additive content per § 9.4 — the original 34 items keep
`high ≥ unlockHigh` as their only key, exactly as playtested.

## 6 · Persistence (DECIDED)

- Save = the 18-field JSON object in `src/lib/save.ts` (`SAVE_FIELDS`) —
  **v2** since 2026-08-21 (`lifeHigh` added; a v1 save migrates with
  `lifeHigh = max(high, peakHigh)`, the conservative § 9.4 floor) —
  written to `localStorage` under `couch-legend-save` with a one-slot backup
  (`couch-legend-save-bak`), every 2.5 s and on hide/pagehide.
- **Portable save codes**: `CL1.` + base64(JSON). Import validates shape and
  rejects non-finite/negative numbers; a failed import changes nothing.
- Version field + migration function (`migrateSave`) — any future schema
  change bumps the version and extends the migration, never breaks old saves.

## 7 · Platform architecture (DECIDED) — the Android path

The repo is deliberately layered so the mechanics survive every UI decision:

```
src/lib/content.ts   game data        — pure, platform-neutral
src/lib/engine.ts    all formulas     — pure, platform-neutral, unit-tested
src/lib/format.ts    number/time fmt  — pure
src/lib/save.ts      codec + storage  — codec pure; storage behind two functions
src/lib/audio.ts     WebAudio SFX     — web adapter
src/lib/store.ts     zustand binding  — web adapter
src/components/*     React UI         — web adapter
```

**DECIDED: the Android build wraps this same web build in a native shell
(Capacitor)** rather than rewriting the game natively:

- The engine/content layer is the asset worth protecting; a wrapper reuses it
  byte-for-byte, so web and Android can never drift apart on mechanics.
- The estate already has proven signed-APK release rails on GitHub Actions
  (phone-controller); a Capacitor project slots into the same pattern.
- An idle sim needs no native rendering performance; it needs install, icon,
  offline start, and later notifications/haptics — all Capacitor plugins.
- `vite.config.ts` already accepts `VITE_BASE=./` for a file-served shell.

*Rejected:* a Godot or other engine rewrite (it would fork the tested
TypeScript engine, simulator, saves and panel UI without a rendering need that
justifies it); full Kotlin rewrite (the same mechanics-fork risk); TWA/Bubblewrap
(needs a public HTTPS origin at runtime and Play's PWA criteria; weaker offline
story than bundling the assets).

Steps when the Android slice is picked up: add `android/` via Capacitor,
bundle `dist/`, wire the signing keystore as repo secrets
(phone-controller pattern), release APKs from CI. Until then the PWA manifest
already gives Android users install-to-home-screen.

**WORKING ANDROID HANDOFF:** before the first Android release build, add one
centralized platform seam — not native conditionals scattered through
components:

- preserve the current versioned JSON codec, migrations and portable save code,
  but put persistence behind an asynchronous `SaveRepository` boundary (native
  Preferences is asynchronous); the web backend adapts `localStorage`, while
  the native backend uses Capacitor Preferences and performs a one-time import
  if its WebView storage contains an older save. Browser and installed-app
  storage do not magically sync; the portable code remains the manual bridge;
- route browser visibility and Capacitor app-state events through one
  pause/resume service: pause flushes, resume applies elapsed offline progress
  exactly once, advances the saved timestamp, then flushes again;
- keep safe-area, Android Back, share/clipboard, haptics and optional local
  notifications in platform adapters with web fallbacks;
- build web and Android from the same `dist` and commit, with local fonts and
  art and `VITE_BASE=./`; do not maintain a second native presentation.

These are working integration constraints, not functionality present in the
web prototype today; the Android session may refine the adapter interfaces while
preserving one engine, one save format and one presentation. That slice must add
device tests for pause/resume, upgrade over an installed build,
force-stop/reopen, denied notification permission, Back, system bars, audio
interruptions and airplane-mode cold launch. Store listing, content-rating and
policy review happen before release, once the authored adult story content is
known.

## 8 · Open design questions (OPEN — decided later, on purpose)

1. **Clarity spend** — a small "Morning Routine" shop that spends Clarity on
   permanent perks would deepen prestige. Still OPEN, and now with a reason to
   do it: Cookie Clicker players describe a prestige layer that is only a flat
   multiplier on the same loop as "killing the unique experience of the run",
   and Clarity is currently exactly that shape. Any design must keep § 9.6
   rail 6 (banked Clarity strictly grows every cycle) — an outright spend
   breaks it as written, so the likely shape is allocation, not expenditure.
   See § 11's family portfolio for where it sits.
2. **Balance pass** — RESOLVED 2026-08-21: the sim-tested knee+cap curve is
   the adopted default (identical through the playtested hours, braking the
   measured late-game runaway; § 9.6's rails are the regression bounds).
   Any future tuning change goes through the simulator + this file + the
   pins in one commit. The owner's feel pass on the tuned late game remains
   open — the designed relief valves (§ 9.5) stand ready if it drags.
3. **Android extras** — haptics on hit, local notifications ("the room kept
   going"), cloud save. All post-shell.
4. **Audio breadth** — one puff/chime/blip set today; a low ambient loop is
   the obvious next cue. (The estate has an `audio-prompt` method for this.)

## 9 · The life-story stage system (DECIDED 2026-08-20 — design; content follows)

The owner's phase-2 directive ([the brief](planning/2026-08-20-life-story-direction.md))
made Couch Legend a **life story**: ~18 stages from a first cigarette at
about age 18, through finding weed, to wherever the couch goes after. This
section records the decided *system*. The broad visual and story treatment is
now set by the [Lucid Chronicle looks contract](design/2026-08-21-looks-pass.md);
exact flavor copy, art and the arc-3 content tables are deliberately not built
yet. The balance simulator and tested proposal came first, per the brief; sim
evidence for every number lives in
[`sim/2026-08-20-life-story-balance.md`](sim/2026-08-20-life-story-balance.md).

### 9.1 North star (DECIDED — one measurable sentence, validated in simulation)

> **Every way of playing reaches every stage: an attended first session finds
> weed inside its first half hour, each stage settles into comfort before the
> next one introduces its pressure, a balanced player closes the authored
> story in about two weeks, and nearly every check-in — and every attended
> stretch within its stage's bound — offers something real to buy, feel, or
> reach.**

Chosen, then validated — not assumed from genre folklore (spider-swing's
research: there is no defensible universal pacing law). Measured under the
proposed tuning (median, seeded): the weed pivot at 6–29 min for every
attended archetype, the authored story closing at ~11.8 d (heavy patient
play), ~14 d (balanced), ~15 d (pure check-in idle), and ≥ 96 % of check-ins
offering a move. Evidence: the results doc § 5.

### 9.2 The axis: `lifeHigh` — and the reconciled pillar (DECIDED)

- **`lifeHigh`** = every point of High ever earned, summed across the whole
  save, **never reduced by anything** — a new save field. Stages key on it
  and nothing else: the story is the *life*, and it only moves forward.
- **Wake & Bake resets an afternoon, never the story.** Prestige mechanics
  are untouched; the fiction is re-framed: each prestige is one afternoon of
  the same life, lived hotter. The story axis (stages) rides `lifeHigh`,
  which prestige cannot lower.
- **Pillar 4 reconciled, not dropped.** "One afternoon, forever" was the
  prototype's fiction and the story frame supersedes it; its *mechanical*
  spirit — no energy, no attendance demands, no fail state — is unchanged
  and now reads: **"No afternoon ever fails."** The click stays sacred
  (pillar 1), numbers still serve mood (pillar 2), away time is still
  respected (pillar 3).
- **Moods stay the within-afternoon ladder** (weather); **stages are the
  across-afternoon ladder** (chapters). Both display; they never compete.
- **Revelations re-key from `peakHigh` to `lifeHigh`.** This also fixed a
  real defect found during the design pass: the Lore tab promised
  *"revelations survive Wake & Bake"* but filtered on `peakHigh`, which
  prestige resets — they demonstrably did not survive. `lifeHigh` makes
  the promise true structurally. **Shipped 2026-08-21** with the stage
  implementation — one migration, one schema bump, exactly as planned.

### 9.3 The 18 stages in three arcs (DECIDED structure; names are working titles)

The canonical table (ids, thresholds, pressures, scene keys) lives in
[`../src/lib/sim/stage-proposal.ts`](../src/lib/sim/stage-proposal.ts) —
content-table form, lifted into `content.ts` by the implementation session.
The shape:

| Arc | Stages | What it is |
|---|---|---|
| **1 · Sparks** | 1–3 | Before the Couch Era: the couch begins discarded at parking-lot first light, passes through corner-store nights, then reaches somebody's cousin's living room — where the weed is found. Thin dedicated starter content (a few prologue habits/jobs); completes inside the first half hour. |
| **2 · The Couch Era** | 4–13 | The existing game, framed as ten eras: the current 12/12/10 content tables distributed across the arc by the stage gates below. No existing number changes. |
| **3 · The Legend** | 14–18 | Beyond the ordinary room: four new content batches (A–D, authored later) and the terminal stage, **The Long Afternoon**, which is explicitly endless. |

**Per-stage pressure (the plateau rule):** each stage introduces exactly one
new emphasis — a content batch, an automation class, the prestige unlock
itself — then plateaus into comfort before the next stage opens
(spider-swing lesson 5: plateau + pressure from elsewhere, never runaway
scaling within a stage).

### 9.4 Composition rules (DECIDED — the gate rule corrected in adversarial review)

- **Stage gates bind only content that does not exist yet.** Arc-1 prologue
  rows and arc-3 batches (A–D) carry a real stage key: they appear when
  their stage is reached (and their own High gate passes). They are
  **additive** — new income sources on top of the existing economy, never a
  lock on it.
- **For the existing 34 items the stage assignment is era FRAMING, not a
  gate**: it names which stage's scene and beats reference the item, and
  nothing about availability changes — `high ≥ unlockHigh` remains the only
  key, exactly as playtested. *(The first draft of this rule gated existing
  items on stage too; Codex review of the balance PR caught what that would
  do — lock the playtested opening behind a ~30-minute stage threshold and
  invalidate every fitted curve. Rejected: era-locking the shelf guts the
  tuned opening. The shop's items are props of one life; stages recolor the
  room, not the shelf.)* This also keeps the simulator's economy model
  correct by construction: the proposal's numbers describe today's
  availability, and future additive content can only speed pacing, bounded
  and re-checkable at implementation.
- **Content extends tables, never components** (§ 5 discipline holds: stages
  are one new typed table + one field, not a rewrite).
- **Stage entry is a story beat** — a permanent revelation-class line plus
  the scene change (content later; the system reserves the slot).
- **Save v2 migration:** add `lifeHigh`, initialized to
  `max(high, peakHigh)` for existing saves — a conservative floor (past
  prestiged afternoons are unrecoverable from a v1 save; the story starts
  from the current afternoon). Flagged as MEDIUM, reversible-by-generosity.

### 9.5 What "endless" means after stage 18 (DECIDED, sim-evidenced)

**The terminal era is the prestige loop itself, kept fair by construction:**
cost curves never end, milestone doublings continue to their cap, Clarity
keeps growing (strictly, every cycle), and `lifeHigh` keeps counting. At
simulated day 14 the loop still moves — patient play banks 1–2 prestiges a
day, ≥ 96 % of check-ins offer a move, and lifeHigh still grows ~×1.1–1.2 a
day, comfortably inside the number formatter's ~10³⁶ ceiling for months.

**The trade the tempered curve makes, stated plainly:** under the prototype's
runaway curve every Wake & Bake made the next afternoon *dramatically*
hotter; under the proposed brake the next afternoon regains its peak only
somewhat faster (median 0.85–0.95× the previous cycle). Late-game cycling
therefore pays in **story** — a stage every day or two at authored pacing —
rather than in compounding speed. That is deliberate: stages are what make
the tempered prestige loop worth walking, and the runaway alternative burns
through all authored content inside a day. The designed relief valves if the
tail ever drags in real play: the **Clarity spend shop** (§ 8.1, still OPEN)
and further arc-3 content batches — both slots exist, neither is needed by
current evidence.

### 9.6 Fairness, operationalized (DECIDED — the metrics ARE the definition)

"Fair upgrades / endless feeling" compiles to six numeric checks, measured
per archetype in the simulator (idle-only · click-heavy ·
click-heavy-patient · balanced · spend-everything · save-for-tiers ·
no-prestige). Two strategy axes are deliberately distinguished:
**attendance/clicking/spending** (how you play an afternoon) and **prestige
discipline** (when you end one) — the second is skill expression and is
bounded separately rather than flattened. The bounds below are **regression
rails snapped just above the accepted measured behavior** of the proposed
tuning — future tuning changes must stay inside them, with sim evidence:

1. **Reachability:** every archetype that plays reaches every authored
   stage — patient play in ≤ **16 days**, eager-prestige play in ≤ **5
   weeks**, and even the degenerate archetypes (hoard-everything,
   never-prestige) in ≤ **11 weeks** (tail-growth extrapolation, labeled
   REASONED in the results doc). The minimum-start boundary, measured and
   stated rather than hidden (and sharpened twice in review — "one hit is
   enough" was also false): a fresh save with **fewer than 4 hits** freezes
   forever (High < 4 locks every job, nugs < 10 lock the first generator,
   and nothing replenishes either); **4–9 hits** open the cash/jobs half
   only — an unbounded but generator-less life; **10 hits** open the full
   game. All three bands pinned by test. That is pillar 1 as a fact: the
   game begins with a few hits, and every archetype past that threshold is
   never walled.
2. **Spread bounds:** across the attendance axis at comparable discipline,
   per-stage median reach-time ratio ≤ **4×** at arc 2's midpoint,
   tightening to ≤ **1.5×** by arc 3 (measured 3.3× → 1.27×). Across the
   discipline axis, eager closes the **authored story** ≤ **3×** behind
   patient (measured 2.54× on the frozen dataset · 2.79× adopted).
   *(Wording corrected 2026-08-21, Codex adoption review: the original
   "≤ 3× per authored stage" phrasing never matched its own accepted
   evidence — the frozen dataset it was snapped to already measured ~4.5×
   at mid-arc-2 stages (The Operation: 6.7 d eager vs 36.8 h patient), and
   the "measured ≤ 2.6×" it recorded is the story-close ratio. The
   mid-story shape is deliberate and accepted: eager gain-1 cycling trades
   mid-story pace for Clarity, and the absolute cap on what that can cost
   is rail 1's eager ≤ 5 weeks. A future change that widens the per-stage
   shape beyond ~4.5× still needs fresh evidence and a stated reason.)*
3. **Dead-time bound (attended):** for every playing archetype (rail 1's
   boundary — the zero-click wall lane's attended blocks are fully dead by
   definition), no attended stretch in which the game offers no move —
   nothing affordable, Wake & Bake unlit, and no prestige taken — longer
   than **5 min in arc 1 · 25 min in arc 2 · 45 min in arc 3** (measured
   worsts: 30 s / 20 m / 37.5 m — the deep ones all on the post-reset
   warm-up § 9.5 names).
4. **Check-in bound (away play):** ≥ **90 %** of check-ins offer a move,
   for every playing archetype (measured 95.9–100 %; the zero-click wall
   lane is outside "playing" by rail 1's boundary).
5. **Felt-upgrade floor, two visibility tiers:** (a) the first purchase of
   every item whose effect is an **instantly-displayed output** — the
   nug/s and cash/s tiles, the per-click floater — moves it by ≥ **2 %**
   at the moment it is typically bought; (b) every purchase whose effect
   is **deferred-visible** must have a named display surface where the
   player sees it move (buzz number/bar for Hydration and Lava Lamp, the
   Hits tile and balance ticks for The Roommate, the offline report for
   Blackout Curtains, the Wake & Bake preview for Meditation Cushion) —
   no purchase with no visible surface at all (spider-swing § 2.6's trap,
   kept out by measurement; the first draft scored tier-(a) on engine
   internals the UI never renders — Codex caught it).
6. **The prestige promise, restated to what a bounded curve can keep:**
   banked Clarity strictly grows every cycle, and every started rebuild is
   accounted — completed with its time, counted `unrecovered`, or
   right-censored at the horizon and reported as such; never dropped.
   Three disciplines, three measured rebuild behaviors:
   - **Patient, non-hoarding lanes** (balanced · click-heavy-patient ·
     idle-only) carry the rail: median rebuild ≤ **0.95×** the previous
     cycle (measured late medians 0.90–0.93; one genuinely unrecovered
     cycle across all runs).
   - **Eager gain-1 cycling** sits at median 0.97–1.00 with zero
     unrecovered cycles — structurally: the cycle *ends* at the moment the
     previous peak is re-exceeded and +1 lights, so its ratio can never
     meaningfully beat 1 and the rail does not apply; hotness expresses as
     shorter absolute cycles.
   - **Hoard-everything** (save-for-tiers, patient prestige but deferred
     spending) measures late median **1.00 — outside the rail**, stated
     rather than hidden: hoarding starves rebuild breadth, and the slower
     afternoon is that strategy's chosen price. A boundary the owner may
     veto; making the rail hold for hoarders too would need tuning aimed
     at them specifically, unproposed.
   The late loop pays out in story cadence (§ 9.5); the prototype's
   implicit "dramatically hotter every time" was the runaway itself and is
   deliberately given up. *(Review history, kept because each round moved
   a number: round 2 refused the unqualified rail; the survivorship fix
   then briefly fabricated a "91 % of eager cycles never recover" story
   whose own data refuted it 959/959 — an ordering bug marked cycles
   unrecovered before checking the pre-reset peak; and the round after
   caught the horizon edge — every run's final still-pending rebuild had
   silently vanished from the statistics, now right-censored and counted.
   The figures above are post-fix.)*

### 9.7 The per-stage visual plan (DECIDED plan; production underway)

- **18 scene backdrops**, one per stage (`scene` keys in the stage table):
  the same couch across changing places — parking-lot dusk → corner store →
  cousin's living room → an apartment that ages and accrues objects → evidence
  room → storefront → state room → lunar lounge → mythic canopy → the cosmic
  rooms of arc 3. **The couch is the continuity object.**
- The existing two-state mood crossfade (`couch-lucid`/`couch-baked`) stays
  the *within-afternoon* layer. Because the current anchors are opaque
  paintings, every stage is one registered composition with two matching
  states rather than a third opaque backdrop under one global pair. The
  current pair remains the arc-2 anchor and the style reference for every
  generated scene.
- Production route (later sessions): the estate's `image-prompt` family +
  `asset-pipeline` per delivered image, anchored on the existing art;
  contract = an opaque sRGB 3:4 pair at minimum 900 × 1200,
  `public/art/stages/<stage-id>-lucid.jpg` and
  `public/art/stages/<stage-id>-baked.jpg`, with identical dimensions,
  composition, couch silhouette/position and focal crop. Only light, haze and
  dream details change. Both 4:5 mobile and 3:4 larger crops must pass review.
- A single `STAGE_PRESENTATION` registry owns pair paths or an explicit
  `placeholder` status, alt text, focal position and scene accent. It loads the
  current pair, preloads only the next, lazy-loads the rest, resolves paths
  through `BASE_URL`, and falls back to the last valid/current anchor rather
  than a blank scene. Components do not carry stage-specific path conditionals.
  **Landed 2026-08-21** (`src/lib/presentation.ts`): the three delivered Arc-1
  packages are live entries; the other 15 stages are explicit placeholders on
  the anchor pair until their art passes owner review.
- For delivered entries, registry tests require both files, equal paired
  dimensions and valid focal metadata. Placeholder entries deliberately use the
  current anchor pair until their art passes review. Art production records
  encoded size and decode cost on representative phones before setting a
  delivery budget; this plan does not invent one before the 36 files exist.
- The owner's 2026-08-21 looks pass precedes implementation and art production:
  it is the style contract those later sessions follow. The first three Arc-1
  packages (six state images) are now delivered and owner-approved in
  [`docs/design/2026-08-21-arc-1-scene-packages.md`](design/2026-08-21-arc-1-scene-packages.md).
  They remain dormant until the permanent stage schema and presentation
  registry land; the remaining 15 packages are produced and owner-reviewed
  later, pair by pair.

### 9.8 Still OPEN after the implementation session (2026-08-21)

- **Arc-3 content tables** (batches A–D for stages 14–17) — authored later;
  the stage slots and gate mechanism now exist. *(Arc-1 prologue: DONE —
  four stage-gated rows, sim-checked inside the § 9.6 rails.)*
- The remaining **15 scene packages** (art production + owner QA, pair by
  pair; the registry's placeholder entries are their slots). Additional
  per-stage news lines, dialogue and Postcard vignettes beyond the three
  delivered postcards remain content work; rewards or new state are not
  implied.
- Clarity spend shop (§ 8.1) — unchanged, evidence says not yet needed.
- The owner's feel pass on the tuned late game (§ 8.2).
- Chapter-turn timing refinements as real screens expose them, preserving
  the reduced-motion fallback that shipped with the shell.

## 10 · Verification

`pnpm check` = typecheck + unit tests + production build; the CI `ci` job runs
exactly this, and `substrate-gate` (the kit gate) is the second required check
on `main` since the 2026-08-21 kit seed. The engine tests pin: cost series ↔
max-buy inversion, milestone doubling (and its adopted cap), the clarity knee,
decay and offline shapes including the cap/efficiency ladder, prestige gating
and yield, lifeHigh accrual/migration/prestige-carry, stage-table invariants
and stage gates, the presentation registry, achievement multipliers, content
invariants (unique ids, monotonic unlocks, ladder lengths), and — since
2026-09-04 — the couch: one keepsake per chapter after the first, always
fewer places than keepsakes, a bare couch producing byte-identical rates,
kinds never stacking, deterministic hit echo, bounded auto-buy catch-up,
rate-neutral v2→v3 migration, and the § 11.4 rate-neutral-early-chapters rule
that keeps rail 5a intact. Anything touching
balance or pacing also carries simulator evidence (`pnpm sim`, § 9.6).


## 11 · The couch: keepsakes (DECIDED 2026-09-04 — shipped)

> **Why this section exists.** § 9 gave the game eighteen permanent chapters.
> It did not give them eighteen different things to *do*. Measured at
> `d877ed0` with `tools/stage-evolution.ts` (an instrument that imports the
> live content tables and passes 6 known positives and 5 known negatives):
> **2 of 18 stages gate any new content row, and 0 of 18 introduce a new
> mechanic, verb or system.** Measured from the committed `adopted` simulator
> dataset: a balanced player first-buys **all 38 shop rows within 78
> minutes**, after which **99.6 % of the 14-day authored story** passes with
> no new purchasable row, and **13 of the 18 chapters arrive with nothing new
> to buy**. Sixteen chapters were the same loop with new scenery.
>
> **The same instrument, re-run after this change: `introduce a new MECHANIC`
> goes from 0/18 to 14/18**, with a further **3/18** *deepening* a shape an
> earlier chapter introduced — so **17 of 18 chapters deliver something new**
> and only First Light, the bare couch, delivers nothing. Its self-test grew
> from 13 to **22** checks across the same work, so the after-number is
> measured by a stricter instrument than the before-number.
>
> *(An earlier version of this line said 17/18 introduce a mechanic. That
> conflated a stronger value of an existing shape with a new one — Codex
> CL#19 R3, P1, conceded; the instrument now separates them and every
> published copy of the inflated figure was corrected.)*
>
> Keepsakes are the answer to that, and they are deliberately not a fourth
> economy. Research support and its limits:
> [`research/2026-09-04-long-form-idle-research.md`](research/2026-09-04-long-form-idle-research.md).
> Balance evidence, before and after, with the one stated rail breach:
> [`sim/2026-09-04-couch-balance.md`](sim/2026-09-04-couch-balance.md).
> The wider plan this is phase A of — the six-family portfolio, the full
> 18-stage matrix and what comes next:
> [`planning/2026-09-04-long-form-redesign.md`](planning/2026-09-04-long-form-redesign.md).

### 11.1 The shape

- **Minting.** Entering a chapter for the first time leaves **one keepsake**
  with the couch, permanently. Chapters 2–18 → **17 keepsakes**. Chapter 1 is
  the bare couch. Keepsakes are never bought, never farmed, never random and
  never missable: reaching the chapter is the only way to have one, so no
  amount of grinding produces one and missing a day costs nothing.
- **Slots.** The couch has shelf space, opened by six chapters
  (`SLOT_STAGES`) → **6 places for 17 keepsakes**, plus one net place from
  The Accession Card. There are always fewer places than keepsakes, pinned by
  test at every point in the life — that gap is the decision.
- **Arranging.** Free, instant, reversible, unlimited. No cost, no cooldown,
  no lost progress. *(Antimatter Dimensions charges a Reality to unequip a
  glyph; this game deliberately does not — the no-punishment pillar wins.)*
- **Auto-arrange.** New keepsakes fill FREE places by themselves and never
  displace a player's choice, so a player who never opens the Couch tab is
  never worse off for ignoring it. It skips anything already superseded.
- **Permanence.** Wake & Bake keeps every keepsake and the arrangement. The
  afternoon resets; the couch does not.

### 11.2 The effect vocabulary — ten shapes, no new currency

Every effect transforms a system that shipped before keepsakes did:
`work-nugs` and `grow-cash` cross-wire the two shelves · `buzz-floor` holds
decay above a share of the afternoon's own peak (it can never *add* buzz) ·
`return-gift` banks production while away and pays it on the first hit back ·
`offline-uncap` removes the offline cap at a deliberately worse flat rate ·
`hit-echo` lands every Nth hit twice · `milestone-early` shortens one shelf's
doubling step · `auto-buy` buys the cheapest affordable row on a shelf on a
clock · `clarity-yield` raises the Wake & Bake payout · `shelf` grants places.

Two rules keep the set legible:
1. **Kinds never stack; the strongest of a kind wins.** A later chapter's
   keepsake therefore RETIRES an earlier one and frees its place — the family
   gains depth instead of gaining rows. The UI marks the weaker superseded.
2. **Everything is deterministic.** `hit-echo` is "every Nth hit", not a dice
   roll, so the seeded simulator and the recorded replay traces both survive.
   *(Melvor Idle players name RNG-gated loss as punishment felt without cause;
   determinism is a design choice here, not only an engineering one.)*

### 11.3 Where it lives

`content.ts` (`KEEPSAKES`, `SLOT_STAGES`, `baseSlotsFor`, `keepsakesEarnedBy`)
→ `engine.ts` (`keepsakeEffects` folded into `computeRates`, `advance`,
`applyOffline`, `prestigeGain`) → `actions.ts` (`collectKeepsakes`,
`equipKeepsake`, `unequipKeepsake`, `applyAutoBuy`) → `store.ts` / `save.ts`
→ the **Couch** tab. The simulator consumes the same actions; there is no
second implementation. Save is **v3** (`keepsakes`, `equipped`, `peakBuzz`,
`returnGift`), and the v2→v3 migration grants the chapters a save already
lived while arranging **none** of them — so migration is rate-neutral by
construction and the recorded replay fixtures keep validating the seam they
recorded (`replay.ts` calls `collectAchievements` and deliberately not
`collectKeepsakes`).

### 11.4 What the evidence says (`couch` dataset, 27 runs, 2026-09-04)

The `adopted-*` dataset is frozen as the pre-keepsake **before**; `couch-*` is
the live state. Against the § 9.6 rails:

| rail | before | after | verdict |
|---|---|---|---|
| 1 · reachability | balanced 12.5 d | **12.0 d** | holds; the ~2-week north star is protected |
| 3 · attended dead time | worst 44.8 m (arc 3, bound 45 m) | **38.0 m** | improved where it was tightest |
| 4 · check-ins with a move (≥ 90 %) | balanced 96.9 % | **98.0 %** | improved; all playing lanes ≥ 97.5 % |
| 5a · felt-upgrade floor (≥ 2 %) | 0 of 24 runs below | **1 of 27** | see the boundary below |
| 6 · rebuild ≤ 0.95 (patient lanes) | 0.88 / 0.92 / 0.90 | **0.88 / 0.92 / 0.90** | unchanged |

**Stated boundary, not hidden:** the one sub-2 % reading is the *new*
`keepsake-optimizer` archetype, one seed of three, two rows of 38
(`collective` 0.14 %, `dispensary` 0.89 %, both at 1.25 h). It is the
cross-wire diluting a global tile for a player who deliberately curates the
couch; the affected rows' own displayed output still moves from "idle nugs"
to a real rate on that purchase. An earlier version of this feature broke the
same rail far more widely (idle-only fell to **0.3 %**) by minting the
cross-wire at chapter 2; it now mints at chapter 5, and a test pins that
chapters 2–4 may carry only rate-neutral effect kinds.

**The load-bearing result:** arranging the couch well is worth a great deal of
currency and *nothing* in story progress. `keepsake-optimizer` ends 14 days
with **2.3× the nugs and 1 690× the cash** of the auto-arranging `balanced`
lane, and **0.98× its lifeHigh** — a slightly *slower* life, not a faster one.
Optimising pays inside an afternoon; it is not a route through the story,
which is what keeps idle-first play whole.

**Automation spends spare change only.** A row buys itself only while it costs
at most 25 % of the balance (`AUTO_BUY_RESERVE_SHARE`), and that is a **hard
bound per catch-up, not per round** — the purse is taken once and spent down,
because a per-round quarter would compound to 5.6 % over ten rounds. The bound
is not decoration: with both auto-buy keepsakes equipped and no reserve, the
optimiser lane's check-ins-offering-a-move fell to **64.7 %** against a 90 %
rail, because the room had already bought everything the returning player
might have. The rail stayed where it was and the mechanic changed.

**An absence replays automation at its own boundaries.** `applyOfflineWithAutomation`
splits the away window at the auto-buy interval so a row bought early produces
for the rest of the absence, rather than every purchase landing at the end
against departure rates. **The offline cap is applied once, to the whole
absence, before any splitting** — segmenting an uncapped elapsed and letting
each piece re-cap would multiply the cap, and a test pins that it does not.

**One defect the simulator could not have found.** The behaviour smoke against
the real bundle caught that a player could not take a keepsake off at all:
auto-arrange refilled every free place on every 50 ms tick. The shipped rule
fills a place **the story opened** and leaves alone a place **the player
emptied** (`arrangeModeFor`); the intermediate fix, which placed only freshly
minted keepsakes, was measured to break rail 5a far more widely (idle-only
0.0 %) and was rejected rather than shipped.

## 12 · Monetization (DESIGNED 2026-09-04 — mockups only, no billing)

**Nothing in the repository can take money.** There is no billing SDK, no
receipt verification, no backend and no store-console object. `store-catalog.ts`
holds the catalog and a `BillingAdapter` interface whose only implementation
is `mockBilling`, which has no code path that can complete a transaction. The
preview is behind a **compile-time** flag: an ordinary `pnpm build` — what CI,
the deployed site and the Android shell all run — evaluates
`STORE_PREVIEW_ENABLED` to `false` and the whole tree is dead code.
`pnpm check:store-preview` asserts the emitted bytes and is proven to fire
against a build where the flag is on.

### 12.1 The philosophy, and the evidence under it

- **The authored story is never for sale.** No chapter, no mechanic, no pacing.
- **Permanent, non-gating products only.** Measured in this genre: players
  recommend *permanent* purchases to each other and call *time-limited* boosts
  "whale traps" (Idle Slayer); a collection resented for expecting "perfect
  everything" sits beside a cosmetic set praised precisely because it is "not
  necessary content" (same game, same review corpus).
- **Never sold** (`NEVER_SOLD`, kept as data so a future session must delete a
  line rather than merely forget a principle): the story · time or skips ·
  energy or refills · randomised items · timed boosts · streak insurance · a
  better rate than someone who never spent.
- **No energy, ever.** The genre's own idle time already *is* "a natural
  energy system without the need for an energy currency" (Kongregate, via
  Game Developer); selling refills would regress the genre, not monetize it.
- **No randomised paid items**, so Apple's 3.1.1 loot-box odds-disclosure rule
  is not applicable by design rather than by omission.

### 12.2 The recommended catalog (mock prices, not commitments)

Three permanent, non-gating products plus a bundle: **Keep the Lights On**
($4.99, a Chronicle bookplate) · **The Illustrated Chronicle** ($6.99, the
chapter paintings full-screen and the postcards) · **The Reupholstery Kit**
($2.99, couch and room colourways) · **The Whole Afternoon** ($9.99, all
three). The band is chosen from prices actually read on live store pages in
comparable idle games: **$1.99** (Universal Paperclips iOS) · **$2.99**
(Kittens Game iOS) · **$4.99** (Cookie Clicker Steam, and its ad-free Android
build) · **$9.99** (Melvor Idle, which ships zero microtransactions).

### 12.3 Store requirements, read from the live policy pages (2026-09-04)

These are what a real launch would face. They are **not** blockers for
anything in this repository today.

- **Apple.** The controlling drug guideline is **1.4.3 Physical Harm**, and
  its operative verb is *encourage*, not *depict*. **5.1.1(ix)**'s
  legal-entity and geo-restriction requirements bind apps that facilitate
  real cannabis *sale/service*, which this is not. **3.1.1** requires IAP for
  any in-app unlock; **3.1.1(a)** external purchase links need no entitlement
  on the **US storefront only**.
- **Apple age rating — the number that matters.** The scale is now
  **4+/9+/13+/16+/18+**; *17+ no longer exists*. The
  "Alcohol, Tobacco, or Drug Use or References" descriptor merges references
  and depictions, and maps **Infrequent → 13+, Frequent → 18+, with no 16+
  tier for this descriptor at all**. Couch Legend's core loop is a character
  getting progressively elevated, so the honest answer is **Frequent → 18+**.
  Any store mockup shows an 18+ badge, never 17+.
- **Google Play — and an honest gap.** The Marijuana clause bans *facilitating
  the sale* of marijuana, not depicting it. **But there is no written
  fictional-game exemption for drugs**: the Violence subsection on the same
  page explicitly allows "fictional violence in the context of a game" and the
  drug subsections carry no equivalent sentence. Do not tell anyone Google
  explicitly permits fictional drug depiction — the margin rests on the clause
  being scoped to commerce, not on a carve-out. Separately absolute: no real
  cultivation instructions, and **no character depicted as a minor** using,
  growing or dealing. The IARC questionnaire must be answered honestly;
  misrepresentation is itself sanctionable.

### 12.4 The seven preview states

Store landing · offer cards · offer detail · purchase-confirmation handoff ·
result / owned · restore purchases · unavailable-offline. Every state carries
the same unmissable "DESIGN PREVIEW · NO CHARGE" banner and a provenance line
naming the adapter and whether the connection is live. Review screenshots at
412×915, 1365×900 and 320×844: `node tools/review-shots.mjs dist-store-preview <out>`.
