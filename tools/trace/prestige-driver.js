// Second hand-played trace: exercises Wake & Bake on the real UI. Seeds a
// legitimate near-gate save, crosses the prestige gate live, confirms the
// modal ("Sleep it off"), and rebuilds for a minute. Same recording format.
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const URL = 'http://localhost:4173/'
const OUT = path.join(__dirname, 'trace2.json')

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(1337)

const seeded = {
  version: 1, high: 380, peakHigh: 380, buzz: 20, nugs: 500, cash: 300,
  enlightenment: 0, totalHits: 450, playTime: 600,
  generators: { tray: 15, piece: 8 }, jobs: { thinker: 3 },
  rituals: { water: 2, roommate: 1, playlist: 2 },
  achievements: [], lastTick: 0, startedAt: 0, sound: false, booted: true,
}

const trace = {
  meta: { url: URL, sha: 'e4b168b', seed: 1337, kind: 'prestige-validation', startedWall: 0, endedWall: 0, seededSave: null, errors: [], notes: [] },
  actions: [], snapshots: [],
}
const note = (m) => { trace.meta.notes.push(`${Date.now()} ${m}`); console.log(m) }
const act = (kind, extra = {}) => trace.actions.push({ wall: Date.now(), kind, ...extra })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

let page
let lastSave = null
async function snapshot() {
  try {
    const raw = await page.evaluate(() => localStorage.getItem('couch-legend-save'))
    if (raw) { lastSave = JSON.parse(raw); trace.snapshots.push({ wall: Date.now(), save: lastSave }) }
  } catch (e) { note(`snapshot fail: ${e.message}`) }
}

async function main() {
  let browser
  try { browser = await chromium.launch() } catch {
    const guess = ['/opt/pw-browsers/chromium/chrome-linux/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => fs.existsSync(p))
    browser = await chromium.launch({ executablePath: guess })
  }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  page = await ctx.newPage()
  page.on('pageerror', (e) => trace.meta.errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') trace.meta.errors.push(`console: ${m.text()}`) })
  await page.goto(URL, { waitUntil: 'networkidle' })
  const now = Date.now()
  seeded.lastTick = now
  seeded.startedAt = now - 700000
  trace.meta.seededSave = { ...seeded }
  await page.evaluate((s) => localStorage.setItem('couch-legend-save', JSON.stringify(s)), seeded)
  await page.reload({ waitUntil: 'networkidle' })
  await sleep(800)
  trace.meta.startedWall = Date.now()
  act('resume')

  const hitBtn = page.locator('button', { hasText: 'Take a hit' }).first()
  const t0 = Date.now()
  const t = () => (Date.now() - t0) / 1000
  let nextSnap = 0
  let prestiged = false

  while (t() < 125) {
    if (t() >= nextSnap) { await snapshot(); nextSnap += 3 }
    if (!prestiged && t() > 45 && lastSave && lastSave.peakHigh >= 400) {
      await snapshot()
      try {
        await page.locator('button', { hasText: 'Wake & Bake' }).first().click({ timeout: 2500 })
        await sleep(700)
        const confirm = page.locator('button', { hasText: 'Sleep it off' }).first()
        await confirm.click({ timeout: 2500 })
        act('prestige')
        prestiged = true
        note('prestiged via "Sleep it off"')
        await sleep(400)
        await snapshot()
      } catch (e) { note(`prestige attempt fail: ${e.message}`) }
      continue
    }
    try { await hitBtn.click({ timeout: 1200, force: true }); act('hit') } catch (e) { note(`hit fail: ${e.message}`) }
    if (prestiged && t() > 70 && lastSave && (lastSave.generators?.tray ?? 0) < 6) {
      try {
        const row = page.locator('div.bg-elevated', { has: page.locator('p:text-is("Rolling Tray")') }).first()
        const btn = row.locator('button:not([disabled])').first()
        if ((await btn.count()) > 0 && await btn.isVisible().catch(() => false)) {
          await btn.click({ timeout: 1000 })
          act('buy-gen', { id: 'tray', qty: 1 })
        }
      } catch { /* keep playing */ }
    }
    await sleep(500 * (0.75 + 0.5 * rand()))
  }
  await sleep(3000)
  await snapshot()
  trace.meta.endedWall = Date.now()
  fs.writeFileSync(OUT, JSON.stringify(trace))
  note(`done: ${trace.actions.length} actions, ${trace.snapshots.length} snapshots, errors: ${trace.meta.errors.length}, prestiged: ${prestiged}`)
  await browser.close()
}

main().catch(e => { console.error('DRIVER2 CRASH', e); fs.writeFileSync(OUT + '.crash', String(e.stack || e)); process.exit(1) })
