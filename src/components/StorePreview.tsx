/**
 * The store DESIGN PREVIEW (DESIGN § 12). Seven states, for owner and product
 * review. It is not a store: `mockBilling` has no network, no credential and
 * no code path that can complete a transaction, and every surface reads
 * `billing.isLive` rather than assuming. The whole tree is compiled out of an
 * ordinary build — see STORE_PREVIEW_ENABLED.
 */
import { useState } from 'react'
import {
  ArrowLeft, BadgeCheck, CircleAlert, Eye, RotateCcw, ShieldCheck, X,
} from 'lucide-react'
import {
  NEVER_SOLD, STORE_CATALOG, mockBilling, productById,
  type BillingAdapter, type Entitlement, type PurchaseOutcome, type StoreProduct,
} from '../lib/store-catalog'
import { Button, Panel, cx } from './ui'

export type StoreView =
  | { name: 'landing' }
  | { name: 'detail'; productId: string }
  | { name: 'confirm'; productId: string }
  | { name: 'result'; productId: string; outcome: PurchaseOutcome }
  | { name: 'owned' }
  | { name: 'restore'; state: 'idle' | 'working' | 'done' }
  | { name: 'unavailable'; reason: string }

/** The one piece of chrome that must be impossible to miss or mistake. It is
 * on EVERY state, not only the transaction ones. */
function PreviewBanner() {
  return (
    <div
      className="flex items-start gap-2.5 rounded-[14px] border border-story/45 bg-story/10 px-3 py-2.5"
      role="note"
      aria-label="Design preview notice"
    >
      <Eye className="mt-0.5 size-4 shrink-0 text-story" aria-hidden />
      <p className="text-xs leading-relaxed text-fg">
        <span className="font-semibold uppercase tracking-[0.14em] text-story">Design preview · no charge</span>
        <br />
        Nothing here can take money. No store is connected, no payment method is attached, and every price
        and product code below is placeholder configuration, not an offer.
      </p>
    </div>
  )
}

function PriceTag({ product }: { product: StoreProduct }) {
  return (
    <span className="shrink-0 text-right">
      <span className="block font-display text-lg font-semibold tabular-nums text-fg">{product.priceDisplay}</span>
      <span className="block text-[11px] uppercase tracking-[0.12em] text-subtle">mock price</span>
    </span>
  )
}

