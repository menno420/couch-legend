// The strategy players. Each is a deliberately simple archetype — the point is
// bracketing real play between extremes (never-click vs hammer, hoard vs
// spend-all, camp vs check-in), not modeling any one human well.

import { DEFAULT_TUNING, keepsakeEffects, keepsakeSlots, milestoneMult, type Tuning } from '../engine'
import { GENERATORS, JOBS, KEEPSAKES, RITUALS, stageUnlocked, type KeepsakeDef } from '../content'
import type { SaveState } from '../actions'
import type { BuyAction, Policy } from './sim'

const unitCost = (base: number, scale: number, owned: number) => base * scale ** owned

function affordableRituals(s: SaveState): { id: string; cost: number }[] {
  const out: { id: string; cost: number }[] = []
  for (const r of RITUALS) {
    if (s.high < r.unlockHigh || !stageUnlocked(s.lifeHigh, r.stage)) continue
    const level = s.rituals[r.id] ?? 0
    if (level >= r.maxLevel) continue
    const cost = r.costs[level]
    if (cost == null) continue
    if ((r.currency === 'nugs' ? s.nugs : s.cash) >= cost) out.push({ id: r.id, cost })
  }
  return out
}

/** Best-return-per-cost purchase across generators and jobs, rituals first. */
function roiBuy(s: SaveState, t: Tuning = DEFAULT_TUNING): BuyAction | null {
  const cheap = affordableRituals(s)[0]
  if (cheap) return { kind: 'ritual', id: cheap.id }

  // ROI must price the milestone the couch will actually deliver, or the
  // simulated player values a shelf the keepsake shortened at the wrong rate.
  const ks = keepsakeEffects(s)

  let best: { action: BuyAction; roi: number } | null = null
  for (const g of GENERATORS) {
    if (s.high < g.unlockHigh || !stageUnlocked(s.lifeHigh, g.stage)) continue
    const n = s.generators[g.id] ?? 0
    const cost = unitCost(g.baseCost, g.costScale, n)
    if (s.nugs < cost) continue
    const marginal = g.baseRate * ((n + 1) * milestoneMult(n + 1, t, ks.growMilestoneStep) - n * milestoneMult(n, t, ks.growMilestoneStep))
    const roi = marginal / cost
    if (!best || roi > best.roi) best = { action: { kind: 'gen', id: g.id }, roi }
  }
  for (const j of JOBS) {
    if (s.high < j.unlockHigh || !stageUnlocked(s.lifeHigh, j.stage)) continue
    const n = s.jobs[j.id] ?? 0
    const cost = unitCost(j.baseCost, j.costScale, n)
    if (s.cash < cost) continue
    const marginal = j.cashRate * ((n + 1) * milestoneMult(n + 1, t, ks.workMilestoneStep) - n * milestoneMult(n, t, ks.workMilestoneStep))
    const roi = marginal / cost
    if (!best || roi > best.roi) best = { action: { kind: 'job', id: j.id }, roi }
  }
  return best?.action ?? null
}

