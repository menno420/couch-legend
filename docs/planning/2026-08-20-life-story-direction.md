# Phase 2 — the life-story direction, and the simulator that gates it

> **Status:** `plan` · recorded 2026-08-20, the adoption session, from the
> owner live in the hub chat. This document is the durable half of a chat
> directive: the next session plans and tests against it instead of
> re-carrying it in a prompt. Owner-stated lines are labelled
> `owner-directive` and are not revisable by a session; `working-choice`
> lines are a session's own and may be revised with a stated reason.
> The mechanics ground truth stays [`../DESIGN.md`](../DESIGN.md); this
> document directs its next amendment.

## 1 · The owner's words (verbatim, 2026-08-20)

> "Eventually I want this to be a fully working android game. What I need is a
> solid base for the mechanics. The main idea should be clearly mapped and
> decided, do you understand what I mean?"

> "I want you to also review spider-swing and then use the continuation prompt
> so the next session can think and create a simulator for this new game so we
> can create a nice endless feeling loop game with fair upgrades. I want there
> to be many stages, starting at about 18 years old starting to smoke
> cigarettes and then finding weed etc. It should tell a whole story with
> multiple well made visuals, the next session shoukd focus on planning and
> testing etc. After that I will fine-tune the looks with chat GPT work, but
> the next claude session can work on improving the game as much as it sees
> fit"

## 2 · Decided (owner-directive)

- `2026-08-20 · owner-directive` · **The game becomes a life-story: many
  stages, starting at about age 18 with cigarettes, then finding weed, etc. —
  a whole story with multiple well-made visuals.**
  why: his stated vision for what Couch Legend grows into.
  rules out: treating the current single-afternoon frame as the finished
  scope; stages as a cosmetic reskin of one unchanged loop.
- `2026-08-20 · owner-directive` · **The loop must feel endless, and upgrades
  must be fair.**
  why: the two qualities he named for the loop itself.
  rules out: progression walls that read as arbitrary; upgrades that fake
  progress instead of changing real play (see § 5, the spider-swing
  corroboration).
- `2026-08-20 · owner-directive` · **The next Claude session focuses on
  planning and testing — think, and create a simulator for this game.**
  why: design decided against evidence before content is built (the same
  order OD-10 mandates estate-wide: run new features through a dedicated
  simulation).
  rules out: building stage content in that session before the simulator and
  the stage design exist; tuning by feel alone.
- `2026-08-20 · owner-directive` · **Division of labor: after the
  planning/testing session, the owner fine-tunes the looks with ChatGPT Work;
  Claude sessions may then improve the game as much as they see fit.**
  why: his explicit sequencing; matches the estate roster
  (fleet-manager `docs/intent.md` § 7).
  rules out: Claude blocking on visual polish that is his ChatGPT-Work lane;
  asking him to re-authorize routine improvements afterwards.
- `2026-08-20 · owner-directive` (earlier the same session) · **Android
  eventually, on this mechanics base.** Path decided in
  [`../DESIGN.md`](../DESIGN.md) § 7 (Capacitor shell). Unchanged by this
  directive; it sequences after the design/simulator work.

## 3 · Open — deliberately, for the design session (do not read as settled)

1. **The stage list itself** — how many stages, their names, what each
   unlocks, where the story goes after the couch era. The owner gave the
   opening (18, cigarettes → weed) and the quality bar ("a whole story"), not
   the list.
2. **How stages compose with the existing loop** — chapters over the current
   High axis? A stage-scoped remix of generators/jobs per era? How Wake &
   Bake (prestige) interacts with story progress (does coming down rewind the
   story, or is the story permanent like revelations?). The current
   DESIGN.md § 1 pillar "One afternoon, forever" must be **explicitly
   reconciled, not silently dropped** — the story frame supersedes the
   single-afternoon fiction, the no-fail no-attendance spirit of that pillar
   stays unless the owner says otherwise.
3. **What "endless feeling" means after the last authored stage** — an
   infinite terminal era, generated remix, prestige-driven loop. Needs a
   decided answer with sim evidence.
4. **Fairness, operationalized** — the simulator needs numeric definitions
   (see § 6) before any tuning; the definitions themselves are design
   decisions to record.
5. **Visual plan per stage** — which scenes/art each stage needs, produced
   via the estate's generated-art method; the owner polishes with ChatGPT
   Work afterwards. (The estate's `image-prompt` family + `asset-pipeline`
   are the executable method; see § 5.)

## 4 · What the current base already gives this (measured 2026-08-20)

- A pure, platform-neutral engine (`src/lib/engine.ts` + `content.ts`) with
  every formula unit-tested — **a simulator can consume it directly,
  headless, with no UI and no browser.** This is the payoff of the
  mechanics-base decision: simulation is an import, not a rebuild.
- Content lives in typed tables with permanent ids and monotonic unlock
  invariants pinned by tests — a stage system extends tables, it does not
  rewrite components.
- Save schema is versioned with a migration function — stage state can be
  added without breaking existing saves.
