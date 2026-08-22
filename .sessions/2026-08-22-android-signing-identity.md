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
he actually needs becomes possible: install, play, take the next build, install
over it — the signature mismatch that forced an uninstall is gone. (Whether the
install then *succeeds* on hardware is his to observe; see the unmeasured list.)

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

**Shipped (PR #14):**

- `55c1c02` — this card, born red.
- `d37fcc7` — the slice: `android/keystore/debug.keystore` (conventional debug
  identity, `SHA256withRSA` chosen explicitly because JDK 21 defaults to
  SHA384 while Gradle's own debug keys were SHA256 — keeping *stability* the
  only changed variable), `signingConfigs.debug` + an explicit
  `buildTypes.debug` binding it, a `GradleException` if the keystore ever goes
  missing, `tools/check-apk-signer.ts` + `pnpm check:apk-signer`, the assertion
  step in **both** android jobs, and the docs
  (`android/README.md` § Signing rewritten around the measurement,
  `docs/CAPABILITIES.md`, `docs/current-state.md`).
- `ee50b7a` — self-review fixes (the gradle comment understated its own
  evidence at "three runs"; a trailing blank line) and the close-out draft.
- The Codex round-1 repairs: the independent pin
  (`android/keystore/debug-signer-sha256.txt` + `android/keystore/README.md`),
  cryptographic v2 signature verification, an exactly-one-signer requirement,
  and the overstated install-over claim qualified everywhere it appeared.
- This flip commit — close-out and the guard-fires delta.

**Verify (every command run; real exit codes, none read after a pipe — the one
time this session did read `$?` after a `grep` it reported a false 0 and was
re-measured):**

- `pnpm check` → **exit 0** (tsc + vitest + build) at the implementation head.
- `python3 bootstrap.py check --strict` → **exit 1** pre-flip, the designed
  born-red hold, the checker naming this card and saying in as many words
  *"This red is the designed hold, not a defect"*; **exit 0** at the flip.
- **The checker was proven to FIRE, not merely stay quiet** — exit **1**
  against each of the three pre-change APKs (wrong signer), and exit **1** with
  a distinct `the APK is UNSIGNED` message against an APK whose signing block
  was stripped by a rezip.
- **Known-answer test:** the parser, written fresh this session, reproduced all
  three fingerprints the previous session recorded — `f815828465d6ce40…`,
  `387c7df1bc805a04…`, `d7f4a2dd77798044…` — exactly, from an independent
  implementation. So the check disagreeing with those APKs is a real
  disagreement, not a broken parser. It also **extended the series to a fourth**
  distinct cert (`43bc128` → `04a12834c0c942ad…`, notBefore 22:42:51Z): four
  runs, four keys, so the per-run behaviour is a property of the pipeline rather
  than a three-sample coincidence.
- **The two-build proof (the point of the session).** CI run 32567627298 on
  `d37fcc7` assembled the APK twice — the `debug apk` job on the PR head and the
  `android merge check` job on the merge revision, two independent runners. Both
  printed the *same* signer certificate, equal to the committed keystore's:
  `1F:F7:25:FF:1A:D7:70:D4:35:01:70:30:FE:B1:23:FF:D3:33:58:94:0F:72:E6:4A:37:CC:E9:04:B0:CB:75:03`
- **Confirmed off CI's own word too:** the uploaded artifact
  (`couch-legend-apk-d37fcc7`) was downloaded and parsed here by a second,
  separate code path — same fingerprint, `CN=Android Debug, O=Android, C=US`,
  notBefore `2026-08-22 10:19:32Z` (the minute the committed keystore was
  generated), notAfter 2056.
- CI on `d37fcc7`: `ci` success · `debug apk` success · `android merge check`
  success · `substrate-gate` failure = the born-red hold only.
- **Zero game changes, mechanically:** `git diff origin/main...HEAD` is empty
  for `src/`, `tests/` and `public/`.

**⚠ UNMEASURED — there is still no device, emulator or SDK here.**

- **Nobody has installed anything.** What is proven is that two independently
  built APKs carry byte-identical signer certificates — which is the condition
  Android checks when deciding whether one build may replace another. That an
  install-over-the-top therefore *succeeds on his phone* is a sound inference,
  not an observation, and it stays that way until he does it.
- The one-time uninstall for anyone holding a pre-change build is reasoned from
  the certificate mismatch, not watched.
- **All five of milestone A's unmeasured items remain unmeasured** — real
  WebView behaviour, suspend/resume and force-stop save survival, on-hardware
  animation smoothness, the cold-start colour, the icon under a device mask.
  This session moved none of them, and could not have.

**⚑ decide-and-flag:**

- **`versionCode` is still hardcoded `1`.** Android blocks a *downgrade* and
  permits an equal-`versionCode` reinstall, so this should not block the
  install-over-the-top loop — but that is documented platform behaviour I could
  not verify here, not something this session measured, and it is the one part
  of the fix that a device could still contradict. DESIGN § 7's matrix names
  *upgrade over an installed build* as a test, and a real upgrade wants a
  monotonic `versionCode`. Raised rather than absorbed: choosing a scheme is
  milestone-B design, and A is the baseline he is judging.
- **The keystore password is public by convention**, so anyone can build an APK
  that installs over his. For an unlisted pre-release sideload that is not a
  meaningful threat; if it ever becomes one, the answer is release signing, not
  a "secret" debug key. Stated so the trade is on the record rather than implied.
- **`tools/` sits outside `tsconfig.json`'s `include`**, so neither
  `check-shell-assets.ts` nor the new `check-apk-signer.ts` is typechecked by
  `pnpm check` — measured, not guessed: `tsc --noEmit --listFiles | grep -c
  'tools/'` returns **0**. Pre-existing, not introduced here, and this session's
  tool was verified type-clean out-of-band (strict + `noUnusedLocals` +
  `noUnusedParameters` with `@types/node` → exit 0) rather than left on trust.
  **Guard recipe:** add `"tools"` to `tsconfig.json`'s `include` and `"node"` to
  `compilerOptions.types`; target `pnpm check`; expect to fix DOM-vs-node lib
  assumptions in both tools on the first run.

**Codex trail — round 1 on `d37fcc77e`, 5 findings, 4 conceded.** Requested
`10:31:52Z`, answered `10:39:21Z` — **7 m 29 s**, slower than any round on #11,
so the ~5.5 min figure in the estate ledger is a central tendency and not a
timeout. Findings arrived as inline review comments; the issue-comment endpoint
stayed empty, i.e. the #11 lesson applies in both directions — poll all three,
because which endpoint answers depends on whether there were findings.

- `[conceded]` **P1 — "Pin the signing identity across commits."** The sharpest
  finding of the session, and it defeated this PR's central claim. The checker
  derived the expected certificate from the very keystore it was validating —
  chosen deliberately, and reasoned in a comment, as "no second copy to drift".
  Codex pointed out that regenerating the keystore moves *both* sides together,
  so the check stays green while every phone holding an earlier build silently
  loses the ability to update. It was checking same-build consistency, not the
  cross-build stability it exists to protect. Fixed with an independent pin
  (`debug-signer-sha256.txt`), now required to agree with both the APK and the
  keystore; changing the identity is a deliberate two-file diff. **Verified by
  reproducing the exact scenario**: the keystore was regenerated behind the pin
  and the check went to exit 1 naming it.
- `[conceded]` **P2 — "Verify the APK signature instead of trusting its
  certificate field."** Intact certificate bytes around a broken signature would
  have passed. Now `crypto.verify` checks the v2 signature over the signed-data
  block against the signer's public key. **Verified non-vacuous**: flipping a
  single bit of the signature, leaving the certificate untouched, drives it to
  exit 1 while all three certificate comparisons still pass — before the fix
  that file passed.
- `[conceded]` **P2 — "Reject unexpected additional APK signers."** The parse
  took the first signer's first certificate; Android treats the whole signer set
  as the package identity, so an APK with an extra signer is not
  update-compatible with a single-signer one. Now requires exactly one.
- `[conceded]` **P2 — "Qualify the untested install-over claim."** Right, and it
  is the finding this session asked for by name in the review request. The docs
  said builds "install over one another"; what was measured is that they are
  **signature-compatible** — the mismatch is removed. Nothing has been installed
  on anything. Qualified in `android/README.md`, `docs/current-state.md` and the
  hub's entry point. (The card's own unmeasured list already said this
  correctly; the prose around it did not.)
