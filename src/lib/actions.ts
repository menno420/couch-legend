// The pure action layer: every player-initiated state change, extracted from
// the web store so the balance simulator and the UI run the exact same code.
// Nothing here touches the DOM. Semantics are a faithful extraction of the
// original store logic — same order of operations, same rejection rules.

import {
  advance, applyOffline, bulkCost, computeRates, DEFAULT_TUNING, defaultSave,
  isSuperseded, keepsakeEffects, keepsakeSlots, maxAffordable, newlyEarned,
  prestigeGain, PROTO_TUNING,
  type KeepsakeMods, type OfflineSummary, type SaveState, type Tuning,
} from './engine'
import {
  GENERATORS, JOBS, KEEPSAKES, RITUALS, keepsakeById, keepsakesEarnedBy,
  stageUnlocked,
} from './content'

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

/**
 * One manual hit. Rates are read once, before the hit lands (store order).
 *
 * Two keepsakes ride this path, both DETERMINISTIC on purpose — a random
 * echo would break the seeded simulator and the recorded replay traces, and
 * "every fifth hit" is also simply better to feel than a dice roll:
 *  - **hit echo** — the hit lands twice on every Nth hit of the life.
 *  - **return gift** — production banked while away is paid out here, once,
 *    so coming back has a moment attached to it instead of only a number.
 */
export function applyHit(s: SaveState, t: Tuning = DEFAULT_TUNING): SaveState {
  const r = computeRates(s, t)
  const echo = r.keepsakes.hitEchoEveryNth
  const times = echo != null && (s.totalHits + 1) % echo === 0 ? 2 : 1
  const gainedHigh = r.hitHigh * times
  const high = s.high + gainedHigh
  const buzz = s.buzz + r.hitBuzz * times
  return {
    ...s,
    nugs: s.nugs + r.hitPower * times + s.returnGift,
    cash: s.cash + r.hitCash * times,
    high,
    lifeHigh: s.lifeHigh + gainedHigh,
    peakHigh: Math.max(s.peakHigh, high),
    buzz,
    peakBuzz: Math.max(s.peakBuzz, buzz),
    returnGift: 0,
    totalHits: s.totalHits + times,
  }
}

/** What a hit is about to pay, for the UI's floater and the shop preview.
 * One derivation, so the number the player sees is the number they get. */
export function hitPreview(s: SaveState, t: Tuning = DEFAULT_TUNING): { nugs: number; times: number; gift: number } {
  const r = computeRates(s, t)
  const echo = r.keepsakes.hitEchoEveryNth
  const times = echo != null && (s.totalHits + 1) % echo === 0 ? 2 : 1
  return { nugs: r.hitPower * times + s.returnGift, times, gift: s.returnGift }
}

export type BuyAmount = 1 | 10 | 100 | 'max'

/** Buy a generator; null when locked or unaffordable (store rejection rules). */
export function purchaseGenerator(s: SaveState, id: string, amount: BuyAmount, _t: Tuning = DEFAULT_TUNING): SaveState | null {
  const def = GENERATORS.find(g => g.id === id)
  if (!def || s.high < def.unlockHigh || !stageUnlocked(s.lifeHigh, def.stage)) return null
  const owned = s.generators[id] ?? 0
  const qty = amount === 'max' ? Math.max(1, maxAffordable(def.baseCost, def.costScale, owned, s.nugs)) : amount
  const cost = bulkCost(def.baseCost, def.costScale, owned, qty)
  if (s.nugs < cost || qty <= 0) return null
  return { ...s, nugs: s.nugs - cost, generators: { ...s.generators, [id]: owned + qty } }
}

/** Buy a job; null when locked or unaffordable. */
export function purchaseJob(s: SaveState, id: string, amount: BuyAmount, _t: Tuning = DEFAULT_TUNING): SaveState | null {
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
    // The afternoon resets; the couch does not. Keepsakes and the way they
    // are arranged are the story's property, not the afternoon's — which is
    // what makes Wake & Bake feel like continuing a life rather than
    // restarting a run (DESIGN § 11.3).
    keepsakes: s.keepsakes,
    equipped: s.equipped,
    sound: s.sound,
    booted: true,
    startedAt: s.startedAt,
  }
}

