/**
 * The monetization catalog and its billing boundary (DESIGN § 12).
 *
 * NOTHING HERE CAN TAKE MONEY. There is no billing SDK, no receipt check, no
 * network call and no store-console object behind any of it. This module is
 * the single place a future billing adapter plugs into: the UI talks only to
 * `BillingAdapter`, so replacing `mockBilling` with a StoreKit / Play Billing
 * implementation is a one-file change that touches no component.
 *
 * The catalog's shape is evidence-led, not invented — see
 * docs/research/2026-09-04-long-form-idle-research.md § monetization:
 *  - PERMANENT unlocks are the tolerated shape in this genre; players
 *    recommend them to each other. TIME-LIMITED boosts are the specific
 *    sub-model that draws "whale trap" language (Idle Slayer, measured).
 *  - Observed one-time price band in comparable idle games: $1.99
 *    (Universal Paperclips iOS) · $2.99 (Kittens Game iOS) · $4.99 (Cookie
 *    Clicker Steam and its ad-free Android build) · $9.99 (Melvor Idle).
 *  - Selling waits back invites the belief the wait was inflated, so the
 *    catalog contains no time-skip of any kind.
 *  - The genre's own idle time is already "an energy system without an
 *    energy currency" (Kongregate, via Game Developer), so selling energy
 *    would regress the genre rather than monetize it.
 */

/** What a purchase may ever grant. Deliberately a closed set: everything in
 * it is presentation or acknowledgement, and NONE of it touches the economy,
 * the story, the pacing or the save's progression fields. */
export type Entitlement =
  | 'supporter-plate'   // a bookplate in the Chronicle, and the couch remembers
  | 'illustrated'       // every chapter scene readable full-screen, plus the postcards
  | 'reupholstery'      // couch and room colourways

export interface StoreProduct {
  /** The id a real store console would carry. Mock data until one exists. */
  productId: string
  name: string
  tagline: string
  /** What it actually gives, in plain language, with no mechanical claim. */
  grants: string[]
  /** What it explicitly does NOT do — printed on the card, not buried. */
  neverDoes: string
  entitlements: Entitlement[]
  /** Mock display price. NOT a commitment; no store object exists. */
  priceDisplay: string
  /** Minor units, for the mock only — a real catalog reads this from the store. */
  priceMinorUnits: number
  currency: string
  kind: 'one-time' | 'bundle'
  /** Bundle members, by productId. */
  includes?: string[]
}

export const STORE_CURRENCY = 'USD'

/**
 * The recommended catalog: three permanent, non-gating products and one
 * bundle. Everything the player can buy is a way of saying thank you or of
 * looking at the game differently. Nothing here is a shortcut, and nothing
 * here is withheld from someone who never spends.
 */
