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
sound preference; bank **Clarity**. Clarity multiplies nug output, cash output,
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
  **revelation** unlocked permanently at first reach (kept through prestige).
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

## 9 · Phase 2 — the life-story direction (recorded 2026-08-20)

The owner has directed the next evolution: **many stages telling a whole
story** (starting ~age 18 with cigarettes, then finding weed, onward), an
**endless-feeling loop with fair upgrades**, and a **simulator built before
any stage content** so the design is tested, not guessed. The directive, the
open design questions, the spider-swing lessons and the simulator sketch live
in [`planning/2026-08-20-life-story-direction.md`](planning/2026-08-20-life-story-direction.md) —
the design session amends **this** document with what it decides (stage
system, north-star sentence, fairness metrics), keeping § 1's no-fail
no-attendance spirit unless the owner says otherwise.

## 10 · Verification

`pnpm check` = typecheck + unit tests + production build; CI runs exactly this
(one required-check candidate, per the estate's one-check convention). The
engine tests pin: cost series ↔ max-buy inversion, milestone doubling, decay
and offline shapes including the cap/efficiency ladder, prestige gating and
yield, achievement multipliers, content invariants (unique ids, monotonic
unlocks, ladder lengths).
