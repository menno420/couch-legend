// The couch (DESIGN § 11). These pins exist because the family's whole claim
// is that it changes the game WITHOUT changing anything a player already had:
// a bare couch must be byte-identical to the game before it existed, and the
// recorded replay traces must keep validating the seam they recorded.
import { describe, expect, it } from 'vitest'
import {
  computeRates, defaultSave, isSuperseded, keepsakeEffects, keepsakeSlots,
  migrateSave, applyOffline, advance, MILESTONE_STEP, generatorOutput,
  type SaveState,
} from '../src/lib/engine'
import {
  applyAutoBuy, applyHit, applyPrestige, arrangeModeFor, collectKeepsakes,
  equipKeepsake, fillBudgetFor, hitPreview, unequipKeepsake, AUTO_BUY_CATCHUP_CAP,
  AUTO_BUY_RESERVE_SHARE, applyOfflineWithAutomation,
} from '../src/lib/actions'
import { generatorPurchaseImpact, jobPurchaseImpact } from '../src/lib/purchase-impact'
import { formatPurchaseImpact } from '../src/lib/purchase-impact-format'
import { POLICIES } from '../src/lib/sim/policies'
import {
  GENERATORS, JOBS, KEEPSAKES, RITUALS, SLOT_STAGES, STAGES, baseSlotsFor,
  keepsakesEarnedBy, keepsakeById, type KeepsakeDef,
} from '../src/lib/content'

const save = (p: Partial<SaveState> = {}): SaveState => ({ ...defaultSave(0), ...p })
const owned = (m: Record<string, number>): number => Object.values(m).reduce((a, b) => a + b, 0)
const stageHigh = (id: string) => STAGES.find(s => s.id === id)!.minLifeHigh

describe('keepsake content table', () => {
  it('gives every chapter after the first exactly one keepsake', () => {
    const stages = STAGES.slice(1).map(s => s.id)
    expect(KEEPSAKES.map(k => k.stage)).toEqual(stages)
    expect(KEEPSAKES).toHaveLength(STAGES.length - 1)
  })

  it('has unique ids that never collide with a shop row', () => {
    const ids = KEEPSAKES.map(k => k.id)
    expect(new Set(ids).size).toBe(ids.length)
    const shop = new Set([...GENERATORS, ...JOBS, ...RITUALS].map(i => i.id))
    for (const id of ids) expect(shop.has(id)).toBe(false)
  })

  it('names a real chapter and a real display surface for every keepsake', () => {
    // Rail 5b: no effect without a place the player watches it happen.
    for (const k of KEEPSAKES) {
      expect(STAGES.some(s => s.id === k.stage), k.id).toBe(true)
      expect(k.surface.length, k.id).toBeGreaterThan(10)
      expect(k.blurb.length, k.id).toBeGreaterThan(10)
    }
  })

  it('keeps the couch smaller than the collection, at every point in the life', () => {
    // The decision is only real while there are more keepsakes than places.
    for (const st of STAGES) {
      const earned = keepsakesEarnedBy(st.minLifeHigh).length
      const slots = baseSlotsFor(st.minLifeHigh)
      expect(slots, `${st.id}: ${slots} slots vs ${earned} earned`).toBeLessThanOrEqual(earned)
    }
    expect(baseSlotsFor(Infinity)).toBe(SLOT_STAGES.length)
    expect(baseSlotsFor(Infinity)).toBeLessThan(KEEPSAKES.length)
  })
})

describe('a bare couch changes nothing', () => {
  it('produces rates identical to owning no keepsakes at all', () => {
    const base = save({ high: 5e3, lifeHigh: 3e7, generators: { tray: 30 }, jobs: { thinker: 30 }, buzz: 90, peakBuzz: 400 })
    const owned = { ...base, keepsakes: KEEPSAKES.map(k => k.id), equipped: [] }
    const a = computeRates(base)
    const b = computeRates(owned)
    for (const k of ['nugRate', 'cashRate', 'highRate', 'hitPower', 'hitBuzz', 'decay', 'offlineCap', 'offlineEff', 'prestigeBonus'] as const) {
      expect(b[k], k).toBe(a[k])
    }
  })

  it('leaves the milestone step at 25 and the buzz floor at zero', () => {
    const r = computeRates(save({ peakBuzz: 1e4 }))
    expect(r.keepsakes.growMilestoneStep).toBe(MILESTONE_STEP)
    expect(r.keepsakes.workMilestoneStep).toBe(MILESTONE_STEP)
    expect(r.buzzFloor).toBe(0)
  })
})

describe('minting — the story is the only source', () => {
  it('mints nothing at chapter one and one per chapter thereafter', () => {
    expect(keepsakesEarnedBy(0)).toEqual([])
    expect(keepsakesEarnedBy(stageHigh('corner-store'))).toEqual(['exact-change'])
    expect(keepsakesEarnedBy(stageHigh('cousins-couch'))).toEqual(['exact-change', 'valid-until-morning'])
    expect(keepsakesEarnedBy(Infinity)).toHaveLength(KEEPSAKES.length)
  })

  it('collectKeepsakes mints and auto-arranges into free slots, and is idempotent', () => {
    const s = save({ lifeHigh: stageHigh('cousins-couch') })
    const first = collectKeepsakes(s)
    expect(first.fresh).toEqual(['exact-change', 'valid-until-morning'])
    expect(first.save.equipped).toEqual(['exact-change'])  // one slot at this point
    const again = collectKeepsakes(first.save)
    expect(again.fresh).toEqual([])
    expect(again.save).toBe(first.save)
  })

  it('never displaces a keepsake the player chose', () => {
    const s = save({
      lifeHigh: stageHigh('rituals-of-the-room'),
      keepsakes: ['exact-change', 'valid-until-morning', 'spare-key', 'standing-glass'],
      equipped: ['spare-key'],
    })
    const { save: after } = collectKeepsakes(s)
    expect(after.equipped[0]).toBe('spare-key')
    expect(after.equipped.length).toBeLessThanOrEqual(keepsakeSlots(after))
  })

  it('auto-arrange skips a keepsake something better already supersedes', () => {
    // Both are work-nugs; the stronger one must not be joined by the weaker.
    const s = save({
      lifeHigh: Infinity,
      keepsakes: ['first-follower', 'standing-glass'],
      equipped: ['first-follower'],
    })
    const { save: after } = collectKeepsakes(s)
    expect(after.equipped).toContain('first-follower')
    expect(after.equipped).not.toContain('standing-glass')
  })
})

