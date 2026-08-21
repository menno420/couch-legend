import { useState } from 'react'
import { Settings, Volume2, VolumeX, Sunrise, Copy, Check } from 'lucide-react'
import { useGame } from '../lib/store'
import { NEWS_LINES } from '../lib/content'
import { prestigeGain } from '../lib/engine'
import { exportCode, pickSave } from '../lib/save'
import { fmt } from '../lib/format'
import { Button, Modal } from './ui'

const BASE = import.meta.env.BASE_URL

export function Header() {
  const sound = useGame(s => s.sound)
  const toggleSound = useGame(s => s.toggleSound)
  const setShowSettings = useGame(s => s.setShowSettings)
  const setShowPrestige = useGame(s => s.setShowPrestige)
  // Subscribing to peakHigh + enlightenment keeps the gain fresh as the game runs.
  useGame(s => s.peakHigh)
  useGame(s => s.enlightenment)
  const gain = prestigeGain(pickSave(useGame.getState()))

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative hidden size-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-story/25 bg-elevated shadow-[inset_0_1px_rgb(255_255_255/0.05),0_8px_24px_rgb(0_0_0/0.24)] min-[360px]:flex" aria-hidden>
          <span className="absolute inset-x-1.5 bottom-1.5 h-2.5 rounded-[4px] bg-rust" />
          <span className="absolute bottom-3.5 left-2 h-2.5 w-1.5 rounded-full bg-rust" />
          <span className="absolute bottom-3.5 right-2 h-2.5 w-1.5 rounded-full bg-rust" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-story shadow-[0_0_10px_var(--color-story)]" />
        </span>
        <div>
          <p className="whitespace-nowrap font-display text-xl font-semibold tracking-[-0.02em] text-fg">Couch Legend</p>
          <p className="text-xs tracking-wide text-subtle">The afternoon, automated</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {gain >= 1 ? (
          <Button variant="ghost" size="sm" className="min-h-11 text-story" onClick={() => setShowPrestige(true)}>
            <Sunrise className="size-4" aria-hidden />
            <span className="hidden sm:inline">Wake &amp; Bake</span>
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" className="size-11 px-0" aria-label={sound ? 'Mute' : 'Unmute'} onClick={toggleSound}>
          {sound ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
        </Button>
        <Button variant="ghost" size="sm" className="size-11 px-0" aria-label="Settings" onClick={() => setShowSettings(true)}>
          <Settings className="size-4" aria-hidden />
        </Button>
      </div>
    </header>
  )
}

export function NewsLine() {
  const index = useGame(s => s.newsIndex)
  return (
    <p key={index} className="news-line border-l-2 border-dream/55 pl-3 font-display text-sm italic text-muted" aria-live="polite">
      {NEWS_LINES[index % NEWS_LINES.length]}
    </p>
  )
}

export function OfflineBanner() {
  const offline = useGame(s => s.offline)
  const dismiss = useGame(s => s.dismissOffline)
  if (!offline || offline.seconds < 8) return null
  const minutes = Math.max(1, Math.round(offline.seconds / 60))
  return (
    <div className="surface-card story-card rounded-[14px] px-4 py-3">
      <p className="font-medium text-fg">The room kept going</p>
      <p className="text-sm text-muted">
        About {minutes} min of idle work piled up: +{fmt(offline.nugs)} nugs, +{fmt(offline.cash)} cash, +{fmt(offline.high)} high.
        {offline.capped ? ' (Blackout Curtains would keep longer sessions.)' : ''}
      </p>
      <Button variant="ghost" size="sm" className="mt-1 px-0" onClick={dismiss}>
        Nice
      </Button>
    </div>
  )
}

export function Toasts() {
  const toasts = useGame(s => s.toasts)
  if (toasts.length === 0) return null
  return (
    <div className="toast-stack pointer-events-none fixed z-30 flex w-[min(calc(100%_-_2rem),20rem)] flex-col gap-2" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="toast-card panel-chrome rounded-[14px] px-4 py-3" data-tone="story">
          <p className="font-display font-semibold text-story">{t.title}</p>
          <p className="text-sm text-muted">{t.body}</p>
        </div>
      ))}
    </div>
  )
}

