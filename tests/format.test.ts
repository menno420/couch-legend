import { describe, expect, it } from 'vitest'
import { fmt, fmtDuration } from '../src/lib/format'

describe('number formatting', () => {
  it('formats the ladder the way the UI shows costs', () => {
    expect(fmt(0)).toBe('0')
    expect(fmt(10)).toBe('10')
    expect(fmt(80)).toBe('80')
    expect(fmt(620)).toBe('620')
    expect(fmt(4800)).toBe('4.80K')
    expect(fmt(42e3)).toBe('42.0K')
    expect(fmt(38e4)).toBe('380K')
    expect(fmt(36e5)).toBe('3.60M')
    expect(fmt(34e6)).toBe('34.0M')
    expect(fmt(32e7)).toBe('320M')
    expect(fmt(31e8)).toBe('3.10B')
    expect(fmt(3e10)).toBe('30.0B')
    expect(fmt(29e10)).toBe('290B')
  })

  it('handles decimals, negatives and non-finite input', () => {
    expect(fmt(0.17)).toBe('0.17')
    expect(fmt(-1234)).toBe('-1.23K')
    expect(fmt(Infinity)).toBe('0')
    expect(fmt(NaN)).toBe('0')
  })

  it('formats durations', () => {
    expect(fmtDuration(42)).toBe('42s')
    expect(fmtDuration(90)).toBe('1m 30s')
    expect(fmtDuration(3600)).toBe('1h')
    expect(fmtDuration(3660)).toBe('1h 1m')
  })
})
