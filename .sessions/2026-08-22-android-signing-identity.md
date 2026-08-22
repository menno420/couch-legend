# 2026-08-22 — Milestone B, the unblocked slice: a stable Android signing identity

> **Status:** `in-progress` — branch `claude/couch-legend-milestone-b-w6vwex`.
> Born red on purpose; this holds `bootstrap.py check --strict` at exit 1 until
> the close-out below is written and the status flips as the last commit.

- **📊 Model:** opus-5 · platform/CI slice (no game changes)

## Why this session is not milestone B proper

Milestone B is `docs/DESIGN.md` § 7's WORKING ANDROID HANDOFF list — the
asynchronous `SaveRepository` boundary, the pause/resume service, the platform
adapters, one `dist` for both targets. Every one of those is designed *against*
observed device behaviour, and **the observations do not exist yet.** Confirmed
at the top of this session, not assumed: there is no owner report anywhere on
the repo — the newest activity of any kind is the #13 merge at `2026-08-21
22:40:56Z`, and every PR comment on #11 is agent-authored under his account.
So the gate `[D-0002]` set is still closed, and writing that list now would be
guesswork wearing a checklist's clothes.

One slice needs no device, and yesterday's own measurement is what promoted it
from *rejected* to *required*.

## The problem this session closes

Milestone A deliberately skipped key management: one build, one measurement, no
keystore ([D-0002]). Then #13 measured the consequence — **Gradle mints a fresh
debug key on every CI run.** Three runs, three distinct signer certificates. So
today every APK this repo produces refuses to install over every other one:
signature mismatch, not a maybe. Replacing an installed build means uninstalling
first, **and uninstalling clears the save.**

That is not an operational footnote, it is the thing standing in front of
milestone B. B ships several builds to a real phone — that is what a device test
matrix *is*. With per-run keys, every one of those builds costs the owner his
save, which means the single most important question on the checklist, *does a
save survive a force-stop*, cannot even be asked twice. Fix signing and the loop
he actually needs works: install, play, take the next build, install over it,
**save intact.**

## Scope

- A committed debug keystore, wired as the `debug` signing config.
- `tools/check-apk-signer.ts` — the APK Sig Block v2 parse from
  `docs/CAPABILITIES.md` turned from a session's scratch recipe into a committed
  tool, and used as an *assertion*: the APK CI just built must carry the
  certificate in the committed keystore.
- That assertion wired into both android jobs, so the identity is mechanically
  enforced on every future build rather than observed once today.
- Docs: `android/README.md` § Signing (its three-cert table becomes the
  history that motivates the fix), the missing export-code line on the uninstall
  warning, `docs/CAPABILITIES.md`, `docs/current-state.md`.

**Zero game changes.** `src/`, `tests/`, `public/` untouched — asserted
mechanically in the close-out, not promised.

**Not in this slice:** release signing and Play upload keys (still `[D-0002]`'s
"with the first real release"; a debug keystore is not a Play upload key and
forecloses nothing), and DESIGN § 7's list, which stays owner-gated.

## Close-out

[[fill: shipped]]

[[fill: verify ledger with real exit codes]]

[[fill: what remains unmeasured]]

## ⟲ Previous-session review

[[fill]]

## 💡 Session idea

[[fill]]
