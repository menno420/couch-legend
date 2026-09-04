import { GENERATORS, JOBS, RITUALS, stageUnlocked } from './content'
import { collectAchievements } from './actions'
import {
  bulkCost, computeRates, DEFAULT_TUNING, generatorOutput, jobCashOutput,
  keepsakeEffects,
  maxAffordable, type Rates, type SaveState, type Tuning,
} from './engine'

export type PurchaseQuantity = 1 | 10 | 100 | 'max'

interface PurchaseBase {
  quantity: number
  cost: number
  affordable: boolean
}

export interface RatePurchaseImpact extends PurchaseBase {
  kind: 'rate'
  resource: 'nugs' | 'cash'
  before: number
  delta: number
  after: number
  /**
   * The OTHER currency this row also produces, when a keepsake has cross-wired
   * the two shelves. Absent when nothing on the couch does that. Without it
   * the preview promised half of what a job or a generator actually pays.
   * (Codex CL#19 R1, P2.)
   *
   * `before`/`after` are the WHOLE cross-wire (what the sending shelf hands
   * the other, after its ceiling), not this row's share of it — the ceiling
   * makes a row's contribution inseparable, and a per-row figure would
   * promise nugs the cap withholds. `delta` is therefore exactly what the
   * tile will move by, before global multipliers; it is 0 when the ceiling
   * already binds, and `capped` says so in words.
   */
  crossWired?: { resource: 'nugs' | 'cash'; before: number; delta: number; after: number; capped: boolean }
  effects: RitualEffect[]
}

export interface EmptyMaxPurchaseImpact extends PurchaseBase {
  kind: 'empty-max'
  quantity: 0
  cost: 0
  affordable: false
}

export type RitualEffect =
  | { kind: 'production'; target: 'grow-work' | 'nugs' | 'job-cash' | 'high'; before: number; after: number }
  | { kind: 'buzz-duration'; before: number; after: number }
  | { kind: 'auto-hits'; before: number; after: number }
  | { kind: 'passive-buzz'; before: number; after: number }
  | { kind: 'hit'; target: 'nugs' | 'cash' | 'nugs-cash' | 'high' | 'buzz'; before: number; after: number }
  | { kind: 'offline-cap'; before: number; after: number }
  | { kind: 'offline-efficiency'; before: number; after: number }
  | { kind: 'prestige-yield'; before: number; after: number }

export interface RitualPurchaseImpact extends PurchaseBase {
  kind: 'ritual'
  quantity: 1
  effects: RitualEffect[]
}

export type PurchaseImpact = RatePurchaseImpact | EmptyMaxPurchaseImpact | RitualPurchaseImpact

function changed(before: number, after: number): boolean {
  return Math.abs(after - before) > Math.max(1, Math.abs(before), Math.abs(after)) * 1e-12
}

function sameRatio(before: number, after: number, otherBefore: number, otherAfter: number): boolean {
  if (before === 0 || otherBefore === 0) return false
  return Math.abs(after / before - otherAfter / otherBefore) < 1e-10
}

/**
 * Translate canonical rate-field changes into semantic effects. This is keyed
 * by what changed, never by ritual id, so new rituals reuse the same vocabulary
 * without adding another mechanics table.
 */
