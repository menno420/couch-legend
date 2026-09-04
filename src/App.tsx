import { Suspense, lazy, useEffect, useState } from 'react'
import { useGame } from './lib/store'
import { CouchPanel } from './components/CouchPanel'
import { StatsPanel } from './components/StatsPanel'
import { AfternoonProgressProvider } from './components/AfternoonProgress'
import { GrowTab, RitualsTab, TabBar, WorkTab } from './components/ShopTabs'
import { LoreTab } from './components/LoreTab'
import { CouchTab } from './components/CouchTab'
import { STORE_PREVIEW_ENABLED } from './lib/store-catalog'
import { ChapterTurn } from './components/ChapterTurn'
import { Panel } from './components/ui'
import {
  BootScreen, Header, NewsLine, OfflineBanner, PrestigeModal, ResetModal,
  SettingsModal, Toasts,
} from './components/Chrome'

const STEP = 1 / 20

/**
 * The store design preview (DESIGN § 12), behind a COMPILE-TIME flag.
 *
 * `STORE_PREVIEW_ENABLED` is `import.meta.env.VITE_STORE_PREVIEW === '1'`,
 * which Vite substitutes during the build — so in an ordinary `pnpm build`
 * (what CI, the deployed site and the Android shell all run) this is the
 * literal `false`, the ternary is dead code, and the dynamic import is never
 * emitted. The preview is therefore ABSENT from a production bundle rather
 * than merely hidden in it; `pnpm check:store-preview` asserts exactly that,
 * and is proven to fire against a build where the flag is on.
 */
const StorePreview = STORE_PREVIEW_ENABLED
  ? lazy(() => import('./components/StorePreview'))
  : null

export default function App() {
  const [storeOpen, setStoreOpen] = useState(false)
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
            <AfternoonProgressProvider>
              <div className="flex flex-col gap-4 pb-14 lg:sticky lg:top-4 lg:self-start lg:pb-0">
                <CouchPanel />
                <StatsPanel />
              </div>
            </AfternoonProgressProvider>
            <div className="flex flex-col gap-3">
              <div className="safe-sticky sticky z-20 -mx-1 bg-gradient-to-b from-bg via-bg/95 to-transparent px-1 pb-2 pt-3 backdrop-blur-sm sm:rounded-b-xl">
                <TabBar />
              </div>
              <Panel as="section" tone={tab === 'lore' ? 'story' : tab === 'couch' ? 'rust' : 'default'} className="p-4 sm:p-5">
                {tab === 'grow' ? <GrowTab /> : null}
                {tab === 'work' ? <WorkTab /> : null}
                {tab === 'rituals' ? <RitualsTab /> : null}
                {tab === 'couch' ? <CouchTab /> : null}
                {tab === 'lore' ? <LoreTab /> : null}
              </Panel>
            </div>
          </div>
        </div>
      ) : (
        <BootScreen />
      )}
      {StorePreview && storeOpen ? (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-bg/95 py-4 backdrop-blur-sm">
          <Suspense fallback={<p className="p-6 text-sm text-muted">Opening the preview…</p>}>
            <StorePreview onClose={() => setStoreOpen(false)} />
          </Suspense>
        </div>
      ) : null}
      {StorePreview && !storeOpen && booted ? (
        <button
          type="button"
          onClick={() => setStoreOpen(true)}
          className="fixed bottom-3 left-3 z-30 rounded-[12px] border border-story/50 bg-story/15 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-story backdrop-blur-sm"
        >
          Store preview
        </button>
      ) : null}
      {booted ? <ChapterTurn /> : null}
      <Toasts />
      <SettingsModal />
      <PrestigeModal />
      <ResetModal />
    </main>
  )
}
