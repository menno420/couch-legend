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
    expect(s.lifeHigh).toBeCloseTo(1, 10)
    expect(s.peakHigh).toBeCloseTo(1, 10)
    expect(s.buzz).toBeCloseTo(2.4, 10)
    expect(s.totalHits).toBe(1)
  })
  it('accumulates lifeHigh by hitHigh even when high is already banked', () => {
    const s = { ...fresh(), high: 40, lifeHigh: 5000, peakHigh: 40 }
    const after = applyHit(s)
    expect(after.lifeHigh).toBeCloseTo(5001, 10)
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
  it('resets the afternoon and keeps lifeHigh, Clarity, achievements, sound, startedAt', () => {
    const s = {
      ...fresh(), high: 500, lifeHigh: 900, peakHigh: 900, buzz: 40, nugs: 5e4, cash: 3e4,
      enlightenment: 1, achievements: ['first-hit'], totalHits: 400,
      playTime: 3600, startedAt: 123, sound: false,
      generators: { tray: 10 }, jobs: { thinker: 3 }, rituals: { water: 2 },
    }
    const gain = prestigeGain(s)
    expect(gain).toBeGreaterThan(0)
    const after = applyPrestige(s, 5000)!
    expect(after.lifeHigh).toBe(900) // the story never resets (DESIGN § 9.2)
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

describe('stage gates — additive prologue content only (DESIGN § 9.4)', () => {
  it('a prologue row stays locked below its stage, whatever High says', () => {
    // Post-prestige shape: High past every prologue unlock, the life still
    // in stage 1. Every gated row must reject.
    const s = { ...fresh(), high: 400, lifeHigh: 400, peakHigh: 400, nugs: 1e6, cash: 1e6 }
    expect(purchaseGenerator(s, 'pinch', 1)).toBeNull()
    expect(purchaseGenerator(s, 'grinder', 1)).toBeNull()
    expect(purchaseJob(s, 'shift', 1)).toBeNull()
    expect(purchaseRitual(s, 'lighter')).toBeNull()
  })
  it('opens exactly at the stage threshold (and the high gate still binds)', () => {
    const atStage2 = { ...fresh(), high: 47, lifeHigh: 510, peakHigh: 510, cash: 1e6, nugs: 1e6 }
    expect(purchaseJob(atStage2, 'shift', 1)).not.toBeNull()
    expect(purchaseGenerator(atStage2, 'pinch', 1)).toBeNull() // stage 3 still ahead
    const atStage3 = { ...atStage2, lifeHigh: 1.7e3 }
    expect(purchaseGenerator(atStage3, 'pinch', 1)).not.toBeNull()
    expect(purchaseRitual(atStage3, 'lighter')).not.toBeNull()
    const lowHigh = { ...atStage3, high: 20 } // stage open, afternoon too fresh
    expect(purchaseGenerator(lowHigh, 'pinch', 1)).toBeNull()
  })
  it('original items never key on lifeHigh', () => {
    const s = { ...fresh(), high: 8, lifeHigh: 8, peakHigh: 8, nugs: 1000 }
    expect(purchaseGenerator(s, 'piece', 1)).not.toBeNull()
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
