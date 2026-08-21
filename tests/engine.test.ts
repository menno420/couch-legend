import { describe, expect, it } from 'vitest'
import {
  advance, applyOffline, bulkCost, buzzMultiplier, clarityMultiplier,
  computeRates, defaultSave, maxAffordable, migrateSave, milestoneMult,
  newlyEarned, prestigeGain, PRESTIGE_MIN_PEAK, type SaveState,
} from '../src/lib/engine'
import { GENERATORS, JOBS, RITUALS } from '../src/lib/content'

function save(patch: Partial<SaveState> = {}): SaveState {
  return migrateSave({ ...defaultSave(0), ...patch })
}

describe('cost math', () => {
  it('bulk cost of one unit equals the spot price', () => {
    for (const g of GENERATORS) {
      for (const owned of [0, 1, 7, 24, 25, 60]) {
        const spot = g.baseCost * g.costScale ** owned
        expect(bulkCost(g.baseCost, g.costScale, owned, 1) / spot).toBeCloseTo(1, 9)
      }
    }
  })

  it('bulk cost is the sum of successive spot prices', () => {
    const g = GENERATORS[2]
    const owned = 5
    const qty = 9
    let sum = 0
    for (let i = 0; i < qty; i++) sum += g.baseCost * g.costScale ** (owned + i)
    expect(bulkCost(g.baseCost, g.costScale, owned, qty)).toBeCloseTo(sum, 4)
  })

  it('maxAffordable inverts bulkCost: the count it returns is affordable and one more is not', () => {
    const cases = [
      { base: 10, scale: 1.14, owned: 0, funds: 10 },
      { base: 10, scale: 1.14, owned: 0, funds: 9.99 },
      { base: 10, scale: 1.14, owned: 12, funds: 5000 },
      { base: 620, scale: 1.15, owned: 3, funds: 1e7 },
      { base: 8, scale: 1.16, owned: 40, funds: 123456 },
    ]
    for (const c of cases) {
      const n = maxAffordable(c.base, c.scale, c.owned, c.funds)
      expect(bulkCost(c.base, c.scale, c.owned, n)).toBeLessThanOrEqual(c.funds + 1e-6)
      expect(bulkCost(c.base, c.scale, c.owned, n + 1)).toBeGreaterThan(c.funds)
    }
  })

  it('maxAffordable is 0 when the next unit is out of reach', () => {
    expect(maxAffordable(10, 1.14, 0, 9.99)).toBe(0)
  })

  it('milestone doubling kicks in every 25 units', () => {
    expect(milestoneMult(0)).toBe(1)
    expect(milestoneMult(24)).toBe(1)
    expect(milestoneMult(25)).toBe(2)
    expect(milestoneMult(50)).toBe(4)
    expect(milestoneMult(100)).toBe(16)
  })
})

describe('rates', () => {
  it('a fresh save only earns the passive cash trickle', () => {
    const r = computeRates(save())
    expect(r.nugRate).toBe(0)
    expect(r.highRate).toBe(0)
    expect(r.cashRate).toBeCloseTo(0.05, 6)
    expect(r.hitPower).toBe(1)
  })

  it('buzz raises the multiplier by sqrt', () => {
    expect(buzzMultiplier(0)).toBe(1)
    expect(buzzMultiplier(100)).toBeCloseTo(1 + 10 * 0.12, 9)
  })

  it('clarity multiplies at 18% per point', () => {
    expect(clarityMultiplier(0)).toBe(1)
    expect(clarityMultiplier(10)).toBeCloseTo(2.8, 9)
  })

  it('hydration and snacks slow buzz decay', () => {
    const base = computeRates(save())
    const helped = computeRates(save({ rituals: { water: 8, snacks: 8 } }))
    expect(helped.decay).toBeLessThan(base.decay)
    expect(base.decay).toBeCloseTo(0.012, 9)
  })

  it('curtains extend the offline cap and efficiency', () => {
    const base = computeRates(save())
    expect(base.offlineCap).toBe(2 * 3600)
    expect(base.offlineEff).toBeCloseTo(0.45, 9)
    const max = computeRates(save({ rituals: { curtains: 5 } }))
    expect(max.offlineCap).toBe(12 * 3600)
    expect(max.offlineEff).toBeCloseTo(0.95, 9)
  })
})

describe('simulation', () => {
  it('advance accumulates generator output', () => {
    const s = save({ generators: { tray: 10 }, nugs: 0 })
    const r = computeRates(s)
    const after = advance(s, 10)
    expect(after.nugs).toBeCloseTo(r.nugRate * 10, 6)
    expect(after.playTime).toBeCloseTo(10, 9)
  })

  it('buzz decays toward zero without input', () => {
    const s = save({ buzz: 100 })
    const after = advance(s, 60)
    expect(after.buzz).toBeLessThan(100)
    expect(after.buzz).toBeGreaterThan(0)
  })

  it('peakHigh never decreases', () => {
    let s = save({ high: 50, peakHigh: 50, jobs: { thinker: 5 } })
    for (let i = 0; i < 20; i++) s = advance(s, 1)
    expect(s.peakHigh).toBeGreaterThanOrEqual(50)
    expect(s.peakHigh).toBe(Math.max(50, s.high))
  })
})