export const STORE_CATALOG: StoreProduct[] = [
  {
    productId: 'com.menno420.couchlegend.supporter',
    name: 'Keep the Lights On',
    tagline: 'A thank you, and a small permanent mark in the Chronicle.',
    grants: [
      'A bookplate at the front of your Chronicle, with the date you started.',
      'The couch acknowledges it, once, in its own voice.',
    ],
    neverDoes: 'Changes nothing about the game — no faster, no further, no extra chapters.',
    entitlements: ['supporter-plate'],
    priceDisplay: '$4.99',
    priceMinorUnits: 499,
    currency: STORE_CURRENCY,
    kind: 'one-time',
  },
  {
    productId: 'com.menno420.couchlegend.illustrated',
    name: 'The Illustrated Chronicle',
    tagline: 'Every chapter as a full page, and the postcards to keep.',
    grants: [
      'All eighteen chapter paintings, full-screen and readable, in both states.',
      'The Postcards from the Couch as a set you can page through.',
    ],
    neverDoes: 'Unlocks no chapter you would not reach anyway. The story is never for sale.',
    entitlements: ['illustrated'],
    priceDisplay: '$6.99',
    priceMinorUnits: 699,
    currency: STORE_CURRENCY,
    kind: 'one-time',
  },
  {
    productId: 'com.menno420.couchlegend.reupholstery',
    name: 'The Reupholstery Kit',
    tagline: 'Same couch, different afternoons.',
    grants: [
      'Six colourways for the couch and the room around it.',
      'They persist through Wake & Bake, like everything else the couch keeps.',
    ],
    neverDoes: 'Purely how it looks. No rate, no rail, no threshold moves by a single point.',
    entitlements: ['reupholstery'],
    priceDisplay: '$2.99',
    priceMinorUnits: 299,
    currency: STORE_CURRENCY,
    kind: 'one-time',
  },
  {
    productId: 'com.menno420.couchlegend.wholeafternoon',
    name: 'The Whole Afternoon',
    tagline: 'All three, together.',
    grants: [
      'Keep the Lights On, The Illustrated Chronicle and The Reupholstery Kit.',
      'If you already own one of them, a real store would price this as the difference.',
    ],
    neverDoes: 'Still changes nothing about how the game plays.',
    entitlements: ['supporter-plate', 'illustrated', 'reupholstery'],
    priceDisplay: '$9.99',
    priceMinorUnits: 999,
    currency: STORE_CURRENCY,
    kind: 'bundle',
    includes: [
      'com.menno420.couchlegend.supporter',
      'com.menno420.couchlegend.illustrated',
      'com.menno420.couchlegend.reupholstery',
    ],
  },
]

/** The things this catalog will not contain, stated as data so a future
 * session has to delete a line rather than merely forget a principle. */
export const NEVER_SOLD = [
  'Any part of the eighteen-chapter story.',
  'Time: no skips, no "instantly finish", no buying back a wait.',
  'Energy, lives, or anything that gates play behind a refill.',
  'Randomised items of any kind — no boxes, no pulls, no odds to disclose.',
  'Temporary boosts on a timer.',
  'Streak insurance, or anything that makes missing a day cost something.',
  'A better rate than a player who has never spent anything.',
] as const

export function productById(id: string): StoreProduct | undefined {
  return STORE_CATALOG.find(p => p.productId === id)
}

// --- the billing boundary -------------------------------------------------

export type PurchaseOutcome =
  | { status: 'preview-blocked'; reason: string }
  | { status: 'owned'; productId: string }
  | { status: 'unavailable'; reason: string }

export interface BillingAdapter {
  /** Human name of the backing store, for the UI's provenance line. */
  readonly displayName: string
  /** True only when a real store connection exists. The mock returns false
   * forever, and every surface reads THIS rather than assuming. */
  readonly isLive: boolean
  listProducts(): StoreProduct[]
  owned(): Entitlement[]
  /** A real adapter charges here. The mock cannot, and says so. */
  purchase(productId: string): Promise<PurchaseOutcome>
  restore(): Promise<Entitlement[]>
}

/**
 * The mock. It refuses every purchase by construction — there is no code path
 * through it that could ever return a completed transaction, because it has
 * no store, no network and no credential to complete one with.
 */
export const mockBilling: BillingAdapter = {
  displayName: 'No store connected',
  isLive: false,
  listProducts: () => STORE_CATALOG,
  owned: () => [],
  purchase: async (productId: string) => ({
    status: 'preview-blocked',
    reason: productById(productId)
      ? 'This is a design preview. No store is connected, no payment method is attached, and nothing can be charged.'
      : 'Unknown product id.',
  }),
  restore: async () => [],
}

/**
 * Whether the store preview exists in this build AT ALL.
 *
 * Compile-time, not runtime: Vite replaces `import.meta.env.VITE_STORE_PREVIEW`
 * during the build, so an ordinary `pnpm build` — which is what CI, the
 * deployed site and the Android shell all run — evaluates this to `false` and
 * the preview's entire component tree is dead code. `tools/check-store-preview.ts`
 * asserts that, and is proven to fire against a build where it is on.
 */
export const STORE_PREVIEW_ENABLED = import.meta.env.VITE_STORE_PREVIEW === '1'
