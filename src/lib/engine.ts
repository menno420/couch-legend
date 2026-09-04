// The pure economy engine. The formula shapes are a faithful port of the
// original prototype; since 2026-08-21 the default growth curve is the
// adopted `DEFAULT_TUNING` (sim-tested knee + cap — identical to the
// prototype through the playtested hours, braking the measured late-game
// runaway; docs/sim/2026-08-20-life-story-balance.md). Nothing in this file
// touches the DOM — it is fully unit-tested.

import {
  ACHIEVEMENTS, GENERATORS, JOBS, KEEPSAKES, baseSlotsFor, keepsakeById,
  keepsakesEarnedBy,
  type AchievementState, type GeneratorDef, type JobDef,
} from './content'

export interface SaveState extends AchievementState {
  version: number
  high: number
  /** Every point of High ever earned, across every Wake & Bake. Never
   * decreases and never resets — the story axis (DESIGN § 9.2). */
  lifeHigh: number
  achievements: string[]
  /** Keepsakes this life has earned — one per chapter entered, permanent
   * and never lost (DESIGN § 11). Order is mint order. */
  keepsakes: string[]
  /** The keepsakes currently on the couch. Free to rearrange, survives
   * Wake & Bake, always within the slot count. */
  equipped: string[]
  /** Highest Buzz reached this afternoon — the reference a buzz floor holds
   * against. Resets with the afternoon, exactly like Buzz itself. */
  peakBuzz: number
  /** Production owed to the next hit after coming back (nugs). Set by the
   * offline pass when a return-gift keepsake is on the couch. */
  returnGift: number
  /**
   * Manual presses only — the cadence a hit-echo keepsake counts.
   *
   * It cannot ride `totalHits`: that counter also accrues the Roommate's
   * auto-hits, which arrive as a FRACTION per tick (`autoHits * dt`), so an
   * exact modulo against it stops matching the moment a player buys the
   * Roommate, and an echo's own +2 would shift the cadence besides.
   * (Codex CL#19 R1, P1.)
   */
  manualHits: number
  /**
   * Whether the couch has ever been arranged for this save. Load-time
   * catch-up runs only while this is false, so a v3 player who deliberately
   * leaves a place empty still finds it empty after a reload or an
   * export/import. (Codex CL#19 R1, P2.)
   */
  couchSeeded: boolean
  totalHits: number
  playTime: number
  lastTick: number
  startedAt: number
  sound: boolean
  booted: boolean
}

