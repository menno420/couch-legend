# The couch, measured — keepsakes against the § 9.6 fairness rails

> **Status:** `reference` · 2026-09-04 · the balance evidence for
> [`../DESIGN.md`](../DESIGN.md) § 11. Reproduce with
> `pnpm sim couch 14 2` then `pnpm sim analyze couch`.
>
> **Revised the same day (couch-legend #20):** the `couch-*` fixtures were
> regenerated after the cross-wire gained a ceiling (§ 4 below — the one
> rail breach this record used to state is now closed by tuning). Every
> number in §§ 2–4 is read from the regenerated fixtures; the pre-ceiling
> figures are quoted where the comparison needs them and are labelled
> **at `4934955`**.
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

| rail | bound | before (`adopted`) | after (`couch`, at `4934955`) | after the ceiling (`couch`, this head) |
|---|---|---|---|---|
| 1 · story close, balanced | ≤ 16 d | 12.5 d | **12.0 d** | **12.0 d** |
| 1 · eager (click-heavy) | ≤ 5 wk | ~29 d ext | ~29 d ext | ~29 d ext |
| 1 · degenerate (save-for-tiers) | ≤ 11 wk | ~72 d ext | ~72 d ext | ~72 d ext |
| 3 · attended dead, worst | 5 m / 25 m / 45 m | 0 s / 18.1 m / **44.8 m** | 0 s / 17.7 m / **38.0 m** | 30 s / 17.7 m / **38.0 m** |
| 4 · check-ins with a move | ≥ 90 % | balanced 96.9 % | balanced **98.0 %**, all playing lanes ≥ 97.1 % | balanced **97.8 %**, all playing lanes ≥ 96.9 % |
| 5a · felt-upgrade floor | ≥ 2 % | 0 of 24 runs below | **1 of 27** below | **0 of 27** below — every lane's floor is back at the pre-keepsake 4.0 % (`ritual:snacks`) / 3.5 % (`job:shift`) |
| 6 · rebuild, patient lanes | ≤ 0.95 | 0.88 / 0.92 / 0.90 | **0.88 / 0.92 / 0.90** | **0.88 / 0.92 / 0.90** |

**The ~2-week north star is protected**: 12.5 d → 12.0 d, a 4 % change, well
inside rail 1's 16-day bound, and the ceiling leaves it at 12.0 d. Rail 3
improved where it was tightest (44.8 m of a 45 m bound → **38.0 m**), because
a keepsake arriving at a chapter turn is itself a move, and rail 6 is
unchanged to two decimal places through both changes. The 30 s arc-1 dead
stretch in the last column is `idle-only`'s opening; verified from the
fixtures, it was 30 s at `4934955` and 30 s in the `adopted` set as well —
the earlier columns quoted `balanced`'s arc-1 figure (0 s), so the column
widened to the worst lane rather than the reference lane, and nothing moved.

## 3 · The load-bearing result: optimising pays in currency, not in story

Identical policies but for the arrangement, all three seeds. **The measure
changed with this revision, and the reason is worth keeping:** the earlier
table quoted the nug and cash *balances at the horizon* for one seed, and the
regeneration showed how little that number means — a balance is whatever was
unspent at the instant the run stopped, it resets to zero at every Wake &
Bake, and the same lanes' horizon ratio moved from 4.5× to 53× on a change
that did not touch the late game. The figures below are each lane's **peak
balance over the final three days**, which survives prestige timing, read
from the fixtures by a script rather than transcribed.

| seed | peak nugs, last 3 d — optimiser ÷ balanced | peak cash | Clarity | **lifeHigh** (the story axis) | story close, balanced → optimiser |
|---|---|---|---|---|---|
| 11 | **1.76×** | 0.95× | 1.00× | **0.96×** | 12.0 d → 12.3 d |
| 23 | **1.93×** | 1.00× | 0.65× | **0.97×** | 12.0 d → 12.3 d |
| 47 | **1.82×** | 0.89× | 1.04× | **0.98×** | 12.1 d → 12.3 d |

At `4934955`, before the ceiling, the same measure read 1.67× · 1.78× ·
2.29× on nugs and 0.96× · 0.97× · 0.98× on lifeHigh — so the ceiling
changed the optimiser's late-game edge by almost nothing, because by day 11
both lanes' gardens are enormous and the cap sits far above what Work sends.
What the ceiling changed is the *early* game, where it was needed (§ 4).

The two lanes end holding *different* couches: `balanced` (auto-arranged, in
mint order) carries Exact Change · Valid Until Morning · The Name Tag Drawer ·
The Spare Key · The Standing Glass · The Accession Card · The Overlap, while
the optimiser carries The Cutting · The Name Tag Drawer · The Window Placard ·
The Standing Order · The First Follower · The Accession Card · A Jar of That
Light.

`lifeHigh` — the axis chapters key on — is driven by job high-rate and hits,
while most keepsake effects feed the nug and cash economies. So working the
couch deliberately makes an afternoon **roughly twice as rich in nugs and the
life 2–4 % SLOWER**, on every seed. Cash is a wash (0.9–1.0×): the optimiser
runs Work automation and converts cash into rows rather than holding it. The
strategy shows up as what the afternoon *does*, not as progress through the
chapters. A player who curates the couch is not racing ahead through the
story; they are having a bigger afternoon inside it.

That is the "no correct build is required to reach the story" requirement as a
measurement, and it is why an idle-first player loses nothing by never opening
the tab. It also bounds the shape the research named as resented: NGU
Industries' active/idle gap is reported at ~8× **on progression**, and fans who
otherwise recommend that game object to it. The equivalent gap here — on the
axis that actually gates content — is **0.96×**, i.e. slightly against the
player who optimises.

## 4 · The one rail breach — stated at `4934955`, closed by a ceiling at this head

**What was stated.** `keepsake-optimizer`, **seed 23 only**, two rows of 38:
`gen:collective` **0.14 %** and `gen:dispensary` **0.89 %** against a ≥ 2 %
rail, both at 1.25 h. Every other run of all 27 was clean; the `adopted`
before was 0 of 24. The tightest *passing* lane was `balanced` at **2.1 %**
(`gen:cloud`) — on the bound.

**What it actually was.** Re-reading the seed-23 fixture: that run's session
schedule slipped, so The Collective, the Corner Dispensary and The Cloud were
first bought in the same decision pass that crossed into chapter 5 — the pass
that minted The Standing Glass and, on this lane, put it straight on the
couch. The Work shelf at that moment (Couch Legend and the Envoy bought at
0.87 h) was ~30× the garden, so 10 % of it was ~3× the whole garden, and a
first Grow unit could not be felt on the nug/s tile. Seeds 11 and 47 bought
those rows at 0.96 h, one pass earlier, and passed at 75–153 %. `balanced`
s47's 2.1 % on The Cloud is the same shape one row later. So it was not a
seed fluke: **an uncapped cross-wire lets one shelf swamp the other, and for
the player holding it every Grow row becomes decoration.** That is a design
defect, not a measurement artefact, and it belonged to a tuning change rather
than an argument about the bound.

**The change.** `work-nugs` and `grow-cash` carry a **ceiling**: a cross-wire
pays at `share` of the sending shelf and never more than `ceiling ×` what the
receiving shelf makes itself — *the glass matches the garden, it does not
replace it.* The Standing Glass: 10 %, up to 1× the garden. The First
Follower: 30 %, up to 3× — still strictly stronger on both numbers, so it
still retires the glass. Earth in the Window mirrors the rule at 6 % / 1×.
The dilution of a first Grow purchase is then bounded at `1 + ceiling` by
construction, whatever the Work shelf does; a pin sweeps the seed-23 shape
across Work shelves from modest to absurd, and another reproduces the
uncapped arithmetic so the test knows what it guards (`tests/keepsakes.test.ts`,
*a cross-wire never outgrows the shelf it feeds*).

**Measured after the change**, same 27 runs regenerated: the seed-23 rows
read **139 % · 155 % · 163 %** (Collective · Dispensary · Cloud, still at
1.25 h, still in the pass that minted the glass), **0 of 27 runs** are below
2 %, and every lane's displayed-rate floor is back at the pre-keepsake value
— `ritual:snacks` 4.0 % (`job:shift` 3.5 % on `no-prestige`). Rails 1, 3, 4
and 6 are in § 2's last column; none moved past a tenth of its slack.

**What it costs the player who holds the glass.** With no garden at all,
the jobs bring nothing home — a Wake & Bake empties the garden, so the
cross-wire restarts with the first Grow row rather than paying from the
first job. That is the trade the ceiling makes on purpose: the two shelves
need each other again, and a bigger garden raises what the jobs may bring.
The purchase preview says so in words when the ceiling is what stopped a
job paying more ("the garden is the ceiling"), rather than promising nugs
the cap withholds — and, the other way round, a Grow row bought under the
glass says how much *more* the jobs will bring home now that the garden has
lifted their ceiling, so the tile's whole move is promised, never less.

## 4b · A rail the REVIEW round broke, and the mechanic change that fixed it

Fixing Codex's finding that the optimiser wrongly deduped shelf-targeted
effects let that lane equip **both** auto-buy keepsakes for the first time —
and its check-in-with-a-move rate collapsed to **64.7 %** against a ≥ 90 %
rail. Automation was spending every coin as it landed, so a third of
check-ins offered the player nothing: the room had already bought it.

The rail was not moved. The mechanic was: auto-buy now spends only **spare
change** — a row is bought only while it costs at most
`AUTO_BUY_RESERVE_SHARE` (25 %) of the balance, so the player always keeps
the larger part of their money and something to spend it on. That lane
measures **97.5 %** after the change, and worst attended dead time improved
further (40.6 m → 38.0 m). Automation takes the boring purchases off the
player's hands; it does not take the game off them.

*(The paragraph that used to sit here — "Cause: the `work-nugs` cross-wire
raises global nug/s…" — belonged to § 4 and is now folded into it.)*

**An earlier version was much worse and was fixed, not argued away.** Minting
the cross-wire at chapter 2 dropped the floor to **0.3 %** for `idle-only` and
**0.6 %** for `no-prestige` — real breaches on lanes that buy by hand. The
cross-wire now mints at chapter 5, and `tests/keepsakes.test.ts` pins that
chapters 2–4 may carry only rate-neutral effect kinds, so the specific
regression cannot return quietly. The ceiling (§ 4) is the second half of the
same fix: chapter placement protects the early rows, the ceiling protects
every row after it.

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

## 5b · What the third review round changed here

Round 3 found that this document's own seed-11 table no longer matched the
committed fixtures: it had been written from the round-2 run and left stale
when the fixtures were regenerated for the offline-automation change. The
table above is now generated from the fixtures rather than transcribed. That
is the estate's TRAP-001 in its purest form — a number that was measured once
and then quoted as though it still described the tree.

It also found that `tools/stage-evolution.ts` counted **every** keepsake as a
newly introduced mechanic, including five chapters that only supply a stronger
value of a shape introduced earlier. The headline was inflated from **14/18 to
17/18**, and 17/18 had been published in four places. The instrument now
separates the two, and reports **14 introduce · 3 deepen · 17 deliver
something new · 1 (the bare couch at First Light) delivers nothing**.

## 6 · What this does not establish

- **Nothing about whether arranging the couch is fun.** Simulation bounds
  fairness, reachability and dead time; taste is the owner's pass.
- The optimiser's preference ranking is *a* plausible strong player, not a
  solved optimum. A better arranger would widen the currency gap; whether it
  would widen the *story* gap is untested. The ranking also does not know
  about the ceiling: it still equips the glass by kind rank, and never grows
  the garden *in order to* raise the cap — a player who did would widen the
  nug gap further, and the story figure is untested under that play.
- The `~Nd ext` figures for the slow lanes are extrapolations on last-3-day
  growth, labelled REASONED in the analyzer output, not measured crossings.
- 27 runs, 3 seeds, one dt (2 s). The dt-sensitivity table is unchanged from
  the 2026-08-20 work and was not re-run.
- The optimiser lane's story figure being *slower* than the auto-arranger's is
  one seed's measurement, not a law: it says the couch does not accelerate the
  story, not that curating it is a penalty.
- The optimiser's ranking is a plausible strong player with a strength
  tie-break, not a solved optimum. A better arranger would widen the currency
  gap; whether it would move the story figure is untested.
