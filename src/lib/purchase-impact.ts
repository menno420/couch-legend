import { GENERATORS, JOBS, RITUALS, stageUnlocked } from './content'
import {
  bulkCost, computeRates, DEFAULT_TUNING, generatorOutput, jobCashOutput,
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
}

export interface EmptyMaxPurchaseImpact extends PurchaseBase {
  kind: 'empty-max'
  quantity: 0
  cost: 0
  affordable: false
}

export type RitualEffect =
  | { kind: 'production'; target: 'all' | 'nugs' | 'cash' | 'high'; before: number; after: number }
  | { kind: 'buzz-duration'; before: number; after: number }
  | { kind: 'auto-hits'; before: number; after: number }
  | { kind: 'passive-buzz'; before: number; after: number }
  | { kind: 'hit'; target: 'nugs' | 'high' | 'buzz'; before: number; after: number }
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
  const allProduction = nugChanged && cashChanged && highChanged
    && sameRatio(before.nugMult, after.nugMult, before.cashMult, after.cashMult)
    && sameRatio(before.nugMult, after.nugMult, before.highMult, after.highMult)

  if (allProduction) {
    effects.push({ kind: 'production', target: 'all', before: before.nugMult, after: after.nugMult })
  } else {
    if (nugChanged) effects.push({ kind: 'production', target: 'nugs', before: before.nugMult, after: after.nugMult })
    if (cashChanged) effects.push({ kind: 'production', target: 'cash', before: before.cashMult, after: after.cashMult })
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
  if (changed(before.hitPower, after.hitPower)) {
    effects.push({ kind: 'hit', target: 'nugs', before: before.hitPower, after: after.hitPower })
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
  const owned = save.generators[id] ?? 0
  const quantity = selectedQuantity(amount, def.baseCost, def.costScale, owned, save.nugs)
  if (quantity === 0) return { kind: 'empty-max', quantity: 0, cost: 0, affordable: false }
  const cost = bulkCost(def.baseCost, def.costScale, owned, quantity)
  const before = generatorOutput(def, owned, tuning)
  const after = generatorOutput(def, owned + quantity, tuning)
  return {
    kind: 'rate', resource: 'nugs', quantity, cost, affordable: save.nugs >= cost,
    before, delta: after - before, after,
  }
}

export function jobPurchaseImpact(
  save: SaveState,
  id: string,
  amount: PurchaseQuantity,
  tuning: Tuning = DEFAULT_TUNING,
): PurchaseImpact | null {
  const def = JOBS.find(item => item.id === id)
  if (!def || save.high < def.unlockHigh || !stageUnlocked(save.lifeHigh, def.stage)) return null
  const owned = save.jobs[id] ?? 0
  const quantity = selectedQuantity(amount, def.baseCost, def.costScale, owned, save.cash)
  if (quantity === 0) return { kind: 'empty-max', quantity: 0, cost: 0, affordable: false }
  const cost = bulkCost(def.baseCost, def.costScale, owned, quantity)
  const before = jobCashOutput(def, owned, tuning)
  const after = jobCashOutput(def, owned + quantity, tuning)
  return {
    kind: 'rate', resource: 'cash', quantity, cost, affordable: save.cash >= cost,
    before, delta: after - before, after,
  }
}

export function ritualPurchaseImpact(
  save: SaveState,
  id: string,
  tuning: Tuning = DEFAULT_TUNING,
): RitualPurchaseImpact | null {
  const def = RITUALS.find(item => item.id === id)
  if (!def || save.high < def.unlockHigh || !stageUnlocked(save.lifeHigh, def.stage)) return null
  const level = save.rituals[id] ?? 0
  const cost = def.costs[level]
  if (level >= def.maxLevel || cost == null) return null
  const afterSave: SaveState = {
    ...save,
    rituals: { ...save.rituals, [id]: level + 1 },
  }
  const funds = def.currency === 'nugs' ? save.nugs : save.cash
  return {
    kind: 'ritual', quantity: 1, cost, affordable: funds >= cost,
    effects: ritualEffects(computeRates(save, tuning), computeRates(afterSave, tuning)),
  }
}
