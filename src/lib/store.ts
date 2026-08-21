import { create } from 'zustand'
import {
  advance, applyOffline, computeRates, defaultSave, prestigeGain,
  type OfflineSummary, type SaveState,
} from './engine'
import {
  applyHit, applyPrestige, purchaseGenerator, purchaseJob, purchaseRitual,
  collectAchievements as collectPure,
} from './actions'
import {
  ACHIEVEMENTS, INTERJECTIONS, MOODS, NEWS_LINES,
  stageCrossed, type StageDef,
} from './content'
import { loadSave, persistSave, pickSave, requestPersistence, importCode } from './save'
import { blipSound, chimeSound, ensureAudio, puffSound, setMuted } from './audio'

export type Tab = 'grow' | 'work' | 'rituals' | 'lore'
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
    const withTick = { ...progressed, lastTick: now }
    const ach = collectAchievements(withTick, [])
    setMuted(!withTick.sound)
    requestPersistence()
    set({
      ...ach.save,
      ...uiDefaults,
      ready: true,
      toasts: ach.toasts,
      newsIndex: Math.floor(Math.random() * NEWS_LINES.length),
      newsAt: performance.now(),
      offline: summary,
      // Offline progress emits at most ONE chapter turn — the final stage.
      chapterTurn: stageCrossed(stored.lifeHigh, ach.save.lifeHigh),
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
    const r = computeRates(s)
    const quote = INTERJECTIONS[Math.floor(Math.random() * INTERJECTIONS.length)]
    const floaters: Floater[] = [
      ...s.floaters,
      { id: `f${serial++}`, text: `+${r.hitPower < 10 ? r.hitPower.toFixed(1) : Math.round(r.hitPower)}`, kind: 'nug' as const, x, y, born: performance.now() },
      { id: `f${serial++}`, text: quote, kind: 'quote' as const, x: x + (Math.random() * 40 - 20), y: y - 18, born: performance.now() },
    ].slice(-14)
    const next = applyHit(pickSave(s))
    const ach = collectAchievements(next, s.toasts)
    const mood = collectRevelations(s.lifeHigh, ach.save, ach.toasts)
    const turn = stageCrossed(s.lifeHigh, ach.save.lifeHigh)
    if (s.sound) puffSound()
    if ((ach.fresh || mood.fresh || turn) && s.sound) chimeSound()
    set({ ...ach.save, floaters, toasts: mood.toasts, hitPulse: 1, ...(turn ? { chapterTurn: turn } : {}) })
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
    const progressed = { ...advance(pickSave(s), dt), lastTick: Date.now() }
    const ach = collectAchievements(progressed, s.toasts)
    const mood = collectRevelations(s.lifeHigh, ach.save, ach.toasts)
    const turn = stageCrossed(s.lifeHigh, ach.save.lifeHigh)
    if ((ach.fresh || mood.fresh || turn) && s.sound) chimeSound()
    const now = performance.now()
    const rotateNews = now - s.newsAt > 14000
    set({
      ...ach.save,
      toasts: mood.toasts.filter(t => now - t.born < TOAST_MS),
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
    const withTick = { ...progressed, lastTick: now, booted: true }
    const ach = collectAchievements(withTick, [])
    setMuted(!withTick.sound)
    set({
      ...ach.save,
      ...uiDefaults,
      ready: true,
      toasts: pushToast(ach.toasts, 'Save imported', 'The couch remembers everything.'),
      newsIndex: Math.floor(Math.random() * NEWS_LINES.length),
      newsAt: performance.now(),
      offline: summary,
      // As on hydrate: at most one final turn for any crossings while away.
      chapterTurn: stageCrossed(parsed.lifeHigh, ach.save.lifeHigh),
    })
    get().flushSave()
    return true
  },

  setShowPrestige: (v) => set({ showPrestige: v }),
  setShowReset: (v) => set({ showReset: v }),
  setShowSettings: (v) => set({ showSettings: v }),
  dismissOffline: () => set({ offline: null }),
  dismissChapterTurn: () => set({ chapterTurn: null }),

  flushSave: () => {
    const s = get()
    if (!s.ready) return
    persistSave(pickSave(s))
    lastFlush = performance.now()
  },
}))
