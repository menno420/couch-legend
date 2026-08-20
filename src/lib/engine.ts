// The pure economy engine. Every formula here is a faithful port of the
// original prototype's tuning; the offline summary and mood transitions are
// additive. Nothing in this file touches the DOM — it is fully unit-tested.

import { ACHIEVEMENTS, GENERATORS, JOBS, type AchievementState } from './content'

export interface SaveState extends AchievementState {
  version: number
  high: number
  achievements: string[]
  totalHits: number
  playTime: number
  lastTick: number
  startedAt: number
  sound: boolean
  booted: boolean
}

export function defaultSave(now = Date.now()): SaveState {
  return {
    version: 1,
    high: 0,
    peakHigh: 0,
    buzz: 0,
    nugs: 0,
    cash: 0,
    enlightenment: 0,
    totalHits: 0,
    playTime: 0,
    generators: {},
    jobs: {},
    rituals: {},
    achievements: [],
    lastTick: now,
    startedAt: now,
    sound: true,
    booted: false,
  }
}

export function migrateSave(raw: Partial<SaveState>): SaveState {
  const base = defaultSave()
  return {
    ...base,
    ...raw,
    generators: { ...base.generators, ...raw.generators },
    jobs: { ...base.jobs, ...raw.jobs },
    rituals: { ...base.rituals, ...raw.rituals },
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    version: 1,
  }
}

/**
 * Optional tuning overrides for the two growth curves. The default —
 * `PROTO_TUNING` — reproduces the prototype's behavior exactly (pinned by
 * test), so nothing in the shipped game changes by this parameter existing.
 * The balance simulator sweeps candidates through it; adopting one later is
 * a deliberate one-line change of these defaults plus updated pins.
 */
export interface Tuning {
  /** Clarity per point beyond the knee counts as (excess)^softExp. */
  clarityKnee: number
  claritySoftExp: number
  /** Milestone doublings per item stop after this many (2^cap max). */
  milestoneCapDoublings: number
}

export const PROTO_TUNING: Tuning = {
  clarityKnee: Infinity,
  claritySoftExp: 1,
  milestoneCapDoublings: Infinity,
}

/** Every 25 owned units of a generator or job doubles its output. */
export function milestoneMult(count: number, t: Tuning = PROTO_TUNING): number {
  return 2 ** Math.min(Math.floor(count / 25), t.milestoneCapDoublings)
}

/** Total cost of buying `qty` units starting from `owned` (geometric series). */
export function bulkCost(baseCost: number, scale: number, owned: number, qty: number): number {
  if (qty <= 0) return 0
  if (scale === 1) return baseCost * qty
  return (baseCost * scale ** +owned * (scale ** +qty - 1)) / (scale - 1)
}

/** Largest affordable quantity from `owned` with `funds`, capped. */
export function maxAffordable(baseCost: number, scale: number, owned: number, funds: number, cap = 1000): number {
  if (funds < baseCost * scale ** +owned) return 0
  if (scale === 1) return Math.min(cap, Math.floor(funds / baseCost))
  const n = Math.log(1 + (funds * (scale - 1)) / (baseCost * scale ** +owned)) / Math.log(scale)
  return Math.max(0, Math.min(cap, Math.floor(n + 1e-9)))
}

export function achievementMults(s: Pick<SaveState, 'achievements'>) {
  let nug = 1
  let cash = 1
  let buzz = 1
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) {
      nug += a.nugMult ?? 0
      cash += a.cashMult ?? 0
      buzz += a.buzzMult ?? 0
    }
  }
  return { nug, cash, buzz }
}

export function buzzMultiplier(buzz: number): number {
  return 1 + Math.sqrt(Math.max(0, buzz)) * 0.12
}

export function clarityMultiplier(enlightenment: number, t: Tuning = PROTO_TUNING): number {
  const effective = Math.min(enlightenment, t.clarityKnee)
    + Math.max(0, enlightenment - t.clarityKnee) ** t.claritySoftExp
  return 1 + effective * 0.18
}

export interface Rates {
  nugRate: number
  cashRate: number
  highRate: number
  autoHits: number
  lampBuzz: number
  decay: number
  buzzMult: number
  nugMult: number
  cashMult: number
  hitPower: number
  hitHigh: number
  hitBuzz: number
  hitCash: number
  offlineCap: number
  offlineEff: number
  prestigeBonus: number
}

const lv = (o: Record<string, number>, id: string) => o[id] ?? 0

