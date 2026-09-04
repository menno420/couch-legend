# The couch, measured — keepsakes against the § 9.6 fairness rails

> **Status:** `reference` · 2026-09-04 · the balance evidence for
> [`../DESIGN.md`](../DESIGN.md) § 11. Reproduce with
> `pnpm sim couch 14 2` then `pnpm sim analyze couch`.
>
> **Datasets.** `adopted-*` (24 runs) is now **frozen** as the pre-keepsake
> *before*; `couch-*` (27 runs — 9 archetypes × 3 seeds) is the live state.
> `pnpm sim adopted` refuses, exactly as `baseline` and `tuned` do, because
> regenerating a frozen prefix from today's tree would destroy the comparison
> it exists to support.

## 1 · The archetypes

The seven pre-existing playing lanes, the zero-click wall lane, and one new
one. **`keepsake-optimizer`** has `balanced`'s attendance, clicking and buying
and differs *only* in that it curates the couch every decision pass, by a
fixed preference over effect kinds. It exists to bound the strong end of the
new axis: if the rails hold both for players who never open the Couch tab
(every other lane, which relies on auto-arrange) and for one who works it
deliberately, then arranging is strategy rather than a tax.

## 2 · The rails, before and after

| rail | bound | before (`adopted`) | after (`couch`) |
|---|---|---|---|
| 1 · story close, balanced | ≤ 16 d | 12.5 d | **12.1 d** |
| 1 · eager (click-heavy) | ≤ 5 wk | ~29 d ext | ~29 d ext |
| 1 · degenerate (save-for-tiers) | ≤ 11 wk | ~72 d ext | ~72 d ext |
| 3 · attended dead, worst | 5 m / 25 m / 45 m | 0 s / 18.1 m / **44.8 m** | 0 s / 17.7 m / **40.6 m** |
| 4 · check-ins with a move | ≥ 90 % | balanced 96.9 % | balanced **98.0 %**, all lanes ≥ 97.8 % |
| 5a · felt-upgrade floor | ≥ 2 % | 0 of 24 runs below | **1 of 27** (see § 4) |
| 6 · rebuild, patient lanes | ≤ 0.95 | 0.88 / 0.92 / 0.90 | **0.88 / 0.92 / 0.90** |

**The ~2-week north star is protected**: 12.5 d → 12.1 d, a 3 % change, well
inside rail 1's 16-day bound. Rail 3 improved where it was tightest (44.8 m of
a 45 m bound → 40.6 m), because a keepsake arriving at a chapter turn is
itself a move, and rail 6 is unchanged to two decimal places.

## 3 · The load-bearing result: optimising pays in currency, not in story

At the 14-day horizon, seed 11, identical policies but for the arrangement:

| | `balanced` (auto-arrange) | `keepsake-optimizer` |
|---|---|---|
| nugs | 2.74 × 10¹⁷ | **4.86 × 10¹⁸ — 17.7×** |
| cash | 5.51 × 10¹⁷ | **1.24 × 10¹⁸ — 2.3×** |
| Clarity | 229 074 | 274 677 |
| **lifeHigh** (the story axis) | 3.035 × 10¹² | **2.971 × 10¹² — 0.98×** |
| places used | 6 of 6 | **7 of 7** (The Accession Card) |

`lifeHigh` — the axis chapters key on — is driven by job high-rate and hits,
while most keepsake effects feed the nug and cash economies. So working the
couch deliberately makes an afternoon **17.7× richer and the life 2 % SLOWER**.
A player who curates the couch is not racing ahead through the story; they are
having a much bigger afternoon inside it.

That is the "no correct build is required to reach the story" requirement as a
measurement, and it is why an idle-first player loses nothing by never opening
the tab. It also bounds the shape the research named as resented: NGU
Industries' active/idle gap is reported at ~8× **on progression**, and fans who
otherwise recommend that game object to it. The equivalent gap here — on the
axis that actually gates content — is **0.98×**.

## 4 · The one rail breach, stated rather than hidden

`keepsake-optimizer`, **seed 23 only**, two rows of 38: `gen:collective`
**0.14 %** and `gen:dispensary` **0.89 %** against a ≥ 2 % rail, both at
1.25 h. Every other run of all 27 is clean; the `adopted` before was 0 of 24.
The tightest *passing* lane is `balanced` at **2.1 %** (`gen:cloud`) — close
enough to the bound that a future change touching the nug economy should
re-measure this rail rather than assume it.

Cause: the `work-nugs` cross-wire raises global nug/s, so a mid-tier
generator's *first* unit is a smaller fraction of a larger total. It affects
only a lane that deliberately equips that keepsake early. The affected rows'
own displayed output still moves from "idle nugs" to a real rate on that
purchase, so the player-facing surface the rail exists to protect does move —
but the rail measures the global tile, and by that measure this is a breach.

**An earlier version was much worse and was fixed, not argued away.** Minting
the cross-wire at chapter 2 dropped the floor to **0.3 %** for `idle-only` and
**0.6 %** for `no-prestige` — real breaches on lanes that buy by hand. The
cross-wire now mints at chapter 5, and `tests/keepsakes.test.ts` pins that
chapters 2–4 may carry only rate-neutral effect kinds, so the specific
regression cannot return quietly.

## 5 · A defect the simulation could not have found, and the fix it forced

The behaviour smoke (`tools/smoke-couch.mjs`, run against the real production
bundle) caught what 163 unit tests and 27 simulated runs did not: **a player
could not take a keepsake off**. Auto-arrange refilled every free place on
every pass, so the next 50 ms tick put something straight back and the Couch
tab's "Put it on" button was permanently disabled. The unit tests called
`collectKeepsakes` once; only a running game shows a pass that repeats 20
times a second.

The first fix — place only what a pass just minted — restored the player's
control **and broke rail 5a much more widely**: with early keepsakes never
retro-placed, the auto-arranging lanes ended up holding the *later, stronger*
keepsakes, which raised nug/s enough to drop the felt-upgrade floor to
**0.1 % (balanced)** and **0.0 % (idle-only)**. That intermediate state was
measured and rejected, not shipped.

The shipped rule distinguishes the two cases the naive version could not tell
apart: fill a place **the story just opened** (a slot chapter crossed), leave
alone a place **the player just emptied**. `arrangeModeFor` decides it from
the slot count before and after, and three tests pin each branch.

## 6 · What this does not establish

- **Nothing about whether arranging the couch is fun.** Simulation bounds
  fairness, reachability and dead time; taste is the owner's pass.
- The optimiser's preference ranking is *a* plausible strong player, not a
  solved optimum. A better arranger would widen the currency gap; whether it
  would widen the *story* gap is untested.
- The `~Nd ext` figures for the slow lanes are extrapolations on last-3-day
  growth, labelled REASONED in the analyzer output, not measured crossings.
- 27 runs, 3 seeds, one dt (2 s). The dt-sensitivity table is unchanged from
  the 2026-08-20 work and was not re-run.
- The optimiser lane's story figure being *slower* than the auto-arranger's is
  one seed's measurement, not a law: it says the couch does not accelerate the
  story, not that curating it is a penalty.
