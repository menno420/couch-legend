// Pins for the growth-curve tuning. Since the 2026-08-21 adoption (§ 7
// item 1) the DEFAULT is the sim-tested knee+cap curve; PROTO_TUNING is the
// prototype's exact shapes, kept for the replay fixtures and the baseline
// dataset and pinned here so neither curve can drift silently.
import { describe, expect, it } from 'vitest'
import { clarityMultiplier, computeRates, DEFAULT_TUNING, defaultSave, milestoneMult, PROTO_TUNING } from '../src/lib/engine'

describe('DEFAULT_TUNING is the adopted candidate (knee 80 · exp 0.5 · cap 6)', () => {
  it('pins the adopted constants themselves', () => {
    expect(DEFAULT_TUNING).toEqual({ clarityKnee: 80, claritySoftExp: 0.5, milestoneCapDoublings: 6 })
  })
  it('clarity: linear 0.18 per point up to the knee — the playtested region is untouched', () => {
    expect(clarityMultiplier(0)).toBe(1)
    expect(clarityMultiplier(5)).toBeCloseTo(1.9, 12)
    expect(clarityMultiplier(80)).toBeCloseTo(1 + 80 * 0.18, 12)
    expect(clarityMultiplier(5)).toBe(clarityMultiplier(5, PROTO_TUNING))
  })
  it('clarity: sqrt-softened past the knee', () => {
    expect(clarityMultiplier(180)).toBeCloseTo(1 + (80 + 100 ** 0.5) * 0.18, 12)
    expect(clarityMultiplier(1e6)).toBeCloseTo(1 + (80 + (1e6 - 80) ** 0.5) * 0.18, 6)
    expect(clarityMultiplier(1e6)).toBeLessThan(clarityMultiplier(1e6, PROTO_TUNING))
  })
  it('milestones: a doubling every 25 units, capped at 2^6', () => {
    expect(milestoneMult(24)).toBe(1)
    expect(milestoneMult(25)).toBe(2)
    expect(milestoneMult(149)).toBe(2 ** 5)
    expect(milestoneMult(150)).toBe(2 ** 6)
    expect(milestoneMult(1000)).toBe(2 ** 6)
  })
  it('computeRates default equals computeRates with DEFAULT_TUNING — and proto below the knee', () => {
    const s = {
      ...defaultSave(0), high: 5000, lifeHigh: 5000, peakHigh: 5000, buzz: 120, enlightenment: 7,
      generators: { tray: 60, gravity: 30 }, jobs: { thinker: 26 },
      rituals: { water: 3, playlist: 4, sunday: 2, roommate: 5, lamp: 2 },
    }
    expect(computeRates(s)).toEqual(computeRates(s, DEFAULT_TUNING))
    // Sub-knee, sub-cap state: the adopted curve IS the prototype curve.
    expect(computeRates(s)).toEqual(computeRates(s, PROTO_TUNING))
  })
})

describe('PROTO_TUNING preserves the prototype shapes exactly', () => {
  it('clarity: linear 0.18 per point, unbraked', () => {
    expect(clarityMultiplier(1e6, PROTO_TUNING)).toBeCloseTo(1 + 1e6 * 0.18, 6)
  })
  it('milestones: uncapped doublings', () => {
    expect(milestoneMult(250, PROTO_TUNING)).toBe(2 ** 10)
  })
})

describe('tuning shapes', () => {
  it('clarity knee: linear to the knee, softened past it', () => {
    const t = { clarityKnee: 40, claritySoftExp: 0.5, milestoneCapDoublings: Infinity }
    expect(clarityMultiplier(40, t)).toBeCloseTo(1 + 40 * 0.18, 12)
    expect(clarityMultiplier(140, t)).toBeCloseTo(1 + (40 + 100 ** 0.5) * 0.18, 12)
    expect(clarityMultiplier(140, t)).toBeLessThan(clarityMultiplier(140, PROTO_TUNING))
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
