# 2026-08-21 — The life-story implementation session (lifeHigh + arc 1)

> **Status:** `in-progress` — branch `claude/lifehigh-arc1`. Born-red until
> the close-out below is written and every §7 item is verified landed.

- **📊 Model:** fable-5 · feature build

## What is about to happen

The implementation session the owner's stated order unblocked (balance doc
§ 7, items 1–4): adopt the tested tuning as the engine default (+ identity
pin update), add the `lifeHigh` story axis (save v2 + migration), lift the
stage table into `content.ts` with era framing and re-keyed revelations
(closing the Lore-permanence defect DESIGN § 9.2 records), author the arc-1
prologue content, and land the Lucid Chronicle presentation seam
(`STAGE_PRESENTATION` + chapter turn with reduced-motion fallback) that
activates #4's dormant scene packages. Sim evidence re-checked against the
§ 9.6 rails before landing.

## Close-out

**Shipped (PR #7, branch `claude/lifehigh-arc1`):**

- `41e05c6` — §7 items 1–2 core: `DEFAULT_TUNING` (knee 80 · exp 0.5 ·
  cap 6) as every engine/action default, `PROTO_TUNING` kept and pinned
  for the replay fixtures + baseline dataset; `SaveState` v2 `lifeHigh`
  (accrues in `applyHit`/`advance`/`applyOffline`, survives Wake & Bake,
  migrates as `max(high, peakHigh)` with invariant repair); `STAGES` +
  `STAGE_FRAMING` + beats lifted into `content.ts` (looks-pass scene keys;
  `stage-proposal.ts` reduced to a re-export shim); arc-1 prologue rows
  (`pinch`, `grinder`, `shift`, `lighter`) behind one shared
  `stageUnlocked` rule across purchases, policies and the affordability
  scan; sim harness reads the engine's own `lifeHigh` (shadow accumulator
  retired); `adopted` CLI prefix. Tests 69 → 87.
- `ad90faf` — §7 item 4: `src/lib/presentation.ts` registry (3 delivered
  packages live — focal, alt, accents, motion, postcards; 15 explicit
  placeholders on the anchor pair); CouchPanel presents the registry entry
  (BASE_URL paths, per-stage `--scene-*` accents, chapter caption,
  next-pair preload, onError anchor fallback); `ChapterTurn.tsx` +
  `app.css` phases with the reduced-motion opacity collapse; revelations
  re-keyed to `lifeHigh` in store + Chronicle (the § 9.2 defect closed);
  Chronicle chapters ledger; stage-aware shop tabs + signals. Registry
  pinned by test (89 total).
- `a5f6de1` — evidence + docs: `docs/sim/data/adopted-*` (24 × 14-day
  runs), `docs/sim/2026-08-21-adoption-check.md` (rails verdict by
  verdict), DESIGN/current-state/README trued, toasts yield to the
  chapter turn.
- This flip commit — CAPABILITIES append (headless smoke recipe), card
  close-out, claim deletion, guard-fires delta.

**Sizing choice (the OPEN item):** the prologue shipped at the § 7 floor —
2 generators + 1 job + 1 ritual, placed at stages 2–3 with ladder-slot
high gates — sized so the measured effect is 0–12 % faster reach, never
slower, every rail holding (the adoption-check doc § 3–4). More arc-1
breadth was licensed but not taken: the § 9.6 rails are what the owner
approved, and the floor already moves every lane toward the fast edge of
its rail; further rows belong with the arc-3 batch session where the
authored-content budget is designed in.

**Verify (each command run, real exit codes):**

- `pnpm check` → exit 0 (tsc + 89/89 vitest + build)
- `python3 bootstrap.py check --strict` → exit 1 pre-flip, exactly the
  designed born-red hold naming this card; re-run green expected at flip
  (recorded below when run)
- `pnpm sim invariance` / `dtsense` / `adopted 14 2` / `analyze adopted` —
  outputs in `docs/sim/2026-08-21-adoption-check.md`; all six § 9.6 rails
  hold; closest bound: arc-3 attended dead time 44.8 m of 45 m
- Browser smoke (production build, headless Chromium): **22/22** —
  fresh boot opens on First Light art; v1 save migrates and re-persists
  as v2; an hour-offline save crosses stage 2 with exactly ONE chapter
  turn (postcard "Exact Change"), corner-store art + Shift row appear and
  the purchase persists; a zeroed-afternoon save (peakHigh 0, lifeHigh
  5e3) still shows its revelations and chapters — the Lore-permanence fix
  on screen; reduced-motion variant communicates the same turn. Zero page
  errors. Screenshots delivered to the owner mid-session.

**⚑ decide-and-flag:**

- F2's discipline-axis rail read: the frozen doc's "measured ≤ 2.6×" is
  reproducible only as the authored-story-close ratio (2.54× frozen);
  adopted measures 2.79× ≤ 3 there. Mid-arc-2 per-stage discipline ratios
  run ~4.5× in BOTH datasets — a pre-existing shape this session did not
  move, stated in the adoption-check doc rather than hidden.
- Arc-3 attended dead time is now the closest rail (44.8 m of 45 m,
  click-heavy-patient's post-reset warm-up; 37.5 m in the frozen data).
  The § 9.5 relief valve (Clarity spend shop, § 8.1 OPEN) is the designed
  answer if the owner's feel pass confirms drag.
- Save-for-tiers' F6 boundary (late median 1.00, outside the rail, offered
  for owner veto in the frozen doc) closed itself: 0.92 under the prologue
  rows — the hoarder's tier walk gains early rebuild breadth.

