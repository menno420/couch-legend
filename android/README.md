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

One consequence worth knowing: a debug keystore is generated per build machine,
so **APKs from different CI runs are not guaranteed to share a signing key**. If
a later build refuses to install over an earlier one, uninstall first — and note
that uninstalling clears the app's local storage, which is where saves live.

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
  `<meta name="theme-color">` in `index.html`, so a cold start never flashes
  white. The eleven density-bucketed splash PNGs the template ships were
  replaced by one `ColorDrawable`.
- `app/build.gradle` — `versionName` reads `package.json`, so the version the
  phone reports is the version the repo ships.

## Not here yet — milestone B

`docs/DESIGN.md` § 7's WORKING ANDROID HANDOFF list: the asynchronous
`SaveRepository` boundary, the pause/resume service, and the Back / safe-area /
haptics adapters, plus the device test matrix. Those bind the first *release*.
This shell exists to get the game onto a real phone so that list can be written
against measured behaviour instead of guesses.
