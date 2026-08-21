// The balance simulator harness. Seeded, deterministic, headless: it consumes
// the SAME engine and action layer the web UI runs (src/lib/engine.ts via
// src/lib/actions.ts) — there is deliberately no second implementation of any
// formula here. The harness owns only what a player owns: when to be present,
// when to click, what to buy, when to Wake & Bake.
//
// Integration matches the game: attended time advances in fixed steps through
// `advance` (the UI uses 50 ms; dt here is configurable and its effect is
// measured by a dt-sensitivity test), away time goes through `applyOffline`
// exactly once at return, as the store does on hydrate.

import {
  advance, applyHit, applyOffline, applyPrestige, collectAchievements,
  computeRates, defaultSave, prestigeGain, PROTO_TUNING, purchaseGenerator,
  purchaseJob, purchaseRitual, type SaveState, type Tuning,
} from '../actions'
import { GENERATORS, JOBS, MOODS, RITUALS } from '../content'
import type { StageDef } from './stage-proposal'

/** Deterministic PRNG (mulberry32) — the only randomness in the simulator. */
export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type BuyKind = 'gen' | 'job' | 'ritual'
export interface BuyAction { kind: BuyKind; id: string }

export interface Policy {
  name: string
  /** Attendance pattern: continuous play, or repeating play/away blocks (seconds). */
  session: 'continuous' | { play: number; away: number }
  /** Manual clicks per second while attended (jittered ±25% by the seed). */
  clickHz: number
  /** Seconds between decision passes while attended. */
  decisionEvery: number
  /** Propose the next purchase, or null to hold. Called repeatedly per pass. */
  buy: (s: SaveState, tuning: Tuning) => BuyAction | null
  /** Whether to Wake & Bake right now given the pending Clarity gain. */
  prestigeWhen: (s: SaveState, gain: number) => boolean
}

export interface SimEvent { t: number; kind: string; id?: string; n?: number }

export interface SeriesPoint {
  t: number; high: number; lifeHigh: number; nugs: number; cash: number
  buzz: number; enlightenment: number; stage: number
}

export interface ImpactRow {
  id: string; kind: BuyKind; t: number; stage: number
  /** Largest relative change across every rate the engine reports. */
  felt: number
  /** The rate field that moved most, for the report. */
  axis: string
  /** Largest relative change across the INSTANTLY-DISPLAYED outputs only —
   * nug/s and cash/s (StatsPanel tiles) and hit power (the per-click
   * floater). Purchases whose effect is deferred-visible (buzz level, Hits
   * counter, the offline report, the prestige preview) score 0 here and are
   * reported with their named display surface instead (F5's two tiers). */
  feltShown: number
  axisShown: string
}

export interface PrestigeRow { t: number; gain: number; peak: number; cycleSeconds: number; rebuildSeconds?: number }

export interface SimResult {
  policy: string; seed: number; dt: number; horizon: number
  events: SimEvent[]
  series: SeriesPoint[]
  /** First-reach times: `mood:<id>`, `stage:<id>`, `unlock:<id>`, `prestige:1`. */
  reach: Record<string, number>
  /** Max attended dead stretch (s) per stage index actually visited. */
  deadMax: Record<number, number>
  /** Every attended dead stretch, for re-bucketing against a moved stage table. */
  deadSpans: { t: number; span: number }[]
  /** withMove counts check-ins where the game offered a move: an affordable
   * purchase or a lit Wake & Bake (whether or not the policy took it). */
  checkIns: { total: number; withMove: number }
  impacts: ImpactRow[]
  prestiges: PrestigeRow[]
  final: SeriesPoint & { totalHits: number; playTime: number }
}

export interface SimOptions {
  policy: Policy
  seed?: number
  dt?: number
  horizon: number
  stages?: StageDef[]
  /** Series sample interval in seconds (0 disables the series). */
  recordEvery?: number
  /** Growth-curve tuning under test; defaults to the shipped prototype curve. */
  tuning?: Tuning
}

interface Cursors { mood: number; unlocked: Set<string>; stage: number }

function stageFor(stages: StageDef[] | undefined, lifeHigh: number): number {
  if (!stages) return 0
  let idx = 0
  for (let i = 0; i < stages.length; i++) if (lifeHigh >= stages[i].minLifeHigh) idx = i
  return idx
}

function anythingAffordable(s: SaveState): boolean {
  for (const g of GENERATORS) {
    if (s.high < g.unlockHigh) continue
    if (s.nugs >= g.baseCost * g.costScale ** (s.generators[g.id] ?? 0)) return true
  }
  for (const j of JOBS) {
    if (s.high < j.unlockHigh) continue
    if (s.cash >= j.baseCost * j.costScale ** (s.jobs[j.id] ?? 0)) return true
  }
  for (const r of RITUALS) {
    if (s.high < r.unlockHigh) continue
    const level = s.rituals[r.id] ?? 0
    if (level >= r.maxLevel) continue
    const cost = r.costs[level]
    if (cost != null && (r.currency === 'nugs' ? s.nugs : s.cash) >= cost) return true
  }
  return false
}