describe('arranging is free and always reversible', () => {
  const full = save({ lifeHigh: Infinity, keepsakes: KEEPSAKES.map(k => k.id) })

  it('refuses a keepsake the life has not earned', () => {
    expect(equipKeepsake(save({ lifeHigh: Infinity }), 'exact-change')).toBeNull()
  })

  it('refuses to overfill the couch, and unequipping frees the place again', () => {
    let s: SaveState = full
    const slots = keepsakeSlots(s)
    for (const k of KEEPSAKES.slice(0, slots)) s = equipKeepsake(s, k.id)!
    expect(s.equipped).toHaveLength(slots)
    expect(equipKeepsake(s, KEEPSAKES[slots].id)).toBeNull()
    const freed = unequipKeepsake(s, s.equipped[0])!
    expect(equipKeepsake(freed, KEEPSAKES[slots].id)).not.toBeNull()
  })

  it('costs nothing — no currency, no time, no progress moves', () => {
    const before = save({ lifeHigh: Infinity, keepsakes: ['exact-change'], nugs: 1e6, cash: 1e6, high: 500, playTime: 99 })
    const on = equipKeepsake(before, 'exact-change')!
    const off = unequipKeepsake(on, 'exact-change')!
    for (const k of ['nugs', 'cash', 'high', 'lifeHigh', 'buzz', 'playTime', 'enlightenment'] as const) {
      expect(on[k], k).toBe(before[k])
      expect(off[k], k).toBe(before[k])
    }
    expect(off.equipped).toEqual([])
  })

  it('a shelf keepsake nets one place, and removing it sheds the overflow', () => {
    const s = save({ lifeHigh: Infinity, keepsakes: KEEPSAKES.map(k => k.id) })
    const bare = keepsakeSlots(s)
    const withCard = { ...s, equipped: ['accession-card'] }
    expect(keepsakeSlots(withCard)).toBe(bare + 1)
    let filled: SaveState = withCard
    for (const k of KEEPSAKES.filter(k => k.id !== 'accession-card').slice(0, bare)) filled = equipKeepsake(filled, k.id)!
    expect(filled.equipped).toHaveLength(bare + 1)
    const dropped = unequipKeepsake(filled, 'accession-card')!
    expect(dropped.equipped.length).toBeLessThanOrEqual(keepsakeSlots(dropped))
  })
})

describe('effects transform systems that already existed', () => {
  const rich = (equipped: string[]) => save({
    high: 5e3, lifeHigh: Infinity, keepsakes: KEEPSAKES.map(k => k.id), equipped,
    generators: { tray: 30 }, jobs: { thinker: 30 }, buzz: 100, peakBuzz: 400,
  })

  it('work-nugs routes Work output into the nug economy', () => {
    expect(computeRates(rich(['standing-glass'])).nugRate).toBeGreaterThan(computeRates(rich([])).nugRate)
  })

  it('grow-cash routes Grow output into the cash economy', () => {
    expect(computeRates(rich(['earth-in-the-window'])).cashRate).toBeGreaterThan(computeRates(rich([])).cashRate)
  })

  it('a buzz floor holds decay but can never manufacture buzz', () => {
    const s = { ...rich(['valid-until-morning']), buzz: 1, peakBuzz: 1e4 }
    const after = advance(s, 60)
    expect(computeRates(s).buzzFloor).toBeGreaterThan(s.buzz)
    expect(after.buzz).toBeLessThanOrEqual(s.buzz + 1e-9)  // never lifted
    const decaying = { ...rich(['valid-until-morning']), buzz: 1e4, peakBuzz: 1e4 }
    const held = advance(decaying, 36_000)
    expect(held.buzz).toBeGreaterThan(advance({ ...decaying, equipped: [] }, 36_000).buzz)
  })

  it('the hit echo is deterministic, never a dice roll', () => {
    const s = rich(['spare-key'])   // every 5th
    const hits = [0, 1, 2, 3, 4].map(n => applyHit({ ...s, manualHits: n }).totalHits - s.totalHits)
    expect(hits).toEqual([1, 1, 1, 1, 2])
    expect(applyHit({ ...s, manualHits: 4 })).toEqual(applyHit({ ...s, manualHits: 4 }))
  })

  it('the echo counts MANUAL presses, so the Roommate cannot silence it', () => {
    // Codex CL#19 R1 (P1): keying the cadence on `totalHits` broke the moment
    // any auto-hit rate existed, because `advance` adds autoHits*dt — a
    // FRACTION — to that counter, so the exact modulo stopped ever matching.
    const s = { ...rich(['spare-key']), rituals: { roommate: 4 }, totalHits: 0, manualHits: 0 }
    const ticked = advance(s, 1)
    expect(Number.isInteger(ticked.totalHits)).toBe(false)   // the trap, still present
    expect(ticked.manualHits).toBe(0)                        // and the fix: unmoved by auto-hits
    let cur: SaveState = ticked
    const echoes: number[] = []
    for (let i = 0; i < 10; i++) {
      const before = cur.totalHits
      cur = applyHit(cur)
      echoes.push(Math.round(cur.totalHits - before))
    }
    expect(echoes).toEqual([1, 1, 1, 1, 2, 1, 1, 1, 1, 2])
    expect(cur.manualHits).toBe(10)
  })

  it('an echo does not shorten its own cadence to four', () => {
    // The second half of the same finding: an echo adds 2 to totalHits, so a
    // totalHits-keyed cadence drifted to every fourth press after the first.
    const s = rich(['the-overlap'])  // every 3rd
    let cur: SaveState = s
    const echoes: number[] = []
    for (let i = 0; i < 9; i++) {
      const before = cur.totalHits
      cur = applyHit(cur)
      echoes.push(cur.totalHits - before)
    }
    expect(echoes).toEqual([1, 1, 2, 1, 1, 2, 1, 1, 2])
  })

  it('the return gift is banked by the away pass and paid once by the next hit', () => {
    const s = { ...rich(['exact-change']), lastTick: 0 }
    const { save: back } = applyOffline(s, 7200)
    expect(back.returnGift).toBeCloseTo(computeRates(s).nugRate * 45, 6)
    const paid = applyHit(back)
    expect(paid.nugs - back.nugs).toBeGreaterThan(back.returnGift)
    expect(paid.returnGift).toBe(0)
    expect(applyHit(paid).returnGift).toBe(0)
  })

  it('offline uncap is a real trade — no cap, worse rate than maxed curtains', () => {
    const maxed = rich([])
    maxed.rituals = { curtains: 5 }
    const traded = { ...maxed, equipped: ['evidence-tag'] }
    expect(computeRates(traded).offlineCap).toBe(Infinity)
    expect(computeRates(traded).offlineEff).toBeLessThan(computeRates(maxed).offlineEff)
  })

  it('milestone-early shortens only its own shelf', () => {
    const r = computeRates(rich(['the-cutting']))
    expect(r.keepsakes.growMilestoneStep).toBe(MILESTONE_STEP - 4)
    expect(r.keepsakes.workMilestoneStep).toBe(MILESTONE_STEP)
    expect(generatorOutput(GENERATORS[0], 21, undefined, 21)).toBeGreaterThan(generatorOutput(GENERATORS[0], 21))
  })

  it('clarity-yield raises the Wake & Bake payout', () => {
    const s = { ...rich(['sunday-ledger']), peakHigh: 1e6 }
    expect(computeRates(s).prestigeBonus).toBeGreaterThan(computeRates({ ...s, equipped: [] }).prestigeBonus)
  })

  it('kinds never stack: the strongest of a kind wins and the weaker reads superseded', () => {
    const both = rich(['standing-glass', 'first-follower'])
    const strongOnly = rich(['first-follower'])
    expect(computeRates(both).nugRate).toBe(computeRates(strongOnly).nugRate)
    expect(isSuperseded('standing-glass', keepsakeEffects(both))).toBe(true)
    expect(isSuperseded('first-follower', keepsakeEffects(both))).toBe(false)
  })
})

