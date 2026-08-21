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

**Shipped (PR #5):** the full v1.21.0 adoption — vendored `bootstrap.py` +
`bootstrap.py.sha256` · `substrate.config.json` (kit_version 1.21.0) ·
`CONSTITUTION.md` + the rendered doc set (16 slots answered from measured
facts, `render --live` 0 unfilled) · `.claude/CLAUDE.md` + `settings.json`
(hooks wired) · `.github/workflows/substrate-gate.yml` (the one new live
workflow) · `.substrate/` staging incl. `ci/auto-merge-enabler.yml` +
`ci/branch-sweep.yml` (deliberately staged-only) · `control/` +
`.session-journal.md` + `project.index.json` · `scripts/preflight.py`
(local product-gate convergence, three self-skips) · `tests/test_kit_pin.py`
(2 tests) · Status badges + orientation links for the game's own docs ·
this card.

**Verify (each command run, real exit codes):**
- `pnpm check` → exit 0 (product gate untouched)
- `python3 -m pytest tests/ -q` → 2 passed
- `python3 bootstrap.py check --strict` → exit 1, exactly the designed
  born-red hold on this card; CI substrate-gate red verified **from the job
  log** as the same hold (run 32480690043: "HOLD (by design)")
- `ci` green on the PR head (run 32480690036)

**Kit defects fed to fleet-manager's worklist** (rows 24–25 new; row 14
first live bite; rows 20–21 sighted): see fleet-manager
`docs/findings/2026-08-13-substrate-kit-v1210-followups.md`.

**⚑ decide-and-flag:** substrate-gate as a SECOND required check beside `ci`
(spider-swing precedent) vs OD-9's one-check preference — wired at landing,
reversible in the ruleset UI in seconds. · Enabler + branch-sweep staged,
not live (deviates from spider-swing parity; land-it-yourself stands). ·
The kit-planted `.claude/` hooks load only for sessions booted on this repo
as root — fleet-manager-booted sessions keep hub apparatus (estate
boot-triad doctrine).

**💡 Session idea:** when the kit session fixes the `fleet-repos.txt`
roster hole (sim-lab · superbot-idle · product-forge · spider-swing), add
`menno420/couch-legend` in the same commit — this repo is registry-invisible
from birth otherwise, and the registry's DRIFT machinery can't watch a repo
the roster never scans.

**⟲ previous-session review:** the previous sessions here were the owner's
ChatGPT-Work looks pass (#3, the Lucid Chronicle contract) and art session
(#4, the first three Arc-1 scene packages). Verified from the tree this
session: the contract doc declares the direction owner-approved and
finalized; #4's six JPEGs are present with CI tests and are dormant exactly
as its boundary declares (no `lifeHigh`/stage-schema change landed); `pnpm
check` green at their merge state. One residue both left: neither design doc
carried a Status badge token (this surface's docs do) — added here, `binding`
for the contract, `reference` for the package record.

**Layer-2 handoff:** fleet-manager `docs/repos/couch-legend/README.md` —
threads re-cut (looks pass LANDED · kit adoption thread added · Android
re-sequenced); ESTATE.md row updated; `OQ-CL-LOOKS-PASS` resolved.