- Mood → art crossfade + revelations already prototype the story surface:
  moods are, in miniature, what stages want to be at full scale.

## 5 · The spider-swing review — what transfers (read 2026-08-20)

Reviewed from fleet-manager's Layer-2 folder and spider-swing's own
`docs/current-state.md` + `docs/product/upgrade-and-difficulty-research-2026-08-02.md`
(raw, at main). Six lessons carry directly; each is a constraint on the design
session, not advice:

1. **Write the north star as one measurable sentence** (theirs: "tune core
   feel, difficulty and upgrade impact until excellent play can meaningfully
   reach 25 k+"). Couch-legend's design session must write the equivalent for
   an idle life-story — e.g. per-stage reach-time bands and a no-dead-time
   bound — and record it in DESIGN.md. A target is *chosen and then
   validated*, never assumed from industry folklore (their research: "there
   is no defensible 'experts reach 10× the median' law").
2. **Instrument before tuning.** Their run-evidence system exists precisely
   to make difficulty measurable, and the folder's own note is that nothing
   had used it for a tuning pass yet — build the measurement, then tune from
   it, in that order. For couch-legend the simulator IS that instrument;
   define its metrics before touching a number.
3. **A simulator earns trust by matching reality first.** Their simulation
   bot "still cannot tune the bird — model v4 pumps but sustains far below
   the reference pace in the band where the owner actually plays". An idle
   economy is far more simulable than physics play, but the lesson stands:
   validate the simulator's strategies against a real hand-played session
   before believing its curves.
4. **Fair upgrades — the external corroboration.** Their research doc's
   sharpest finding: score multipliers that inflate numbers without changing
   real play "destroy comparability" (their GDD already forbids fake metres).
   Couch-legend's version: every upgrade must change something the player
   can feel (rate, automation, retention, offline), never a hidden
   multiplier that only relabels the same progress. This is what "fair"
   compiles to.
5. **Difficulty shape: plateau + pressure from elsewhere, not runaway
   scaling** (their Canabalt/Super Hexagon evidence). Idle translation: cost
   curves may grow forever, but the *feel* per stage should plateau into
   comfort before the next stage introduces a new pressure — that is the
   "endless feeling" mechanism, and the simulator must show it.
6. **Defer-by-directive discipline.** Their unlocks/Campaign/monetisation
   are deferred until the core loop is right, by owner directive. Same here:
   no stage content ships before the simulator says the loop under it is
   fair; the design session plans, tests, and proposes — it does not race to
   content.

Also carried: the **generated-art pipeline method** is extracted and
executable (fleet-manager `docs/findings/2026-08-04-generated-art-pipeline.md`
+ the `image-prompt` skill family; traps: despill at full resolution, key by
corner sample). The stage visuals should be produced through it.

## 6 · Simulator sketch (working-choice — the design session owns the real spec)

- `2026-08-20 · working-choice` · Headless TypeScript harness in couch-legend
  (`tools/simulate.ts` or `src/lib/sim/`), importing `engine.ts` directly;
  seeded and deterministic per sim-lab's method ladder ("NUMERIC SIMULATION
  where the dynamics can be modeled — seeded, deterministic"); runs in
  vitest/CI so balance claims are reproducible.
  why: the engine is already pure; a second implementation would drift.
- Strategy players to compare: idle-only · click-heavy · balanced ·
  spend-everything · save-for-tiers. Outputs per strategy: time-to-each
  unlock/stage, dead-time distribution (stretches with nothing affordable and
  nothing imminent), prestige cadence and its payoff curve, and
  per-stage feel summaries.
- Fairness metrics to propose (design session refines + records): no dead
  stretch beyond a bound at any stage; every upgrade purchasable at its stage
  changes a visible rate by a felt amount; strategies differ in speed, not in
  reachability — every strategy eventually reaches every stage.
- Validation step (lesson § 5.3): one hand-played reference session's curve
  must sit inside the simulator's strategy envelope before tuning begins.

## 7 · Done-when, for the next session

1. DESIGN.md amended: stage system decided (list, composition with
   High/prestige, the endless-tail answer, the reconciled pillar), the
   north-star sentence written, fairness metrics recorded as decisions.
2. The simulator exists, is seeded/deterministic, validated against a real
   play trace, and committed with a results document (curves per strategy,
   verdict per sim-lab's approve / reject / needs-more-evidence vocabulary).
3. A tested balance + stage proposal — numbers in the content tables, sim
   evidence attached — ready for the owner to feel in a build. Content/art
   production beyond what the proposal needs is **out of scope** (his
   ChatGPT-Work pass and later Claude sessions own that).
4. `pnpm check` green (typecheck + tests + build); records landed in
   fleet-manager per its session discipline.

## 8 · Tone guard (working-choice, carried from the adoption session)

The story frame (18+, cigarettes → weed → onward) keeps the prototype's
register: warm, deadpan, fictional, never instructional and never at the
player's expense. The humor is the couch's, not a lecture in either
direction.
