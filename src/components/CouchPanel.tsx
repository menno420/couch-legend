import { useEffect, useRef } from 'react'
import { Cloudy } from 'lucide-react'
import { useGame } from '../lib/store'
import { moodFor, nextMood } from '../lib/content'
import { fmt } from '../lib/format'
import { Button } from './ui'

const BASE = import.meta.env.BASE_URL

export function CouchPanel() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const high = useGame(s => s.high)
  const buzz = useGame(s => s.buzz)
  const hitPulse = useGame(s => s.hitPulse)
  const floaters = useGame(s => s.floaters)
  const totalHits = useGame(s => s.totalHits)
  const hit = useGame(s => s.hit)

  const mood = moodFor(high)
  const upcoming = nextMood(high)
  const bakedOpacity = Math.min(1, buzz / 80)
  const hazeOpacity = Math.min(0.55, 0.08 + buzz / 220)

  function hitAt(clientX: number, clientY: number) {
    const rect = sceneRef.current?.getBoundingClientRect()
    if (!rect) {
      hit(50, 55)
      return
    }
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    hit(Math.min(90, Math.max(10, x)), Math.min(80, Math.max(20, y)))
  }

  // NEW: Space / Enter take a hit from anywhere outside a form control.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'Space' && e.code !== 'Enter') return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.isContentEditable)) return
      const state = useGame.getState()
      if (!state.booted || state.showSettings || state.showPrestige || state.showReset) return
      e.preventDefault()
      hit(50 + Math.random() * 20 - 10, 45 + Math.random() * 20 - 10)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hit])

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
      <div
        ref={sceneRef}
        onPointerDown={e => hitAt(e.clientX, e.clientY)}
        className="relative aspect-[4/5] max-h-[min(40vh,360px)] w-full cursor-pointer touch-manipulation select-none transition-transform duration-150 ease-out sm:aspect-[3/4] sm:max-h-[min(48vh,420px)]"
        style={{ transform: hitPulse > 0.5 ? 'scale(1.012)' : 'scale(1)' }}
      >
        <img
          src={`${BASE}art/couch-lucid.jpg`}
          alt="Your stoner slouched on the couch"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_22%]"
          draggable={false}
        />
        <img
          src={`${BASE}art/couch-baked.jpg`}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_22%] transition-opacity duration-700"
          style={{ opacity: bakedOpacity }}
          draggable={false}
        />
        <div
          className="haze-layer pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-accent) 22%, transparent) 0%, transparent 62%)',
            opacity: hazeOpacity,
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/15 to-transparent" />
        <div className="lamp-glow pointer-events-none absolute left-[12%] top-[18%] h-24 w-24 rounded-full bg-accent/20 blur-2xl" />
        {hitPulse > 0.35
          ? Array.from({ length: 7 }, (_, i) => (
              <span
                key={`${totalHits}-${i}`}
                className="puff pointer-events-none absolute bottom-[18%] h-8 w-8 rounded-full bg-accent/40"
                style={{ left: `${38 + i * 4 + (i % 2) * 6}%`, animationDelay: `${i * 35}ms` }}
              />
            ))
          : null}
        {floaters.map(f => (
          <span
            key={f.id}
            className={
              f.kind === 'quote'
                ? 'floater pointer-events-none absolute z-10 whitespace-nowrap font-display font-medium italic text-fg'
                : 'floater pointer-events-none absolute z-10 whitespace-nowrap font-medium tabular-nums text-accent'
            }
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
          >
            {f.text}
          </span>
        ))}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.18em] text-accent">{mood.name}</p>
            <p className="mt-1 max-w-[16rem] text-sm text-muted">{mood.blurb}</p>
          </div>
          {upcoming ? (
            <p className="rounded-full border border-border bg-bg/70 px-3 py-1 text-xs text-muted backdrop-blur-sm">
              {upcoming.name} at {fmt(upcoming.minHigh)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <Button
          variant="hit"
          size="xl"
          className="h-14 min-h-14 w-full touch-manipulation rounded-[18px] font-display text-xl font-semibold tracking-[-0.02em]"
          onPointerDown={e => {
            e.preventDefault()
            hitAt(e.clientX, e.clientY)
          }}
        >
          <Cloudy className="size-5" strokeWidth={1.75} aria-hidden />
          Take a hit
        </Button>
      </div>
    </div>
  )
}
