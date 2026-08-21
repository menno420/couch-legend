# 2026-08-21 — Milestone A: the first sideloadable Android APK

> **Status:** `in-progress` — branch `claude/couch-legend-android-apk-z62fu3`.
> Born red on purpose: this card stays `in-progress` (and the kit gate stays
> red naming it) until the close-out below is written and the APK has been
> downloaded from a green CI run.

- **📊 Model:** opus-5 · feature build (native shell + CI)

## What is about to happen

The milestone `[D-0002]` chose: wrap the existing web build in the decided
Capacitor shell (`docs/DESIGN.md` § 7) and have CI assemble a **debug-signed**
APK the owner installs on his own phone. The point is not the file — it is the
**measurement**. How this game behaves inside Android System WebView (chapter
crossfades, drifting particles, whether a save survives a force-stop) has never
been observed on real hardware, and every later Android decision is downstream
of that answer.

Scope, deliberately narrow:

- `capacitor.config.ts` + `android/` generated and committed from this session
  (scaffolding needs no SDK); the APK assembled by a new `android` workflow
  (`[D-0003]` — this container has JDK 21 and Gradle 8.14.3 but no Android SDK,
  re-probed at the top of this session).
- Gradle's standard **debug signing**. No release keystore, no repository
  secrets — those belong with the first real release.
- The shell carries the **same** web build via `VITE_BASE=./`: one engine, one
  save format, one presentation. Assets bundled, so first launch works offline.

**Zero game changes.** No mechanics, balance, content or art touched. If the
web view forces a change, it gets raised, not absorbed.

**Not in this milestone** (each deferred with a reason, not forgotten): Google
Play anything (listing, testers, the closed-test clock); release signing; and
DESIGN § 7's WORKING ANDROID HANDOFF list — the async `SaveRepository`
boundary, the pause/resume service, Back/safe-area/haptics adapters, the device
test matrix. That list binds the first *release*; front-loading it would delay
the very measurement this milestone exists to get. It is milestone B, and the
owner's answers from his phone are its inputs.

## The application id

`com.menno420.couchlegend` — taken as the default, stated in the PR while it is
still cheap to object. It is the one hard-to-reverse choice here: changing it
after install means uninstall/reinstall, and it is permanent if the game ever
ships on Play.

## Close-out

*(written at the flip — born red until then)*

## ⟲ Previous-session review

The Android-decisions session (#10) did exactly the job that makes this one
cheap: it moved `[D-0002]`, `[D-0003]` and the toolchain probe out of a review
conversation and into the ledgers, so this session's prompt could point at them
instead of re-carrying the reasoning. Its card was honest about its inference
boundary and left the two genuinely-undecided things (Play's repeat-tester
clock; how the game behaves in a web view) marked open rather than guessed —
the second is precisely what this milestone goes and measures. Its `💡` — that
the estate's keystore recipe will exist in three places once couch-legend
signs a release — stays live and unspent here **by design**: this milestone
debug-signs, so no third copy is created yet.

## 💡 Session idea

*(recorded at the flip)*
