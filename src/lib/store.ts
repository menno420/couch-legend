import { create } from 'zustand'
import {
  advance, applyOffline, defaultSave, prestigeGain,
  type OfflineSummary, type SaveState,
} from './engine'
import {
  applyAutoBuy, applyHit, applyOfflineAutoBuy, applyPrestige, arrangeModeFor,
  collectKeepsakes, equipKeepsake, fillBudgetFor, hitPreview, purchaseGenerator,
  purchaseJob, purchaseRitual, unequipKeepsake,
  collectAchievements as collectPure, type ArrangeMode,
} from './actions'
import {
  ACHIEVEMENTS, INTERJECTIONS, MOODS, NEWS_LINES,
  keepsakeById, stageCrossed, type StageDef,
} from './content'
import { loadSave, persistSave, pickSave, requestPersistence, importCode } from './save'
import { fmt } from './format'
import { blipSound, chimeSound, ensureAudio, puffSound, setMuted } from './audio'

export type Tab = 'grow' | 'work' | 'rituals' | 'couch' | 'lore'
export type BuyQty = 1 | 10 | 100 | 'max'

export interface Toast {
  id: string
  title: string
  body: string
  born: number
}

export interface Floater {
  id: string
  text: string
  kind: 'nug' | 'quote'
  x: number
  y: number
  born: number
}

export const TOAST_MS = 4800
export const FLOATER_MS = 900
const SAVE_EVERY_MS = 2500

let serial = 1
let lastFlush = 0

function pushToast(toasts: Toast[], title: string, body: string): Toast[] {
  return [...toasts, { id: `t${serial++}`, title, body, born: performance.now() }].slice(-4)
}

interface AchievementResult {
  save: SaveState
  toasts: Toast[]
  fresh: boolean
}

function collectAchievements(save: SaveState, toasts: Toast[]): AchievementResult {
  const { save: collected, fresh } = collectPure(save)
  if (fresh.length === 0) return { save, toasts, fresh: false }
  let next = toasts
  for (const id of fresh) {
    const def = ACHIEVEMENTS.find(a => a.id === id)
    if (def) next = pushToast(next, def.name, def.blurb)
  }
  return { save: collected, toasts: next, fresh: true }
}

/** Mint any keepsake the story has just left, and say so. Auto-arranged
 * ones are announced too, so the couch never changes silently. */
function collectCouch(
  save: SaveState,
  toasts: Toast[],
  mode: ArrangeMode = 'fresh-only',
  fillBudget = Infinity,
): { save: SaveState; toasts: Toast[]; fresh: boolean } {
  const { save: next, fresh, arranged } = collectKeepsakes(save, mode, fillBudget)
  if (fresh.length === 0 && arranged.length === 0) return { save: next, toasts, fresh: false }
  let out = toasts
  for (const id of fresh) {
    const k = keepsakeById(id)
    if (k) out = pushToast(out, `The couch keeps it — ${k.name}`, k.blurb)
  }
  // Arrangements that were not also minted just now are almost always a
  // migrating save catching up on chapters it already lived. One toast per
  // keepsake would bury the screen on that first load, so more than one
  // collapses into a single line — the Couch tab is where the detail lives.
  const quiet = arranged.filter(id => !fresh.includes(id))
  if (quiet.length === 1) {
    const k = keepsakeById(quiet[0])
    if (k) out = pushToast(out, `${k.name} is on the couch`, k.surface)
  } else if (quiet.length > 1) {
    const names = quiet.map(id => keepsakeById(id)?.name).filter(Boolean)
    out = pushToast(out, 'The couch was keeping things', `${names.join(', ')} — all on the couch now. Rearrange them any time.`)
  }
  return { save: next, toasts: out, fresh: true }
}

/** Revelations key on lifeHigh — the story axis — so they genuinely survive
 * Wake & Bake (the § 9.2 re-key; the old peakHigh filter lost them on every
 * prestige). Each threshold crosses exactly once in a life. */
function collectRevelations(prevLifeHigh: number, save: SaveState, toasts: Toast[]): { toasts: Toast[]; fresh: boolean } {
  let next = toasts
  for (const m of MOODS) {
    if (m.minHigh > prevLifeHigh && m.minHigh <= save.lifeHigh && m.minHigh > 0) {
      next = pushToast(next, `Revelation — ${m.name}`, m.revelation)
    }
  }
  return { toasts: next, fresh: next !== toasts }
}

export interface GameStore extends SaveState {
  ready: boolean
  tab: Tab
  buyQty: BuyQty
  toasts: Toast[]
  floaters: Floater[]
  hitPulse: number
  newsIndex: number
  newsAt: number
  offline: OfflineSummary | null
  /** The stage just entered — drives the chapter-turn overlay. Offline
   * progress and import collapse multiple crossings to one final turn. */
  chapterTurn: StageDef | null
  showPrestige: boolean
  showReset: boolean
  showSettings: boolean

