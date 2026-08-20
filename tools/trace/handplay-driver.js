// Hand-played trace driver — Couch Legend @ e4b168b, local build (VITE_BASE=./),
// served at localhost:4173. This session plays the real UI in real time through
// Chromium: the decisions below are the player's plan (written before the run),
// click cadence carries seeded jitter, and every action + a 5s save snapshot is
// recorded for the simulator's replay validation.
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const URL = 'http://localhost:4173/'
const OUT = path.join(__dirname, 'trace.json')
const T_END = 660 // seconds of play

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(42)

const trace = {
  meta: {
    url: URL, sha: 'e4b168b', seed: 42, startedWall: 0, endedWall: 0,
    plan: 'P1 0-120s steady ~2.3Hz + starter buys · P2 120-300s bursts 25s on/12s off + automation rituals · P3 300-500s slow ~1.1Hz + tier purchases · P4 500-660s prestige when gain>=1, then rebuild',
    viewport: { width: 1280, height: 900 },
    errors: [], notes: [],
  },
  actions: [], snapshots: [],
}
const note = (m) => { trace.meta.notes.push(`${Date.now()} ${m}`); console.log(m) }
const act = (kind, extra = {}) => trace.actions.push({ wall: Date.now(), kind, ...extra })

// name -> row lookup + ids for the replay
const GENS = { tray: 'Rolling Tray', piece: 'Beaker Piece', gravity: 'Gravity Bong', vape: 'Desktop Vape', volcano: 'Tabletop Volcano' }
const JOBS = { thinker: 'Unemployed Philosopher', pizza: 'Night Pizza Run', guitar: 'Stairwell Guitar', napper: 'Professional Napper', historian: 'Couch Historian' }
const RITS = { water: 'Hydration', snacks: 'Snack Cache', roommate: 'The Roommate', playlist: 'Infinite Playlist', lamp: 'Lava Lamp', curtains: 'Blackout Curtains', plants: 'Houseplant Wall' }

let page
let lastSave = null

