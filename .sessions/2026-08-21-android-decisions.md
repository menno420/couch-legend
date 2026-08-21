# 2026-08-21 — Android path: capture the decisions before the handoff

> **Status:** `complete` — branch `claude/android-decisions`, PR #10. The two
> ledger entries and the capability finding are committed; close-out below.

- **📊 Model:** opus-5 · docs only

## What is about to happen

The owner reviewed the state of the game and chose the first Android
milestone: a sideloadable APK on his own phone, before any store work. That
choice, its reasoning, the rejected alternatives, and one measured
environment fact (no Android SDK in the agent container — so builds run in
CI) exist only in the review conversation. This lands them in the repo's
decision ledger and capability ledger so the continuation prompt can point
at them instead of carrying them.

Zero game changes: docs only.

## Close-out

**Shipped:** `docs/decisions.md` gains **[D-0002]** (owner directive — the
sideloadable APK is the first Android milestone, with its reasoning and the
two things it rules out) and **[D-0003]** (working choice — APKs build in CI,
forced by the measured absence of an Android SDK in the agent container);
`docs/CAPABILITIES.md` gains the toolchain probe with its exact evidence and
the CI workaround.

**Verify:** `python3 bootstrap.py check --strict` → exit 0 at the flip.
No product code touched, so `pnpm check` is unaffected (last measured green
at `e3de814`: 103 tests, clean build).

**⚑ Left open deliberately** (not recorded as decisions, because they are
not decided): whether Play's 12-tester / 14-day closed-test clock has to be
run again for a second game on the same account — the estate records
establish the rule for a first app and are silent on repeats; and how the
game actually behaves inside an Android web view, which is the whole point
of the milestone D-0002 chooses.

**💡 Session idea:** the two shipped Android products in this estate both
sign from a keystore held as repository secrets, and the recipe is written
down in a third repo. When couch-legend's release workflow lands, that
recipe will exist in three places — worth one shared note rather than a
third copy.

**⟲ Previous-session review:** the visible-progress session (#9) landed a
next-unlock rail while this session's life-story work was in flight, and the
two composed cleanly — its rail reads chapter availability through the same
stage helper the life-story pass introduced, so nothing had to be reconciled
afterwards. Its card and research note are both present and honest about the
inference boundary.