function ProductCard({ product, onOpen }: { product: StoreProduct; onOpen: () => void }) {
  return (
    <li className={cx('surface-card rounded-[14px] p-3', product.kind === 'bundle' && 'story-card')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-medium text-fg">{product.name}</p>
          <p className="mt-0.5 text-sm text-muted">{product.tagline}</p>
        </div>
        <PriceTag product={product} />
      </div>
      <p className="mt-2 text-xs text-subtle">{product.neverDoes}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <code className="truncate font-mono text-[11px] text-subtle">{product.productId}</code>
        <Button size="sm" variant="secondary" className="shrink-0 whitespace-nowrap" onClick={onOpen}>Look closer</Button>
      </div>
    </li>
  )
}

export function StorePreview({
  billing = mockBilling,
  onClose,
  initialView = { name: 'landing' },
}: {
  billing?: BillingAdapter
  onClose?: () => void
  initialView?: StoreView
}) {
  const [view, setView] = useState<StoreView>(initialView)
  const [entitlements, setEntitlements] = useState<Entitlement[]>(billing.owned())
  const products = billing.listProducts()

  const go = (v: StoreView) => setView(v)

  return (
    <div className="safe-shell mx-auto flex max-w-2xl flex-col gap-3">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-fg">The Corner Store</h1>
          <p className="text-sm text-muted">Ways to say thanks. None of them change the game.</p>
        </div>
        {onClose ? (
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close the store preview">
            <X className="size-4" aria-hidden />
          </Button>
        ) : null}
      </header>

      <PreviewBanner />

      <Panel as="section" tone={view.name === 'unavailable' ? 'rust' : 'story'} className="p-4 sm:p-5">
        {view.name === 'landing' ? (
          <>
            <p className="text-sm text-fg">
              Couch Legend is complete without any of this. The eighteen chapters, every mechanic and every
              hour of it are the same whether you spend nothing or spend everything below.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {products.map(p => (
                <ProductCard key={p.productId} product={p} onOpen={() => go({ name: 'detail', productId: p.productId })} />
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => go({ name: 'restore', state: 'idle' })}>
                <RotateCcw className="size-4" aria-hidden /> Restore purchases
              </Button>
              <Button size="sm" variant="ghost" onClick={() => go({ name: 'owned' })}>What I already have</Button>
              <Button size="sm" variant="ghost" onClick={() => go({ name: 'unavailable', reason: 'offline' })}>
                Offline state
              </Button>
            </div>

            <div className="surface-card mt-4 rounded-[14px] p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-accent">
                <ShieldCheck className="size-3.5" aria-hidden /> What is never for sale here
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {NEVER_SOLD.map(line => (
                  <li key={line} className="text-sm text-muted">— {line}</li>
                ))}
              </ul>
            </div>
          </>
        ) : null}

        {view.name === 'detail' ? <Detail product={productById(view.productId)!} go={go} /> : null}

        {view.name === 'confirm' ? (
          <Confirm
            product={productById(view.productId)!}
            billing={billing}
            go={go}
          />
        ) : null}

        {view.name === 'result' ? <Result view={view} go={go} /> : null}

        {view.name === 'owned' ? <Owned entitlements={entitlements} go={go} /> : null}

        {view.name === 'restore' ? (
          <Restore
            state={view.state}
            billing={billing}
            go={go}
            onRestored={e => setEntitlements(e)}
          />
        ) : null}

        {view.name === 'unavailable' ? <Unavailable reason={view.reason} go={go} /> : null}
      </Panel>

      <p className="px-1 text-xs text-subtle">
        Billing surface: <span className="text-muted">{billing.displayName}</span> ·
        {' '}live connection: <span className="text-muted">{billing.isLive ? 'yes' : 'no'}</span> ·
        {' '}prices and product codes are placeholder configuration in <code className="font-mono">src/lib/store-catalog.ts</code>.
      </p>
    </div>
  )
}

function BackRow({ go, label = 'Back to the store' }: { go: (v: StoreView) => void; label?: string }) {
  return (
    <Button size="sm" variant="ghost" className="-ml-2" onClick={() => go({ name: 'landing' })}>
      <ArrowLeft className="size-4" aria-hidden /> {label}
    </Button>
  )
}

function Detail({ product, go }: { product: StoreProduct; go: (v: StoreView) => void }) {
  return (
    <div>
      <BackRow go={go} />
      <h2 className="mt-2 font-display text-xl font-semibold text-fg">{product.name}</h2>
      <p className="mt-1 text-sm text-muted">{product.tagline}</p>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-[12px] bg-elevated/70 px-3 py-2.5">
        <span className="text-sm text-muted">{product.kind === 'bundle' ? 'Bundle · one payment' : 'One payment · yours permanently'}</span>
        <PriceTag product={product} />
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-accent">What it gives you</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {product.grants.map(g => (
          <li key={g} className="flex gap-2 text-sm text-fg">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            {g}
          </li>
        ))}
      </ul>

      {product.includes?.length ? (
        <p className="mt-3 text-sm text-muted">
          Contains: {product.includes.map(id => productById(id)?.name).filter(Boolean).join(' · ')}
        </p>
      ) : null}

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-story">What it does not do</p>
      <p className="mt-1 text-sm text-fg">{product.neverDoes}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={() => go({ name: 'confirm', productId: product.productId })}>
          Continue — preview only
        </Button>
        <span className="text-xs text-subtle">Nothing is charged at any step.</span>
      </div>
    </div>
  )
}

function Confirm({ product, billing, go }: { product: StoreProduct; billing: BillingAdapter; go: (v: StoreView) => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <div>
      <BackRow go={go} />
      <h2 className="mt-2 font-display text-xl font-semibold text-fg">Hand over to the store</h2>
      <p className="mt-1 text-sm text-muted">
        This is where a real build would hand off to Google Play or the App Store. This build has neither.
      </p>

      <div className="surface-card mt-4 rounded-[14px] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-fg">{product.name}</p>
            <code className="mt-0.5 block truncate font-mono text-[11px] text-subtle">{product.productId}</code>
          </div>
          <PriceTag product={product} />
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Charged to</span>
            <span className="text-fg">— nothing attached —</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-muted">Store</span>
            <span className="text-fg">{billing.displayName}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const outcome = await billing.purchase(product.productId)
            setBusy(false)
            go({ name: 'result', productId: product.productId, outcome })
          }}
        >
          {busy ? 'Asking the store…' : 'Try it — preview only'}
        </Button>
        <Button variant="ghost" onClick={() => go({ name: 'detail', productId: product.productId })}>Cancel</Button>
      </div>
      <p className="mt-2 text-xs text-subtle">
        The button above calls the billing adapter. This build's adapter is the mock, which cannot complete a
        transaction — it will say so rather than pretend.
      </p>
    </div>
  )
}

