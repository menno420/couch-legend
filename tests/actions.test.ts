// Pins for the pure action layer — the exact semantics the web store had
// before extraction, so the simulator and the UI can never drift apart.
import { describe, expect, it } from 'vitest'
import {
  applyHit, applyPrestige, collectAchievements, purchaseGenerator,
  purchaseJob, purchaseRitual,
} from '../src/lib/actions'
import { defaultSave, prestigeGain } from '../src/lib/engine'

const fresh = () => defaultSave(0)

describe('applyHit', () => {
  it('applies the base hit exactly (1 nug, 0.9 cash, 1 high, 2.4 buzz)', () => {
    const s = applyHit(fresh())
    expect(s.nugs).toBeCloseTo(1, 10)
    expect(s.cash).toBeCloseTo(0.9, 10)
    expect(s.high).toBeCloseTo(1, 10)
    expect(s.peakHigh).toBeCloseTo(1, 10)
    expect(s.buzz).toBeCloseTo(2.4, 10)
    expect(s.totalHits).toBe(1)
  })
  it('scales with Sunday Forever and Clarity', () => {
    const s = { ...fresh(), rituals: { sunday: 2 }, enlightenment: 3, high: 1000, peakHigh: 1000 }
    const after = applyHit(s)
    const clarity = 1 + 3 * 0.18
    expect(after.nugs).toBeCloseTo((1 + 0.28 * 2) * clarity, 10)
    expect(after.cash).toBeCloseTo(0.9 * (1 + 0.28 * 2) * clarity, 10)
    expect(after.high - s.high).toBeCloseTo(1 + 0.06 * 2, 10)
  })
})

describe('purchases', () => {
  it('rejects a locked generator and accepts it once High unlocks it', () => {
    const s = { ...fresh(), nugs: 1000 }
    expect(purchaseGenerator(s, 'piece', 1)).toBeNull() // unlockHigh 8
    const unlocked = { ...s, high: 8 }
    const after = purchaseGenerator(unlocked, 'piece', 1)
    expect(after?.generators.piece).toBe(1)
    expect(after?.nugs).toBeCloseTo(1000 - 80, 10)
  })
  it('rejects an unaffordable purchase outright', () => {
    expect(purchaseGenerator({ ...fresh(), nugs: 9.99 }, 'tray', 1)).toBeNull()
  })
  it('max-buys the geometric series exactly', () => {
    const s = { ...fresh(), nugs: 10 + 10 * 1.14 + 10 * 1.14 ** 2 }
    const after = purchaseGenerator(s, 'tray', 'max')
    expect(after?.generators.tray).toBe(3)
    expect(after?.nugs).toBeCloseTo(0, 8)
  })
  it('jobs spend cash, not nugs', () => {
    const s = { ...fresh(), high: 4, cash: 8, nugs: 5 }
    const after = purchaseJob(s, 'thinker', 1)
    expect(after?.cash).toBeCloseTo(0, 10)
    expect(after?.nugs).toBe(5)
  })
  it('rituals walk their ladder and stop at max level', () => {
    let s = { ...fresh(), high: 6, nugs: 1e9 }
    for (let i = 0; i < 8; i++) {
      const next = purchaseRitual(s, 'water')
      expect(next).not.toBeNull()
      s = next!
    }
    expect(s.rituals.water).toBe(8)
    expect(purchaseRitual(s, 'water')).toBeNull()
    expect(s.nugs).toBeCloseTo(1e9 - (25 + 80 + 250 + 800 + 2500 + 8e3 + 25e3 + 8e4), 6)
  })
})

describe('applyPrestige', () => {
  it('returns null below the peak gate', () => {
    expect(applyPrestige({ ...fresh(), peakHigh: 399 }, 0)).toBeNull()
  })
  it('resets the afternoon and keeps Clarity, achievements, sound, startedAt', () => {
    const s = {
      ...fresh(), high: 500, peakHigh: 900, buzz: 40, nugs: 5e4, cash: 3e4,
      enlightenment: 1, achievements: ['first-hit'], totalHits: 400,
      playTime: 3600, startedAt: 123, sound: false,
      generators: { tray: 10 }, jobs: { thinker: 3 }, rituals: { water: 2 },
    }
    const gain = prestigeGain(s)
    expect(gain).toBeGreaterThan(0)
    const after = applyPrestige(s, 5000)!
    expect(after.enlightenment).toBe(1 + gain)
    expect(after.achievements).toEqual(['first-hit'])
    expect(after.sound).toBe(false)
    expect(after.startedAt).toBe(123)
    expect(after.booted).toBe(true)
    expect(after.high).toBe(0)
    expect(after.peakHigh).toBe(0)
    expect(after.buzz).toBe(0)
    expect(after.nugs).toBe(0)
    expect(after.cash).toBe(0)
    expect(after.generators).toEqual({})
    expect(after.jobs).toEqual({})
    expect(after.rituals).toEqual({})
    expect(after.totalHits).toBe(0)
    expect(after.playTime).toBe(0)
    expect(after.lastTick).toBe(5000)
  })
})

describe('collectAchievements', () => {
  it('appends newly earned ids exactly once', () => {
    const one = collectAchievements({ ...fresh(), totalHits: 1 })
    expect(one.fresh).toContain('first-hit')
    const again = collectAchievements(one.save)
    expect(again.fresh).toEqual([])
  })
})