export function ritualEffects(before: Rates, after: Rates): RitualEffect[] {
  const effects: RitualEffect[] = []
  const nugChanged = changed(before.nugMult, after.nugMult)
  const cashChanged = changed(before.cashMult, after.cashMult)
  const highChanged = changed(before.highMult, after.highMult)
  const growWorkProduction = nugChanged && cashChanged && highChanged
    && sameRatio(before.nugMult, after.nugMult, before.cashMult, after.cashMult)
    && sameRatio(before.nugMult, after.nugMult, before.highMult, after.highMult)

  if (growWorkProduction) {
    effects.push({ kind: 'production', target: 'grow-work', before: before.nugMult, after: after.nugMult })
  } else {
    if (nugChanged) effects.push({ kind: 'production', target: 'nugs', before: before.nugMult, after: after.nugMult })
    if (cashChanged) effects.push({ kind: 'production', target: 'job-cash', before: before.cashMult, after: after.cashMult })
    if (highChanged) effects.push({ kind: 'production', target: 'high', before: before.highMult, after: after.highMult })
  }

  if (changed(before.decay, after.decay)) {
    effects.push({ kind: 'buzz-duration', before: 1 / before.decay, after: 1 / after.decay })
  }
  if (changed(before.autoHits, after.autoHits)) {
    effects.push({ kind: 'auto-hits', before: before.autoHits, after: after.autoHits })
  }
  if (changed(before.lampBuzz, after.lampBuzz)) {
    effects.push({ kind: 'passive-buzz', before: before.lampBuzz, after: after.lampBuzz })
  }
  const hitNugsChanged = changed(before.hitPower, after.hitPower)
  const hitCashChanged = changed(before.hitCash, after.hitCash)
  if (hitNugsChanged && hitCashChanged
    && sameRatio(before.hitPower, after.hitPower, before.hitCash, after.hitCash)) {
    effects.push({ kind: 'hit', target: 'nugs-cash', before: before.hitPower, after: after.hitPower })
  } else {
    if (hitNugsChanged) {
      effects.push({ kind: 'hit', target: 'nugs', before: before.hitPower, after: after.hitPower })
    }
    if (hitCashChanged) {
      effects.push({ kind: 'hit', target: 'cash', before: before.hitCash, after: after.hitCash })
    }
  }
  if (changed(before.hitHigh, after.hitHigh)) {
    effects.push({ kind: 'hit', target: 'high', before: before.hitHigh, after: after.hitHigh })
  }
  if (changed(before.hitBuzz, after.hitBuzz)) {
    effects.push({ kind: 'hit', target: 'buzz', before: before.hitBuzz, after: after.hitBuzz })
  }
  if (changed(before.offlineCap, after.offlineCap)) {
    effects.push({ kind: 'offline-cap', before: before.offlineCap, after: after.offlineCap })
  }
  if (changed(before.offlineEff, after.offlineEff)) {
    effects.push({ kind: 'offline-efficiency', before: before.offlineEff, after: after.offlineEff })
  }
  if (changed(before.prestigeBonus, after.prestigeBonus)) {
    effects.push({ kind: 'prestige-yield', before: before.prestigeBonus, after: after.prestigeBonus })
  }
  return effects
}

function selectedQuantity(
  amount: PurchaseQuantity,
  baseCost: number,
  scale: number,
  owned: number,
  funds: number,
): number {
  return amount === 'max' ? maxAffordable(baseCost, scale, owned, funds) : amount
}

export function generatorPurchaseImpact(
  save: SaveState,
  id: string,
  amount: PurchaseQuantity,
  tuning: Tuning = DEFAULT_TUNING,
): PurchaseImpact | null {
  const def = GENERATORS.find(item => item.id === id)
  if (!def || save.high < def.unlockHigh || !stageUnlocked(save.lifeHigh, def.stage)) return null
  const beforeSave = collectAchievements(save).save
  const owned = beforeSave.generators[id] ?? 0
  const quantity = selectedQuantity(amount, def.baseCost, def.costScale, owned, save.nugs)
  if (quantity === 0) return { kind: 'empty-max', quantity: 0, cost: 0, affordable: false }
  const cost = bulkCost(def.baseCost, def.costScale, owned, quantity)
  // The couch can shorten this shelf's milestone step; the preview reads the
  // same derivation the economy does, so the promised number is the paid one.
  const mods = keepsakeEffects(beforeSave)
  const step = mods.growMilestoneStep
  const before = generatorOutput(def, owned, tuning, step)
  const after = generatorOutput(def, owned + quantity, tuning, step)
  const afterSave = collectAchievements({
    ...beforeSave,
    generators: { ...beforeSave.generators, [id]: owned + quantity },
  }).save
  const ratesBefore = computeRates(beforeSave, tuning)
  const ratesAfter = computeRates(afterSave, tuning)
  // Earth in the Window makes a Grow row pay cash too; the preview must say
  // so — and say exactly what the economy will pay, ceiling included.
  const crossWired = mods.growCashShare > 0
    ? crossWireDelta('cash', ratesBefore.shelves.growToCash, ratesAfter.shelves.growToCash,
        ratesAfter.shelves.work * mods.growCashCeiling)
    : undefined
  return {
    kind: 'rate', resource: 'nugs', quantity, cost, affordable: save.nugs >= cost,
    before, delta: after - before, after, crossWired,
    effects: ritualEffects(ratesBefore, ratesAfter),
  }
}

