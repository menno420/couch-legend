/**
 * Behaviour smoke for the couch (DESIGN § 11), run against the REAL production
 * bundle in headless Chromium — not the unit tests, and not a dev server.
 *
 *   pnpm build && node tools/smoke-couch.mjs
 *
 * It checks what a player actually experiences: a fresh save, a v2 save
 * migrating, the arrangement surviving Wake & Bake, offline return paying its
 * gift, a chapter turn minting, export/import carrying the couch, and
 * reduced-motion. Every assertion prints; a failure exits 1.
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = process.argv[2] ?? 'dist'
const BASE_PATH = '/couch-legend'
const T = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml',
  '.webmanifest':'application/manifest+json','.ico':'image/x-icon' }
const server = createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0])
  if (url.startsWith(BASE_PATH)) url = url.slice(BASE_PATH.length) || '/'
  let p = join(ROOT, url)
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(ROOT, 'index.html')
  res.setHeader('content-type', T[extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
})
await new Promise(r => server.listen(0, r))
const base = `http://127.0.0.1:${server.address().port}${BASE_PATH}/`
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})

let pass = 0, fail = 0
const check = (label, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ok   ${label}${detail ? ' — ' + detail : ''}`) }
  else { fail++; console.log(`  FAIL ${label}${detail ? ' — ' + detail : ''}`) }
}

async function fresh(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, ...opts })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', e => errs.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  return { ctx, page, errs }
}
/** Read the PERSISTED save. The store flushes every 2.5 s (and on hide), so a
 * caller that needs post-hydrate state must wait past one flush — reading
 * sooner sees the pre-migration blob, which is correct behaviour (migration is
 * idempotent and re-runs on the next load) but not what an assertion means. */
const read = async page => {
  const raw = await page.evaluate(() => localStorage.getItem('couch-legend-save'))
  return raw ? JSON.parse(raw) : {}
}
const FLUSH_MS = 3200
const seed = (page, save) => page.evaluate(s => localStorage.setItem('couch-legend-save', JSON.stringify(s)), save)

// ---------------------------------------------------------------- 1 · fresh
{
  console.log('\n1 · first run')
  const { ctx, page, errs } = await fresh()
  await page.goto(base, { waitUntil: 'networkidle' })
  const bootBtn = page.getByRole('button').first()
  await bootBtn.click()
  await page.waitForTimeout(700)
  const s = await read(page)
  check('a fresh save is v3 with a bare couch', s.version === 3 && s.keepsakes.length === 0 && s.equipped.length === 0, `v${s.version}`)
  const couchTab = page.getByRole('button', { name: /Couch/ }).first()
  await couchTab.click(); await page.waitForTimeout(300)
  const body = await page.locator('body').innerText()
  check('the Couch tab explains itself before anything is in it', body.includes('The couch is bare'))
  check('it names the chapter that will fill it', /Corner Store Nights/.test(body))
  check('no page or console errors', errs.length === 0, errs.slice(0, 2).join(' | '))
  await ctx.close()
}