export function computeRates(s: SaveState, t: Tuning = PROTO_TUNING): Rates {
  const ach = achievementMults(s)
  const clarity = clarityMultiplier(s.enlightenment, t)
  const buzzMult = buzzMultiplier(s.buzz) * ach.buzz
  const playlist = 1 + lv(s.rituals, 'playlist') * 0.08
  const plants = 1 + lv(s.rituals, 'plants') * 0.12
  const snackBoost = 1 + lv(s.rituals, 'snacks') * 0.04
  const throne = 1 + lv(s.rituals, 'throne') * 0.15
  const sunday = lv(s.rituals, 'sunday')
  const water = lv(s.rituals, 'water')
  const snacks = lv(s.rituals, 'snacks')
  const roommate = lv(s.rituals, 'roommate')
  const lamp = lv(s.rituals, 'lamp')
  const curtains = lv(s.rituals, 'curtains')
  const cushion = lv(s.rituals, 'cushion')

  const nugMult = clarity * playlist * plants * snackBoost * ach.nug * buzzMult
  const cashMult = clarity * playlist * throne * ach.cash * buzzMult

  let nugRate = 0
  for (const g of GENERATORS) {
    const n = lv(s.generators, g.id)
    nugRate += g.baseRate * n * milestoneMult(n, t)
  }
  nugRate *= nugMult

  let cashRate = 0
  let highRate = 0
  for (const j of JOBS) {
    const n = lv(s.jobs, j.id)
    cashRate += j.cashRate * n * milestoneMult(n, t)
    highRate += j.highRate * n
  }
  cashRate *= cashMult
  highRate *= clarity * playlist * (1 + Math.sqrt(Math.max(0, s.buzz)) * 0.04)

  const decay = 0.012 / (1 + water * 0.28) / (1 + snacks * 0.18)
  const autoHits = roommate * 0.32
  const lampBuzz = lamp * 0.18
  const hitPower = (1 + sunday * 0.28) * clarity
  const hitHigh = 1 + sunday * 0.06
  const hitBuzz = (2.4 + sunday * 0.15) * ach.buzz
  const hitCash = 0.9 * hitPower

  // Passive trickle: staring at the lamp is worth a little cash.
  cashRate += 0.05 * (1 + Math.log10(1 + s.high)) * buzzMult

  const offlineCap = (2 + curtains * 2) * 3600
  const offlineEff = 0.45 + curtains * 0.1
  const prestigeBonus = 1 + cushion * 0.22

  return {
    nugRate, cashRate, highRate, autoHits, lampBuzz, decay,
    buzzMult, nugMult, cashMult, hitPower, hitHigh, hitBuzz, hitCash,
    offlineCap, offlineEff, prestigeBonus,
  }
}

export const PRESTIGE_MIN_PEAK = 400

export function prestigeGain(s: SaveState, t: Tuning = PROTO_TUNING): number {
  if (s.peakHigh < PRESTIGE_MIN_PEAK) return 0
  const r = computeRates(s, t)
  return Math.max(0, Math.floor(Math.sqrt(s.peakHigh / 90) * r.prestigeBonus) - s.enlightenment)
}

/** Advance the simulation by dt seconds (mutates nothing; returns a new state). */
export function advance(s: SaveState, dt: number, t: Tuning = PROTO_TUNING): SaveState {
  const r = computeRates(s, t)
  const auto = r.autoHits * dt
  const high = s.high + r.highRate * dt + auto * r.hitHigh
  return {
    ...s,
    high,
    peakHigh: Math.max(s.peakHigh, high),
    nugs: s.nugs + r.nugRate * dt + auto * r.hitPower,
    cash: s.cash + r.cashRate * dt + auto * r.hitCash,
    buzz: Math.max(0, s.buzz * Math.exp(-r.decay * dt) + r.lampBuzz * dt + auto * r.hitBuzz),
    totalHits: s.totalHits + auto,
    playTime: s.playTime + dt,
  }
}

export interface OfflineSummary {
  seconds: number
  nugs: number
  cash: number
  high: number
  capped: boolean
}

/**
 * Apply offline progress for `elapsed` wall-clock seconds. Time beyond the
 * offline cap is lost; what remains earns at offline efficiency. Buzz relaxes
 * exponentially toward its lamp/roommate steady state.
 */
export function applyOffline(s: SaveState, elapsed: number, t: Tuning = PROTO_TUNING): { save: SaveState; summary: OfflineSummary | null } {
  const r = computeRates(s, t)
  const effective = Math.min(elapsed, r.offlineCap) * r.offlineEff
  if (elapsed < 8 || effective <= 2) return { save: s, summary: null }
  const auto = r.autoHits * effective
  const nugGain = r.nugRate * effective + auto * r.hitPower
  const cashGain = r.cashRate * effective + auto * r.hitCash
  const highGain = r.highRate * effective + auto * r.hitHigh
  const steady = (r.lampBuzz + r.autoHits * r.hitBuzz) / Math.max(r.decay, 1e-4)
  const buzz = s.buzz * Math.exp(-r.decay * effective) + steady * (1 - Math.exp(-r.decay * effective))
  const high = s.high + highGain
  return {
    save: {
      ...s,
      nugs: s.nugs + nugGain,
      cash: s.cash + cashGain,
      high,
      peakHigh: Math.max(s.peakHigh, high),
      buzz: Math.max(0, buzz),
      totalHits: s.totalHits + auto,
      playTime: s.playTime + Math.min(elapsed, r.offlineCap),
    },
    summary: { seconds: effective, nugs: nugGain, cash: cashGain, high: highGain, capped: elapsed > r.offlineCap },
  }
}

/** Returns newly-earned achievement ids (does not mutate). */
export function newlyEarned(s: SaveState): string[] {
  const fresh: string[] = []
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements.includes(a.id) && a.check(s)) fresh.push(a.id)
  }
  return fresh
}
