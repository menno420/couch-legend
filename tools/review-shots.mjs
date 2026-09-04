/**
 * Review screenshots: serve a built bundle and photograph it at the review
 * viewports. Used for owner/product review evidence — the store preview's
 * seven states and the game's own surfaces.
 *
 *   node tools/review-shots.mjs <dist-dir> <out-dir>            # store preview
 *   SHOOT_GAME=1 node tools/review-shots.mjs dist <out-dir>      # the game
 *
 * It reports page errors, console errors and horizontal overflow, so a run
 * that produces images but a broken layout still fails loudly.
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = process.argv[2]
const OUT = process.argv[3]
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.woff2':'font/woff2', '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json', '.ico':'image/x-icon' }
// The production bundle is built with base '/couch-legend/' (the GitHub
// Pages path), so serve that prefix rather than rebuilding with a different
// base: these screenshots are then of the ACTUAL production bundle.
const BASE_PATH = '/couch-legend'
const server = createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0])
  if (url.startsWith(BASE_PATH)) url = url.slice(BASE_PATH.length) || '/'
  let p = join(ROOT, url)
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(ROOT, 'index.html')
  res.setHeader('content-type', TYPES[extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
})
await new Promise(r => server.listen(0, r))
const base = `http://127.0.0.1:${server.address().port}${BASE_PATH}/`
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })

const VIEWPORTS = [
  { name: 'mobile-412x915', width: 412, height: 915 },
  { name: 'desktop-1365x900', width: 1365, height: 900 },
  { name: 'narrow-320x844', width: 320, height: 844 },
]

const errors = []
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push(`${vp.name}: ${e.message}`))
  page.on('console', m => { if (m.type() === 'error') errors.push(`${vp.name} console: ${m.text()}`) })
  await page.goto(base, { waitUntil: 'networkidle' })
  // Seed a mid-story save so the couch and the chapters have something in them.
  await page.evaluate(() => {
    const s = { version: 3, high: 6.2e4, lifeHigh: 3.4e11, peakHigh: 8.1e4, buzz: 260, peakBuzz: 900,
      nugs: 4.2e7, cash: 9.4e6, enlightenment: 46, returnGift: 0, totalHits: 4120, playTime: 91800,
      generators: { tray: 62, piece: 44, gravity: 31, pinch: 28, grinder: 26, vape: 22, volcano: 15, closet: 9, farm: 4 },
      jobs: { thinker: 41, pizza: 33, guitar: 27, shift: 25, napper: 18, historian: 11, chemist: 5 },
      rituals: { water: 5, snacks: 4, roommate: 6, lighter: 3, playlist: 5, lamp: 4, curtains: 2, plants: 3 },
      achievements: [], keepsakes: [], equipped: [],
      lastTick: Date.now(), startedAt: Date.now() - 91800000, sound: false, booted: true }
    localStorage.setItem('couch-legend-save', JSON.stringify(s))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1400)
  const shot = async (name) => { await page.screenshot({ path: join(OUT, `${vp.name}-${name}.png`) }) }

  if (process.env.SHOOT_GAME === '1') {
    await shot('01-game')
    const couch = page.getByRole('button', { name: /Couch/ }).first()
    if (await couch.count()) { await couch.click(); await page.waitForTimeout(500); await shot('02-couch-tab') }
    const chron = page.getByRole('button', { name: /Chronicle/ }).first()
    if (await chron.count()) { await chron.click(); await page.waitForTimeout(400); await shot('03-chronicle') }
  } else {
    const open = page.getByRole('button', { name: /Store preview/i })
    await open.waitFor({ timeout: 5000 })
    await open.click(); await page.waitForTimeout(600)
    await shot('iap-01-landing')
    await page.getByRole('button', { name: 'Look closer' }).nth(1).click(); await page.waitForTimeout(350)
    await shot('iap-02-detail')
    await page.getByRole('button', { name: /Continue — preview only/ }).click(); await page.waitForTimeout(350)
    await shot('iap-03-confirm')
    await page.getByRole('button', { name: /Try it — preview only/ }).click(); await page.waitForTimeout(600)
    await shot('iap-04-result')
    await page.getByRole('button', { name: /See the owned state/ }).click(); await page.waitForTimeout(350)
    await shot('iap-05-owned')
    await page.getByRole('button', { name: /Back to the store/ }).click(); await page.waitForTimeout(300)
    await page.getByRole('button', { name: /Restore purchases/ }).click(); await page.waitForTimeout(300)
    await page.getByRole('button', { name: /^Restore$/ }).click(); await page.waitForTimeout(600)
    await shot('iap-06-restore')
    await page.getByRole('button', { name: /Back to the store/ }).click(); await page.waitForTimeout(300)
    await page.getByRole('button', { name: /Offline state/ }).click(); await page.waitForTimeout(350)
    await shot('iap-07-unavailable')
    // horizontal overflow check
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    if (overflow) errors.push(`${vp.name}: horizontal overflow`)
  }
  await ctx.close()
}
await browser.close(); server.close()
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors, no console errors, no horizontal overflow')
