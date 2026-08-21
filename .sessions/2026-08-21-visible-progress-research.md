# 2026-08-21 — Idle-player research and visible progress

> **Status:** `complete` — branch `research-visible-progress`, PR #9. The
> researched presentation pass is implemented, reviewed, verified and ready
> to merge on the green flip head.

- **📊 Model:** GPT-5 · research + feature build

## What is about to happen

Research what players consistently value and reject in clicker/idle games,
compare those findings with Couch Legend's binding design, then improve one
high-confidence presentation gap without changing the economy, save, rewards,
or simulator contract. The chosen slice makes the next existing within-afternoon
unlock visible, acknowledges reached unlocks, and remains distinct from the
permanent life-story stage ladder.

## Close-out

**Shipped (PR #9, branch `research-visible-progress`):**

- `fb8fee6` — this born-red session card, committed first.
- `2269acd` — the research-backed feature: the pure milestone selector and
  timed presentation hook (`src/lib/progress.ts`,
  `src/lib/useAfternoonGoal.ts`); one shared snapshot provider; compact couch
  cue plus the accessible High-panel rail; the shared 45% shop/rail reveal
  rule; 13 selector, stage-gate, tie, reset, rapid-arrival and completion
  tests; README, research note, idea routing and capability evidence.
- This flip commit — card close-out, current-state/status refresh, shipped
  idea outcome and generated claim withdrawal.

**Research decision:** recurring evidence favors clear goals, visible next
progress, gradual discovery, useful absence, automation relief, completion and
world change. The single global rail is explicitly a Couch Legend-specific
design inference, not a universal treatment directly validated by the cited
studies. It derives only from canonical content and current `lifeHigh`, so it
cannot change a reward, unlock gate, save, timer, economy value or simulator
result.

**Verify (real command tails):**

- `./node_modules/.bin/tsc --noEmit` → exit 0.
- `./node_modules/.bin/vitest run` → `Test Files 9 passed (9)` ·
  `Tests 103 passed (103)`; 13 are the new progress tests.
- `./node_modules/.bin/vite build` → `✓ 1695 modules transformed` ·
  `✓ built in 2.06s`; exit 0.
- `git diff --check origin/main..HEAD` → no output; exit 0.
- Production preview → HTTP 200 at `/couch-legend/`.
- `pnpm check` could not start in this Work runtime: `Network request
  disconnected after 54 ms, before approval could complete`. Its exact three
  constituent commands above all passed; required GitHub `ci` run 32523612084
  passed on feature head `2269acd`.
- `python3 bootstrap.py check --strict` was intercepted before execution by
  the same Work network-approval boundary (`disconnected after 46 ms`); the
  exact repository substrate check therefore runs authoritatively in required
  GitHub `substrate-gate`.
- Initial `substrate-gate` run 32523612060 failed exactly on this card's
  born-red hold. The complete-card flip rerun is the merge gate.

**Capability delta:** appended the environment-specific visual-QA wall to
`docs/CAPABILITIES.md`: this Work runtime serves the production preview but
has no Chrome/Chromium/Firefox executable; the attempted browser archives were
0 MiB. Static narrow-phone/accessibility audit plus all product checks passed;
screenshots require a venue where the recorded Playwright binary is present.

**⚑ decide-and-flag:** no owner action introduced by this presentation-only
pass. PR #7's already-recorded feel pass for chapter turns and tuned late-game
rebuilds remains the open product judgment.

**💡 Session idea:** show plain-language purchase impact for the selected
quantity — “adds X/s · new total Y/s” from the canonical engine, with exact
bulk and milestone behavior. Routed with guards in
`docs/ideas/plain-language-purchase-impact-2026-08-21.md`.

**⟲ previous-session review:** PR #7's life-story card is `complete` on main.
This session verified its `lifeHigh`/`stageUnlocked` presentation seam against
the final merged tree, rebased after every review correction, and passed the
combined 103-test suite. The new rail forecasts only rows available in the
current permanent chapter; it neither leaks future Arc-1 content nor competes
with the story-gold chapter ladder.

**PR:** #9 — READY at open. Feature head `2269acd` passed `ci`; Codex reviewed
that exact head and returned 👍 plus “Didn't find any major issues. Chef's
kiss.” with no inline threads. This close-out flip is the deliberate last
content change; the session merges it only after `ci` + `substrate-gate` are
green on the flip head.

## Codex review trail

- `2269acd` — clean exact-head review, 0 findings, 0 review threads; bot 👍
  and no major issues verdict at 2026-08-21T20:34Z.
- `f6f8eb9` flip gate — product `ci` passed; `substrate-gate` correctly caught
  three missing/invalid standard badge tokens in the new research/idea docs.
  Corrected on the following metadata-only head before merge; no game file
  changed.
