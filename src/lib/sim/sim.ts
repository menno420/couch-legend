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
  advance, applyAutoBuy, applyHit, applyOffline, applyPrestige, arrangeModeFor,
  collectAchievements, collectKeepsakes, computeRates, DEFAULT_TUNING,
  defaultSave, equipKeepsake, prestigeGain, purchaseGenerator, purchaseJob,
  purchaseRitual, unequipKeepsake, type SaveState, type Tuning,
} from '../actions'
import { GENERATORS, JOBS, MOODS, RITUALS, stageUnlocked, type StageDef } from '../content'

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
  /**
   * How this player arranges the couch (DESIGN § 11). Returns the keepsake
   * ids it wants on the couch, or null to leave the arrangement alone.
   * OMITTING this is the honest default and models the majority case: a
   * player who never opens the Couch tab and lets auto-arrange fill the
   * empty slots. A lane that DOES arrange exists to bound the other end.
   */
  arrange?: (s: SaveState) => string[] | null
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

export interface PrestigeRow {
  t: number; gain: number; peak: number; cycleSeconds: number
  rebuildSeconds?: number
  /** The next prestige happened before this cycle's previous peak was
   * regained — the rebuild never completed. Counted, never dropped: these
   * are exactly the slow rebuilds the F6 rail exists to see. */
  unrecovered?: boolean
  /** The run's horizon ended while this rebuild was still in progress:
   * right-censored — observed this many seconds without recovery, outcome
   * unknown. Reported separately so "every started rebuild is accounted"
   * stays true at the edge; without it every run's final prestige row
   * silently vanished from the F6 statistics. */
  censoredSeconds?: number
}