describe('offline progress', () => {
  it('short absences apply nothing', () => {
    const s = save({ generators: { tray: 5 } })
    const { summary } = applyOffline(s, 5)
    expect(summary).toBeNull()
  })

  it('long absences are capped and discounted', () => {
    const s = save({ generators: { tray: 20 }, jobs: { thinker: 5 } })
    const r = computeRates(s)
    const dayAway = applyOffline(s, 24 * 3600)
    expect(dayAway.summary).not.toBeNull()
    expect(dayAway.summary!.capped).toBe(true)
    // 2h cap at 45% efficiency
    expect(dayAway.summary!.seconds).toBeCloseTo(2 * 3600 * 0.45, 6)
    expect(dayAway.save.nugs).toBeCloseTo(r.nugRate * 2 * 3600 * 0.45, 4)
  })

  it('offline buzz converges toward the lamp steady state', () => {
    const s = save({ buzz: 200, rituals: { lamp: 4 } })
    const r = computeRates(s)
    const steady = r.lampBuzz / r.decay
    const { save: after } = applyOffline(s, 6 * 3600)
    expect(after.buzz).toBeGreaterThan(Math.min(200, steady) - 1)
    expect(after.buzz).toBeLessThan(Math.max(200, steady) + 1)
  })
})

describe('prestige', () => {
  it('locked below the peak threshold', () => {
    expect(prestigeGain(save({ peakHigh: PRESTIGE_MIN_PEAK - 1 }))).toBe(0)
  })

  it('pays sqrt(peak/90), boosted by cushions, minus what is already banked', () => {
    const s = save({ peakHigh: 900 })
    expect(prestigeGain(s)).toBe(Math.floor(Math.sqrt(10)))
    const banked = save({ peakHigh: 900, enlightenment: 2 })
    expect(prestigeGain(banked)).toBe(Math.floor(Math.sqrt(10)) - 2)
    const cushioned = save({ peakHigh: 900, rituals: { cushion: 6 } })
    expect(prestigeGain(cushioned)).toBe(Math.floor(Math.sqrt(10) * (1 + 6 * 0.22)))
  })

  it('never negative', () => {
    expect(prestigeGain(save({ peakHigh: 500, enlightenment: 99 }))).toBe(0)
  })
})

describe('achievements', () => {
  it('a fresh save has earned nothing', () => {
    expect(newlyEarned(save())).toEqual([])
  })

  it('first hit unlocks first-hit only once', () => {
    const s = save({ totalHits: 1 })
    expect(newlyEarned(s)).toContain('first-hit')
    const already = { ...s, achievements: ['first-hit'] }
    expect(newlyEarned(already)).not.toContain('first-hit')
  })

  it('achievement multipliers raise output', () => {
    const plain = computeRates(save({ generators: { tray: 10 } }))
    const decorated = computeRates(save({ generators: { tray: 10 }, achievements: ['ceiling', 'hits-1k'] }))
    expect(decorated.nugRate).toBeCloseTo(plain.nugRate * 1.05, 6)
  })
})

describe('lifeHigh — the story axis (DESIGN § 9.2)', () => {
  it('a fresh save is v2 with a zero life', () => {
    const s = defaultSave(0)
    expect(s.version).toBe(2)
    expect(s.lifeHigh).toBe(0)
  })

  it('advance accumulates lifeHigh by exactly the high gained', () => {
    const s = save({ high: 100, peakHigh: 100, jobs: { thinker: 5 }, rituals: { roommate: 2 } })
    const after = advance(s, 60)
    expect(after.lifeHigh - s.lifeHigh).toBeCloseTo(after.high - s.high, 9)
    expect(after.lifeHigh).toBeGreaterThan(s.lifeHigh)
  })

  it('applyOffline accumulates lifeHigh by the offline high gain', () => {
    const s = save({ high: 100, peakHigh: 100, jobs: { thinker: 5 } })
    const { save: after, summary } = applyOffline(s, 3600)
    expect(summary).not.toBeNull()
    expect(after.lifeHigh - s.lifeHigh).toBeCloseTo(summary!.high, 9)
  })

  it('migrateSave lifts a v1 save to v2, flooring lifeHigh at max(high, peakHigh)', () => {
    const v1 = migrateSave({ version: 1, high: 120, peakHigh: 900 })
    expect(v1.version).toBe(2)
    expect(v1.lifeHigh).toBe(900)
    const fresh = migrateSave({ version: 1 })
    expect(fresh.lifeHigh).toBe(0)
  })

  it('migrateSave keeps a valid v2 lifeHigh and repairs one below the invariant', () => {
    expect(migrateSave({ version: 2, high: 50, peakHigh: 400, lifeHigh: 5000 }).lifeHigh).toBe(5000)
    expect(migrateSave({ version: 2, high: 50, peakHigh: 400, lifeHigh: 10 }).lifeHigh).toBe(400)
    expect(migrateSave({ version: 2, high: 50, peakHigh: 400, lifeHigh: Number.NaN }).lifeHigh).toBe(400)
  })
})

describe('content invariants', () => {
  it('ids are unique across tables', () => {
    for (const table of [GENERATORS, JOBS, RITUALS]) {
      const ids = table.map(x => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('unlock thresholds rise monotonically within each table', () => {
    for (const table of [GENERATORS, JOBS]) {
      for (let i = 1; i < table.length; i++) {
        expect(table[i].unlockHigh).toBeGreaterThan(table[i - 1].unlockHigh)
        expect(table[i].baseCost).toBeGreaterThan(table[i - 1].baseCost)
      }
    }
  })

  it('ritual cost ladders match their max level and rise', () => {
    for (const r of RITUALS) {
      expect(r.costs.length).toBe(r.maxLevel)
      for (let i = 1; i < r.costs.length; i++) expect(r.costs[i]).toBeGreaterThan(r.costs[i - 1])
    }
  })
})
