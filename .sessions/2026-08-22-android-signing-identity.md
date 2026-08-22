# 2026-08-22 — Milestone B, the unblocked slice: a stable Android signing identity

> **Status:** `complete` — branch `claude/couch-legend-milestone-b-w6vwex`,
> PR #14. Born red until this flip; the close-out, the verify ledger with real
> exit codes, the explicit unmeasured list and the five-round Codex trail are
> below.

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
- The Codex round-4 repair: the threat model's trust assumption corrected (it
  had claimed "our own source" for a workflow that builds fork PR heads), and
  the APK artifact restricted to same-repository pull requests.
- The Codex round-3 repairs: v3.1 added to the validated scheme list, algorithm
  IDs bound to their required key family, and the threat model written into the
  tool so the three declined findings are a recorded decision.
- The Codex round-2 repairs: duplicate signing-block ids rejected, every
  identity scheme (v2 **and** v3) validated rather than v2 alone, signatures
  verified with the key inside the pinned certificate rather than the signer's
  declared one, digest/signature algorithm agreement required — plus the guard
  recipe on this card rewritten, because it still taught the design round 1 had
  just disproved.
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
- **The two-build proof (the point of the session), and the honest scope of it.**
  Across the whole PR the keystore produced **15 successful APK builds over 8
  workflow runs** (7 PR runs × 2 jobs, plus main's single job — the merge check
  is skipped on a push), and every one of those jobs went green, which *implies*
  the certificate matched the pin because the assertion reddens the job on
  mismatch. That is an inference, sound but an inference. The certificate value
  was **read directly on 5 of the 15**: all four job logs of runs
  `d37fcc7` and `ee50b7a` (`debug apk` on the PR head and `android merge check`
  on the merge revision — different runners, different trees), plus main's
  `9e04b0d` artifact downloaded and parsed here. Run 32567627298 on `d37fcc7` is
  the clean two-build case: both jobs printed the *same* signer certificate,
  equal to the committed keystore's:
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

**Codex round 2 on `fd599c9`, 5 findings, all 5 conceded.** Requested
`10:47:03Z`, answered ~`10:53Z` — **~6 m**. Every finding was a way an APK could
carry the pinned certificate while the *device* resolved a different identity,
which is precisely the class the first two rounds had not exhausted.

- `[conceded]` **P1 — "Bind the verified key to the pinned certificate."** The
  signature was verified against `publicKey` from the signer record — a field the
  APK supplies. An APK could embed the pinned certificate, sign with a different
  key, declare that key, and pass everything. Android rejects this because the
  signer's public key must match the first certificate's. Now verified with
  `new X509Certificate(apkCert).publicKey`, and the declared key must equal that
  certificate's SPKI. **Reproduced as a real file**: a 294-byte impostor RSA-2048
  SPKI spliced in place (same length, so a byte-for-byte swap), pinned
  certificate untouched — three checks still pass and the fourth catches it.
- `[conceded]` **P1 — "Reject duplicate signing-scheme block IDs."** The parse
  returned a `Map`, so a duplicate id kept the LAST block; Android resolves to
  the FIRST. An unpinned signer in front of a pinned one would have been
  validated by this checker and ignored by the device. Now an ordered list, and
  duplicates are rejected outright. **Reproduced**: the v2 block duplicated in
  front of the original (+1450 bytes, EOCD offset fixed) → exit 1.
- `[conceded]` **P2 — "Validate the effective v3 signer as well."** Only v2 was
  validated while Android 9+ takes package identity from v3, so a pinned v2
  signer could escort an unpinned v3 one. Every identity-bearing block present is
  now validated against the same pin, with v3's extra `minSDK`/`maxSDK` fields
  handled in the signer layout. Untestable here beyond the code path — these
  builds emit v2 only.
- `[conceded]` **P2 — "Require matching signature and digest algorithm
  records."** The digest field was read only to locate the certificates, so a
  mismatched or empty digest list passed while Android rejects the signer. The
  ordered algorithm lists must now agree.
- `[conceded]` **P2 — "Update the guard recipe to retain the independent pin."**
  The most valuable of the five, because it was about the record rather than the
  code: the `💡` section still taught the superseded design — it argued that
  deriving the expectation from the keystore *prevents* drift, the exact claim
  round 1 had disproved — and named two functions that no longer exist. A future
  session following it would have reintroduced the central defect. Rewritten, and
  it now carries the explicit trap: **never update the pin to make a red build go
  green.**

