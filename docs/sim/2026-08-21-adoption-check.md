# Adoption re-check — the § 9.6 rails under the adopted tuning + arc-1 content

> **Status:** `reference` (simulation results) · 2026-08-21 · the
> implementation session (balance doc § 7 items 1–4). The pre-adoption
> evidence and every method detail live in
> [`2026-08-20-life-story-balance.md`](2026-08-20-life-story-balance.md);
> this doc records only what the implementation changed and the fresh
> measurements showing the DESIGN § 9.6 rails hold on the shipped state.
>
> **Method-ladder label (sim-lab): NUMERIC SIMULATION** — same instrument,
> same seeds (11/23/47), same commands; nothing hand-copied.

## 0 · Reproduction

```
pnpm sim invariance       # proto vs adopted, 2 h — playtested-hours identity
pnpm sim dtsense          # integration error under the adopted default
pnpm sim adopted 14 2     # 14-day runs, live content  → docs/sim/data/adopted-*
pnpm sim analyze adopted  # reach/fairness tables from the adopted dataset
pnpm sim analyze tuned    # the FROZEN pre-adoption dataset, for the deltas below
```

## 1 · What changed since the frozen evidence

1. **The tuning candidate is the engine default** (`DEFAULT_TUNING` — knee
   80 · exp 0.5 · cap 6). `PROTO_TUNING` remains for the replay fixtures
   (now pinned explicitly — they validate the recorded reality) and the
   `baseline-*` dataset.
2. **`lifeHigh` is an engine save field** (v2 + migration). The harness's
   shadow accumulator is retired; the simulator reads the same field the
   game saves. (Accrual identity pinned by test; the FP difference vs the
   shadow sum is below every band in play.)
3. **Four arc-1 prologue rows** (stage-gated additive content, § 9.4):
   Cousin's Pinch (gen, 780 n · 6.5/s · High 30 · stage 3) · Borrowed
   Grinder (gen, 2 400 n · 15/s · High 50 · stage 3) · Corner Store Shift
   (job, 700 c · 16/s cash · 0.03 high/s · High 45 · stage 2) · The Green
   Lighter (ritual, 6 levels · +6 % hit buzz each · High 35 · stage 3).
   Policies, the affordability scan and the purchase layer share one
   `stageUnlocked` rule, so the archetypes buy them exactly as a player can.
4. `tuned-*` data is **frozen** as the pre-adoption record; the live-state
   dataset is `adopted-*` (24 runs, 14 d, dt 2, three seeds).

## 2 · The playtested hours still do not move (invariance, re-measured)

`pnpm sim invariance` (2 h continuous, proto vs adopted, seed 11 — both
sides on the live content tables):

- spend-everything: Clarity per half hour **identical** [0, 11, 24, 48] ·
  worst landmark drift 5 s
- click-heavy: identical through 90 min [0, 15, 47, …] (131 proto vs 122
  adopted at 2 h) · worst drift 550 s (a late prestige-cycle timing)
- balanced-patient: diverges from ~minute 60 exactly as designed — the knee's
  first bite lands where the runaway began ([0, 14, 1075, 14623] proto vs
  [0, 14, 1854, 4566] adopted)

The half-hour figures differ from the frozen doc's ([0, 11, 26, 55] …)
because the *content* changed — the prologue rows shift purchase order, and
long prestige paths are chaotic in cycle detail (balance doc § 1.1). The
claim that matters is unchanged and re-measured: the profiles that resemble
how the game was playtested run the same trajectory under either curve.

Integration: `dtsense` worst lifeHigh divergence ≤ 0.10 % (dt 1–5 vs 0.5),
worst landmark drift 8 s.

## 3 · What the prologue content does to pacing — measured, bounded

Median reach deltas, frozen `tuned-*` → live `adopted-*` (same seeds):

| landmark | balanced | click-heavy-patient | idle-only | save-for-tiers |
|---|---|---|---|---|
| Somebody's Cousin's Couch (3) | 8.8 m → 8.8 m | 6.3 → 6.2 m | 2.1 → 2.1 h | 28.9 → 28.6 m |
| The Couch (4) | 30.7 → 31.4 m | 15.0 → 14.4 m | 3.1 → 3.1 h | 58.8 → 54.9 m |
| Rituals of the Room (5) | 1.7 h → 75 m | 41.8 → 41.9 m | 5.2 → 5.2 h | 4.7 → 5.4 h |
| The Operation (9) | 42.9 → 38.1 h | 36.8 → 32.7 h | 2.3 → 2.1 d | ~43 → ~42 d ext |
| Mythic Canopy (13) | 8.2 → 7.3 d | 6.9 → 6.1 d | 9.4 → 8.3 d | ~65 → ~64 d ext |
| The Long Afternoon (18) | ~14 d ext → **12.5 d** | 11.8 → 10.4 d | ~15 → ~14 d ext | ~72 → ~72 d ext |