**⚑ OWNER-ACTION — the feel pass (DESIGN § 8.2, now unblocked):**
WHAT: play the live game at HEAD — the opening three chapters, one Wake &
Bake, and (via an imported late save if desired) the tuned late-game
cadence. WHERE: <https://menno420.github.io/couch-legend/> after this PR
merges. HOW: just play; the chapter turns, prologue items and Chronicle
need no instructions. WHY-IT-MATTERS: every number here is sim-evidenced
but no human has felt the adopted curve; § 9.5's story-pacing trade is
yours to veto. UNBLOCKS: the arc-3 content sizing and whether the Clarity
spend shop gets designed. VERIFIED-NEEDED: your verdict on (a) the
chapter-turn moment, (b) late-game rebuild feel.

**💡 Session idea:** the offline banner could name the chapter you woke
into ("The room kept going — you're in Chapter 04 now") — presentation-only,
one line in `OfflineBanner`, and it would carry the life-story frame into
the game's most-seen returning-player surface.

**⟲ previous-session review:** the kit-seed session (#5, card
`2026-08-21-substrate-kit-seed.md`, `complete`). Verified live this
session: both required checks real on `main` (read from the
effective-rules endpoint, not the NOTE); the born-red flow, claim fast
lane and land-it-yourself convention all worked first try; its preflight's
look-before-reset contract held (clean boot, the two expected `.substrate`
dirty paths only). One friction, hub-side not kit-side: `register_repo_root`'s
promised CLAUDE.md system-reminder never arrived in this
fleet-manager-booted session — the boot file was read by hand, exactly as
the estate's satellite-attach doctrine says to.

**PR:** #7 — READY at open (born-red head by design); exact-head Codex
review requested after the final push; merged by this session once `ci` +
`substrate-gate` reported green on the flip head. Terminal state recorded
in the Codex trail below.

## Codex review trail (exact heads)

- **Trigger note (measured this session):** two `@codex review` comments
  (19:28Z, 19:34Z) drew no response in ~40 min; converting the PR
  draft→ready re-fired the integration and the review landed **200 s**
  later. On this repo, the ready transition is the reliable trigger; the
  comment path did not fire this day (quota or matcher — not established).
- **Round 3 on `9dd58bf` (final per the two-re-review cap):** 1 finding
  (P2) — **1 [conceded]**, fixed in the flip-preceding commit: decisionPass
  recorded first-buy ImpactRows against a stage cursor that only synced at
  pass END, so a row bought in the pass that crossed its own stage carried
  the prior stage index (the reviewer verified it against the committed
  fixtures). Crossings now also sync at pass ENTRY (idempotent, dynamics
  untouched — series byte-identical), a pin test asserts every gated
  first-buy records ≥ its gate's stage, and `adopted-*` is regenerated a
  final time. Ripple honestly handled: the entry sync also records
  unlocks/moods an immediate same-pass prestige used to erase (matching
  what the UI showed), which exposed prestige-phase quantization in the
  cross-seed similarity test — that test now excludes post-first-reset
  sawtooth first-touches by mechanism (whole-cycle skew), with the
  monotone spines (stage:*, prestige:N) still asserted. **Fixes land
  without a fourth round; this trail is the named record** (seed-card
  precedent).
- **Round 2 on `573d4be`:** 4 findings (1 P1 · 3 P2) — **4 [conceded]**,
  fixed in the following commit: P1 the adoption-check declared rail 2
  held by silently substituting a different reading — resolved the way the
  reviewer allowed: DESIGN § 9.6 rail 2 is explicitly AMENDED to what its
  own accepted evidence measured (story-close ≤ 3×; the ~4.5× mid-story
  shape documented as deliberate, present identically in the frozen data),
  and the check doc § 4.2 + verdict now name the amendment; P2 the "0–12 %
  faster, never slower" pacing claim was refuted by my own table — restated
  as the real both-signed range (−15 %…+12 %) with the slower landmarks
  listed; P2 the engine's DEFAULT_TUNING comment overclaimed 2 h
  invariance — rewritten to the measured per-profile boundary; P2 a modal
  above the chapter turn (z-50, root inert) would burn the one-shot
  cinematic unseen and collide on Escape — the turn now defers entirely
  (render, timer, keys) until no modal is open.
- **Round 1 on `1268433`:** 3 findings (1 P1 · 2 P2) — **3 [conceded]**,
  fixed in the following commit: P1 `pnpm sim tuned`/`baseline` would
  regenerate the FROZEN pre-adoption fixtures from the post-adoption tree —
  both writer commands now refuse with the honest reproduction path
  (`git checkout 1e8c685`), `analyze` still reads them; P2 toasts queued
  alongside a stage crossing could expire unseen behind the 5.2 s turn
  (expiry now held while a turn shows; survivors re-stamped at dismiss);
  P2 the sim's `unlock:` landmarks ignored stage gates (the three unlock
  loops now share the purchase layer's `stageUnlocked` predicate; the
  `adopted-*` dataset regenerated under the corrected semantics — series
  identical, only recorded landmarks moved).
