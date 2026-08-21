import { useEffect } from 'react'
import { useGame } from '../lib/store'
import { ARC_NAMES, STAGES } from '../lib/content'
import { presentationFor } from '../lib/presentation'

/** How long the turn holds before clearing itself (the § 6 sequence: dim,
 * gold rail, dissolve, ~2 s title hold, the postcard beat). Dismissible at
 * any point; the economy keeps running underneath. */
const TURN_MS = 5200

/**
 * The chapter turn — one cinematic beat when the permanent stage changes
 * (scene-packages § 6). CSS-only phases, opacity/transform travel only;
 * reduced-motion mode collapses every phase to short opacity changes
 * (app.css). The scene underneath has already switched — this overlay owns
 * the dim and the title, and its fade-out IS the cross-dissolve reveal.
 */
export function ChapterTurn() {
  const turn = useGame(s => s.chapterTurn)
  const dismiss = useGame(s => s.dismissChapterTurn)

  useEffect(() => {
    if (!turn) return
    const timer = setTimeout(dismiss, TURN_MS)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [turn, dismiss])

  if (!turn) return null
  const number = String(STAGES.findIndex(s => s.id === turn.id) + 1).padStart(2, '0')
  const postcard = presentationFor(turn).postcard

  return (
    <div
      key={turn.id}
      className="chapter-turn fixed inset-0 z-40 cursor-pointer"
      role="status"
      aria-live="polite"
      onClick={dismiss}
    >
      <div className="chapter-turn__veil absolute inset-0 bg-bg" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="chapter-turn__arc text-xs font-semibold uppercase tracking-[0.24em] text-story">
          {ARC_NAMES[turn.arc]} · Chapter {number} / {STAGES.length}
        </p>
        <span className="chapter-turn__rail mt-3 h-px w-40 bg-gradient-to-r from-transparent via-story to-transparent sm:w-56" aria-hidden />
        <h2 className="chapter-turn__title mt-4 max-w-lg font-display text-3xl font-semibold tracking-[-0.02em] text-fg sm:text-4xl">
          {turn.name}
        </h2>
        <p className="chapter-turn__beat mt-3 max-w-md font-display text-base italic leading-relaxed text-muted sm:text-lg">
          {turn.beat}
        </p>
        {postcard ? (
          <p className="chapter-turn__postcard mt-6 text-sm text-dream">
            Postcard from the Couch — “{postcard}”
          </p>
        ) : null}
        <p className="chapter-turn__hint mt-8 text-xs text-subtle">tap to continue</p>
      </div>
    </div>
  )
}
