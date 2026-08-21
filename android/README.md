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

Gradle's standard **debug** signing. A debug-signed APK installs from unknown
sources and needs no key management, which is all a sideload requires. Release
signing and a managed keystore arrive with the first real release, deliberately
not before ([D-0002]).

One consequence, and it is stronger than "not guaranteed" — it was **measured**
2026-08-21 by extracting the v2 signer certificate from three APKs built by
three separate CI runs of this workflow:

| APK | signer cert SHA-256 | cert valid from |
|---|---|---|
| `couch-legend-c31d653-debug.apk` | `f815828465d6ce40…` | 21:25:54 UTC |
| `couch-legend-f2a54eb-debug.apk` | `387c7df1bc805a04…` | 21:52:14 UTC |
| `couch-legend-02e27ca-debug.apk` | `d7f4a2dd77798044…` | 22:15:59 UTC |

Three runs, **three distinct certificates**, each stamped at its own build
minute. The runner has no debug keystore until Gradle needs one, so it mints a
fresh key every run. Therefore **every APK this workflow produces will refuse to
install over any other one** — signature mismatch, not a maybe. Replacing an
installed build means uninstalling first, **and uninstalling clears the app's
local storage, which is where saves live.**

That is a design input for milestone B, not just an operational footnote: any
workflow meant to deliver *repeated* builds to a real device needs a stable
signing identity — a committed debug keystore (its password is public by
convention, so it is not a secret) or real release signing. Sideloading one
build for one measurement, which is all `[D-0002]` asked for, does not.

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
