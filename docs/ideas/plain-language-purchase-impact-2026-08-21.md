---
state: promoted
origin: lab
shipped_pr: null
shipped_repo: null
merged_date: null
outcome: open
---

# Plain-language purchase impact

> **Status:** `ideas` — promoted into PR #17; this remains `outcome: open`
> until the feature has actually merged.

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

## Implementation route

PR #17 centralizes item-local output in `src/lib/engine.ts`, derives semantic
before/after effects in `src/lib/purchase-impact.ts`, formats them separately,
and consumes the result in `ShopRow`. Its pure tests cover quantity selection,
Max, milestone crossings, the adopted cap, Work and the ritual effect classes.
No ship fields are filled before merge.
