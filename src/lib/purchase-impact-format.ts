import { fmt, fmtDuration, fmtRate } from './format'
import type { PurchaseImpact, RitualEffect } from './purchase-impact'

function percentChange(before: number, after: number): string {
  if (before === 0) return '0%'
  return `${fmt((after / before - 1) * 100, 1)}%`
}

function formatEffect(effect: RitualEffect): string {
  switch (effect.kind) {
    case 'production': {
      const target = effect.target === 'grow-work' ? 'Grow + Work'
        : effect.target === 'nugs' ? 'Nug production'
          : effect.target === 'job-cash' ? 'Work cash'
            : 'High production'
      return `${target} +${percentChange(effect.before, effect.after)}`
    }
    case 'buzz-duration':
      return `Buzz lasts ${percentChange(effect.before, effect.after)} longer`
    case 'auto-hits':
      return `Auto-hits ${fmtRate(effect.before)} → ${fmtRate(effect.after)}`
    case 'passive-buzz':
      return `Passive Buzz ${fmtRate(effect.before)} → ${fmtRate(effect.after)}`
    case 'hit': {
      if (effect.target === 'nugs-cash') {
        return `Hit nugs + cash +${percentChange(effect.before, effect.after)}`
      }
      const target = effect.target === 'nugs' ? 'Hit nugs'
        : effect.target === 'cash' ? 'Cash/hit'
          : effect.target === 'high' ? 'High/hit'
            : 'Buzz/hit'
      return `${target} +${percentChange(effect.before, effect.after)}`
    }
    case 'offline-cap':
      return `Offline cap ${fmtDuration(effect.before)} → ${fmtDuration(effect.after)}`
    case 'offline-efficiency':
      return `keeps ${fmt(Math.round(effect.before * 100), 0)}% → ${fmt(Math.round(effect.after * 100), 0)}%`
    case 'prestige-yield':
      return `Wake & Bake yield ×${fmt(effect.before)} → ×${fmt(effect.after)}`
  }
}

function crossWireLine(cross: NonNullable<Extract<PurchaseImpact, { kind: 'rate' }>['crossWired']>): string {
  const other = cross.resource === 'cash' ? 'cash' : 'nugs'
  const ceiling = cross.resource === 'nugs' ? 'the garden' : 'your jobs'
  if (cross.delta <= 0) return `no more ${other} — ${ceiling} ${cross.resource === 'nugs' ? 'is' : 'are'} the ceiling`
  return cross.capped
    ? `+${fmtRate(cross.delta)} ${other} too, up to ${ceiling}`
    : `+${fmtRate(cross.delta)} ${other} too`
}

export function formatPurchaseImpact(impact: PurchaseImpact): string {
  if (impact.kind === 'empty-max') return 'Nothing affordable yet.'
  if (impact.kind === 'rate') {
    const resource = impact.resource === 'cash' ? ' cash' : ''
    const rate = `+${fmtRate(impact.delta)} · becomes ${fmtRate(impact.after)}${resource}`
    // When the couch has cross-wired the shelves, this row pays in BOTH
    // currencies and the preview says both — otherwise it promises half of
    // what the purchase delivers. And when the cross-wire's ceiling is what
    // the other shelf makes, the preview says THAT rather than promising a
    // number the cap withholds: the honest line is "the other shelf is the
    // ceiling", not "+0 nugs too".
    const cross = impact.crossWired
      ? [crossWireLine(impact.crossWired)]
      : []
    // And when this row's own currency ALSO rises because the other shelf's
    // cross-wire had a ceiling this purchase just lifted, say that too — the
    // tile will move by more than the row alone, and the preview promises
    // the whole move.
    const matched = impact.matched
      ? [impact.matched.resource === 'nugs'
          ? `+${fmtRate(impact.matched.delta)} more from the jobs — the garden lifted their ceiling`
          : `+${fmtRate(impact.matched.delta)} more from the garden — the jobs lifted its ceiling`]
      : []
    return [rate, ...cross, ...matched, ...impact.effects.map(formatEffect)].join(' · ')
  }
  return impact.effects.map(formatEffect).join(' · ')
}
