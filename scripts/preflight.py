#!/usr/bin/env python3
"""Local-parity preflight — makes `python3 bootstrap.py check --strict` the
one local gate (kit discipline + the product gate in a single command).

Runs `pnpm check` (tsc --noEmit + vitest + vite build — the same predicate the
required `ci` workflow evaluates), and SELF-SKIPS with exit 0 in three cases,
each load-bearing:

- **In CI** (`GITHUB_ACTIONS` set): the substrate-gate job also runs this
  script (its gate step invokes `bootstrap.py check --strict`), and there the
  product suite already runs in the required `ci` workflow. Running it again
  would double-pay the suite on every PR — and would FAIL, because the gate
  job never runs `pnpm install` (GitHub's runner images preinstall the pnpm
  binary, so a tool-presence test alone does not protect this case).
- **pnpm not on PATH** — nothing to run it with.
- **node_modules absent** — the workspace is not set up; `pnpm check` would
  fail on missing tools, which is a setup gap, not a product red. Run
  `pnpm install` first.

Kill switch: delete this file (the kit skips absent preflight scripts with a
NOTE), or remove it from substrate.config.json `preflight_scripts`.
Provenance: planted by the 2026-08-21 kit-seed session (couch-legend's
adoption card) on the kit's own converge-the-ritual NOTE.
"""

import os
import pathlib
import shutil
import subprocess
import sys


def main() -> int:
    if os.environ.get("GITHUB_ACTIONS"):
        print(
            "preflight: CI detected — the product gate (`pnpm check`) runs in "
            "the required `ci` workflow; skipped in the kit gate by design."
        )
        return 0
    pnpm = shutil.which("pnpm")
    if pnpm is None:
        print(
            "preflight: pnpm not on PATH — product gate (`pnpm check`) "
            "skipped; install pnpm to converge the local ritual."
        )
        return 0
    root = pathlib.Path(__file__).resolve().parent.parent
    if not (root / "node_modules").is_dir():
        print(
            "preflight: node_modules absent — run `pnpm install` first; "
            "product gate skipped."
        )
        return 0
    print("preflight: running the product gate: pnpm check")
    result = subprocess.run([pnpm, "check"], cwd=root)
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