// --- the couch: minting, arranging, and the automation it can carry -------

export interface KeepsakeCollect {
  save: SaveState
  /** Keepsakes minted by this pass — the toast/chapter-turn copy. */
  fresh: string[]
  /** Keepsakes auto-arranged into free slots by this pass. */
  arranged: string[]
}

/**
 * How aggressively a pass may put things on the couch.
 *
 *  - `fresh-only` — place ONLY what this pass just minted. This is the mode
 *    every tick uses, and it is what makes taking a keepsake off actually
 *    work: a pass that refilled every free place would put something back
 *    within 50 ms and the player could never deliberately leave a place
 *    empty or swap two keepsakes. (Measured: the first version did exactly
 *    that, and the Couch tab's "Put it on" button was permanently disabled
 *    because no place was ever free for longer than one frame.)
 *  - `fill` — also fill places left empty from before. Used ONLY where the
 *    couch is being (re)loaded rather than played: hydrate, save import, and
 *    the pass right after Wake & Bake. This is what catches a migrating save
 *    up, since the v2 -> v3 migration deliberately arranges nothing.
 */
export type ArrangeMode = 'fresh-only' | 'fill'

/**
 * The mode a play-time pass should use, decided from what actually changed.
 *
 * `fill` when the COUCH GOT BIGGER (a slot chapter was crossed) or a keepsake
 * was minted; `fresh-only` otherwise. That is the distinction the naive
 * version missed: a free place because a new chapter widened the couch should
 * be filled, and a free place because the PLAYER took something off must be
 * left alone. Both were "equipped.length < slots" to a pass that only saw the
 * present, which is why the first version could not tell them apart.
 */
export function arrangeModeFor(before: SaveState, after: SaveState): ArrangeMode {
  return keepsakeSlots(after) > keepsakeSlots(before) ? 'fill' : 'fresh-only'
}

/**
 * Mint every keepsake the life has now earned, and arrange per `mode`.
 *
 * Deliberately a sibling of `collectAchievements` rather than something
 * inside `advance`: the recorded replay traces predate keepsakes and call
 * only `collectAchievements`, so the parity evidence keeps validating the
 * seam it actually recorded. Auto-arranging means a player who never opens
 * the Couch tab is never worse off for ignoring it; it only ever fills empty
 * space, never displaces a choice the player made, and skips a keepsake
 * something better already supersedes.
 */
export function collectKeepsakes(save: SaveState, mode: ArrangeMode = 'fresh-only'): KeepsakeCollect {
  const owned = new Set(save.keepsakes)
  const fresh = keepsakesEarnedBy(save.lifeHigh).filter(id => !owned.has(id))
  const keepsakes = fresh.length ? [...save.keepsakes, ...fresh] : save.keepsakes

  const slots = keepsakeSlots({ lifeHigh: save.lifeHigh, equipped: save.equipped })
  const equipped = save.equipped.filter(id => keepsakes.includes(id)).slice(0, slots)
  const arranged: string[] = []
  const candidates = mode === 'fill' ? keepsakes : fresh
  for (const id of candidates) {
    if (equipped.length >= keepsakeSlots({ lifeHigh: save.lifeHigh, equipped })) break
    if (equipped.includes(id)) continue
    if (isSuperseded(id, keepsakeEffects({ lifeHigh: save.lifeHigh, equipped }))) continue
    equipped.push(id)
    arranged.push(id)
  }
  if (!fresh.length && !arranged.length && equipped.length === save.equipped.length) {
    return { save, fresh, arranged }
  }
  return { save: { ...save, keepsakes, equipped }, fresh, arranged }
}

/** Put a keepsake on the couch. Null when it is not owned, already there, or
 * there is no free slot — the UI unequips first, exactly like the player. */
export function equipKeepsake(s: SaveState, id: string): SaveState | null {
  if (!s.keepsakes.includes(id) || s.equipped.includes(id)) return null
  const equipped = [...s.equipped, id]
  if (equipped.length > keepsakeSlots({ lifeHigh: s.lifeHigh, equipped })) return null
  return { ...s, equipped }
}

