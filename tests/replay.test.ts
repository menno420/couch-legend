// Replay parity against the two committed hand-played traces (real UI,
// Chromium, local build of e4b168b — see docs/sim/2026-08-20-life-story-balance.md
// for how they were produced and what they do and do not establish).
//
// The bands below were REGISTERED BEFORE the first replay run. If a run
// busts a band the model gets investigated — bands only move with a stated
// mechanism, never to make a red bar green.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { replayTrace, type Trace } from '../src/lib/sim/replay'

const load = (name: string): Trace =>
  JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf8'))

const BANDS: Record<string, number> = {
  high: 0.05, peakHigh: 0.05, nugs: 0.05, cash: 0.05,
  totalHits: 0.05, playTime: 0.05, buzz: 0.20,
}
// Absolute floors under the relative bands. Wallets sit near zero right
// after a purchase, where a single UI tick (50 ms) of purchase-timing skew
// moves a few units at contemporary rates — that is recorder resolution,
// not model error, so wallet floors are sized to ~1 tick × typical rates.

describe('replay parity — 11-minute fresh-start session', () => {
  const report = replayTrace(load('handplay-2026-08-20.json'))
  it('replays every recorded action without rejection', () => {
    expect(report.misses).toEqual([])
  })
  it('compares a real number of snapshots', () => {
    expect(report.compared).toBeGreaterThan(100)
  })
  it('stays inside the registered bands on every field', () => {
    for (const [field, band] of Object.entries(BANDS)) {
      expect(report.worst[field].rel, `${field} worst ${JSON.stringify(report.worst[field])}`).toBeLessThan(band)
    }
    expect(report.enlightenmentExact).toBe(true)
  })
})

describe('replay parity — prestige session (seeded near-gate save)', () => {
  const report = replayTrace(load('handplay-prestige-2026-08-20.json'))
  it('replays the live Wake & Bake without rejection', () => {
    expect(report.misses).toEqual([])
    expect(report.compared).toBeGreaterThan(30)
    expect(report.enlightenmentExact).toBe(true)
  })
  it('stays inside the registered bands across the reset', () => {
    for (const [field, band] of Object.entries(BANDS)) {
      expect(report.worst[field].rel, `${field} worst ${JSON.stringify(report.worst[field])}`).toBeLessThan(band)
    }
  })
})
