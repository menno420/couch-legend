// The strategy players. Each is a deliberately simple archetype — the point is
// bracketing real play between extremes (never-click vs hammer, hoard vs
// spend-all, camp vs check-in), not modeling any one human well.

import { milestoneMult, PROTO_TUNING, type Tuning } from '../engine'
import { GENERATORS, JOBS, RITUALS } from '../content'
import type { SaveState } from '../actions'
import type { BuyAction, Policy } from './sim'

const unitCost = (base: number, scale: number, owned: number) => base * scale ** owned

function affordableRituals(s: SaveState): { id: string; cost: number }[] {
  const out: { id: string; cost: number }[] = []
  for (const r of RITUALS) {
    if (s.high < r.unlockHigh) continue
    const level = s.rituals[r.id] ?? 0
    if (level >= r.maxLevel) continue
    const cost = r.costs[level]
    if (cost == null) continue
    if ((r.currency === 'nugs' ? s.nugs : s.cash) >= cost) out.push({ id: r.id, cost })
  }
  return out
}

/** Best-return-per-cost purchase across generators and jobs, rituals first. */
function roiBuy(s: SaveState, t: Tuning = PROTO_TUNING): BuyAction | null {
  const cheap = affordableRituals(s)[0]
  if (cheap) return { kind: 'ritual', id: cheap.id }

  let best: { action: BuyAction; roi: number } | null = null
  for (const g of GENERATORS) {
    if (s.high < g.unlockHigh) continue
    const n = s.generators[g.id] ?? 0
    const cost = unitCost(g.baseCost, g.costScale, n)
    if (s.nugs < cost) continue
    const marginal = g.baseRate * ((n + 1) * milestoneMult(n + 1, t) - n * milestoneMult(n, t))
    const roi = marginal / cost
    if (!best || roi > best.roi) best = { action: { kind: 'gen', id: g.id }, roi }
  }
  for (const j of JOBS) {
    if (s.high < j.unlockHigh) continue
    const n = s.jobs[j.id] ?? 0
    const cost = unitCost(j.baseCost, j.costScale, n)
    if (s.cash < cost) continue
    const marginal = j.cashRate * ((n + 1) * milestoneMult(n + 1, t) - n * milestoneMult(n, t))
    const roi = marginal / cost
    if (!best || roi > best.roi) best = { action: { kind: 'job', id: j.id }, roi }
  }
  return best?.action ?? null
}

/** Anything affordable, cheapest first — the impulse spender. */
function greedyBuy(s: SaveState): BuyAction | null {
  let best: { action: BuyAction; cost: number } | null = null
  for (const g of GENERATORS) {
    if (s.high < g.unlockHigh) continue
    const cost = unitCost(g.baseCost, g.costScale, s.generators[g.id] ?? 0)
    if (s.nugs >= cost && (!best || cost < best.cost)) best = { action: { kind: 'gen', id: g.id }, cost }
  }
  for (const j of JOBS) {
    if (s.high < j.unlockHigh) continue
    const cost = unitCost(j.baseCost, j.costScale, s.jobs[j.id] ?? 0)
    if (s.cash >= cost && (!best || cost < best.cost)) best = { action: { kind: 'job', id: j.id }, cost }
  }
  for (const { id, cost } of affordableRituals(s)) {
    if (!best || cost < best.cost) best = { action: { kind: 'ritual', id }, cost }
  }
  return best?.action ?? null
}

/** Hoard toward the next unowned tier on each currency; light maintenance. */
function tierBuy(s: SaveState): BuyAction | null {
  const nextGen = GENERATORS.find(g => (s.generators[g.id] ?? 0) === 0)
  const nextJob = JOBS.find(j => (s.jobs[j.id] ?? 0) === 0)
  if (nextGen && s.high >= nextGen.unlockHigh && s.nugs >= nextGen.baseCost) return { kind: 'gen', id: nextGen.id }
  if (nextJob && s.high >= nextJob.unlockHigh && s.cash >= nextJob.baseCost) return { kind: 'job', id: nextJob.id }
  const ritual = affordableRituals(s).find(r => r.cost <= 0.05 * Math.max(s.nugs, s.cash))
  if (ritual) return { kind: 'ritual', id: ritual.id }
  // Maintenance singles only when nearly free relative to the hoard.
  for (const g of GENERATORS) {
    if (s.high < g.unlockHigh || (s.generators[g.id] ?? 0) === 0) continue
    const cost = unitCost(g.baseCost, g.costScale, s.generators[g.id] ?? 0)
    if (cost <= 0.02 * s.nugs) return { kind: 'gen', id: g.id }
  }
  return null
}

const eager = (_s: SaveState, gain: number) => gain >= 1
const patient = (s: SaveState, gain: number) => gain >= Math.max(1, Math.ceil(0.5 * s.enlightenment))
const never = () => false

export const POLICIES: Record<string, Policy> = {
  'idle-only': {
    name: 'idle-only',
    session: { play: 60, away: 1800 },
    clickHz: 0.2,
    decisionEvery: 10,
    buy: roiBuy,
    prestigeWhen: patient,
  },
  'click-heavy': {
    name: 'click-heavy',
    session: 'continuous',
    clickHz: 3,
    decisionEvery: 5,
    buy: greedyBuy,
    prestigeWhen: eager,
  },
  // Same attendance and clicking as click-heavy, patient prestige — isolates
  // the prestige-discipline axis from the attendance/click axis.
  'click-heavy-patient': {
    name: 'click-heavy-patient',
    session: 'continuous',
    clickHz: 3,
    decisionEvery: 5,
    buy: greedyBuy,
    prestigeWhen: patient,
  },
  balanced: {
    name: 'balanced',
    session: { play: 600, away: 900 },
    clickHz: 1.2,
    decisionEvery: 8,
    buy: roiBuy,
    prestigeWhen: patient,
  },
  'spend-everything': {
    name: 'spend-everything',
    session: 'continuous',
    clickHz: 1.2,
    decisionEvery: 5,
    buy: greedyBuy,
    prestigeWhen: eager,
  },
  'save-for-tiers': {
    name: 'save-for-tiers',
    session: { play: 600, away: 900 },
    clickHz: 1.2,
    decisionEvery: 8,
    buy: tierBuy,
    prestigeWhen: patient,
  },
  'no-prestige': {
    name: 'no-prestige',
    session: { play: 600, away: 900 },
    clickHz: 1.2,
    decisionEvery: 8,
    buy: roiBuy,
    prestigeWhen: never,
  },
  // The literal never-click extreme. From a fresh save this lane is WALLED at
  // the opening by design — no hit means no High and no nugs, so nothing ever
  // unlocks (pillar 1: the click is the game's first verb). It exists so the
  // reachability claim states its boundary from measurement, not omission.
  'zero-click': {
    name: 'zero-click',
    session: { play: 600, away: 900 },
    clickHz: 0,
    decisionEvery: 8,
    buy: roiBuy,
    prestigeWhen: never,
  },
}