describe('automation buys on the clock, watched or not', () => {
  const s = save({
    high: 1e5, lifeHigh: Infinity, nugs: 1e9, cash: 1e9,
    keepsakes: ['window-placard'], equipped: ['window-placard'], playTime: 0,
  })

  it('fires once per interval and not before', () => {
    expect(applyAutoBuy(s, { ...s, playTime: 44 }).generators).toEqual({})
    const one = applyAutoBuy(s, { ...s, playTime: 45 })
    expect(owned(one.generators)).toBe(1)
  })

  it('caps the catch-up after a long absence instead of buying hundreds silently', () => {
    const back = applyAutoBuy(s, { ...s, playTime: 45 * 500 })
    expect(owned(back.generators)).toBe(AUTO_BUY_CATCHUP_CAP)
  })

  it('does nothing at all when the keepsake is off the couch', () => {
    const off = { ...s, equipped: [] }
    expect(applyAutoBuy(off, { ...off, playTime: 1e5 }).generators).toEqual({})
  })

  it('never spends money the player does not have', () => {
    const broke = { ...s, nugs: 0, cash: 0 }
    expect(applyAutoBuy(broke, { ...broke, playTime: 1e4 }).generators).toEqual({})
  })
})

describe('the afternoon resets; the couch does not', () => {
  it('Wake & Bake keeps every keepsake and the arrangement', () => {
    const s = save({
      peakHigh: 1e6, lifeHigh: 1e12, enlightenment: 3,
      keepsakes: ['exact-change', 'spare-key'], equipped: ['spare-key'],
    })
    const after = applyPrestige(s, 1)!
    expect(after.keepsakes).toEqual(s.keepsakes)
    expect(after.equipped).toEqual(s.equipped)
    expect(after.high).toBe(0)
    expect(after.peakBuzz).toBe(0)
    expect(after.returnGift).toBe(0)
  })
})

describe('migration to v3 is generous and rate-neutral', () => {
  it('grants the chapters a v2 save already lived, and arranges none of them', () => {
    const v2 = migrateSave({ version: 2, high: 100, peakHigh: 100, lifeHigh: stageHigh('the-couch') })
    expect(v2.version).toBe(3)
    expect(v2.keepsakes).toEqual(['exact-change', 'valid-until-morning', 'spare-key'])
    expect(v2.equipped).toEqual([])
    // Rate-neutral by construction: nothing is on the couch, so nothing moves.
    expect(computeRates(v2).nugRate).toBe(computeRates({ ...v2, keepsakes: [] }).nugRate)
  })

  it('drops ids that no longer exist rather than trusting a save', () => {
    const s = migrateSave({ version: 3, lifeHigh: 0, keepsakes: ['ghost'], equipped: ['ghost'] } as never)
    expect(s.keepsakes).toEqual([])
    expect(s.equipped).toEqual([])
  })

  it('never equips something that is not owned', () => {
    const s = migrateSave({ version: 3, lifeHigh: 0, keepsakes: [], equipped: ['exact-change'] } as never)
    expect(s.equipped).toEqual([])
  })

  it('repairs a save claiming more places than the couch has', () => {
    const over = save({ lifeHigh: stageHigh('corner-store'), keepsakes: KEEPSAKES.map(k => k.id), equipped: KEEPSAKES.map(k => k.id) })
    const mods = keepsakeEffects(over)
    expect(mods.slotsUsed).toBeLessThanOrEqual(mods.slots)
  })
})

describe('every keepsake is describable and reachable', () => {
  it('has a plain-language line for every effect kind in the table', () => {
    const kinds = new Set(KEEPSAKES.map(k => k.effect.kind))
    expect(kinds.size).toBeGreaterThanOrEqual(9)
    for (const k of KEEPSAKES) expect(keepsakeById(k.id)).toBeDefined()
  })
})

describe('the felt-upgrade floor survives the couch (§ 9.6 rail 5a)', () => {
  // This pin exists because the first version of this feature BROKE this rail:
  // a `work-nugs` keepsake minted at chapter 2 added Work's output to nug/s,
  // which shrank how much the next small Grow row appeared to add — measured
  // at 0.3 % for the idle-only archetype, against a >= 2 % rail. The fix was
  // to mint the cross-wire at chapter 5 instead, by which point every early
  // Grow row is long bought. The pin is the shape of that fix, not its date.
  const EARLY_ROWS = ['tray', 'piece', 'gravity', 'pinch', 'grinder']

  it('mints no keepsake that changes a displayed rate before the early Grow rows are past', () => {
    const lastEarlyUnlock = Math.max(...GENERATORS.filter(g => EARLY_ROWS.includes(g.id)).map(g => g.unlockHigh))
    expect(lastEarlyUnlock).toBeGreaterThan(0)
    // Chapters 2-4 may only carry effects that leave nugRate/cashRate/hitPower
    // untouched at the moment of a purchase: a lump payment, a decay floor, or
    // a doubled hit. Anything that adds to a shelf's rate waits until later.
    const RATE_NEUTRAL_EARLY = new Set(['return-gift', 'hit-echo', 'buzz-floor', 'clarity-yield'])
    const earlyChapters = STAGES.slice(1, 4).map(s => s.id)
    for (const k of KEEPSAKES.filter(k => earlyChapters.includes(k.stage))) {
      expect(RATE_NEUTRAL_EARLY.has(k.effect.kind), `${k.id} (${k.effect.kind}) mints at ${k.stage}`).toBe(true)
    }
  })

  it('a first Grow purchase still moves nug/s by >= 2% with those chapters\' keepsakes on', () => {
    const early = KEEPSAKES.filter(k => STAGES.slice(1, 4).some(s => s.id === k.stage)).map(k => k.id)
    const base = save({
      high: 60, lifeHigh: STAGES[3].minLifeHigh, nugs: 1e5, cash: 1e5,
      keepsakes: early, equipped: early, generators: { tray: 8, piece: 4 }, jobs: { thinker: 6 }, buzz: 30, peakBuzz: 60,
    })
    for (const id of ['gravity', 'pinch', 'grinder']) {
      expect(GENERATORS.some(x => x.id === id), `${id} exists`).toBe(true)
      const before = computeRates(base).nugRate
      const after = computeRates({ ...base, generators: { ...base.generators, [id]: 1 } }).nugRate
      expect((after - before) / before, `${id} felt impact`).toBeGreaterThanOrEqual(0.02)
    }
  })
})

