# 2026-08-21 — Android path: capture the decisions before the handoff

> **Status:** `in-progress` — branch `claude/android-decisions`. Born-red until
> the ledger entries and the toolchain finding are committed and verified.

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
