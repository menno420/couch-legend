# The Android shell

A Capacitor 8 wrapper around **the same web build the site serves** — the path
decided in `docs/DESIGN.md` § 7 and executed by `[D-0002]` / `[D-0003]`. There
is no second game here: no native UI, no forked logic, no separate save format.
Everything in this directory is shell.

## How a build happens

```
VITE_BASE=./ pnpm build      # the web bundle, with RELATIVE asset paths
cap sync android             # copies dist/ into app/src/main/assets/public
./gradlew assembleDebug      # -> app/build/outputs/apk/debug/app-debug.apk
```

`pnpm build:shell` runs the first two. The third needs an Android SDK, which the
agent container does not have — so **the APK is assembled in CI**
(`.github/workflows/android.yml`), not in a session. Generating and editing this
Gradle project needs no SDK; building one does.

That workflow runs the build **twice on a PR, on purpose**. The `apk` job builds
the PR *head*, so a result from a real phone is attributable to a commit someone
can look up; a merge revision exists on no branch. The `merge-tree` job builds
what would actually land, so an Android-side incompatibility between a branch
and `main` cannot pass review and then break `main`. Nothing else covers that:
`ci` runs only `pnpm check` and `substrate-gate` is repo hygiene — neither
assembles Android.

`VITE_BASE=./` is the load-bearing part. The site's default base is
`/couch-legend/`, which is correct on GitHub Pages and fatal inside the app:
every asset resolves to a path that does not exist and the app opens black, with
nothing in the UI to say why. `pnpm check:shell`
(`tools/check-shell-assets.ts`) asserts this on the actual bytes after
`cap sync`, and the workflow runs it before Gradle.

## Signing

**A committed debug keystore** — `keystore/debug.keystore`, wired as the `debug`
signing config in `app/build.gradle`, with its certificate fingerprint pinned
independently in `keystore/debug-signer-sha256.txt`. Every APK this repo
produces therefore carries one stable signer certificate, which makes successive
builds **signature-compatible**: it removes the signature mismatch that
otherwise forces an uninstall.

**Precisely what that does and does not establish.** Signature compatibility is
the constraint this repo was breaking, and it is now measured on every build.
Whether an install-over-the-top *succeeds*, and whether the save is preserved
when it does, has **not** been observed — no APK has been installed over another
on any device or emulator, because there is none here. Other update constraints
exist. Treat it as the mismatch removed, pending the milestone-B device test.

That much is checked, not trusted: both jobs in the android workflow run
`pnpm check:apk-signer` on the APK they just assembled
(`tools/check-apk-signer.ts`). It requires the APK's certificate, the committed
keystore's certificate and the independent pin to **all three** agree, requires
**exactly one signer** (Android treats the whole signer set as the package
identity), and **cryptographically verifies** the v2 signature so intact
certificate bytes around a broken signature cannot pass.

The pin is the load-bearing third party. Deriving the expected value from the
keystore alone would check only same-build consistency: regenerate the keystore
and the APK and the keystore move together, the check stays green, and every
phone holding an earlier build silently loses the ability to update. See
`keystore/README.md` — changing the identity is a deliberate two-file diff.

**The password is `android`, the alias is `androiddebugkey`, and both are public
by convention.** This is not a secret and it is not in `.gitignore` on purpose
(the Capacitor template ships those ignore lines commented out). It is also not
a Play upload key — Play rejects debug-signed builds outright — so committing it
forecloses nothing about release signing, which still arrives with the first
real release ([D-0002]).

### Why — the measurement that forced it

Before this, the workflow committed no key, so Gradle minted a fresh one on each
runner. The v2 signer certificate was extracted from APKs built by four separate
runs:

| APK | signer cert SHA-256 | cert valid from |
|---|---|---|
| `couch-legend-c31d653-debug.apk` | `f815828465d6ce40…` | 21:25:54 UTC |
| `couch-legend-f2a54eb-debug.apk` | `387c7df1bc805a04…` | 21:52:14 UTC |
| `couch-legend-02e27ca-debug.apk` | `d7f4a2dd77798044…` | 22:15:59 UTC |
| `couch-legend-43bc128-debug.apk` | `04a12834c0c942ad…` | 22:42:51 UTC |

Four runs, **four distinct certificates**, each stamped at its own build minute.
So every APK refused to install over every other one — signature mismatch, not a
maybe — and the only way to replace an installed build was to uninstall,
**which clears the app's local storage, which is where saves live.**

That is a milestone-B blocker, not an operational footnote. B's device matrix
(DESIGN § 7) tests pause/resume, upgrade over an installed build and
force-stop/reopen — all of which mean putting *several* builds on one phone. At
one save lost per build, the most important question on the list, *does a save
survive a force-stop*, cannot be asked twice.

### ⚠ The one-time cost, for anyone holding an older build

APKs built **before** this change carry a per-run key, so the first
committed-keystore build **will not install over them.** Installing it needs an
uninstall first, one time. After that, builds are signature-compatible with one
another, so the mismatch that forced the uninstall is gone.

Before uninstalling anything, **export the save**: the game's portable save code
(`exportCode` / `importCode` in `src/lib/save.ts`, exposed in the in-game
settings panel) round-trips a save through a copyable string, and it is the only
thing that bridges an uninstall — DESIGN § 7 calls it "the manual bridge".
Browser storage and installed-app storage do not sync, and nothing else carries
a save across a reinstall.

## What is generated, not authored

`.gitignore` in this directory excludes what `cap sync` regenerates:
`app/src/main/assets/public/` (the web bundle),
`app/src/main/assets/capacitor.config.json`, `app/src/main/res/xml/config.xml`
and `capacitor-cordova-android-plugins/`. Do not commit them; do not hand-edit
`capacitor.settings.gradle` (it is rewritten on every sync, and its path into
`node_modules/.pnpm/` is resolved fresh each time).

## What was changed from the generated template

- `res/mipmap-*/ic_launcher*.png` — the game's own couch icon, generated from
  `public/icons/icon-512.png` (legacy square + round) and
  `public/icons/icon-512-maskable.png` (the adaptive-icon foreground, which is
  what a maskable icon is authored for). Replaces the Capacitor logo.
- `res/values/ic_launcher_background.xml`, `res/values/colors.xml`,
  `res/drawable/splash.xml` and the launch theme in `res/values/styles.xml` —
  all set to the game's surface colour `#0B1110`, the same value as
  `<meta name="theme-color">` in `index.html`. The launch theme names both
  `windowSplashScreenBackground` and `windowSplashScreenAnimatedIcon`
  explicitly rather than trusting `Theme.SplashScreen` to inherit the
  application icon. The eleven density-bucketed splash PNGs the template ships
  were replaced by one `ColorDrawable`.
  **Configured, not observed:** what the cold start actually looks like on a
  phone has not been seen by anyone here — there is no device in the container
  that wrote this. The intent is one unbroken dark colour from tap to first
  frame; whether it delivers that is on the milestone-A checklist.
- `app/build.gradle` — `versionName` reads `package.json`, so the version the
  phone reports is the version the repo ships.

## Not here yet — milestone B

`docs/DESIGN.md` § 7's WORKING ANDROID HANDOFF list: the asynchronous
`SaveRepository` boundary, the pause/resume service, and the Back / safe-area /
haptics adapters, plus the device test matrix. Those bind the first *release*.
This shell exists to get the game onto a real phone so that list can be written
against measured behaviour instead of guesses.
