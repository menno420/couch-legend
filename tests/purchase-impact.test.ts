import { describe, expect, it } from 'vitest'
import { GENERATORS, JOBS, RITUALS } from '../src/lib/content'
import {
  bulkCost, computeRates, defaultSave, generatorOutput, jobCashOutput,
  maxAffordable, milestoneMult, type SaveState,
} from '../src/lib/engine'
import { formatPurchaseImpact } from '../src/lib/purchase-impact-format'
import {
  generatorPurchaseImpact, jobPurchaseImpact, ritualPurchaseImpact,
  type RatePurchaseImpact, type RitualEffect, type RitualPurchaseImpact,
} from '../src/lib/purchase-impact'

function save(patch: Partial<SaveState> = {}): SaveState {
  return {
    ...defaultSave(0),
    high: 1e6,
    lifeHigh: 3e12,
    peakHigh: 1e6,
    nugs: 1e30,
    cash: 1e30,
    ...patch,
  }
}

function rateImpact(impact: ReturnType<typeof generatorPurchaseImpact> | ReturnType<typeof jobPurchaseImpact>): RatePurchaseImpact {
  expect(impact?.kind).toBe('rate')
  return impact as RatePurchaseImpact
}

function ritualImpact(impact: ReturnType<typeof ritualPurchaseImpact>): RitualPurchaseImpact {
  expect(impact?.kind).toBe('ritual')
  return impact as RitualPurchaseImpact
}

function effect<K extends RitualEffect['kind']>(impact: RitualPurchaseImpact, kind: K): Extract<RitualEffect, { kind: K }> {
  const found = impact.effects.find(item => item.kind === kind)
  expect(found).toBeDefined()
  return found as Extract<RitualEffect, { kind: K }>
}

describe('Grow purchase impact', () => {
  const tray = GENERATORS.find(item => item.id === 'tray')!

  it('shows the exact item-local effect for ×1', () => {
    const impact = rateImpact(generatorPurchaseImpact(save({ generators: { tray: 3 } }), 'tray', 1))
    expect(impact.quantity).toBe(1)
    expect(impact.before).toBe(generatorOutput(tray, 3))
    expect(impact.after).toBe(generatorOutput(tray, 4))
    expect(impact.delta).toBeCloseTo(impact.after - impact.before, 12)
  })

  it('shows the exact bulk effect for ×10', () => {
    const impact = rateImpact(generatorPurchaseImpact(save({ generators: { tray: 7 } }), 'tray', 10))
    expect(impact.quantity).toBe(10)
    expect(impact.cost).toBeCloseTo(bulkCost(tray.baseCost, tray.costScale, 7, 10), 8)
    expect(impact.after).toBe(generatorOutput(tray, 17))
  })

  it('includes the 24 → 25 milestone doubling', () => {
    const impact = rateImpact(generatorPurchaseImpact(save({ generators: { tray: 24 } }), 'tray', 1))
    expect(milestoneMult(24)).toBe(1)
    expect(milestoneMult(25)).toBe(2)
    expect(impact.before).toBeCloseTo(generatorOutput(tray, 24), 12)
    expect(impact.after).toBeCloseTo(generatorOutput(tray, 25), 12)
    expect(impact.delta).toBeCloseTo(2.6, 12)
  })

  it('includes every milestone in a multi-milestone bulk crossing', () => {
    const impact = rateImpact(generatorPurchaseImpact(save({ generators: { tray: 24 } }), 'tray', 100))
    expect(impact.after).toBe(generatorOutput(tray, 124))
    expect(impact.delta).toBeCloseTo(generatorOutput(tray, 124) - generatorOutput(tray, 24), 12)
    expect(milestoneMult(124)).toBe(16)
  })

  it('respects the adopted six-doubling milestone cap', () => {
    const impact = rateImpact(generatorPurchaseImpact(save({ generators: { tray: 150 } }), 'tray', 100))
    expect(milestoneMult(150)).toBe(64)
    expect(milestoneMult(250)).toBe(64)
    expect(impact.before).toBe(generatorOutput(tray, 150))
    expect(impact.after).toBe(generatorOutput(tray, 250))
  })

  it('uses the actual meaningful Max quantity and cost', () => {
    const funds = bulkCost(tray.baseCost, tray.costScale, 5, 7)
    const state = save({ generators: { tray: 5 }, nugs: funds })
    const impact = rateImpact(generatorPurchaseImpact(state, 'tray', 'max'))
    expect(maxAffordable(tray.baseCost, tray.costScale, 5, funds)).toBe(7)
    expect(impact.quantity).toBe(7)
    expect(impact.cost).toBeCloseTo(funds, 8)
    expect(impact.affordable).toBe(true)
  })

  it('returns an honest empty Max when zero units are affordable', () => {
    const impact = generatorPurchaseImpact(save({ nugs: 0 }), 'tray', 'max')
    expect(impact).toEqual({ kind: 'empty-max', quantity: 0, cost: 0, affordable: false })
    expect(formatPurchaseImpact(impact!)).toBe('Nothing affordable yet.')
  })
})

describe('Work purchase impact', () => {
  it('uses the row’s primary item-local cash output', () => {
    const thinker = JOBS.find(item => item.id === 'thinker')!
    const impact = rateImpact(jobPurchaseImpact(save({ jobs: { thinker: 24 } }), 'thinker', 1))
    expect(impact.resource).toBe('cash')
    expect(impact.before).toBe(jobCashOutput(thinker, 24))
    expect(impact.after).toBe(jobCashOutput(thinker, 25))
    expect(impact.delta).toBeCloseTo(10.4, 12)
  })
})