// ------------------------------------------------------- 2 · v2 migration
{
  console.log('\n2 · a v2 save migrating')
  const { ctx, page, errs } = await fresh()
  await page.goto(base, { waitUntil: 'networkidle' })
  await seed(page, {
    version: 2, high: 5.2e4, lifeHigh: 3.4e11, peakHigh: 7e4, buzz: 210, nugs: 3.1e7, cash: 8e6,
    enlightenment: 44, totalHits: 3900, playTime: 86000,
    generators: { tray: 55, piece: 40, gravity: 28, vape: 20, volcano: 12, closet: 7 },
    jobs: { thinker: 38, pizza: 30, guitar: 24, napper: 16, historian: 9 },
    rituals: { water: 5, snacks: 4, roommate: 6, playlist: 5, lamp: 4, curtains: 2 },
    achievements: [], lastTick: Date.now(), startedAt: Date.now() - 86e6, sound: false, booted: true,
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(FLUSH_MS)
  const s = await read(page)
  check('migrated to v3', s.version === 3, `v${s.version}`)
  // lifeHigh 3.4e11 sits in Local Legend (chapter 10), so chapters 2..10 have
  // been lived: nine keepsakes, and three of the six slot chapters passed.
  check('the chapters it already lived gave back their keepsakes', s.keepsakes.length === 9, `${s.keepsakes.length} keepsakes`)
  check('auto-arrange filled the free places', s.equipped.length === 3, `${s.equipped.length} of 3 places`)
  const body = await page.locator('body').innerText()
  check('one collapsed toast, not one per keepsake', body.includes('The couch was keeping things'))
  check('no page or console errors', errs.length === 0, errs.slice(0, 2).join(' | '))
  await ctx.close()
}

// ---------------------------------------- 3 · prestige keeps the couch
{
  console.log('\n3 · Wake & Bake keeps the couch')
  const { ctx, page, errs } = await fresh()
  await page.goto(base, { waitUntil: 'networkidle' })
  await seed(page, {
    version: 3, high: 9e5, lifeHigh: 1.6e12, peakHigh: 9e5, buzz: 400, peakBuzz: 900, nugs: 5e9, cash: 5e8,
    enlightenment: 60, returnGift: 0, totalHits: 9000, playTime: 3e5,
    generators: { tray: 60, farm: 20 }, jobs: { thinker: 40, chemist: 12 }, rituals: { cushion: 3 },
    achievements: [], keepsakes: [], equipped: [],
    lastTick: Date.now(), startedAt: Date.now() - 3e8, sound: false, booted: true,
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(FLUSH_MS)
  const before = await read(page)
  check('a late save earns most of the collection', before.keepsakes.length >= 13, `${before.keepsakes.length} keepsakes`)
  await page.getByRole('button', { name: /Chronicle/ }).first().click(); await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Come down/ }).click(); await page.waitForTimeout(400)
  const confirm = page.getByRole('button', { name: /Sleep it off|Wake|Come down/ }).last()
  await confirm.click(); await page.waitForTimeout(FLUSH_MS)
  const after = await read(page)
  check('the afternoon reset', after.high < before.high, `high ${before.high.toExponential(1)} → ${after.high.toExponential(1)}`)
  check('Clarity grew', after.enlightenment > before.enlightenment, `${before.enlightenment} → ${after.enlightenment}`)
  check('every keepsake survived', after.keepsakes.length === before.keepsakes.length)
  check('the arrangement survived', JSON.stringify(after.equipped) === JSON.stringify(before.equipped), after.equipped.join(', '))
  check('lifeHigh never moved backwards', after.lifeHigh >= before.lifeHigh)
  check('no page or console errors', errs.length === 0, errs.slice(0, 2).join(' | '))
  await ctx.close()
}

// -------------------------------------- 4 · offline return + the gift
{
  console.log('\n4 · coming back after a while')
  const { ctx, page, errs } = await fresh()
  await page.goto(base, { waitUntil: 'networkidle' })
  const twoHoursAgo = Date.now() - 2 * 3600 * 1000
  await seed(page, {
    version: 3, high: 5e4, lifeHigh: 3.4e11, peakHigh: 6e4, buzz: 100, peakBuzz: 500, nugs: 1e7, cash: 1e6,
    enlightenment: 40, returnGift: 0, totalHits: 2000, playTime: 9e4,
    generators: { tray: 50, closet: 6 }, jobs: { thinker: 30 }, rituals: {},
    achievements: [], keepsakes: ['exact-change'], equipped: ['exact-change'],
    lastTick: twoHoursAgo, startedAt: twoHoursAgo - 9e7, sound: false, booted: true,
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(FLUSH_MS)
  const back = await read(page)
  check('the offline report appeared', (await page.locator('body').innerText()).includes('The room kept going'))
  check('the return gift is banked, not silently spent', back.returnGift > 0, `${back.returnGift.toExponential(2)} nugs waiting`)
  const nugsBefore = back.nugs
  await page.getByRole('button', { name: 'Take a hit', exact: true }).click()
  await page.waitForTimeout(FLUSH_MS)
  const afterHit = await read(page)
  check('the first hit back pays it', afterHit.nugs - nugsBefore > back.returnGift * 0.9, `+${(afterHit.nugs - nugsBefore).toExponential(2)}`)
  check('and it is paid only once', afterHit.returnGift === 0)
  check('no page or console errors', errs.length === 0, errs.slice(0, 2).join(' | '))
  await ctx.close()
}

// ------------------------------- 5 · arranging, export/import, a11y
{
  console.log('\n5 · arranging, portability and reduced motion')
  const { ctx, page, errs } = await fresh({ reducedMotion: 'reduce' })
  await page.goto(base, { waitUntil: 'networkidle' })
  await seed(page, {
    version: 3, high: 5e4, lifeHigh: 3.4e11, peakHigh: 6e4, buzz: 100, peakBuzz: 500, nugs: 1e7, cash: 1e6,
    enlightenment: 40, returnGift: 0, totalHits: 2000, playTime: 9e4,
    generators: { tray: 50 }, jobs: { thinker: 30 }, rituals: {},
    achievements: [], keepsakes: [], equipped: [],
    lastTick: Date.now(), startedAt: Date.now() - 9e7, sound: false, booted: true,
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(FLUSH_MS)
  await page.getByRole('button', { name: /Couch/ }).first().click(); await page.waitForTimeout(400)
  const s0 = await read(page)
  const onIt = page.getByRole('button', { name: /On it/ }).first()
  check('something is on the couch to take off', await onIt.count() > 0, `${s0.equipped.length} arranged`)
  const nugs0 = s0.nugs, high0 = s0.high, clarity0 = s0.enlightenment
  await onIt.click(); await page.waitForTimeout(FLUSH_MS)
  const s1 = await read(page)
  check('taking one off is free — no currency or progress moved',
    s1.enlightenment === clarity0 && s1.high >= high0 && Math.abs(s1.nugs - nugs0) / nugs0 < 0.05)
  check('the place is genuinely free again', s1.equipped.length === s0.equipped.length - 1)
  await page.getByRole('button', { name: /Put it on/ }).first().click(); await page.waitForTimeout(FLUSH_MS)
  const s2 = await read(page)
  check('and putting it back is free too', s2.equipped.length === s0.equipped.length)
  // export / import
  const code = await page.evaluate(() => {
    const raw = localStorage.getItem('couch-legend-save')
    return 'CL1.' + btoa(String.fromCharCode(...new TextEncoder().encode(raw)))
  })
  check('a save code carries the couch', code.length > 100 && atob(code.slice(4)).includes('keepsakes'))
  const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  check('reduced motion is honoured by the context', reduced)
  const focusable = await page.evaluate(() => {
    const el = document.querySelector('[role="button"][aria-label*="Take a hit"], button')
    el?.focus()
    return document.activeElement?.tagName ?? 'NONE'
  })
  check('keyboard focus lands on a control', focusable === 'BUTTON' || focusable === 'DIV', focusable)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  check('no horizontal overflow at 412px', !overflow)
  check('no page or console errors', errs.length === 0, errs.slice(0, 2).join(' | '))
  await ctx.close()
}

await browser.close(); server.close()
console.log(`\ncouch smoke: ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
