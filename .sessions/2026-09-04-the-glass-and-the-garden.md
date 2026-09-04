# 2026-09-04 — The glass and the garden: the one rail breach, and the next scenes

> **Status:** `complete` — landed via PR #20.

- **📊 Model:** fable-5 · xhigh · feature build
- **📍 Venue:** cloud-container
- **🔗 Session:** [session_01EnfPJ65QJYW6FWpKDq3bvk](https://claude.ai/code/session_01EnfPJ65QJYW6FWpKDq3bvk) · "Couch Legend phase B/C/D"

## Previous-session review

Read `.sessions/2026-09-04-the-couch-keepsakes.md` (#19) before starting, and
re-ran its census instrument at `4934955`: **14/18 introduce · 3/18 deepen ·
17/18 deliver**, exit 0 — the handoff's numbers hold at HEAD. It left one
thing open on the code side and one on the owner's: a sub-2 % felt-upgrade
reading in 1 of 27 runs (stated, not tuned away), and the phase-B feel pass
(does arranging the couch feel interesting?). The owner-comments index for
this repo held **0 unconsumed records** at session start, so B has not
arrived; C and D stay gated and this session works the ungated lanes.

## 💡 Session idea

A cross-wire that lets one shelf swamp the other is not a cross-wire, it is
a takeover: the moment The Standing Glass paid more nugs than the whole
garden, every Grow row became decoration for the player holding it. Cap the
cross-wire at a multiple of what the receiving shelf makes itself, and the
two shelves need each other again — a bigger garden raises the ceiling on
what the jobs bring home.

## What is about to happen

1. **Settle the rail-5a breach by tuning, not argument.** Give `work-nugs`
   and `grow-cash` a `ceiling` (a multiple of the receiving shelf's own base
   output) so the dilution of a first Grow purchase is bounded by
   construction; thread it through `computeRates`, the purchase preview
   (which must not promise cross-wired nugs the cap withholds), the Couch
   tab's plain-language line, and the pins. Re-run the 27-run `couch`
   dataset and re-check every § 9.6 rail.
2. **Phase E, the art lane:** scene-package prompts for the next unpainted
   chapters, anchored on the delivered arc-1 pairs, via the estate's
   `image-prompt` method.
3. Ask the owner for phase B in one line; do not start C on a guess.

## What changed

- `content.ts` — `work-nugs` / `grow-cash` carry a `ceiling`: The Standing
  Glass 10 % up to 1× the garden · The First Follower 30 % up to 3× · Earth
  in the Window 6 % up to 1× the Work shelf. Surface strings say so.
- `engine.ts` — `crossWire()` is the one place the rule lives; `computeRates`
  folds it and exposes `Rates.shelves` (both base outputs and what each
  cross-wire actually sends) so nothing downstream re-derives the cap;
  `keepsakeEffects` carries share and ceiling together, never one of each.
- `purchase-impact.ts` / `purchase-impact-format.ts` — the cross-wire line
  is the *economy's* before/after, not `share × the row`, with a `capped`
  flag; the formatter says "the garden is the ceiling" instead of "+0 nugs".
- `CouchTab.tsx` — the ceiling in words ("up to as much again as the garden
  grows" / "three times what the garden grows").
- `tests/keepsakes.test.ts` — 13 new pins (208 total): the content shape, the
  fold on both sides of the ceiling, the mirror, share+ceiling travelling
  together, the seed-23 shape swept across Work shelves 1×–1000×, the
  uncapped arithmetic reproduced so the pin knows what it guards, the
  preview promising exactly what the tile moves by (capped, uncapped, and
  the receiver-side lift on a Grow purchase), the Pareto order of same-kind
  cross-wires, and supersession's ceiling tie-break.
- `docs/sim/data/couch-*` regenerated (`pnpm sim couch 14 2`, 8 m 19 s, exit
  0) and `docs/sim/2026-09-04-couch-balance.md` rewritten from the fixtures;
  DESIGN § 11.2 / 11.4; the plan's § 4 rows and § 8 table (A′ done, B asked,
  E prompted); `docs/design/2026-09-04-arc-2-scene-prompts.md` (new).

## Evidence at this head

- `pnpm check` → exit 0 (tsc · 208 tests · build · store-preview clean),
  re-run at `dc590ec` after the round-1 fixes.
- `node tools/smoke-couch.mjs` against `dist/` → **30 passed, 0 failed**,
  re-run at `dc590ec`.
- `pnpm exec tsx tools/stage-evolution.ts` → 14/18 · 3/18 · 17/18, exit 0
  (unchanged by the type change, as it should be).
- Rails after regeneration, all 27 runs: story close 12.0 d (≤ 16) · worst
  attended dead 30 s / 17.7 m / 38.0 m (≤ 5 / 25 / 45 m) · check-ins ≥ 96.9 %
  (≥ 90) · **felt-upgrade floor 0 of 27 below 2 %** (was 1 of 27; the seed-23
  rows read 139 / 155 / 163 %) · rebuild 0.88 / 0.92 / 0.90 (≤ 0.95).
- Optimiser vs balanced on a measure that survives prestige timing (peak
  balance over the final three days, three seeds): nugs 1.76× / 1.93× /
  1.82×, cash 0.95× / 1.00× / 0.89×, lifeHigh 0.96× / 0.97× / 0.98×. Before
  the ceiling the same measure read 1.67× / 1.78× / 2.29× — the ceiling
  changed the late game by almost nothing and the early game where it was
  needed.

## Stated, not hidden

- **The optimiser's edge was misreported before this session, twice.**
  DESIGN § 11.4 said "2.3× the nugs and 1 690× the cash"; the sim record said
  4.52× / 0.29×; both were horizon-balance snapshots from the same fixtures
  and disagreed with each other. A balance at the horizon resets at every
  Wake & Bake — regenerating the fixtures moved that ratio from 4.5× to 53×
  on a change that does not touch the late game. Replaced with the
  peak-of-last-3-days measure across all three seeds in both documents.
- **No scene image exists.** The paid Gemini key's prepay is empty (429,
  verbatim on the design doc § 9) and the free tier serves no image model
  (`limit: 0`); [D-0011] authorised the spend and there was nothing to spend.
  The prompts are the deliverable; the two routes to pictures are owner
  asks (`OQ-CL-SCENES-4-6`, `OQ-GEMINI-PREPAY` in fleet-manager). Script
  that made the calls: `gen_scene.py` in the session scratchpad — reads the
  prompt out of the design doc, attaches the anchors as `inline_data`,
  decodes `inlineData` to disk; worth committing under `tools/` the day the
  balance is refilled, not before.
- **The optimiser policy does not know about the ceiling.** It ranks by kind
  and never grows the garden *to* raise the cap; a player who did would
  widen the nug gap, and the story figure under that play is untested
  (sim record § 6).

## Review

Two Codex rounds of the three the cap allows, both on heads that were
pushed before the request: **round 1** at `3fa9785` — 2 findings, both P2,
`[conceded]` × 2 (supersession must mirror the ceiling tie-break and the
table needs a Pareto pin → `dc590ec`; the receiver-side ceiling gain must
reach the preview → `e368b46`, which was already pushed when the finding
arrived); **round 2** at `dc590ec` — 3 findings, all P2 copy,
`[conceded]` × 3 (three surface lines named the wrong trigger; the § 6
caveat said "one seed" of a three-seed result; the card's test count was
stale → `94d5383`). **5 findings, 5 conceded, 0 survived.**

**Residue, stated:** the head that lands carries `94d5383` (three
content strings, one doc sentence, two card numbers) and this flip, which
Codex has not seen; the third round was kept in reserve rather than spent
on copy, per the owner's cadence rule. Verified instead directly against
source: 208 tests, `pnpm check` exit 0 and the 30-check bundle smoke at
`dc590ec`, and the suite re-run green after the copy commit.

## PR

[#20](https://github.com/menno420/couch-legend/pull/20) — flipped complete
at this commit; merged by this session once `ci` reported green on the
flip head (the hub card in fleet-manager records the merge SHA, read from
the tree).

## ⚑ Owner asks (all in fleet-manager `docs/owner-queue.md`)

- **`OQ-CL-COUCH-FEEL`** — phase B, one line: does arranging the couch feel
  interesting? WHERE the Couch tab, chapter 5 (~1.5 h) is the first real
  choice. UNBLOCKS C and D.
- **`OQ-CL-SCENES-4-6`** — run the three arc-2 prompts (ChatGPT project, or
  refill the prepay and a session runs them) and QA the pairs.
- **`OQ-GEMINI-PREPAY`** — optional top-up; only if he wants sessions to
  generate.

## 💡 Idea groomed forward

The peak-of-last-3-days measure should be what `pnpm sim analyze` prints for
the couch comparison, so the next session cannot reach for the horizon
balance again — a ten-line addition to `tools/simulate.ts` next to the
"couch at the horizon" section. Not done here: this PR's fixture regeneration
is already the largest diff, and an analyzer change belongs with the next
economy change that needs it.

## Guard recipe

If a future keepsake adds to a displayed rate, the felt-upgrade bound is
`tests/keepsakes.test.ts` → *a cross-wire never outgrows the shelf it feeds*
→ the swept case; extend the sweep with the new shape rather than adding a
sibling describe. The instrument is `feltImpact` in `src/lib/sim/sim.ts`
(`SHOWN_AXES`), and the rail is read in `pnpm sim analyze couch` § "Upgrade
felt impact".