- `[partial]` **P1 — "Complete the session card before merging."** Two halves.
  The born-red hold is correct and is the kit's designed convention, not a
  defect — `check --strict` says so in as many words, and the flip is the
  deliberate last commit. The other half — that the card still held five unresolved
  auto-draft placeholder slots — was true of the reviewed SHA and already resolved in `ee50b7a`, which
  Codex had not seen. No change taken; the observation is accurate about
  `d37fcc7` and stale about the head.

Per milestone A's own session idea — *a round that produced any `[conceded]` is
not the last round* — round 2 was requested on the repaired head.

## ⟲ Previous-session review

Milestone A's card (`2026-08-21-android-apk.md`) is the reason this session had
anything unblocked to do, and the mechanism is worth naming because it worked
three times in a row. A **flagged** the signing edge in its decide-and-flag —
honestly hedged, *"a debug keystore is generated per build machine, so APKs from
different CI runs are not guaranteed to share a signing key"*. #13 then
**measured** the hedge away: three runs, three certs. This session **enforced**
it. Flag → measure → enforce, with each step small enough to land on its own.

Two corrections to carry forward rather than inherit:

- A's advice *"worth doing the force-stop test on this build before replacing
  it"* is now actively incomplete. The right instruction is **export the save
  code first**, then uninstall — the export is what makes the transition
  costless, and A's card never mentions it because A only ever shipped one
  build. `android/README.md` now says so where the uninstall warning lives.