/** Take a keepsake off the couch. Free, instant, and always allowed: no
 * cooldown, no cost, no lost progress (this is where Antimatter Dimensions'
 * glyph system charges you a Reality, and where this game deliberately does
 * not — DESIGN § 11.4). */
export function unequipKeepsake(s: SaveState, id: string): SaveState | null {
  if (!s.equipped.includes(id)) return null
  const equipped = s.equipped.filter(x => x !== id)
  // Dropping a `shelf` keepsake can narrow the couch under what is on it;
  // the overflow comes off from the end, newest first, never silently kept.
  return { ...s, equipped: equipped.slice(0, keepsakeSlots({ lifeHigh: s.lifeHigh, equipped })) }
}

/** At most this many automatic purchases are settled on one return from
 * away. Bounded on purpose: an uncapped catch-up would turn a long absence
 * into hundreds of silent purchases the player never saw happen. */
export const AUTO_BUY_CATCHUP_CAP = 10

/**
 * The couch buying for you. Fires on the same schedule whether you are
 * watching or not, so it is automation rather than an attendance reward:
 * it buys the CHEAPEST affordable row on its shelf, which is the safe,
 * boring choice a player would not bother making by hand.
 */
export function applyAutoBuy(prev: SaveState, next: SaveState, t: Tuning = DEFAULT_TUNING): SaveState {
  const mods = keepsakeEffects(next)
  let s = next
  const shelves: [number | null, 'gen' | 'job'][] = [
    [mods.autoBuyGrowEvery, 'gen'],
    [mods.autoBuyWorkEvery, 'job'],
  ]
  for (const [every, kind] of shelves) {
    if (every == null || every <= 0) continue
    const due = Math.floor(next.playTime / every) - Math.floor(prev.playTime / every)
    const rounds = Math.min(Math.max(0, due), AUTO_BUY_CATCHUP_CAP)
    for (let i = 0; i < rounds; i++) {
      const bought = kind === 'gen' ? buyCheapestGenerator(s, t) : buyCheapestJob(s, t)
      if (!bought) break
      s = bought
    }
  }
  return s
}

function buyCheapestGenerator(s: SaveState, t: Tuning): SaveState | null {
  let best: { id: string; cost: number } | null = null
  for (const g of GENERATORS) {
    if (s.high < g.unlockHigh || !stageUnlocked(s.lifeHigh, g.stage)) continue
    const cost = bulkCost(g.baseCost, g.costScale, s.generators[g.id] ?? 0, 1)
    if (s.nugs >= cost && (!best || cost < best.cost)) best = { id: g.id, cost }
  }
  return best ? purchaseGenerator(s, best.id, 1, t) : null
}

function buyCheapestJob(s: SaveState, t: Tuning): SaveState | null {
  let best: { id: string; cost: number } | null = null
  for (const j of JOBS) {
    if (s.high < j.unlockHigh || !stageUnlocked(s.lifeHigh, j.stage)) continue
    const cost = bulkCost(j.baseCost, j.costScale, s.jobs[j.id] ?? 0, 1)
    if (s.cash >= cost && (!best || cost < best.cost)) best = { id: j.id, cost }
  }
  return best ? purchaseJob(s, best.id, 1, t) : null
}

/** Every keepsake with its live status, for the Couch surface and its tests. */
export interface KeepsakeView {
  id: string
  owned: boolean
  equipped: boolean
  superseded: boolean
  /** The chapter that leaves it — shown as the reason it exists. */
  stage: string
}

export function keepsakeViews(s: SaveState): { views: KeepsakeView[]; mods: KeepsakeMods } {
  const mods = keepsakeEffects(s)
  const views = KEEPSAKES.map(k => ({
    id: k.id,
    owned: s.keepsakes.includes(k.id),
    equipped: s.equipped.includes(k.id),
    superseded: s.equipped.includes(k.id) && isSuperseded(k.id, mods),
    stage: k.stage,
  }))
  return { views, mods }
}

export { keepsakeById, keepsakeEffects, keepsakeSlots }

// Re-exports so a headless consumer (the simulator) imports one module.
export { advance, applyOffline, computeRates, DEFAULT_TUNING, defaultSave, prestigeGain, PROTO_TUNING }
export type { OfflineSummary, SaveState, Tuning }