export function defaultSave(now = Date.now()): SaveState {
  return {
    version: 3,
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
    keepsakes: [],
    equipped: [],
    peakBuzz: 0,
    returnGift: 0,
    manualHits: 0,
    couchSeeded: false,
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
    keepsakes: [] as string[],
    equipped: [] as string[],
  }
  // The couch fields are read ONLY from a save that could legitimately have
  // them. A pre-v3 code carrying a hand-edited `equipped` would otherwise
  // arrive equipped and change the offline pass that runs immediately after
  // import — which is exactly the rate-neutrality this migration promises.
  const fromVersion = Number.isFinite(raw.version) ? Number(raw.version) : 0
  if (fromVersion >= 3) {
    merged.keepsakes = Array.isArray(raw.keepsakes) ? raw.keepsakes.filter(id => keepsakeById(id) != null) : []
    merged.equipped = Array.isArray(raw.equipped) ? raw.equipped.filter(id => keepsakeById(id) != null) : []
  }
  // v1 → v2: `lifeHigh`. A v1 save carries no record of prestiged
  // afternoons, so the conservative floor is the current one:
  // max(high, peakHigh) — DESIGN § 9.4. The same clamp repairs any save
  // that would violate the lifeHigh ≥ peakHigh ≥ 0 invariant.
  const prior = Number.isFinite(merged.lifeHigh) ? merged.lifeHigh : 0
  merged.lifeHigh = Math.max(prior, merged.high, merged.peakHigh, 0)
  // v2 -> v3: keepsakes. A save that already lived those chapters gets them
  // back retroactively — the chapter is the only way to have earned one, so
  // granting by lifeHigh is exactly the history the save records. Nothing is
  // ARRANGED here: migration stays rate-neutral by construction, and the
  // first `collectKeepsakes` pass (store, simulator — never the replay
  // harness) fills the empty slots. Two consequences that are the point:
  // an old save is bit-for-bit unchanged in output until it next ticks, and
  // the recorded replay traces keep validating the seam they recorded.
  const earned = new Set(merged.keepsakes)
  for (const id of keepsakesEarnedBy(merged.lifeHigh)) earned.add(id)
  merged.keepsakes = KEEPSAKES.filter(k => earned.has(k.id)).map(k => k.id)
  // Return a LEGAL arrangement rather than leaving `computeRates` to ignore
  // overflow: a hand-edited save could otherwise list the same keepsake many
  // times, and duplicate shelf keepsakes would each be counted for a place.
  const seen = new Set<string>()
  const unique = merged.equipped.filter(id => {
    if (!merged.keepsakes.includes(id) || seen.has(id)) return false
    seen.add(id)
    return true
  })
  merged.equipped = unique.slice(0, Math.max(0, keepsakeSlots({ lifeHigh: merged.lifeHigh, equipped: unique })))
  merged.manualHits = Number.isFinite(merged.manualHits) && merged.manualHits > 0 ? merged.manualHits : 0
  merged.couchSeeded = merged.equipped.length > 0 ? true : merged.couchSeeded === true
  merged.peakBuzz = Number.isFinite(merged.peakBuzz) ? Math.max(merged.peakBuzz, merged.buzz, 0) : Math.max(merged.buzz, 0)
  merged.returnGift = Number.isFinite(merged.returnGift) && merged.returnGift > 0 ? merged.returnGift : 0
  return { ...merged, version: 3 }
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

/** Owned units per milestone doubling, before any keepsake shortens it. */
export const MILESTONE_STEP = 25

/**
 * What the couch is currently doing (DESIGN § 11). A pure fold over the
 * equipped keepsakes.
 *
 * Two rules make the set legible instead of arithmetic soup:
 *  - **Strongest of a kind wins; kinds never stack.** Two `buzz-floor`
 *    keepsakes give you the better floor, not the sum. A later chapter's
 *    keepsake therefore RETIRES an earlier one and frees its slot, which is
 *    how this family gains depth without gaining rows.
 *  - **Every effect transforms a system that already exists.** Nothing here
 *    mints a currency; each field below is consumed by a formula that shipped
 *    before keepsakes did.
 */
export interface KeepsakeMods {
  /** Work rows also produce nugs at this share of their cash output. */
  workNugShare: number
  /** Grow rows also produce cash at this share of their nug output. */
  growCashShare: number
  /** Buzz never decays below this share of the afternoon's peak Buzz. */
  buzzFloorShare: number
  /** The first hit after a return pays this many seconds of production. */
  returnGiftSeconds: number
  /** When set, offline time is uncapped and earns at this flat efficiency. */
  offlineUncapEff: number | null
  /** Every Nth hit lands twice. null = no echo. */
  hitEchoEveryNth: number | null
  /** Owned units per milestone doubling, per shelf (25 = unchanged). */
  growMilestoneStep: number
  workMilestoneStep: number
  /** Seconds between automatic purchases per shelf. null = manual only. */
  autoBuyGrowEvery: number | null
  autoBuyWorkEvery: number | null
  /** Multiplier on the Clarity a Wake & Bake pays. */
  clarityYield: number
  /** Slots the couch has, and how many are taken. */
  slots: number
  slotsUsed: number
}

export const NO_KEEPSAKES: KeepsakeMods = {
  workNugShare: 0, growCashShare: 0, buzzFloorShare: 0, returnGiftSeconds: 0,
  offlineUncapEff: null, hitEchoEveryNth: null,
  growMilestoneStep: MILESTONE_STEP, workMilestoneStep: MILESTONE_STEP,
  autoBuyGrowEvery: null, autoBuyWorkEvery: null,
  clarityYield: 1, slots: 0, slotsUsed: 0,
}

/** Shelf space right now: what the life has opened, plus what `shelf`
 * keepsakes add (each occupies one of the slots it grants). */
export function keepsakeSlots(s: Pick<SaveState, 'lifeHigh' | 'equipped'>): number {
  let slots = baseSlotsFor(s.lifeHigh)
  for (const id of s.equipped) {
    const k = keepsakeById(id)
    if (k?.effect.kind === 'shelf') slots += k.effect.slots - 1
  }
  return slots
}

/** The effects of everything on the couch. Equipped ids beyond the slot
 * count are ignored rather than trusted — a save can only ever under-claim. */
export function keepsakeEffects(s: Pick<SaveState, 'lifeHigh' | 'equipped'>): KeepsakeMods {
  const slots = keepsakeSlots(s)
  const active = s.equipped.slice(0, Math.max(0, slots))
  const m: KeepsakeMods = { ...NO_KEEPSAKES, slots, slotsUsed: active.length }
  const best = (a: number, b: number) => Math.max(a, b)
  const soonest = (a: number | null, b: number) => (a == null ? b : Math.min(a, b))
  for (const id of active) {
    const k = keepsakeById(id)
    if (!k) continue
    const e = k.effect
    switch (e.kind) {
      case 'work-nugs': m.workNugShare = best(m.workNugShare, e.share); break
      case 'grow-cash': m.growCashShare = best(m.growCashShare, e.share); break
      case 'buzz-floor': m.buzzFloorShare = best(m.buzzFloorShare, e.share); break
      case 'return-gift': m.returnGiftSeconds = best(m.returnGiftSeconds, e.seconds); break
      case 'offline-uncap': m.offlineUncapEff = best(m.offlineUncapEff ?? 0, e.efficiency); break
      case 'hit-echo': m.hitEchoEveryNth = soonest(m.hitEchoEveryNth, e.everyNth); break
      case 'clarity-yield': m.clarityYield = best(m.clarityYield, e.value); break
      case 'milestone-early': {
        const step = Math.max(1, MILESTONE_STEP - e.units)
        if (e.target === 'grow') m.growMilestoneStep = Math.min(m.growMilestoneStep, step)
        else m.workMilestoneStep = Math.min(m.workMilestoneStep, step)
        break
      }
      case 'auto-buy': {
        if (e.target === 'grow') m.autoBuyGrowEvery = soonest(m.autoBuyGrowEvery, e.everySeconds)
        else m.autoBuyWorkEvery = soonest(m.autoBuyWorkEvery, e.everySeconds)
        break
      }
      case 'shelf': break
    }
  }
  return m
}

/** A keepsake is superseded when something else on the couch already does
 * its job at least as well — the UI says so, and auto-arrange skips it. */
export function isSuperseded(id: string, mods: KeepsakeMods): boolean {
  const k = keepsakeById(id)
  if (!k) return false
  const e = k.effect
  switch (e.kind) {
    case 'work-nugs': return mods.workNugShare > e.share
    case 'grow-cash': return mods.growCashShare > e.share
    case 'buzz-floor': return mods.buzzFloorShare > e.share
    case 'return-gift': return mods.returnGiftSeconds > e.seconds
    case 'offline-uncap': return (mods.offlineUncapEff ?? 0) > e.efficiency
    case 'hit-echo': return mods.hitEchoEveryNth != null && mods.hitEchoEveryNth < e.everyNth
    case 'clarity-yield': return mods.clarityYield > e.value
    case 'milestone-early': return (e.target === 'grow' ? mods.growMilestoneStep : mods.workMilestoneStep) < MILESTONE_STEP - e.units
    case 'auto-buy': {
      const cur = e.target === 'grow' ? mods.autoBuyGrowEvery : mods.autoBuyWorkEvery
      return cur != null && cur < e.everySeconds
    }
    case 'shelf': return false
  }
}

/** Every `step` owned units of a generator or job doubles its output. The
 * step is 25 unless a `milestone-early` keepsake shortens that shelf's —
 * the ONE place the number lives, so the shop preview, the rate engine and
 * the simulator's ROI cannot disagree about it. */
export function milestoneMult(count: number, t: Tuning = DEFAULT_TUNING, step: number = MILESTONE_STEP): number {
  return 2 ** Math.min(Math.floor(count / Math.max(1, step)), t.milestoneCapDoublings)
}

/** Item-local output shown by a Grow row, before global multipliers. */
export function generatorOutput(def: GeneratorDef, count: number, t: Tuning = DEFAULT_TUNING, step: number = MILESTONE_STEP): number {
  return def.baseRate * count * milestoneMult(count, t, step)
}

/** Primary item-local cash output shown by a Work row, before global multipliers. */
export function jobCashOutput(def: JobDef, count: number, t: Tuning = DEFAULT_TUNING, step: number = MILESTONE_STEP): number {
  return def.cashRate * count * milestoneMult(count, t, step)
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
  /** What the couch is doing right now — folded in above, exposed so the
   * UI and the simulator read ONE derivation rather than re-deriving it. */
  keepsakes: KeepsakeMods
  /** Buzz's decay floor this afternoon (0 when nothing holds it). */
  buzzFloor: number
}

const lv = (o: Record<string, number>, id: string) => o[id] ?? 0

export function computeRates(s: SaveState, t: Tuning = DEFAULT_TUNING): Rates {
  const ks = keepsakeEffects(s)
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

  let growBase = 0
  for (const g of GENERATORS) {
    const n = lv(s.generators, g.id)
    growBase += generatorOutput(g, n, t, ks.growMilestoneStep)
  }

  let workBase = 0
  let highRate = 0
  for (const j of JOBS) {
    const n = lv(s.jobs, j.id)
    workBase += jobCashOutput(j, n, t, ks.workMilestoneStep)
    highRate += j.highRate * n
  }
  highRate *= highMult

  // Keepsakes cross-wire the two shelves rather than adding a third: Work's
  // own cash output also arrives as nugs, and Grow's own nug output also
  // arrives as cash — each scaled by the multiplier stack of the currency it
  // lands in, so a cross-wired nug is worth exactly what a grown one is.
  const nugRate = (growBase + workBase * ks.workNugShare) * nugMult
  const cashRateBase = (workBase + growBase * ks.growCashShare) * cashMult
  let cashRate = cashRateBase

  const decay = 0.012 / (1 + water * 0.28) / (1 + snacks * 0.18)
  const autoHits = roommate * 0.32
  const lampBuzz = lamp * 0.18
  const hitPower = (1 + sunday * 0.28) * clarity
  const hitHigh = 1 + sunday * 0.06
  const hitBuzz = (2.4 + sunday * 0.15) * (1 + lighter * 0.06) * ach.buzz
  const hitCash = 0.9 * hitPower

  // Passive trickle: staring at the lamp is worth a little cash.
  cashRate += 0.05 * (1 + Math.log10(1 + s.high)) * buzzMult

  // The Evidence Tag trade, stated as arithmetic: no cap at all, at a flat
  // efficiency that is deliberately WORSE than a maxed Blackout Curtains.
  // Short absences lose, long ones win; that is the decision.
  const offlineCap = ks.offlineUncapEff != null ? Infinity : (2 + curtains * 2) * 3600
  const offlineEff = ks.offlineUncapEff ?? (0.45 + curtains * 0.1)
  const prestigeBonus = (1 + cushion * 0.22) * ks.clarityYield
  const buzzFloor = ks.buzzFloorShare * Math.max(0, s.peakBuzz)

  return {
    nugRate, cashRate, highRate, autoHits, lampBuzz, decay,
    buzzMult, nugMult, cashMult, highMult, hitPower, hitHigh, hitBuzz, hitCash,
    offlineCap, offlineEff, prestigeBonus, keepsakes: ks, buzzFloor,
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
  const decayed = s.buzz * Math.exp(-r.decay * dt) + r.lampBuzz * dt + auto * r.hitBuzz
  // A buzz floor holds decay above a share of the afternoon's own peak. It
  // never ADDS buzz — a floor above the current level cannot lift it, only
  // stop it falling further, so it can never manufacture a multiplier out of
  // an afternoon that has not earned one.
  const buzz = Math.max(0, Math.max(decayed, Math.min(s.buzz, r.buzzFloor)))
  return {
    ...s,
    high,
    lifeHigh: s.lifeHigh + gained,
    peakHigh: Math.max(s.peakHigh, high),
    nugs: s.nugs + r.nugRate * dt + auto * r.hitPower,
    cash: s.cash + r.cashRate * dt + auto * r.hitCash,
    buzz,
    peakBuzz: Math.max(s.peakBuzz, buzz),
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
  const relaxed = s.buzz * Math.exp(-r.decay * effective) + steady * (1 - Math.exp(-r.decay * effective))
  const buzz = Math.max(0, Math.max(relaxed, Math.min(s.buzz, r.buzzFloor)))
  const high = s.high + highGain
  // The Spare Key: what the room made while you were out is waiting on the
  // first hit back, so returning has a moment instead of only a number.
  // Computed from the rates you LEFT with, banked, and paid once.
  const gift = r.keepsakes.returnGiftSeconds > 0
    ? s.returnGift + r.nugRate * r.keepsakes.returnGiftSeconds
    : s.returnGift
  return {
    save: {
      ...s,
      nugs: s.nugs + nugGain,
      cash: s.cash + cashGain,
      high,
      lifeHigh: s.lifeHigh + highGain,
      peakHigh: Math.max(s.peakHigh, high),
      buzz,
      peakBuzz: Math.max(s.peakBuzz, buzz),
      returnGift: gift,
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
