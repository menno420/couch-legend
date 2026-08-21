import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Cloudy } from 'lucide-react'
import { useGame } from '../lib/store'
import { moodFor, nextMood, STAGES, stageForLifeHigh } from '../lib/content'
import { anchorPresentation, presentationFor, resolveArt } from '../lib/presentation'
import { fmt } from '../lib/format'
import { SceneMotion } from './SceneMotion'
import { Button, Panel } from './ui'

export function CouchPanel() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const high = useGame(s => s.high)
  const lifeHigh = useGame(s => s.lifeHigh)
  const buzz = useGame(s => s.buzz)
  const hitPulse = useGame(s => s.hitPulse)
  const floaters = useGame(s => s.floaters)
  const totalHits = useGame(s => s.totalHits)
  const hit = useGame(s => s.hit)

  const mood = moodFor(high)
  const upcoming = nextMood(high)
  const stage = stageForLifeHigh(lifeHigh)
  const stageNumber = String(STAGES.findIndex(s => s.id === stage.id) + 1).padStart(2, '0')

  // A failed scene image falls back to the current anchor pair rather than
  // a blank frame (looks pass § 4); the flag resets when the stage moves on.
  const [artBroken, setArtBroken] = useState(false)
  useEffect(() => setArtBroken(false), [stage.id])
  const pres = artBroken ? anchorPresentation(stage) : presentationFor(stage)

  // Warm only the NEXT stage's pair; later scenes stay cold (§ 4's loading
  // policy — the current pair, the next pair, nothing else).
  useEffect(() => {
    const next = STAGES[STAGES.findIndex(s => s.id === stage.id) + 1]
    if (!next) return
    const p = presentationFor(next)
    for (const src of [p.lucid, p.baked]) {
      const img = new Image()
      img.src = resolveArt(src)
    }
  }, [stage.id])

  const bakedOpacity = Math.min(1, buzz / 80)
  const hazeOpacity = Math.min(0.55, 0.08 + buzz / 220)
  const accentVars = (pres.accent
    ? {
        '--scene-light': pres.accent.light,
        '--scene-dream': pres.accent.dream,
        '--scene-edge': pres.accent.edge,
        '--scene-haze': pres.accent.haze,
      }
    : {}) as CSSProperties

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
    <Panel tone="rust" className="overflow-hidden">
      <div
        ref={sceneRef}
        onPointerDown={e => hitAt(e.clientX, e.clientY)}
        className="scene-frame relative aspect-[4/5] w-full cursor-pointer touch-manipulation select-none overflow-hidden outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:aspect-[3/4]"
        style={{ transform: hitPulse > 0.5 ? 'scale(1.012)' : 'scale(1)', ...accentVars }}
        role="button"
        tabIndex={0}
        aria-label="Take a hit in the couch scene"
      >
        <img
          key={`${pres.stageId}-${pres.status}-lucid`}
          src={resolveArt(pres.lucid)}
          alt={pres.alt}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: pres.focal }}
          draggable={false}
          onError={() => setArtBroken(true)}
        />
        <img
          key={`${pres.stageId}-${pres.status}-baked`}
          src={resolveArt(pres.baked)}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
          style={{ opacity: bakedOpacity, objectPosition: pres.focal }}
          draggable={false}
          onError={() => setArtBroken(true)}
        />
        <div
          className="haze-layer pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 48% 38%, color-mix(in oklab, var(--scene-haze) 18%, transparent) 0%, transparent 58%), radial-gradient(circle at 80% 20%, color-mix(in oklab, var(--scene-dream) 12%, transparent) 0%, transparent 40%)',
            opacity: hazeOpacity,
          }}
        />
        <SceneMotion preset={pres.motion} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-bg/15" />
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
        <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
          <div className="scene-glass w-fit max-w-[calc(100%_-_1.5rem)] rounded-[14px] px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-story">Chapter {stageNumber} / {STAGES.length}</p>
            <p className="font-display text-sm font-semibold text-story">{stage.name}</p>
            <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Current mood</p>
            <p className="mt-0.5 font-display text-base font-semibold text-fg">{mood.name}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted sm:text-sm">{mood.blurb}</p>
          </div>
        </div>
        {upcoming ? (
          <div className="scene-glass pointer-events-none absolute bottom-3 right-3 max-w-[calc(100%_-_1.5rem)] rounded-full px-3 py-1.5 text-right text-xs text-subtle sm:bottom-4 sm:right-4">
            Next · <span className="text-portal">{upcoming.name}</span>
            <span className="tabular-nums text-muted"> at {fmt(upcoming.minHigh)}</span>
          </div>
        ) : null}
      </div>
      <div className="p-3 sm:p-4">
        <Button
          variant="hit"
          size="xl"
          className="h-14 min-h-14 w-full touch-manipulation rounded-[18px] font-display text-xl font-semibold tracking-[-0.02em]"
          onClick={() => hit(50, 55)}
        >
          <Cloudy className="size-5" strokeWidth={1.75} aria-hidden />
          Take a hit
        </Button>
      </div>
    </Panel>
  )
}
