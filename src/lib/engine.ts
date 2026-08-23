// The pure economy engine. The formula shapes are a faithful port of the
// original prototype; since 2026-08-21 the default growth curve is the
// adopted `DEFAULT_TUNING` (sim-tested knee + cap — identical to the
// prototype through the playtested hours, braking the measured late-game
// runaway; docs/sim/2026-08-20-life-story-balance.md). Nothing in this file
// touches the DOM — it is fully unit-tested.

import {
  ACHIEVEMENTS, GENERATORS, JOBS,
  type AchievementState, type GeneratorDef, type JobDef,
} from './content'

export interface SaveState extends AchievementState {
  version: number
  high: number
  /** Every point of High ever earned, across every Wake & Bake. Never
   * decreases and never resets — the story axis (DESIGN § 9.2). */
  lifeHigh: number
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
    version: 2,
    high: 0,
    lifeHigh: 0,
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
  const merged = {
    ...base,
    ...raw,
    generators: { ...base.generators, ...raw.generators },
    jobs: { ...base.jobs, ...raw.jobs },
    rituals: { ...base.rituals, ...raw.rituals },
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
  }
  // v1 → v2: `lifeHigh`. A v1 save carries no record of prestiged
  // afternoons, so the conservative floor is the current one:
  // max(high, peakHigh) — DESIGN § 9.4. The same clamp repairs any save
  // that would violate the lifeHigh ≥ peakHigh ≥ 0 invariant.
  const prior = Number.isFinite(merged.lifeHigh) ? merged.lifeHigh : 0
  merged.lifeHigh = Math.max(prior, merged.high, merged.peakHigh, 0)
  return { ...merged, version: 2 }
}

/**
 * Tuning for the two growth curves. `DEFAULT_TUNING` is what the shipped
 * game runs; changing it is a deliberate act that carries simulator
 * evidence and updated pins (DESIGN § 9.6 — the rails are the definition).
 */
export interface Tuning {
  /** Clarity per point beyond the knee counts as (excess)^softExp. */
  clarityKnee: number
  claritySoftExp: number
  /** Milestone doublings per item stop after this many (2^cap max). */
  milestoneCapDoublings: number
}

/** The prototype's uncapped curves, kept for the replay fixtures (recorded
 * under them) and the committed baseline dataset. Measured runaway past the
 * playtested hours — docs/sim/2026-08-20-life-story-balance.md § 2. */
export const PROTO_TUNING: Tuning = {
  clarityKnee: Infinity,
  claritySoftExp: 1,
  milestoneCapDoublings: Infinity,
}

/** The adopted curve (2026-08-21, § 7 item 1). Measured boundary of its
 * identity with the prototype (per profile, 2 h invariance runs):
 * spend-everything exact across the full 2 h; click-heavy exact through
 * ~90 min (131 vs 122 Clarity at 2 h); balanced-patient diverges from
 * ~minute 60 — which is the design: the knee's first bite lands exactly
 * where the measured runaway began, then brakes it by ~6 orders of
 * magnitude at day 3. Evidence: docs/sim/2026-08-20-life-story-balance.md
 * § 3 + docs/sim/2026-08-21-adoption-check.md § 2. */
export const DEFAULT_TUNING: Tuning = {
  clarityKnee: 80,
  claritySoftExp: 0.5,
  milestoneCapDoublings: 6,
}

/** Every 25 owned units of a generator or job doubles its output. */
export function milestoneMult(count: number, t: Tuning = DEFAULT_TUNING): number {
  return 2 ** Math.min(Math.floor(count / 25), t.milestoneCapDoublings)
}

/** Item-local output shown by a Grow row, before global multipliers. */
export function generatorOutput(def: GeneratorDef, count: number, t: Tuning = DEFAULT_TUNING): number {
  return def.baseRate * count * milestoneMult(count, t)
}

/** Primary item-local cash output shown by a Work row, before global multipliers. */
export function jobCashOutput(def: JobDef, count: number, t: Tuning = DEFAULT_TUNING): number {
  return def.cashRate * count * milestoneMult(count, t)
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

export function clarityMultiplier(enlightenment: number, t: Tuning = DEFAULT_TUNING): number {
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
  highMult: number
  hitPower: number
  hitHigh: number
  hitBuzz: number
  hitCash: number
  offlineCap: number
  offlineEff: number
  prestigeBonus: number
}

const lv = (o: Record<string, number>, id: string) => o[id] ?? 0

export function computeRates(s: SaveState, t: Tuning = DEFAULT_TUNING): Rates {
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
  const lighter = lv(s.rituals, 'lighter')

  const nugMult = clarity * playlist * plants * snackBoost * ach.nug * buzzMult
  const cashMult = clarity * playlist * throne * ach.cash * buzzMult
  const highMult = clarity * playlist * (1 + Math.sqrt(Math.max(0, s.buzz)) * 0.04)

  let nugRate = 0
  for (const g of GENERATORS) {
    const n = lv(s.generators, g.id)
    nugRate += generatorOutput(g, n, t)
  }
  nugRate *= nugMult

  let cashRate = 0
  let highRate = 0
  for (const j of JOBS) {
    const n = lv(s.jobs, j.id)
    cashRate += jobCashOutput(j, n, t)
    highRate += j.highRate * n
  }
  cashRate *= cashMult
  highRate *= highMult

  const decay = 0.012 / (1 + water * 0.28) / (1 + snacks * 0.18)
  const autoHits = roommate * 0.32
  const lampBuzz = lamp * 0.18
  const hitPower = (1 + sunday * 0.28) * clarity
  const hitHigh = 1 + sunday * 0.06
  const hitBuzz = (2.4 + sunday * 0.15) * (1 + lighter * 0.06) * ach.buzz
  const hitCash = 0.9 * hitPower

  // Passive trickle: staring at the lamp is worth a little cash.
  cashRate += 0.05 * (1 + Math.log10(1 + s.high)) * buzzMult

  const offlineCap = (2 + curtains * 2) * 3600
  const offlineEff = 0.45 + curtains * 0.1
  const prestigeBonus = 1 + cushion * 0.22

  return {
    nugRate, cashRate, highRate, autoHits, lampBuzz, decay,
    buzzMult, nugMult, cashMult, highMult, hitPower, hitHigh, hitBuzz, hitCash,
    offlineCap, offlineEff, prestigeBonus,
  }
}

export const PRESTIGE_MIN_PEAK = 400

export function prestigeGain(s: SaveState, t: Tuning = DEFAULT_TUNING): number {
  if (s.peakHigh < PRESTIGE_MIN_PEAK) return 0
  const r = computeRates(s, t)
  return Math.max(0, Math.floor(Math.sqrt(s.peakHigh / 90) * r.prestigeBonus) - s.enlightenment)
}

/** Advance the simulation by dt seconds (mutates nothing; returns a new state). */
export function advance(s: SaveState, dt: number, t: Tuning = DEFAULT_TUNING): SaveState {
  const r = computeRates(s, t)
  const auto = r.autoHits * dt
  const gained = r.highRate * dt + auto * r.hitHigh
  const high = s.high + gained
  return {
    ...s,
    high,
    lifeHigh: s.lifeHigh + gained,
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
export function applyOffline(s: SaveState, elapsed: number, t: Tuning = DEFAULT_TUNING): { save: SaveState; summary: OfflineSummary | null } {
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
      lifeHigh: s.lifeHigh + highGain,
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