const RATE_AXES = [
  'nugRate', 'cashRate', 'highRate', 'autoHits', 'lampBuzz', 'decay',
  'hitPower', 'hitBuzz', 'offlineCap', 'offlineEff', 'prestigeBonus',
] as const

/** The outputs a player sees change the moment a purchase lands: the nug/s
 * and cash/s tiles and the per-click floater (hit power). */
const SHOWN_AXES = ['nugRate', 'cashRate', 'hitPower'] as const

function feltImpact(before: SaveState, after: SaveState, tuning: Tuning): { felt: number; axis: string; feltShown: number; axisShown: string } {
  const a = computeRates(before, tuning)
  const b = computeRates(after, tuning)
  let felt = 0
  let axis = 'none'
  let feltShown = 0
  let axisShown = 'none'
  for (const k of RATE_AXES) {
    const va = a[k]
    const vb = b[k]
    const base = Math.abs(va) > 1e-12 ? Math.abs(va) : 1e-12
    const rel = Math.abs(vb - va) / base
    if (rel > felt) { felt = rel; axis = k }
    if ((SHOWN_AXES as readonly string[]).includes(k) && rel > feltShown) { feltShown = rel; axisShown = k }
  }
  return { felt, axis, feltShown, axisShown }
}

export function runSim(opts: SimOptions): SimResult {
  const { policy, horizon } = opts
  const seed = opts.seed ?? 42
  const dt = opts.dt ?? 1
  const recordEvery = opts.recordEvery ?? 300
  const tuning = opts.tuning ?? PROTO_TUNING
  const rng = mulberry32(seed)

  let s = collectAchievements(defaultSave(0)).save
  s = { ...s, booted: true }
  let t = 0
  let lifeHigh = 0
  const events: SimEvent[] = []
  const series: SeriesPoint[] = []
  const reach: Record<string, number> = {}
  const deadMax: Record<number, number> = {}
  const deadSpans: { t: number; span: number }[] = []
  const impacts: ImpactRow[] = []
  const prestiges: PrestigeRow[] = []
  const checkIns = { total: 0, withMove: 0 }
  const cursors: Cursors = { mood: 0, unlocked: new Set(), stage: 0 }
  const bought = new Set<string>()
  let cycleStart = 0
  let prevPeak = 0
  let rebuildPending: { target: number; since: number } | null = null
  let deadSince: number | null = null
  let nextRecord = 0
  // Hit schedule: one jittered draw PER HIT (not per step), so the click
  // stream is identical at every integration dt — a dt sweep then measures
  // integration error, not a different play sample.
  let nextHitAt = Infinity
  const hitGap = () => (1 / policy.clickHz) * (0.75 + 0.5 * rng())

  const firstReach = (key: string) => { if (!(key in reach)) reach[key] = t }

  const absorbHighDelta = (before: number, after: number) => {
    if (after > before) lifeHigh += after - before
  }

  const checkCrossings = () => {
    // Moods ride current high within the afternoon.
    while (cursors.mood < MOODS.length - 1 && s.high >= MOODS[cursors.mood + 1].minHigh) {
      cursors.mood++
      firstReach(`mood:${MOODS[cursors.mood].id}`)
      events.push({ t, kind: 'mood', id: MOODS[cursors.mood].id })
    }
    // Unlock visibility rides current high; first-ever only.
    for (const g of GENERATORS) if (s.high >= g.unlockHigh && !cursors.unlocked.has(g.id)) { cursors.unlocked.add(g.id); firstReach(`unlock:${g.id}`) }
    for (const j of JOBS) if (s.high >= j.unlockHigh && !cursors.unlocked.has(j.id)) { cursors.unlocked.add(j.id); firstReach(`unlock:${j.id}`) }
    for (const r of RITUALS) if (s.high >= r.unlockHigh && !cursors.unlocked.has(r.id)) { cursors.unlocked.add(r.id); firstReach(`unlock:${r.id}`) }
    // Stages ride lifeHigh and never rewind.
    if (opts.stages) {
      const idx = stageFor(opts.stages, lifeHigh)
      while (cursors.stage < idx) {
        cursors.stage++
        firstReach(`stage:${opts.stages[cursors.stage].id}`)
        events.push({ t, kind: 'stage', id: opts.stages[cursors.stage].id })
      }
    }
    if (rebuildPending && s.peakHigh >= rebuildPending.target) {
      const row = prestiges[prestiges.length - 1]
      if (row) row.rebuildSeconds = t - rebuildPending.since
      rebuildPending = null
    }
  }

  const record = () => {
    if (recordEvery > 0 && t >= nextRecord) {
      series.push({ t, high: s.high, lifeHigh, nugs: s.nugs, cash: s.cash, buzz: s.buzz, enlightenment: s.enlightenment, stage: cursors.stage })
      nextRecord = t + recordEvery
    }
  }

  const decisionPass = (attended: boolean) => {
    s = collectAchievements(s).save
    let purchases = 0
    for (let i = 0; i < 200; i++) {
      const want = policy.buy(s, tuning)
      if (!want) break
      const before = s
      const next = want.kind === 'gen' ? purchaseGenerator(s, want.id, 1)
        : want.kind === 'job' ? purchaseJob(s, want.id, 1)
        : purchaseRitual(s, want.id)
      if (!next) break
      s = next
      purchases++
      const key = `${want.kind}:${want.id}`
      if (!bought.has(key)) {
        bought.add(key)
        const { felt, axis, feltShown, axisShown } = feltImpact(before, s, tuning)
        impacts.push({ id: want.id, kind: want.kind, t, stage: cursors.stage, felt, axis, feltShown, axisShown })
        events.push({ t, kind: 'first-buy', id: want.id })
      }
    }
    if (purchases > 0) events.push({ t, kind: 'buy-pass', n: purchases })
    s = collectAchievements(s).save
    const gain = prestigeGain(s, tuning)
    if (gain > 0 && policy.prestigeWhen(s, gain)) {
      prestiges.push({ t, gain, peak: s.peakHigh, cycleSeconds: t - cycleStart })
      firstReach(`prestige:${prestiges.length}`)
      events.push({ t, kind: 'prestige', n: gain })
      prevPeak = s.peakHigh
      const before = s.high
      s = collectAchievements(applyPrestige(s, t * 1000, tuning) ?? s).save
      absorbHighDelta(before, s.high) // no-op: prestige only ever lowers high
      cursors.mood = 0
      cycleStart = t
      rebuildPending = { target: prevPeak, since: t }
    }
    checkCrossings()
    // Dead-time accounting (attended play only): a stretch is dead while the
    // game offers NO move — nothing affordable AND Wake & Bake unlit. A lit
    // prestige button a patient policy declines is a strategy choice, not
    // dead air (§ 9.6's definition of "something real to buy, feel, or reach").
    if (attended) {
      if (purchases > 0 || anythingAffordable(s) || prestigeGain(s, tuning) >= 1) {
        if (deadSince != null) {
          const span = t - deadSince
          deadMax[cursors.stage] = Math.max(deadMax[cursors.stage] ?? 0, span)
          if (span > 0) deadSpans.push({ t: deadSince, span })
          deadSince = null
        }
      } else if (deadSince == null) {
        deadSince = t
      }
    }
    return purchases
  }

  const attendedChunk = (until: number) => {
    if (policy.clickHz > 0 && nextHitAt === Infinity) nextHitAt = t + hitGap()
    while (t < until) {
      const sliceEnd = Math.min(t + policy.decisionEvery, until)
      while (t < sliceEnd) {
        const step = Math.min(dt, sliceEnd - t)
        const beforeHigh = s.high
        s = advance(s, step, tuning)
        absorbHighDelta(beforeHigh, s.high)
        t += step
        while (t >= nextHitAt) {
          const b = s.high
          s = applyHit(s, tuning)
          absorbHighDelta(b, s.high)
          nextHitAt += hitGap()
        }
      }
      decisionPass(true)
      record()
    }
  }

  if (policy.session === 'continuous') {
    attendedChunk(horizon)
  } else {
    while (t < horizon) {
      attendedChunk(Math.min(t + policy.session.play, horizon))
      // Dead stretches measure ATTENDED experience: close any open stretch at
      // the session boundary so away time never inflates it.
      if (deadSince != null) {
        const span = t - deadSince
        deadMax[cursors.stage] = Math.max(deadMax[cursors.stage] ?? 0, span)
        if (span > 0) deadSpans.push({ t: deadSince, span })
        deadSince = null
      }
      if (t >= horizon) break
      const away = Math.min(policy.session.away, horizon - t)
      const beforeHigh = s.high
      const { save: back } = applyOffline({ ...s, lastTick: t * 1000 }, away, tuning)
      s = back
      t += away
      nextHitAt = policy.clickHz > 0 ? t + hitGap() : Infinity
      absorbHighDelta(beforeHigh, s.high)
      s = collectAchievements(s).save
      checkCrossings()
      checkIns.total++
      const purchases = decisionPass(false)
      if (purchases > 0 || anythingAffordable(s) || prestigeGain(s, tuning) >= 1) checkIns.withMove++
      record()
    }
  }

  if (deadSince != null) {
    const span = t - deadSince
    deadMax[cursors.stage] = Math.max(deadMax[cursors.stage] ?? 0, span)
    if (span > 0) deadSpans.push({ t: deadSince, span })
  }

  return {
    policy: policy.name, seed, dt, horizon,
    events, series, reach, deadMax, deadSpans, checkIns, impacts, prestiges,
    final: {
      t, high: s.high, lifeHigh, nugs: s.nugs, cash: s.cash, buzz: s.buzz,
      enlightenment: s.enlightenment, stage: cursors.stage,
      totalHits: s.totalHits, playTime: s.playTime,
    },
  }
}