describe('a cross-wire never outgrows the shelf it feeds (§ 9.6 rail 5a, by construction)', () => {
  // This describe exists because the shipped version had no ceiling, and the
  // couch dataset at 4934955 measured what that costs: keepsake-optimizer,
  // seed 23, reached chapter 5 with The Collective still unbought, equipped
  // The Standing Glass, and that row's first unit then moved the nug/s tile
  // by 0.14 % (dispensary 0.89 %) against a >= 2 % rail — the Work shelf was
  // ~30× the garden, so a Grow row could not be felt. `balanced` seed 47 sat
  // on the bound at 2.1 % for the same reason. The ceiling turns an unbounded
  // dilution into one bounded at (1 + ceiling), whatever the Work shelf does.
  const glass = keepsakeById('standing-glass')!.effect
  const follower = keepsakeById('first-follower')!.effect
  if (glass.kind !== 'work-nugs' || follower.kind !== 'work-nugs') throw new Error('table shape changed')

  const state = (jobs: Record<string, number>, generators: Record<string, number>, equipped: string[]) => save({
    high: 1e6, lifeHigh: Infinity, keepsakes: KEEPSAKES.map(k => k.id), equipped, jobs, generators,
  })

  it('every cross-wire in the table declares a ceiling, and the later of a kind is stronger in BOTH numbers', () => {
    const wires = KEEPSAKES.filter(k => k.effect.kind === 'work-nugs' || k.effect.kind === 'grow-cash')
    expect(wires.length).toBeGreaterThanOrEqual(3)
    for (const k of wires) {
      const e = k.effect as Extract<KeepsakeDef['effect'], { kind: 'work-nugs' | 'grow-cash' }>
      expect(e.ceiling, k.id).toBeGreaterThan(0)
      expect(e.share, k.id).toBeGreaterThan(0)
    }
    expect(follower.share).toBeGreaterThan(glass.share)
    expect(follower.ceiling).toBeGreaterThan(glass.ceiling)
  })

  it('pays share × Work below the ceiling — the shipped behaviour, unchanged there', () => {
    const r = computeRates(state({ thinker: 10 }, { farm: 20 }, ['standing-glass']))
    expect(r.shelves.workToNugs).toBeCloseTo(r.shelves.work * glass.share, 9)
    expect(r.shelves.workToNugs).toBeLessThan(r.shelves.grow * glass.ceiling)
  })

  it('never hands the garden more than ceiling × what it grows itself', () => {
    const r = computeRates(state({ legend: 300 }, { farm: 20 }, ['standing-glass']))
    expect(r.shelves.work * glass.share).toBeGreaterThan(r.shelves.grow * glass.ceiling) // the cap is live
    expect(r.shelves.workToNugs).toBeCloseTo(r.shelves.grow * glass.ceiling, 9)
    expect(r.nugRate).toBeCloseTo(r.shelves.grow * (1 + glass.ceiling) * r.nugMult, 6)
  })

  it('with no garden at all, the jobs bring nothing home — the glass matches the garden, it does not replace it', () => {
    const r = computeRates(state({ legend: 300 }, {}, ['standing-glass']))
    expect(r.shelves.workToNugs).toBe(0)
    expect(r.nugRate).toBe(0)
  })

  it('the mirror obeys the same rule', () => {
    const earth = keepsakeById('earth-in-the-window')!.effect
    if (earth.kind !== 'grow-cash') throw new Error('table shape changed')
    const r = computeRates(state({ thinker: 1 }, { myth: 300 }, ['earth-in-the-window']))
    expect(r.shelves.grow * earth.share).toBeGreaterThan(r.shelves.work * earth.ceiling)
    expect(r.shelves.growToCash).toBeCloseTo(r.shelves.work * earth.ceiling, 9)
  })

  it('the stronger keepsake wins share AND ceiling together, never one of each', () => {
    const both = keepsakeEffects(state({}, {}, ['standing-glass', 'first-follower']))
    expect(both.workNugShare).toBe(follower.share)
    expect(both.workNugCeiling).toBe(follower.ceiling)
    const reversed = keepsakeEffects(state({}, {}, ['first-follower', 'standing-glass']))
    expect(reversed.workNugCeiling).toBe(follower.ceiling)
  })

  it('a first Grow purchase keeps at least 1/(1+ceiling) of its bare-couch felt impact, whatever the Work shelf', () => {
    // The seed-23 shape, swept: a mid garden with The Collective unbought,
    // and a Work shelf from modest to absurd. Bare-couch impact is the
    // reference; the glass may halve it (ceiling 1) and no more.
    for (const legend of [1, 10, 100, 1000]) {
      const bare = state({ legend }, { farm: 20, closet: 40 }, [])
      const glassOn = { ...bare, equipped: ['standing-glass'] }
      const felt = (s: SaveState) => {
        const b = computeRates(s).nugRate
        const a = computeRates({ ...s, generators: { ...s.generators, collective: 1 } }).nugRate
        return (a - b) / b
      }
      const ref = felt(bare)
      const withGlass = felt(glassOn)
      expect(ref).toBeGreaterThanOrEqual(0.02)
      expect(withGlass, `legend×${legend}: ${withGlass} vs bare ${ref}`).toBeGreaterThanOrEqual(ref / (1 + glass.ceiling) - 1e-9)
      expect(withGlass).toBeGreaterThanOrEqual(0.02)
    }
  })

  it('the same purchase with the shipped uncapped rule would have breached — the pin knows what it guards', () => {
    // Reproduce the defect arithmetic the ceiling removes: uncapped, the
    // relative move of a first Grow unit is δ / (grow + share × work), which
    // falls below 2 % once the Work shelf is ~30× the garden.
    const s = state({ legend: 1000 }, { farm: 20, closet: 40 }, ['standing-glass'])
    const r = computeRates(s)
    const delta = computeRates({ ...s, generators: { ...s.generators, collective: 1 } }).shelves.grow - r.shelves.grow
    const uncapped = delta / (r.shelves.grow + r.shelves.work * glass.share)
    expect(uncapped).toBeLessThan(0.02)
  })
})