describe('Ritual purchase impact', () => {
  it('derives slower Buzz decay from canonical before/after rates', () => {
    const state = save({ rituals: {} })
    const impact = ritualImpact(ritualPurchaseImpact(state, 'water'))
    const duration = effect(impact, 'buzz-duration')
    const before = computeRates(state)
    const after = computeRates({ ...state, rituals: { water: 1 } })
    expect(duration.before).toBeCloseTo(1 / before.decay, 12)
    expect(duration.after).toBeCloseTo(1 / after.decay, 12)
    expect(duration.after).toBeGreaterThan(duration.before)
  })

  it('derives auto-hits and passive Buzz from their canonical rate fields', () => {
    const state = save({ rituals: {} })
    const roommate = ritualImpact(ritualPurchaseImpact(state, 'roommate'))
    const autoHits = effect(roommate, 'auto-hits')
    expect(autoHits.before).toBe(computeRates(state).autoHits)
    expect(autoHits.after).toBe(computeRates({ ...state, rituals: { roommate: 1 } }).autoHits)

    const lamp = ritualImpact(ritualPurchaseImpact(state, 'lamp'))
    const passiveBuzz = effect(lamp, 'passive-buzz')
    expect(passiveBuzz.after).toBe(computeRates({ ...state, rituals: { lamp: 1 } }).lampBuzz)
  })

  it('collapses equal global rate changes into one all-production effect', () => {
    const state = save({ rituals: {} })
    const impact = ritualImpact(ritualPurchaseImpact(state, 'playlist'))
    expect(impact.effects).toHaveLength(1)
    expect(impact.effects[0]).toMatchObject({ kind: 'production', target: 'all' })
    const production = effect(impact, 'production')
    expect(production.after / production.before).toBeCloseTo(1.08, 12)
  })

  it('derives both offline duration and efficiency', () => {
    const state = save({ rituals: {} })
    const impact = ritualImpact(ritualPurchaseImpact(state, 'curtains'))
    const cap = effect(impact, 'offline-cap')
    const efficiency = effect(impact, 'offline-efficiency')
    const after = computeRates({ ...state, rituals: { curtains: 1 } })
    expect(cap.after).toBe(after.offlineCap)
    expect(efficiency.after).toBe(after.offlineEff)
    expect(formatPurchaseImpact(impact)).toContain('Offline cap 2h → 4h')
    expect(formatPurchaseImpact(impact)).toContain('keeps 45% → 55%')
  })

  it('derives prestige yield without copying the prestige formula', () => {
    const state = save({ rituals: {} })
    const impact = ritualImpact(ritualPurchaseImpact(state, 'cushion'))
    const yieldEffect = effect(impact, 'prestige-yield')
    expect(yieldEffect.before).toBe(computeRates(state).prestigeBonus)
    expect(yieldEffect.after).toBe(computeRates({ ...state, rituals: { cushion: 1 } }).prestigeBonus)
  })

  it('labels Pillow Throne as Work cash rather than total cash production', () => {
    const state = save({ jobs: {}, rituals: {} })
    const impact = ritualImpact(ritualPurchaseImpact(state, 'throne'))
    const production = effect(impact, 'production')
    expect(production).toMatchObject({ target: 'job-cash' })
    expect(formatPurchaseImpact(impact)).toContain('Work cash +15.0%')
    expect(computeRates({ ...state, rituals: { throne: 1 } }).cashRate).toBe(computeRates(state).cashRate)
  })

  it('includes Sunday Forever cash-per-hit without repeating the derived formula', () => {
    const state = save({ rituals: {} })
    const impact = ritualImpact(ritualPurchaseImpact(state, 'sunday'))
    const hit = effect(impact, 'hit')
    const before = computeRates(state)
    const after = computeRates({ ...state, rituals: { sunday: 1 } })
    expect(hit).toMatchObject({ target: 'nugs-cash', before: before.hitPower, after: after.hitPower })
    expect(after.hitCash / before.hitCash).toBeCloseTo(after.hitPower / before.hitPower, 12)
    expect(formatPurchaseImpact(impact)).toContain('Hit nugs + cash +28.0%')
  })

  it('gives every current non-maxed ritual at least one semantic effect', () => {
    for (const ritual of RITUALS) {
      const impact = ritualImpact(ritualPurchaseImpact(save({ rituals: {} }), ritual.id))
      expect(impact.effects.length, ritual.id).toBeGreaterThan(0)
    }
  })
})

describe('locked and maxed rows', () => {
  it('does not expose an impact for High-locked or chapter-locked rows', () => {
    expect(generatorPurchaseImpact(save({ high: 0, lifeHigh: 0 }), 'piece', 1)).toBeNull()
    expect(generatorPurchaseImpact(save({ high: 1e6, lifeHigh: 0 }), 'pinch', 1)).toBeNull()
  })

  it('does not expose an impact for a maxed ritual', () => {
    const water = RITUALS.find(item => item.id === 'water')!
    expect(ritualPurchaseImpact(save({ rituals: { water: water.maxLevel } }), 'water')).toBeNull()
  })
})
