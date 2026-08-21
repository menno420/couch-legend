import { BookOpen, ScrollText, Sunrise } from 'lucide-react'
import { useGame } from '../lib/store'
import { ACHIEVEMENTS, ARC_NAMES, MOODS, STAGES, nextStage, stageForLifeHigh } from '../lib/content'
import { clarityMultiplier, prestigeGain } from '../lib/engine'
import { pickSave } from '../lib/save'
import { fmt, fmtDuration } from '../lib/format'
import { Button, StatTile, cx } from './ui'

export function LoreTab() {
  const achievements = useGame(s => s.achievements)
  const playTime = useGame(s => s.playTime)
  const totalHits = useGame(s => s.totalHits)
  const peakHigh = useGame(s => s.peakHigh)
  const lifeHigh = useGame(s => s.lifeHigh)
  const enlightenment = useGame(s => s.enlightenment)
  const setShowPrestige = useGame(s => s.setShowPrestige)
  const gain = prestigeGain(pickSave(useGame.getState()))
  const earned = ACHIEVEMENTS.filter(a => achievements.includes(a.id)).length
  // Revelations ride lifeHigh — the story axis — so Wake & Bake can never
  // take them back (DESIGN § 9.2; the old peakHigh filter demonstrably did).
  const revealed = MOODS.filter(m => lifeHigh >= m.minHigh)
  const stage = stageForLifeHigh(lifeHigh)
  const reached = STAGES.filter(st => lifeHigh >= st.minLifeHigh)
  const upcoming = nextStage(lifeHigh)
  const unwritten = STAGES.length - reached.length - (upcoming ? 1 : 0)

  return (
    <div>
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-[-0.015em] text-fg">
        <span className="inline-flex size-8 items-center justify-center rounded-[10px] bg-story/10 text-story">
          <ScrollText className="size-4" aria-hidden />
        </span>
        Chronicle
      </h2>
      <p className="mt-1 text-sm text-muted">Chapters, revelations, titles — everything the couch remembers.</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Chapter" value={`${STAGES.indexOf(stage) + 1}/${STAGES.length}`} sub={stage.name} />
        <StatTile label="Peak high" value={fmt(peakHigh)} />
        <StatTile label="Hits" value={fmt(totalHits, 0)} />
        <StatTile label="Stories" value={`${earned}/${ACHIEVEMENTS.length}`} />
      </div>

      <div className="surface-card story-card mt-4 rounded-[14px] p-4">
        <p className="flex items-center gap-2 font-display text-lg font-semibold text-fg">
          <Sunrise className="size-4 text-story" aria-hidden />
          Wake &amp; Bake
        </p>
        <p className="mt-1 text-sm text-muted">Come down overnight. The story keeps every chapter. Gain Clarity that multiplies everything next session.</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Banked {fmt(enlightenment, 0)} · ×{clarityMultiplier(enlightenment).toFixed(2)} now
            {gain > 0 ? <> → ×{clarityMultiplier(enlightenment + gain).toFixed(2)} after</> : <> · next at High 400</>}
          </p>
          <Button size="sm" disabled={gain < 1} onClick={() => setShowPrestige(true)}>
            Come down
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-subtle">
          <BookOpen className="size-3.5 text-story" aria-hidden />
          The chapters · session {fmtDuration(playTime)}
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {reached.map(st => (
            <li key={st.id} className="surface-card story-card rounded-[14px] px-3 py-2.5">
              <p className="font-display text-sm text-story">
                {String(STAGES.indexOf(st) + 1).padStart(2, '0')} · {st.name}
                <span className="ml-1.5 text-xs uppercase tracking-[0.14em] text-subtle">{ARC_NAMES[st.arc]}</span>
              </p>
              <p className="text-sm text-fg">{st.beat}</p>
            </li>
          ))}
          {upcoming ? (
            <li className="surface-card surface-card-muted rounded-[14px] px-3 py-2.5">
              <p className="font-display text-sm text-muted">
                {String(STAGES.indexOf(upcoming) + 1).padStart(2, '0')} · {upcoming.name}
              </p>
              <p className="text-sm text-muted">Reaches you at lifetime High {fmt(upcoming.minLifeHigh)}.</p>
            </li>
          ) : null}
        </ul>
        <p className="mt-2 text-xs text-subtle">
          {reached.length}/{STAGES.length} chapters lived
          {unwritten > 0 ? <> · {unwritten} still out past the porch light</> : null}
          {' '}· Wake &amp; Bake resets an afternoon, never the story
        </p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-subtle">Revelations</p>
        <ul className="mt-2 flex flex-col gap-2">
          {MOODS.map(m => {
            const unlocked = lifeHigh >= m.minHigh
            return (
              <li key={m.id} className={cx('surface-card rounded-[14px] px-3 py-2.5', unlocked ? 'story-card' : 'surface-card-muted')}>
                <p className={cx('font-display text-sm', unlocked ? 'text-story' : 'text-muted')}>{m.name}</p>
                <p className={cx('text-sm', unlocked ? 'text-fg' : 'text-muted')}>
                  {unlocked ? m.revelation : `Reaches you at High ${fmt(m.minHigh)}.`}
                </p>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-xs text-subtle">{revealed.length}/{MOODS.length} revealed · revelations survive Wake &amp; Bake</p>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {ACHIEVEMENTS.map(a => {
          const has = achievements.includes(a.id)
          return (
            <li key={a.id} className={cx('surface-card rounded-[14px] px-3 py-2.5', has ? 'side-story-card' : 'surface-card-muted')}>
              <p className={cx('font-medium', has ? 'text-dream' : 'text-muted')}>{a.name}</p>
              <p className="text-sm text-muted">{has ? a.blurb : 'Not yet.'}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