describe('taking a keepsake off actually sticks (the tick must not refill)', () => {
  // This pin exists because the first version refilled every free place on
  // EVERY pass. In the built game that meant the next 50 ms tick put something
  // straight back: a player could never leave a place empty, never swap two
  // keepsakes, and the Couch tab's "Put it on" button was permanently disabled
  // because no place was ever free for longer than a frame. Unit tests calling
  // collectKeepsakes directly could not see it; the behaviour smoke could.
  const arranged = () => {
    const s = save({ lifeHigh: STAGES[8].minLifeHigh })
    return collectKeepsakes(s, 'fill').save
  }

  it('a play-time pass places only what it just minted', () => {
    const full = arranged()
    expect(full.equipped.length).toBeGreaterThan(1)
    const opened = unequipKeepsake(full, full.equipped[0])!
    const afterTick = collectKeepsakes(opened, 'fresh-only')
    expect(afterTick.arranged).toEqual([])
    expect(afterTick.save.equipped).toEqual(opened.equipped)
  })

  it('and repeated passes never creep the arrangement back', () => {
    let s: SaveState = unequipKeepsake(arranged(), arranged().equipped[0])!
    const want = [...s.equipped]
    for (let i = 0; i < 40; i++) s = collectKeepsakes(s, 'fresh-only').save
    expect(s.equipped).toEqual(want)
  })

  it('a load-time pass DOES catch the couch up, which is how a migrated save fills', () => {
    const migrated = migrateSave({ version: 2, high: 10, peakHigh: 10, lifeHigh: STAGES[8].minLifeHigh })
    expect(migrated.equipped).toEqual([])
    const loaded = collectKeepsakes(migrated, 'fill')
    expect(loaded.arranged.length).toBeGreaterThan(0)
    expect(loaded.save.equipped.length).toBe(keepsakeSlots(loaded.save))
  })

  it('a newly minted keepsake still lands on its own, with no free-place sweep', () => {
    const before = collectKeepsakes(save({ lifeHigh: STAGES[1].minLifeHigh }), 'fill').save
    const grown = { ...before, lifeHigh: STAGES[2].minLifeHigh }
    const next = collectKeepsakes(grown, 'fresh-only')
    expect(next.fresh).toEqual(['valid-until-morning'])
  })
})

describe('arrangeModeFor — fill a place the story opened, not one the player emptied', () => {
  it('fills when a slot chapter is crossed', () => {
    const before = save({ lifeHigh: STAGES[1].minLifeHigh })
    const after = { ...before, lifeHigh: STAGES[4].minLifeHigh }   // rituals-of-the-room
    expect(keepsakeSlots(after)).toBeGreaterThan(keepsakeSlots(before))
    expect(arrangeModeFor(before, after)).toBe('fill')
  })

  it('does NOT fill when the player took something off', () => {
    const full = collectKeepsakes(save({ lifeHigh: STAGES[8].minLifeHigh }), 'fill').save
    const opened = unequipKeepsake(full, full.equipped[0])!
    expect(arrangeModeFor(full, opened)).toBe('fresh-only')
  })

  it('does not fill on an ordinary tick', () => {
    const s = collectKeepsakes(save({ lifeHigh: STAGES[8].minLifeHigh }), 'fill').save
    expect(arrangeModeFor(s, advance(s, 0.05))).toBe('fresh-only')
  })
})

