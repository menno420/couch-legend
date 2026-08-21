# 2026-08-21 — Milestone A: the first sideloadable Android APK

> **Status:** `complete` — branch `claude/couch-legend-android-apk-z62fu3`,
> PR #11. Born red until this flip; the close-out, the verify ledger with real
> exit codes, the explicit unmeasured list and the two-round Codex trail are
> below.

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

**Shipped (PR #11):**

- `26fee2d` — this card, born red.
- `a57ba8b` — the shell: `capacitor.config.ts` (app id `com.menno420.couchlegend`,
  webDir `dist`, background `#0b1110`), the generated `android/` Gradle project
  committed, `.github/workflows/android.yml`, `tools/check-shell-assets.ts` +
  `pnpm check:shell` / `pnpm build:shell`, the game's own couch icon replacing
  the Capacitor logo across five densities (legacy square, round, adaptive
  foreground from the maskable source), eleven density-bucketed splash PNGs
  collapsed to one `ColorDrawable`, and `versionName` read from `package.json`.
- `6b2e9bf` — artifact traceability + the ledgers (`current-state`, and three
  `CAPABILITIES` findings).
- `d7d8758` — closed three vacuous-pass holes in the shell checker.
- `f2a54eb` — Codex round 1: build the head, name the splash icon explicitly,
  fix the instrumented test's package id.
- `7c3c8e6` — Codex round 2: a second `merge-tree` job, closing a gap the
  round-1 fix had itself opened.
- This flip commit — close-out, PR body, guard-fires delta.

**Verify (each command run, real exit codes):**

- `pnpm check` → **exit 0** (tsc + 103 vitest + build) at every head, including
  the flip head.
- `python3 bootstrap.py check --strict` → **exit 1** pre-flip, exactly the
  designed born-red hold naming this card (CI log confirms it is the *only*
  finding); **exit 0** at the flip.
- `pnpm check:shell` → 8 checks, **exit 0** — and it was proven to FIRE, not
  merely stay quiet: a bundle built with the default `/couch-legend/` base,
  a deleted chapter painting, and a deleted JS chunk each drove it to **exit 1**,
  and restoring returned it to green.
- CI on `7c3c8e6`: `ci` success · `debug apk` success · `android merge check`
  success · `substrate-gate` failure = the born-red hold only.
- **The APK itself, downloaded and opened in-session** (no SDK needed):
  5.26 MB; `APK Sig Block 42` present and carrying `0x7109871a` =
  **APK Signature Scheme v2**; 27 `assets/public/` entries (8 chapter JPEGs,
  6 local woff2, the JS/CSS bundle); `index.html` referencing `./assets/…`;
  `versionName 0.2.0` and `com.menno420.couchlegend` in the binary manifest,
  with `1.0` absent — so the `package.json` wiring demonstrably took effect.
- **Phone-viewport smoke on the exact bytes destined for the APK** (a static
  server over `android/app/src/main/assets/public` + `playwright-core` +
  `/opt/pw-browsers/chromium`, 412×915 / DPR 2.625 / `hasTouch`): **14/14** —
  mounts, zero console and page errors, **zero off-origin requests**, every
  image decoded, all art paths relative, no horizontal overflow in portrait or
  landscape, taps persist a v2 `lifeHigh` save that survives a reload.
- **Zero game changes, mechanically:** `git diff origin/main...HEAD` is empty
  for `src/`, `tests/` and `public/`.

**⚠ UNMEASURED BY THIS SESSION — there is no SDK, emulator or device here.**
Nothing below was observed by anyone; the smoke above is desktop Chromium at a
phone-shaped viewport, which is not Android System WebView:

- how the game behaves in the real WebView at all;
- app suspend/resume, and whether a save survives a **force-stop**;
- animation smoothness — the chapter crossfades and drifting particles — on
  real hardware;
- what the cold start actually looks like (one unbroken dark colour is
  *configured*, not seen);
- how the launcher icon renders under a given device's icon mask.

Getting those five answered is the entire point of the milestone, and they are
the inputs milestone B is blocked on.

**Codex trail — 2 rounds answered, 6 findings, dispositions countable.** A
third round was requested on `7c3c8e6` (the merge-tree fix) and **never
answered** — no review, no 👍, 20 minutes against the ~7 minutes rounds 1 and 2
each took. That silence is recorded as a null, not read as a clean bill: Codex
is inconsistent on this repo (it produced nothing at all on #9 and #10). So the
merge-tree job carries two rounds of scrutiny on its predecessors and none on
itself, beyond being green on both jobs.

- `[survived]` ×1 — *"AppTheme's `colorPrimary`/`colorPrimaryDark`/`colorAccent`
  are undefined, `assembleDebug` will fail"* (P1). Refuted three ways: those
  colours resolve from the **capacitor-android library's** own
  `res/values/colors.xml` and merge at resource-link time; the template ships no
  app-level `colors.xml`, so the one added here replaced nothing; and
  `assembleDebug` produced a real APK on all three heads carrying the change.
- `[conceded]` ×5 — the APK label vs the tree actually built (P1) · vacuous
  passes in the shell checker (P2 — already fixed in `d7d8758` before the review
  landed) · the instrumented test asserting the template's package id (P2) ·
  `windowSplashScreenAnimatedIcon` left implicit, **and the README and drawable
  comment asserting how a launch I have never seen looks** (P3) · no Android
  check on the merge tree (P2).

**⚑ decide-and-flag:**

- **App id `com.menno420.couchlegend`** — taken as the default and stated in the
  PR while objecting is still cheap. After an install it costs a reinstall; it
  is permanent if the game ever ships on Play.
- **The `android` workflow is NOT a required status check.** Required on `main`
  remains `ci` + `substrate-gate`. Making it required is a ruleset change the
  owner did not ask for, so it was not made — but it means a future PR could
  redden the APK build without blocking a merge. One line for him to approve if
  he wants it.
- **Debug signing has an upgrade edge.** A debug keystore is generated per build
  machine, so APKs from different CI runs are not guaranteed to share a signing
  key. If a later build refuses to install over this one, it needs an uninstall
  first — **and uninstalling clears the save.** Worth doing the force-stop test
  on this build before replacing it.

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

**A review round that acts on a finding needs another review round, and the
convention does not say so.** Codex's round-1 P1 was right that the artifact
label misattributed the build; the fix — checking out the PR head — was correct
and quietly removed the only thing in the pipeline that compiled the *merge*
tree, which is exactly what its round-2 P2 caught. Neither finding is
interesting alone; the pair is. The repair for a review finding is a code change
like any other, and it is written under the narrowed attention the finding
creates, which is precisely when a new hole is easiest to open. The estate's
adversarial-review convention
(`fleet-manager docs/conventions/adversarial-review.md`) currently defines the
disposition vocabulary but says nothing about re-reviewing after conceding.
**Guard recipe:** the rule would be *"a round that produced any `[conceded]` is
not the last round"* — cheap to state in that convention, and it would have
caught this one without Codex needing to notice.
