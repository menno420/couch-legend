// Tiny synthesized sound effects — no audio assets, everything from the
// WebAudio graph, matching the original's three cues.

let ctx: AudioContext | null = null
let muted = false

export function setMuted(m: boolean): void {
  muted = m
}

export function ensureAudio(): void {
  if (typeof window === 'undefined') return
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

function envelope(at: number, attack: number, release: number, peak: number): GainNode | null {
  if (!ctx) return null
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(1e-4, at)
  gain.gain.exponentialRampToValueAtTime(peak, at + attack)
  gain.gain.exponentialRampToValueAtTime(1e-4, at + attack + release)
  gain.connect(ctx.destination)
  return gain
}

/** The hit: a soft filtered noise puff. */
export function puffSound(): void {
  if (muted || !ctx) return
  const at = ctx.currentTime
  const len = Math.floor(2 * ctx.sampleRate * 0.18)
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 1.4
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(680, at)
  filter.frequency.exponentialRampToValueAtTime(180, at + 0.16)
  const gain = envelope(at, 0.01, 0.16, 0.22)
  if (!gain) return
  src.connect(filter)
  filter.connect(gain)
  src.start(at)
  src.stop(at + 0.2)
}

/** Achievement / revelation: a rising sine chime. */
export function chimeSound(): void {
  if (muted || !ctx) return
  const at = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(392, at)
  osc.frequency.exponentialRampToValueAtTime(523, at + 0.12)
  const gain = envelope(at, 0.01, 0.22, 0.09)
  if (!gain) return
  osc.connect(gain)
  osc.start(at)
  osc.stop(at + 0.28)
}

/** Purchase: a quick triangle blip. */
export function blipSound(): void {
  if (muted || !ctx) return
  const at = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(220, at)
  osc.frequency.exponentialRampToValueAtTime(330, at + 0.07)
  const gain = envelope(at, 0.005, 0.1, 0.07)
  if (!gain) return
  osc.connect(gain)
  osc.start(at)
  osc.stop(at + 0.12)
}