describe('the review round (Codex CL#19 R1) — regression pins', () => {
  it('automation settles an absence, not only attended time (P1)', () => {
    const s = save({
      high: 1e5, lifeHigh: Infinity, nugs: 1e9, cash: 1e9, playTime: 0, lastTick: 0,
      keepsakes: ['window-placard'], equipped: ['window-placard'],
    })
    const { save: back } = applyOffline(s, 6 * 3600)
    expect(back.playTime).toBeGreaterThan(s.playTime)
    const settled = applyAutoBuy(s, back)
    const bought = owned(settled.generators)
    expect(bought).toBeGreaterThan(0)
    expect(bought).toBeLessThanOrEqual(AUTO_BUY_CATCHUP_CAP)
  })

  it('a fill pass may add only as many as the story just opened (P2)', () => {
    const before = collectKeepsakes(save({ lifeHigh: STAGES[4].minLifeHigh }), 'fill').save
    const emptied = unequipKeepsake(before, before.equipped[0])!
    const grown = { ...emptied, lifeHigh: STAGES[7].minLifeHigh }   // working-stiff: +1 place
    const budget = fillBudgetFor(emptied, grown)
    expect(budget).toBe(1)
    const after = collectKeepsakes(grown, 'fill', budget)
    // Exactly the newly minted one plus at most `budget` older ones — never a
    // sweep that also refills the place the player emptied.
    const olderAdded = after.arranged.filter(id => !after.fresh.includes(id))
    expect(olderAdded.length).toBeLessThanOrEqual(budget)
  })

  it('a shelf keepsake can join a full couch, because it widens it (P2)', () => {
    // The Accession Card takes one place and grants two, so on a full couch
    // it is legal precisely because adding it opens a net place.
    const full = collectKeepsakes(save({ lifeHigh: STAGES[13].minLifeHigh }), 'fill').save
    expect(full.equipped.length).toBe(keepsakeSlots(full))
    const grown = { ...full, lifeHigh: STAGES[14].minLifeHigh }     // the-archive
    const after = collectKeepsakes(grown, 'fresh-only').save
    expect(after.equipped).toContain('accession-card')
    expect(after.equipped.length).toBeLessThanOrEqual(keepsakeSlots(after))
  })

  it('a v2 save code carrying couch fields is ignored, keeping migration rate-neutral (P2)', () => {
    const sneaky = migrateSave({
      version: 2, high: 100, peakHigh: 100, lifeHigh: STAGES[8].minLifeHigh,
      keepsakes: ['first-follower'], equipped: ['first-follower'],
    } as never)
    expect(sneaky.equipped).toEqual([])
    expect(computeRates(sneaky).nugRate).toBe(computeRates({ ...sneaky, keepsakes: [] }).nugRate)
  })

  it('migration returns a legal, unique arrangement (P2)', () => {
    const dupes = migrateSave({
      version: 3, high: 10, peakHigh: 10, lifeHigh: STAGES[14].minLifeHigh,
      keepsakes: ['accession-card', 'exact-change'],
      equipped: ['accession-card', 'accession-card', 'accession-card', 'exact-change', 'exact-change'],
    } as never)
    expect(new Set(dupes.equipped).size).toBe(dupes.equipped.length)
    expect(dupes.equipped.length).toBeLessThanOrEqual(keepsakeSlots(dupes))
  })

  it('an emptied place survives a reload (P2)', () => {
    const seeded = collectKeepsakes(save({ lifeHigh: STAGES[8].minLifeHigh }), 'fill').save
    expect(seeded.couchSeeded).toBe(true)
    const emptied = unequipKeepsake(seeded, seeded.equipped[0])!
    // A reload re-runs migration and then a load-time pass; a seeded couch
    // takes the fresh-only path, so the empty place stays empty.
    const reloaded = migrateSave(emptied)
    expect(reloaded.couchSeeded).toBe(true)
    const after = collectKeepsakes(reloaded, reloaded.couchSeeded ? 'fresh-only' : 'fill')
    expect(after.save.equipped).toEqual(emptied.equipped)
  })

  it('the hit preview reports what the press actually pays (P2)', () => {
    const s = { ...save({ lifeHigh: Infinity, keepsakes: ['spare-key'], equipped: ['spare-key'] }), manualHits: 4, returnGift: 1234 }
    const preview = hitPreview(s)
    const after = applyHit(s)
    expect(preview.times).toBe(2)
    expect(after.nugs - s.nugs).toBeCloseTo(preview.nugs, 6)
  })

  it('the preview names the cross-wired currency (P2)', () => {
    // A garden exists here on purpose: the cross-wire is capped at what the
    // garden grows, so a Work shelf with NO garden behind it hands over
    // nothing — and the preview must say that too (the case below).
    const s = save({
      high: 5e3, lifeHigh: Infinity, cash: 1e9, nugs: 1e9, jobs: { thinker: 10 }, generators: { tray: 30 },
      keepsakes: ['standing-glass'], equipped: ['standing-glass'],
    })
    const impact = jobPurchaseImpact(s, 'thinker', 1)!
    expect(impact.kind).toBe('rate')
    if (impact.kind !== 'rate') return
    expect(impact.crossWired?.resource).toBe('nugs')
    expect(impact.crossWired!.delta).toBeGreaterThan(0)
    expect(impact.crossWired!.capped).toBe(false)
    expect(formatPurchaseImpact(impact)).toContain('nugs too')
    // and no cross-wire claim when the couch is bare
    const bare = jobPurchaseImpact({ ...s, equipped: [] }, 'thinker', 1)!
    expect(bare.kind === 'rate' && bare.crossWired).toBeUndefined()
  })

  it('the preview promises no cross-wired nugs the ceiling withholds', () => {
    // A Work shelf that dwarfs the garden: the cross-wire already sits on
    // the ceiling, so one more job hands the garden nothing extra. The old
    // preview would have promised `share × the row's cash` here — nugs the
    // purchase does not pay.
    const s = save({
      high: 5e3, lifeHigh: Infinity, cash: 1e12, nugs: 1e9, jobs: { thinker: 400 }, generators: { tray: 30 },
      keepsakes: ['standing-glass'], equipped: ['standing-glass'],
    })
    const impact = jobPurchaseImpact(s, 'thinker', 1)!
    if (impact.kind !== 'rate') throw new Error('rate impact expected')
    expect(impact.crossWired!.capped).toBe(true)
    expect(impact.crossWired!.delta).toBe(0)
    const line = formatPurchaseImpact(impact)
    expect(line).toContain('the garden is the ceiling')
    expect(line).not.toContain('+0')
  })

  it('a Grow purchase under the glass promises the whole tile move, the lifted ceiling included', () => {
    // Work dwarfs the garden, so the cross-wire sits on the ceiling; buying a
    // generator lifts the ceiling and the nug/s tile moves by MORE than the
    // row alone. The preview must say so, or it under-promises — the mirror
    // of the over-promise `crossWired` exists to prevent.
    const s = save({
      high: 1e6, lifeHigh: Infinity, cash: 1e12, nugs: 1e12, jobs: { legend: 300 }, generators: { farm: 20 },
      keepsakes: ['standing-glass'], equipped: ['standing-glass'],
    })
    const impact = generatorPurchaseImpact(s, 'farm', 1)!
    if (impact.kind !== 'rate') throw new Error('rate impact expected')
    expect(impact.matched?.resource).toBe('nugs')
    expect(impact.matched!.delta).toBeGreaterThan(0)
    const before = computeRates(s)
    const after = computeRates({ ...s, generators: { farm: 21 } })
    expect((impact.delta + impact.matched!.delta) * before.nugMult).toBeCloseTo(after.nugRate - before.nugRate, 6)
    expect(formatPurchaseImpact(impact)).toContain('more from the jobs')
    // and nothing of the kind when the couch is bare, or when the cap is slack
    const bare = generatorPurchaseImpact({ ...s, equipped: [] }, 'farm', 1)!
    expect(bare.kind === 'rate' && bare.matched).toBeUndefined()
    const slack = generatorPurchaseImpact({ ...s, jobs: { thinker: 1 } }, 'farm', 1)!
    expect(slack.kind === 'rate' && slack.matched).toBeUndefined()
  })

  it('the cross-wire delta the preview shows is exactly what the tile will move by', () => {
    // The whole point of threading the cap through the preview: promised ×
    // multiplier === paid. Checked on both sides of the ceiling.
    for (const thinker of [10, 400]) {
      const s = save({
        high: 5e3, lifeHigh: Infinity, cash: 1e12, nugs: 1e9, jobs: { thinker }, generators: { tray: 30 },
        keepsakes: ['standing-glass'], equipped: ['standing-glass'],
      })
      const impact = jobPurchaseImpact(s, 'thinker', 1)!
      if (impact.kind !== 'rate') throw new Error('rate impact expected')
      const before = computeRates(s)
      const after = computeRates({ ...s, jobs: { thinker: thinker + 1 } })
      expect(impact.crossWired!.delta * before.nugMult).toBeCloseTo(after.nugRate - before.nugRate, 9)
    }
  })

  it('the optimizer ranks shelf-targeted effects independently (P2)', () => {
    // milestone-early and auto-buy each have Grow and Work variants the engine
    // applies at the same time; deduping on the bare kind dropped one of each.
    const s = save({ lifeHigh: Infinity, keepsakes: KEEPSAKES.map(k => k.id) })
    const want = POLICIES['keepsake-optimizer'].arrange!(s)!
    const kinds = want.map(id => keepsakeById(id)!.effect)
    const milestones = kinds.filter(e => e.kind === 'milestone-early')
    expect(new Set(milestones.map(e => (e as { target: string }).target)).size).toBe(milestones.length)
    expect(want.length).toBeLessThanOrEqual(keepsakeSlots({ lifeHigh: s.lifeHigh, equipped: want }))
  })
})

