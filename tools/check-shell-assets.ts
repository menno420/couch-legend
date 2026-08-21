/**
 * Asserts the Android shell is self-contained.
 *
 * The failure this exists to catch: the web bundle is built with its default
 * GitHub Pages base (`/couch-legend/`) instead of `VITE_BASE=./`. On the site
 * that is correct; inside the shell every asset then resolves to
 * `https://localhost/couch-legend/...`, which does not exist, and the owner
 * gets a black screen with no error to read. It is invisible in review — the
 * diff looks identical — so it is checked mechanically, on the actual bytes
 * that go into the APK, after `cap sync`.
 *
 * Run: `pnpm check:shell` (the android workflow runs it between `cap sync`
 * and `assembleDebug`).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const REPO = new URL('..', import.meta.url).pathname
const SHELL = join(REPO, 'android/app/src/main/assets/public')
const PUBLIC = join(REPO, 'public')

const failures: string[] = []
const checks: string[] = []

const fail = (msg: string) => failures.push(msg)
const pass = (msg: string) => checks.push(msg)

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

// 1 — the sync actually happened.
const indexPath = join(SHELL, 'index.html')
if (!existsSync(indexPath)) {
  fail(
    `no bundle at ${relative(REPO, indexPath)} — run \`VITE_BASE=./ pnpm build\` ` +
      'then `pnpm exec cap sync android` before this check',
  )
  report()
}
const html = readFileSync(indexPath, 'utf8')
pass('bundle present in the shell assets')

// 2 — every asset reference in the document is relative. An absolute path is
//     the black-screen bug; a remote origin is a network fetch on launch.
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
const absolute = refs.filter((r) => /^(?:\/|https?:\/\/|\/\/)/.test(r))
if (absolute.length > 0) {
  fail(`index.html carries non-relative asset references: ${absolute.join(', ')}`)
} else {
  pass(`all ${refs.length} index.html asset references are relative`)
}

// 2b — and each of them resolves to a file that is actually in the bundle.
//      Without this the check above passes on an index.html that references
//      nothing, which is what a half-copied bundle looks like.
const unresolved = refs
  .filter((r) => !/^(?:data:|mailto:)/.test(r))
  .filter((r) => !existsSync(join(SHELL, r.replace(/^\.\//, '').split(/[?#]/)[0])))
if (unresolved.length > 0) {
  fail(`index.html references files absent from the bundle: ${unresolved.join(', ')}`)
} else {
  pass(`all ${refs.length} references resolve to files in the bundle`)
}

// 2c — non-vacuity: a bundle with no script and no stylesheet is not a build.
const hasJs = refs.some((r) => r.endsWith('.js'))
const hasCss = refs.some((r) => r.endsWith('.css'))
if (!hasJs || !hasCss) {
  fail(
    `index.html does not reference both a script and a stylesheet ` +
      `(js=${hasJs}, css=${hasCss}) — the checks above would pass vacuously`,
  )
} else {
  pass('index.html references both a built script and a built stylesheet')
}

// 3 — the GitHub Pages base must not survive into the shipped bundle, in the
//     document or in any bundled chunk (BASE_URL is inlined at build time).
const bundled = walk(SHELL).filter((f) => /\.(html|js|css|webmanifest)$/.test(f))
if (bundled.length === 0) fail('no text files in the shell bundle — nothing to scan for a leaked base')
const leaked = bundled.filter((f) => readFileSync(f, 'utf8').includes('/couch-legend/'))
if (leaked.length > 0) {
  fail(
    'the GitHub Pages base `/couch-legend/` leaked into the shell bundle ' +
      `(build with VITE_BASE=./): ${leaked.map((f) => relative(SHELL, f)).join(', ')}`,
  )
} else {
  pass(`no \`/couch-legend/\` base in ${bundled.length} bundled text files`)
}

// 4 — no stylesheet pulls a font or image over the network at paint time.
const remoteCss = bundled
  .filter((f) => f.endsWith('.css'))
  .flatMap((f) =>
    [...readFileSync(f, 'utf8').matchAll(/url\(\s*['"]?(https?:)?\/\//g)].map(
      () => relative(SHELL, f),
    ),
  )
if (remoteCss.length > 0) {
  fail(`stylesheet fetches a remote asset: ${[...new Set(remoteCss)].join(', ')}`)
} else {
  pass('no remote url() in bundled CSS — fonts and art are local')
}

// 5 — every file the game ships in public/ reached the shell. A partial copy
//     shows up as missing chapter art, which reads as a game bug on a phone.
const publicFiles = walk(PUBLIC).map((f) => relative(PUBLIC, f))
if (publicFiles.length === 0) {
  fail(`no files found under ${relative(REPO, PUBLIC)} — this check would pass vacuously`)
} else {
  const missing = publicFiles.filter((rel) => !existsSync(join(SHELL, rel)))
  if (missing.length > 0) {
    fail(`public/ files absent from the shell bundle: ${missing.join(', ')}`)
  } else {
    pass(`all ${publicFiles.length} public/ files present in the shell bundle`)
  }
}

// 6 — the shell's own config names the app we think it does.
const cfgPath = join(REPO, 'android/app/src/main/assets/capacitor.config.json')
if (!existsSync(cfgPath)) {
  fail('android/app/src/main/assets/capacitor.config.json missing — `cap sync` did not run')
} else {
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8')) as Record<string, unknown>
  if (cfg.appId !== 'com.menno420.couchlegend') {
    fail(`unexpected appId in the synced config: ${String(cfg.appId)}`)
  } else {
    pass(`synced config declares appId ${String(cfg.appId)}`)
  }
}

report()

function report(): never {
  for (const c of checks) console.log(`  ok   ${c}`)
  for (const f of failures) console.error(`  FAIL ${f}`)
  if (failures.length > 0) {
    console.error(`\nshell asset check: ${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log(`\nshell asset check: ${checks.length} checks passed — the shell is self-contained`)
  process.exit(0)
}
