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

export function formatPurchaseImpact(impact: PurchaseImpact): string {
  if (impact.kind === 'empty-max') return 'Nothing affordable yet.'
  if (impact.kind === 'rate') {
    const resource = impact.resource === 'cash' ? ' cash' : ''
    const rate = `+${fmtRate(impact.delta)} · becomes ${fmtRate(impact.after)}${resource}`
    return [rate, ...impact.effects.map(formatEffect)].join(' · ')
  }
  return impact.effects.map(formatEffect).join(' · ')
}
