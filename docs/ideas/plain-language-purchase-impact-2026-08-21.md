---
state: routed
origin: lab
shipped_pr: null
shipped_repo: null
merged_date: null
outcome: open
---

# Plain-language purchase impact

## Intake

Idle players repeatedly object to upgrades whose effect is hard to predict
without an outside guide. Couch Legend shows item rates and costs, but not the
before/after effect of the quantity currently selected.

## Map and route

- **Owner:** shop presentation backed by the pure engine
- **Size:** small-to-medium
- **Risk:** medium; milestone multipliers and bulk quantities must be described
  exactly, not estimated from a simplified formula
- **Route:** structured plan after the life-story UI settles

## Acceptance sketch

- An available purchase can say “adds X/s · new total Y/s” using the canonical
  engine calculation for the selected quantity.
- Automation-changing rituals use one plain sentence instead of a fake rate.
- Locked cards remain teasers; distant information is not spoiled.
- No price, production, unlock, reward or save behavior changes.
- Unit tests pin displayed deltas against the engine for ×1, bulk and Max cases.

## Guard recipe

Derive display deltas beside `bulkCost` / `milestoneMult` in `src/lib/engine.ts`,
consume them in `ShopRow` in `src/components/ShopTabs.tsx`, and pin them in a
dedicated pure test before touching copy.
