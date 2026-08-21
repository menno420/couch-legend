// The pure action layer: every player-initiated state change, extracted from
// the web store so the balance simulator and the UI run the exact same code.
// Nothing here touches the DOM. Semantics are a faithful extraction of the
// original store logic — same order of operations, same rejection rules.

import {
  advance, applyOffline, bulkCost, computeRates, DEFAULT_TUNING, defaultSave,
  maxAffordable, newlyEarned, prestigeGain, PROTO_TUNING,
  type OfflineSummary, type SaveState, type Tuning,
} from './engine'
import { GENERATORS, JOBS, RITUALS, stageUnlocked } from './content'

export interface AchievementCollect {
  save: SaveState
  fresh: string[]
}

/** Append any newly-earned achievements (ids returned for UI toasts). */
export function collectAchievements(save: SaveState): AchievementCollect {
  const fresh = newlyEarned(save)
  if (fresh.length === 0) return { save, fresh }
  return { save: { ...save, achievements: [...save.achievements, ...fresh] }, fresh }
}

/** One manual hit. Rates are read once, before the hit lands (store order). */
export function applyHit(s: SaveState, t: Tuning = DEFAULT_TUNING): SaveState {
  const r = computeRates(s, t)
  const high = s.high + r.hitHigh
  return {
    ...s,
    nugs: s.nugs + r.hitPower,
    cash: s.cash + r.hitCash,
    high,
    lifeHigh: s.lifeHigh + r.hitHigh,
    peakHigh: Math.max(s.peakHigh, high),
    buzz: s.buzz + r.hitBuzz,
    totalHits: s.totalHits + 1,
  }
}

export type BuyAmount = 1 | 10 | 100 | 'max'

/** Buy a generator; null when locked or unaffordable (store rejection rules). */
export function purchaseGenerator(s: SaveState, id: string, amount: BuyAmount): SaveState | null {
  const def = GENERATORS.find(g => g.id === id)
  if (!def || s.high < def.unlockHigh || !stageUnlocked(s.lifeHigh, def.stage)) return null
  const owned = s.generators[id] ?? 0
  const qty = amount === 'max' ? Math.max(1, maxAffordable(def.baseCost, def.costScale, owned, s.nugs)) : amount
  const cost = bulkCost(def.baseCost, def.costScale, owned, qty)
  if (s.nugs < cost || qty <= 0) return null
  return { ...s, nugs: s.nugs - cost, generators: { ...s.generators, [id]: owned + qty } }
}

/** Buy a job; null when locked or unaffordable. */
export function purchaseJob(s: SaveState, id: string, amount: BuyAmount): SaveState | null {
  const def = JOBS.find(j => j.id === id)
  if (!def || s.high < def.unlockHigh || !stageUnlocked(s.lifeHigh, def.stage)) return null
  const owned = s.jobs[id] ?? 0
  const qty = amount === 'max' ? Math.max(1, maxAffordable(def.baseCost, def.costScale, owned, s.cash)) : amount
  const cost = bulkCost(def.baseCost, def.costScale, owned, qty)
  if (s.cash < cost || qty <= 0) return null
  return { ...s, cash: s.cash - cost, jobs: { ...s.jobs, [id]: owned + qty } }
}

/** Buy one ritual level; null when locked, maxed or unaffordable. */
export function purchaseRitual(s: SaveState, id: string): SaveState | null {
  const def = RITUALS.find(r => r.id === id)
  if (!def || s.high < def.unlockHigh || !stageUnlocked(s.lifeHigh, def.stage)) return null
  const level = s.rituals[id] ?? 0
  if (level >= def.maxLevel) return null
  const cost = def.costs[level]
  if (cost == null) return null
  const funds = def.currency === 'nugs' ? s.nugs : s.cash
  if (funds < cost) return null
  return {
    ...s,
    rituals: { ...s.rituals, [id]: level + 1 },
    nugs: def.currency === 'nugs' ? s.nugs - cost : s.nugs,
    cash: def.currency === 'cash' ? s.cash - cost : s.cash,
  }
}

/**
 * Wake & Bake resets an afternoon, never the story (DESIGN § 9.2).
 * Everything resets except lifeHigh, Clarity (banked + gained),
 * achievements, sound, booted and the original start time; null when no
 * Clarity would be gained (store rejection rule).
 */
export function applyPrestige(s: SaveState, now = Date.now(), t: Tuning = DEFAULT_TUNING): SaveState | null {
  const gain = prestigeGain(s, t)
  if (gain <= 0) return null
  return {
    ...defaultSave(now),
    lifeHigh: s.lifeHigh,
    enlightenment: s.enlightenment + gain,
    achievements: s.achievements,
    sound: s.sound,
    booted: true,
    startedAt: s.startedAt,
  }
}

// Re-exports so a headless consumer (the simulator) imports one module.
export { advance, applyOffline, computeRates, DEFAULT_TUNING, defaultSave, prestigeGain, PROTO_TUNING }
export type { OfflineSummary, SaveState, Tuning }
