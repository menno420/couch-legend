---
name: upgrade-distribution
description: "Roll a kit release out to one adopter repo — download, sha256 three-way, banked rollback, carve-out scan, born-red PR, tree-verified merge."
---

# upgrade-distribution

Roll a substrate-kit release out to Couch Legend — one target repo of the
distribution wave. Playbook-grade wave runbook (grounded-skills plan §7.2).

## What this does

Moves the target's vendored `bootstrap.py` to the released version with the
sha256 three-way proof, the banked rollback path, a carve-out scan for local
modifications, and a born-red PR — then verifies MERGED MAIN against the
tree, never a registry line or a PR read.

## Instructions

1. Preflight — look BEFORE you sync: `git status --short` first (uncommitted
   work you did not author → stop and report; a hard reset destroys it), and
   `git log origin/main..HEAD --oneline` for stranded local commits — then,
   from a main checkout only, `git fetch origin main && git reset --hard
   origin/main` (elsewhere `git checkout -B main origin/main`). A stale
   clone reads stale orders and re-executes finished work.
2. Download the release into a TEMP directory, never the repo root — the
   adopted tree already holds `bootstrap.py` + `bootstrap.py.sha256`, and a
   root download collides with them (`gh` refuses same-name files without
   `--clobber`):
   `tmp=$(mktemp -d) && gh release download vX.Y.Z --repo menno420/substrate-kit --pattern 'bootstrap.py*' --pattern 'release.json' --dir "$tmp"`
   then `mv "$tmp/bootstrap.py" bootstrap.py.new` (the consumer flow
   `release.json` names) and keep `$tmp/bootstrap.py.sha256` for step 5b.
3. sha256 three-way compare (never skip) — `sha256sum bootstrap.py.new`
   must equal BOTH the `sha256` field in `release.json` AND the kit repo's
   committed `dist/bootstrap.py` at the release's bump SHA. Any mismatch:
   stop and report; do not upgrade.
4. Born-red PR first — claim file + `.sessions/` card declaring
   `in-progress` as the first commit on the wave branch; open the PR READY;
   land it on green — merge directly or via the enabler (the session-close
   rails apply verbatim).
5. Upgrade — `python3 bootstrap.py.new upgrade`. It banks the OLD dist to
   `.substrate/backup/` (verify the banked `bootstrap-<old-version>.py`
   exists — that is the rollback path) and consumes its own inputs.
5b. Install the NEW sidecar with the dist — `run_upgrade` replaces only
   `bootstrap.py`, never `bootstrap.py.sha256`, and this repo's
   `tests/test_kit_pin.py` (required gate, pytest step) compares the two:
   a stale sidecar reds every upgrade PR. Copy the verified new sidecar
   over the old one (`mv "$tmp/bootstrap.py.sha256" bootstrap.py.sha256`)
   in the same commit, and on any rollback restore BOTH files from the
   bank (re-derive the old sidecar with `sha256sum` if needed).
6. Carve-out scan — read `.substrate/upgrade-report.md`: `consumer-edited`
   and `diverged` docs are LOCAL MODIFICATIONS the upgrade must not
   clobber; list them verbatim in the PR body. `template-improved` applies
   only under `--apply-docs` and only to consumer-untouched docs.
7. Verify + flip — `pnpm check` and
   `python3 bootstrap.py check --strict` green
   — if those are the same command, run the repo's other boot-file gates too (own card's designed hold
   excepted); flip the card `complete`, delete the claim, push.
8. Verify merged main afterward — TREE over registries:
   `git fetch origin main && git log -1 --oneline origin/main` and read the
   vendored dist's version header at origin/main. Never trust an MCP PR
   read alone for merge/CI state (~25-min-stale data) — cross-check the
   tree or the Actions runs.

## Report format — one outcome line per target repo

`<repo>: vOLD → vNEW · sha256 3-way ✔ · bank ✔ · carve-outs: <n or none> · PR #<n> merged @ <sha> · tree-verified ✔`

Known failure modes + fixes:

- A `do-not-automerge` label applied seconds after MCP PR-create misses the
  opened-event label snapshot and reds the first CI round — cure with one
  empty commit (`git commit --allow-empty`) to re-fire the enabler.
- MCP PR reads can serve ~25-minute-stale merge/CI state — probe the tree,
  not the PR object.
- A born-red head red-pings "failed checks"; job-log truth is the designed
  hold plus alias jobs that mirror the required check — verify against the
  job log, don't chase.

Declared capabilities: edit (the vendored dist + docs), run (git + gh + the
checks).
