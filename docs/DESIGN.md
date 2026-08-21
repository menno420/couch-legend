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
cash, generators, jobs and rituals; keep achievements ("lore"), revelations and
sound preference; bank **Clarity**. *(Known gap: the current Lore view keys
revelations on `peakHigh`, which this reset zeroes — so today they do not
actually survive; § 9.2 records the defect and the `lifeHigh` fix path.)* Clarity multiplies nug output, cash output,
hit power and job high-rate permanently (+18 % each per point).

## 4 · The formulas (DECIDED — pinned by `tests/engine.test.ts`)

All constants live in `src/lib/content.ts` (tables) and `src/lib/engine.ts`
(formulas). The implementation is the source of truth for exact values; this
section fixes the *shapes* so a port (e.g. Android) can be verified against it.

- **Cost curve:** unit `n` of an item costs `baseCost × costScale^n`;
  bulk buying is the closed-form geometric series; Max-buy inverts it
  (`log` form), capped at 1000 units per purchase.
- **Milestones:** every 25 owned units of a generator or job **doubles** that
  item's output: `× 2^⌊n/25⌋`.
- **Buzz multiplier:** `1 + √buzz × 0.12` (further scaled by achievement buzz
  bonuses). Applies to nug output, cash output and the passive cash trickle.
- **Buzz decay:** `dB/dt = −decay × B` with
  `decay = 0.012 / (1 + 0.28·water) / (1 + 0.18·snacks)`; the Lava Lamp adds
  `0.18/s` per level; auto-hits add `hitBuzz` per hit.
- **Hit:** `hitPower = (1 + 0.28·sunday) × clarity` nugs;
  `hitCash = 0.9 × hitPower`; `hitHigh = 1 + 0.06·sunday`;
  `hitBuzz = (2.4 + 0.15·sunday) × achBuzz`.
- **Job high rate:** `Σ highRate·n × clarity × playlist × (1 + √buzz × 0.04)`.
- **Passive cash trickle:** `0.05 × (1 + log10(1 + high)) × buzzMult` /s — the
  game never fully stalls at zero.
- **Clarity:** multiplier `1 + 0.18 × clarity`;
  gain on prestige `⌊√(peakHigh / 90) × (1 + 0.22·cushion)⌋ − banked`,
  available only at `peakHigh ≥ 400`, never negative.
- **Offline:** effective seconds `min(elapsed, cap) × efficiency` with
  `cap = (2 + 2·curtains) h` and `efficiency = 0.45 + 0.10·curtains`
  (so 2 h @ 45 % bare → 12 h @ 95 % maxed). Buzz relaxes toward the
  lamp/roommate steady state `input/decay` along the exact exponential.
  Absences under 8 s or worth ≤ 2 effective seconds are ignored.

## 5 · Content tables (DECIDED — see `src/lib/content.ts`)

- **12 generators** (Rolling Tray 10 nugs → Mythic Canopy 290 B), cost scale
  1.14–1.16, unlock gates on High from 0 to 200 K.
- **12 jobs** (Unemployed Philosopher → Couch Legend), cash plus a small
  passive high rate, cost scale 1.16–1.20.
- **10 rituals**, finite ladders (5–10 levels) split across the two
  currencies: buzz retention (Hydration, Snack Cache), automation
  (The Roommate), global multipliers (Infinite Playlist, Houseplant Wall,
  Pillow Throne), buzz income (Lava Lamp), offline (Blackout Curtains),
  hit scaling (Sunday Forever), prestige yield (Meditation Cushion).
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
monotonically increasing per table (pinned by a test).

## 6 · Persistence (DECIDED)

- Save = the 17-field JSON object in `src/lib/save.ts` (`SAVE_FIELDS`),
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

*Rejected:* full Kotlin rewrite (mechanics fork risk, no benefit at this
scale); TWA/Bubblewrap (needs a public HTTPS origin at runtime and Play's PWA
criteria; weaker offline story than bundling the assets).

Steps when the Android slice is picked up: add `android/` via Capacitor,
bundle `dist/`, wire the signing keystore as repo secrets
(phone-controller pattern), release APKs from CI. Until then the PWA manifest
already gives Android users install-to-home-screen.

## 8 · Open design questions (OPEN — decided later, on purpose)

1. **Clarity spend** — a small "Morning Routine" shop that spends Clarity on
   permanent perks would deepen prestige. Deliberately not designed yet; the
   passive multiplier is enough until real play data exists.
2. **Balance pass** — current tuning is the prototype's, kept faithfully. It
   feels right for the first hours; late-game pacing (Orbital Garden →
   Mythic Canopy) is unplaytested. Tune only with play evidence.
