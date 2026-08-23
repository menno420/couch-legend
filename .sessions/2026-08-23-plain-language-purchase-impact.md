# 2026-08-23 — Plain-language purchase impact

> **Status:** `in-progress` — branch `claude/plain-language-purchase-impact`.

- **📊 Model:** GPT-5 · high · feature-build

## What is about to happen

Graduate the routed purchase-impact idea into a pure derived engine capability
and a quiet shop preview, so Grow, Work and Ritual rows explain the exact next
purchase before the player buys without changing mechanics, saves, unlocks or
the Lucid Chronicle hierarchy.

## What changed

The shop now asks one pure derived layer for the consequence of a proposed
purchase. Grow and Work compare the row's canonical item-local output before
and after the selected quantity; Max uses the quantity the canonical
`maxAffordable` calculation actually returns. Rituals compare canonical
`computeRates` fields before and after the next level and translate only the
material changes into a short semantic vocabulary. React formats that semantic
result but owns no economy arithmetic.

No economy, Clarity, prestige, unlock, stage, save, offline, achievement,
chapter, Android, art or scene behavior changed.

## Close-out

**Shipped on the PR #17 branch (merge waits for this card's final flip):**

- `bb361cb` — this born-red session card, committed before product code.
- `3d9dfef` — canonical item-local output helpers, the pure purchase-impact
  module, separate formatting, Shop row integration, 16 focused pure tests and
  the promoted/open idea record.
- `c1137f8` — deterministic whole-percentage formatting for offline efficiency.
- Final visual evidence was produced on exact product head `3c53ebf` by run
  `32630729555`; its temporary workflow was then removed before review. The
  persistent capability recipe is in `docs/CAPABILITIES.md`.
- This final close-out/flip — historical guard telemetry restored unchanged,
  capability and session evidence recorded, this session's claim removed.

**Verify:**

- GitHub Actions `pnpm check` (the exact repository product gate) → **exit 0**
  on post-review run `32630602679`: TypeScript, all 121 tests (including 18
  purchase-impact tests), and the Vite production build passed.
- Local `pnpm check` was attempted twice but did not reach pnpm: this Work
  runtime returned `Network request disconnected after 56 ms, before approval
  could complete` (the earlier install attempt returned the same wall after
  73 ms). CI therefore supplies the actual command result; this local runtime
  does not.
- `python3 bootstrap.py check --strict` → **exit 1 before the flip only**, with
  the checker naming this card and reporting `HOLD (by design)` / `This red is
  the designed hold, not a defect`. The post-flip result is recorded by the
  final required check on the flip head.
- Browser interaction/visual run `32630729555` → **exit 0** on exact product
  head `3c53ebf`: `×1`, `×10`, `×100`, funded Max, post-buy affordability refresh,
  zero-affordable Max, keyboard focus, Work cash wording, Hydration wording,
  Sunday cash-per-hit wording, Pillow Throne's Work-cash qualifier, absence of
  row live regions, clipping across every phone ritual preview, runtime errors
  and horizontal overflow all asserted. Logged values were
  `+2.6/s · becomes 5/s`, `+4.4/s · becomes 6.8/s`, `+196/s · becomes 198/s`,
  funded Max `+398/s · becomes 400/s`, then `Nothing affordable yet.` after
  buying. Artifact `9490962758` was downloaded and inspected at true `412×915`
  Grow/Ritual widths and `1365×900` desktop width.
- Android run `32628888490` on product head `c1137f8` → **success**; it built
  the pinned-signer APK without Android source or behavior changes.

**⚑ decide-and-flag:** none. The task introduced no owner decision and leaves
the separate Clarity-spend/Morning Routine idea untouched.

**💡 Session idea:** make the proven narrow-shop production-build browser smoke
a permanent, dependency-pinned check in a separate infrastructure slice. This
session kept it temporary so a presentation feature did not quietly acquire a
new permanent CI dependency.

**⟲ previous-session review:** reviewed
`.sessions/2026-08-22-android-signing-identity.md` and main's follow-up count
correction (#15). Its pinned signer remained green here, and this feature does
not touch the Android shell or signing path.

**Codex round 1** reviewed exact head `7074da84e5` and raised three P2s, all
conceded: qualify Pillow Throne's cash multiplier as Work cash because the
passive trickle is unaffected; include Sunday Forever's derived cash-per-hit
change; and remove the many simultaneous row live regions. The fixes stay in
the semantic/format layer plus plain accessible text, with focused regression
tests. A clean follow-up review is required before the final flip.

**Codex round 2** reviewed exact head `1d5a85a5f5` and raised four P2s. Three
were conceded: qualify Playlist as Grow + Work output, include canonical
achievement multipliers triggered by the proposed purchase, and render small
hit changes as percentages so they never appear unchanged. One was declined
because it directly conflicts with the binding task brief: Work remains focused
on its existing primary cash-production display and is not redesigned around
passive High. The response records that evidence; a final review must judge the
repaired head.

**PR:** #17 is READY and open until the final card flip, claim deletion, exact-
head strict check, required checks and requested Codex review are all green.
