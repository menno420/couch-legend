import { useEffect } from 'react'
import { useGame } from './lib/store'
import { CouchPanel } from './components/CouchPanel'
import { StatsPanel } from './components/StatsPanel'
import { GrowTab, RitualsTab, TabBar, WorkTab } from './components/ShopTabs'
import { LoreTab } from './components/LoreTab'
import { ChapterTurn } from './components/ChapterTurn'
import { Panel } from './components/ui'
import {
  BootScreen, Header, NewsLine, OfflineBanner, PrestigeModal, ResetModal,
  SettingsModal, Toasts,
} from './components/Chrome'

const STEP = 1 / 20

export default function App() {
  const ready = useGame(s => s.ready)
  const booted = useGame(s => s.booted)
  const tab = useGame(s => s.tab)
  const hydrate = useGame(s => s.hydrate)
  const tick = useGame(s => s.tick)
  const flushSave = useGame(s => s.flushSave)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!ready || !booted) return
    let raf = 0
    let last = performance.now()
    let acc = 0
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      acc += dt
      while (acc >= STEP) {
        tick(STEP)
        acc -= STEP
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushSave()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flushSave)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flushSave)
      flushSave()
    }
  }, [ready, booted, tick, flushSave])

  return (
    <main className="game-canvas relative min-h-dvh overflow-x-clip text-fg">
      {booted ? (
        <div className="safe-shell mx-auto flex max-w-6xl flex-col gap-4">
          <Header />
          <NewsLine />
          <OfflineBanner />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="flex flex-col gap-4 pb-14 lg:sticky lg:top-4 lg:self-start lg:pb-0">
              <CouchPanel />
              <StatsPanel />
            </div>
            <div className="flex flex-col gap-3">
              <div className="safe-sticky sticky z-20 -mx-1 bg-gradient-to-b from-bg via-bg/95 to-transparent px-1 pb-2 pt-3 backdrop-blur-sm sm:rounded-b-xl">
                <TabBar />
              </div>
              <Panel as="section" tone={tab === 'lore' ? 'story' : 'default'} className="p-4 sm:p-5">
                {tab === 'grow' ? <GrowTab /> : null}
                {tab === 'work' ? <WorkTab /> : null}
                {tab === 'rituals' ? <RitualsTab /> : null}
                {tab === 'lore' ? <LoreTab /> : null}
              </Panel>
            </div>
          </div>
        </div>
      ) : (
        <BootScreen />
      )}
      {booted ? <ChapterTurn /> : null}
      <Toasts />
      <SettingsModal />
      <PrestigeModal />
      <ResetModal />
    </main>
  )
}
