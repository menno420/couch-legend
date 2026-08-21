# 2026-08-21 — Substrate-kit v1.21.0 seeded (adoption session)

> **Status:** `in-progress` — branch `claude/kit-seed-v1-21-0`. This card is
> the repo's first: the session that plants it is the seeding session itself,
> and the card holds the PR red (born-red) until the seed is complete.

- **📊 Model:** fable-5 · high · feature build

## What is happening

couch-legend adopts substrate-kit at **v1.21.0** — the owner's directive
(live, 2026-08-21): *"properly seed the new couch life repo with the
substrate kit, but verify first."* Verified first: the tree at `4759e90`
carried no kit (substrate.config.json, bootstrap.py, CONSTITUTION.md,
.claude/ all absent), and the vendored dist's sha256
(`8807a00e0e7f14f61f37f2afb48bcb38e4b7247b10741761ff99630bf9cc7356`)
was verified **four ways** before anything was committed: downloaded release
asset = `.sha256` sidecar asset = `release.json` sha256 field =
fleet-manager's committed v1.21.0 dist.

Procedure: the kit's own `bootstrap.py adopt --wire-enforcement`, then the
16 interview slots answered from the repo's real, measured facts and
`render --live` (0 unfilled placeholders). **Zero game changes**: no
mechanic, balance, tuning, content or presentation edit rides this PR
(DESIGN.md stays binding; `pnpm check` untouched).

## Adoption-shape decisions (decide-and-flag)

- **substrate-gate becomes the SECOND required check beside `ci`** — the
  spider-swing precedent (its main requires substrate-gate + game-quality).
  Trade-off flagged to the owner: OD-9 prefers one required check per repo;
  the product gate and the kit gate genuinely verify different things, and
  the estate's reference adopter already runs two. Wired into ruleset
  `main-branch-protection` (id 21117825) at landing time and verified from
  the effective-rules endpoint.
- **auto-merge-enabler.yml and branch-sweep.yml are staged, not live**
  (they remain byte-identical under `.substrate/ci/`). Reasons: the repo's
  landing convention is land-it-yourself (no enabler existed before this
  seed and the repo setting "Allow auto-merge" is OFF, so the enabler would
  fail red on every PR while arming nothing); branch-sweep is a daily
  branch-deletion cron this two-branch repo does not need yet, and standing
  deletion apparatus deserves a deliberate owner adoption. Installing
  either later is one copy from `.substrate/ci/` plus (for the enabler) the
  one repo setting. This deviates from spider-swing parity on exactly these
  two files — flagged, reversible.
- **`tests/test_kit_pin.py`** (stdlib Python, 2 tests): the kit gate's
  pytest step self-skips only when `tests/` is absent; this repo's `tests/`
  is vitest-TypeScript, so the step would red on "collected 0 items". The
  pin test converts that step into a real check — the vendored dist must
  match its sha256 sidecar, and the config `kit_version` must match the
  dist header. Vitest ignores `.py`; `pnpm check` is unaffected. The
  underlying template defect (self-skip keys on the directory, not on
  Python tests existing) is recorded for the kit worklist in fleet-manager.

## Close-out

*(written at close; this card flips `complete` only after the exact-head
Codex review is answered and dispositioned)*