export interface SimResult {
  policy: string; seed: number; dt: number; horizon: number
  events: SimEvent[]
  series: SeriesPoint[]
  /** First-reach times: `mood:<id>`, `stage:<id>`, `unlock:<id>`, `prestige:1`. */
  reach: Record<string, number>
  /** Keepsakes on the couch at the horizon, and how many the life earned. */
  keepsakes?: { earned: number; equipped: string[]; slots: number }
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
    if (s.high < g.unlockHigh || !stageUnlocked(s.lifeHigh, g.stage)) continue
    if (s.nugs >= g.baseCost * g.costScale ** (s.generators[g.id] ?? 0)) return true
  }
  for (const j of JOBS) {
    if (s.high < j.unlockHigh || !stageUnlocked(s.lifeHigh, j.stage)) continue
    if (s.cash >= j.baseCost * j.costScale ** (s.jobs[j.id] ?? 0)) return true
  }
  for (const r of RITUALS) {
    if (s.high < r.unlockHigh || !stageUnlocked(s.lifeHigh, r.stage)) continue
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
  const tuning = opts.tuning ?? DEFAULT_TUNING
  const rng = mulberry32(seed)

  let s = collectAchievements(defaultSave(0)).save
  s = { ...s, booted: true }
  let t = 0
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
  let rebuildPending: { target: number; since: number; row: number } | null = null
  let deadSince: number | null = null
  let nextRecord = 0
  // Hit schedule: one jittered draw PER HIT (not per step), so the click
  // stream is identical at every integration dt — a dt sweep then measures
  // integration error, not a different play sample.
  let nextHitAt = Infinity
  const hitGap = () => (1 / policy.clickHz) * (0.75 + 0.5 * rng())

  const firstReach = (key: string) => { if (!(key in reach)) reach[key] = t }

  // lifeHigh is the engine's own save field since § 7 item 2 — the harness
  // reads it rather than shadow-accumulating high deltas (one implementation).

  const checkCrossings = () => {
    // Moods ride current high within the afternoon.
    while (cursors.mood < MOODS.length - 1 && s.high >= MOODS[cursors.mood + 1].minHigh) {
      cursors.mood++
      firstReach(`mood:${MOODS[cursors.mood].id}`)
      events.push({ t, kind: 'mood', id: MOODS[cursors.mood].id })
    }
    // Unlock visibility rides current high AND (for stage-gated rows) the
    // story stage, exactly like the purchase layer and the UI; first-ever
    // only. Without the stage predicate, reach maps recorded prologue rows
    // as available while every real surface still rejected them (Codex R1).
    for (const g of GENERATORS) if (s.high >= g.unlockHigh && stageUnlocked(s.lifeHigh, g.stage) && !cursors.unlocked.has(g.id)) { cursors.unlocked.add(g.id); firstReach(`unlock:${g.id}`) }
    for (const j of JOBS) if (s.high >= j.unlockHigh && stageUnlocked(s.lifeHigh, j.stage) && !cursors.unlocked.has(j.id)) { cursors.unlocked.add(j.id); firstReach(`unlock:${j.id}`) }
    for (const r of RITUALS) if (s.high >= r.unlockHigh && stageUnlocked(s.lifeHigh, r.stage) && !cursors.unlocked.has(r.id)) { cursors.unlocked.add(r.id); firstReach(`unlock:${r.id}`) }
    // Stages ride lifeHigh and never rewind.
    if (opts.stages) {
      const idx = stageFor(opts.stages, s.lifeHigh)
      while (cursors.stage < idx) {
        cursors.stage++
        firstReach(`stage:${opts.stages[cursors.stage].id}`)
        events.push({ t, kind: 'stage', id: opts.stages[cursors.stage].id })
      }
    }
    if (rebuildPending && s.peakHigh >= rebuildPending.target) {
      const row = prestiges[rebuildPending.row]
      if (row) row.rebuildSeconds = t - rebuildPending.since
      rebuildPending = null
    }
  }

  const record = () => {
    if (recordEvery > 0 && t >= nextRecord) {
      series.push({ t, high: s.high, lifeHigh: s.lifeHigh, nugs: s.nugs, cash: s.cash, buzz: s.buzz, enlightenment: s.enlightenment, stage: cursors.stage })
      nextRecord = t + recordEvery
    }
  }

  /** Put the policy's chosen set on the couch, one legal move at a time. */
  const arrangeCouch = () => {
    if (!policy.arrange) return
    const want = policy.arrange(s)
    if (!want) return
    for (const id of s.equipped) {
      if (!want.includes(id)) s = unequipKeepsake(s, id) ?? s
    }
    for (const id of want) {
      if (s.equipped.includes(id)) continue
      s = equipKeepsake(s, id) ?? s
    }
  }

  const decisionPass = (attended: boolean) => {
    const passStart = s
    s = collectAchievements(s).save
    // The couch mints on the story axis, so this runs everywhere the game
    // runs it — never inside advance(), which the recorded replay traces use.
    // Mode comes from the same rule the store uses: fill a place a new
    // chapter opened, leave alone a place a player emptied.
    s = collectKeepsakes(s, arrangeModeFor(passStart, s)).save
    arrangeCouch()
    // Sync the cursors to the state the elapsed chunk produced BEFORE any
    // purchase is recorded: a stage crossed during the chunk must be the
    // stage its newly-unlocked rows' first-buys carry (Codex R3 — the
    // committed fixtures carried pre-crossing stage indices). The end-of-
    // pass call below re-syncs after purchases and prestige; both are
    // idempotent.
    checkCrossings()
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
    s = collectKeepsakes(s, arrangeModeFor(passStart, s)).save
    let didPrestige = false
    const gain = prestigeGain(s, tuning)
    if (gain > 0 && policy.prestigeWhen(s, gain)) {
      // Close any pending rebuild before resetting: if the pre-reset peak
      // has reached the target, that IS a completed rebuild (crossings only
      // run at pass end, after the reset — checking here, first, is what
      // makes the label true); only a peak still below target is
      // unrecovered. The first version marked unconditionally and
      // fabricated a 91%-unrecovered eager story the data refuted 959/959.
      if (rebuildPending) {
        const open = prestiges[rebuildPending.row]
        if (open && open.rebuildSeconds == null) {
          if (s.peakHigh >= rebuildPending.target) open.rebuildSeconds = t - rebuildPending.since
          else open.unrecovered = true
        }
      }
      prestiges.push({ t, gain, peak: s.peakHigh, cycleSeconds: t - cycleStart })
      firstReach(`prestige:${prestiges.length}`)
      events.push({ t, kind: 'prestige', n: gain })
      prevPeak = s.peakHigh
      s = collectAchievements(applyPrestige(s, t * 1000, tuning) ?? s).save
      s = collectKeepsakes(s, 'fill').save
      cursors.mood = 0
      cycleStart = t
      rebuildPending = { target: prevPeak, since: t, row: prestiges.length - 1 }
      didPrestige = true
    }
    checkCrossings()
    // Dead-time accounting (attended play only): a stretch is dead while the
    // game offers NO move — nothing affordable AND Wake & Bake unlit. A lit
    // prestige button a patient policy declines is a strategy choice, not
    // dead air (§ 9.6's definition of "something real to buy, feel, or
    // reach") — and a prestige actually TAKEN this pass is a move, even
    // though the post-reset state momentarily affords nothing.
    if (attended) {
      if (purchases > 0 || didPrestige || anythingAffordable(s) || prestigeGain(s, tuning) >= 1) {
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
    return { purchases, didPrestige }
  }

  const attendedChunk = (until: number) => {
    if (policy.clickHz > 0 && nextHitAt === Infinity) nextHitAt = t + hitGap()
    while (t < until) {
      const sliceEnd = Math.min(t + policy.decisionEvery, until)
      while (t < sliceEnd) {
        const step = Math.min(dt, sliceEnd - t)
        const before = s
        s = applyAutoBuy(before, advance(before, step, tuning), tuning)
        t += step
        while (t >= nextHitAt) {
          s = applyHit(s, tuning)
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
      const { save: back } = applyOffline({ ...s, lastTick: t * 1000 }, away, tuning)
      s = back
      t += away
      nextHitAt = policy.clickHz > 0 ? t + hitGap() : Infinity
      s = collectAchievements(s).save
      // Returning from away is a load-like moment, exactly as the store's
      // hydrate is: catch the couch up on any chapter crossed while gone.
      s = collectKeepsakes(s, 'fill').save
      checkCrossings()
      checkIns.total++
      const pass = decisionPass(false)
      if (pass.purchases > 0 || pass.didPrestige || anythingAffordable(s) || prestigeGain(s, tuning) >= 1) checkIns.withMove++
      record()
    }
  }

  if (deadSince != null) {
    const span = t - deadSince
    deadMax[cursors.stage] = Math.max(deadMax[cursors.stage] ?? 0, span)
    if (span > 0) deadSpans.push({ t: deadSince, span })
  }

  // A rebuild still pending when the horizon ends is right-censored, never
  // silently dropped: it neither completed nor provably failed. (A closure
  // like its siblings: rebuildPending is only ever assigned inside them, so
  // outer-scope flow analysis would pin it to its initial null here.)
  const censorPendingAtHorizon = () => {
    if (rebuildPending) {
      const open = prestiges[rebuildPending.row]
      if (open && open.rebuildSeconds == null && !open.unrecovered) {
        open.censoredSeconds = t - rebuildPending.since
      }
    }
  }
  censorPendingAtHorizon()

  return {
    policy: policy.name, seed, dt, horizon,
    events, series, reach, deadMax, deadSpans, checkIns, impacts, prestiges,
    keepsakes: {
      earned: s.keepsakes.length,
      equipped: s.equipped,
      slots: computeRates(s, tuning).keepsakes.slots,
    },
    final: {
      t, high: s.high, lifeHigh: s.lifeHigh, nugs: s.nugs, cash: s.cash, buzz: s.buzz,
      enlightenment: s.enlightenment, stage: cursors.stage,
      totalHits: s.totalHits, playTime: s.playTime,
    },
  }
}
