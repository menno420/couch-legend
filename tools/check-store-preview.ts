/**
 * Assert the store design preview is ABSENT from an ordinary production build.
 *
 * The preview must never reach a player: it shows mock prices and product
 * codes, and a build that carried it could be mistaken for a real storefront.
 * "Hidden behind a runtime flag" is not good enough — this checks the emitted
 * bytes.
 *
 *   pnpm check:store-preview            # asserts dist/ is clean
 *   pnpm check:store-preview --expect-present   # the positive control
 *
 * The second form is how the checker is PROVEN TO FIRE: build with
 * VITE_STORE_PREVIEW=1 and the same command must find the markers. A checker
 * that has only ever stayed quiet is no evidence at all.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = join(import.meta.dirname, '..', 'dist')

/** Strings that exist ONLY in the preview tree. Each is checked, so a partial
 * leak is caught rather than averaged away. */
const MARKERS = [
  'Design preview · no charge',
  'The Corner Store',
  'com.menno420.couchlegend.supporter',
  'Restore purchases',
  'mock price',
]

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.(js|css|html)$/.test(entry)) out.push(full)
  }
  return out
}

const expectPresent = process.argv.includes('--expect-present')
let files: string[]
try {
  files = walk(DIST)
} catch {
  console.error(`no dist/ at ${DIST} — run \`pnpm build\` first`)
  process.exit(2)
}

const hits: { marker: string; file: string }[] = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const marker of MARKERS) {
    if (text.includes(marker)) hits.push({ marker, file: file.replace(DIST, 'dist') })
  }
}

const found = new Set(hits.map(h => h.marker))
console.log(`scanned ${files.length} emitted files in dist/`)
for (const m of MARKERS) console.log(`  ${found.has(m) ? 'PRESENT' : 'absent '}  ${JSON.stringify(m)}`)

if (expectPresent) {
  const missing = MARKERS.filter(m => !found.has(m))
  if (missing.length) {
    console.error(`\nPOSITIVE CONTROL FAILED: expected every marker in a VITE_STORE_PREVIEW=1 build; missing ${JSON.stringify(missing)}`)
    process.exit(1)
  }
  console.log('\npositive control OK — the checker can see the preview when it is there.')
  process.exit(0)
}

if (hits.length) {
  console.error('\nFAIL: the store design preview leaked into a production build:')
  for (const h of hits) console.error(`  ${h.file}: ${JSON.stringify(h.marker)}`)
  console.error('\nThe preview must be compiled out. Check STORE_PREVIEW_ENABLED in src/lib/store-catalog.ts.')
  process.exit(1)
}
console.log('\nOK — no store-preview markers in the production bundle.')