**One bug of my own, caught by testing rather than review:** the first version of
the round-2 fix passed the certificate's `KeyObject` through `createPublicKey()`,
which throws `Invalid key object type public, expected private`. It would have
reddened CI. Real exit codes on every bypass file are why it did not.

**Codex round 3 on `6ef00ca`, 5 findings, 2 conceded and 3 declined on a stated
threat model.** Requested `11:01:06Z`, answered ~`11:08Z`.

- `[conceded]` **P2 — v3.1 (`0x1b93ad61`) is not in the scheme list.** Correct,
  and it is the same argument that made the v3 finding worth taking: if AGP ever
  emits a rotation block, a checker that knows only v2/v3 silently ignores the
  block those devices take identity from. Added.
- `[conceded]` **P2 — bind each algorithm ID to its required key type.** Node
  infers the key family from the key, so a record labelled ECDSA but carrying an
  RSA signature verified here and is rejected on device. Each algorithm now
  declares `rsa`/`ec`/`dsa` and the certificate's family must match.
- `[survived]` ×3 — **the counterfeit-EOCD record, v3's inner/outer SDK-range
  copies, and the `0xbeeff00d` stripping-protection attribute.** All three are
  real properties Android enforces and `apksigner verify` would cover. All three
  are reachable **only by a party authoring a hostile APK** — none by this
  pipeline drifting. This check runs in CI on an APK our own workflow assembled
  from our own source seconds earlier, and what it defends is build provenance:
  the pipeline quietly ceasing to use the committed key. It is not, and should
  not become, an adversarial APK verifier. The threat model is now written into
  the file's header alongside these three by name, so the boundary is a decision
  on the record rather than an omission a later round re-raises.

**Why the trail stops here rather than on a clean verdict, said plainly.** The
convention this repo inherited — *a round that produced any `[conceded]` is not
the last round* — would ask for a round 4, and round 3 conceded two. But the
rounds are not converging: 5 findings, then 5, then 5, on one file, each batch
more exotic than the last, and the arc runs from "your central claim is wrong"
(round 1, correct and load-bearing) to "a crafted APK could carry a counterfeit
end-of-central-directory record" (round 3, true and outside the job). Continuing
would keep growing a build-provenance check into a partial reimplementation of
`apksigner`, which is scope the owner did not ask for and maintenance nobody
wants. Stopping is the judgement; recording that it was a judgement, and not a
clean bill of health, is the honest part. **Rounds 1–2 were worth every minute** —
between them they found that the guard's baseline could move with the artifact it
guarded, and four ways an APK could carry the pinned certificate while a device
resolved a different identity. Not one of those was visible from reading the
happy path.

**Codex round 4 on `0e760bb`, 1 finding, conceded — and it refuted the previous
round's reasoning, not the code.** Requested `11:12:42Z`, answered ~`11:14Z`.
Round 3's declines rested on a threat model I had just written into the file, so
round 4's request asked for exactly two things: a way *our own build* could drift
into passing, or evidence the threat model itself was wrong. It took the second.

