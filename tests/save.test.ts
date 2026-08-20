// The save codec must survive round trips and reject garbage — a bad import
// must never wipe a live save.
import { describe, expect, it } from 'vitest'
import { defaultSave, migrateSave } from '../src/lib/engine'
import { exportCode, importCode, pickSave } from '../src/lib/save'

describe('save codes', () => {
  it('round-trips a populated save', () => {
    const s = migrateSave({
      ...defaultSave(123456),
      high: 512.5,
      peakHigh: 900,
      buzz: 33.3,
      nugs: 1e6,
      cash: 4200,
      enlightenment: 3,
      totalHits: 999,
      playTime: 7200,
      generators: { tray: 30, piece: 12 },
      jobs: { thinker: 8 },
      rituals: { water: 3, playlist: 2 },
      achievements: ['first-hit', 'ceiling'],
    })
    const back = importCode(exportCode(s))
    expect(back).not.toBeNull()
    expect(back).toEqual(pickSave(s))
  })

  it('rejects an empty string, wrong prefix, broken base64 and bad JSON', () => {
    expect(importCode('')).toBeNull()
    expect(importCode('AAAA')).toBeNull()
    expect(importCode('CL1.!!!notbase64!!!')).toBeNull()
    expect(importCode('CL1.' + btoa('{"version":'))).toBeNull()
  })

  it('rejects saves with non-finite or negative numbers', () => {
    const bad1 = 'CL1.' + btoa(JSON.stringify({ version: 1, nugs: -5 }))
    const bad2 = 'CL1.' + btoa(JSON.stringify({ version: 1, cash: 'Infinity' }))
    expect(importCode(bad1)).toBeNull()
    expect(importCode(bad2)).toBeNull()
  })

  it('fills defaults for missing fields', () => {
    const minimal = 'CL1.' + btoa(JSON.stringify({ version: 1 }))
    const parsed = importCode(minimal)
    expect(parsed).not.toBeNull()
    expect(parsed!.generators).toEqual({})
    expect(parsed!.sound).toBe(true)
  })
})