async function snapshot() {
  try {
    const raw = await page.evaluate(() => localStorage.getItem('couch-legend-save'))
    if (raw) {
      lastSave = JSON.parse(raw)
      trace.snapshots.push({ wall: Date.now(), save: lastSave })
    }
  } catch (e) { note(`snapshot fail: ${e.message}`) }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function clickHit(hitBtn) {
  try { await hitBtn.click({ timeout: 1500, force: true }); act('hit') } catch (e) { note(`hit fail: ${e.message}`) }
}

async function ensureTab(label) {
  try {
    await page.locator('div.flex.rounded-lg.border button', { hasText: label }).first().click({ timeout: 1500 })
    await sleep(160)
  } catch (e) { note(`tab ${label} fail: ${e.message}`) }
}

async function tryBuy(tab, table, id, name, cap) {
  const ownedMap = lastSave ? (table === 'gen' ? lastSave.generators : table === 'job' ? lastSave.jobs : lastSave.rituals) : {}
  if ((ownedMap?.[id] ?? 0) >= cap) return false
  await ensureTab(tab)
  try {
    const row = page.locator('div.bg-elevated', { has: page.locator(`p:text-is("${name}")`) }).first()
    const btn = row.locator('button:not([disabled])').first()
    if (await btn.count() === 0) return false
    if (!(await btn.isVisible().catch(() => false))) return false
    await btn.click({ timeout: 1200 })
    act(table === 'gen' ? 'buy-gen' : table === 'job' ? 'buy-job' : 'buy-ritual', { id, qty: 1 })
    await sleep(220 + rand() * 300)
    return true
  } catch { return false }
}

async function shopPass(list, maxBuys) {
  let bought = 0
  for (const [tab, table, id, name, cap] of list) {
    if (bought >= maxBuys) break
    if (await tryBuy(tab, table, id, name, cap)) bought++
  }
  await ensureTab('Grow')
  return bought
}

function gainNow() {
  if (!lastSave || (lastSave.peakHigh ?? 0) < 400) return 0
  const cushion = lastSave.rituals?.cushion ?? 0
  return Math.max(0, Math.floor(Math.sqrt(lastSave.peakHigh / 90) * (1 + 0.22 * cushion)) - (lastSave.enlightenment ?? 0))
}

async function tryPrestige() {
  if (gainNow() < 1) return false
  try {
    const header = page.locator('button', { hasText: 'Wake & Bake' }).first()
    await header.click({ timeout: 2000 })
    await sleep(700)
    const dialogBtns = page.locator('div.fixed button, [role="dialog"] button')
    const n = await dialogBtns.count()
    const texts = []
    for (let i = 0; i < n; i++) texts.push((await dialogBtns.nth(i).innerText().catch(() => '')).trim())
    note(`prestige modal buttons: ${JSON.stringify(texts)}`)
    let idx = texts.findIndex(t => /wake|bake|come down/i.test(t) && !/not yet|cancel|close|keep/i.test(t))
    if (idx === -1) idx = texts.findIndex(t => t && !/not yet|cancel|close|keep|settings|mute/i.test(t))
    if (idx === -1) { note('no prestige confirm found'); return false }
    await dialogBtns.nth(idx).click({ timeout: 1500 })
    act('prestige')
    note(`prestige clicked: "${texts[idx]}"`)
    await sleep(500)
    return true
  } catch (e) { note(`prestige fail: ${e.message}`); return false }
}

async function main() {
  let browser
  try {
    browser = await chromium.launch()
  } catch (e) {
    const guess = ['/opt/pw-browsers/chromium/chrome-linux/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']
      .find(p => fs.existsSync(p))
    browser = await chromium.launch({ executablePath: guess })
  }
  const ctx = await browser.newContext({ viewport: trace.meta.viewport })
  page = await ctx.newPage()
  page.on('pageerror', (e) => trace.meta.errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') trace.meta.errors.push(`console: ${m.text()}`) })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await sleep(800)

  // Discover buttons; begin.
  const btns = page.locator('button')
  const texts = []
  for (let i = 0; i < await btns.count(); i++) texts.push((await btns.nth(i).innerText().catch(() => '')).trim())
  trace.meta.buttons = texts
  note(`boot buttons: ${JSON.stringify(texts)}`)
  let beginIdx = texts.findIndex(t => /take a seat|begin|start|sit|settle/i.test(t))
  if (beginIdx === -1) beginIdx = texts.findIndex(t => t.length > 0)
  await btns.nth(beginIdx).click()
  act('begin')
  trace.meta.startedWall = Date.now()
  await sleep(600)

  // The hit control: prefer an explicit "hit" button, else the scene button.
  const all2 = page.locator('button')
  const texts2 = []
  for (let i = 0; i < await all2.count(); i++) texts2.push((await all2.nth(i).innerText().catch(() => '')).trim())
  note(`in-game buttons: ${JSON.stringify(texts2)}`)
  let hitIdx = texts2.findIndex(t => /take a hit/i.test(t))
  const hitBtn = hitIdx >= 0 ? all2.nth(hitIdx) : all2.first()
  note(`hit control: index ${hitIdx >= 0 ? hitIdx : 0} text "${texts2[hitIdx >= 0 ? hitIdx : 0]}"`)

  const t0 = Date.now()
  const t = () => (Date.now() - t0) / 1000
  let nextSnap = 0
  let nextShop = 8
  let prestiged = false
  let prestigeAt = null

  while (t() < T_END) {
    const now = t()
    if (now >= nextSnap) { await snapshot(); nextSnap += 5 }

    // Phase parameters
    let hz, pauseChance = 0
    let shopEvery, shopList, maxBuys
    if (now < 120) {
      hz = 2.3; shopEvery = 8; maxBuys = 3
      shopList = [
        ['Work', 'job', 'thinker', JOBS.thinker, 3],
        ['Grow', 'gen', 'tray', GENS.tray, 10],
        ['Grow', 'gen', 'piece', GENS.piece, 5],
        ['Rituals', 'ritual', 'water', RITS.water, 2],
        ['Rituals', 'ritual', 'snacks', RITS.snacks, 1],
      ]
    } else if (now < 300) {
      hz = 2.2; shopEvery = 10; maxBuys = 4
      // 25s on / 12s off bursts
      if (((now - 120) % 37) > 25) hz = 0
      shopList = [
        ['Rituals', 'ritual', 'roommate', RITS.roommate, 4],
        ['Rituals', 'ritual', 'playlist', RITS.playlist, 3],
        ['Grow', 'gen', 'gravity', GENS.gravity, 6],
        ['Work', 'job', 'pizza', JOBS.pizza, 4],
        ['Work', 'job', 'guitar', JOBS.guitar, 3],
        ['Grow', 'gen', 'piece', GENS.piece, 12],
        ['Grow', 'gen', 'tray', GENS.tray, 20],
        ['Rituals', 'ritual', 'lamp', RITS.lamp, 2],
        ['Rituals', 'ritual', 'snacks', RITS.snacks, 3],
        ['Rituals', 'ritual', 'water', RITS.water, 4],
      ]
    } else if (now < 500) {
      hz = 1.1; shopEvery = 12; maxBuys = 4
      if (((now - 300) % 60) > 45) hz = 0
      shopList = [
        ['Grow', 'gen', 'vape', GENS.vape, 4],
        ['Work', 'job', 'napper', JOBS.napper, 3],
        ['Rituals', 'ritual', 'curtains', RITS.curtains, 2],
        ['Work', 'job', 'historian', JOBS.historian, 2],
        ['Rituals', 'ritual', 'plants', RITS.plants, 2],
        ['Grow', 'gen', 'volcano', GENS.volcano, 2],
        ['Grow', 'gen', 'gravity', GENS.gravity, 12],
        ['Work', 'job', 'guitar', JOBS.guitar, 6],
        ['Rituals', 'ritual', 'playlist', RITS.playlist, 5],
        ['Rituals', 'ritual', 'lamp', RITS.lamp, 4],
      ]
    } else {
      hz = 2.0; shopEvery = 9; maxBuys = 4
      if (!prestiged && gainNow() >= 1) {
        await snapshot()
        prestiged = await tryPrestige()
        if (prestiged) { prestigeAt = Date.now(); await snapshot() }
      }
      shopList = [
        ['Work', 'job', 'thinker', JOBS.thinker, 3],
        ['Grow', 'gen', 'tray', GENS.tray, 12],
        ['Grow', 'gen', 'piece', GENS.piece, 6],
        ['Rituals', 'ritual', 'water', RITS.water, 2],
        ['Work', 'job', 'pizza', JOBS.pizza, 2],
        ['Grow', 'gen', 'gravity', GENS.gravity, 3],
        ['Rituals', 'ritual', 'roommate', RITS.roommate, 2],
      ]
    }

    if (now >= nextShop) {
      await shopPass(shopList, maxBuys)
      nextShop = now + shopEvery
      continue
    }

    if (hz > 0) {
      await clickHit(hitBtn)
      await sleep((1000 / hz) * (0.75 + 0.5 * rand()))
    } else {
      await sleep(400)
    }
  }

  await sleep(3000) // let the save flush
  await snapshot()
  trace.meta.endedWall = Date.now()
  trace.meta.prestigeWall = prestigeAt
  fs.writeFileSync(OUT, JSON.stringify(trace))
  note(`done: ${trace.actions.length} actions, ${trace.snapshots.length} snapshots, errors: ${trace.meta.errors.length}`)
  await browser.close()
}

main().catch(e => { console.error('DRIVER CRASH', e); fs.writeFileSync(OUT + '.crash', String(e.stack || e)); process.exit(1) })
