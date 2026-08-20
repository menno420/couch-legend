const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']

export function fmt(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '0'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs < 1e3) {
    if (abs >= 100) return sign + abs.toFixed(0)
    if (abs >= 10) return sign + abs.toFixed(abs % 1 === 0 ? 0 : 1)
    return sign + abs.toFixed(abs < 1 && abs > 0 ? 2 : abs % 1 === 0 ? 0 : 1)
  }
  const tier = Math.min(Math.floor(Math.log10(abs) / 3), SUFFIXES.length - 1)
  const scaled = abs / 1000 ** tier
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : decimals
  return sign + scaled.toFixed(digits) + SUFFIXES[tier]
}

export function fmtRate(value: number): string {
  return `${fmt(value)}/s`
}

export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return s ? `${m}m ${s}s` : `${m}m`
  }
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m ? `${h}h ${m}m` : `${h}h`
}
