// Pins for the optional growth-curve tuning parameter. The load-bearing
// property: PROTO_TUNING (the default) reproduces the prototype formulas
// EXACTLY — the whole existing engine suite runs through the default path,
// and these pins fix the parameterized shapes themselves.
import { describe, expect, it } from 'vitest'
import { clarityMultiplier, computeRates, defaultSave, milestoneMult, PROTO_TUNING } from '../src/lib/engine'

describe('PROTO_TUNING is the identity', () => {
  it('clarity: linear 0.18 per point, unchanged', () => {
    expect(clarityMultiplier(0)).toBe(1)
    expect(clarityMultiplier(5)).toBeCloseTo(1.9, 12)
    expect(clarityMultiplier(5, PROTO_TUNING)).toBeCloseTo(1.9, 12)
    expect(clarityMultiplier(1e6)).toBeCloseTo(1 + 1e6 * 0.18, 6)
  })
  it('milestones: a doubling every 25 units, uncapped', () => {
    expect(milestoneMult(24)).toBe(1)
    expect(milestoneMult(25)).toBe(2)
    expect(milestoneMult(250)).toBe(2 ** 10)
    expect(milestoneMult(250, PROTO_TUNING)).toBe(2 ** 10)
  })
  it('computeRates default equals computeRates with PROTO_TUNING', () => {
    const s = {
      ...defaultSave(0), high: 5000, peakHigh: 5000, buzz: 120, enlightenment: 7,
      generators: { tray: 60, gravity: 30 }, jobs: { thinker: 26 },
      rituals: { water: 3, playlist: 4, sunday: 2, roommate: 5, lamp: 2 },
    }
    expect(computeRates(s)).toEqual(computeRates(s, PROTO_TUNING))
  })
})

describe('candidate shapes', () => {
  it('clarity knee: linear to the knee, softened past it', () => {
    const t = { clarityKnee: 40, claritySoftExp: 0.5, milestoneCapDoublings: Infinity }
    expect(clarityMultiplier(40, t)).toBeCloseTo(1 + 40 * 0.18, 12)
    expect(clarityMultiplier(140, t)).toBeCloseTo(1 + (40 + 100 ** 0.5) * 0.18, 12)
    expect(clarityMultiplier(140, t)).toBeLessThan(clarityMultiplier(140))
  })
  it('milestone cap: doublings stop at the cap', () => {
    const t = { clarityKnee: Infinity, claritySoftExp: 1, milestoneCapDoublings: 6 }
    expect(milestoneMult(149, t)).toBe(2 ** 5)
    expect(milestoneMult(150, t)).toBe(2 ** 6)
    expect(milestoneMult(1000, t)).toBe(2 ** 6)
  })
  it('softened curves stay monotonic', () => {
    const t = { clarityKnee: 40, claritySoftExp: 0.5, milestoneCapDoublings: 6 }
    let prev = 0
    for (const e of [0, 10, 40, 41, 100, 1e3, 1e5, 1e7]) {
      const v = clarityMultiplier(e, t)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})