/** Anything affordable, cheapest first — the impulse spender. */
function greedyBuy(s: SaveState): BuyAction | null {
  let best: { action: BuyAction; cost: number } | null = null
  for (const g of GENERATORS) {
    if (s.high < g.unlockHigh || !stageUnlocked(s.lifeHigh, g.stage)) continue
    const cost = unitCost(g.baseCost, g.costScale, s.generators[g.id] ?? 0)
    if (s.nugs >= cost && (!best || cost < best.cost)) best = { action: { kind: 'gen', id: g.id }, cost }
  }
  for (const j of JOBS) {
    if (s.high < j.unlockHigh || !stageUnlocked(s.lifeHigh, j.stage)) continue
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
  const nextGen = GENERATORS.find(g => (s.generators[g.id] ?? 0) === 0 && stageUnlocked(s.lifeHigh, g.stage))
  const nextJob = JOBS.find(j => (s.jobs[j.id] ?? 0) === 0 && stageUnlocked(s.lifeHigh, j.stage))
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

/**
 * The couch-optimizing player, as a ranked preference over effect KINDS.
 *
 * It exists to bound the strong end of the arrangement axis: if the fairness
 * rails hold for a player who never touches the Couch tab (every other lane)
 * AND for one who curates it deliberately (this lane), then arranging is
 * strategy rather than a tax. The ranking is a plausible strong player, not
 * a solved optimum — it is deliberately simple, and its job is to be
 * consistently aggressive, not to be right.
 */
const KIND_RANK: Record<string, number> = {
  shelf: 100,          // more slots first: it pays for itself
  'auto-buy': 90,      // purchases you would otherwise make by hand
  'milestone-early': 80,
  'work-nugs': 70,
  'buzz-floor': 60,
  'clarity-yield': 50,
  'grow-cash': 40,
  'hit-echo': 30,
  'return-gift': 20,
  'offline-uncap': 10, // a real trade, and this lane plays attended
}

/** Relative strength within a kind, for the tie-break below. Bigger is
 * better for every shape except the two counted in "every Nth" / "every N
 * seconds", where smaller is. */
function strength(e: KeepsakeDef['effect']): number {
  switch (e.kind) {
    case 'work-nugs': case 'grow-cash': case 'buzz-floor': return e.share
    case 'return-gift': return e.seconds
    case 'offline-uncap': return e.efficiency
    case 'clarity-yield': return e.value
    case 'milestone-early': return e.units
    case 'shelf': return e.slots
    case 'hit-echo': return -e.everyNth
    case 'auto-buy': return -e.everySeconds
  }
}

function arrangeByRank(s: SaveState): string[] | null {
  const owned = KEEPSAKES.filter(k => s.keepsakes.includes(k.id))
  if (owned.length === 0) return null
  // Rank by kind, then by STRENGTH within the kind. Without the tie-break the
  // stable sort kept mint order, so the "strong end" lane took Standing
  // Glass's 10 % cross-wire over The First Follower's 30 % and Valid Until
  // Morning's 18 % floor over the Jar's 40 % — measuring a systematically
  // weaker arrangement than the lane exists to bound. (Codex CL#19 R3, P2.)
  const ranked = [...owned].sort((a, b) =>
    ((KIND_RANK[b.effect.kind] ?? 0) - (KIND_RANK[a.effect.kind] ?? 0))
    || (strength(b.effect) - strength(a.effect)))
  const want: string[] = []
  const kinds = new Set<string>()
  // A kind is superseded per SHELF, not per kind name: milestone-early and
  // auto-buy each have independent Grow and Work targets that the engine
  // applies at the same time. Deduping on the bare kind dropped The Name Tag
  // Drawer and The Standing Order — two effects nothing supersedes — and so
  // weakened the very lane that exists to bound the strong end.
  // (Codex CL#19 R1, P2.)
  const slotKey = (e: typeof owned[number]['effect']) =>
    'target' in e ? `${e.kind}:${e.target}` : e.kind
  for (const k of ranked) {
    if (k.effect.kind !== 'shelf' && kinds.has(slotKey(k.effect))) continue
    const next = [...want, k.id]
    if (next.length > keepsakeSlots({ lifeHigh: s.lifeHigh, equipped: next })) break
    want.push(k.id)
    kinds.add(slotKey(k.effect))
  }
  return want
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
  // The couch-optimizing player: balanced attendance and buying, but it
  // curates the arrangement every decision pass. Bounds the strong end of
  // the new axis against the § 9.6 rails.
  'keepsake-optimizer': {
    name: 'keepsake-optimizer',
    session: { play: 600, away: 900 },
    clickHz: 1.2,
    decisionEvery: 8,
    buy: roiBuy,
    prestigeWhen: patient,
    arrange: arrangeByRank,
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