- A recorded the app id as flagged-and-unobjected. Confirmed still true at the
  top of this session by looking rather than assuming: no owner report or
  objection exists anywhere on the repo, the newest activity of any kind being
  the #13 merge at `2026-08-21 22:40:56Z`. He has still not been asked directly,
  so this session asked.

A's `💡` — *"a round that produced any `[conceded]` is not the last round"* —
was honoured here.

## 💡 Session idea

**A measurement of a defect is not a guard against it, and the cheapest moment
to convert one into the other is the moment you measure.** #13 did excellent
work: it turned a hedge into four hard fingerprints and wrote them into a README
table. But a table is a fact about yesterday. Nothing in the repo would have
noticed the day the keystore stopped being used, and the failure is silent by
construction — the build stays green, the APK is real and signed, and the only
symptom appears on a phone in someone else's hand, as a refused install and a
lost save.

What makes the conversion nearly free is that **the parser that measures the
defect is the same code that guards it.** #13 already had to walk the APK
Signing Block to produce its table; promoting that walk into
`tools/check-apk-signer.ts` cost this session almost nothing beyond wiring, and
the second half — deriving the expected value from the committed keystore rather
than pinning the hex string the measurement produced — is what stops the guard
becoming its own stale record.

**Guard recipe:** the anchors are `tools/check-apk-signer.ts` (`expectedCert()`
derives from the keystore at check time; `signingBlock()` + `firstCert()` are the
parse) and the `Assert the APK carries the committed signing identity` step in
**both** jobs of `.github/workflows/android.yml`. The generalisable rule, cheap
to state in the estate's conventions: **when a session measures a defect by
parsing an artifact, the parse belongs in a committed check before the session
ends** — otherwise the next session inherits the number and not the protection.