/** The cross-wire's before/after as the economy will actually pay it, and
 * whether the ceiling is what stopped it growing. `capped` is judged on the
 * AFTER state: the purchase pushed the cross-wire onto (or left it on) the
 * ceiling, so the tile moved less than the row's share alone would say. */
function crossWireDelta(
  resource: 'nugs' | 'cash', before: number, after: number, ceilingAfter: number,
): NonNullable<RatePurchaseImpact['crossWired']> {
  const capped = after >= ceilingAfter * (1 - 1e-12)
  return { resource, before, delta: after - before, after, capped }
}

export function jobPurchaseImpact(
  save: SaveState,
  id: string,
  amount: PurchaseQuantity,
  tuning: Tuning = DEFAULT_TUNING,
): PurchaseImpact | null {
  const def = JOBS.find(item => item.id === id)
  if (!def || save.high < def.unlockHigh || !stageUnlocked(save.lifeHigh, def.stage)) return null
  const beforeSave = collectAchievements(save).save
  const owned = beforeSave.jobs[id] ?? 0
  const quantity = selectedQuantity(amount, def.baseCost, def.costScale, owned, save.cash)
  if (quantity === 0) return { kind: 'empty-max', quantity: 0, cost: 0, affordable: false }
  const cost = bulkCost(def.baseCost, def.costScale, owned, quantity)
  const mods = keepsakeEffects(beforeSave)
  const step = mods.workMilestoneStep
  const before = jobCashOutput(def, owned, tuning, step)
  const after = jobCashOutput(def, owned + quantity, tuning, step)
  const afterSave = collectAchievements({
    ...beforeSave,
    jobs: { ...beforeSave.jobs, [id]: owned + quantity },
  }).save
  const ratesBefore = computeRates(beforeSave, tuning)
  const ratesAfter = computeRates(afterSave, tuning)
  // The Standing Glass / The First Follower make a Work row pay nugs too —
  // up to the garden's ceiling, which the preview must not promise past.
  const crossWired = mods.workNugShare > 0
    ? crossWireDelta('nugs', ratesBefore.shelves.workToNugs, ratesAfter.shelves.workToNugs,
        ratesAfter.shelves.grow * mods.workNugCeiling)
    : undefined
  return {
    kind: 'rate', resource: 'cash', quantity, cost, affordable: save.cash >= cost,
    before, delta: after - before, after, crossWired,
    effects: ritualEffects(ratesBefore, ratesAfter),
  }
}

export function ritualPurchaseImpact(
  save: SaveState,
  id: string,
  tuning: Tuning = DEFAULT_TUNING,
): RitualPurchaseImpact | null {
  const def = RITUALS.find(item => item.id === id)
  if (!def || save.high < def.unlockHigh || !stageUnlocked(save.lifeHigh, def.stage)) return null
  const beforeSave = collectAchievements(save).save
  const level = beforeSave.rituals[id] ?? 0
  const cost = def.costs[level]
  if (level >= def.maxLevel || cost == null) return null
  const afterSave = collectAchievements({
    ...beforeSave,
    rituals: { ...beforeSave.rituals, [id]: level + 1 },
  }).save
  const funds = def.currency === 'nugs' ? save.nugs : save.cash
  return {
    kind: 'ritual', quantity: 1, cost, affordable: funds >= cost,
    effects: ritualEffects(computeRates(beforeSave, tuning), computeRates(afterSave, tuning)),
  }
}
