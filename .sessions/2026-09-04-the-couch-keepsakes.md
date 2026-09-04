# 2026-09-04 — The couch: keepsakes, and a store that cannot take money

> **Status:** `in-progress` — branch `claude/couch-legend-design-arch-iwpo96`.

- **📊 Model:** Opus 5 · xhigh · design + feature build
- **📍 Venue:** cloud-container
- **🔗 Session:** [session_01FAkSXD7ZQ7E7XzysZmLRbF](https://claude.ai/code/session_01FAkSXD7ZQ7E7XzysZmLRbF) · "Couch Legend game design and architecture"


## Previous-session review

Read `.sessions/2026-08-23-plain-language-purchase-impact.md` (#17/#18) before
starting. It left the shop able to state the exact consequence of a proposed
purchase — which is the surface this session had to keep honest when the couch
gained the power to shorten a shelf's milestone step. That is why the step is
threaded through `purchase-impact.ts`, `ShopTabs.tsx` and the simulator's ROI
rather than living only in `computeRates`: a preview that disagreed with the
purchase would undo exactly what that session shipped.

## 💡 Session idea

Chapters that only change the scenery are a spreadsheet with better paintings.
Give each chapter one **permanent object** instead, keep the couch smaller than
the collection, and the story starts making decisions rather than announcing
thresholds — without a new currency, a timer, or a reason to show up.

## What is about to happen

Make the eighteen chapters differ **mechanically**, not only in scenery, and
design the monetization lane as reviewable mockups that cannot transact.

The problem is measured, not felt. At `d877ed0`, `tools/stage-evolution.ts`
(6 known positives, 5 known negatives, exit 0) reports **2 of 18 chapters gate
any new content row and 0 of 18 introduce a mechanic**; the committed
`adopted` simulator dataset shows a balanced player buying **all 38 shop rows
inside 78 minutes**, then spending **99.6 % of the 14-day story** with nothing
new to buy, with **13 of 18 chapters arriving empty**.

The answer shipping here is one reusable family — **keepsakes**: every chapter
after the first leaves one permanent object with the couch, there are always
fewer places than objects, and every effect transforms a system that already
existed rather than minting a currency. Plus a code-native store **design
preview** with no billing of any kind, compiled out of production builds.

## What changed

- `content.ts` — `KEEPSAKES` (17, one per chapter 2–18), `SLOT_STAGES`,
  `baseSlotsFor`, `keepsakesEarnedBy`. Ten effect shapes, all transforming
  existing systems.
- `engine.ts` — `keepsakeEffects` / `keepsakeSlots` / `isSuperseded`, folded
  into `computeRates`, `advance`, `applyOffline` and `prestigeGain`; a
  step-aware `milestoneMult`; save **v3** (`keepsakes`, `equipped`,
  `peakBuzz`, `returnGift`) with a rate-neutral v2→v3 migration.
- `actions.ts` — `collectKeepsakes` (mint + auto-arrange), `equipKeepsake`,
  `unequipKeepsake`, `applyAutoBuy` (bounded catch-up), deterministic hit echo
  and the banked return gift in `applyHit`.
- `store.ts` / `save.ts` / new **Couch** tab; the milestone step threaded
  through the purchase preview, the shop row and the simulator's ROI so all
  four read one number.
- `sim/` — minting, arranging and auto-buy on the same clock the game uses;
  a new `keepsake-optimizer` archetype; `couch-*` becomes the live-state
  dataset and `adopted-*` is frozen as the before.
- `store-catalog.ts` + `StorePreview.tsx` + `tools/check-store-preview.ts` —
  the monetization lane, behind a compile-time flag.
- Docs: DESIGN §§ 11–12, the redesign plan, the research record, the balance
  record, and the fleet-preflight contract sheet.

## Close-out

*(filled at the flip)*