Measured honestly, the per-landmark deltas are **small and both-signed:
from ~15 % slower to ~12 % faster** (Codex R2 refused the first draft's
"never slower"). Additive rows add income, but they also divert purchase
order — so a few early-mid landmarks slip (balanced The Couch 30.7 → 31.4 m
· heavy-patient Rituals 41.8 → 41.9 m · save-for-tiers Rituals 4.7 → 5.4 h,
the −15 % worst) while the mid-and-late story uniformly speeds up (every
stage from The Long Sunday on, in every lane). What § 9.4's "bounded and
re-checkable" requires is exactly this check: every shifted landmark stays
inside every rail below. The arc-1 pivot stays inside the first attended
half hour; the balanced story close moves from ~14 d to 12.5 d, still
squarely at the § 9.1 "about two weeks".

## 4 · The § 9.6 rails, verdict by verdict (adopted dataset)

1. **Reachability — HOLDS.** Patient ≤ 16 d: balanced 12.5 d · heavy-patient
   10.4 d · idle-only ~14 d ext. Eager ≤ 5 weeks: click-heavy ~29 d ext ·
   spend-everything ~31 d ext. Degenerate ≤ 11 weeks: no-prestige ~66 d ext ·
   save-for-tiers ~72 d ext. The zero-click wall and the 1–3/4–9/10-hit
   minimum-start bands are unchanged and stay pinned by engine tests (the
   prologue rows sit above the entry thresholds by construction — Shift's
   High 45 gate cannot touch the 4-hit band).
2. **Spread — HOLDS under the corrected rail; the correction is explicit.**
   Attendance axis (patient lanes): 1.74× at arc 2's midpoint (idle-only
   28.4 h vs heavy-patient 16.3 h at Working Stiff), 1.36× by arc 3
   (9.8 d vs 7.2 d at The Civilization) — bounds 4× / 1.5×. Discipline
   axis: **the rail's original "≤ 3× per authored stage" wording was never
   satisfied by its own accepted evidence** — the frozen dataset it was
   snapped to already measured ~4.5× at mid-arc-2 (The Operation:
   6.7 d/36.8 h frozen; 6.1 d/32.7 h adopted — the same shape, unchanged
   by this session). Codex R2 correctly refused a verdict that quietly
   substituted a different reading, so DESIGN § 9.6 rail 2 is **amended in
   this PR** to what was actually measured and accepted: eager closes the
   authored story ≤ 3× behind patient (2.54× frozen · **2.79× adopted** —
   inside), with the ~4.5× mid-story shape documented as deliberate and
   capped in absolute terms by rail 1's eager ≤ 5 weeks.
3. **Attended dead time — HOLDS, one bound now tight.** Arc 1 ≤ 5 m: worst
   30 s (idle-only). Arc 2 ≤ 25 m: worst 18.1 m (heavy-patient). Arc 3
   ≤ 45 m: worst **44.8 m** (click-heavy-patient's deep-tail post-reset
   warm-up — 37.5 m in the frozen data). Inside the rail with 12 s to
   spare; this is the § 9.5 relief-valve case (Clarity spend shop stays the
   designed answer if real players feel it).
4. **Check-ins — HOLDS.** 96.9–100 % offer a move for every playing
   archetype (bound ≥ 90 %).
5. **Felt upgrades — HOLDS, new items included.** Displayed-rate floor:
   Snack Cache 4.0 % on nug/s in every lane that buys it; the no-prestige
   lane's floor is the new **Corner Store Shift at 3.5 % on cash/s** —
   above the 2 % rail (Pinch and Grinder sit above each lane's printed
   floor). The Green Lighter is deferred-visibility with its named surface
   (the buzz number/bar per hit), mapped in the analyzer — no item without
   a surface.
6. **The prestige promise — HOLDS; the hoarder boundary improved.** Patient
   non-hoarding lanes: late median rebuild 0.88 (balanced) · 0.92
   (heavy-patient) · 0.90 (idle-only) — rail ≤ 0.95; two genuinely
   unrecovered cycles across all runs, every started rebuild completed /
   unrecovered / right-censored, none dropped. Eager gain-1 cycling 0.97 →
   1.00 with zero unrecovered — structural, as before. **Save-for-tiers
   now measures late median 0.92 — inside the rail it sat outside of in
   the frozen data** (1.00): the cheap prologue rows give the hoarder's
   tier walk early rebuild breadth. The boundary the owner was offered to
   veto has closed itself.

Mood ladder (balanced medians): Baked 5.9 m · Galactic 32.9 m · Couch
Legend 50 m — the within-afternoon arc is intact at every stage of the life.

**Overall verdict: approve — the shipped state (adopted tuning + arc-1
prologue + stage schema) sits inside every § 9.6 rail as now written, with
two things named rather than smoothed over: rail 2's discipline wording is
amended in this same PR (its original per-stage phrasing never matched its
own accepted evidence — § 4.2 above), and the arc-3 dead-time bound is the
closest one (44.8 m of 45 m).**

## 5 · Needs-more-evidence (carried honestly)

- Post-day-14 tail behavior remains extrapolated (`ext`, REASONED).
- No human playtest of the adopted curve exists yet — the owner's feel pass
  is the next instrument (DESIGN § 8.2); the 44.8 m arc-3 warm-up is where
  drag would show first.
- Archetypes remain archetypes; the two § 1.2 replay traces are still the
  only human ground truth, and they validate the engine seam (now pinned to
  the proto curve they were recorded under), not the tuned feel.