function Result({ view, go }: { view: Extract<StoreView, { name: 'result' }>; go: (v: StoreView) => void }) {
  const product = productById(view.productId)
  const blocked = view.outcome.status === 'preview-blocked'
  return (
    <div>
      <BackRow go={go} />
      <div className={cx('mt-3 rounded-[14px] border p-4', blocked ? 'border-story/45 bg-story/10' : 'border-accent/45 bg-accent/10')}>
        <p className="flex items-center gap-2 font-display text-lg font-semibold text-fg">
          {blocked ? <Eye className="size-5 text-story" aria-hidden /> : <BadgeCheck className="size-5 text-accent" aria-hidden />}
          {blocked ? 'Nothing happened, on purpose' : 'Owned'}
        </p>
        <p className="mt-1.5 text-sm text-fg">
          {view.outcome.status === 'preview-blocked' ? view.outcome.reason : null}
          {view.outcome.status === 'unavailable' ? view.outcome.reason : null}
          {view.outcome.status === 'owned' ? `${product?.name} is yours permanently.` : null}
        </p>
        <p className="mt-2 text-sm text-muted">
          In a real build this screen would show the store's own receipt and the entitlement arriving. Here it
          shows the honest outcome of a preview: no charge, no entitlement, no change to your save.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => go({ name: 'landing' })}>Back to the store</Button>
        <Button size="sm" variant="ghost" onClick={() => go({ name: 'owned' })}>See the owned state</Button>
      </div>
    </div>
  )
}

function Owned({ entitlements, go }: { entitlements: Entitlement[]; go: (v: StoreView) => void }) {
  return (
    <div>
      <BackRow go={go} />
      <h2 className="mt-2 font-display text-xl font-semibold text-fg">What you already have</h2>
      {entitlements.length === 0 ? (
        <>
          <p className="mt-1 text-sm text-muted">Nothing — which is the complete game.</p>
          <ul className="mt-4 flex flex-col gap-2">
            {STORE_CATALOG.filter(p => p.kind === 'one-time').map(p => (
              <li key={p.productId} className="surface-card surface-card-muted flex items-center justify-between gap-3 rounded-[14px] px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-muted">{p.name}</span>
                  <code className="block truncate font-mono text-[11px] text-subtle">{p.productId}</code>
                </span>
                <span className="shrink-0 text-xs uppercase tracking-[0.12em] text-subtle">not owned</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {entitlements.map(e => (
            <li key={e} className="surface-card shop-ready flex items-center justify-between gap-3 rounded-[14px] px-3 py-2.5">
              <span className="text-sm text-fg">{e}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-accent">
                <BadgeCheck className="size-3.5" aria-hidden /> owned
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-muted">
        Owned things are permanent and travel with the save code, exactly like the couch does. A real build would
        also re-check them with the store on every launch.
      </p>
    </div>
  )
}

function Restore({
  state, billing, go, onRestored,
}: {
  state: 'idle' | 'working' | 'done'
  billing: BillingAdapter
  go: (v: StoreView) => void
  onRestored: (e: Entitlement[]) => void
}) {
  return (
    <div>
      <BackRow go={go} />
      <h2 className="mt-2 font-display text-xl font-semibold text-fg">Restore purchases</h2>
      <p className="mt-1 text-sm text-muted">
        New phone, reinstall, or a save you brought over: anything you bought comes back from the store account
        that bought it. It is never re-charged.
      </p>
      <div className="surface-card mt-4 rounded-[14px] p-3" role="status" aria-live="polite">
        {state === 'idle' ? <p className="text-sm text-fg">Ready. Nothing has been asked for yet.</p> : null}
        {state === 'working' ? <p className="text-sm text-fg">Asking {billing.displayName}…</p> : null}
        {state === 'done' ? (
          <p className="text-sm text-fg">
            Nothing to restore. This build has no store connection, so there is no purchase history to read — which is
            also exactly what a genuinely-nothing-bought account would show.
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={state === 'working'}
          onClick={async () => {
            go({ name: 'restore', state: 'working' })
            const e = await billing.restore()
            onRestored(e)
            go({ name: 'restore', state: 'done' })
          }}
        >
          <RotateCcw className="size-4" aria-hidden /> Restore
        </Button>
        <Button size="sm" variant="ghost" onClick={() => go({ name: 'landing' })}>Back</Button>
      </div>
    </div>
  )
}

function Unavailable({ reason, go }: { reason: string; go: (v: StoreView) => void }) {
  return (
    <div>
      <BackRow go={go} />
      <div className="mt-3 rounded-[14px] border border-danger/45 bg-danger/10 p-4">
        <p className="flex items-center gap-2 font-display text-lg font-semibold text-fg">
          <CircleAlert className="size-5 text-danger" aria-hidden />
          The store cannot be reached
        </p>
        <p className="mt-1.5 text-sm text-fg">
          {reason === 'offline'
            ? 'You appear to be offline. The game carries on exactly as it was — nothing here is needed to keep playing.'
            : reason}
        </p>
        <p className="mt-2 text-sm text-muted">
          Nothing was charged and nothing was lost. Anything already bought stays bought; the store is only needed to
          buy something new or to restore.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => go({ name: 'unavailable', reason: 'offline' })}>Try again</Button>
        <Button size="sm" variant="ghost" onClick={() => go({ name: 'landing' })}>Back to the store</Button>
      </div>
    </div>
  )
}

export default StorePreview