- `[conceded]` **P2 — "Treat pull-request APKs as untrusted input."** The header
  claimed this runs on "an APK our own workflow assembled from our own source".
  That sentence is false for a fork: this repo is public, `android.yml` runs on
  every `pull_request` and checks out `github.event.pull_request.head.sha`, so an
  untrusted contributor's branch controls both the Gradle project and this
  checker, and the `apk` job would have uploaded their build as a downloadable
  artifact. Fixed twice over — the trust assumption is now stated accurately (a
  pass means the identity is pinned *given a reviewed source*, never "our own
  source" unconditionally), and the artifact upload is restricted to
  same-repository pull requests. Both limits are stated rather than implied:
  `pull_request` workflows run from the PR's own definition, so a fork can edit
  the guard too, and the real control is a maintainer reading the diff.

**On the convention this trail was tested against.** Milestone A's rule — *a round
that produced any `[conceded]` is not the last round* — earned its keep here four
times over, and round 4 is the strongest evidence for it: the concession was not
a bug in the parser but a **false sentence I had written one round earlier while
declining other findings**, i.e. exactly the kind of error that a round which
"only" changed prose would have shipped. The finding counts also converged once
the boundary was argued rather than left implicit — 5, 5, 5, then 1 — which is
what round 3's non-convergence note was waiting to see.

**Codex round 5 on `a86be152e4`: CLEAN.** *"Didn't find any major issues"*,
requested `11:18:10Z` and answered `11:21:14Z` — **3 m 04 s**, the fastest round
of the five. It arrived as an **issue comment with zero inline comments**, which
is precisely the shape `docs/CAPABILITIES.md` warns reads as silence to anyone
polling only the review endpoints. This session polled all three from the start
and still nearly mis-scored it — the first poll's counter was written wrong and
reported zero through 36 iterations while findings sat on the endpoint it was
reading. The endpoint lesson held; the arithmetic was the weak link.

**Trail totals: 5 rounds, 16 findings — 12 `[conceded]`, 1 `[partial]`, 3 `[survived]`.** (Corrected: an earlier version of this line said 13 conceded, which folded the `[partial]` into the concessions and made the tally stop reconciling with the bullets above it. Counted from the line-initial markers in this file, not from memory.) The
shape is worth keeping: rounds 1–2 broke the design (the guard's baseline could
move with the artifact it guarded; four ways an APK carries the pinned
certificate while a device resolves a different identity), round 3 crossed out of
the tool's job and was declined on a written threat model, and round 4 then
refuted **that written reasoning** — the trail's best moment, because the error
was a sentence I wrote while declining, not code. Only after the boundary was
argued explicitly did it converge to clean.

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

**A measurement of a defect is not a guard against it — and a guard whose
expected value lives inside the thing it guards is not a guard either.**

The first half is the cheap, generalisable win. #13 did excellent work: it turned
a hedge into four hard fingerprints and wrote them into a README table. But a
table is a fact about yesterday. Nothing in the repo would have noticed the day
the keystore stopped being used, and the failure is silent by construction — the
build stays green, the APK is real and signed, and the only symptom appears on a
phone in someone else's hand, as a refused install and a lost save. What makes
the conversion nearly free is that **the parser that measures the defect is the
same code that guards it**: #13 already had to walk the APK Signing Block to
produce its table, so promoting that walk into a committed check cost this
session almost nothing beyond wiring.

The second half is this session's actual lesson, and it was **not** obvious — I
got it wrong, in writing, with a confident comment explaining why. The first
checker derived its expected certificate from the very keystore it was
validating, reasoned as *"no second copy to drift"*. That sounds like good
hygiene and is the opposite: if the keystore is ever regenerated, both sides move
together, the check stays green, and every already-installed phone silently loses
the ability to update. **A baseline that can move with the artifact is decoration.**
The fix is an independent pin (`android/keystore/debug-signer-sha256.txt`) that
must agree with both, which converts "identity changed" from a silent event into a
red build and a deliberate two-file diff.

The third thing, which no amount of care in one head produced: **five more
bypasses existed after the design was right.** Round 2 found that the signature
was verified against the signer's own *declared* public key rather than the key
inside the pinned certificate; that duplicate signing-block ids let an unpinned
signer sit in front of a pinned one, because Android resolves to the FIRST match
while a map keeps the last; that only v2 was validated while Android 9+ takes
identity from v3; and that unmatched digest/signature algorithm lists pass here
and are rejected on device. Every one is a way an APK carries the pinned
certificate while the *device* resolves a different identity — none is visible by
reading the happy path, and all four were found by an adversarial reader in
minutes. The verification wall the owner names is exactly this: writing the check
was the easy part; knowing it was wrong took a second reader and a test that
built each bypass as a real file.

**Guard recipe.** Anchors: `tools/check-apk-signer.ts` — `signingBlock()` returns
an ordered list, never a map keyed by id (duplicates are rejected); the
per-scheme loop over `SCHEMES` validates **every** identity-bearing block
present, not just v2; the signature is verified with the key from
`new X509Certificate(apkCert).publicKey`, and the signer's declared key must
equal that certificate's SPKI. The pin is `android/keystore/debug-signer-sha256.txt`
and `android/keystore/README.md` states the two-file-diff rule. The step is
`Assert the APK carries the committed signing identity` in **both** jobs of
`.github/workflows/android.yml`. **The trap for a future session: never update
the pin to make a red build go green.** That reverses the mechanism entirely —
the pin exists to make an identity change loud, so a red build means "confirm
this is deliberate and say why in the commit", never "adjust the expectation".

The rule worth stating in the estate's conventions, generalised past APKs:
**when a session measures a defect by parsing an artifact, the parse belongs in a
committed check before the session ends — and the value it compares against must
live somewhere the defect cannot move.**