3. **Android extras** — haptics on hit, local notifications ("the room kept
   going"), cloud save. All post-shell.
4. **Audio breadth** — one puff/chime/blip set today; a low ambient loop is
   the obvious next cue. (The estate has an `audio-prompt` method for this.)

## 9 · The life-story stage system (DECIDED 2026-08-20 — design; content follows)

The owner's phase-2 directive ([the brief](planning/2026-08-20-life-story-direction.md))
made Couch Legend a **life story**: ~18 stages from a first cigarette at
about age 18, through finding weed, to wherever the couch goes after. This
section records the decided *system*. Stage **content** (flavor text, art,
the arc-3 tables) is deliberately not built yet — the balance simulator and
the tested proposal come first, per the brief; sim evidence for every number
lives in [`sim/2026-08-20-life-story-balance.md`](sim/2026-08-20-life-story-balance.md).

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
- **Revelations re-key from `peakHigh` to `lifeHigh`.** This also fixes a
  real defect found during this design pass: the Lore tab promises
  *"revelations survive Wake & Bake"* but filters on `peakHigh`, which
  prestige resets — today they demonstrably do not survive. `lifeHigh` makes
  the promise true structurally. (Fix ships with the stage implementation,
  not before — one migration, one schema bump.)

### 9.3 The 18 stages in three arcs (DECIDED structure; names are working titles)

The canonical table (ids, thresholds, pressures, scene keys) lives in
[`../src/lib/sim/stage-proposal.ts`](../src/lib/sim/stage-proposal.ts) —
content-table form, lifted into `content.ts` by the implementation session.
The shape:

| Arc | Stages | What it is |
|---|---|---|
| **1 · Sparks** | 1–3 | Before the couch: the parking-lot first light, corner-store nights, somebody's cousin's couch — where the weed is found. Thin dedicated starter content (a few prologue habits/jobs); completes inside the first half hour. |
| **2 · The Couch Era** | 4–13 | The existing game, framed as ten eras: the current 12/12/10 content tables distributed across the arc by the stage gates below. No existing number changes. |
| **3 · The Legend** | 14–18 | Past the couch: four new content batches (A–D, authored later) and the terminal stage, **The Long Afternoon**, which is explicitly endless. |

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

1. **Reachability:** every archetype reaches every authored stage —
   patient play in ≤ **16 days**, eager-prestige play in ≤ **5 weeks**, and
   even the degenerate archetypes (hoard-everything, never-prestige) in
   ≤ **11 weeks** (tail-growth extrapolation, labeled REASONED in the
   results doc). Nothing is ever walled.
2. **Spread bounds:** across the attendance axis at comparable discipline,
   per-stage median reach-time ratio ≤ **4×** at arc 2's midpoint,
   tightening to ≤ **1.5×** by arc 3 (measured 3.3× → 1.27×). Across the
   discipline axis, eager trails patient ≤ **3×** per authored stage
   (measured ≤ 2.6×).
3. **Dead-time bound (attended):** no attended stretch in which the game
   offers no move — nothing affordable AND Wake & Bake unlit — longer than
   **5 min in arc 1 · 25 min in arc 2 · 45 min in arc 3** (measured worsts:
   30 s / 20 m / 37.5 m — the deep ones all on the post-reset warm-up § 9.5
   names).
4. **Check-in bound (away play):** ≥ **90 %** of check-ins offer a move
   (measured 95.9–100 %).
5. **Felt-upgrade floor:** the first purchase of every item moves a rate
   the player can see by ≥ **2 %** at the moment it is typically bought
   (measured floor: 8 %, Infinite Playlist) — no purchase that buys nothing
   (spider-swing § 2.6's trap, kept out by measurement).
6. **The prestige promise, restated to what a bounded curve can keep:**
   banked Clarity strictly grows every cycle; for **patient-discipline
   lanes** the next afternoon regains its previous peak at median ≤
   **0.95×** the previous cycle's time (measured 0.90–0.93); and the late
   loop pays out in story cadence (§ 9.5). Eager gain-1 cycling is excluded
   from the ratio rail by mechanism, not mercy: prestiging the moment +1
   lights pins rebuild ≈ cycle length under *any* tuning (the cycle IS the
   rebuild), and its hotness expresses as shorter absolute cycles instead.
   The prototype's implicit "dramatically hotter every time" was the
   runaway itself and is deliberately given up.

### 9.7 The per-stage visual plan (DECIDED plan; production is later work)

- **18 scene backdrops**, one per stage (`scene` keys in the stage table):
  the same room/couch through a life — parking-lot dusk → corner store →
  cousin's living room → the apartment aging and accreting objects through
  arc 2 → the cosmic rooms of arc 3. **The couch is the continuity object.**
- The existing two-state mood crossfade (`couch-lucid`/`couch-baked`) stays
  the *within-afternoon* layer, over whichever stage backdrop is active;
  the current pair remains the arc-2 anchor and the style reference for
  every generated scene.
- Production route (later sessions): the estate's `image-prompt` family +
  `asset-pipeline` per delivered image, anchored on the existing art;
  contract = the current scene panel's aspect and crop, `art/stage-<id>.jpg`.
  Then the owner's ChatGPT-Work pass fine-tunes looks, then Claude sessions
  improve freely (owner's stated division of labor).

### 9.8 Still OPEN after this pass (deliberately)

- Arc-1 and arc-3 content tables (numbers proposed in the results doc get
  authored into `content.ts` with flavor by the implementation session).
- Per-stage beats, news lines, achievement extensions — content work.
- Clarity spend shop (§ 8.1) — unchanged, evidence says not yet needed.
- Whether stage entry deserves a celebration moment beyond the toast
  (small UI design, the implementation session's call).

## 10 · Verification

`pnpm check` = typecheck + unit tests + production build; CI runs exactly this
(one required-check candidate, per the estate's one-check convention). The
engine tests pin: cost series ↔ max-buy inversion, milestone doubling, decay
and offline shapes including the cap/efficiency ladder, prestige gating and
yield, achievement multipliers, content invariants (unique ids, monotonic
unlocks, ladder lengths).
