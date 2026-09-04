// Persistence + the portable save code. localStorage keys match the original
// deployment, so a player moving between hosts keeps nothing — but a player
// updating this app in place keeps everything.

import { defaultSave, migrateSave, type SaveState } from './engine'

export const SAVE_KEY = 'couch-legend-save'
export const BACKUP_KEY = 'couch-legend-save-bak'

const SAVE_FIELDS: (keyof SaveState)[] = [
  'version', 'high', 'lifeHigh', 'peakHigh', 'buzz', 'peakBuzz', 'nugs', 'cash',
  'enlightenment', 'returnGift', 'totalHits', 'playTime', 'generators', 'jobs',
  'rituals', 'achievements', 'keepsakes', 'equipped', 'lastTick', 'startedAt',
  'sound', 'booted',
]

export function pickSave(s: SaveState): SaveState {
  const out = {} as Record<string, unknown>
  for (const k of SAVE_FIELDS) out[k] = s[k]
  return out as unknown as SaveState
}

export function loadSave(): SaveState | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(BACKUP_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return migrateSave(parsed)
  } catch {
    return null
  }
}

export function persistSave(s: SaveState): void {
  if (typeof localStorage === 'undefined') return
  try {
    const prev = localStorage.getItem(SAVE_KEY)
    if (prev) localStorage.setItem(BACKUP_KEY, prev)
    localStorage.setItem(SAVE_KEY, JSON.stringify(pickSave(s)))
  } catch {
    // Private windows and full disks fail silently; the game keeps running.
  }
}

// --- portable save codes -------------------------------------------------

const CODE_PREFIX = 'CL1.'

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Serialize a save as a copy-pasteable code. */
export function exportCode(s: SaveState): string {
  const json = JSON.stringify(pickSave(s))
  return CODE_PREFIX + toBase64(new TextEncoder().encode(json))
}

/** Parse a save code; returns null when the code is not valid. */
export function importCode(code: string): SaveState | null {
  const trimmed = code.trim()
  if (!trimmed.startsWith(CODE_PREFIX)) return null
  try {
    const json = new TextDecoder().decode(fromBase64(trimmed.slice(CODE_PREFIX.length)))
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.version !== 'number') return null
    const save = migrateSave(parsed)
    // Reject saves that would decode to nonsense numbers.
    for (const k of ['high', 'lifeHigh', 'peakHigh', 'buzz', 'peakBuzz', 'nugs', 'cash', 'enlightenment', 'returnGift', 'totalHits', 'playTime'] as const) {
      if (typeof save[k] !== 'number' || !Number.isFinite(save[k]) || save[k] < 0) return null
    }
    return save
  } catch {
    return null
  }
}

export function requestPersistence(): void {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return
  navigator.storage.persist().catch(() => {})
}

export { defaultSave, migrateSave }
