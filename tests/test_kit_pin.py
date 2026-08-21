"""Pin the vendored substrate-kit dist to its committed sha256 sidecar.

Why this file exists (and why it is Python inside a TypeScript test tree):
the kit-owned substrate-gate workflow always runs its pytest step when a
``tests/`` directory exists — the self-skip keys on the directory, not on
Python tests being present — so a TS-only suite would red that step on
"collected 0 items" (exit 5). This test makes the step earn its keep
instead: it fails if the vendored ``bootstrap.py`` ever drifts from the
recorded release hash (``bootstrap.py.sha256``), which is exactly the
byte-integrity the estate's three-way release verification pins at seed
and upgrade time. Vitest ignores ``.py`` files, so ``pnpm check`` is
untouched.

Stdlib only — the gate job installs nothing beyond pytest.
"""

import hashlib
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent


def test_vendored_bootstrap_matches_sidecar():
    recorded = (ROOT / "bootstrap.py.sha256").read_text().split()[0]
    actual = hashlib.sha256((ROOT / "bootstrap.py").read_bytes()).hexdigest()
    assert actual == recorded, (
        "vendored bootstrap.py drifted from bootstrap.py.sha256 — "
        "never hand-edit the dist; re-vendor a release and update the "
        "sidecar together (three-way sha256 verification first)"
    )


def test_config_pin_matches_vendored_header():
    import json
    import re

    pin = json.loads((ROOT / "substrate.config.json").read_text())["kit_version"]
    head = (ROOT / "bootstrap.py").read_text(errors="replace")[:200]
    m = re.search(r"bootstrap v(\d+\.\d+\.\d+)", head)
    assert m, "vendored bootstrap.py carries no version header"
    assert m.group(1) == pin, (
        f"substrate.config.json kit_version {pin} != vendored dist "
        f"{m.group(1)} — vendor and pin move together"
    )