  hydrate: () => void
  begin: () => void
  hit: (x: number, y: number) => void
  buyGenerator: (id: string) => void
  buyJob: (id: string) => void
  buyRitual: (id: string) => void
  toggleKeepsake: (id: string) => void
  setTab: (t: Tab) => void
  setBuyQty: (q: BuyQty) => void
  toggleSound: () => void
  tick: (dt: number) => void
  prestige: () => void
  reset: () => void
  importSave: (code: string) => boolean
  setShowPrestige: (v: boolean) => void
  setShowReset: (v: boolean) => void
  setShowSettings: (v: boolean) => void
  dismissOffline: () => void
  dismissChapterTurn: () => void
  flushSave: () => void
}

const uiDefaults = {
  ready: false,
  tab: 'grow' as Tab,
  buyQty: 1 as BuyQty,
  toasts: [] as Toast[],
  floaters: [] as Floater[],
  hitPulse: 0,
  newsIndex: 0,
  newsAt: 0,
  offline: null as OfflineSummary | null,
  chapterTurn: null as StageDef | null,
  showPrestige: false,
  showReset: false,
  showSettings: false,
}

export const useGame = create<GameStore>()((set, get) => ({
  ...defaultSave(),
  ...uiDefaults,

  hydrate: () => {
    const now = Date.now()
    const stored = loadSave()
    if (!stored) {
      set({ ...defaultSave(now), ...uiDefaults, ready: true, newsIndex: Math.floor(Math.random() * NEWS_LINES.length), newsAt: performance.now() })
      return
    }
    const elapsed = Math.max(0, (now - stored.lastTick) / 1000)
    const { save: progressed, summary } = applyOffline(stored, elapsed)
    // Automation runs on the same clock whether the app was open or not.
    const settled = applyOfflineAutoBuy(stored, progressed)
    const withTick = { ...settled, lastTick: now }
    const ach = collectAchievements(withTick, [])
    // Catch the couch up only for a save that has never had one arranged —
    // otherwise a reload silently refills a place the player emptied.
    const couch = collectCouch(ach.save, ach.toasts, ach.save.couchSeeded ? 'fresh-only' : 'fill')
    setMuted(!withTick.sound)
    requestPersistence()
    set({
      ...couch.save,
      ...uiDefaults,
      ready: true,
      toasts: couch.toasts,
      newsIndex: Math.floor(Math.random() * NEWS_LINES.length),
      newsAt: performance.now(),
      offline: summary,
      // Offline progress emits at most ONE chapter turn — the final stage.
      chapterTurn: stageCrossed(stored.lifeHigh, couch.save.lifeHigh),
    })
  },

  begin: () => {
    ensureAudio()
    set({ booted: true })
    get().flushSave()
  },

  hit: (x, y) => {
    ensureAudio()
    const s = get()
    // What this press ACTUALLY pays — an echo doubles it and a banked return
    // gift rides along, and the floater is the display surface both keepsakes
    // name. Reading hitPower alone under-reported it. (Codex CL#19 R1, P2.)
    const preview = hitPreview(pickSave(s))
    const quote = INTERJECTIONS[Math.floor(Math.random() * INTERJECTIONS.length)]
    const floaters: Floater[] = [
      ...s.floaters,
      { id: `f${serial++}`, text: `+${preview.nugs < 10 ? preview.nugs.toFixed(1) : fmt(preview.nugs)}`, kind: 'nug' as const, x, y, born: performance.now() },
      { id: `f${serial++}`, text: quote, kind: 'quote' as const, x: x + (Math.random() * 40 - 20), y: y - 18, born: performance.now() },
    ].slice(-14)
    const base = pickSave(s)
    const next = applyHit(base)
    const ach = collectAchievements(next, s.toasts)
    const couch = collectCouch(ach.save, ach.toasts, arrangeModeFor(base, ach.save), fillBudgetFor(base, ach.save))
    const mood = collectRevelations(s.lifeHigh, couch.save, couch.toasts)
    const turn = stageCrossed(s.lifeHigh, couch.save.lifeHigh)
    if (s.sound) puffSound()
    if ((ach.fresh || couch.fresh || mood.fresh || turn) && s.sound) chimeSound()
    set({ ...couch.save, floaters, toasts: mood.toasts, hitPulse: 1, ...(turn ? { chapterTurn: turn } : {}) })
  },

  buyGenerator: (id) => {
    const s = get()
    const next = purchaseGenerator(pickSave(s), id, s.buyQty)
    if (!next) return
    const ach = collectAchievements(next, s.toasts)
    if (s.sound) blipSound()
    if (ach.fresh && s.sound) chimeSound()
    set({ ...ach.save, toasts: ach.toasts })
  },

  buyJob: (id) => {
    const s = get()
    const next = purchaseJob(pickSave(s), id, s.buyQty)
    if (!next) return
    const ach = collectAchievements(next, s.toasts)
    if (s.sound) blipSound()
    if (ach.fresh && s.sound) chimeSound()
    set({ ...ach.save, toasts: ach.toasts })
  },

  buyRitual: (id) => {
    const s = get()
    const next = purchaseRitual(pickSave(s), id)
    if (!next) return
    const ach = collectAchievements(next, s.toasts)
    if (s.sound) blipSound()
    if (ach.fresh && s.sound) chimeSound()
    set({ ...ach.save, toasts: ach.toasts })
  },

  /** Arranging the couch: free, instant, reversible, no cost of any kind. */
  toggleKeepsake: (id) => {
    const s = get()
    const base = pickSave(s)
    const next = base.equipped.includes(id) ? unequipKeepsake(base, id) : equipKeepsake(base, id)
    if (!next) return
    if (s.sound) blipSound()
    set({ ...next })
  },

  setTab: (tab) => set({ tab }),
  setBuyQty: (buyQty) => set({ buyQty }),

  toggleSound: () => {
    const sound = !get().sound
    setMuted(!sound)
    if (sound) ensureAudio()
    set({ sound })
  },

  tick: (dt) => {
    const s = get()
    if (!s.ready || !s.booted) return
    const base = pickSave(s)
    const advanced = advance(base, dt)
    const progressed = { ...applyAutoBuy(base, advanced), lastTick: Date.now() }
    const ach = collectAchievements(progressed, s.toasts)
    const couch = collectCouch(ach.save, ach.toasts, arrangeModeFor(base, ach.save), fillBudgetFor(base, ach.save))
    const mood = collectRevelations(s.lifeHigh, couch.save, couch.toasts)
    const turn = stageCrossed(s.lifeHigh, couch.save.lifeHigh)
    if ((ach.fresh || couch.fresh || mood.fresh || turn) && s.sound) chimeSound()
    const now = performance.now()
    const rotateNews = now - s.newsAt > 14000
    // While a chapter turn owns the screen the toast stack is hidden — hold
    // expiry so nothing queued alongside the crossing dies unseen; the
    // dismiss handler re-stamps survivors for their full display window.
    const turnActive = turn ?? s.chapterTurn
    set({
      ...couch.save,
      toasts: turnActive ? mood.toasts : mood.toasts.filter(t => now - t.born < TOAST_MS),
      floaters: s.floaters.filter(f => now - f.born < FLOATER_MS),
      hitPulse: s.hitPulse > 0 ? Math.max(0, s.hitPulse - 0.08) : 0,
      newsIndex: rotateNews ? (s.newsIndex + 1) % NEWS_LINES.length : s.newsIndex,
      newsAt: rotateNews ? now : s.newsAt,
      ...(turn ? { chapterTurn: turn } : {}),
    })
    if (now - lastFlush > SAVE_EVERY_MS) get().flushSave()
  },

  prestige: () => {
    const s = get()
    const gain = prestigeGain(pickSave(s))
    const next = applyPrestige(pickSave(s), Date.now())
    if (!next) return
    const ach = collectAchievements(next, s.toasts)
    if (s.sound) chimeSound()
    set({
      ...ach.save,
      toasts: pushToast(ach.toasts, 'Wake & Bake', `The morning kept ${gain} Clarity. The couch remembers.`),
      showPrestige: false,
      floaters: [],
      tab: 'grow',
    })
    get().flushSave()
  },

  reset: () => {
    const sound = get().sound
    set({
      ...defaultSave(Date.now()),
      ...uiDefaults,
      ready: true,
      booted: true,
      sound,
      newsAt: performance.now(),
    })
    get().flushSave()
  },

  importSave: (code) => {
    const parsed = importCode(code)
    if (!parsed) return false
    const now = Date.now()
    const elapsed = Math.max(0, (now - parsed.lastTick) / 1000)
    const { save: progressed, summary } = applyOffline(parsed, elapsed)
    const settled = applyOfflineAutoBuy(parsed, progressed)
    const withTick = { ...settled, lastTick: now, booted: true }
    const ach = collectAchievements(withTick, [])
    const couch = collectCouch(ach.save, ach.toasts, ach.save.couchSeeded ? 'fresh-only' : 'fill')
    setMuted(!withTick.sound)
    set({
      ...couch.save,
      ...uiDefaults,
      ready: true,
      toasts: pushToast(couch.toasts, 'Save imported', 'The couch remembers everything.'),
      newsIndex: Math.floor(Math.random() * NEWS_LINES.length),
      newsAt: performance.now(),
      offline: summary,
      // As on hydrate: at most one final turn for any crossings while away.
      chapterTurn: stageCrossed(parsed.lifeHigh, couch.save.lifeHigh),
    })
    get().flushSave()
    return true
  },

  setShowPrestige: (v) => set({ showPrestige: v }),
  setShowReset: (v) => set({ showReset: v }),
  setShowSettings: (v) => set({ showSettings: v }),
  dismissOffline: () => set({ offline: null }),
  dismissChapterTurn: () => {
    // Toasts held through the turn get their full window from now.
    const now = performance.now()
    set({ chapterTurn: null, toasts: get().toasts.map(t => ({ ...t, born: now })) })
  },

  flushSave: () => {
    const s = get()
    if (!s.ready) return
    persistSave(pickSave(s))
    lastFlush = performance.now()
  },
}))