describe('automation leaves the player their money (rail 4)', () => {
  const s = save({
    high: 1e5, lifeHigh: Infinity, nugs: 1e9, cash: 1e9, playTime: 0,
    keepsakes: ['window-placard', 'standing-order'], equipped: ['window-placard', 'standing-order'],
  })

  it('never spends more than the reserve share on one purchase', () => {
    const after = applyAutoBuy(s, { ...s, playTime: 45 })
    expect(s.nugs - after.nugs).toBeLessThanOrEqual(s.nugs * AUTO_BUY_RESERVE_SHARE + 1e-6)
    expect(s.cash - after.cash).toBeLessThanOrEqual(s.cash * AUTO_BUY_RESERVE_SHARE + 1e-6)
  })

  it('holds off entirely when the cheapest row is not spare change', () => {
    // The rail this protects: automation that spends every coin as it lands
    // leaves a returning player nothing to do. Measured at 64.7 % of check-ins
    // offering a move, against a >= 90 % rail, before the reserve existed.
    const poor = { ...s, nugs: GENERATORS[0].baseCost * 2, cash: JOBS[0].baseCost * 2 }
    const after = applyAutoBuy(poor, { ...poor, playTime: 45 })
    expect(after.generators).toEqual(poor.generators)
    expect(after.jobs).toEqual(poor.jobs)
    expect(after.nugs).toBe(poor.nugs)
  })

  it('still leaves the player able to afford something after a long catch-up', () => {
    const after = applyAutoBuy(s, { ...s, playTime: 45 * 500 })
    expect(after.nugs).toBeGreaterThan(GENERATORS[0].baseCost)
    expect(after.cash).toBeGreaterThan(JOBS[0].baseCost)
  })
})

describe('the reserve is a hard bound per catch-up, not per round', () => {
  it('a full catch-up can never spend more than the share of the starting balance', () => {
    // Per-ROUND the reserve compounds: ten rounds at a quarter each would
    // leave 5.6 % of the balance. The purse is taken once and spent down.
    const s = save({
      high: 1e5, lifeHigh: Infinity, nugs: 1e6, cash: 1e6, playTime: 0,
      keepsakes: ['window-placard', 'standing-order'], equipped: ['window-placard', 'standing-order'],
      generators: { tray: 5 }, jobs: { thinker: 5 },
    })
    const after = applyAutoBuy(s, { ...s, playTime: 45 * 500 })
    expect(s.nugs - after.nugs).toBeLessThanOrEqual(s.nugs * AUTO_BUY_RESERVE_SHARE + 1e-6)
    expect(s.cash - after.cash).toBeLessThanOrEqual(s.cash * AUTO_BUY_RESERVE_SHARE + 1e-6)
    expect(after.nugs).toBeGreaterThanOrEqual(s.nugs * (1 - AUTO_BUY_RESERVE_SHARE) - 1e-6)
  })

  it('still buys something when it can', () => {
    const s = save({
      high: 1e5, lifeHigh: Infinity, nugs: 1e9, cash: 1e9, playTime: 0,
      keepsakes: ['window-placard'], equipped: ['window-placard'],
    })
    const after = applyAutoBuy(s, { ...s, playTime: 45 * 20 })
    expect(owned(after.generators)).toBeGreaterThan(0)
  })

  it('never buys a row the player could not have afforded outright', () => {
    const s = save({
      high: 1e5, lifeHigh: Infinity, nugs: 5, cash: 5, playTime: 0,
      keepsakes: ['window-placard'], equipped: ['window-placard'],
    })
    const after = applyAutoBuy(s, { ...s, playTime: 45 * 50 })
    expect(after.generators).toEqual({})
    expect(after.nugs).toBe(5)
  })
})

describe('review round 2 (Codex CL#19 R2) — regression pins', () => {
  it('migration validates capacity against the RETAINED arrangement (P2)', () => {
    // Slots computed from the full list and then sliced could drop the very
    // shelf keepsake that supplied the extra place.
    const s = migrateSave({
      version: 3, high: 10, peakHigh: 10, lifeHigh: STAGES[14].minLifeHigh,
      keepsakes: KEEPSAKES.map(k => k.id),
      equipped: [...KEEPSAKES.filter(k => k.id !== 'accession-card').map(k => k.id), 'accession-card'],
    } as never)
    expect(s.equipped.length).toBeLessThanOrEqual(keepsakeSlots(s))
  })

  it('Wake & Bake carries the life-long fields, not just the couch (P2)', () => {
    const s = save({
      peakHigh: 1e6, lifeHigh: 1e12, enlightenment: 3,
      keepsakes: ['exact-change'], equipped: ['exact-change'],
      manualHits: 4321, couchSeeded: true,
    })
    const after = applyPrestige(s, 1)!
    expect(after.manualHits).toBe(4321)   // the echo cadence is life-long
    expect(after.couchSeeded).toBe(true)  // a cleared couch stays cleared
  })

  it('a pre-v3 save cannot claim its couch was already seeded (P2)', () => {
    const s = migrateSave({
      version: 2, high: 10, peakHigh: 10, lifeHigh: STAGES[8].minLifeHigh, couchSeeded: true,
    } as never)
    expect(s.couchSeeded).toBe(false)
    // ...so the migration catch-up it needs still runs.
    expect(collectKeepsakes(s, 'fill').arranged.length).toBeGreaterThan(0)
  })

  it('offline automation buys at its boundaries, and never multiplies the cap (P2)', () => {
    const s = save({
      high: 1e5, lifeHigh: Infinity, nugs: 1e8, cash: 1e8, lastTick: 0,
      generators: { tray: 20 }, jobs: { thinker: 20 },
      keepsakes: ['window-placard'], equipped: ['window-placard'],
    })
    const cap = computeRates(s).offlineCap
    const scheduled = applyOfflineWithAutomation(s, cap * 4)
    // The purchases happen — and early ones produce for the later segments.
    expect(owned(scheduled.save.generators))
      .toBeGreaterThan(owned(s.generators))
    // THE INVARIANT THAT MATTERS: splitting must never let the absence earn
    // more than one capped window. An upper bound is a single capped window
    // at the FINAL (richest) rates.
    const ceiling = computeRates(scheduled.save).nugRate * cap * computeRates(scheduled.save).offlineEff
      + (scheduled.save.nugs - scheduled.save.nugs)
    expect(scheduled.summary!.nugs).toBeLessThanOrEqual(ceiling + 1)
    expect(scheduled.summary!.capped).toBe(true)
    expect(scheduled.summary!.seconds).toBeLessThanOrEqual(cap * computeRates(s).offlineEff + 1e-6)
  })

  it('falls back to a plain offline pass when nothing automates', () => {
    const s = save({ high: 1e5, lifeHigh: Infinity, generators: { tray: 20 }, lastTick: 0 })
    const a = applyOfflineWithAutomation(s, 3600)
    const b = applyOffline(s, 3600)
    expect(a.save.nugs).toBeCloseTo(b.save.nugs, 6)
    expect(a.summary!.seconds).toBeCloseTo(b.summary!.seconds, 6)
  })
})

