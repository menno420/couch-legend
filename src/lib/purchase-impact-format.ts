import { fmt, fmtDuration, fmtRate } from './format'
import type { PurchaseImpact, RitualEffect } from './purchase-impact'

function percentChange(before: number, after: number): string {
  if (before === 0) return '0%'
  return `${fmt((after / before - 1) * 100, 1)}%`
}

function formatEffect(effect: RitualEffect): string {
  switch (effect.kind) {
    case 'production': {
      const target = effect.target === 'all' ? 'All production'
        : effect.target === 'nugs' ? 'Nug production'
          : effect.target === 'cash' ? 'Cash production'
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
      const target = effect.target === 'nugs' ? 'Hit nugs' : effect.target === 'high' ? 'High/hit' : 'Buzz/hit'
      return `${target} ${fmt(effect.before)} → ${fmt(effect.after)}`
    }
    case 'offline-cap':
      return `Offline cap ${fmtDuration(effect.before)} → ${fmtDuration(effect.after)}`
    case 'offline-efficiency':
      return `keeps ${fmt(effect.before * 100, 0)}% → ${fmt(effect.after * 100, 0)}%`
    case 'prestige-yield':
      return `Wake & Bake yield ×${fmt(effect.before)} → ×${fmt(effect.after)}`
  }
}

export function formatPurchaseImpact(impact: PurchaseImpact): string {
  if (impact.kind === 'empty-max') return 'Nothing affordable yet.'
  if (impact.kind === 'rate') {
    const resource = impact.resource === 'cash' ? ' cash' : ''
    return `+${fmtRate(impact.delta)} · becomes ${fmtRate(impact.after)}${resource}`
  }
  return impact.effects.map(formatEffect).join(' · ')
}