export function BootScreen() {
  const ready = useGame(s => s.ready)
  const peakHigh = useGame(s => s.peakHigh)
  const enlightenment = useGame(s => s.enlightenment)
  const begin = useGame(s => s.begin)
  const canContinue = ready && (peakHigh > 0 || enlightenment > 0)
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-end overflow-hidden bg-bg">
      <img src={`${BASE}art/couch-lucid.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_20%]" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/75 to-bg/15" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-story/60 to-transparent" />
      <div className="safe-boot relative z-10 flex w-full max-w-lg flex-col items-center pt-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-story">A lucid chronicle</p>
        <h1 className="mt-2 font-display text-5xl font-semibold tracking-[-0.03em] text-fg sm:text-6xl">Couch Legend</h1>
        <p className="mt-3 max-w-sm text-base text-muted">Get higher. Unlock a life.</p>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-subtle">
          Keep them high. Jobs, snacks, and revelations arrive on their own. Click when you feel like it.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" className="min-h-12 w-full sm:w-auto sm:min-w-48" disabled={!ready} onClick={begin}>
            {canContinue ? 'Continue session' : 'Start session'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SettingsModal() {
  const show = useGame(s => s.showSettings)
  const setShow = useGame(s => s.setShowSettings)
  const setShowReset = useGame(s => s.setShowReset)
  const sound = useGame(s => s.sound)
  const toggleSound = useGame(s => s.toggleSound)
  const enlightenment = useGame(s => s.enlightenment)
  const importSave = useGame(s => s.importSave)
  const [copied, setCopied] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState(false)

  async function copyCode() {
    const code = exportCode(pickSave(useGame.getState()))
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard can be unavailable; surface the code via prompt as fallback.
      window.prompt('Copy your save code:', code)
    }
  }

  function doImport() {
    const ok = importSave(importText)
    setImportError(!ok)
    if (ok) {
      setImportText('')
      setShow(false)
    }
  }

  return (
    <Modal open={show} title="Settings" onClose={() => setShow(false)}>
      <div className="surface-card mt-4 flex items-center justify-between rounded-[12px] px-3 py-3">
        <p className="text-sm text-fg">Sound</p>
        <Button variant="secondary" size="sm" onClick={toggleSound}>
          {sound ? 'On' : 'Off'}
        </Button>
      </div>

      <div className="surface-card mt-3 rounded-[12px] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-fg">Save code</p>
          <Button variant="secondary" size="sm" onClick={copyCode}>
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? 'Copied' : 'Export'}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted">Progress lives in this browser. Export a code to move it or back it up.</p>
        <textarea
          value={importText}
          onChange={e => {
            setImportText(e.target.value)
            setImportError(false)
          }}
          placeholder="Paste a save code to import…"
          rows={2}
          className="interactive-frame mt-2 w-full resize-none rounded-[10px] border bg-bg/80 px-2.5 py-2 text-xs text-fg placeholder:text-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/80 focus-visible:ring-offset-1 focus-visible:ring-offset-elevated"
        />
        {importError ? <p className="mt-1 text-xs text-danger">That code did not parse. Nothing was changed.</p> : null}
        <Button variant="secondary" size="sm" className="mt-2" disabled={importText.trim() === ''} onClick={doImport}>
          Import
        </Button>
      </div>

      <p className="mt-4 text-sm text-muted">Clarity banked: {fmt(enlightenment, 0)}.</p>
      <div className="mt-5 flex justify-between gap-2">
        <Button
          variant="ghost"
          className="text-danger"
          onClick={() => {
            setShow(false)
            setShowReset(true)
          }}
        >
          New session
        </Button>
        <Button onClick={() => setShow(false)}>Close</Button>
      </div>
    </Modal>
  )
}

export function PrestigeModal() {
  const show = useGame(s => s.showPrestige)
  const setShow = useGame(s => s.setShowPrestige)
  const prestige = useGame(s => s.prestige)
  useGame(s => s.peakHigh)
  const gain = prestigeGain(pickSave(useGame.getState()))
  return (
    <Modal open={show} title="Wake & Bake" onClose={() => setShow(false)}>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Come down overnight. You keep lore and bank {fmt(gain, 0)} Clarity. Nugs, cash, grow, jobs, and rituals reset. The next
        session runs hotter.
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={() => setShow(false)}>
          Not now
        </Button>
        <Button onClick={prestige}>Sleep it off</Button>
      </div>
    </Modal>
  )
}

export function ResetModal() {
  const show = useGame(s => s.showReset)
  const setShow = useGame(s => s.setShowReset)
  const reset = useGame(s => s.reset)
  return (
    <Modal open={show} title="New session" onClose={() => setShow(false)}>
      <p className="mt-2 text-sm leading-relaxed text-muted">Wipe this browser save, including Clarity and lore. The couch starts over.</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={() => setShow(false)}>
          Keep going
        </Button>
        <Button
          variant="secondary"
          className="text-danger"
          onClick={() => {
            reset()
            setShow(false)
          }}
        >
          Wipe save
        </Button>
      </div>
    </Modal>
  )
}