describe('review round 3 (Codex CL#19 R3) — regression pins', () => {
  it('the reserve is cumulative across a catch-up — Codex’s counterexample (P2)', () => {
    // 100 nugs, no generators, ten due rounds. The per-purchase ceiling let
    // this buy four trays and spend ~49 % of the starting balance while the
    // commit message claimed a 25 % hard bound. The purse is the fix.
    const s = save({
      high: 1e5, lifeHigh: Infinity, nugs: 100, cash: 0, playTime: 0,
      keepsakes: ['window-placard'], equipped: ['window-placard'],
    })
    const after = applyAutoBuy(s, { ...s, playTime: 45 * 10 })
    const spent = s.nugs - after.nugs
    expect(spent).toBeLessThanOrEqual(s.nugs * AUTO_BUY_RESERVE_SHARE + 1e-9)
    expect(after.nugs).toBeGreaterThanOrEqual(75 - 1e-9)
  })

  it('automation never rewrites playTime (P1)', () => {
    const s = save({
      high: 1e5, lifeHigh: Infinity, nugs: 1e9, cash: 1e9, playTime: 98765,
      keepsakes: ['window-placard'], equipped: ['window-placard'],
    })
    const next = { ...s, playTime: 98765 + 90 }
    expect(applyAutoBuy(s, next).playTime).toBe(next.playTime)
    // and across an absence
    const back = applyOfflineWithAutomation({ ...s, lastTick: 0 }, 3600)
    expect(back.save.playTime).toBeGreaterThan(s.playTime)
  })

  it('the return gift is banked exactly once per absence, not once per segment (P2)', () => {
    const s = save({
      high: 1e5, lifeHigh: Infinity, nugs: 1e8, cash: 1e8, lastTick: 0,
      generators: { tray: 30 }, jobs: { thinker: 20 },
      keepsakes: ['exact-change', 'window-placard'], equipped: ['exact-change', 'window-placard'],
    })
    const rate = computeRates(s).nugRate
    const back = applyOfflineWithAutomation(s, 4 * 3600)
    // exactly 45 s of the DEPARTURE rate, however many segments ran
    expect(back.save.returnGift).toBeCloseTo(rate * 45, 3)
  })

  it('segments land on the automation’s real boundaries (P2)', () => {
    // 90 s absence, 45 s interval: purchases belong at 45 and 90, not at
    // 30 and 60 as equal-thirds segmenting produced.
    const s = save({
      high: 1e5, lifeHigh: Infinity, nugs: 1e6, cash: 1e6, lastTick: 0,
      generators: { tray: 10 },
      keepsakes: ['window-placard'], equipped: ['window-placard'],
    })
    const back = applyOfflineWithAutomation(s, 90)
    const cap = computeRates(s).offlineCap
    // The total window is unchanged and still one capped absence.
    expect(back.summary!.seconds).toBeLessThanOrEqual(Math.min(90, cap) * computeRates(s).offlineEff + 1e-6)
    expect(owned(back.save.generators)).toBeGreaterThan(owned(s.generators))
  })

  it('the optimizer takes the strongest of a ranked kind (P2)', () => {
    const s = save({ lifeHigh: Infinity, keepsakes: KEEPSAKES.map(k => k.id) })
    const want = POLICIES['keepsake-optimizer'].arrange!(s)!
    // First Follower (30 %) over Standing Glass (10 %); the Jar (40 %) over
    // Valid Until Morning (18 %).
    if (want.some(id => keepsakeById(id)!.effect.kind === 'work-nugs')) {
      expect(want).toContain('first-follower')
      expect(want).not.toContain('standing-glass')
    }
    if (want.some(id => keepsakeById(id)!.effect.kind === 'buzz-floor')) {
      expect(want).toContain('jar-of-that-light')
      expect(want).not.toContain('valid-until-morning')
    }
  })
})

describe('independent review (Gemini, on the unreviewed round-3 head)', () => {
  it('a shelf is bought only for the rounds it is owed', () => {
    // Latent today — both auto-buy keepsakes carry 45 s — but buying every
    // shelf on every round would over-buy the slower one the moment the two
    // intervals differ. Exercised here through applyAutoBuy's own arithmetic.
    const s = save({
      high: 1e5, lifeHigh: Infinity, nugs: 1e9, cash: 1e9, playTime: 0,
      keepsakes: ['window-placard', 'standing-order'], equipped: ['window-placard', 'standing-order'],
    })
    // Both on 45 s: three boundaries in 135 s means at most three of each.
    const after = applyAutoBuy(s, { ...s, playTime: 135 })
    expect(owned(after.generators)).toBeLessThanOrEqual(3)
    expect(owned(after.jobs)).toBeLessThanOrEqual(3)
    // and one boundary buys at most one of each
    const one = applyAutoBuy(s, { ...s, playTime: 45 })
    expect(owned(one.generators)).toBeLessThanOrEqual(1)
    expect(owned(one.jobs)).toBeLessThanOrEqual(1)
  })

  it('the census reads every keepsake a chapter mints, not just the first', () => {
    // The content table holds exactly one per chapter (pinned above), but the
    // instrument must not depend on it — reading only the first would drop a
    // shape and mis-attribute its introduction to a later chapter.
    const byStage = new Map<string, number>()
    for (const k of KEEPSAKES) byStage.set(k.stage, (byStage.get(k.stage) ?? 0) + 1)
    expect([...byStage.values()].every(n => n === 1)).toBe(true)
    expect(byStage.size).toBe(STAGES.length - 1)
  })
})
